use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

// ── Snapshot types (one row per table) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetRow {
    pub id: i32,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordRow {
    pub id: i32,
    pub budget_id: i32,
    #[serde(rename = "type")]
    pub record_type: String,
    pub emoji: String,
    pub label: String,
    pub amount: i32,
    pub notes: Option<String>,
    pub is_adjustment: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagRow {
    pub id: i32,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordTagRow {
    pub record_id: i32,
    pub tag_id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataSnapshot {
    pub budgets: Vec<BudgetRow>,
    pub records: Vec<RecordRow>,
    pub tags: Vec<TagRow>,
    pub record_tags: Vec<RecordTagRow>,
}

// ── Repository functions ───────────────────────────────────────────────────────

/// Dump all four tables into a `DataSnapshot`.
pub fn dump(conn: &Connection) -> Result<DataSnapshot> {
    let budgets: Vec<BudgetRow> = {
        let mut stmt = conn
            .prepare("SELECT id, name, start_date, end_date, status, created_at FROM budgets")?;
        let rows = stmt
            .query_map([], |row| {
                Ok(BudgetRow {
                    id: row.get::<_, i64>(0)? as i32,
                    name: row.get(1)?,
                    start_date: row.get(2)?,
                    end_date: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        rows
    };

    let records: Vec<RecordRow> = {
        let mut stmt = conn.prepare(
            "SELECT id, budget_id, type, emoji, label, amount, notes, is_adjustment, created_at \
             FROM records",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(RecordRow {
                    id: row.get::<_, i64>(0)? as i32,
                    budget_id: row.get::<_, i64>(1)? as i32,
                    record_type: row.get(2)?,
                    emoji: row.get(3)?,
                    label: row.get(4)?,
                    amount: row.get::<_, i64>(5)? as i32,
                    notes: row.get(6)?,
                    is_adjustment: row.get::<_, bool>(7)?,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        rows
    };

    let tags: Vec<TagRow> = {
        let mut stmt = conn.prepare("SELECT id, name, color FROM tags")?;
        let rows = stmt
            .query_map([], |row| {
                Ok(TagRow {
                    id: row.get::<_, i64>(0)? as i32,
                    name: row.get(1)?,
                    color: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        rows
    };

    let record_tags: Vec<RecordTagRow> = {
        let mut stmt = conn.prepare("SELECT record_id, tag_id FROM record_tags")?;
        let rows = stmt
            .query_map([], |row| {
                Ok(RecordTagRow {
                    record_id: row.get::<_, i64>(0)? as i32,
                    tag_id: row.get::<_, i64>(1)? as i32,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        rows
    };

    Ok(DataSnapshot {
        budgets,
        records,
        tags,
        record_tags,
    })
}

/// Wipe all data and re-insert from `snapshot`, preserving original IDs.
pub fn restore(conn: &Connection, snapshot: &DataSnapshot) -> Result<()> {
    // Wipe in FK-safe order inside a transaction
    conn.execute_batch(
        "BEGIN;
         DELETE FROM record_tags;
         DELETE FROM records;
         DELETE FROM tags;
         DELETE FROM budgets;",
    )?;

    // Re-insert budgets (preserve original ids for FK integrity)
    {
        let mut stmt = conn.prepare(
            "INSERT INTO budgets (id, name, start_date, end_date, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )?;
        for b in &snapshot.budgets {
            stmt.execute(params![
                b.id,
                b.name,
                b.start_date,
                b.end_date,
                b.status,
                b.created_at
            ])?;
        }
    }

    // Re-insert tags
    {
        let mut stmt =
            conn.prepare("INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)")?;
        for t in &snapshot.tags {
            stmt.execute(params![t.id, t.name, t.color])?;
        }
    }

    // Re-insert records
    {
        let mut stmt = conn.prepare(
            "INSERT INTO records \
             (id, budget_id, type, emoji, label, amount, notes, is_adjustment, created_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        )?;
        for r in &snapshot.records {
            stmt.execute(params![
                r.id,
                r.budget_id,
                r.record_type,
                r.emoji,
                r.label,
                r.amount,
                r.notes,
                r.is_adjustment,
                r.created_at
            ])?;
        }
    }

    // Re-insert record_tags
    {
        let mut stmt =
            conn.prepare("INSERT INTO record_tags (record_id, tag_id) VALUES (?1, ?2)")?;
        for rt in &snapshot.record_tags {
            stmt.execute(params![rt.record_id, rt.tag_id])?;
        }
    }

    conn.execute_batch("COMMIT;")?;
    Ok(())
}

/// Delete all rows from all four tables in FK-safe order.
pub fn reset(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "BEGIN;
         DELETE FROM record_tags;
         DELETE FROM records;
         DELETE FROM tags;
         DELETE FROM budgets;
         COMMIT;",
    )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{budgets, tags, test_conn};

    fn populate(conn: &Connection) {
        let b = budgets::create_budget(conn, "Budget 1", "Jan 1, 2026", "Dec 31, 2026").unwrap();
        budgets::create_record(conn, b.id, "inflow", "💰", "Salary", 5_000_000, None).unwrap();
        let t = tags::create_tag(conn, "Food", "green").unwrap();
        let r =
            budgets::create_record(conn, b.id, "outflow", "🛒", "Groceries", 500_000, None)
                .unwrap();
        budgets::set_record_tags(conn, r.id, &[t.id]).unwrap();
    }

    // ── dump ─────────────────────────────────────────────────────────────────

    #[test]
    fn dump_returns_correct_shape() {
        let conn = test_conn();
        populate(&conn);
        let snap = dump(&conn).unwrap();
        assert_eq!(snap.budgets.len(), 1);
        assert_eq!(snap.records.len(), 2);
        assert_eq!(snap.tags.len(), 1);
        assert_eq!(snap.record_tags.len(), 1);
    }

    #[test]
    fn dump_empty_db() {
        let conn = test_conn();
        let snap = dump(&conn).unwrap();
        assert!(snap.budgets.is_empty());
        assert!(snap.records.is_empty());
        assert!(snap.tags.is_empty());
        assert!(snap.record_tags.is_empty());
    }

    // ── reset ────────────────────────────────────────────────────────────────

    #[test]
    fn reset_empties_all_tables() {
        let conn = test_conn();
        populate(&conn);
        reset(&conn).unwrap();
        let snap = dump(&conn).unwrap();
        assert!(snap.budgets.is_empty());
        assert!(snap.records.is_empty());
        assert!(snap.tags.is_empty());
        assert!(snap.record_tags.is_empty());
    }

    // ── dump/restore round-trip ───────────────────────────────────────────────

    #[test]
    fn dump_restore_round_trip_populated() {
        let conn = test_conn();
        populate(&conn);
        let original = dump(&conn).unwrap();

        reset(&conn).unwrap();
        restore(&conn, &original).unwrap();

        let after = dump(&conn).unwrap();
        assert_eq!(after.budgets.len(), original.budgets.len());
        assert_eq!(after.records.len(), original.records.len());
        assert_eq!(after.tags.len(), original.tags.len());
        assert_eq!(after.record_tags.len(), original.record_tags.len());
        // Original IDs preserved
        assert_eq!(after.budgets[0].id, original.budgets[0].id);
        assert_eq!(after.records[0].id, original.records[0].id);
        assert_eq!(after.tags[0].id, original.tags[0].id);
    }

    #[test]
    fn dump_restore_round_trip_empty() {
        let conn = test_conn();
        let original = dump(&conn).unwrap();
        reset(&conn).unwrap();
        restore(&conn, &original).unwrap();
        let after = dump(&conn).unwrap();
        assert!(after.budgets.is_empty());
        assert!(after.records.is_empty());
    }

    #[test]
    fn restore_to_different_connection() {
        let conn1 = test_conn();
        populate(&conn1);
        let snap = dump(&conn1).unwrap();

        let conn2 = test_conn();
        restore(&conn2, &snap).unwrap();
        let restored = dump(&conn2).unwrap();
        assert_eq!(restored.budgets[0].name, snap.budgets[0].name);
        assert_eq!(restored.records.len(), snap.records.len());
        assert_eq!(restored.record_tags.len(), snap.record_tags.len());
    }

    // ── JSON round-trip via tempfile ──────────────────────────────────────────

    #[test]
    fn json_round_trip_via_tempfile() {
        use std::fs;
        use tempfile::tempdir;

        let conn = test_conn();
        populate(&conn);
        let original = dump(&conn).unwrap();

        let dir = tempdir().unwrap();
        let path = dir.path().join("export.json");

        // Write snapshot to file
        let json = serde_json::to_string_pretty(&original).unwrap();
        fs::write(&path, &json).unwrap();

        // Read back and deserialize
        let loaded: DataSnapshot =
            serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();

        // Restore into a fresh connection
        let conn2 = test_conn();
        restore(&conn2, &loaded).unwrap();
        let after = dump(&conn2).unwrap();

        assert_eq!(after.budgets.len(), original.budgets.len());
        assert_eq!(after.records.len(), original.records.len());
        assert_eq!(after.budgets[0].id, original.budgets[0].id);
        assert_eq!(after.budgets[0].name, original.budgets[0].name);
    }

    // ── copy_db (file-level copy) ─────────────────────────────────────────────

    #[test]
    fn copy_db_file_round_trip() {
        use tempfile::tempdir;

        let dir = tempdir().unwrap();
        let src_path = dir.path().join("src.db");
        let dst_path = dir.path().join("dst.db");

        // Create a real file-backed DB with one budget
        {
            let src_conn = crate::db::init(&src_path).unwrap();
            budgets::create_budget(&src_conn, "Test Budget", "Jan 1, 2026", "Dec 31, 2026")
                .unwrap();
        }

        // Copy the file
        std::fs::copy(&src_path, &dst_path).unwrap();

        // Open the copy and verify it contains the same data
        let dst_conn = rusqlite::Connection::open(&dst_path).unwrap();
        dst_conn
            .execute_batch("PRAGMA foreign_keys = ON;")
            .unwrap();
        let count: i32 = dst_conn
            .query_row("SELECT COUNT(*) FROM budgets", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
        let name: String = dst_conn
            .query_row("SELECT name FROM budgets LIMIT 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "Test Budget");
    }
}
