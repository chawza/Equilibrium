use std::path::PathBuf;
use tauri::{Manager, State};

use crate::db::{self, DbState};

type CmdResult<T> = std::result::Result<T, String>;

// ── Restore outcome (surfaced via take_restore_status on next launch) ─────────

/// Returned by `take_restore_status` once per restore attempt.
#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct RestoreOutcome {
    pub ok: bool,
    pub message: String,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

fn db_path(app: &tauri::AppHandle) -> CmdResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("equilibrium.db"))
        .map_err(|e| e.to_string())
}

fn app_data_dir(app: &tauri::AppHandle) -> CmdResult<PathBuf> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

// ── Commands ───────────────────────────────────────────────────────────────────

/// Return the on-disk path of the SQLite database file.
#[tauri::command]
#[specta::specta]
pub fn get_db_path(app: tauri::AppHandle) -> CmdResult<String> {
    db_path(&app).map(|p| p.to_string_lossy().into_owned())
}

/// Return a full JSON dump of all user data.
#[tauri::command]
#[specta::specta]
pub fn export_json(state: State<'_, DbState>) -> CmdResult<String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let snapshot = db::data::dump(&conn).map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())
}

/// Dump all data to a JSON file at `path`.
#[tauri::command]
#[specta::specta]
pub fn export_to_path(state: State<'_, DbState>, path: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let snapshot = db::data::dump(&conn).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

/// Dump all data to a CSV file at `path` — one row per record.
///
/// Columns: budget, date, type, amount, tags (pipe-joined), emoji, note, is_adjustment.
#[tauri::command]
#[specta::specta]
pub fn export_csv(state: State<'_, DbState>, path: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let rows = db::data::dump_csv_rows(&conn).map_err(|e| e.to_string())?;
    let mut wtr = csv::Writer::from_writer(vec![]);
    for row in &rows {
        wtr.serialize(row).map_err(|e| e.to_string())?;
    }
    let bytes = wtr.into_inner().map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

/// Copy the raw SQLite database file to `dest`.
///
/// Checkpoints the WAL first so recent writes are flushed into the main file
/// and the backup is complete and consistent.
#[tauri::command]
#[specta::specta]
pub fn copy_db(
    app: tauri::AppHandle,
    state: State<'_, DbState>,
    dest: String,
) -> CmdResult<()> {
    let src = db_path(&app)?;
    // Flush WAL into the main file so the copy contains all committed writes.
    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| e.to_string())?;
    }
    std::fs::copy(&src, &dest)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Validate a `.db` file as an Equilibrium backup, stage it, then restart the
/// app so the startup handler can swap it in before opening the live connection.
///
/// Returns `Err` immediately on any validation or I/O failure — no restart
/// occurs and the live database is untouched. On success this function diverges
/// (the process restarts) and the `Ok` arm is never reached by the caller.
#[tauri::command]
#[specta::specta]
pub fn stage_restore(app: tauri::AppHandle, src: String) -> CmdResult<()> {
    // 1. Open the candidate file read-only for validation.
    let candidate = rusqlite::Connection::open_with_flags(
        &src,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .map_err(|e| format!("Not a valid SQLite database: {e}"))?;

    // 2. Integrity check — must return exactly "ok".
    let integrity: String = candidate
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| format!("Integrity check failed: {e}"))?;
    if integrity != "ok" {
        return Err(format!("Database integrity check failed: {integrity}"));
    }

    // 3. Verify all four Equilibrium tables are present.
    for table in ["budgets", "records", "tags", "record_tags"] {
        let count: i32 = candidate
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?1",
                rusqlite::params![table],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        if count == 0 {
            return Err(format!(
                "Not an Equilibrium database: missing table '{table}'"
            ));
        }
    }
    drop(candidate);

    let data_dir = app_data_dir(&app)?;
    let staged = data_dir.join("equilibrium.restore.staged");
    let marker = data_dir.join("equilibrium.restore.marker");

    // 4. Stage: copy the candidate to the staging path.
    std::fs::copy(&src, &staged)
        .map_err(|e| format!("Failed to stage backup file: {e}"))?;

    // 5. Write the marker only after the copy fully succeeds, so a half-written
    //    staged file (e.g. disk full mid-copy) is never swapped in.
    std::fs::write(&marker, b"")
        .map_err(|e| format!("Failed to write restore marker: {e}"))?;

    // 6. Restart — diverges; the startup handler in lib.rs::setup() detects the
    //    marker before opening the DB and swaps the staged file into place.
    tauri::process::restart(&app.env());
}

/// Check for a pending restore outcome written by the startup handler and
/// consume it (deletes the sentinel file). Returns `Some` exactly once per
/// restore attempt, then `None` on all subsequent calls.
///
/// Call this from the frontend `onMount` to surface a post-restart toast.
#[tauri::command]
#[specta::specta]
pub fn take_restore_status(app: tauri::AppHandle) -> CmdResult<Option<RestoreOutcome>> {
    let data_dir = app_data_dir(&app)?;
    let done_path = data_dir.join("equilibrium.restore.done");
    let failed_path = data_dir.join("equilibrium.restore.failed");

    if done_path.exists() {
        std::fs::remove_file(&done_path).ok();
        return Ok(Some(RestoreOutcome {
            ok: true,
            message: "Database restored successfully".to_string(),
        }));
    }

    if failed_path.exists() {
        let msg = std::fs::read_to_string(&failed_path)
            .unwrap_or_else(|_| "Unknown error".to_string());
        std::fs::remove_file(&failed_path).ok();
        return Ok(Some(RestoreOutcome {
            ok: false,
            message: format!("Restore failed: {msg}"),
        }));
    }

    Ok(None)
}

/// Permanently delete all budgets, records, tags, and record_tags.
#[tauri::command]
#[specta::specta]
pub fn reset_all_data(state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::data::reset(&conn).map_err(|e| e.to_string())
}
