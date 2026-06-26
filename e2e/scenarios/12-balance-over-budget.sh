#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_12_balance_over_budget() {
  local ok=0
  reset_db; load_fixture "12-balance-over-budget.sql"; nav "http://localhost:5173/budget/1"
  check "Balance summary renders" \
    "document.querySelector('[data-e2e=\"budget-balance-summary\"]') !== null" || ok=1
  check "Over budget state visible" \
    "document.querySelector('[data-e2e=\"budget-balance-state\"]')?.textContent?.trim() === 'Over budget'" || ok=1
  check "Over budget gap is signed" \
    "document.querySelector('[data-e2e=\"budget-balance-gap\"]')?.textContent?.trim().replace(/\\s+/g, ' ') === '- Rp 30.000'" || ok=1
  check "Over budget label visible" \
    "document.querySelector('[data-e2e=\"budget-balance-gap-label\"]')?.textContent?.trim() === 'over'" || ok=1
  check "Balance tuner needle renders" \
    "document.querySelector('[data-e2e=\"budget-balance-needle\"]') !== null" || ok=1
  shot "$SCENARIO_DIR/../screenshots/12-over-budget.png"
  return $ok
}

run_test test_12_balance_over_budget
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
