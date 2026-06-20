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
    #[cfg(debug_assertions)]
    if let Ok(p) = std::env::var("EQUILIBRIUM_DB") {
        return Ok(std::path::PathBuf::from(p));
    }
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

/// Dump all records to a CSV file at `path`.
///
/// Columns: budget, budget_start, budget_end, type, emoji, label, amount, tags (semicolon-joined),
/// notes, is_adjustment.  The column order matches the import template so exports round-trip
/// cleanly through the Import from CSV flow.
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

/// Write the CSV import template (header + two example rows) to `path`.
///
/// Column order: budget, budget_start, budget_end, type, emoji, label, amount, tags, notes.
/// (is_adjustment is omitted from the template — it's not needed for import.)
#[tauri::command]
#[specta::specta]
pub fn export_csv_template(path: String) -> CmdResult<()> {
    let content = "\
budget,budget_start,budget_end,type,emoji,label,amount,tags,notes\n\
August 2026,2026-08-01,2026-08-31,inflow,💼,Monthly Salary,8500000,salary,March paycheck\n\
August 2026,2026-08-01,2026-08-31,outflow,🛒,Groceries,450000,food;household,Weekly shop\n";
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

/// Parse a CSV file and return a preview grouped by budget for the user to review.
///
/// The frontend renders the preview (accept/decline per record, inflow/outflow toggle)
/// and then passes the approved groups to `import_csv`.
#[tauri::command]
#[specta::specta]
pub fn preview_csv_import(
    state: State<'_, DbState>,
    path: String,
) -> CmdResult<db::data::CsvImportPreview> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let csv_text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    db::data::parse_csv_preview(&conn, &csv_text)
}

/// Insert the user-approved CSV import groups into the database.
///
/// Each group maps to one budget (created if new). Records, tags, and record_tags
/// are created in a single atomic transaction — any failure rolls back all changes.
#[tauri::command]
#[specta::specta]
pub fn import_csv(
    state: State<'_, DbState>,
    groups: Vec<db::data::CsvImportGroup>,
) -> CmdResult<db::data::ImportResult> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::data::import_groups(&conn, groups)
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
