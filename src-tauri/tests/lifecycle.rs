// Integration tests — full budget lifecycle
//
// These tests import the public `equilibrium_lib::db` repository API directly,
// bypassing the Tauri IPC layer. They use `rusqlite::Connection::open_in_memory()`
// with the same schema that the real app applies, so they're a faithful
// substitute for a running app while remaining fast and hermetic.
//
// Run just this file:  cargo test --test lifecycle

use equilibrium_lib::db::{apply_schema, budgets, tags};
use rusqlite::Connection;

/// Fresh in-memory connection with the full schema applied.
fn conn() -> Connection {
    let db = Connection::open_in_memory().unwrap();
    apply_schema(&db).unwrap();
    db
}

// ── Full budget lifecycle ─────────────────────────────────────────────────────

#[test]
fn full_budget_lifecycle() {
    let conn = conn();

    // 1. Create budget — defaults to "plan" status
    let budget = budgets::create_budget(&conn, "June 2026", "2026-06-01", "2026-06-30").unwrap();
    assert!(budget.id > 0);
    assert_eq!(budget.status, "plan");
    assert!(budget.records.is_empty());
    assert_eq!(budget.start_date, "2026-06-01");
    assert_eq!(budget.end_date, "2026-06-30");

    // 2. Activate budget
    let budget =
        budgets::update_budget(&conn, budget.id, &budget.name, &budget.start_date, &budget.end_date, "active")
            .unwrap();
    assert_eq!(budget.status, "active");

    // 3. Create tags
    let tag_food = tags::create_tag(&conn, "Food", "green").unwrap();
    let tag_transport = tags::create_tag(&conn, "Transport", "blue").unwrap();

    // 4. Add records — mix of inflow/outflow, some with tags, one zero-amount
    let salary =
        budgets::create_record(&conn, budget.id, "inflow", "💰", "Salary", 10_000_000, None).unwrap();
    assert_eq!(salary.record_type, "inflow");
    assert_eq!(salary.amount, 10_000_000);
    assert!(!salary.is_adjustment); // active budget with future end_date → not an adjustment

    let bonus = budgets::create_record(
        &conn,
        budget.id,
        "inflow",
        "🎁",
        "Bonus",
        2_000_000,
        Some("Q2 bonus"),
    )
    .unwrap();
    assert_eq!(bonus.amount, 2_000_000);
    assert_eq!(bonus.notes.as_deref(), Some("Q2 bonus"));

    let groceries =
        budgets::create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 500_000, None).unwrap();
    budgets::set_record_tags(&conn, groceries.id, &[tag_food.id]).unwrap();

    let _rent =
        budgets::create_record(&conn, budget.id, "outflow", "🏠", "Rent", 3_000_000, None).unwrap();

    let commute =
        budgets::create_record(&conn, budget.id, "outflow", "🚌", "Commute", 200_000, None).unwrap();
    budgets::set_record_tags(&conn, commute.id, &[tag_transport.id]).unwrap();

    // Zero-amount record — should be accepted and included in totals
    let zero_item =
        budgets::create_record(&conn, budget.id, "outflow", "📝", "Zero item", 0, None).unwrap();
    assert_eq!(zero_item.amount, 0);

    // 5. Re-fetch and assert the inputs to client-side calculations
    let fetched = budgets::get_budget(&conn, budget.id).unwrap();
    assert_eq!(fetched.records.len(), 6);

    let total_inflow: i32 = fetched
        .records
        .iter()
        .filter(|record| record.record_type == "inflow")
        .map(|record| record.amount)
        .sum();
    let total_outflow: i32 = fetched
        .records
        .iter()
        .filter(|record| record.record_type == "outflow")
        .map(|record| record.amount)
        .sum();
    let balance = total_inflow - total_outflow;

    assert_eq!(total_inflow, 12_000_000);
    assert_eq!(total_outflow, 3_700_000); // 500_000 + 3_000_000 + 200_000 + 0
    assert_eq!(balance, 8_300_000);

    // Tags are wired through the junction table
    let groceries_rec = fetched.records.iter().find(|record| record.label == "Groceries").unwrap();
    assert_eq!(groceries_rec.tags.len(), 1);
    assert_eq!(groceries_rec.tags[0].name, "Food");

    let commute_rec = fetched.records.iter().find(|record| record.label == "Commute").unwrap();
    assert_eq!(commute_rec.tags.len(), 1);
    assert_eq!(commute_rec.tags[0].name, "Transport");

    // 6. Close budget
    let budget =
        budgets::update_budget(&conn, budget.id, &budget.name, &budget.start_date, &budget.end_date, "closed")
            .unwrap();
    assert_eq!(budget.status, "closed");

    // Closed budget is still fetchable and has all records
    let final_state = budgets::get_budget(&conn, budget.id).unwrap();
    assert_eq!(final_state.status, "closed");
    assert_eq!(final_state.records.len(), 6);
}

// ── is_adjustment immutability ────────────────────────────────────────────────

#[test]
fn adjustment_flag_lifecycle() {
    let conn = conn();

    // ── Case 1: active budget past end_date → is_adjustment = true
    let past_budget =
        budgets::create_budget(&conn, "Past Active", "2020-01-01", "2020-01-31").unwrap();
    budgets::update_budget(&conn, past_budget.id, "Past Active", "2020-01-01", "2020-01-31", "active").unwrap();

    let late_record =
        budgets::create_record(&conn, past_budget.id, "outflow", "📝", "Late entry", 100, None).unwrap();
    assert!(
        late_record.is_adjustment,
        "record added to active past-end budget must be flagged"
    );

    // Updating the record must NOT change is_adjustment
    let updated_record =
        budgets::update_record(&conn, late_record.id, "📝", "Updated label", 200, None).unwrap();
    assert!(
        updated_record.is_adjustment,
        "is_adjustment must remain true after update_record"
    );
    assert_eq!(updated_record.label, "Updated label");
    assert_eq!(updated_record.amount, 200);

    // ── Case 2: plan budget with past end_date → is_adjustment = false
    let plan_budget =
        budgets::create_budget(&conn, "Past Plan", "2020-01-01", "2020-01-31").unwrap();
    assert_eq!(plan_budget.status, "plan");
    let plan_record =
        budgets::create_record(&conn, plan_budget.id, "outflow", "📝", "Item", 100, None).unwrap();
    assert!(
        !plan_record.is_adjustment,
        "non-active budget must not flag records as adjustments"
    );

    // ── Case 3: active budget with future end_date → is_adjustment = false
    let future_budget =
        budgets::create_budget(&conn, "Future Active", "2026-01-01", "9999-12-31").unwrap();
    budgets::update_budget(
        &conn, future_budget.id, "Future Active", "2026-01-01", "9999-12-31", "active",
    )
    .unwrap();
    let future_record =
        budgets::create_record(&conn, future_budget.id, "outflow", "📝", "Item", 100, None).unwrap();
    assert!(
        !future_record.is_adjustment,
        "active budget with future end_date must not flag adjustments"
    );
}

// ── Tag rename propagates immediately ─────────────────────────────────────────

#[test]
fn tag_rename_propagates_through_records() {
    let conn = conn();

    let budget = budgets::create_budget(&conn, "Budget", "2026-01-01", "2026-12-31").unwrap();
    budgets::update_budget(&conn, budget.id, "Budget", "2026-01-01", "2026-12-31", "active").unwrap();

    let tag = tags::create_tag(&conn, "Food", "green").unwrap();
    let record =
        budgets::create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 500_000, None).unwrap();
    budgets::set_record_tags(&conn, record.id, &[tag.id]).unwrap();

    // Rename + recolor the tag
    tags::update_tag(&conn, tag.id, "Groceries", "teal").unwrap();

    // Re-fetching the budget must return the updated tag name/color on the record
    let fetched = budgets::get_budget(&conn, budget.id).unwrap();
    let record_tags = &fetched.records[0].tags;
    assert_eq!(record_tags.len(), 1);
    assert_eq!(record_tags[0].name, "Groceries");
    assert_eq!(record_tags[0].color, "teal");
}

// ── Delete cascades ───────────────────────────────────────────────────────────

#[test]
fn delete_budget_cascades_to_records_and_tags() {
    let conn = conn();

    let tag = tags::create_tag(&conn, "Food", "green").unwrap();
    let budget = budgets::create_budget(&conn, "Budget", "2026-01-01", "2026-12-31").unwrap();
    let record =
        budgets::create_record(&conn, budget.id, "outflow", "🛒", "Groceries", 500_000, None).unwrap();
    budgets::set_record_tags(&conn, record.id, &[tag.id]).unwrap();

    budgets::delete_budget(&conn, budget.id).unwrap();

    // Budget gone
    assert!(budgets::get_budget(&conn, budget.id).is_err());

    // Records cascade-deleted
    let record_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM records WHERE budget_id = ?1",
            rusqlite::params![budget.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(record_count, 0);

    // record_tags junction rows cascade-deleted (tag itself is unaffected)
    let junction_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM record_tags WHERE record_id = ?1",
            rusqlite::params![record.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(junction_count, 0);

    // The tag itself survives
    let remaining_tags = tags::list_tags(&conn).unwrap();
    assert_eq!(remaining_tags.len(), 1);
    assert_eq!(remaining_tags[0].id, tag.id);
}
