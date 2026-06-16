#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_24_settings_date_format() {
  local ok=0
  reset_db; load_fixture "24-date-format.sql"; nav "http://localhost:5173/budget/1"
  check "Default format: Jun 15, 2025" \
    "!!(document.querySelector('main')?.textContent?.includes('Jun'))" || ok=1
  nav "http://localhost:5173/settings"
  click_btn "ISO" || ok=1
  sleep 1
  nav "http://localhost:5173/budget/1"
  check "ISO format: 2025-06-15" \
    "!!(document.querySelector('main')?.textContent?.includes('2025-06'))" || ok=1
  nav "http://localhost:5173/settings"
  click_btn "Jun 1" || ok=1
  sleep 0.5
  return $ok
}

run_test test_24_settings_date_format
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
