#!/bin/bash
# E2E v2 runner — declarative TOML scenarios executed via `tauri-pilot run`.
#
# This script is intentionally thin: it only handles what the TOML scenario
# format cannot express (see e2e-v2/CLAUDE.md):
#   1. DB reset          — `tauri-pilot ipc reset_all_data`
#   2. SQL fixture load  — `sqlite3 $EQUILIBRIUM_DB < fixtures/<file>`
#   3. Initial navigate  — `tauri-pilot navigate <url>` + sleep 2
#      (a TOML `navigate` step kills the eval bridge during the SPA full
#       reload, so `wait` right after it times out — runner must do it)
# All interactions and assertions live in scenarios/*.toml.
#
# Usage:
#   EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e-v2/run-all.sh        # all scenarios
#   EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e-v2/run-all.sh 08     # single scenario by number
#
# Per-scenario header directives (leading TOML comments):
#   # fixture: 08-budget-records.sql   -> loaded after reset (omit = empty DB)
#   # url: /budget/1                   -> initial page (omit = keep current page)
#   # noreset: true                    -> keep DB state from the previous part
#                                         (for NNb continuation scenarios)
#   # dbcheck: <expected>|<sql>        -> after the scenario passes, assert that
#                                         `sqlite3 $EQUILIBRIUM_DB "<sql>"` prints
#                                         <expected> (may appear multiple times)
set -u
V2_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${EQUILIBRIUM_BASE_URL:-http://localhost:5173}"
PROD_DB="$HOME/Library/Application Support/com.nabeel.equilibrium/equilibrium.db"

GREEN='\033[0;32m'; RED='\033[0;31m'; DIM='\033[0;2m'; NC='\033[0m'

[ -z "${EQUILIBRIUM_DB:-}" ] && { echo -e "${RED}ERROR: EQUILIBRIUM_DB is not set.${NC}"; exit 1; }
[ "$EQUILIBRIUM_DB" = "$PROD_DB" ] && { echo -e "${RED}ERROR: EQUILIBRIUM_DB points to production database.${NC}"; exit 1; }
command -v tauri-pilot >/dev/null || { echo -e "${RED}ERROR: tauri-pilot CLI not found.${NC}"; exit 1; }
command -v sqlite3 >/dev/null || { echo -e "${RED}ERROR: sqlite3 not found.${NC}"; exit 1; }
tauri-pilot ping >/dev/null 2>&1 || { echo -e "${RED}ERROR: app not responding (is 'npm run tauri dev' running?).${NC}"; exit 1; }

# Onboarding modals would block every scenario.
tauri-pilot storage set eq_toured true >/dev/null 2>&1 || true
tauri-pilot storage set eq_budget_guided true >/dev/null 2>&1 || true

# Header directive parser: first `# key: value` comment line in the TOML.
directive() { sed -n "s/^# $2:[[:space:]]*//p" "$1" | head -n1; }

PASS=0; FAIL=0; FAILED=()

run_scenario() {
  local toml="$1" name fixture url noreset
  name="$(basename "$toml" .toml)"
  fixture="$(directive "$toml" fixture)"
  url="$(directive "$toml" url)"
  noreset="$(directive "$toml" noreset)"

  echo ""
  echo -e "${DIM}── $name ──${NC}"
  if [ "$noreset" != "true" ]; then
    tauri-pilot ipc reset_all_data >/dev/null 2>&1
    # Neutralize persisted UI prefs that leak between scenarios (reset_all_data
    # only clears the DB, not the WebView's localStorage).
    tauri-pilot eval "localStorage.removeItem('eq_statsFilter'); localStorage.removeItem('eq_dateFormat'); localStorage.setItem('eq_theme','light'); 'ok'" >/dev/null 2>&1
  fi
  if [ -n "$fixture" ]; then
    sqlite3 "$EQUILIBRIUM_DB" < "$V2_DIR/fixtures/$fixture" || {
      echo -e "  ${RED}✗ fixture load failed: $fixture${NC}"; FAIL=$((FAIL+1)); FAILED+=("$name"); return
    }
  fi
  if [ -n "$url" ]; then
    tauri-pilot navigate "$BASE_URL$url" >/dev/null 2>&1
    sleep 2
  fi
  if ! (cd "$V2_DIR" && tauri-pilot run "$toml" --junit "reports/$name.xml"); then
    FAIL=$((FAIL+1)); FAILED+=("$name"); return
  fi
  # Post-scenario DB assertions.
  local line expected sql got
  while IFS= read -r line; do
    expected="${line%%|*}"; sql="${line#*|}"
    got="$(sqlite3 "$EQUILIBRIUM_DB" "$sql")"
    if [ "$got" != "$expected" ]; then
      echo -e "  ${RED}✗ dbcheck failed: [$sql] expected '$expected', got '$got'${NC}"
      FAIL=$((FAIL+1)); FAILED+=("$name"); return
    fi
    echo -e "  ${GREEN}✓${NC} dbcheck: $sql = $expected"
  done < <(sed -n "s/^# dbcheck:[[:space:]]*//p" "$toml")
  PASS=$((PASS+1))
}

shopt -s nullglob
if [ $# -ge 1 ]; then
  matches=("$V2_DIR/scenarios/$1"*.toml)
  [ ${#matches[@]} -eq 0 ] && { echo -e "${RED}ERROR: no scenario matches '$1'.${NC}"; exit 1; }
else
  matches=("$V2_DIR/scenarios/"[0-9][0-9]*.toml)
fi

for toml in "${matches[@]}"; do run_scenario "$toml"; done

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  echo -e "${GREEN}All $PASS scenarios passed.${NC}"
else
  echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  for s in "${FAILED[@]}"; do echo "  - $s"; done
  exit 1
fi
