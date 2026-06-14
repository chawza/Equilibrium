use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

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

/// Full budget with records. Returned by get_budget / create_budget / update_budget.
/// Only ever held in the store's `current` field (one budget at a time).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BudgetDetail {
    pub id: i32,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String, // "plan" | "active" | "review" | "closed"
    pub created_at: String,
    pub records: Vec<BudgetRecord>,
}

/// Lightweight summary returned by list_budgets. Totals precomputed in SQL.
/// No records — records only live in BudgetDetail for the one open budget.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BudgetSummary {
    pub id: i32,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub created_at: String,
    pub total_inflow: i32,
    pub total_outflow: i32,
}

// ── Stats structs ──────────────────────────────────────────────────────────────

/// Filter sent by the Stats page to get_stats_summary.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StatsFilter {
    /// AND-include: records must carry ALL of these tag ids.
    pub tag_ids: Vec<i32>,
    /// OR-exclude: records carrying ANY of these tag ids are dropped.
    pub exclude_tag_ids: Vec<i32>,
    /// None = both types | Some("inflow") | Some("outflow")
    pub record_type: Option<String>,
}

/// Aggregated stats for one tag within the filtered record set.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TagStat {
    pub tag_id: i32,
    pub tag_name: String,
    pub tag_color: String,
    pub inflow: i32,
    pub outflow: i32,
}

/// Full aggregated stats summary returned to the Stats page.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StatsSummary {
    pub total_inflow: i32,
    pub total_outflow: i32,
    /// Number of records matching the filter.
    pub match_count: i32,
    /// Number of distinct budgets represented in the match set.
    pub match_budgets: i32,
    /// Inflow total keyed by budget lifecycle status.
    pub inflow_by_status: HashMap<String, i32>,
    /// Outflow total keyed by budget lifecycle status.
    pub outflow_by_status: HashMap<String, i32>,
    /// Per-tag breakdown of the FILTERED set, excluding the include-tags themselves
    /// (co-occurrence view). Includes a synthetic "misc" entry (tag_id=0) for untagged records.
    pub by_tag: Vec<TagStat>,
    /// Tags present on the BASE set (type + include, before exclude step).
    /// Drives the exclude-tag dropdown. Real tags only; no misc.
    pub base_tags: Vec<TagStat>,
}

/// A record row carrying its parent budget's name. Returned by list_records_by_tag.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TagRecord {
    pub id: i32,
    pub budget_id: i32,
    pub budget_name: String,
    #[serde(rename = "type")]
    pub record_type: String,
    pub emoji: String,
    pub label: String,
    pub amount: i32,
    pub is_adjustment: bool,
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
pub fn load_budget_by_id(conn: &Connection, id: i32) -> Result<BudgetDetail> {
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
    Ok(BudgetDetail {
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

/// Returns lightweight summaries (no records) with precomputed inflow/outflow totals.
pub fn list_budgets(conn: &Connection) -> Result<Vec<BudgetSummary>> {
    let mut stmt = conn.prepare(
        "SELECT b.id, b.name, b.start_date, b.end_date, b.status, b.created_at,
                COALESCE(SUM(CASE WHEN r.type='inflow'  THEN r.amount ELSE 0 END), 0) AS total_inflow,
                COALESCE(SUM(CASE WHEN r.type='outflow' THEN r.amount ELSE 0 END), 0) AS total_outflow
         FROM budgets b
         LEFT JOIN records r ON b.id = r.budget_id
         GROUP BY b.id
         ORDER BY b.id DESC",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BudgetSummary {
                id: row.get::<_, i64>(0)? as i32,
                name: row.get(1)?,
                start_date: row.get(2)?,
                end_date: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
                total_inflow: row.get::<_, i64>(6)? as i32,
                total_outflow: row.get::<_, i64>(7)? as i32,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn get_budget(conn: &Connection, id: i32) -> Result<BudgetDetail> {
    load_budget_by_id(conn, id)
}

pub fn create_budget(
    conn: &Connection,
    name: &str,
    start_date: &str,
    end_date: &str,
) -> Result<BudgetDetail> {
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
    Ok(BudgetDetail {
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
) -> Result<BudgetDetail> {
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

// ── Stats ──────────────────────────────────────────────────────────────────────

/// Build a dynamic WHERE clause and params vector for the given filter.
/// Returns (where_clause, params_vec).
/// The where_clause starts with " WHERE 1=1" and appends conditions.
/// The base_only flag stops before adding the exclude clause (drives base_tags).
fn build_filter_sql(filter: &StatsFilter, base_only: bool) -> (String, Vec<rusqlite::types::Value>) {
    use rusqlite::types::Value;

    let mut clause = " WHERE 1=1".to_string();
    let mut values: Vec<Value> = Vec::new();

    // Type axis
    if let Some(ref rt) = filter.record_type {
        clause.push_str(" AND r.type = ?");
        values.push(Value::Text(rt.clone()));
    }

    // AND-include: each include tag narrows via a subquery
    for tag_id in &filter.tag_ids {
        clause.push_str(" AND r.id IN (SELECT record_id FROM record_tags WHERE tag_id = ?)");
        values.push(Value::Integer(*tag_id as i64));
    }

    // OR-exclude (only in the full filter, not base)
    if !base_only && !filter.exclude_tag_ids.is_empty() {
        let placeholders = filter
            .exclude_tag_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(", ");
        clause.push_str(&format!(
            " AND r.id NOT IN (SELECT record_id FROM record_tags WHERE tag_id IN ({}))",
            placeholders
        ));
        for eid in &filter.exclude_tag_ids {
            values.push(Value::Integer(*eid as i64));
        }
    }

    (clause, values)
}

pub fn get_stats_summary(conn: &Connection, filter: StatsFilter) -> Result<StatsSummary> {
    let (full_where, full_vals) = build_filter_sql(&filter, false);
    let (base_where, base_vals) = build_filter_sql(&filter, true);

    // ── 1. Totals + lifecycle split ────────────────────────────────────────────
    let agg_sql = format!(
        "SELECT b.status, r.type, COALESCE(SUM(r.amount), 0)
         FROM records r
         JOIN budgets b ON b.id = r.budget_id
         {}
         GROUP BY b.status, r.type",
        full_where
    );

    let mut total_inflow: i32 = 0;
    let mut total_outflow: i32 = 0;
    let mut inflow_by_status: HashMap<String, i32> = HashMap::new();
    let mut outflow_by_status: HashMap<String, i32> = HashMap::new();

    {
        let mut stmt = conn.prepare(&agg_sql)?;
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            full_vals.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)? as i32,
            ))
        })?;
        for row in rows {
            let (status, rtype, amount) = row?;
            if rtype == "inflow" {
                *inflow_by_status.entry(status).or_insert(0) += amount;
                total_inflow += amount;
            } else {
                *outflow_by_status.entry(status.clone()).or_insert(0) += amount;
                total_outflow += amount;
            }
        }
    }

    // ── 2. Match count + distinct budgets ─────────────────────────────────────
    let count_sql = format!(
        "SELECT COUNT(*), COUNT(DISTINCT r.budget_id)
         FROM records r
         JOIN budgets b ON b.id = r.budget_id
         {}",
        full_where
    );
    let (match_count, match_budgets): (i32, i32) = {
        let mut stmt = conn.prepare(&count_sql)?;
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            full_vals.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();
        stmt.query_row(params_ref.as_slice(), |row| {
            Ok((
                row.get::<_, i64>(0)? as i32,
                row.get::<_, i64>(1)? as i32,
            ))
        })?
    };

    // ── 3. by_tag — co-occurring tags on the FULL filtered set ────────────────
    // Exclude the include-tags themselves (they're on every matching record → 100% noise).
    let include_tag_set: std::collections::HashSet<i32> =
        filter.tag_ids.iter().cloned().collect();

    let tag_sql = format!(
        "SELECT t.id, t.name, t.color,
                COALESCE(SUM(CASE WHEN r.type='inflow'  THEN r.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN r.type='outflow' THEN r.amount ELSE 0 END), 0)
         FROM records r
         JOIN budgets b ON b.id = r.budget_id
         JOIN record_tags rt ON rt.record_id = r.id
         JOIN tags t ON t.id = rt.tag_id
         {}
         GROUP BY t.id
         ORDER BY (SUM(r.amount)) DESC",
        full_where
    );

    let mut by_tag: Vec<TagStat> = {
        let mut stmt = conn.prepare(&tag_sql)?;
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            full_vals.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(TagStat {
                tag_id: row.get::<_, i64>(0)? as i32,
                tag_name: row.get(1)?,
                tag_color: row.get(2)?,
                inflow: row.get::<_, i64>(3)? as i32,
                outflow: row.get::<_, i64>(4)? as i32,
            })
        })?;
        rows.collect::<Result<Vec<_>>>()?
            .into_iter()
            .filter(|ts| !include_tag_set.contains(&ts.tag_id))
            .collect()
    };

    // Append a "misc" bucket for untagged records in the filtered set.
    let misc_sql = format!(
        "SELECT
                COALESCE(SUM(CASE WHEN r.type='inflow'  THEN r.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN r.type='outflow' THEN r.amount ELSE 0 END), 0),
                COUNT(*)
         FROM records r
         JOIN budgets b ON b.id = r.budget_id
         {}
         AND r.id NOT IN (SELECT record_id FROM record_tags)",
        full_where
    );
    {
        let mut stmt = conn.prepare(&misc_sql)?;
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            full_vals.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();
        let (misc_inflow, misc_outflow, misc_count): (i32, i32, i32) =
            stmt.query_row(params_ref.as_slice(), |row| {
                Ok((
                    row.get::<_, i64>(0)? as i32,
                    row.get::<_, i64>(1)? as i32,
                    row.get::<_, i64>(2)? as i32,
                ))
            })?;
        if misc_count > 0 {
            by_tag.push(TagStat {
                tag_id: 0,
                tag_name: "misc".to_string(),
                tag_color: "gray".to_string(),
                inflow: misc_inflow,
                outflow: misc_outflow,
            });
        }
    }

    // ── 4. base_tags — real tags on the BASE set (pre-exclude) ────────────────
    let base_tag_sql = format!(
        "SELECT t.id, t.name, t.color,
                COALESCE(SUM(CASE WHEN r.type='inflow'  THEN r.amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN r.type='outflow' THEN r.amount ELSE 0 END), 0)
         FROM records r
         JOIN budgets b ON b.id = r.budget_id
         JOIN record_tags rt ON rt.record_id = r.id
         JOIN tags t ON t.id = rt.tag_id
         {}
         GROUP BY t.id
         ORDER BY (SUM(r.amount)) DESC",
        base_where
    );

    let base_tags: Vec<TagStat> = {
        let mut stmt = conn.prepare(&base_tag_sql)?;
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            base_vals.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();
        let rows = stmt.query_map(params_ref.as_slice(), |row| {
            Ok(TagStat {
                tag_id: row.get::<_, i64>(0)? as i32,
                tag_name: row.get(1)?,
                tag_color: row.get(2)?,
                inflow: row.get::<_, i64>(3)? as i32,
                outflow: row.get::<_, i64>(4)? as i32,
            })
        })?;
        rows.collect::<Result<Vec<_>>>()?
            .into_iter()
            .filter(|ts| !include_tag_set.contains(&ts.tag_id))
            .collect()
    };

    Ok(StatsSummary {
        total_inflow,
        total_outflow,
        match_count,
        match_budgets,
        inflow_by_status,
        outflow_by_status,
        by_tag,
        base_tags,
    })
}

/// Returns all records carrying the given tag, with their parent budget's name.
pub fn list_records_by_tag(conn: &Connection, tag_id: i32) -> Result<Vec<TagRecord>> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.budget_id, b.name, r.type, r.emoji, r.label, r.amount, r.is_adjustment
         FROM records r
         JOIN budgets b ON b.id = r.budget_id
         JOIN record_tags rt ON rt.record_id = r.id
         WHERE rt.tag_id = ?1
         ORDER BY r.id ASC",
    )?;
    let rows = stmt
        .query_map(params![tag_id], |row| {
            Ok(TagRecord {
                id: row.get::<_, i64>(0)? as i32,
                budget_id: row.get::<_, i64>(1)? as i32,
                budget_name: row.get(2)?,
                record_type: row.get(3)?,
                emoji: row.get(4)?,
                label: row.get(5)?,
                amount: row.get::<_, i64>(6)? as i32,
                is_adjustment: row.get::<_, bool>(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{tags, test_conn};

    fn make_budget(conn: &Connection) -> BudgetDetail {
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
    fn list_budgets_returns_precomputed_totals() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        create_record(&conn, budget.id, "inflow", "💰", "Salary", 3_000_000, None).unwrap();
        create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 500_000, None).unwrap();
        create_record(&conn, budget.id, "inflow", "💰", "Bonus", 1_000_000, None).unwrap();

        let list = list_budgets(&conn).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].total_inflow, 4_000_000);
        assert_eq!(list[0].total_outflow, 500_000);
    }

    #[test]
    fn list_budgets_empty_totals_for_budget_without_records() {
        let conn = test_conn();
        make_budget(&conn);
        let list = list_budgets(&conn).unwrap();
        assert_eq!(list[0].total_inflow, 0);
        assert_eq!(list[0].total_outflow, 0);
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

    // ── get_stats_summary ────────────────────────────────────────────────────

    fn make_filter_empty() -> StatsFilter {
        StatsFilter { tag_ids: vec![], exclude_tag_ids: vec![], record_type: None }
    }

    #[test]
    fn stats_empty_db_returns_zeros() {
        let conn = test_conn();
        let summary = get_stats_summary(&conn, make_filter_empty()).unwrap();
        assert_eq!(summary.total_inflow, 0);
        assert_eq!(summary.total_outflow, 0);
        assert_eq!(summary.match_count, 0);
        assert_eq!(summary.match_budgets, 0);
        assert!(summary.by_tag.is_empty());
        assert!(summary.base_tags.is_empty());
    }

    #[test]
    fn stats_no_filter_aggregates_all() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        create_record(&conn, budget.id, "inflow", "💰", "Salary", 3_000_000, None).unwrap();
        create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 500_000, None).unwrap();

        let summary = get_stats_summary(&conn, make_filter_empty()).unwrap();
        assert_eq!(summary.total_inflow, 3_000_000);
        assert_eq!(summary.total_outflow, 500_000);
        assert_eq!(summary.match_count, 2);
        assert_eq!(summary.match_budgets, 1);
    }

    #[test]
    fn stats_type_filter_inflow_only() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        create_record(&conn, budget.id, "inflow", "💰", "Salary", 3_000_000, None).unwrap();
        create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 500_000, None).unwrap();

        let filter = StatsFilter {
            tag_ids: vec![],
            exclude_tag_ids: vec![],
            record_type: Some("inflow".to_string()),
        };
        let summary = get_stats_summary(&conn, filter).unwrap();
        assert_eq!(summary.total_inflow, 3_000_000);
        assert_eq!(summary.total_outflow, 0);
        assert_eq!(summary.match_count, 1);
    }

    #[test]
    fn stats_include_tag_and_logic() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let tag_a = tags::create_tag(&conn, "food", "green").unwrap();
        let tag_b = tags::create_tag(&conn, "essential", "blue").unwrap();

        // Record carrying both tags
        let rec_both = create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 200_000, None).unwrap();
        set_record_tags(&conn, rec_both.id, &[tag_a.id, tag_b.id]).unwrap();

        // Record carrying only tag_a
        let rec_a = create_record(&conn, budget.id, "outflow", "🍕", "Restaurant", 100_000, None).unwrap();
        set_record_tags(&conn, rec_a.id, &[tag_a.id]).unwrap();

        // Filter: include BOTH — should only return rec_both
        let filter = StatsFilter {
            tag_ids: vec![tag_a.id, tag_b.id],
            exclude_tag_ids: vec![],
            record_type: None,
        };
        let summary = get_stats_summary(&conn, filter).unwrap();
        assert_eq!(summary.match_count, 1);
        assert_eq!(summary.total_outflow, 200_000);
    }

    #[test]
    fn stats_exclude_tag_or_logic() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let tag_a = tags::create_tag(&conn, "food", "green").unwrap();
        let tag_b = tags::create_tag(&conn, "essential", "blue").unwrap();

        // Record with tag_a
        let rec_a = create_record(&conn, budget.id, "outflow", "🍕", "Lunch", 50_000, None).unwrap();
        set_record_tags(&conn, rec_a.id, &[tag_a.id]).unwrap();

        // Record with tag_b
        let rec_b = create_record(&conn, budget.id, "outflow", "🏠", "Rent", 1_000_000, None).unwrap();
        set_record_tags(&conn, rec_b.id, &[tag_b.id]).unwrap();

        // No-tag record
        let rec_none = create_record(&conn, budget.id, "inflow", "💰", "Salary", 3_000_000, None).unwrap();
        let _ = rec_none;

        // Exclude tag_a → only rec_b + rec_none remain (2 records)
        let filter = StatsFilter {
            tag_ids: vec![],
            exclude_tag_ids: vec![tag_a.id],
            record_type: None,
        };
        let summary = get_stats_summary(&conn, filter).unwrap();
        assert_eq!(summary.match_count, 2);
        assert_eq!(summary.total_inflow, 3_000_000);
        assert_eq!(summary.total_outflow, 1_000_000);
    }

    #[test]
    fn stats_misc_bucket_for_untagged_records() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        // Tagged record
        let tag = tags::create_tag(&conn, "work", "blue").unwrap();
        let rec_tagged = create_record(&conn, budget.id, "inflow", "💰", "Salary", 3_000_000, None).unwrap();
        set_record_tags(&conn, rec_tagged.id, &[tag.id]).unwrap();
        // Untagged record
        create_record(&conn, budget.id, "outflow", "🛒", "Cash", 100_000, None).unwrap();

        let summary = get_stats_summary(&conn, make_filter_empty()).unwrap();
        let misc = summary.by_tag.iter().find(|ts| ts.tag_id == 0);
        assert!(misc.is_some(), "should have a misc bucket for untagged records");
        let misc = misc.unwrap();
        assert_eq!(misc.tag_name, "misc");
        assert_eq!(misc.outflow, 100_000);
    }

    #[test]
    fn stats_include_tags_excluded_from_by_tag() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let tag = tags::create_tag(&conn, "food", "green").unwrap();
        let rec = create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 200_000, None).unwrap();
        set_record_tags(&conn, rec.id, &[tag.id]).unwrap();

        // When food is the include tag, by_tag should NOT show food
        let filter = StatsFilter {
            tag_ids: vec![tag.id],
            exclude_tag_ids: vec![],
            record_type: None,
        };
        let summary = get_stats_summary(&conn, filter).unwrap();
        assert!(!summary.by_tag.iter().any(|ts| ts.tag_id == tag.id));
    }

    // ── list_records_by_tag ──────────────────────────────────────────────────

    #[test]
    fn list_records_by_tag_returns_correct_records() {
        let conn = test_conn();
        let budget = make_budget(&conn);
        let tag = tags::create_tag(&conn, "food", "green").unwrap();
        let other_tag = tags::create_tag(&conn, "work", "blue").unwrap();

        let rec1 = create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 100_000, None).unwrap();
        set_record_tags(&conn, rec1.id, &[tag.id]).unwrap();

        let rec2 = create_record(&conn, budget.id, "inflow", "💰", "Salary", 3_000_000, None).unwrap();
        set_record_tags(&conn, rec2.id, &[other_tag.id]).unwrap();

        let by_tag = list_records_by_tag(&conn, tag.id).unwrap();
        assert_eq!(by_tag.len(), 1);
        assert_eq!(by_tag[0].id, rec1.id);
        assert_eq!(by_tag[0].budget_name, "Test Budget");
        assert_eq!(by_tag[0].amount, 100_000);
    }

    #[test]
    fn list_records_by_tag_empty_for_unused_tag() {
        let conn = test_conn();
        let _budget = make_budget(&conn);
        let tag = tags::create_tag(&conn, "unused", "gray").unwrap();
        let result = list_records_by_tag(&conn, tag.id).unwrap();
        assert!(result.is_empty());
    }
}
