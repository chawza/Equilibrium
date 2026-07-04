# E2E Testing Guide

Shell-based E2E tests for Equilibrium using tauri-pilot CLI 0.7.2.

## Directory Structure

```
e2e/
├── CLAUDE.md           # This file
├── run-all.sh          # Orchestrator — sources lib.sh + all scenario files
├── lib.sh              # Shared helpers: reset_db, nav, check, click_btn, add_record, etc.
├── fixtures/           # SQL files loaded via sqlite3 before each test (21 fixtures)
├── scenarios/          # One .sh file per test (01–26), runnable standalone or via run-all.sh
└── screenshots/        # Captured screenshots (gitignored *.png, .gitkeep preserved)
```

## How to Run

**Two terminals required:**

```bash
# Terminal 1: start the app with test DB
EQUILIBRIUM_DB=/tmp/eq-test.db npm run tauri dev

# Terminal 2: run all suites
EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e/run-all.sh

# Or run a single scenario standalone
EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e/scenarios/08-budget-records.sh
```

The `EQUILIBRIUM_DB` env var is **mandatory** — the runner refuses to run without it, and refuses if it points to the production DB (`~/Library/Application Support/com.nabeel.equilibrium/equilibrium.db`).

## Writing a New Test

### 1. Create a fixture

Fixtures are plain SQL files loaded via `sqlite3`. Keep them minimal — only the data needed for that test. Use `PRAGMA foreign_keys = ON` at the top.

```sql
-- e2e/fixtures/XX-my-test.sql
INSERT INTO tags (id, name, color) VALUES (1, 'TestTag', 'blue');
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Test Budget', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'inflow', '💼', 'Salary', 100000);
```

### 2. Write the test function

Create a new file `e2e/scenarios/XX-short-description.sh`:

```bash
#!/bin/bash
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -z "${_E2E_LIB_LOADED:-}" ]] && { source "$SCENARIO_DIR/../lib.sh"; _e2e_standalone_init; }

test_XX_description() {
  local ok=0
  reset_db; load_fixture "XX-fixture.sql"; nav "http://localhost:5173/target-page"

  check "Assertion description" \
    "!!(document.querySelector('main')?.textContent?.includes('expected text'))" || ok=1

  return $ok
}

run_test test_XX_description
[[ -z "${_E2E_RUNNER:-}" ]] && print_results
```

### 3. Add to the suite

`run-all.sh` automatically sources every `e2e/scenarios/[0-9][0-9]-*.sh` file in order — no manual registration needed.

### 4. Numbering

Test numbers map to fixture file names. Fixture files live in `e2e/fixtures/` and use the prefix of the test they serve (e.g., `05-budget-name-edit.sql` serves test 05). Some tests share general-purpose fixtures (`seeded.sql`, `empty.sql`).

## Available Helpers

All helpers are defined at the top of `run-all.sh`:

| Helper | Usage | Notes |
|---|---|---|
| `reset_db` | Clear all data via IPC | `tauri-pilot ipc reset_all_data` |
| `load_fixture "file.sql"` | Load SQL fixture | Uses external `sqlite3` on `$EQUILIBRIUM_DB` |
| `nav "url"` | Navigate to page + sleep 2 | Required; SPA full reload takes ~1s |
| `ev "js"` | Run JS in browser context | Returns result; for side effects pipe to `/dev/null` |
| `set_input "selector" "value"` | Set input value (Svelte 5 safe) | Uses `Object.getOwnPropertyDescriptor` bypass |
| `check "name" "js"` | Assert JS expression is `true` | JS must return `true`/`false` (not truthy) |
| `click_btn "text"` | Click button by text content | Searches `main button` elements |
| `add_record "type" "label" "amount"` | Add inflow/outflow record | Clicks "Add inflow"/"Add outflow", fills label+amount, clicks Save |
| `shot "path"` | Screenshot `main` element | May fail silently (macOS WebKit bug) |

## Known Limitations & Workarounds

### Svelte 5 input binding

Svelte 5 `bind:value` conflicts with programmatic `input.value = x`. Must use:

```js
var s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
s.call(inp, 'value');
inp.dispatchEvent(new Event('input', {bubbles: true}));
```

This is wrapped in the `set_input` helper.

### Key press (Enter/Escape)

macOS refuses `enigo` input simulation without Accessibility permission. **Never use `tauri-pilot press Enter` or `tauri-pilot press Escape`.** Instead, click the explicit buttons:

- Save record → Click button with `aria-label="Save record"`
- Cancel edit → Click button with `aria-label="Cancel edit"`
- Cancel create → Click button with text "Cancel"

### tauri-pilot wait/watch (broken on macOS)

`wait`, `watch`, and any async `eval` (promises) timeout after 7s on macOS. Always use `sleep N` between tauri-pilot commands instead.

### TOML scenario runner (removed)

TOML scenarios could not express `sleep` delays between `navigate` and subsequent actions. All tests are now individual shell scripts in `e2e/scenarios/`.

### Full-window screenshots (black on macOS)

`tauri-pilot screenshot path.png` renders black. Use `--selector "main"` to scope to page content:

```bash
tauri-pilot screenshot --selector "main" path.png
```

Even element-scoped screenshots are intermittent (~30-50% success). Always wrap with `|| true` to tolerate failure. Use `check` (text assertions) and `snapshot -i` (JSON DOM tree) as the primary verification methods — not screenshots.

### Status Stepper popover (Svelte 5 click limitation)

The `StatusStepper` popover doesn't open with programmatic `click()` — Svelte 5 event delegation blocks it. Test 04 only verifies the initial status badge. Use IPC `update_budget` to programmatically change status if needed.

### ConfirmPopover 2-click flow

To test delete confirmation popups, target via `aria-label`:

```bash
tauri-pilot click @aria-label="Delete tag"       # opens popover
sleep 0.5
tauri-pilot click @aria-label="Confirm delete"   # confirms deletion
sleep 1.5                                         # wait for onback + list refresh
```

The Cancel button is `aria-label="Cancel"` (inside ConfirmPopover) — distinct from the page-level Cancel buttons.

### Onboarding modals

Must be disabled before tests run. The runner does this automatically:

```bash
tauri-pilot storage set eq_toured true
tauri-pilot storage set eq_budget_guided true
```

## Available aria-label Selectors

These are stable selectors in the app UI:

| Element | Selector |
|---|---|
| Save record (edit mode) | `[aria-label="Save record"]` |
| Cancel edit (edit mode) | `[aria-label="Cancel edit"]` |
| Calendar popover trigger | `[aria-label="Pick a date"]` |
| Theme toggle | `[aria-label="Toggle dark mode"]` |
| Sidebar: Budgets | `[aria-label="Budgets"]` |
| Sidebar: Stats | `[aria-label="Stats"]` |
| Sidebar: Tags | `[aria-label="Tags"]` |
| Sidebar: Settings | `[aria-label="Settings"]` |
| Delete tag trigger (TagDetail) | `[aria-label="Delete tag"]` |
| Confirm delete (ConfirmPopover) | `[aria-label="Confirm delete"]` |
| Cancel (ConfirmPopover) | `[aria-label="Cancel"]` |

## Tauri-pilot Commands Quick Reference

Commands that **work** on macOS 0.7.2:
- `ping`, `navigate`, `snapshot -i`, `eval`, `click`, `fill`
- `storage get/set`, `ipc`, `assert text`, `assert element`, `assert url`

Commands that are **broken** on macOS 0.7.2:
- `wait`, `watch`, `press` (keyboard), `screenshot` (full-window)
- `screenshot --selector` (element-scoped, intermittent)

## Test Inventory

Tests are organized by page. 26 tests across 5 page groups:

### Dashboard (/) — Tests 01–04

| # | Test | Fixture | What it verifies |
|---|---|---|---|
| 01 | Dashboard Empty State | (empty) | "No budgets yet" shown when no budgets exist |
| 02 | Budget Create | (empty) | New budget creation, URL navigation, status badge, card on dashboard |
| 03 | Dashboard Date Filter | `seeded.sql` | Date range filter shrinks list, Clear restores all |
| 04 | Needs Review Badge | `04-needs-review.sql` | Amber badge on expired active budgets with "ended" hint |

### Budget Form (/budget/[id]) — Tests 05–14

| # | Test | Fixture | What it verifies |
|---|---|---|---|
| 05 | Budget Name Edit | `05-budget-name-edit.sql` | Pencil button → rename → ✓ saves → name on dashboard |
| 06 | Budget Date Edit | `06-budget-date-edit.sql` | Date trigger → fill dates → ✓ saves → new dates shown |
| 07 | Budget Back Button | `07-budget-back.sql` | Back button returns to dashboard |
| 08 | Budget Records | `08-budget-records.sql` | Add inflow/outflow, totals update, balance calculation |
| 09 | Record Edit | `09-record-edit.sql` | Edit amount, Cancel reverts, Save persists |
| 10 | Record Notes | `10-record-notes.sql` | Edit → add notes → save → notes shown in view mode |
| 11 | Record Delete | `11-record-delete.sql` | ConfirmPopover delete, record removed from list |
| 12 | Over Budget | `12-balance-over-budget.sql` | "over budget" text when outflow > inflow |
| 13 | Budget Status Badge | `13-budget-status.sql` | Status badge shows "plan". Stepper popover skipped (Svelte 5 limitation) |
| 14 | Budget Delete | `14-budget-delete.sql` | ConfirmPopover → confirm → redirect to `/` → card gone |

### Tags (/tags + TagDetail) — Tests 15–20

| # | Test | Fixture | What it verifies |
|---|---|---|---|
| 15 | Tag Create | `15-tag-create.sql` | New tag → name → color picker → Create tag → appears in list |
| 16 | Tag Search Filter | `16-tag-search.sql` | Search input filters list, clearing restores all |
| 17 | Tag Sort | `17-tag-sort.sql` | A-Z, Most used, Least used sort buttons reorder list |
| 18 | Tag Rename + Propagation | `18-tag-rename.sql` | Rename tag, verify propagation to budget record |
| 19 | Tag Delete | `19-tag-delete.sql` | ConfirmPopover 2-click delete, tag gone from list |
| 20 | Tag Detail Filters | `20-tag-detail-filters.sql` | Record search + type filter (All/Inflow/Outflow) |
| 32 | Tag Record Autofocus | `32-tag-record-autofocus.sql` | Click record in tag detail → opens its budget with that record in edit mode, label input focused, `?focus` param stripped, reload leaves view mode (issue #8) |

### Stats (/stats) — Tests 21–22

| # | Test | Fixture | What it verifies |
|---|---|---|---|
| 21 | Stats Rendering | `seeded.sql` | Stats page renders with currency (Rp) data |
| 22 | Stats Type Filter | `seeded.sql` | All/Inflow/Outflow segmented control filters data |

### Settings (/settings) — Tests 23–26

| # | Test | Fixture | What it verifies |
|---|---|---|---|
| 23 | Theme Toggle | (empty) | Dark/light toggle, localStorage persistence, across-nav persistence |
| 24 | Date Format | `24-date-format.sql` | Format change (ISO, Jun 1, etc.) persists to budget form |
| 25 | Help Modals | (empty) | Tour 3-step, Budget Guide, Keyboard Shortcuts modals open/close |
| 26 | Danger Zone Reset | `seeded.sql` | Cancel preserves data, Confirm resets everything |
| 27 | Add Record Draft | `27-add-record-draft.sql` | Draft row on click (no error), cancel discards, empty-save no-op, inflow + outflow full path |
