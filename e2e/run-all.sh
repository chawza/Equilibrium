#!/bin/bash
# E2E tests for Equilibrium using tauri-pilot CLI.
# Run from repo root: EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e/run-all.sh
# Prerequisites:
#   Terminal 1: EQUILIBRIUM_DB=/tmp/eq-test.db npm run tauri dev
#   Terminal 2: bash e2e/run-all.sh
#
# Individual tests can also be run standalone:
#   EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e/scenarios/08-budget-records.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROD_DB="$HOME/Library/Application Support/com.nabeel.equilibrium/equilibrium.db"

if [ -z "${EQUILIBRIUM_DB:-}" ]; then
  echo -e "\033[0;31mERROR: EQUILIBRIUM_DB is not set.\033[0m"; exit 1
fi
if [ "$EQUILIBRIUM_DB" = "$PROD_DB" ]; then
  echo -e "\033[0;31mERROR: EQUILIBRIUM_DB points to production database.\033[0m"; exit 1
fi
if ! command -v tauri-pilot &> /dev/null; then
  echo -e "\033[0;31mERROR: tauri-pilot CLI not found.\033[0m"; exit 1
fi

echo "▶  Equilibrium E2E  (DB: $EQUILIBRIUM_DB)"
echo ""

tauri-pilot ping > /dev/null 2>&1 || {
  echo -e "\033[0;31mERROR: app not responding.\033[0m"; exit 1
}

tauri-pilot storage set eq_toured true > /dev/null 2>&1 || true
tauri-pilot storage set eq_budget_guided true > /dev/null 2>&1 || true

_E2E_RUNNER=1
source "$SCRIPT_DIR/lib.sh"

for f in "$SCRIPT_DIR/scenarios"/[0-9][0-9]-*.sh; do
  # shellcheck source=/dev/null
  source "$f"
done

print_results
