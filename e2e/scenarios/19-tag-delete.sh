#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_19_tag_delete() {
  local ok=0
  reset_db; load_fixture "19-tag-delete.sql"; nav "http://localhost:5173/tags"
  check "Snapshot tag visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Snapshot'))" || ok=1
  info "click Snapshot tag row"
  ev "
    var rows = document.querySelectorAll('main [role=\"button\"]');
    var found = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].textContent && rows[i].textContent.includes('Snapshot')) { found = rows[i]; break; }
    }
    if (found) found.click(); else throw new Error('Snapshot row not found');
  " > /dev/null 2>&1 || { fail "click Snapshot row"; ok=1; }
  sleep 1
  info "click Delete tag trigger"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Delete tag';
    });
    if (b) b.click(); else throw new Error('Delete tag button not found');
  " > /dev/null 2>&1 || { fail "click Delete tag trigger"; ok=1; }
  sleep 0.5
  info "click Confirm delete"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Confirm delete';
    });
    if (b) b.click(); else throw new Error('Confirm delete button not found');
  " > /dev/null 2>&1 || { fail "click Confirm delete"; ok=1; }
  sleep 1.5
  check "Snapshot tag deleted (back on tags list)" \
    "!document.querySelector('main')?.textContent?.includes('Snapshot')" || ok=1
  return $ok
}

run_test test_19_tag_delete
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
