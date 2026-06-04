use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;

use crate::db::DbState;

type CmdResult<T> = std::result::Result<T, String>;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TagWithUsage {
    pub id: i32,
    pub name: String,
    pub color: String,
    pub usage_count: i32,
}

#[tauri::command]
#[specta::specta]
pub fn list_tags(state: State<'_, DbState>) -> CmdResult<Vec<TagWithUsage>> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.color, COUNT(rt.record_id) AS usage_count
             FROM tags t
             LEFT JOIN record_tags rt ON t.id = rt.tag_id
             GROUP BY t.id
             ORDER BY t.name ASC",
        )
        .map_err(|e| e.to_string())?;
    let tags = stmt
        .query_map([], |row| {
            Ok(TagWithUsage {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                usage_count: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

#[tauri::command]
#[specta::specta]
pub fn create_tag(name: String, color: String, state: State<'_, DbState>) -> CmdResult<TagWithUsage> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO tags (name, color) VALUES (?1, ?2)",
        rusqlite::params![name, color],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid() as i32;
    Ok(TagWithUsage {
        id,
        name,
        color,
        usage_count: 0,
    })
}

#[tauri::command]
#[specta::specta]
pub fn update_tag(
    id: i32,
    name: String,
    color: String,
    state: State<'_, DbState>,
) -> CmdResult<TagWithUsage> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
        rusqlite::params![name, color, id],
    )
    .map_err(|e| e.to_string())?;
    let usage_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM record_tags WHERE tag_id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(TagWithUsage {
        id,
        name,
        color,
        usage_count,
    })
}

#[tauri::command]
#[specta::specta]
pub fn delete_tag(id: i32, state: State<'_, DbState>) -> CmdResult<()> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
