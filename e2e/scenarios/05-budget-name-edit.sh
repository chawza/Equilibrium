#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_05_budget_name_edit() {
  local ok=0
  reset_db; load_fixture "05-budget-name-edit.sql"; nav "http://localhost:5173/budget/1"
  check "Budget name is Test Budget" \
    "!!(document.querySelector('main')?.textContent?.includes('Test Budget'))" || ok=1
  info "click rename budget button"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Rename budget';
    });
    if (b) b.click(); else throw new Error('Rename budget button not found');
  " > /dev/null 2>&1 || { fail "click Rename budget"; ok=1; }
  sleep 0.5
  set_input 'input[type="text"]' "Renamed Budget" || ok=1
  sleep 0.5
  info "click checkmark to save name"
  ev "
    var btns = document.querySelectorAll('h1 button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent && btns[i].textContent.trim() === '✓') { btns[i].click(); break; }
    }
  " > /dev/null 2>&1 || { fail "click checkmark"; ok=1; }
  sleep 1
  check "Budget name changed to Renamed Budget" \
    "!!(document.querySelector('main')?.textContent?.includes('Renamed Budget'))" || ok=1
  nav "http://localhost:5173/"
  check "Dashboard shows Renamed Budget" \
    "!!(document.querySelector('main')?.textContent?.includes('Renamed Budget'))" || ok=1
  return $ok
}

run_test test_05_budget_name_edit
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
