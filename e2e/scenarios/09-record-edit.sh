#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_09_record_edit() {
  local ok=0
  reset_db; load_fixture "09-record-edit.sql"; nav "http://localhost:5173/budget/1"
  check "Record shows 50.000" \
    "!!(document.querySelector('main')?.textContent?.includes('50.000'))" || ok=1
  info "click record row"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record"; ok=1; }
  sleep 1
  set_input 'input[inputmode="numeric"]' "75000" || ok=1
  sleep 0.3
  info "click Cancel (simulates Escape)"
  ev "var b = Array.from(document.querySelectorAll('button')).find(function(x){return x.getAttribute('aria-label')==='Cancel edit';}); if(b)b.click();else throw new Error('Cancel not found');" > /dev/null 2>&1 || { fail "click Cancel"; ok=1; }
  sleep 1
  check "Still 50.000 after cancel" \
    "!!(document.querySelector('main')?.textContent?.includes('50.000')) && !document.querySelector('main')?.textContent?.includes('75.000')" || ok=1
  info "click record row again"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record again"; ok=1; }
  sleep 1
  set_input 'input[inputmode="numeric"]' "75000" || ok=1
  sleep 0.3
  info "click Save (simulates Enter)"
  ev "var b = Array.from(document.querySelectorAll('button')).find(function(x){return x.getAttribute('aria-label')==='Save record';}); if(b)b.click();else throw new Error('Save not found');" > /dev/null 2>&1 || { fail "click Save"; ok=1; }
  sleep 1
  check "Now 75.000 after save" \
    "!!(document.querySelector('main')?.textContent?.includes('75.000'))" || ok=1
  shot "$SCENARIO_DIR/../screenshots/09-record-edit.png"
  return $ok
}

run_test test_09_record_edit
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
