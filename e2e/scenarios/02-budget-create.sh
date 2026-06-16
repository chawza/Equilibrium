#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_02_budget_create() {
  local ok=0
  reset_db; nav "http://localhost:5173/"
  check "Dashboard has New budget button" \
    "!!(document.querySelector('main')?.textContent?.includes('New budget'))" || ok=1
  click_btn "New budget" || ok=1
  sleep 2
  check "URL navigated to /budget/" \
    "window.location.href.includes('/budget/')" || ok=1
  check "Status badge is plan" \
    "Array.from(document.querySelectorAll('main *')).some(function(el) { return el.textContent && el.textContent.trim() === 'plan'; })" || ok=1
  nav "http://localhost:5173/"
  check "At least 1 budget card on dashboard" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 1" || ok=1
  shot "$SCENARIO_DIR/../screenshots/01-dashboard-empty.png"
  return $ok
}

run_test test_02_budget_create
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
