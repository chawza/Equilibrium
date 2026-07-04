# E2E v2 — Declarative TOML Scenarios

E2E tests as declarative TOML scenarios executed by `tauri-pilot run`
(tauri-pilot 0.7.2). Successor to the removed shell-based `e2e/` suite; same
test inventory (01–32), but all interaction and assertion logic lives in
per-test `.toml` files instead of bash + inline JS strings.

## Directory Structure

```
e2e-v2/
├── CLAUDE.md            # This file
├── run-all.sh           # Thin orchestrator — the only bash in this suite
├── scenarios/           # One .toml per test (NNa/NNb parts share a number)
├── fixtures/            # SQL files loaded via sqlite3 before each test
└── reports/             # JUnit XML per scenario (gitignored)
```

## How to Run

**Two terminals required:**

```bash
# Terminal 1: start the app with test DB
EQUILIBRIUM_DB=/tmp/eq-test.db npm run tauri dev

# Terminal 2: run everything
EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e-v2/run-all.sh

# Or a single test by number (matches NN, NNa, NNb…)
EQUILIBRIUM_DB=/tmp/eq-test.db bash e2e-v2/run-all.sh 08
```

`EQUILIBRIUM_DB` is mandatory; the runner refuses to run without it or when it
points at the production DB. Failure screenshots are auto-captured by
tauri-pilot to `tauri-pilot-failures/` (gitignored).

## Division of Labor

The TOML scenario format cannot express DB resets, SQL fixture loading, or a
sleep after a hard navigation, so `run-all.sh` does exactly that and nothing
else. Per scenario it:

1. resets the DB (`tauri-pilot ipc reset_all_data`),
2. neutralizes persisted UI prefs in localStorage (`eq_statsFilter`,
   `eq_dateFormat` removed; `eq_theme` set to `light`; onboarding flags set),
3. loads the declared fixture via `sqlite3`,
4. hard-navigates to the declared URL and sleeps 2s,
5. executes `tauri-pilot run <scenario>.toml --junit reports/<name>.xml`,
6. runs any declared post-scenario `dbcheck` SQL assertions.

Steps 1–4 are driven by **header directives** — comment lines at the top of
each scenario file:

```toml
# fixture: 08-budget-records.sql      -> loaded after reset (omit = empty DB)
# url: /budget/1                      -> initial page (omit = keep current page)
# noreset: true                       -> keep DB + storage from previous part
# dbcheck: 2|SELECT COUNT(*) FROM budgets;   -> post-pass SQL assertion
#                                        format: <expected>|<sql>, repeatable
```

Fixtures are plain SQL, kept minimal per test. Mind app invariants when
seeding: tag names must be lowercase (the app normalizes on create/rename and
the search filter relies on it — see `16-tag-search.sql`).

### Multi-part scenarios (NNa / NNb)

A hard page reload can only happen between scenario files (see the navigate
limitation below). Tests that need one are split into parts that run in
order; later parts declare `# noreset: true` to keep the DB state:

- `18a` rename tag → `18b` verify propagation on the budget page
- `32a` autofocus flow → `32b` reload must stay in view mode

`28a`/`28b` are simply two independent tests sharing one fixture (each resets).

## Writing a Scenario — Idiom Map

| v1 bash idiom | v2 TOML step |
|---|---|
| `nav "url"` + `sleep 2` | `# url:` header directive (runner does it) |
| mid-test navigation | click a sidebar/back/card element — SvelteKit client-side routing works fine inside TOML, then `wait` for a target-page element |
| `check "name" "js"` (substring/regex) | `action = "eval"` — **throw on failure**: `if (!cond) throw new Error('…')` |
| `set_input 'sel' "val"` (setter bypass) | plain `action = "fill"` — it triggers Svelte 5 reactivity correctly |
| click by aria-label | `action = "click"`, `target = '[aria-label="…"]'` |
| `click_btn "text"` / click row by text | `eval` step: `querySelectorAll` + `textContent.includes` + `.click()` |
| `sleep N` between actions | `wait` step: `selector = "…"` (appear) or `gone = true` (disappear) |
| ConfirmPopover 2-click | click trigger → `wait` for `[aria-label="Confirm delete"]` → click it → `wait` `gone = true` |
| `sqlite3` assertions | `# dbcheck: <expected>\|<sql>` header directive |
| `shot` screenshots | omitted — element screenshots are ~30–50% flaky on macOS; failures auto-capture instead |

Step reference (0.7.2): `click`, `fill`, `type`, `press`, `select`, `check`,
`scroll`, `navigate`, `wait`, `watch`, `eval`, `screenshot`, `assert-text`,
`assert-exists`, `assert-visible`, `assert-hidden`, `assert-value`,
`assert-url`. `[connect]` is optional — the CLI auto-discovers the socket.

## Hard-Earned Rules (spike findings, 2026-07)

1. **Never put `navigate` + `wait` in the same scenario for a hard URL
   change.** `navigate` sets `window.location.href`, the SPA fully reloads,
   and the eval bridge dies — the next `wait`/`eval` times out (~17s) and
   fails the scenario. Hard navigation belongs to the runner (`# url:`).
   Client-side navigation (clicking links/buttons in the app) is fine.
2. **`eval` steps only fail when the script throws.** A script returning
   `false` still passes. Every eval assertion must `throw new Error(...)` with
   a useful message; end scripts with a `'ok'` expression.
3. **`assert-text` is an exact match** of the element's full text — for
   substring checks use an eval-throw instead.
4. **Never `var name = …` at eval top level.** That's `window.name` (a string
   property); your element becomes `"[object HTMLInputElement]"`.
5. **Wait for a page-unique element after client-side navigation.** `main`
   and `main [role="button"]` exist on several pages (the budget form's h1 is
   `role="button"`!) and match before the route actually changes. Dashboard
   marker: `[aria-label="Filter from date"]`; settings:
   `[aria-label="Toggle dark mode"]`; budget form: `[aria-label="Rename budget"]`.
6. **Budget list loads async over IPC** — after landing on the dashboard,
   `wait` for `main [role="button"]` before counting/clicking cards.
7. **Keep `wait` selectors precise and timeouts modest (5000ms).** A wait that
   can't match burns its full timeout; a wrong-but-matching wait hides races.
8. **`press` is still broken on macOS** (enigo needs Accessibility). Click the
   explicit `aria-label` buttons instead of Enter/Escape.
9. **Tag names are lowercase by design** (`tags/+page.svelte`,
   `TagDetail.svelte` lowercase on create/rename). Assert on lowercase names;
   seed lowercase names in fixtures that feed the tag search.
10. **localStorage leaks between scenarios** — the runner neutralizes
    `eq_statsFilter`, `eq_dateFormat`, `eq_theme`; if the app grows a new
    persisted pref that affects rendering, add it there.
11. **Both help rows have a "Show again" button** — scope by the immediate
    parent row text (`App Tour` / `Budget Guide`), not by ancestor scans.

## Test Inventory

Same numbering as `e2e/CLAUDE.md` (01–32). Splits: 18a/18b (rename +
propagation), 28a/28b (duplicate / delete), 32a/32b (autofocus + reload).
35 scenario files ⇒ 32 logical tests. Status Stepper popover interaction is
still skipped (Svelte 5 programmatic-click limitation, same as v1).
