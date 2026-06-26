#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_31_budget_tag_summary_empty() {
  local ok=0
  reset_db; load_fixture "31-budget-tag-summary-empty.sql"; nav "http://localhost:5173/budget/1"

  check "Budget tag summary section remains visible without tags" \
    "Array.from(document.querySelectorAll('main h2')).some(function(x) { return x.textContent && x.textContent.trim() === 'By tag'; })" || ok=1
  check "Budget tag summary empty state is visible" \
    "document.querySelector('[data-e2e=\"budget-tag-summary-empty\"]')?.textContent?.trim() === 'No tagged records yet.'" || ok=1
  check "Budget tag summary has no rows without tags" \
    "document.querySelectorAll('[data-e2e=\"budget-tag-summary-row\"]').length === 0" || ok=1

  shot "$SCENARIO_DIR/../screenshots/31-budget-tag-summary-empty.png"
  return $ok
}

run_test test_31_budget_tag_summary_empty
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
