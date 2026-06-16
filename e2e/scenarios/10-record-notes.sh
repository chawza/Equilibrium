#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_10_record_notes() {
  local ok=0
  reset_db; load_fixture "10-record-notes.sql"; nav "http://localhost:5173/budget/1"
  info "click record row to edit"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record"; ok=1; }
  sleep 1
  set_input 'input[placeholder="Add a note…"]' "Monthly salary deposit" || ok=1
  sleep 0.3
  ev "
    var b = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Save record';
    });
    if (b) b.click(); else throw new Error('Save not found');
  " > /dev/null 2>&1 || { fail "click Save record"; ok=1; }
  sleep 1
  check "Notes displayed in view mode" \
    "!!(document.querySelector('main')?.textContent?.includes('Monthly salary deposit'))" || ok=1
  return $ok
}

run_test test_10_record_notes
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
