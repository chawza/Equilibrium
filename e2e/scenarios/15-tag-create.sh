#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_15_tag_create() {
  local ok=0
  reset_db; load_fixture "15-tag-create.sql"; nav "http://localhost:5173/tags"
  check "Empty state text" \
    "!!(document.querySelector('main')?.textContent?.includes('No tags yet'))" || ok=1
  click_btn "New tag" || ok=1
  sleep 0.5
  set_input 'input[placeholder="e.g. subscription"]' "Coffee" || ok=1
  sleep 0.3
  info "click color dot (red)"
  ev "
    var b = document.querySelector('button[title=\"red\"]');
    if (b) b.click(); else throw new Error('red color dot not found');
  " > /dev/null 2>&1 || { fail "click red color"; ok=1; }
  sleep 0.3
  click_btn "Create tag" || ok=1
  sleep 1
  check "Coffee tag appears in list" \
    "!!(document.querySelector('main')?.textContent?.includes('Coffee'))" || ok=1
  return $ok
}

run_test test_15_tag_create
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
