#!/bin/bash
# Shared helpers for Equilibrium E2E scenarios.
# Source this file; do not run it directly.
_E2E_LIB_LOADED=1
E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; RED='\033[0;31m'; DIM='\033[0;2m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${DIM}⚠${NC} $1"; }
info() { echo -e "  ${DIM}→${NC} $1"; }

PROD_DB="$HOME/Library/Application Support/com.nabeel.equilibrium/equilibrium.db"

PASS=0; FAIL=0; SKIP=0; FAILED=()

reset_db()    { info "resetting DB"; tauri-pilot ipc reset_all_data > /dev/null 2>&1; }
load_fixture(){ info "loading fixture $1"; sqlite3 "$EQUILIBRIUM_DB" < "$E2E_DIR/fixtures/$1" 2>/dev/null; }
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

run_test() {
  local name="$1"; shift
  echo ""; info "── $name ──"
  local ok=0
  "$@" || ok=1
  if [ "$ok" -eq 0 ]; then pass "$name"; ((PASS++)) || true
  else fail "$name"; ((FAIL++)) || true; FAILED+=("$name"); fi
}

print_results() {
  echo ""
  if [ ${#FAILED[@]} -eq 0 ]; then
    echo -e "${GREEN}All $PASS passed.${NC}"
  else
    echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
    for s in "${FAILED[@]}"; do echo "  - $s"; done
    exit 1
  fi
}

_e2e_standalone_init() {
  if [ -z "${EQUILIBRIUM_DB:-}" ]; then
    echo -e "${RED}ERROR: EQUILIBRIUM_DB is not set.${NC}"; exit 1
  fi
  if [ "$EQUILIBRIUM_DB" = "$PROD_DB" ]; then
    echo -e "${RED}ERROR: EQUILIBRIUM_DB points to production database.${NC}"; exit 1
  fi
  if ! command -v tauri-pilot &> /dev/null; then
    echo -e "${RED}ERROR: tauri-pilot CLI not found.${NC}"; exit 1
  fi
  tauri-pilot ping > /dev/null 2>&1 || {
    echo -e "${RED}ERROR: app not responding.${NC}"; exit 1
  }
  tauri-pilot storage set eq_toured true > /dev/null 2>&1 || true
  tauri-pilot storage set eq_budget_guided true > /dev/null 2>&1 || true
}
