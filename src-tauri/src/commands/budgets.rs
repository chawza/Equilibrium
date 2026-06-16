use tauri::State;

use crate::commands::validation;
use crate::db::{
    self,
    budgets::{BudgetDetail, BudgetRecord, BudgetSummary, StatsFilter, StatsSummary, TagRecord},
    DbState,
};

type CmdResult<T> = std::result::Result<T, String>;

// ── Commands ───────────────────────────────────────────────────────────────────

#[tauri::command]
#[specta::specta]
pub fn list_budgets(state: State<'_, DbState>) -> CmdResult<Vec<BudgetSummary>> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::list_budgets(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_budget(id: i32, state: State<'_, DbState>) -> CmdResult<BudgetDetail> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::get_budget(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_budget(
    name: String,
    start_date: String,
    end_date: String,
    state: State<'_, DbState>,
) -> CmdResult<BudgetDetail> {
    validation::validate_budget_name(&name)?;
    validation::validate_date_range(&start_date, &end_date)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
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
) -> CmdResult<BudgetDetail> {
    validation::validate_budget_name(&name)?;
    validation::validate_date_range(&start_date, &end_date)?;
    validation::validate_budget_status(&status)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::update_budget(&conn, id, &name, &start_date, &end_date, &status)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_budget(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
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
    validation::validate_record_label(&label)?;
    validation::validate_emoji(&emoji)?;
    validation::validate_amount(amount)?;
    validation::validate_notes(notes.as_deref())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
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
    validation::validate_record_label(&label)?;
    validation::validate_emoji(&emoji)?;
    validation::validate_amount(amount)?;
    validation::validate_notes(notes.as_deref())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::update_record(&conn, id, &emoji, &label, amount, notes.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_record(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::delete_record(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_record_tags(
    record_id: i32,
    tag_ids: Vec<i32>,
    state: State<'_, DbState>,
) -> CmdResult<BudgetRecord> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::set_record_tags(&conn, record_id, &tag_ids).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_stats_summary(
    filter: StatsFilter,
    state: State<'_, DbState>,
) -> CmdResult<StatsSummary> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::get_stats_summary(&conn, filter).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn list_records_by_tag(
    tag_id: i32,
    state: State<'_, DbState>,
) -> CmdResult<Vec<TagRecord>> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::budgets::list_records_by_tag(&conn, tag_id).map_err(|e| e.to_string())
}
