# Equilibrium

A local-first personal budgeting desktop app. No backend, no accounts — data lives as a SQLite file on the user's machine. Users create monthly budgets, record inflows and outflows, tag them, and review spending over time.

---

## Stack

| Layer           | Choice                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| Shell           | Tauri v2 (Rust backend + WebView frontend)                             |
| Frontend        | Svelte 5 + TypeScript                                                  |
| Styling         | Tailwind CSS v4 + `bits-ui` (hand-built components — no shadcn-svelte) |
| Database        | SQLite3 via `rusqlite` (native, not WASM)                              |
| IPC             | `tauri-specta v2` rc.25 (type-safe Rust ↔ TS bindings)                 |
| Icons           | `@lucide/svelte` (scoped package — NOT `lucide-svelte`)                |
| Font            | Geist (bundled locally via `@fontsource-variable/geist`)               |
| Toast           | `svelte-sonner`                                                        |
| Routing         | SvelteKit SPA mode (`adapter-static`, `fallback: 'index.html'`)        |
| Package manager | npm (`package-lock.json` only — no pnpm/yarn)                          |

---

## Commands & Repeatable Flows

```bash
# Full app (Vite + Rust hot reload) — this is the main dev loop
npm run tauri dev

# Frontend only (no Rust, useful for pure UI work)
npm run dev

# Release build
npm run tauri build

# TypeScript + Svelte type-check
npm run check

# Frontend unit tests (Vitest, node env)
npm test
npm run test:watch

# Rust tests (unit + integration)
cd src-tauri && cargo test
```

No ESLint/Prettier configured. No Playwright. `npm run check` is the linting substitute.

### E2E / UI automation with tauri-pilot

`tauri-pilot` is wired in for debug builds only (`tauri-plugin-pilot` + `pilot:default` capability). Use it to drive the running app over its Unix socket.

```bash
# Terminal 1: start the app
npm run tauri dev

# Terminal 2: once the socket appears in /tmp/tauri-pilot-*.sock
tauri-pilot ping
tauri-pilot snapshot -i
tauri-pilot click @e5
tauri-pilot fill @e2 "Groceries"
tauri-pilot press Enter
tauri-pilot assert text @e1 "Budgets"
tauri-pilot run tests/e2e/smoke.toml
```

See `TAURI_PILOT.md` for the known macOS full-window screenshot issue and scenario-writing notes.

### Generating / updating IPC bindings

`src/lib/bindings.ts` is **auto-generated** by tauri-specta every time you run a debug build (`npm run tauri dev`). The export is gated by `#[cfg(debug_assertions)]` in `src-tauri/src/lib.rs`. **Never hand-edit `bindings.ts`.**

### Adding a new IPC command (the full flow)

1.  Write the command fn in `src-tauri/src/commands/<domain>.rs`:
    ```rust
    #[tauri::command]
    #[specta::specta]
    pub fn my_command(state: State<'_, DbState>, ...) -> CmdResult<T> {
        let db = state.0.lock().unwrap();
        db::my_domain::do_thing(&db, ...).map_err(|e| e.to_string())
    }
    ```
2.  Keep DB logic in `src-tauri/src/db/<domain>.rs`; the command is a thin wrapper.
3.  Register the fn in `collect_commands![...]` in `src-tauri/src/lib.rs`.
4.  Run `npm run tauri dev` → tauri-specta regenerates `src/lib/bindings.ts`.
5.  Consume via `import { commands } from '$lib/ipc'` (never from `bindings.ts` directly).
6.  Unwrap the specta Result in the store with the local `unwrap<T>()` helper: `{status:'ok',data} | {status:'error',error}`.
7.  **Constraint (LESSONS_LEARNED #7):** specta forbids `i64/u64/i128/u128` — use `i32`/`u32`, cast at SQLite boundary.

---

## Project Structure

### Rust (`src-tauri/src/`)

```
src-tauri/src/
├── main.rs             # thin shim → equilibrium_lib::run()
├── lib.rs              # run(), tauri-specta builder, state setup (DbState + emoji suggester)
├── error.rs            # AppError (thiserror) + CmdResult<T> = Result<T, String>
├── models.rs           # serde + specta Type structs/enums (BudgetStatus, etc.)
├── commands/           # IPC layer — thin wrappers, all return CmdResult<T>
│   └── mod.rs  ping.rs  tags.rs  budgets.rs  data.rs  emoji.rs
├── db/                 # data layer — called by commands/
│   ├── mod.rs          # DbState(Mutex<Connection>), init, apply_schema, migrations
│   ├── schema.rs       # SCHEMA const (CREATE TABLE IF NOT EXISTS × 4)
│   └── tags.rs  budgets.rs  data.rs
└── emoji/              # Jaro-Winkler fuzzy suggestion (trait-object backend)
    └── mod.rs  catalog.rs  strsim_backend.rs  dictionaries/{en,id}.rs
```

**DB state:** single `rusqlite::Connection` behind `std::sync::Mutex` as `pub struct DbState(pub Mutex<Connection>)`. Registered via `app.manage(DbState(...))`. Commands access via `state.0.lock().unwrap()`. WAL + `foreign_keys=ON` applied on open. Schema is re-runnable (`CREATE TABLE IF NOT EXISTS`). One idempotent manual migration: `ALTER TABLE records ADD COLUMN is_adjustment` (guarded by `PRAGMA table_info`). No migration framework.

**Restore flow:** `apply_pending_restore` in `db/mod.rs` swaps a staged DB file in via sentinel files, runs at startup before the main connection opens.

**Tests:** `#[cfg(test)]` units in `db/*.rs` + `emoji/strsim_backend.rs` use `db::test_conn()` (in-memory). Integration tests: `src-tauri/tests/lifecycle.rs`.

---

### Frontend (`src/`)

```
src/
├── app.css             # Tailwind v4 entry (@import "tailwindcss" + @theme block — no JS config)
├── app.html            # includes pre-paint script for theme (avoids dark-mode flash)
├── routes/
│   ├── +layout.svelte          # sidebar, theme/dateformat/onboarding init, global shortcuts
│   ├── +layout.ts              # ssr=false, prerender=false
│   ├── +page.svelte            # Dashboard (budget list)
│   ├── budget/[id]/+page.svelte  # Budget Form
│   ├── stats/+page.svelte
│   ├── tags/+page.svelte
│   └── settings/+page.svelte
└── lib/
    ├── bindings.ts     # GENERATED by tauri-specta — do not edit
    ├── ipc.ts          # re-exports { commands } from bindings — import from here
    ├── types.ts        # hand-written TS types mirroring Rust models
    ├── stores/         # 5 Svelte 5 runes singletons (see below)
    ├── components/     # hand-built components
    │   ├── onboarding/ # OnboardingModal, TourModal, BudgetGuideModal
    │   └── KeyboardShortcutDialog.svelte
    ├── constants/      # emoji.ts, status-badge.ts, tag-colors.ts
    └── utils/          # cn.ts, format.ts, format.test.ts
```

**Store pattern — Svelte 5 runes singletons:**

Every store is a `class XStore` in a `*.svelte.ts` file using `$state(...)` fields, exported as a single instance. Example:

```ts
class BudgetsStore {
  list = $state<Budget[]>([]);
  loading = $state(false);
  async load() {
    this.list = unwrap(await commands.listBudgets());
  }
}
export const budgetsStore = new BudgetsStore();
```

The five stores: `budgets`, `tags`, `theme`, `dateformat`, `onboarding`.

**Result unwrapping:** tauri-specta rc.25 wraps command returns in `{status:'ok',data} | {status:'error',error}`. Each store has a local `unwrap<T>()` helper — currently duplicated in `budgets.svelte.ts` and `tags.svelte.ts` (not shared — noted for future cleanup).

**Onboarding:** driven by `onboarding.svelte.ts`. Persists `eq_toured` / `eq_budget_guided` to localStorage. `maybeShowTourOnLaunch()` is called from `+layout.svelte` `onMount`. Modals: `TourModal`, `BudgetGuideModal`, `KeyboardShortcutDialog`.

---

## What Changed from the Original Plan

| Topic              | Original Plan                        | **Final Design**                                                            |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------- |
| Sidebar            | ~220px, text labels                  | **Icon-only, 56px**                                                         |
| Dark mode          | "Future v2"                          | **Included in v1**                                                          |
| Screens            | 4 screens                            | **5 screens** (Tag Manager added)                                           |
| Status badges      | Multi-color (amber/blue/violet/gray) | **Unified blue-hue** lifecycle palette                                      |
| Status change UX   | Simple dropdown                      | **Status Stepper popover**                                                  |
| Stats              | Per-budget bar + tag donut + trend   | **Summary tiles + lifecycle-segmented bars + tag selector** (no trend line) |
| Settings           | Data section only                    | **4 sections**: Appearance, Data, Danger Zone, About                        |
| Tag model          | Had emoji field                      | **No emoji on Tag** — emoji lives on Record                                 |
| Budget Form header | Name + status badge                  | **Back button + name + clickable status badge + date line**                 |
| "Needs review"     | Not planned                          | **Active budgets past end_date** get amber badge                            |
| Add-record UX      | `+` button only                      | **Dashed-border placeholder** + `+` in column header                        |
| Data management    | Simple import/export                 | **Backup/restore** (staged swap at startup) + **CSV export**                |
| Onboarding         | Not planned                          | **Tour + budget-guide + keyboard-shortcuts modals**                         |

---

## Non-Negotiables

Things that are easy to get wrong — prioritize these:

- **Record edit: Enter saves, Escape cancels.** Don't rely on click-outside alone.
- **Tag rename/recolor/delete propagates immediately.** DB update + store refresh — no stale cache anywhere.
- **Amount field: integers only.** Dot-separated thousands, `font-variant-numeric: tabular-nums`.
- **Balance bar over-budget:** shows glow (`box-shadow: 0 0 8px hsl(var(--destructive) / 0.4)`), does not cap visually at 100%.
- **"Needs review":** compare `endDate` vs today client-side — an `active` budget past its end date.
- **Theme flash:** pre-paint script in `<head>` reads `localStorage` before any JS loads. This is critical — skipping it causes a white flash on dark-mode users.

---

# UI

If you are developing UI, you MUST understand the UI pattern from `CLAUDE_DESIGN` directory.
It is a Claude Design high-fidelity mockup. This is the UI technical source of truth — use it as the primary reference.

```
CLAUDE_DESIGN
├── Equilibrium.html            # React entry point
├── components/*                # prototype component implementations
│   ├── budget-form.jsx  core.jsx  keyboard-shortcuts.jsx
│   ├── onboarding.jsx  record-row.jsx  screens-app.jsx  views.jsx
├── screenshots/*               # ignore — figma dev artifacts
├── styles.css
├── tweaks-panel.jsx
└── uploads/*                   # ignore — user uploaded data
```

## Docs Index

| File                        | Contents                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `docs/design-system.md`     | Color tokens, typography, tag colors, status badge colors, spacing, logo                     |
| `docs/data-model.md`        | SQLite schema, TypeScript types, IPC command surface (23 commands), budget lifecycle         |
| `docs/screens.md`           | All 5 screens — layout, behavior, measurements                                               |
| `docs/components.md`        | Component inventory — hand-built components, `bits-ui` primitives                            |
| `docs/emoji.md`             | Predefined emoji set (50 glyphs) + Rust fuzzy suggestion system (Jaro-Winkler, multilingual) |
| `docs/coding-guidelines.md` | Rust/TS naming conventions; no single-char identifiers                                       |
| `TAURI_PILOT.md`            | tauri-pilot E2E workflow + macOS screenshot issue + targeting tips                           |

> If `CLAUDE_DESIGN/*` changes, update `docs/*` files as needed.

> `docs` is human-readable high-level reference. Let `CLAUDE_DESIGN` be the UI source of truth and the current Svelte/Tauri implementation be the code source of truth.

---

## Lessons Learned

**Read `LESSONS_LEARNED.md` before debugging any build or runtime problem.**
It documents real build failures and corrections from prior sessions — wrong import paths, broken crate versions, Tauri v2 quirks, etc. The lessons file is the source of truth for anything that disagrees with the stack table above. If a lesson is no longer relevant, ask the user to remove it, then action (bump, update, adjust) as needed.
