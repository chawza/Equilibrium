#!/bin/bash
# E2E tests for Equilibrium using tauri-pilot CLI.
# Run from repo root: EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e/run-all.sh
# Prerequisites:
#   Terminal 1: EQUILIBRIUM_DB=/tmp/eq-test.db npm run tauri dev
#   Terminal 2: bash e2e/run-all.sh

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

# ═══════════════════════════════════════════════════════════════════════════════
# Test 01 — Budget Create
# Verifies: dashboard renders, New budget creates a card, URL changes,
# status badge shows "plan", card appears on dashboard after creation.
# ═══════════════════════════════════════════════════════════════════════════════
test_01_budget_create() {
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

  shot "e2e/screenshots/01-budget-create.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 02 — Budget Records (add inflow + outflow, verify balance)
# Fixture: budget id=1 (active, current month)
# Verifies: add inflow record, add outflow record, totals update, balance correct
# ═══════════════════════════════════════════════════════════════════════════════
test_02_budget_records() {
  local ok=0
  reset_db; load_fixture "02-budget-records.sql"; nav "http://localhost:5173/budget/1"

  add_record "inflow" "Salary" "100000" || ok=1
  check "Inflow total 100.000" \
    "!!(document.querySelector('main')?.textContent?.includes('100.000'))" || ok=1

  add_record "outflow" "Groceries" "40000" || ok=1
  check "Outflow total 40.000" \
    "!!(document.querySelector('main')?.textContent?.includes('40.000'))" || ok=1

  check "Balance 60.000" \
    "!!(document.querySelector('main')?.textContent?.match(/60\\.000/))" || ok=1

  shot "e2e/screenshots/02-budget-records.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 03 — Record Edit (Enter saves, Escape cancels)
# Fixture: budget id=1 with record amount=50000
# NOTE: Escape key on macOS requires Accessibility permission. We click the
# "Cancel edit" button instead, which has the same effect per RecordRow.
# ═══════════════════════════════════════════════════════════════════════════════
test_03_record_edit() {
  local ok=0
  reset_db; load_fixture "03-record-edit.sql"; nav "http://localhost:5173/budget/1"

  check "Record shows 50.000" \
    "!!(document.querySelector('main')?.textContent?.includes('50.000'))" || ok=1

  # Enter edit mode from view mode
  info "click record row"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record"; ok=1; }
  sleep 1

  set_input 'input[inputmode="numeric"]' "75000" || ok=1
  sleep 0.3

  # Cancel = click "Cancel edit" button (instead of Escape key)
  info "click Cancel (simulates Escape)"
  ev "var b = Array.from(document.querySelectorAll('button')).find(function(x){return x.getAttribute('aria-label')==='Cancel edit';}); if(b)b.click();else throw new Error('Cancel not found');" > /dev/null 2>&1 || { fail "click Cancel"; ok=1; }
  sleep 1

  check "Still 50.000 after cancel" \
    "!!(document.querySelector('main')?.textContent?.includes('50.000')) && !document.querySelector('main')?.textContent?.includes('75.000')" || ok=1

  # Edit again and save with Enter (via Save button click)
  info "click record row again"
  ev "var el = document.querySelector('.text-card-title'); if (el) el.click(); else throw new Error('record row not found');" > /dev/null 2>&1 || { fail "click record again"; ok=1; }
  sleep 1

  set_input 'input[inputmode="numeric"]' "75000" || ok=1
  sleep 0.3

  # Save = click "Save record" button (instead of Enter key)
  info "click Save (simulates Enter)"
  ev "var b = Array.from(document.querySelectorAll('button')).find(function(x){return x.getAttribute('aria-label')==='Save record';}); if(b)b.click();else throw new Error('Save not found');" > /dev/null 2>&1 || { fail "click Save"; ok=1; }
  sleep 1

  check "Now 75.000 after save" \
    "!!(document.querySelector('main')?.textContent?.includes('75.000'))" || ok=1

  shot "e2e/screenshots/03-record-edit.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 04 — Budget Status (plan status on new budgets)
# Fixture: budget id=1 status "plan"
# NOTE: Status stepper popover interaction is skipped — the StatusStepper's
# Svelte 5 event handler doesn't respond to programmatic click() calls.
# We verify the initial status badge instead.
# ═══════════════════════════════════════════════════════════════════════════════
test_04_budget_status() {
  local ok=0
  reset_db; load_fixture "04-budget-status.sql"; nav "http://localhost:5173/budget/1"

  check "Status badge shows plan" \
    "Array.from(document.querySelectorAll('main *')).some(function(el) { return el.textContent && el.textContent.trim() === 'plan'; })" || ok=1

  # Stepper interaction is skipped — known limitation with Svelte 5 + programmatic click.
  # The IPC update_budget command can be used to change status programmatically.
  warn "Status stepper popover interaction skipped (Svelte 5 programmatic click limitation)"

  shot "e2e/screenshots/04-budget-status.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 05 — "Needs Review" Badge
# Fixture: budget 1=active past end_date, budget 2=closed past end_date
# Verifies: amber "Needs review" badge appears on expired active budgets with
# "ended X day(s) ago" hint.
# ═══════════════════════════════════════════════════════════════════════════════
test_05_needs_review() {
  local ok=0
  reset_db; load_fixture "05-needs-review.sql"; nav "http://localhost:5173/"

  check "Needs review badge visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Needs review'))" || ok=1

  check "Ended hint visible" \
    "!!(document.querySelector('main')?.textContent?.includes('ended'))" || ok=1

  shot "e2e/screenshots/05-needs-review.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 06 — Balance Bar Over-Budget
# Fixture: budget id=1 inflow 50000 outflow 80000
# Verifies: "over budget" text appears in the balance bar footer
# ═══════════════════════════════════════════════════════════════════════════════
test_06_balance_over_budget() {
  local ok=0
  reset_db; load_fixture "06-balance-over-budget.sql"; nav "http://localhost:5173/budget/1"

  check "Over budget text visible" \
    "!!(document.querySelector('main')?.textContent?.includes('over budget'))" || ok=1

  shot "e2e/screenshots/06-over-budget.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 07 — Tag Rename + Propagation
# Fixture: tag "Groceries" green + budget id=1 + tagged record
# Verifies: tag rename works, renamed tag propagates to budget record
# NOTE: Delete confirmation uses ConfirmPopover (2-click flow); skipped for
# reliability. Rename + propagation are the critical flows.
# ═══════════════════════════════════════════════════════════════════════════════
test_07_tag_rename() {
  local ok=0
  reset_db; load_fixture "07-tag-crud.sql"; nav "http://localhost:5173/tags"

  check "Groceries tag visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries'))" || ok=1

  # Click edit on the Groceries tag row
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

  # Verify propagation to budget record
  nav "http://localhost:5173/budget/1"
  check "Food tag on record (propagation)" \
    "!!(document.querySelector('main')?.textContent?.includes('Food'))" || ok=1

  warn "Tag delete + confirm popover skipped (2-click ConfirmPopover interaction)"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 08 — Stats Page
# Fixture: seeded.sql (6 budgets with records across lifecycle stages)
# Verifies: stats page shows currency data (Rp amounts)
# ═══════════════════════════════════════════════════════════════════════════════
test_08_stats() {
  local ok=0
  reset_db; load_fixture "seeded.sql"; nav "http://localhost:5173/stats"

  check "Stats has currency data (Rp)" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp'))" || ok=1

  shot "e2e/screenshots/08-stats.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Test 09 — Settings Theme Toggle
# Verifies: dark/light toggle changes theme, persists to localStorage,
# theme persists across page navigation, toggle restored.
# ═══════════════════════════════════════════════════════════════════════════════
test_09_settings_theme() {
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

  shot "e2e/screenshots/09-theme.png"
  return $ok
}

# ═══════════════════════════════════════════════════════════════════════════════
# Suite
# ═══════════════════════════════════════════════════════════════════════════════
run_test test_01_budget_create
run_test test_02_budget_records
run_test test_03_record_edit
run_test test_04_budget_status
run_test test_05_needs_review
run_test test_06_balance_over_budget
run_test test_07_tag_rename
run_test test_08_stats
run_test test_09_settings_theme

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  echo -e "${GREEN}All $PASS passed.${NC}"
else
  echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  for s in "${FAILED[@]}"; do echo "  - $s"; done
  exit 1
fi
