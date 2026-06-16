#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_11_record_delete() {
  local ok=0
  reset_db; load_fixture "11-record-delete.sql"; nav "http://localhost:5173/budget/1"
  check "3 records visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Salary') && document.querySelector('main')?.textContent?.includes('Groceries') && document.querySelector('main')?.textContent?.includes('Commute'))" || ok=1
  info "click Delete record button"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Delete record';
    });
    if (b) b.click(); else throw new Error('Delete record button not found');
  " > /dev/null 2>&1 || { fail "click Delete record"; ok=1; }
  sleep 0.5
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Confirm delete';
    });
    if (b) b.click(); else throw new Error('Confirm delete button not found');
  " > /dev/null 2>&1 || { fail "click Confirm delete"; ok=1; }
  sleep 1
  check "Groceries record removed" \
    "!document.querySelector('main')?.textContent?.includes('Groceries') && document.querySelector('main')?.textContent?.includes('Salary')" || ok=1
  return $ok
}

run_test test_11_record_delete
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
