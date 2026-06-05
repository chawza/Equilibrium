use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;

use crate::db::DbState;

type CmdResult<T> = std::result::Result<T, String>;

// ── Command-facing structs (i32 IDs — specta forbids i64/u64) ─────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BudgetTag {
    pub id: i32,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BudgetRecord {
    pub id: i32,
    pub budget_id: i32,
    #[serde(rename = "type")]
    pub record_type: String, // "inflow" | "outflow"
    pub emoji: String,
    pub label: String,
    pub amount: i32,
    pub notes: Option<String>,
    pub tags: Vec<BudgetTag>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BudgetEntry {
    pub id: i32,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String, // "plan" | "active" | "review" | "closed"
    pub created_at: String,
    pub records: Vec<BudgetRecord>,
}

// ── Private DB helpers ─────────────────────────────────────────────────────────

fn load_tags_for_record(conn: &rusqlite::Connection, record_id: i32) -> CmdResult<Vec<BudgetTag>> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.color
             FROM tags t
             JOIN record_tags rt ON t.id = rt.tag_id
             WHERE rt.record_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let tags = stmt
        .query_map(rusqlite::params![record_id], |row| {
            Ok(BudgetTag {
                id: row.get::<_, i64>(0)? as i32,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(tags)
}

fn load_records_for_budget(
    conn: &rusqlite::Connection,
    budget_id: i32,
) -> CmdResult<Vec<BudgetRecord>> {
    // Collect raw tuples first, then do nested tag queries once stmt is dropped.
    let raw_rows: Vec<(i32, i32, String, String, String, i32, Option<String>)> = {
        let mut stmt = conn
            .prepare(
                "SELECT id, budget_id, type, emoji, label, amount, notes
                 FROM records
                 WHERE budget_id = ?1
                 ORDER BY id ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![budget_id], |row| {
                Ok((
                    row.get::<_, i64>(0)? as i32,
                    row.get::<_, i64>(1)? as i32,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get::<_, i64>(5)? as i32,
                    row.get(6)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect::<Vec<_>>();
        rows
        // stmt is dropped here at end of block
    };

    let mut records = Vec::new();
    for (id, bid, record_type, emoji, label, amount, notes) in raw_rows {
        let tags = load_tags_for_record(conn, id)?;
        records.push(BudgetRecord {
            id,
            budget_id: bid,
            record_type,
            emoji,
            label,
            amount,
            notes,
            tags,
        });
    }
    Ok(records)
}

/// Load a single budget row (already having the id) and its records.
fn load_budget_by_id(conn: &rusqlite::Connection, id: i32) -> CmdResult<BudgetEntry> {
    let (name, start_date, end_date, status, created_at) = conn
        .query_row(
            "SELECT name, start_date, end_date, status, created_at FROM budgets WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;
    let records = load_records_for_budget(conn, id)?;
    Ok(BudgetEntry {
        id,
        name,
        start_date,
        end_date,
        status,
        created_at,
        records,
    })
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
#[specta::specta]
pub fn list_budgets(state: State<'_, DbState>) -> CmdResult<Vec<BudgetEntry>> {
    let conn = state.0.lock().unwrap();

    // Collect budget rows with a scoped stmt so conn is free for nested queries.
    let budget_rows: Vec<(i32, String, String, String, String, String)> = {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, start_date, end_date, status, created_at
                 FROM budgets
                 ORDER BY id DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)? as i32,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect::<Vec<_>>();
        rows
        // stmt dropped here
    };

    let mut budgets = Vec::new();
    for (id, name, start_date, end_date, status, created_at) in budget_rows {
        let records = load_records_for_budget(&conn, id)?;
        budgets.push(BudgetEntry {
            id,
            name,
            start_date,
            end_date,
            status,
            created_at,
            records,
        });
    }
    Ok(budgets)
}

#[tauri::command]
#[specta::specta]
pub fn get_budget(id: i32, state: State<'_, DbState>) -> CmdResult<BudgetEntry> {
    let conn = state.0.lock().unwrap();
    load_budget_by_id(&conn, id)
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
    conn.execute(
        "INSERT INTO budgets (name, start_date, end_date) VALUES (?1, ?2, ?3)",
        rusqlite::params![name, start_date, end_date],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid() as i32;
    let (status, created_at) = conn
        .query_row(
            "SELECT status, created_at FROM budgets WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .map_err(|e| e.to_string())?;
    Ok(BudgetEntry {
        id,
        name,
        start_date,
        end_date,
        status,
        created_at,
        records: vec![],
    })
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
    conn.execute(
        "UPDATE budgets SET name = ?1, start_date = ?2, end_date = ?3, status = ?4 WHERE id = ?5",
        rusqlite::params![name, start_date, end_date, status, id],
    )
    .map_err(|e| e.to_string())?;
    load_budget_by_id(&conn, id)
}

#[tauri::command]
#[specta::specta]
pub fn delete_budget(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM budgets WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
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
    conn.execute(
        "INSERT INTO records (budget_id, type, emoji, label, amount, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![budget_id, r#type, emoji, label, amount, notes],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid() as i32;
    Ok(BudgetRecord {
        id,
        budget_id,
        record_type: r#type,
        emoji,
        label,
        amount,
        notes,
        tags: vec![],
    })
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
    conn.execute(
        "UPDATE records SET emoji = ?1, label = ?2, amount = ?3, notes = ?4 WHERE id = ?5",
        rusqlite::params![emoji, label, amount, notes, id],
    )
    .map_err(|e| e.to_string())?;
    let (budget_id, record_type): (i32, String) = conn
        .query_row(
            "SELECT budget_id, type FROM records WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get::<_, i64>(0)? as i32, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    let tags = load_tags_for_record(&conn, id)?;
    Ok(BudgetRecord {
        id,
        budget_id,
        record_type,
        emoji,
        label,
        amount,
        notes,
        tags,
    })
}

#[tauri::command]
#[specta::specta]
pub fn delete_record(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM records WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_record_tags(
    record_id: i32,
    tag_ids: Vec<i32>,
    state: State<'_, DbState>,
) -> CmdResult<BudgetRecord> {
    let conn = state.0.lock().unwrap();
    // Replace all tags for this record
    conn.execute(
        "DELETE FROM record_tags WHERE record_id = ?1",
        rusqlite::params![record_id],
    )
    .map_err(|e| e.to_string())?;
    for tag_id in &tag_ids {
        conn.execute(
            "INSERT INTO record_tags (record_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![record_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }
    // Reload the record
    let (budget_id, record_type, emoji, label, amount, notes): (
        i32,
        String,
        String,
        String,
        i32,
        Option<String>,
    ) = conn
        .query_row(
            "SELECT budget_id, type, emoji, label, amount, notes FROM records WHERE id = ?1",
            rusqlite::params![record_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)? as i32,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get::<_, i64>(4)? as i32,
                    row.get(5)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;
    let tags = load_tags_for_record(&conn, record_id)?;
    Ok(BudgetRecord {
        id: record_id,
        budget_id,
        record_type,
        emoji,
        label,
        amount,
        notes,
        tags,
    })
}
