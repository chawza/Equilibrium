#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_16_tag_search_filter() {
  local ok=0
  reset_db; load_fixture "16-tag-search.sql"; nav "http://localhost:5173/tags"
  check "4 tags visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries') && document.querySelector('main')?.textContent?.includes('Transport') && document.querySelector('main')?.textContent?.includes('Utilities') && document.querySelector('main')?.textContent?.includes('Entertainment'))" || ok=1
  set_input 'input[placeholder="Search tags…"]' "Tran" || ok=1
  sleep 0.5
  check "Only Transport visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Transport')) && !document.querySelector('main')?.textContent?.includes('Groceries') && !document.querySelector('main')?.textContent?.includes('Utilities')" || ok=1
  info "clear search input"
  ev "
    var inp = document.querySelector('input[placeholder=\"Search tags…\"]');
    if (inp) { var s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(inp, ''); inp.dispatchEvent(new Event('input', {bubbles: true})); }
  " > /dev/null 2>&1
  sleep 0.5
  check "All 4 tags restored" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries') && document.querySelector('main')?.textContent?.includes('Entertainment'))" || ok=1
  return $ok
}

run_test test_16_tag_search_filter
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
