# tauri-pilot notes for Equilibrium

> Quick reference for E2E-style testing of the Tauri app. Load the `tauri-pilot` skill for the full command reference.

## Setup

The plugin is integrated in debug builds only:

- `src-tauri/Cargo.toml` — `tauri-plugin-pilot`
- `src-tauri/capabilities/default.json` — `pilot:default` permission
- `src-tauri/src/lib.rs` — `tauri_plugin_pilot::init()` under `#[cfg(debug_assertions)]`
- `src-tauri/src/commands/data.rs` — `EQUILIBRIUM_DB` env var support in `db_path` helper

Keep the plugin version pinned to the installed CLI version:

```bash
tauri-pilot --version
```

## Workflow

1. Start the app: `npm run tauri dev`
2. Wait for the socket to appear in `/tmp/tauri-pilot-*.sock`
3. `tauri-pilot ping` to verify the connection
4. `tauri-pilot snapshot -i` to list interactive elements with refs
5. Interact via refs (`@e5`), CSS selectors, or coordinates
6. Use `assert` for one-step verifications

## Scenario files

Use TOML scenarios for repeatable tests. The format is documented in the tauri-pilot examples; key actions are:

- `action = "navigate"` with `url = "..."`
- `action = "click"` / `action = "fill"` with `target` and `value`
- `action = "assert-text"`, `action = "assert-visible"`, `action = "assert-url"`
- `action = "wait"` with `selector` and `timeout_ms`

Run with:

```bash
tauri-pilot run tests/e2e/<scenario>.toml
```

## Known issue: `wait` / `watch` / `eval` async timeout on macOS

**`wait` and `watch` are consistently broken on macOS with tauri-pilot 0.7.2.** After any `navigate`, `wait --selector`, `wait <target>`, and `watch` all time out with `"eval timed out after 7s"`. Sync `eval` (no promises) and `snapshot` work fine.

**Root cause:** `navigate` sets `window.location.href`, which in SvelteKit SPA mode triggers a full HTML reload (Vite serves `index.html`). The page takes ~1s to reload. During the reload window, polling commands (`wait`/`watch`) get stuck and time out.

**The only reliable pattern for page navigation:**

```bash
tauri-pilot navigate "http://localhost:5173/target"
sleep 2  # allow full page reload
tauri-pilot snapshot -i   # or eval/click/fill
```

Do NOT use `wait` or `watch` in TOML scenarios — they will time out. The `navigate` action inside TOML scenarios cannot be followed by `wait`/`watch`.

**Consequence:** The TOML scenario runner (`tauri-pilot run`) is not viable for multi-page tests on macOS because every page navigation requires a `sleep` that the TOML format cannot express. Shell-based test scripts with `sleep` between commands are the recommended alternative.

## Known issue: macOS full-window screenshots are black

On macOS, `tauri-pilot screenshot <path>.png` (full window) renders a black image. This appears to be a WebKit screenshot-path issue in the plugin on this platform.

### Workaround

Scope screenshots to a specific element:

```bash
tauri-pilot screenshot --selector "main" /tmp/dashboard.png
```

`main` works well for all five screens because it contains the actual page content and excludes the empty window area that turns black.

### When screenshots / wait time out

After some navigation, the screenshot command and `wait` polling can hit `eval timed out after 30s`. Direct `snapshot` and `eval` usually keep working. If a scenario step hangs:

- Prefer `snapshot -i` + `assert text @ref "..."` over `wait --selector ...`
- Restart the app if screenshot becomes completely stuck
- Keep failure screenshots scoped to `main` when possible

## Targeting tips

The icon-only sidebar buttons have `aria-label` attributes, so stable selectors exist:

```text
[aria-label="Budgets"]   → dashboard
[aria-label="Stats"]     → stats
[aria-label="Tags"]      → tag manager
[aria-label="Settings"]  → settings
```

Refs (`@e1`, `@e2`, …) are reset on every `snapshot`, so use them within a single interaction cycle or fall back to selectors in scenarios.

## E2E test runner

The E2E tests use a shell-based runner (`e2e/run-all.sh`) with `tauri-pilot` CLI commands and explicit `sleep` delays. See `e2e/` directory structure.

**Prerequisites:**
1. App running with test DB: `EQUILIBRIUM_DB=/tmp/eq-test.db npm run tauri dev`
2. Onboarding skipped: `tauri-pilot storage set eq_toured true`

**Run all tests:**
```bash
bash e2e/run-all.sh
```
