#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_12_balance_over_budget() {
  local ok=0
  reset_db; load_fixture "12-balance-over-budget.sql"; nav "http://localhost:5173/budget/1"
  check "Over budget text visible" \
    "!!(document.querySelector('main')?.textContent?.includes('over budget'))" || ok=1
  shot "$SCENARIO_DIR/../screenshots/12-over-budget.png"
  return $ok
}

run_test test_12_balance_over_budget
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
