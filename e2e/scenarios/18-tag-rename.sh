#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

test_18_tag_rename() {
  local ok=0
  reset_db; load_fixture "18-tag-rename.sql"; nav "http://localhost:5173/tags"
  check "Groceries tag visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries'))" || ok=1
  info "click edit on Groceries"
  ev "
    var btns = Array.from(document.querySelectorAll('main button'));
    var editBtn = null;
    for (var i = 0; i < btns.length; i++) {
      var aria = btns[i].getAttribute('aria-label') || '';
      if (aria.includes('Edit')) {
        var row = btns[i].closest('div') || btns[i].parentElement;
        if (row && row.textContent && row.textContent.includes('Groceries')) {
          editBtn = btns[i]; break;
        }
      }
    }
    if (editBtn) editBtn.click(); else throw new Error('Edit button for Groceries not found');
  " > /dev/null 2>&1 || { fail "click edit"; ok=1; }
  sleep 1
  set_input 'input[type="text"]' "Food" || ok=1
  sleep 0.5
  click_btn "Save" || ok=1
  sleep 1
  check "Tag renamed to Food" \
    "!!(document.querySelector('main')?.textContent?.includes('Food'))" || ok=1
  nav "http://localhost:5173/budget/1"
  check "Food tag on record (propagation)" \
    "!!(document.querySelector('main')?.textContent?.includes('Food'))" || ok=1
  return $ok
}

run_test test_18_tag_rename
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
