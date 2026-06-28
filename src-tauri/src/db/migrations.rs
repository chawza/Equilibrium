//! Versioned, ordered migration runner — analogous to Django's migration framework.
//!
//! Each `Migration` entry is append-only and must never be renumbered or rewritten
//! once shipped. The `schema_migrations` table (created here on first run) records
//! which versions have been applied. On every startup the runner skips already-applied
//! versions and runs the rest in order, each inside its own transaction.
//!
//! All `up` functions are **idempotent** — safe to call on a DB where the column or
//! table already exists (using `IF NOT EXISTS` / PRAGMA guards). This lets the runner
//! reconcile with DBs that were migrated manually before the version table existed.

use rusqlite::Connection;

// ── Migration definition ──────────────────────────────────────────────────────

pub struct Migration {
    pub version: i32,
    pub name: &'static str,
    pub up: fn(&Connection) -> rusqlite::Result<()>,
}

/// Ordered, append-only migration list.
/// DO NOT renumber or remove entries — only append.
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "base_schema",
        up: m1_base_schema,
    },
    Migration {
        version: 2,
        name: "records_is_adjustment",
        up: m2_records_is_adjustment,
    },
    Migration {
        version: 3,
        name: "budgets_notes",
        up: m3_budgets_notes,
    },
];

// ── Migration runner ──────────────────────────────────────────────────────────

/// Create the `schema_migrations` log table if missing, then apply every
/// migration whose version is not yet recorded, in ascending order.
///
/// Each migration runs inside a transaction: success records the version,
/// failure rolls back that migration and aborts with an error (no partial state).
pub fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    // Ensure the tracking table exists.
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY,
            name       TEXT    NOT NULL,
            applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    // Load the set of already-applied versions.
    let applied: std::collections::HashSet<i32> = {
        let mut stmt = conn.prepare("SELECT version FROM schema_migrations")?;
        let rows: Vec<i32> = stmt
            .query_map([], |row| row.get::<_, i32>(0))?
            .collect::<rusqlite::Result<_>>()?;
        rows.into_iter().collect()
    };

    // Run each un-applied migration in order.
    for m in MIGRATIONS {
        if applied.contains(&m.version) {
            continue;
        }
        conn.execute_batch("BEGIN;")?;
        match (m.up)(conn) {
            Ok(()) => {
                conn.execute(
                    "INSERT INTO schema_migrations (version, name) VALUES (?1, ?2)",
                    rusqlite::params![m.version, m.name],
                )?;
                conn.execute_batch("COMMIT;")?;
            }
            Err(e) => {
                let _ = conn.execute_batch("ROLLBACK;");
                return Err(e);
            }
        }
    }

    Ok(())
}

// ── Individual migration functions ────────────────────────────────────────────

/// v1: Core schema — four base tables.
/// Uses `CREATE TABLE IF NOT EXISTS` so it is safe to run on a DB that was
/// bootstrapped before the migration runner existed.
fn m1_base_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(super::schema::SCHEMA)
}

/// v2: Add `is_adjustment` column to `records`.
/// Guarded by PRAGMA so legacy DBs that received this column out-of-band don't error.
fn m2_records_is_adjustment(conn: &Connection) -> rusqlite::Result<()> {
    let has_col: bool = {
        let mut stmt = conn.prepare("PRAGMA table_info(records)")?;
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<_>>()?;
        cols.iter().any(|c| c == "is_adjustment")
    };
    if !has_col {
        conn.execute_batch(
            "ALTER TABLE records ADD COLUMN is_adjustment INTEGER NOT NULL DEFAULT 0;",
        )?;
    }
    Ok(())
}

/// v3: Add nullable `notes` column to `budgets`.
/// Existing rows get NULL (= "no note"), matching how record-level `notes` is modeled.
fn m3_budgets_notes(conn: &Connection) -> rusqlite::Result<()> {
    let has_col: bool = {
        let mut stmt = conn.prepare("PRAGMA table_info(budgets)")?;
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<_>>()?;
        cols.iter().any(|c| c == "notes")
    };
    if !has_col {
        conn.execute_batch("ALTER TABLE budgets ADD COLUMN notes TEXT;")?;
    }
    Ok(())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    /// Helper: open an in-memory connection with only WAL + FK pragmas applied
    /// (no schema). Used to simulate a brand-new or legacy database.
    fn raw_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA journal_mode = WAL;").unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        conn
    }

    #[test]
    fn fresh_db_applies_all_migrations() {
        let conn = raw_conn();
        run_migrations(&conn).unwrap();

        // All three versions recorded.
        let versions: Vec<i32> = {
            let mut stmt = conn
                .prepare("SELECT version FROM schema_migrations ORDER BY version")
                .unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .collect::<rusqlite::Result<_>>()
                .unwrap()
        };
        assert_eq!(versions, vec![1, 2, 3]);

        // budgets table has a `notes` column.
        let has_notes: bool = {
            let mut stmt = conn.prepare("PRAGMA table_info(budgets)").unwrap();
            let cols: Vec<String> = stmt
                .query_map([], |row| row.get::<_, String>(1))
                .unwrap()
                .collect::<rusqlite::Result<_>>()
                .unwrap();
            cols.iter().any(|c| c == "notes")
        };
        assert!(has_notes, "budgets.notes column should exist after migration");
    }

    #[test]
    fn legacy_db_reconciles_cleanly() {
        // Simulate a DB that was created before the migration runner existed:
        // the four base tables exist, `records.is_adjustment` was already added
        // manually, but `schema_migrations` is absent.
        let conn = raw_conn();
        conn.execute_batch(super::super::schema::SCHEMA).unwrap();
        // is_adjustment already present (legacy manual migration)
        // (schema::SCHEMA already includes it now, so nothing extra to do)

        // Insert a budget row to prove it survives the migration.
        conn.execute(
            "INSERT INTO budgets (name, start_date, end_date) VALUES ('Test', '2026-01-01', '2026-12-31')",
            [],
        )
        .unwrap();

        run_migrations(&conn).unwrap();

        // All three migrations recorded.
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 3);

        // The pre-existing budget row is intact, now with notes = NULL.
        let notes: Option<String> = conn
            .query_row(
                "SELECT notes FROM budgets WHERE name = 'Test'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(notes.is_none(), "existing rows should have notes = NULL");
    }

    #[test]
    fn runner_is_idempotent() {
        let conn = raw_conn();
        // First run.
        run_migrations(&conn).unwrap();
        // Second run — must not error and must not insert duplicate rows.
        run_migrations(&conn).unwrap();

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 3, "each migration should be recorded exactly once");
    }
}
