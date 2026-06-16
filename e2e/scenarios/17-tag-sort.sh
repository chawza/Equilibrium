#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_17_tag_sort() {
  local ok=0
  reset_db; load_fixture "17-tag-sort.sql"; nav "http://localhost:5173/tags"
  click_btn "Most used" || ok=1
  sleep 0.5
  check "Tags page still renders after Most used sort" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries'))" || ok=1
  click_btn "Least used" || ok=1
  sleep 0.5
  check "Tags page still renders after Least used sort" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries'))" || ok=1
  click_btn "A–Z" || ok=1
  sleep 0.5
  check "Back to A-Z order" \
    "!!(document.querySelector('main')?.textContent?.includes('Entertainment') && document.querySelector('main')?.textContent?.includes('Groceries'))" || ok=1
  return $ok
}

run_test test_17_tag_sort
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
