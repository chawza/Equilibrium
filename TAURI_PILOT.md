# tauri-pilot notes for Equilibrium

> Quick reference for E2E-style testing of the Tauri app. Load the `tauri-pilot` skill for the full command reference.

## Setup

The plugin is integrated in debug builds only:

- `src-tauri/Cargo.toml` — `tauri-plugin-pilot`
- `src-tauri/capabilities/default.json` — `pilot:default` permission
- `src-tauri/src/lib.rs` — `tauri_plugin_pilot::init()` under `#[cfg(debug_assertions)]`

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
