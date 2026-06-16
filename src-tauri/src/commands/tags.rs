use tauri::State;

use crate::commands::validation;
use crate::db::{self, tags::TagWithUsage, DbState};

type CmdResult<T> = std::result::Result<T, String>;

// ── Commands ───────────────────────────────────────────────────────────────────

#[tauri::command]
#[specta::specta]
pub fn list_tags(state: State<'_, DbState>) -> CmdResult<Vec<TagWithUsage>> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::tags::list_tags(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_tag(
    name: String,
    color: String,
    state: State<'_, DbState>,
) -> CmdResult<TagWithUsage> {
    validation::validate_tag_name(&name)?;
    validation::validate_tag_color(&color)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::tags::create_tag(&conn, &name, &color).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_tag(
    id: i32,
    name: String,
    color: String,
    state: State<'_, DbState>,
) -> CmdResult<TagWithUsage> {
    validation::validate_tag_name(&name)?;
    validation::validate_tag_color(&color)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::tags::update_tag(&conn, id, &name, &color).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_tag(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::tags::delete_tag(&conn, id).map_err(|e| e.to_string())
}
