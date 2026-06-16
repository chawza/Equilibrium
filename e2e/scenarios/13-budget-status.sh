#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_13_budget_status() {
  local ok=0
  reset_db; load_fixture "13-budget-status.sql"; nav "http://localhost:5173/budget/1"
  check "Status badge shows plan" \
    "Array.from(document.querySelectorAll('main *')).some(function(el) { return el.textContent && el.textContent.trim() === 'plan'; })" || ok=1
  warn "Status stepper popover interaction skipped (Svelte 5 programmatic click limitation)"
  shot "$SCENARIO_DIR/../screenshots/13-budget-status.png"
  return $ok
}

run_test test_13_budget_status
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
