#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_14_budget_delete() {
  local ok=0
  reset_db; load_fixture "14-budget-delete.sql"; nav "http://localhost:5173/budget/1"
  check "Delete Me budget visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Delete Me'))" || ok=1
  info "click Delete budget trigger"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Delete budget';
    });
    if (b) b.click(); else throw new Error('Delete budget button not found');
  " > /dev/null 2>&1 || { fail "click Delete budget"; ok=1; }
  sleep 0.5
  info "click Confirm delete"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Confirm delete';
    });
    if (b) b.click(); else throw new Error('Confirm delete button not found');
  " > /dev/null 2>&1 || { fail "click Confirm delete"; ok=1; }
  sleep 2
  check "Redirected to dashboard" \
    "window.location.href === 'http://localhost:5173/'" || ok=1
  check "Delete Me card gone" \
    "!document.querySelector('main')?.textContent?.includes('Delete Me')" || ok=1
  return $ok
}

run_test test_14_budget_delete
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
