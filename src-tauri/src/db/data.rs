use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};

// ── Snapshot types (one row per table) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BudgetRow {
    pub id: i32,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TagRow {
    pub id: i32,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

// ── CSV export types & helpers ─────────────────────────────────────────────────

/// One row in the flattened CSV export — one row per record across all budgets.
#[derive(Debug, Serialize)]
pub struct CsvRecordRow {
    pub budget: String,
    pub budget_start: String, // budget start_date ("2026-06-01")
    pub budget_end: String,   // budget end_date   ("2026-06-30")
    pub date: String,         // date portion of record created_at
    #[serde(rename = "type")]
    pub record_type: String,  // "inflow" | "outflow"
    pub amount: i32,
    pub tags: String,         // tag names joined with "|", or "" if none
    pub emoji: String,
    pub note: String,         // empty string when NULL
    pub is_adjustment: bool,
}

/// Build the flat CSV rows — one per record, with budget name/dates and pipe-joined tags.
///
/// Records are ordered by budget then by record creation order.
pub fn dump_csv_rows(conn: &Connection) -> Result<Vec<CsvRecordRow>> {
    let sql = "
        SELECT
            b.name,
            b.start_date,
            b.end_date,
            substr(r.created_at, 1, 10),
            r.type,
            r.amount,
            COALESCE(GROUP_CONCAT(t.name, '|'), '') AS tags,
            r.emoji,
            COALESCE(r.notes, '') AS note,
            r.is_adjustment
        FROM records r
        JOIN budgets b ON r.budget_id = b.id
        LEFT JOIN record_tags rt ON r.id = rt.record_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        GROUP BY r.id
        ORDER BY b.id, r.id
    ";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(CsvRecordRow {
                budget:        row.get(0)?,
                budget_start:  row.get(1)?,
                budget_end:    row.get(2)?,
                date:          row.get(3)?,
                record_type:   row.get(4)?,
                amount:        row.get::<_, i64>(5)? as i32,
                tags:          row.get(6)?,
                emoji:         row.get(7)?,
                note:          row.get(8)?,
                is_adjustment: row.get::<_, bool>(9)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(rows)
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
        let budget = budgets::create_budget(conn, "Budget 1", "2026-01-01", "2026-12-31").unwrap();
        budgets::create_record(conn, budget.id, "inflow", "💰", "Salary", 5_000_000, None).unwrap();
        let tag = tags::create_tag(conn, "Food", "green").unwrap();
        let groceries =
            budgets::create_record(conn, budget.id, "outflow", "🛒", "Groceries", 500_000, None)
                .unwrap();
        budgets::set_record_tags(conn, groceries.id, &[tag.id]).unwrap();
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

    // ── dump_csv_rows ─────────────────────────────────────────────────────────

    #[test]
    fn csv_rows_correct_count_and_shape() {
        let conn = test_conn();
        populate(&conn);
        let rows = dump_csv_rows(&conn).unwrap();
        // populate() creates 2 records (Salary + Groceries)
        assert_eq!(rows.len(), 2);

        let salary = rows.iter().find(|r| r.record_type == "inflow").unwrap();
        assert_eq!(salary.budget, "Budget 1");
        assert_eq!(salary.budget_start, "2026-01-01");
        assert_eq!(salary.budget_end, "2026-12-31");
        assert_eq!(salary.emoji, "💰");
        assert_eq!(salary.amount, 5_000_000);
        assert_eq!(salary.tags, ""); // no tags on salary

        let groceries = rows.iter().find(|r| r.record_type == "outflow").unwrap();
        assert_eq!(groceries.tags, "Food"); // exactly one tag, no pipe
        assert_eq!(groceries.amount, 500_000);
    }

    #[test]
    fn csv_rows_pipe_joins_multiple_tags() {
        let conn = test_conn();
        let budget = budgets::create_budget(&conn, "B", "2026-01-01", "2026-12-31").unwrap();
        let r =
            budgets::create_record(&conn, budget.id, "outflow", "🛒", "Item", 1_000, None).unwrap();
        let t1 = tags::create_tag(&conn, "Alpha", "red").unwrap();
        let t2 = tags::create_tag(&conn, "Beta", "blue").unwrap();
        budgets::set_record_tags(&conn, r.id, &[t1.id, t2.id]).unwrap();

        let rows = dump_csv_rows(&conn).unwrap();
        assert_eq!(rows.len(), 1);
        // Tags may be in insertion order; both names must appear pipe-separated
        let tags = &rows[0].tags;
        assert!(tags.contains('|'), "expected pipe separator, got: {tags}");
        assert!(tags.contains("Alpha"), "missing Alpha in: {tags}");
        assert!(tags.contains("Beta"), "missing Beta in: {tags}");
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
            budgets::create_budget(&src_conn, "Test Budget", "2026-01-01", "2026-12-31")
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
            .query_row("SELECT COUNT(*) FROM budgets", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
        let name: String = dst_conn
            .query_row("SELECT name FROM budgets LIMIT 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Test Budget");
    }

}
