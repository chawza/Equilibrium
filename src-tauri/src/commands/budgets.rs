use tauri::State;

use crate::db::{
    self,
    budgets::{BudgetEntry, BudgetRecord},
    DbState,
};

type CmdResult<T> = std::result::Result<T, String>;

// ── Commands ───────────────────────────────────────────────────────────────────

#[tauri::command]
#[specta::specta]
pub fn list_budgets(state: State<'_, DbState>) -> CmdResult<Vec<BudgetEntry>> {
    let conn = state.0.lock().unwrap();
    db::budgets::list_budgets(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_budget(id: i32, state: State<'_, DbState>) -> CmdResult<BudgetEntry> {
    let conn = state.0.lock().unwrap();
    db::budgets::get_budget(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_budget(
    name: String,
    start_date: String,
    end_date: String,
    state: State<'_, DbState>,
) -> CmdResult<BudgetEntry> {
    let conn = state.0.lock().unwrap();
    db::budgets::create_budget(&conn, &name, &start_date, &end_date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_budget(
    id: i32,
    name: String,
    start_date: String,
    end_date: String,
    status: String,
    state: State<'_, DbState>,
) -> CmdResult<BudgetEntry> {
    let conn = state.0.lock().unwrap();
    db::budgets::update_budget(&conn, id, &name, &start_date, &end_date, &status)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_budget(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().unwrap();
    db::budgets::delete_budget(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_record(
    budget_id: i32,
    r#type: String,
    emoji: String,
    label: String,
    amount: i32,
    notes: Option<String>,
    state: State<'_, DbState>,
) -> CmdResult<BudgetRecord> {
    let conn = state.0.lock().unwrap();
    db::budgets::create_record(&conn, budget_id, &r#type, &emoji, &label, amount, notes.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_record(
    id: i32,
    emoji: String,
    label: String,
    amount: i32,
    notes: Option<String>,
    state: State<'_, DbState>,
) -> CmdResult<BudgetRecord> {
    let conn = state.0.lock().unwrap();
    db::budgets::update_record(&conn, id, &emoji, &label, amount, notes.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_record(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().unwrap();
    db::budgets::delete_record(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_record_tags(
    record_id: i32,
    tag_ids: Vec<i32>,
    state: State<'_, DbState>,
) -> CmdResult<BudgetRecord> {
    let conn = state.0.lock().unwrap();
    db::budgets::set_record_tags(&conn, record_id, &tag_ids).map_err(|e| e.to_string())
}
