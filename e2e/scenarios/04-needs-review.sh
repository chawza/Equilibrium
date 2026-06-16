#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_04_needs_review() {
  local ok=0
  reset_db; load_fixture "04-needs-review.sql"; nav "http://localhost:5173/"
  check "Needs review badge visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Needs review'))" || ok=1
  check "Ended hint visible" \
    "!!(document.querySelector('main')?.textContent?.includes('ended'))" || ok=1
  shot "$SCENARIO_DIR/../screenshots/04-needs-review.png"
  return $ok
}

run_test test_04_needs_review
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
