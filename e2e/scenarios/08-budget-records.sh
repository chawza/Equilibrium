#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_08_budget_records() {
  local ok=0
  reset_db; load_fixture "08-budget-records.sql"; nav "http://localhost:5173/budget/1"
  add_record "inflow" "Salary" "100000" || ok=1
  check "Inflow total 100.000" \
    "!!(document.querySelector('main')?.textContent?.includes('100.000'))" || ok=1
  add_record "outflow" "Groceries" "40000" || ok=1
  check "Outflow total 40.000" \
    "!!(document.querySelector('main')?.textContent?.includes('40.000'))" || ok=1
  check "Balance 60.000" \
    "!!(document.querySelector('main')?.textContent?.match(/60\\.000/))" || ok=1
  shot "$SCENARIO_DIR/../screenshots/08-budget-records.png"
  return $ok
}

run_test test_08_budget_records
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
