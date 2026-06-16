#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${_E2E_LIB_LOADED:-}" ]]; then source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; fi

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

run_test test_25_settings_help_modals
if [[ -z "${_E2E_RUNNER:-}" ]]; then print_results; fi
