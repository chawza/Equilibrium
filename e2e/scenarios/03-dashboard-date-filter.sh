#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_03_dashboard_date_filter() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/"
  check "6 budgets visible" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 6" || ok=1
  set_input 'input[aria-label="Filter from date"]' "2025-01-01" || ok=1
  sleep 0.3
  set_input 'input[aria-label="Filter to date"]' "2025-01-31" || ok=1
  sleep 0.5
  check "Filter shrinks list to fewer budgets" \
    "document.querySelectorAll('main [role=\"button\"]').length < 6" || ok=1
  info "click Clear filter"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.includes('Clear');
    });
    if (b) b.click(); else throw new Error('Clear button not found');
  " > /dev/null 2>&1 || { fail "click Clear"; ok=1; }
  sleep 1
  check "All budgets restored after clear" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 6" || ok=1
  return $ok
}

run_test test_03_dashboard_date_filter
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
