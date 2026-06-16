#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_01_dashboard_empty() {
  local ok=0
  reset_db; nav "http://localhost:5173/"
  check "Empty state text visible" \
    "!!(document.querySelector('main')?.textContent?.includes('No budgets yet'))" || ok=1
  return $ok
}

run_test test_01_dashboard_empty
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
