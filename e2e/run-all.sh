#!/bin/bash
# E2E tests for Equilibrium using tauri-pilot CLI.
# Run from repo root: EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e/run-all.sh
# Prerequisites:
#   Terminal 1: EQUILIBRIUM_DB=/tmp/eq-test.db npm run tauri dev
#   Terminal 2: bash e2e/run-all.sh
#
# Tests organized by page:
#   01-04   Dashboard (/)
#   05-14   Budget Form (/budget/[id])
#   15-20   Tags (/tags + TagDetail)
#   21-22   Stats (/stats)
#   23-26   Settings (/settings)

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; DIM='\033[0;2m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${DIM}⚠${NC} $1"; }
info() { echo -e "  ${DIM}→${NC} $1"; }

PROD_DB="$HOME/Library/Application Support/com.nabeel.equilibrium/equilibrium.db"

if [ -z "${EQUILIBRIUM_DB:-}" ]; then
  echo -e "${RED}ERROR: EQUILIBRIUM_DB is not set.${NC}"; exit 1
fi
if [ "$EQUILIBRIUM_DB" = "$PROD_DB" ]; then
  echo -e "${RED}ERROR: EQUILIBRIUM_DB points to production database.${NC}"; exit 1
fi
if ! command -v tauri-pilot &> /dev/null; then
  echo -e "${RED}ERROR: tauri-pilot CLI not found.${NC}"; exit 1
fi

echo "▶  Equilibrium E2E  (DB: $EQUILIBRIUM_DB)"
echo ""

tauri-pilot ping > /dev/null 2>&1 || {
  echo -e "${RED}ERROR: app not responding.${NC}"; exit 1
}

tauri-pilot storage set eq_toured true > /dev/null 2>&1 || true
tauri-pilot storage set eq_budget_guided true > /dev/null 2>&1 || true

# ── Helpers ───────────────────────────────────────────────────────────────────
reset_db()    { info "resetting DB"; tauri-pilot ipc reset_all_data > /dev/null 2>&1; }
load_fixture(){ info "loading fixture $1"; sqlite3 "$EQUILIBRIUM_DB" < "e2e/fixtures/$1" 2>/dev/null; }
nav()         { info "navigate $1"; tauri-pilot navigate "$1" > /dev/null 2>&1; sleep 2; }
ev()          { tauri-pilot eval "$1" 2>&1; }

set_input() {
  local selector="$1" value="$2"
  ev "
    var s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    var inp = document.querySelector('$selector');
    if (!inp) throw new Error('input not found: $selector');
    s.call(inp, '$value');
    inp.dispatchEvent(new Event('input', {bubbles: true}));
  " > /dev/null 2>&1 || { fail "set_input $selector = $value"; return 1; }
}

check() {
  local name="$1" script="$2"
  info "check: $name"
  local result
  result=$(ev "$script") || { fail "$name (eval error: $result)"; return 1; }
  if [ "$result" = "true" ]; then pass "$name"; return 0
  else fail "$name (got: $result)"; return 1; fi
}

shot() {
  local path="$1"
  info "screenshot → $path"
  tauri-pilot screenshot --selector "main" "$path" > /dev/null 2>&1 || true
}

click_btn() {
  local text="$1"
  info "click: $text"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.includes('$text');
    });
    if (b) b.click(); else throw new Error('button \"$text\" not found');
  " > /dev/null 2>&1 || { fail "click: $text"; return 1; }
}

add_record() {
  local type="$1" label="$2" amount="$3"
  info "add $type: $label Rp $amount"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim().indexOf('Add $type') === 0;
    });
    if (b) b.click(); else throw new Error('Add $type not found');
  " > /dev/null 2>&1 || { fail "click Add $type"; return 1; }
  sleep 1
  ev "var s = Date.now(); while(!document.querySelector('input[inputmode=\"numeric\"]')){if(Date.now()-s>5000)throw 1;}" > /dev/null 2>&1 || true
  sleep 0.3
  set_input 'input[placeholder="Label"]' "$label" || return 1
  sleep 0.2
  set_input 'input[inputmode="numeric"]' "$amount" || return 1
  sleep 0.3
  ev "var b = Array.from(document.querySelectorAll('button')).find(function(x){return x.getAttribute('aria-label')==='Save record';}); if(b)b.click(); else throw new Error('Save not found');" > /dev/null 2>&1 || { fail "click Save"; return 1; }
  sleep 1
}

PASS=0; FAIL=0; SKIP=0; FAILED=()

run_test() {
  local name="$1"; shift
  echo ""; info "── $name ──"
  local ok=0
  "$@" || ok=1
  if [ "$ok" -eq 0 ]; then pass "$name"; ((PASS++)) || true
  else fail "$name"; ((FAIL++)) || true; FAILED+=("$name"); fi
}

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Dashboard  (/)                                                            ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

test_01_dashboard_empty() {
  local ok=0
  reset_db; nav "http://localhost:5173/"
  check "Empty state text visible" \
    "!!(document.querySelector('main')?.textContent?.includes('No budgets yet'))" || ok=1
  return $ok
}

test_02_budget_create() {
  local ok=0
  reset_db; nav "http://localhost:5173/"
  check "Dashboard has New budget button" \
    "!!(document.querySelector('main')?.textContent?.includes('New budget'))" || ok=1
  click_btn "New budget" || ok=1
  sleep 2
  check "URL navigated to /budget/" \
    "window.location.href.includes('/budget/')" || ok=1
  check "Status badge is plan" \
    "Array.from(document.querySelectorAll('main *')).some(function(el) { return el.textContent && el.textContent.trim() === 'plan'; })" || ok=1
  nav "http://localhost:5173/"
  check "At least 1 budget card on dashboard" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 1" || ok=1
  shot "e2e/screenshots/01-dashboard-empty.png"
  return $ok
}

test_03_dashboard_date_filter() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/"
  check "6 budgets visible" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 6" || ok=1
  set_input 'input[aria-label="Filter from date"]' "2025-01-01" || ok=1
  sleep 0.3
  set_input 'input[aria-label="Filter to date"]' "2025-01-31" || ok=1
  sleep 0.5
  check "Filter shrinks list to fewer budgets" \
    "document.querySelectorAll('main [role=\"button\"]').length < 6" || ok=1
  info "click Clear filter"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.includes('Clear');
    });
    if (b) b.click(); else throw new Error('Clear button not found');
  " > /dev/null 2>&1 || { fail "click Clear"; ok=1; }
  sleep 1
  check "All budgets restored after clear" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 6" || ok=1
  return $ok
}

test_04_needs_review() {
  local ok=0
  reset_db; load_fixture "04-needs-review.sql"; nav "http://localhost:5173/"
  check "Needs review badge visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Needs review'))" || ok=1
  check "Ended hint visible" \
    "!!(document.querySelector('main')?.textContent?.includes('ended'))" || ok=1
  shot "e2e/screenshots/04-needs-review.png"
  return $ok
}

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Budget Form  (/budget/[id])                                               ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

test_05_budget_name_edit() {
  local ok=0
  reset_db; load_fixture "05-budget-name-edit.sql"; nav "http://localhost:5173/budget/1"
  check "Budget name is Test Budget" \
    "!!(document.querySelector('main')?.textContent?.includes('Test Budget'))" || ok=1
  info "click rename budget button"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Rename budget';
    });
    if (b) b.click(); else throw new Error('Rename budget button not found');
  " > /dev/null 2>&1 || { fail "click Rename budget"; ok=1; }
  sleep 0.5
  set_input 'input[type="text"]' "Renamed Budget" || ok=1
  sleep 0.5
  info "click checkmark to save name"
  ev "
    var btns = document.querySelectorAll('h1 button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent && btns[i].textContent.trim() === '✓') { btns[i].click(); break; }
    }
  " > /dev/null 2>&1 || { fail "click checkmark"; ok=1; }
  sleep 1
  check "Budget name changed to Renamed Budget" \
    "!!(document.querySelector('main')?.textContent?.includes('Renamed Budget'))" || ok=1
  nav "http://localhost:5173/"
  check "Dashboard shows Renamed Budget" \
    "!!(document.querySelector('main')?.textContent?.includes('Renamed Budget'))" || ok=1
  return $ok
}

test_06_budget_date_edit() {
  local ok=0
  reset_db; load_fixture "06-budget-date-edit.sql"; nav "http://localhost:5173/budget/1"
  check "Original date visible" \
    "!!(document.querySelector('main')?.textContent?.includes('2025'))" || ok=1
  info "click Edit dates button"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Edit dates';
    });
    if (b) b.click(); else throw new Error('Edit dates button not found');
  " > /dev/null 2>&1 || { fail "click Edit dates"; ok=1; }
  sleep 0.5
  set_input 'input[type="date"]:first-of-type' "2025-02-01" || ok=1
  sleep 0.3
  set_input 'input[type="date"]:last-of-type' "2025-02-28" || ok=1
  sleep 0.3
  info "click checkmark to save dates"
  ev "
    var btns = document.querySelectorAll('main div[style] button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent && btns[i].textContent.trim() === '✓') { btns[i].click(); break; }
    }
  " > /dev/null 2>&1 || { fail "click checkmark"; ok=1; }
  sleep 1
  check "New dates visible (Feb)" \
    "!!(document.querySelector('main')?.textContent?.includes('Feb'))" || ok=1
  return $ok
}

test_07_budget_back_button() {
  local ok=0
  reset_db; load_fixture "07-budget-back.sql"; nav "http://localhost:5173/budget/1"
  info "click Back to budgets"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Back to budgets';
    });
    if (b) b.click(); else throw new Error('Back to budgets button not found');
  " > /dev/null 2>&1 || { fail "click Back to budgets"; ok=1; }
  sleep 2
  check "Navigated to dashboard" \
    "window.location.href === 'http://localhost:5173/'" || ok=1
  return $ok
}

test_08_budget_records() {
  local ok=0
  reset_db; load_fixture "08-budget-records.sql"; nav "http://localhost:5173/budget/1"
  add_record "inflow" "Salary" "100000" || ok=1
  check "Inflow total 100.000" \
    "!!(document.querySelector('main')?.textContent?.includes('100.000'))" || ok=1
  add_record "outflow" "Groceries" "40000" || ok=1
  check "Outflow total 40.000" \
    "!!(document.querySelector('main')?.textContent?.includes('40.000'))" || ok=1
  check "Balance 60.000" \
    "!!(document.querySelector('main')?.textContent?.match(/60\\.000/))" || ok=1
  shot "e2e/screenshots/08-budget-records.png"
  return $ok
}

test_09_record_edit() {
  local ok=0
  reset_db; load_fixture "09-record-edit.sql"; nav "http://localhost:5173/budget/1"
  check "Record shows 50.000" \
    "!!(document.querySelector('main')?.textContent?.includes('50.000'))" || ok=1
  info "click record row"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record"; ok=1; }
  sleep 1
  set_input 'input[inputmode="numeric"]' "75000" || ok=1
  sleep 0.3
  info "click Cancel (simulates Escape)"
  ev "var b = Array.from(document.querySelectorAll('button')).find(function(x){return x.getAttribute('aria-label')==='Cancel edit';}); if(b)b.click();else throw new Error('Cancel not found');" > /dev/null 2>&1 || { fail "click Cancel"; ok=1; }
  sleep 1
  check "Still 50.000 after cancel" \
    "!!(document.querySelector('main')?.textContent?.includes('50.000')) && !document.querySelector('main')?.textContent?.includes('75.000')" || ok=1
  info "click record row again"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record again"; ok=1; }
  sleep 1
  set_input 'input[inputmode="numeric"]' "75000" || ok=1
  sleep 0.3
  info "click Save (simulates Enter)"
  ev "var b = Array.from(document.querySelectorAll('button')).find(function(x){return x.getAttribute('aria-label')==='Save record';}); if(b)b.click();else throw new Error('Save not found');" > /dev/null 2>&1 || { fail "click Save"; ok=1; }
  sleep 1
  check "Now 75.000 after save" \
    "!!(document.querySelector('main')?.textContent?.includes('75.000'))" || ok=1
  shot "e2e/screenshots/09-record-edit.png"
  return $ok
}

test_10_record_notes() {
  local ok=0
  reset_db; load_fixture "10-record-notes.sql"; nav "http://localhost:5173/budget/1"
  info "click record row to edit"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record"; ok=1; }
  sleep 1
  set_input 'input[placeholder="Add a note…"]' "Monthly salary deposit" || ok=1
  sleep 0.3
  ev "
    var b = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Save record';
    });
    if (b) b.click(); else throw new Error('Save not found');
  " > /dev/null 2>&1 || { fail "click Save record"; ok=1; }
  sleep 1
  check "Notes displayed in view mode" \
    "!!(document.querySelector('main')?.textContent?.includes('Monthly salary deposit'))" || ok=1
  return $ok
}

test_11_record_delete() {
  local ok=0
  reset_db; load_fixture "11-record-delete.sql"; nav "http://localhost:5173/budget/1"
  check "3 records visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Salary') && document.querySelector('main')?.textContent?.includes('Groceries') && document.querySelector('main')?.textContent?.includes('Commute'))" || ok=1
  info "click Delete record button"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Delete record';
    });
    if (b) b.click(); else throw new Error('Delete record button not found');
  " > /dev/null 2>&1 || { fail "click Delete record"; ok=1; }
  sleep 0.5
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Confirm delete';
    });
    if (b) b.click(); else throw new Error('Confirm delete button not found');
  " > /dev/null 2>&1 || { fail "click Confirm delete"; ok=1; }
  sleep 1
  check "Groceries record removed" \
    "!document.querySelector('main')?.textContent?.includes('Groceries') && document.querySelector('main')?.textContent?.includes('Salary')" || ok=1
  return $ok
}

test_12_balance_over_budget() {
  local ok=0
  reset_db; load_fixture "12-balance-over-budget.sql"; nav "http://localhost:5173/budget/1"
  check "Over budget text visible" \
    "!!(document.querySelector('main')?.textContent?.includes('over budget'))" || ok=1
  shot "e2e/screenshots/12-over-budget.png"
  return $ok
}

test_13_budget_status() {
  local ok=0
  reset_db; load_fixture "13-budget-status.sql"; nav "http://localhost:5173/budget/1"
  check "Status badge shows plan" \
    "Array.from(document.querySelectorAll('main *')).some(function(el) { return el.textContent && el.textContent.trim() === 'plan'; })" || ok=1
  warn "Status stepper popover interaction skipped (Svelte 5 programmatic click limitation)"
  shot "e2e/screenshots/13-budget-status.png"
  return $ok
}

test_14_budget_delete() {
  local ok=0
  reset_db; load_fixture "14-budget-delete.sql"; nav "http://localhost:5173/budget/1"
  check "Delete Me budget visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Delete Me'))" || ok=1
  info "click Delete budget trigger"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Delete budget';
    });
    if (b) b.click(); else throw new Error('Delete budget button not found');
  " > /dev/null 2>&1 || { fail "click Delete budget"; ok=1; }
  sleep 0.5
  info "click Confirm delete"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Confirm delete';
    });
    if (b) b.click(); else throw new Error('Confirm delete button not found');
  " > /dev/null 2>&1 || { fail "click Confirm delete"; ok=1; }
  sleep 2
  check "Redirected to dashboard" \
    "window.location.href === 'http://localhost:5173/'" || ok=1
  check "Delete Me card gone" \
    "!document.querySelector('main')?.textContent?.includes('Delete Me')" || ok=1
  return $ok
}

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Tags  (/tags + TagDetail)                                                 ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

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

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Stats  (/stats)                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

test_21_stats_rendering() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/stats"
  check "Stats has currency data (Rp)" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp'))" || ok=1
  shot "e2e/screenshots/21-stats.png"
  return $ok
}

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

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Settings  (/settings)                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

test_23_settings_theme() {
  local ok=0
  reset_db; nav "http://localhost:5173/settings"
  ev "window.__themeBefore = document.documentElement.classList.contains('dark') ? 'dark' : 'light';" > /dev/null 2>&1
  info "click theme toggle"
  tauri-pilot click "[aria-label=\"Toggle dark mode\"]" > /dev/null 2>&1
  sleep 1
  check "Theme changed" \
    "(function(){ var now = document.documentElement.classList.contains('dark') ? 'dark' : 'light'; return now !== window.__themeBefore; })()" || ok=1
  check "localStorage updated" \
    "(function(){ return localStorage.getItem('eq_theme') === (document.documentElement.classList.contains('dark') ? 'dark' : 'light'); })()" || ok=1
  nav "http://localhost:5173/"
  check "Theme persisted across navigation" \
    "(function(){ var now = document.documentElement.classList.contains('dark') ? 'dark' : 'light'; return now !== window.__themeBefore; })()" || ok=1
  nav "http://localhost:5173/settings"
  info "restore theme"
  tauri-pilot click "[aria-label=\"Toggle dark mode\"]" > /dev/null 2>&1
  sleep 1
  shot "e2e/screenshots/23-theme.png"
  return $ok
}

test_24_settings_date_format() {
  local ok=0
  reset_db; load_fixture "24-date-format.sql"; nav "http://localhost:5173/budget/1"
  check "Default format: Jun 15, 2025" \
    "!!(document.querySelector('main')?.textContent?.includes('Jun'))" || ok=1
  nav "http://localhost:5173/settings"
  click_btn "ISO" || ok=1
  sleep 1
  nav "http://localhost:5173/budget/1"
  check "ISO format: 2025-06-15" \
    "!!(document.querySelector('main')?.textContent?.includes('2025-06'))" || ok=1
  nav "http://localhost:5173/settings"
  click_btn "Jun 1" || ok=1
  sleep 0.5
  return $ok
}

test_25_settings_help_modals() {
  local ok=0
  reset_db; nav "http://localhost:5173/settings"
  info "click Tour Show again"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Show again';
    });
    if (b) b.click(); else throw new Error('Tour Show again not found');
  " > /dev/null 2>&1 || { fail "click Tour Show again"; ok=1; }
  sleep 1
  check "Tour modal opened" \
    "!!(document.querySelector('[role=\"dialog\"]')?.textContent?.includes('Welcome to Equilibrium'))" || ok=1
  info "advance tour slides → Get started"
  ev "
    var next = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.textContent && x.textContent.includes('Next');
    });
    if (next) next.click();
  " > /dev/null 2>&1
  sleep 0.5
  ev "
    var next = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.textContent && x.textContent.includes('Next');
    });
    if (next) next.click();
  " > /dev/null 2>&1
  sleep 0.5
  ev "
    var start = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.textContent && x.textContent.includes('Get started');
    });
    if (start) start.click();
  " > /dev/null 2>&1
  sleep 0.5
  info "click Budget Guide Show again"
  ev "
    var btns = Array.from(document.querySelectorAll('main button'));
    var guideBtn = null;
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent && btns[i].textContent.trim() === 'Show again') { guideBtn = btns[i]; break; }
    }
    if (guideBtn) guideBtn.click(); else throw new Error('Budget Guide Show again not found');
  " > /dev/null 2>&1 || { fail "click Budget Guide Show again"; ok=1; }
  sleep 1
  check "Budget Guide modal opened" \
    "!!(document.querySelector('[role=\"dialog\"]')?.textContent?.includes('empty'))" || ok=1
  ev "
    var b = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Got it';
    });
    if (b) b.click(); else throw new Error('Got it not found');
  " > /dev/null 2>&1 || { fail "click Got it"; ok=1; }
  sleep 1
  info "click Keyboard Shortcuts View"
  ev "
    var btns = Array.from(document.querySelectorAll('main button'));
    var ksBtn = null;
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent && btns[i].textContent.trim() === 'View') { ksBtn = btns[i]; break; }
    }
    if (ksBtn) ksBtn.click(); else throw new Error('Keyboard Shortcuts View not found');
  " > /dev/null 2>&1 || { fail "click Keyboard Shortcuts View"; ok=1; }
  sleep 1
  check "Keyboard Shortcuts dialog opened" \
    "!!(document.querySelector('[role=\"dialog\"]')?.textContent?.includes('Keyboard Shortcuts'))" || ok=1
  info "close keyboard shortcuts"
  ev "
    var b = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Close keyboard shortcuts';
    });
    if (b) b.click(); else throw new Error('Close button not found');
  " > /dev/null 2>&1 || { fail "click Close keyboard shortcuts"; ok=1; }
  sleep 0.5
  return $ok
}

test_26_settings_danger_zone() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/settings"
  info "click Reset"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Reset';
    });
    if (b) b.click(); else throw new Error('Reset button not found');
  " > /dev/null 2>&1 || { fail "click Reset"; ok=1; }
  sleep 0.5
  check "Are you sure text visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Are you sure'))" || ok=1
  info "click Cancel on reset confirmation"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Cancel';
    });
    if (b) b.click(); else throw new Error('Cancel button not found');
  " > /dev/null 2>&1 || { fail "click Cancel"; ok=1; }
  sleep 0.5
  nav "http://localhost:5173/"
  check "Data still intact after cancel" \
    "document.querySelectorAll('main [role=\"button\"]').length >= 1" || ok=1
  nav "http://localhost:5173/settings"
  info "click Reset → Confirm"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Reset';
    });
    if (b) b.click(); else throw new Error('Reset button not found');
  " > /dev/null 2>&1 || { fail "click Reset again"; ok=1; }
  sleep 0.5
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim() === 'Confirm';
    });
    if (b) b.click(); else throw new Error('Confirm button not found');
  " > /dev/null 2>&1 || { fail "click Confirm"; ok=1; }
  sleep 2
  nav "http://localhost:5173/"
  check "Dashboard empty after reset" \
    "!!(document.querySelector('main')?.textContent?.includes('No budgets yet'))" || ok=1
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Suite
# ═══════════════════════════════════════════════════════════════════════════════
run_test test_01_dashboard_empty
run_test test_02_budget_create
run_test test_03_dashboard_date_filter
run_test test_04_needs_review
run_test test_05_budget_name_edit
run_test test_06_budget_date_edit
run_test test_07_budget_back_button
run_test test_08_budget_records
run_test test_09_record_edit
run_test test_10_record_notes
run_test test_11_record_delete
run_test test_12_balance_over_budget
run_test test_13_budget_status
run_test test_14_budget_delete
run_test test_15_tag_create
run_test test_16_tag_search_filter
run_test test_17_tag_sort
run_test test_18_tag_rename
run_test test_19_tag_delete
run_test test_20_tag_detail_filters
run_test test_21_stats_rendering
run_test test_22_stats_type_filter
run_test test_23_settings_theme
run_test test_24_settings_date_format
run_test test_25_settings_help_modals
run_test test_26_settings_danger_zone

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  echo -e "${GREEN}All $PASS passed.${NC}"
else
  echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  for s in "${FAILED[@]}"; do echo "  - $s"; done
  exit 1
fi
