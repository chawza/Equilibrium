use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use specta::Type;

// ── Snapshot types (one row per table) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BudgetRow {
    pub id: i32,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub notes: Option<String>,
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
            .prepare("SELECT id, name, start_date, end_date, status, notes, created_at FROM budgets")?;
        let rows = stmt
            .query_map([], |row| {
                Ok(BudgetRow {
                    id: row.get::<_, i64>(0)? as i32,
                    name: row.get(1)?,
                    start_date: row.get(2)?,
                    end_date: row.get(3)?,
                    status: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
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
///
/// Column order matches the import template so exports round-trip cleanly through import.
/// Headers: budget, budget_start, budget_end, type, emoji, label, amount, tags, notes, is_adjustment
#[derive(Debug, Serialize)]
pub struct CsvRecordRow {
    pub budget: String,
    pub budget_start: String, // budget start_date ("2026-06-01")
    pub budget_end: String,   // budget end_date   ("2026-06-30")
    #[serde(rename = "type")]
    pub record_type: String,  // "inflow" | "outflow"
    pub emoji: String,
    pub label: String,
    pub amount: i32,
    pub tags: String,         // tag names joined with ";", or "" if none
    pub notes: String,        // empty string when NULL
    pub is_adjustment: bool,  // exported for reference; ignored on import
}

/// Build the flat CSV rows — one per record, with budget name/dates and semicolon-joined tags.
///
/// Records are ordered by budget then by record creation order.
pub fn dump_csv_rows(conn: &Connection) -> Result<Vec<CsvRecordRow>> {
    let sql = "
        SELECT
            b.name,
            b.start_date,
            b.end_date,
            r.type,
            r.emoji,
            r.label,
            r.amount,
            COALESCE(GROUP_CONCAT(t.name, ';'), '') AS tags,
            COALESCE(r.notes, '') AS notes,
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
                record_type:   row.get(3)?,
                emoji:         row.get(4)?,
                label:         row.get(5)?,
                amount:        row.get::<_, i64>(6)? as i32,
                tags:          row.get(7)?,
                notes:         row.get(8)?,
                is_adjustment: row.get::<_, bool>(9)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

// ── CSV import types ──────────────────────────────────────────────────────────

/// A single record parsed from an import CSV row.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportRecord {
    pub emoji: String,
    pub label: String,
    #[serde(rename = "type")]
    pub record_type: String,  // "inflow" | "outflow"
    pub amount: i32,
    pub tags: Vec<String>,    // already split on ";"
    pub notes: Option<String>,
}

/// A group of import records destined for one budget.
/// `is_new` is true when no existing budget has this exact name.
/// `start_date`/`end_date` are only used (and required) when `is_new` is true.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportGroup {
    pub budget: String,
    pub is_new: bool,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub records: Vec<CsvImportRecord>,
}

/// Returned by `parse_csv_preview` — the groups the user reviews before confirming.
/// `errors` contains row-level warnings for skipped rows (bad type, non-integer amount, etc.).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportPreview {
    pub groups: Vec<CsvImportGroup>,
    pub errors: Vec<String>,
}

/// Returned by `import_groups` — summary of what was created.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub budgets_created: i32,
    pub records_imported: i32,
}

// ── CSV import: parse ─────────────────────────────────────────────────────────

/// Parse a CSV string (already read from disk) into a preview grouped by budget.
///
/// Validates `type` and `amount` per row; skipped rows are reported in `preview.errors`.
/// Checks the DB to determine which budget names are new vs existing.
pub fn parse_csv_preview(
    conn: &Connection,
    csv_text: &str,
) -> std::result::Result<CsvImportPreview, String> {
    let mut errors: Vec<String> = Vec::new();
    // Preserve insertion order: Vec<name> + HashMap<name, (start, end, records)>.
    let mut order: Vec<String> = Vec::new();
    let mut groups_data: std::collections::HashMap<
        String,
        (Option<String>, Option<String>, Vec<CsvImportRecord>),
    > = std::collections::HashMap::new();

    let mut rdr = csv::ReaderBuilder::new()
        .flexible(true) // tolerate rows with extra or missing trailing columns
        .from_reader(csv_text.as_bytes());

    let headers = rdr
        .headers()
        .map_err(|e| format!("Failed to read CSV headers: {e}"))?
        .clone();

    let find_col = |name: &str| -> Option<usize> {
        headers.iter().position(|h| h.trim() == name)
    };

    let budget_col      = find_col("budget");
    let budget_start_col = find_col("budget_start");
    let budget_end_col  = find_col("budget_end");
    let type_col        = find_col("type");
    let emoji_col       = find_col("emoji");
    let label_col       = find_col("label");
    let amount_col      = find_col("amount");
    let tags_col        = find_col("tags");
    let notes_col       = find_col("notes");

    // All of these are required; is_adjustment is ignored if present.
    for (name, col) in [
        ("budget", budget_col),
        ("type", type_col),
        ("label", label_col),
        ("amount", amount_col),
    ] {
        if col.is_none() {
            errors.push(format!("Missing required column: '{name}'"));
        }
    }
    if !errors.is_empty() {
        return Ok(CsvImportPreview { groups: vec![], errors });
    }

    let budget_col = budget_col.unwrap();
    let type_col   = type_col.unwrap();
    let label_col  = label_col.unwrap();
    let amount_col = amount_col.unwrap();

    // Snapshot existing budget names for new/existing classification.
    // (stmt must be a named binding so its lifetime covers the collect call.)
    let mut budget_names_stmt = conn
        .prepare("SELECT name FROM budgets")
        .map_err(|e| e.to_string())?;
    let existing_budgets: std::collections::HashSet<String> = budget_names_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(budget_names_stmt);

    for (row_idx, result) in rdr.records().enumerate() {
        let row_label = format!("Row {}", row_idx + 2); // +1 header + 1-indexed
        let record = match result {
            Ok(r) => r,
            Err(e) => {
                errors.push(format!("{row_label}: CSV parse error — {e}, skipped"));
                continue;
            }
        };

        let get = |col: usize| -> String {
            record.get(col).unwrap_or("").trim().to_string()
        };

        let budget_name = get(budget_col);
        if budget_name.is_empty() {
            errors.push(format!("{row_label}: empty budget name, skipped"));
            continue;
        }

        let record_type = get(type_col);
        if record_type != "inflow" && record_type != "outflow" {
            errors.push(format!(
                "{row_label}: invalid type '{record_type}' (must be 'inflow' or 'outflow'), skipped"
            ));
            continue;
        }

        let label = get(label_col);
        if label.is_empty() {
            errors.push(format!("{row_label}: empty label, skipped"));
            continue;
        }

        let amount_str = get(amount_col);
        let amount: i32 = match amount_str.parse::<i64>() {
            Ok(n) if n >= 0 && n <= i32::MAX as i64 => n as i32,
            Ok(_) => {
                errors.push(format!("{row_label}: amount out of range, skipped"));
                continue;
            }
            Err(_) => {
                errors.push(format!(
                    "{row_label}: invalid amount '{amount_str}' (must be a whole number), skipped"
                ));
                continue;
            }
        };

        let emoji = emoji_col
            .map(|c| get(c))
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "📝".to_string());

        // Split semicolon-separated tags; deduplicate preserving first-seen order.
        let tags: Vec<String> = {
            let raw = tags_col.map(|c| get(c)).unwrap_or_default();
            if raw.is_empty() {
                vec![]
            } else {
                let mut seen = std::collections::HashSet::new();
                raw.split(';')
                    .map(|t| t.trim().to_string())
                    .filter(|t| !t.is_empty() && seen.insert(t.clone()))
                    .collect()
            }
        };

        let notes: Option<String> = notes_col
            .map(|c| get(c))
            .filter(|s| !s.is_empty());

        let budget_start = budget_start_col
            .map(|c| get(c))
            .filter(|s| !s.is_empty());
        let budget_end = budget_end_col
            .map(|c| get(c))
            .filter(|s| !s.is_empty());

        if !groups_data.contains_key(&budget_name) {
            order.push(budget_name.clone());
            groups_data.insert(budget_name.clone(), (budget_start, budget_end, Vec::new()));
        }

        groups_data
            .get_mut(&budget_name)
            .unwrap()
            .2
            .push(CsvImportRecord {
                emoji,
                label,
                record_type,
                amount,
                tags,
                notes,
            });
    }

    let groups: Vec<CsvImportGroup> = order
        .into_iter()
        .map(|name| {
            let (start_date, end_date, records) = groups_data.remove(&name).unwrap();
            let is_new = !existing_budgets.contains(&name);
            CsvImportGroup {
                budget: name,
                is_new,
                start_date,
                end_date,
                records,
            }
        })
        .collect();

    Ok(CsvImportPreview { groups, errors })
}

// ── CSV import: commit ────────────────────────────────────────────────────────

/// Palette cycled when auto-creating tags that don't exist yet.
const TAG_COLORS: &[&str] = &[
    "blue", "green", "amber", "red", "orange",
    "teal", "indigo", "purple", "pink", "gray",
];

/// Insert the accepted (user-approved) groups into the database in a single transaction.
///
/// For each group: resolves the budget by exact name, or creates it when `is_new` is true.
/// Tags are auto-created if they don't exist yet, cycling through `TAG_COLORS`.
/// The whole operation is atomic — any failure rolls back all changes.
pub fn import_groups(
    conn: &Connection,
    groups: Vec<CsvImportGroup>,
) -> std::result::Result<ImportResult, String> {
    // Snapshot existing tags outside the transaction (read-only).
    let mut tag_map: std::collections::HashMap<String, i32> = {
        crate::db::tags::list_tags(conn)
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|t| (t.name, t.id))
            .collect()
    };

    conn.execute_batch("BEGIN;").map_err(|e| e.to_string())?;

    let result = (|| -> std::result::Result<ImportResult, String> {
        let mut budgets_created = 0i32;
        let mut records_imported = 0i32;

        for group in groups {
            // Resolve or create the budget.
            let budget_id: i32 = {
                let existing: Option<i32> = conn
                    .query_row(
                        "SELECT id FROM budgets WHERE name = ?1 LIMIT 1",
                        params![group.budget],
                        |row| row.get::<_, i64>(0).map(|id| id as i32),
                    )
                    .ok();
                match existing {
                    Some(id) => id,
                    None => {
                        let start = group.start_date.as_deref().unwrap_or("2000-01-01");
                        let end   = group.end_date.as_deref().unwrap_or("2000-12-31");
                        conn.execute(
                            "INSERT INTO budgets (name, start_date, end_date) \
                             VALUES (?1, ?2, ?3)",
                            params![group.budget, start, end],
                        )
                        .map_err(|e| e.to_string())?;
                        budgets_created += 1;
                        conn.last_insert_rowid() as i32
                    }
                }
            };

            for record in group.records {
                // Resolve or create each tag; collect their IDs.
                let mut tag_ids: Vec<i32> = Vec::new();
                for tag_name in &record.tags {
                    let tag_id = if let Some(&id) = tag_map.get(tag_name.as_str()) {
                        id
                    } else {
                        let color = TAG_COLORS[tag_map.len() % TAG_COLORS.len()];
                        conn.execute(
                            "INSERT INTO tags (name, color) VALUES (?1, ?2)",
                            params![tag_name, color],
                        )
                        .map_err(|e| e.to_string())?;
                        let id = conn.last_insert_rowid() as i32;
                        tag_map.insert(tag_name.clone(), id);
                        id
                    };
                    tag_ids.push(tag_id);
                }

                // Determine is_adjustment: true only if budget is active and past end_date.
                let is_adjustment: bool = conn
                    .query_row(
                        "SELECT status, end_date FROM budgets WHERE id = ?1",
                        params![budget_id],
                        |row| {
                            Ok((
                                row.get::<_, String>(0)?,
                                row.get::<_, String>(1)?,
                            ))
                        },
                    )
                    .ok()
                    .map(|(status, end_date)| {
                        if status == "active" {
                            let today: String = conn
                                .query_row(
                                    "SELECT date('now','localtime')",
                                    [],
                                    |row| row.get(0),
                                )
                                .unwrap_or_default();
                            end_date < today
                        } else {
                            false
                        }
                    })
                    .unwrap_or(false);

                // Insert the record.
                conn.execute(
                    "INSERT INTO records \
                         (budget_id, type, emoji, label, amount, notes, is_adjustment) \
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![
                        budget_id,
                        record.record_type,
                        record.emoji,
                        record.label,
                        record.amount,
                        record.notes,
                        is_adjustment
                    ],
                )
                .map_err(|e| e.to_string())?;
                let record_id = conn.last_insert_rowid() as i32;

                // Attach tags.
                for tag_id in tag_ids {
                    conn.execute(
                        "INSERT INTO record_tags (record_id, tag_id) VALUES (?1, ?2)",
                        params![record_id, tag_id],
                    )
                    .map_err(|e| e.to_string())?;
                }

                records_imported += 1;
            }
        }

        Ok(ImportResult { budgets_created, records_imported })
    })();

    match result {
        Ok(r) => {
            conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;
            Ok(r)
        }
        Err(e) => {
            conn.execute_batch("ROLLBACK;").ok();
            Err(e)
        }
    }
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
        let budget = budgets::create_budget(conn, "Budget 1", "2026-01-01", "2026-12-31", None).unwrap();
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
        assert_eq!(salary.label, "Salary");
        assert_eq!(salary.amount, 5_000_000);
        assert_eq!(salary.tags, ""); // no tags on salary

        let groceries = rows.iter().find(|r| r.record_type == "outflow").unwrap();
        assert_eq!(groceries.label, "Groceries");
        assert_eq!(groceries.tags, "Food"); // exactly one tag, no semicolons
        assert_eq!(groceries.amount, 500_000);
    }

    #[test]
    fn csv_rows_semicolon_joins_multiple_tags() {
        let conn = test_conn();
        let budget = budgets::create_budget(&conn, "B", "2026-01-01", "2026-12-31", None).unwrap();
        let r =
            budgets::create_record(&conn, budget.id, "outflow", "🛒", "Item", 1_000, None).unwrap();
        let t1 = tags::create_tag(&conn, "Alpha", "red").unwrap();
        let t2 = tags::create_tag(&conn, "Beta", "blue").unwrap();
        budgets::set_record_tags(&conn, r.id, &[t1.id, t2.id]).unwrap();

        let rows = dump_csv_rows(&conn).unwrap();
        assert_eq!(rows.len(), 1);
        // Tags may be in insertion order; both names must appear semicolon-separated
        let tags = &rows[0].tags;
        assert!(tags.contains(';'), "expected semicolon separator, got: {tags}");
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
            budgets::create_budget(&src_conn, "Test Budget", "2026-01-01", "2026-12-31", None)
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
