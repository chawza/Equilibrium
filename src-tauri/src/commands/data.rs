use std::path::PathBuf;
use tauri::{Manager, State};

use crate::db::{self, data::DataSnapshot, DbState};

type CmdResult<T> = std::result::Result<T, String>;

// ── Helper: resolve DB path ────────────────────────────────────────────────────

fn db_path(app: &tauri::AppHandle) -> CmdResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("equilibrium.db"))
        .map_err(|e| e.to_string())
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

/// Replace all data from a JSON file previously created by `export_to_path`.
#[tauri::command]
#[specta::specta]
pub fn import_from_path(state: State<'_, DbState>, path: String) -> CmdResult<()> {
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let snapshot: DataSnapshot = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::data::restore(&conn, &snapshot).map_err(|e| e.to_string())
}

/// Copy the raw SQLite database file to `dest`.
#[tauri::command]
#[specta::specta]
pub fn copy_db(app: tauri::AppHandle, dest: String) -> CmdResult<()> {
    let src = db_path(&app)?;
    std::fs::copy(&src, &dest)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Permanently delete all budgets, records, tags, and record_tags.
#[tauri::command]
#[specta::specta]
pub fn reset_all_data(state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::data::reset(&conn).map_err(|e| e.to_string())
}
