use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TagWithUsage {
    pub id: i32,
    pub name: String,
    pub color: String,
    pub usage_count: i32,
}

// ── Repository functions ───────────────────────────────────────────────────────

pub fn list_tags(conn: &Connection) -> Result<Vec<TagWithUsage>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color, COUNT(rt.record_id) AS usage_count
         FROM tags t
         LEFT JOIN record_tags rt ON t.id = rt.tag_id
         GROUP BY t.id
         ORDER BY t.name ASC",
    )?;
    let tags = stmt
        .query_map([], |row| {
            Ok(TagWithUsage {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                usage_count: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(tags)
}

pub fn create_tag(conn: &Connection, name: &str, color: &str) -> Result<TagWithUsage> {
    conn.execute(
        "INSERT INTO tags (name, color) VALUES (?1, ?2)",
        params![name, color],
    )?;
    let id = conn.last_insert_rowid() as i32;
    Ok(TagWithUsage {
        id,
        name: name.to_string(),
        color: color.to_string(),
        usage_count: 0,
    })
}

pub fn update_tag(conn: &Connection, id: i32, name: &str, color: &str) -> Result<TagWithUsage> {
    conn.execute(
        "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
        params![name, color, id],
    )?;
    let usage_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM record_tags WHERE tag_id = ?1",
        params![id],
        |row| row.get(0),
    )?;
    Ok(TagWithUsage {
        id,
        name: name.to_string(),
        color: color.to_string(),
        usage_count,
    })
}

pub fn delete_tag(conn: &Connection, id: i32) -> Result<()> {
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
    Ok(())
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{budgets, test_conn};

    // ── Tag CRUD ─────────────────────────────────────────────────────────────

    #[test]
    fn create_and_list_tags() {
        let conn = test_conn();
        create_tag(&conn, "Food", "green").unwrap();
        create_tag(&conn, "Transport", "blue").unwrap();
        let tags = list_tags(&conn).unwrap();
        assert_eq!(tags.len(), 2);
        // Ordered by name ASC
        assert_eq!(tags[0].name, "Food");
        assert_eq!(tags[1].name, "Transport");
        assert_eq!(tags[0].usage_count, 0);
    }

    #[test]
    fn update_tag_fields() {
        let conn = test_conn();
        let t = create_tag(&conn, "Old Name", "gray").unwrap();
        let updated = update_tag(&conn, t.id, "New Name", "red").unwrap();
        assert_eq!(updated.name, "New Name");
        assert_eq!(updated.color, "red");
        assert_eq!(updated.id, t.id);
    }

    #[test]
    fn delete_tag_cascades_record_tags() {
        let conn = test_conn();
        let t = create_tag(&conn, "Food", "green").unwrap();
        let b = budgets::create_budget(&conn, "B", "Jan 1, 2026", "Dec 31, 2026").unwrap();
        let r =
            budgets::create_record(&conn, b.id, "outflow", "📝", "Groceries", 100, None).unwrap();
        budgets::set_record_tags(&conn, r.id, &[t.id]).unwrap();

        delete_tag(&conn, t.id).unwrap();

        // record_tags rows referencing this tag should cascade-delete
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM record_tags WHERE tag_id = ?1",
                params![t.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn duplicate_tag_name_returns_err() {
        let conn = test_conn();
        create_tag(&conn, "Food", "green").unwrap();
        let result = create_tag(&conn, "Food", "blue");
        assert!(result.is_err());
    }

    #[test]
    fn tag_rename_propagates_through_join() {
        let conn = test_conn();
        let t = create_tag(&conn, "Food", "green").unwrap();
        let b = budgets::create_budget(&conn, "B", "Jan 1, 2026", "Dec 31, 2026").unwrap();
        let r =
            budgets::create_record(&conn, b.id, "outflow", "📝", "Groceries", 100, None).unwrap();
        budgets::set_record_tags(&conn, r.id, &[t.id]).unwrap();

        // Rename + recolor
        update_tag(&conn, t.id, "Groceries", "teal").unwrap();

        // Verify propagation: loading the record should return the updated tag name/color
        let fetched = budgets::get_budget(&conn, b.id).unwrap();
        let record_tags = &fetched.records[0].tags;
        assert_eq!(record_tags.len(), 1);
        assert_eq!(record_tags[0].name, "Groceries");
        assert_eq!(record_tags[0].color, "teal");
    }

    #[test]
    fn usage_count_correct() {
        let conn = test_conn();
        let t = create_tag(&conn, "Food", "green").unwrap();
        let b = budgets::create_budget(&conn, "B", "Jan 1, 2026", "Dec 31, 2026").unwrap();
        let r1 =
            budgets::create_record(&conn, b.id, "outflow", "📝", "Groceries", 100, None).unwrap();
        let r2 =
            budgets::create_record(&conn, b.id, "outflow", "📝", "Snacks", 50, None).unwrap();
        budgets::set_record_tags(&conn, r1.id, &[t.id]).unwrap();
        budgets::set_record_tags(&conn, r2.id, &[t.id]).unwrap();

        let all_tags = list_tags(&conn).unwrap();
        assert_eq!(all_tags.len(), 1);
        assert_eq!(all_tags[0].usage_count, 2);
    }
}
