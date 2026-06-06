pub mod schema;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

use crate::error::Result;

/// Tauri-managed state holding the SQLite connection behind a Mutex.
/// Accessed in commands via `State<'_, DbState>`.
pub struct DbState(pub Mutex<Connection>);

/// Open (or create) the SQLite database at `path`, run the schema migrations,
/// and return a ready-to-use connection.
pub fn init(path: &Path) -> Result<Connection> {
    // Create parent directories if needed (e.g. first launch)
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(path)?;

    // Enable WAL mode for better concurrent read performance
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    // Run schema (all statements are CREATE TABLE IF NOT EXISTS — safe to re-run)
    conn.execute_batch(schema::SCHEMA)?;

    // Idempotent migration: add is_adjustment column to records if it does not exist yet
    // (SQLite has no ADD COLUMN IF NOT EXISTS, so we check PRAGMA first).
    let has_is_adjustment: bool = {
        let mut stmt = conn.prepare("PRAGMA table_info(records)")?;
        let found = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .any(|name| name.as_deref() == Ok("is_adjustment"));
        found
    };
    if !has_is_adjustment {
        conn.execute_batch(
            "ALTER TABLE records ADD COLUMN is_adjustment INTEGER NOT NULL DEFAULT 0;",
        )?;
    }

    Ok(conn)
}
