#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_07_budget_back_button() {
  local ok=0
  reset_db; load_fixture "07-budget-back.sql"; nav "http://localhost:5173/budget/1"
  info "click Back to budgets"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Back to budgets';
    });
    if (b) b.click(); else throw new Error('Back to budgets button not found');
  " > /dev/null 2>&1 || { fail "click Back to budgets"; ok=1; }
  sleep 2
  check "Navigated to dashboard" \
    "window.location.href === 'http://localhost:5173/'" || ok=1
  return $ok
}

run_test test_07_budget_back_button
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
