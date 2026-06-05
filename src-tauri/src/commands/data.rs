use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
use tauri::{Manager, State};

use crate::db::DbState;

type CmdResult<T> = std::result::Result<T, String>;

// ── Snapshot types (one row per table) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
struct BudgetRow {
    id: i32,
    name: String,
    start_date: String,
    end_date: String,
    status: String,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
struct RecordRow {
    id: i32,
    budget_id: i32,
    #[serde(rename = "type")]
    record_type: String,
    emoji: String,
    label: String,
    amount: i32,
    notes: Option<String>,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
struct TagRow {
    id: i32,
    name: String,
    color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
struct RecordTagRow {
    record_id: i32,
    tag_id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
struct DataSnapshot {
    budgets: Vec<BudgetRow>,
    records: Vec<RecordRow>,
    tags: Vec<TagRow>,
    record_tags: Vec<RecordTagRow>,
}

// ── Helper: resolve DB path ────────────────────────────────────────────────────

fn db_path(app: &tauri::AppHandle) -> CmdResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("equilibrium.db"))
        .map_err(|e| e.to_string())
}

// ── Helper: dump all tables into a DataSnapshot ────────────────────────────────

fn dump(conn: &rusqlite::Connection) -> CmdResult<DataSnapshot> {
    // Budgets
    let budgets: Vec<BudgetRow> = {
        let mut stmt = conn
            .prepare("SELECT id, name, start_date, end_date, status, created_at FROM budgets")
            .map_err(|e| e.to_string())?;
        let rows: Vec<BudgetRow> = stmt
            .query_map([], |row| {
                Ok(BudgetRow {
                    id: row.get::<_, i64>(0)? as i32,
                    name: row.get(1)?,
                    start_date: row.get(2)?,
                    end_date: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    // Records
    let records: Vec<RecordRow> = {
        let mut stmt = conn
            .prepare(
                "SELECT id, budget_id, type, emoji, label, amount, notes, created_at FROM records",
            )
            .map_err(|e| e.to_string())?;
        let rows: Vec<RecordRow> = stmt
            .query_map([], |row| {
                Ok(RecordRow {
                    id: row.get::<_, i64>(0)? as i32,
                    budget_id: row.get::<_, i64>(1)? as i32,
                    record_type: row.get(2)?,
                    emoji: row.get(3)?,
                    label: row.get(4)?,
                    amount: row.get::<_, i64>(5)? as i32,
                    notes: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    // Tags
    let tags: Vec<TagRow> = {
        let mut stmt = conn
            .prepare("SELECT id, name, color FROM tags")
            .map_err(|e| e.to_string())?;
        let rows: Vec<TagRow> = stmt
            .query_map([], |row| {
                Ok(TagRow {
                    id: row.get::<_, i64>(0)? as i32,
                    name: row.get(1)?,
                    color: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    // Record-tag links
    let record_tags: Vec<RecordTagRow> = {
        let mut stmt = conn
            .prepare("SELECT record_id, tag_id FROM record_tags")
            .map_err(|e| e.to_string())?;
        let rows: Vec<RecordTagRow> = stmt
            .query_map([], |row| {
                Ok(RecordTagRow {
                    record_id: row.get::<_, i64>(0)? as i32,
                    tag_id: row.get::<_, i64>(1)? as i32,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    Ok(DataSnapshot {
        budgets,
        records,
        tags,
        record_tags,
    })
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
    let snapshot = dump(&conn)?;
    serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())
}

/// Dump all data to a JSON file at `path`.
#[tauri::command]
#[specta::specta]
pub fn export_to_path(state: State<'_, DbState>, path: String) -> CmdResult<()> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let snapshot = dump(&conn)?;
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

    // Wipe existing data in FK-safe order
    conn.execute_batch(
        "BEGIN;
         DELETE FROM record_tags;
         DELETE FROM records;
         DELETE FROM tags;
         DELETE FROM budgets;",
    )
    .map_err(|e| e.to_string())?;

    // Re-insert budgets (preserve original ids for FK integrity)
    {
        let mut stmt = conn
            .prepare(
                "INSERT INTO budgets (id, name, start_date, end_date, status, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )
            .map_err(|e| e.to_string())?;
        for b in &snapshot.budgets {
            stmt.execute(rusqlite::params![
                b.id, b.name, b.start_date, b.end_date, b.status, b.created_at
            ])
            .map_err(|e| e.to_string())?;
        }
    }

    // Re-insert tags
    {
        let mut stmt = conn
            .prepare("INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)")
            .map_err(|e| e.to_string())?;
        for t in &snapshot.tags {
            stmt.execute(rusqlite::params![t.id, t.name, t.color])
                .map_err(|e| e.to_string())?;
        }
    }

    // Re-insert records
    {
        let mut stmt = conn
            .prepare(
                "INSERT INTO records (id, budget_id, type, emoji, label, amount, notes, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            )
            .map_err(|e| e.to_string())?;
        for r in &snapshot.records {
            stmt.execute(rusqlite::params![
                r.id,
                r.budget_id,
                r.record_type,
                r.emoji,
                r.label,
                r.amount,
                r.notes,
                r.created_at
            ])
            .map_err(|e| e.to_string())?;
        }
    }

    // Re-insert record_tags
    {
        let mut stmt = conn
            .prepare("INSERT INTO record_tags (record_id, tag_id) VALUES (?1, ?2)")
            .map_err(|e| e.to_string())?;
        for rt in &snapshot.record_tags {
            stmt.execute(rusqlite::params![rt.record_id, rt.tag_id])
                .map_err(|e| e.to_string())?;
        }
    }

    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    Ok(())
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
    conn.execute_batch(
        "BEGIN;
         DELETE FROM record_tags;
         DELETE FROM records;
         DELETE FROM tags;
         DELETE FROM budgets;
         COMMIT;",
    )
    .map_err(|e| e.to_string())
}
