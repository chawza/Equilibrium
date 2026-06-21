#!/bin/bash
# Test 27: Add inflow/outflow draft-row behaviour.
#
# Before the fix, clicking "Add inflow" immediately called createRecord with an
# empty label, which the Rust command rejected with "Record label cannot be empty".
# After the fix, clicking "Add inflow" opens a local draft row in edit mode and
# only persists to the DB when the user fills in and saves the row.
#
# Covers:
#   1. Draft row appears on click — label input visible, no error toast
#   2. Cancel discards draft — input gone, nothing persisted, total stays Rp 0
#   3. Empty save is no-op — Save with empty fields closes cleanly, nothing persisted
#   4. Add inflow full path — fill + save → record visible, inflow total updates
#   5. Add outflow full path — fill + save → record visible, balance correct

SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

_click_add() {
  local type="$1"
  ev "
    var b = Array.from(document.querySelectorAll('main button')).find(function(x) {
      return x.textContent && x.textContent.trim().indexOf('Add $type') === 0;
    });
    if (b) b.click(); else throw new Error('Add $type not found');
  " > /dev/null 2>&1 || { fail "click Add $type"; return 1; }
}

_click_cancel() {
  ev "
    var b = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Cancel edit';
    });
    if (b) b.click(); else throw new Error('Cancel edit not found');
  " > /dev/null 2>&1 || { fail "click Cancel edit"; return 1; }
}

_click_save() {
  ev "
    var b = Array.from(document.querySelectorAll('button')).find(function(x) {
      return x.getAttribute('aria-label') === 'Save record';
    });
    if (b) b.click(); else throw new Error('Save record not found');
  " > /dev/null 2>&1 || { fail "click Save record"; return 1; }
}

test_27_add_record_draft() {
  local ok=0
  reset_db; load_fixture "27-add-record-draft.sql"; nav "http://localhost:5173/budget/1"

  # ── 1. Draft row appears on click — no error toast ───────────────────────────
  info "1: draft row appears on click"
  _click_add "inflow" || ok=1
  sleep 0.8
  check "label input visible (draft row in edit mode)" \
    "!!document.querySelector('input[placeholder=\"Label\"]')" || ok=1
  check "no error toast after Add inflow" \
    "!document.body.textContent.includes('Failed to add record')" || ok=1

  # ── 2. Cancel discards draft — nothing persisted ─────────────────────────────
  info "2: cancel discards draft"
  _click_cancel || ok=1
  sleep 0.5
  check "label input gone after cancel" \
    "!document.querySelector('input[placeholder=\"Label\"]')" || ok=1
  check "inflow total still Rp 0 after cancel" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp 0'))" || ok=1

  # ── 3. Empty save is no-op — draft closes without persisting ─────────────────
  info "3: empty save is no-op"
  _click_add "inflow" || ok=1
  sleep 0.8
  _click_save || ok=1
  sleep 0.5
  check "inflow total still Rp 0 after empty save" \
    "!!(document.querySelector('main')?.textContent?.includes('Rp 0'))" || ok=1

  # ── 4. Add inflow full path ──────────────────────────────────────────────────
  info "4: add inflow full path"
  add_record "inflow" "Salary" "100000" || ok=1
  check "inflow record label 'Salary' visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Salary'))" || ok=1
  check "inflow total 100.000" \
    "!!(document.querySelector('main')?.textContent?.includes('100.000'))" || ok=1

  # ── 5. Add outflow full path — balance correct ───────────────────────────────
  info "5: add outflow full path"
  add_record "outflow" "Groceries" "40000" || ok=1
  check "outflow record label 'Groceries' visible" \
    "!!(document.querySelector('main')?.textContent?.includes('Groceries'))" || ok=1
  check "balance 60.000 (100000 - 40000)" \
    "!!(document.querySelector('main')?.textContent?.match(/60\\.000/))" || ok=1

  return $ok
}

run_test test_27_add_record_draft
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
