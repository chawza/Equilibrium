#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_22_stats_type_filter() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/stats"
  check "Stats page has Rp data" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp'))" || ok=1
  click_btn "Inflow" || ok=1
  sleep 1
  check "Stats still renders after Inflow filter" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp'))" || ok=1
  click_btn "Outflow" || ok=1
  sleep 1
  check "Stats still renders after Outflow filter" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp'))" || ok=1
  click_btn "All" || ok=1
  sleep 0.5
  return $ok
}

run_test test_22_stats_type_filter
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
