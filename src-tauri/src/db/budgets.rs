use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use specta::Type;

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
    /// True when this record was created while the parent budget was in "needs review"
    /// (active + strictly past end_date). Immutable — set once at creation.
    pub is_adjustment: bool,
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

fn load_tags_for_record(conn: &Connection, record_id: i32) -> Result<Vec<BudgetTag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color
         FROM tags t
         JOIN record_tags rt ON t.id = rt.tag_id
         WHERE rt.record_id = ?1",
    )?;
    let tags = stmt
        .query_map(params![record_id], |row| {
            Ok(BudgetTag {
                id: row.get::<_, i64>(0)? as i32,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(tags)
}

fn load_records_for_budget(conn: &Connection, budget_id: i32) -> Result<Vec<BudgetRecord>> {
    // Collect raw tuples first, then do nested tag queries once stmt is dropped.
    let raw_rows: Vec<(i32, i32, String, String, String, i32, Option<String>, bool)> = {
        let mut stmt = conn.prepare(
            "SELECT id, budget_id, type, emoji, label, amount, notes, is_adjustment
             FROM records
             WHERE budget_id = ?1
             ORDER BY id ASC",
        )?;
        // Bind to a local so the borrow on stmt is released before the block ends.
        let rows = stmt
            .query_map(params![budget_id], |row| {
                Ok((
                    row.get::<_, i64>(0)? as i32,
                    row.get::<_, i64>(1)? as i32,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get::<_, i64>(5)? as i32,
                    row.get(6)?,
                    row.get::<_, bool>(7)?,
                ))
            })?
            .collect::<Result<Vec<_>>>()?;
        rows
    };

    let mut records = Vec::new();
    for (id, bid, record_type, emoji, label, amount, notes, is_adjustment) in raw_rows {
        let tags = load_tags_for_record(conn, id)?;
        records.push(BudgetRecord {
            id,
            budget_id: bid,
            record_type,
            emoji,
            label,
            amount,
            notes,
            is_adjustment,
            tags,
        });
    }
    Ok(records)
}

/// Load a single budget row (already having the id) and its records.
pub fn load_budget_by_id(conn: &Connection, id: i32) -> Result<BudgetEntry> {
    let (name, start_date, end_date, status, created_at) = conn.query_row(
        "SELECT name, start_date, end_date, status, created_at FROM budgets WHERE id = ?1",
        params![id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        },
    )?;
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

// ── Repository functions ───────────────────────────────────────────────────────

pub fn list_budgets(conn: &Connection) -> Result<Vec<BudgetEntry>> {
    let budget_rows: Vec<(i32, String, String, String, String, String)> = {
        let mut stmt = conn.prepare(
            "SELECT id, name, start_date, end_date, status, created_at
             FROM budgets
             ORDER BY id DESC",
        )?;
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
            })?
            .collect::<Result<Vec<_>>>()?;
        rows
    };

    let mut budgets = Vec::new();
    for (id, name, start_date, end_date, status, created_at) in budget_rows {
        let records = load_records_for_budget(conn, id)?;
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

pub fn get_budget(conn: &Connection, id: i32) -> Result<BudgetEntry> {
    load_budget_by_id(conn, id)
}

pub fn create_budget(
    conn: &Connection,
    name: &str,
    start_date: &str,
    end_date: &str,
) -> Result<BudgetEntry> {
    conn.execute(
        "INSERT INTO budgets (name, start_date, end_date) VALUES (?1, ?2, ?3)",
        params![name, start_date, end_date],
    )?;
    let id = conn.last_insert_rowid() as i32;
    let (status, created_at) = conn.query_row(
        "SELECT status, created_at FROM budgets WHERE id = ?1",
        params![id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    )?;
    Ok(BudgetEntry {
        id,
        name: name.to_string(),
        start_date: start_date.to_string(),
        end_date: end_date.to_string(),
        status,
        created_at,
        records: vec![],
    })
}

pub fn update_budget(
    conn: &Connection,
    id: i32,
    name: &str,
    start_date: &str,
    end_date: &str,
    status: &str,
) -> Result<BudgetEntry> {
    conn.execute(
        "UPDATE budgets SET name = ?1, start_date = ?2, end_date = ?3, status = ?4 WHERE id = ?5",
        params![name, start_date, end_date, status, id],
    )?;
    load_budget_by_id(conn, id)
}

pub fn delete_budget(conn: &Connection, id: i32) -> Result<()> {
    conn.execute("DELETE FROM budgets WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn create_record(
    conn: &Connection,
    budget_id: i32,
    record_type: &str,
    emoji: &str,
    label: &str,
    amount: i32,
    notes: Option<&str>,
) -> Result<BudgetRecord> {
    // Determine is_adjustment: true only if the parent budget is active AND strictly
    // past its end_date (i.e. end_date < today — the "needs review" condition).
    let is_adjustment = {
        let result: Option<(String, String)> = conn
            .query_row(
                "SELECT status, end_date FROM budgets WHERE id = ?1",
                params![budget_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .ok();
        if let Some((status, end_date)) = result {
            if status == "active" {
                let today: String = conn
                    .query_row("SELECT date('now','localtime')", [], |row| row.get(0))
                    .unwrap_or_default();
                // Strictly past: end_date is ISO ("2026-06-01") — compares lexically with date('now')
                end_date < today
            } else {
                false
            }
        } else {
            false
        }
    };

    conn.execute(
        "INSERT INTO records (budget_id, type, emoji, label, amount, notes, is_adjustment) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![budget_id, record_type, emoji, label, amount, notes, is_adjustment],
    )?;
    let id = conn.last_insert_rowid() as i32;
    Ok(BudgetRecord {
        id,
        budget_id,
        record_type: record_type.to_string(),
        emoji: emoji.to_string(),
        label: label.to_string(),
        amount,
        notes: notes.map(|s| s.to_string()),
        is_adjustment,
        tags: vec![],
    })
}

pub fn update_record(
    conn: &Connection,
    id: i32,
    emoji: &str,
    label: &str,
    amount: i32,
    notes: Option<&str>,
) -> Result<BudgetRecord> {
    conn.execute(
        "UPDATE records SET emoji = ?1, label = ?2, amount = ?3, notes = ?4 WHERE id = ?5",
        params![emoji, label, amount, notes, id],
    )?;
    let (budget_id, record_type, is_adjustment): (i32, String, bool) = conn.query_row(
        "SELECT budget_id, type, is_adjustment FROM records WHERE id = ?1",
        params![id],
        |row| {
            Ok((
                row.get::<_, i64>(0)? as i32,
                row.get(1)?,
                row.get::<_, bool>(2)?,
            ))
        },
    )?;
    let tags = load_tags_for_record(conn, id)?;
    Ok(BudgetRecord {
        id,
        budget_id,
        record_type,
        emoji: emoji.to_string(),
        label: label.to_string(),
        amount,
        notes: notes.map(|s| s.to_string()),
        is_adjustment,
        tags,
    })
}

pub fn delete_record(conn: &Connection, id: i32) -> Result<()> {
    conn.execute("DELETE FROM records WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn set_record_tags(conn: &Connection, record_id: i32, tag_ids: &[i32]) -> Result<BudgetRecord> {
    // Replace all tags for this record atomically
    conn.execute_batch("BEGIN;")?;
    conn.execute(
        "DELETE FROM record_tags WHERE record_id = ?1",
        params![record_id],
    )?;
    for tag_id in tag_ids {
        conn.execute(
            "INSERT INTO record_tags (record_id, tag_id) VALUES (?1, ?2)",
            params![record_id, tag_id],
        )?;
    }
    conn.execute_batch("COMMIT;")?;

    // Reload the record
    let (budget_id, record_type, emoji, label, amount, notes, is_adjustment): (
        i32,
        String,
        String,
        String,
        i32,
        Option<String>,
        bool,
    ) = conn.query_row(
        "SELECT budget_id, type, emoji, label, amount, notes, is_adjustment \
         FROM records WHERE id = ?1",
        params![record_id],
        |row| {
            Ok((
                row.get::<_, i64>(0)? as i32,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get::<_, i64>(4)? as i32,
                row.get(5)?,
                row.get::<_, bool>(6)?,
            ))
        },
    )?;
    let tags = load_tags_for_record(conn, record_id)?;
    Ok(BudgetRecord {
        id: record_id,
        budget_id,
        record_type,
        emoji,
        label,
        amount,
        notes,
        is_adjustment,
        tags,
    })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{tags, test_conn};

    fn make_budget(conn: &Connection) -> BudgetEntry {
        create_budget(conn, "Test Budget", "2026-01-01", "2026-12-31").unwrap()
    }

    // ── Budget CRUD ──────────────────────────────────────────────────────────

    #[test]
    fn create_and_get_budget() {
        let conn = test_conn();
        let budget = create_budget(&conn, "My Budget", "2026-01-01", "2026-12-31").unwrap();
        assert_eq!(budget.name, "My Budget");
        assert_eq!(budget.start_date, "2026-01-01");
        assert_eq!(budget.end_date, "2026-12-31");
        assert_eq!(budget.status, "plan");
        assert!(budget.records.is_empty());

        let fetched = get_budget(&conn, budget.id).unwrap();
        assert_eq!(fetched.id, budget.id);
        assert_eq!(fetched.name, "My Budget");
    }

    #[test]
    fn update_budget_fields() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let updated =
            update_budget(&conn, budget.id, "Renamed", "2026-02-01", "2026-11-30", "active")
                .unwrap();
        assert_eq!(updated.name, "Renamed");
        assert_eq!(updated.status, "active");
    }

    #[test]
    fn delete_budget_cascades() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        create_record(&conn, budget.id, "inflow", "💰", "Salary", 5_000_000, None).unwrap();

        delete_budget(&conn, budget.id).unwrap();

        // Budget should be gone
        assert!(get_budget(&conn, budget.id).is_err());
        // Records should cascade-delete
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM records WHERE budget_id = ?1",
                params![budget.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn list_budgets_ordered_desc() {
        let conn = test_conn();
        let budget1 = make_budget(&conn);
        let budget2 = create_budget(&conn, "Second", "2026-01-01", "2026-12-31").unwrap();
        let list = list_budgets(&conn).unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].id, budget2.id); // newest first
        assert_eq!(list[1].id, budget1.id);
    }

    #[test]
    fn empty_budget_has_empty_records() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let fetched = get_budget(&conn, budget.id).unwrap();
        assert!(fetched.records.is_empty());
    }

    // ── Record CRUD ──────────────────────────────────────────────────────────

    #[test]
    fn create_and_update_record() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let record =
            create_record(&conn, budget.id, "inflow", "💰", "Salary", 5_000_000, Some("monthly"))
                .unwrap();
        assert_eq!(record.record_type, "inflow");
        assert_eq!(record.amount, 5_000_000);
        assert_eq!(record.notes.as_deref(), Some("monthly"));
        assert!(!record.is_adjustment);

        let updated = update_record(&conn, record.id, "💸", "Bonus", 1_000_000, None).unwrap();
        assert_eq!(updated.label, "Bonus");
        assert_eq!(updated.amount, 1_000_000);
        assert_eq!(updated.record_type, "inflow");  // unchanged
        assert_eq!(updated.budget_id, budget.id);   // unchanged
        assert!(!updated.is_adjustment);             // unchanged
        assert!(updated.notes.is_none());
    }

    #[test]
    fn zero_amount_record_accepted() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let record = create_record(&conn, budget.id, "outflow", "📝", "Zero item", 0, None).unwrap();
        assert_eq!(record.amount, 0);
    }

    #[test]
    fn delete_record_works() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let record = create_record(&conn, budget.id, "inflow", "💰", "Salary", 1000, None).unwrap();
        delete_record(&conn, record.id).unwrap();
        let fetched = get_budget(&conn, budget.id).unwrap();
        assert!(fetched.records.is_empty());
    }

    // ── is_adjustment ────────────────────────────────────────────────────────

    #[test]
    fn is_adjustment_false_for_plan_status() {
        let conn = test_conn();
        // Budget in "plan" status with past end date — not active, so no adjustment
        let budget = create_budget(&conn, "Past Plan", "2020-01-01", "2020-01-31").unwrap();
        assert_eq!(budget.status, "plan");
        let record = create_record(&conn, budget.id, "outflow", "📝", "Item", 100, None).unwrap();
        assert!(!record.is_adjustment);
    }

    #[test]
    fn is_adjustment_false_for_active_future_budget() {
        let conn = test_conn();
        let budget = create_budget(&conn, "Future Active", "2026-01-01", "9999-12-31").unwrap();
        update_budget(&conn, budget.id, "Future Active", "2026-01-01", "9999-12-31", "active").unwrap();
        let record = create_record(&conn, budget.id, "outflow", "📝", "Item", 100, None).unwrap();
        assert!(!record.is_adjustment);
    }

    #[test]
    fn is_adjustment_true_for_active_past_budget() {
        let conn = test_conn();
        // end_date in 2020 is strictly before today (2026)
        let budget = create_budget(&conn, "Past Active", "2020-01-01", "2020-01-31").unwrap();
        update_budget(&conn, budget.id, "Past Active", "2020-01-01", "2020-01-31", "active").unwrap();
        let record = create_record(&conn, budget.id, "outflow", "📝", "Late entry", 100, None).unwrap();
        assert!(record.is_adjustment);
    }

    #[test]
    fn is_adjustment_immutable_on_update() {
        let conn = test_conn();
        let budget = create_budget(&conn, "Past Active", "2020-01-01", "2020-01-31").unwrap();
        update_budget(&conn, budget.id, "Past Active", "2020-01-01", "2020-01-31", "active").unwrap();
        let record = create_record(&conn, budget.id, "outflow", "📝", "Late entry", 100, None).unwrap();
        assert!(record.is_adjustment);

        // Update should NOT change is_adjustment
        let updated = update_record(&conn, record.id, "📝", "Updated label", 200, None).unwrap();
        assert!(updated.is_adjustment); // still true
    }

    // ── set_record_tags ──────────────────────────────────────────────────────

    #[test]
    fn set_record_tags_replace_all() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let record = create_record(&conn, budget.id, "outflow", "📝", "Groceries", 100, None).unwrap();

        let tag1 = tags::create_tag(&conn, "Food", "green").unwrap();
        let tag2 = tags::create_tag(&conn, "Essential", "blue").unwrap();
        let tag3 = tags::create_tag(&conn, "Luxury", "red").unwrap();

        // Assign two tags
        let with_two = set_record_tags(&conn, record.id, &[tag1.id, tag2.id]).unwrap();
        assert_eq!(with_two.tags.len(), 2);

        // Replace with only tag3
        let with_one = set_record_tags(&conn, record.id, &[tag3.id]).unwrap();
        assert_eq!(with_one.tags.len(), 1);
        assert_eq!(with_one.tags[0].id, tag3.id);

        // Clear all tags
        let cleared = set_record_tags(&conn, record.id, &[]).unwrap();
        assert!(cleared.tags.is_empty());
    }

    // ── is_adjustment boundary dates ─────────────────────────────────────────

    #[test]
    fn is_adjustment_boundary_today_not_overdue() {
        let conn = test_conn();
        // end_date == today: strictly-past condition is false (not overdue yet)
        let today: String = conn
            .query_row("SELECT date('now','localtime')", [], |row| row.get(0))
            .unwrap();
        let budget = create_budget(&conn, "Ends Today", "2020-01-01", &today).unwrap();
        update_budget(&conn, budget.id, "Ends Today", "2020-01-01", &today, "active").unwrap();
        let record = create_record(&conn, budget.id, "outflow", "📝", "Item", 100, None).unwrap();
        assert!(!record.is_adjustment, "end_date == today must not set is_adjustment");
    }

    #[test]
    fn is_adjustment_boundary_yesterday_is_overdue() {
        let conn = test_conn();
        // end_date == yesterday: strictly past → is_adjustment = true
        let yesterday: String = conn
            .query_row("SELECT date('now','localtime','-1 day')", [], |row| row.get(0))
            .unwrap();
        let budget = create_budget(&conn, "Ended Yesterday", "2020-01-01", &yesterday).unwrap();
        update_budget(&conn, budget.id, "Ended Yesterday", "2020-01-01", &yesterday, "active").unwrap();
        let record = create_record(&conn, budget.id, "outflow", "📝", "Item", 100, None).unwrap();
        assert!(record.is_adjustment, "end_date == yesterday must set is_adjustment");
    }
}
