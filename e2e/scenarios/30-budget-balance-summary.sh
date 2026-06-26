#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

balance_text() {
  local selector="$1"
  cat <<JS
(() => {
  const el = document.querySelector('$selector');
  return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
})()
JS
}

test_30_budget_balance_summary_states() {
  local ok=0
  reset_db; load_fixture "30-budget-balance-summary.sql"

  nav "http://localhost:5173/budget/1"
  check "Empty balance summary renders" \
    "document.querySelector('[data-e2e=\"budget-balance-summary\"]') !== null" || ok=1
  check "Empty balance state is visible" \
    "$(balance_text '[data-e2e=\"budget-balance-state\"]') === 'No records yet'" || ok=1
  check "Empty balance gap is dash" \
    "$(balance_text '[data-e2e=\"budget-balance-gap\"]') === '-'" || ok=1

  nav "http://localhost:5173/budget/2"
  check "Balanced state is visible" \
    "$(balance_text '[data-e2e=\"budget-balance-state\"]') === 'Balanced'" || ok=1
  check "Balanced gap is zero" \
    "$(balance_text '[data-e2e=\"budget-balance-gap\"]') === 'Rp 0'" || ok=1
  check "Balanced label is difference" \
    "$(balance_text '[data-e2e=\"budget-balance-gap-label\"]') === 'difference'" || ok=1

  nav "http://localhost:5173/budget/3"
  check "Unspent state is visible" \
    "$(balance_text '[data-e2e=\"budget-balance-state\"]') === 'Needs allocating'" || ok=1
  check "Unspent gap is positive" \
    "$(balance_text '[data-e2e=\"budget-balance-gap\"]') === '+ Rp 100.000'" || ok=1
  check "Unspent label is visible" \
    "$(balance_text '[data-e2e=\"budget-balance-gap-label\"]') === 'unspent'" || ok=1

  shot "$SCENARIO_DIR/../screenshots/30-budget-balance-summary.png"
  return $ok
}

run_test test_30_budget_balance_summary_states
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
