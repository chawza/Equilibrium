#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

# Issue #8 — Autofocus record from tag detail.
# Clicking a record in the tag detail list navigates to that record's budget
# with the record already in edit mode (label input focused/editable), and the
# ?focus query param is stripped so a reload does not re-open edit mode.
test_32_tag_record_autofocus() {
  local ok=0
  reset_db; load_fixture "32-tag-record-autofocus.sql"; nav "http://localhost:5173/tags"

  info "open FocusTag detail"
  ev "
    var rows = document.querySelectorAll('main [role=\"button\"]');
    var found = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].textContent && rows[i].textContent.includes('FocusTag')) { found = rows[i]; break; }
    }
    if (found) found.click(); else throw new Error('FocusTag row not found');
  " > /dev/null 2>&1 || { fail "open FocusTag detail"; ok=1; }
  sleep 1

  check "tagged records visible in detail" \
    "!!(document.querySelector('main')?.textContent?.includes('Coffee') && document.querySelector('main')?.textContent?.includes('Lunch'))" || ok=1

  info "click the Coffee record"
  ev "
    var rows = document.querySelectorAll('main [role=\"button\"]');
    var found = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].textContent && rows[i].textContent.includes('Coffee')) { found = rows[i]; break; }
    }
    if (found) found.click(); else throw new Error('Coffee record row not found');
  " > /dev/null 2>&1 || { fail "click Coffee record"; ok=1; }
  sleep 2

  # Landed on the record's own budget (id 2), and the focus param was stripped.
  check "navigated to /budget/2 with focus param stripped" \
    "window.location.pathname === '/budget/2' && window.location.search === ''" || ok=1

  # Exactly one record is in edit mode, and it is Coffee — not Lunch.
  check "only the Coffee record is in edit mode" \
    "document.querySelectorAll('input[placeholder=\"Label\"]').length === 1 && document.querySelector('input[placeholder=\"Label\"]')?.value === 'Coffee'" || ok=1

  # The label input holds focus (the 'autofocus' of the issue title).
  check "Coffee label input is focused" \
    "document.activeElement === document.querySelector('input[placeholder=\"Label\"]')" || ok=1

  # A plain reload of the budget must NOT re-open edit mode (param was stripped).
  nav "http://localhost:5173/budget/2"
  check "reload leaves all records in view mode" \
    "document.querySelectorAll('input[placeholder=\"Label\"]').length === 0" || ok=1

  return $ok
}

run_test test_32_tag_record_autofocus
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
