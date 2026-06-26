#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

budget_tag_summary_row_text() {
  local tag="$1"
  cat <<JS
(() => {
  const row = document.querySelector('[data-e2e="budget-tag-summary-row"][data-tag-name="$tag"]');
  return row ? row.textContent : '';
})()
JS
}

test_29_budget_tag_summary() {
  local ok=0
  reset_db; load_fixture "29-budget-tag-summary.sql"; nav "http://localhost:5173/budget/1"

  check "Budget tag summary section visible" \
    "Array.from(document.querySelectorAll('main h2')).some(function(x) { return x.textContent && x.textContent.trim() === 'By tag'; })" || ok=1
  check "Summary renders one row per used tag" \
    "document.querySelectorAll('[data-e2e=\"budget-tag-summary-row\"]').length === 3" || ok=1

  check "Income tag shows inflow total and no outflow" \
    "(() => { const text = $(budget_tag_summary_row_text income); return text.includes('income') && text.includes('Rp 150.000') && text.includes('-'); })()" || ok=1
  check "Food tag aggregates multiple outflows" \
    "(() => { const text = $(budget_tag_summary_row_text food); return text.includes('food') && text.includes('Rp 65.000') && text.includes('-'); })()" || ok=1
  check "Shared tag counts multi-tagged records by flow" \
    "(() => { const text = $(budget_tag_summary_row_text shared); return text.includes('shared') && text.includes('Rp 150.000') && text.includes('Rp 40.000'); })()" || ok=1
  check "Untagged record is excluded from tag summary" \
    "!Array.from(document.querySelectorAll('[data-e2e=\"budget-tag-summary-row\"]')).some(function(row) { return row.textContent && row.textContent.includes('Untagged fee'); })" || ok=1

  shot "$SCENARIO_DIR/../screenshots/29-budget-tag-summary.png"
  return $ok
}

run_test test_29_budget_tag_summary
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
