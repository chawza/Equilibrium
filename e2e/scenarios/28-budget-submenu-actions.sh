#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

open_budget_menu() {
  local name="$1"
  info "right-click budget card: $name"
  ev "
    var card = Array.from(document.querySelectorAll('main [role=\"button\"]')).find(function(x) {
      return x.textContent && x.textContent.includes('$name');
    });
    if (!card) throw new Error('budget card not found: $name');
    var r = card.getBoundingClientRect();
    card.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: r.left + 24,
      clientY: r.top + 24
    }));
  " > /dev/null 2>&1 || { fail "right-click budget card: $name"; return 1; }
}

click_menu_item() {
  local text="$1"
  info "click menu item: $text"
  ev "
    var item = Array.from(document.querySelectorAll('[role=\"menuitem\"]')).find(function(x) {
      return x.textContent && x.textContent.trim() === '$text';
    });
    if (item) item.click(); else throw new Error('menu item not found: $text');
  " > /dev/null 2>&1 || { fail "click menu item: $text"; return 1; }
}

click_dialog_button() {
  local text="$1"
  info "click dialog button: $text"
  ev "
    var b = Array.from(document.querySelectorAll('[role=\"dialog\"] button')).find(function(x) {
      return x.textContent && x.textContent.trim().includes('$text');
    });
    if (b) b.click(); else throw new Error('dialog button not found: $text');
  " > /dev/null 2>&1 || { fail "click dialog button: $text"; return 1; }
}

test_28_budget_submenu_duplicate() {
  local ok=0
  reset_db; load_fixture "28-budget-submenu-actions.sql"; nav "http://localhost:5173/"

  check "Submenu source budget visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Submenu Source'))" || ok=1
  open_budget_menu "Submenu Source" || ok=1
  sleep 0.3
  check "Context menu shows Duplicate" \
    "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some(function(x) { return x.textContent && x.textContent.trim() === 'Duplicate'; })" || ok=1
  check "Context menu shows Delete" \
    "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some(function(x) { return x.textContent && x.textContent.trim() === 'Delete'; })" || ok=1

  click_menu_item "Duplicate" || ok=1
  sleep 0.5
  check "Duplicate modal visible" \
    "!!(document.querySelector('[role=\"dialog\"]')?.textContent?.includes('Duplicate budget'))" || ok=1
  check "Duplicate title prefilled" \
    "document.querySelector('#dup-name')?.value === 'Submenu Source (copy)'" || ok=1
  check "Duplicate dates prefilled" \
    "document.querySelector('#dup-start')?.value === '2026-01-01' && document.querySelector('#dup-end')?.value === '2026-01-31'" || ok=1

  set_input '#dup-name' "Copied Submenu Budget" || ok=1
  sleep 0.2
  click_dialog_button "Duplicate" || ok=1
  sleep 2

  check "Navigated to copied budget detail" \
    "window.location.href.includes('/budget/') && !window.location.href.endsWith('/budget/1')" || ok=1
  check "Copied budget title visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Copied Submenu Budget'))" || ok=1
  check "Copied inflow record visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Salary'))" || ok=1
  check "Copied outflow record visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries'))" || ok=1
  check "Copied totals visible" \
    "!!(document.querySelector('main')?.textContent?.match(/100\\.000/)) && !!(document.querySelector('main')?.textContent?.match(/40\\.000/))" || ok=1

  local budget_count copied_records
  budget_count=$(sqlite3 "$EQUILIBRIUM_DB" "SELECT COUNT(*) FROM budgets;") || { fail "query budget count"; ok=1; }
  copied_records=$(sqlite3 "$EQUILIBRIUM_DB" "SELECT COUNT(*) FROM records WHERE budget_id = (SELECT id FROM budgets WHERE name = 'Copied Submenu Budget');") || { fail "query copied records"; ok=1; }
  if [ "$budget_count" = "2" ]; then pass "DB has source and copied budgets"; else fail "DB has source and copied budgets (got: $budget_count)"; ok=1; fi
  if [ "$copied_records" = "2" ]; then pass "DB copied both records"; else fail "DB copied both records (got: $copied_records)"; ok=1; fi

  return $ok
}

test_28_budget_submenu_delete() {
  local ok=0
  reset_db; load_fixture "28-budget-submenu-actions.sql"; nav "http://localhost:5173/"

  open_budget_menu "Submenu Source" || ok=1
  sleep 0.3
  click_menu_item "Delete" || ok=1
  sleep 0.5

  check "Delete modal visible" \
    "!!(document.querySelector('[role=\"dialog\"]')?.textContent?.includes('Delete budget'))" || ok=1
  check "Delete modal includes budget name" \
    "document.querySelector('[role=\"dialog\"]')?.textContent?.includes('Submenu Source')" || ok=1

  click_dialog_button "Delete" || ok=1
  sleep 1

  check "Deleted budget gone from dashboard" \
    "!document.querySelector('main')?.textContent?.includes('Submenu Source')" || ok=1

  local budget_count record_count
  budget_count=$(sqlite3 "$EQUILIBRIUM_DB" "SELECT COUNT(*) FROM budgets WHERE id = 1;") || { fail "query deleted budget"; ok=1; }
  record_count=$(sqlite3 "$EQUILIBRIUM_DB" "SELECT COUNT(*) FROM records WHERE budget_id = 1;") || { fail "query deleted records"; ok=1; }
  if [ "$budget_count" = "0" ]; then pass "DB deleted budget"; else fail "DB deleted budget (got: $budget_count)"; ok=1; fi
  if [ "$record_count" = "0" ]; then pass "DB cascaded records"; else fail "DB cascaded records (got: $record_count)"; ok=1; fi

  return $ok
}

run_test test_28_budget_submenu_duplicate
run_test test_28_budget_submenu_delete
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
