#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

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
  shot "$SCENARIO_DIR/../screenshots/23-theme.png"
  return $ok
}

run_test test_23_settings_theme
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
