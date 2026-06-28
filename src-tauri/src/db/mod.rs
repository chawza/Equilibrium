pub mod budgets;
pub mod data;
pub mod migrations;
pub mod schema;
pub mod tags;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

use crate::error::Result;

/// Tauri-managed state holding the SQLite connection behind a Mutex.
/// Accessed in commands via `State<'_, DbState>`.
pub struct DbState(pub Mutex<Connection>);

/// Apply WAL mode, FK enforcement, and all versioned migrations to an already-opened
/// connection. The migration runner tracks applied versions in `schema_migrations` and
/// is idempotent — safe to call on fresh or existing databases.
///
/// Called by `init` for file-backed DBs and by `test_conn` for in-memory DBs.
pub fn apply_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    migrations::run_migrations(conn)
}

/// Open (or create) the SQLite database at `path`, run the schema migrations,
/// and return a ready-to-use connection.
pub fn init(path: &Path) -> Result<Connection> {
    // Create parent directories if needed (e.g. first launch)
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(path)?;
    apply_schema(&conn)?;
    Ok(conn)
}

/// Create an in-memory connection with the full schema applied.
/// Used by unit tests in `db::*` modules.
#[cfg(test)]
pub(crate) fn test_conn() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    apply_schema(&conn).unwrap();
    conn
}

/// Swap in a staged database file if a restore was requested before the last
/// restart. Must be called **before** `db::init` in `setup()` so nothing holds
/// the live DB file open.
///
/// Writes a status sentinel alongside `db_path` that `take_restore_status`
/// consumes on the first post-restore launch to surface a result toast.
/// Never panics — errors are recorded in the sentinel instead.
pub fn apply_pending_restore(db_path: &Path) {
    let data_dir = match db_path.parent() {
        Some(d) => d,
        None => return,
    };

    let marker = data_dir.join("equilibrium.restore.marker");
    if !marker.exists() {
        return;
    }

    let staged = data_dir.join("equilibrium.restore.staged");
    let done = data_dir.join("equilibrium.restore.done");
    let failed = data_dir.join("equilibrium.restore.failed");

    match try_swap(db_path, data_dir, &staged, &marker) {
        Ok(()) => {
            // Clean up any stale failure sentinel from a prior attempt.
            let _ = std::fs::remove_file(&failed);
            let _ = std::fs::write(&done, "Database restored successfully");
        }
        Err(e) => {
            // Leave staged + marker in place so the next launch retries.
            let _ = std::fs::remove_file(&done);
            let _ = std::fs::write(&failed, e.to_string());
        }
    }
}

fn try_swap(
    db_path: &Path,
    data_dir: &Path,
    staged: &Path,
    marker: &Path,
) -> std::io::Result<()> {
    // Remove the live DB and its WAL sidecars before moving the staged file in.
    for candidate in &[
        db_path.to_path_buf(),
        data_dir.join("equilibrium.db-wal"),
        data_dir.join("equilibrium.db-shm"),
    ] {
        if candidate.exists() {
            std::fs::remove_file(candidate)?;
        }
    }
    // Move staged file into the live path.
    std::fs::rename(staged, db_path)?;
    // Remove the marker only after the rename succeeds.
    std::fs::remove_file(marker)?;
    Ok(())
}
