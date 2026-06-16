#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_26_settings_danger_zone() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/settings"
  info "click Reset"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Reset';
    });
    if (b) b.click(); else throw new Error('Reset button not found');
  " > /dev/null 2>&1 || { fail "click Reset"; ok=1; }
  sleep 0.5
  check "Are you sure text visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Are you sure'))" || ok=1
  info "click Cancel on reset confirmation"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Cancel';
    });
    if (b) b.click(); else throw new Error('Cancel button not found');
  " > /dev/null 2>&1 || { fail "click Cancel"; ok=1; }
  sleep 0.5
  nav "http://localhost:5173/"
  check "Data still intact after cancel" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 1" || ok=1
  nav "http://localhost:5173/settings"
  info "click Reset → Confirm"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Reset';
    });
    if (b) b.click(); else throw new Error('Reset button not found');
  " > /dev/null 2>&1 || { fail "click Reset again"; ok=1; }
  sleep 0.5
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Confirm';
    });
    if (b) b.click(); else throw new Error('Confirm button not found');
  " > /dev/null 2>&1 || { fail "click Confirm"; ok=1; }
  sleep 2
  nav "http://localhost:5173/"
  check "Dashboard empty after reset" \
    "!!(document.querySelector('main')?.textContent?.includes('No budgets yet'))" || ok=1
  return $ok
}

run_test test_26_settings_danger_zone
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
