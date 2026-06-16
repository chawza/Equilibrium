#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_06_budget_date_edit() {
  local ok=0
  reset_db; load_fixture "06-budget-date-edit.sql"; nav "http://localhost:5173/budget/1"
  check "Original date visible" \
    "!!(document.querySelector('main')?.textContent?.includes('2025'))" || ok=1
  info "click Edit dates button"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Edit dates';
    });
    if (b) b.click(); else throw new Error('Edit dates button not found');
  " > /dev/null 2>&1 || { fail "click Edit dates"; ok=1; }
  sleep 0.5
  set_input 'input[type="date"]:first-of-type' "2025-02-01" || ok=1
  sleep 0.3
  set_input 'input[type="date"]:last-of-type' "2025-02-28" || ok=1
  sleep 0.3
  info "click checkmark to save dates"
  ev "
    var btns = document.querySelectorAll('main div[style] button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent && btns[i].textContent.trim() === '✓') { btns[i].click(); break; }
    }
  " > /dev/null 2>&1 || { fail "click checkmark"; ok=1; }
  sleep 1
  check "New dates visible (Feb)" \
    "!!(document.querySelector('main')?.textContent?.includes('Feb'))" || ok=1
  return $ok
}

run_test test_06_budget_date_edit
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
