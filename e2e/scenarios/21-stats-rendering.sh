#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_21_stats_rendering() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/stats"
  check "Stats has currency data (Rp)" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp'))" || ok=1
  shot "$SCENARIO_DIR/../screenshots/21-stats.png"
  return $ok
}

run_test test_21_stats_rendering
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
