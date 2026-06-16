#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_20_tag_detail_filters() {
  local ok=0
  reset_db; load_fixture "20-tag-detail-filters.sql"; nav "http://localhost:5173/tags"
  info "click DetailTag row"
  ev "
    var rows = document.querySelectorAll('main [role=\"button\"]');
    var found = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].textContent && rows[i].textContent.includes('DetailTag')) { found = rows[i]; break; }
    }
    if (found) found.click(); else throw new Error('DetailTag row not found');
  " > /dev/null 2>&1 || { fail "click DetailTag row"; ok=1; }
  sleep 1
  check "4 records visible in detail" \
    "!!(document.querySelector('main')?.textContent?.includes('Salary A') && document.querySelector('main')?.textContent?.includes('Bonus D'))" || ok=1
  set_input 'input[placeholder="Search records by title…"]' "Salary" || ok=1
  sleep 0.5
  check "Only Salary A visible after search" \
    "!!(document.querySelector('main')?.textContent?.includes('Salary A')) && !document.querySelector('main')?.textContent?.includes('Shopping B')" || ok=1
  ev "
    var inp = document.querySelector('input[placeholder=\"Search records by title…\"]');
    if (inp) { var s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(inp, ''); inp.dispatchEvent(new Event('input', {bubbles: true})); }
  " > /dev/null 2>&1
  sleep 0.5
  click_btn "Inflow" || ok=1
  sleep 0.5
  check "Only inflow records visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Salary A') && document.querySelector('main')?.textContent?.includes('Bonus D')) && !document.querySelector('main')?.textContent?.includes('Commute C')" || ok=1
  click_btn "All" || ok=1
  sleep 0.5
  return $ok
}

run_test test_20_tag_detail_filters
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
