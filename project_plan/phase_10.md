---
title: "Phase 10: v1.0.0 Release Polish"
type: phase-plan
status: in-progress
tags:
  - equilibrium
  - planning
  - phase-10
---

# Phase 10: v1.0.0 Release Polish

Goal: close the remaining gaps identified in the v1.0.0 release audit and ship the first stable release. No new features — this phase is purely hardening, identity, security, and infrastructure work.

Gated on Phase 9 (E2E testing) completing its full 26-test pass.

---

## 10.1 Blocking fixes (must land before tagging v1.0.0)

### 10.1.1 Fix `pilot:default` in production capability

`src-tauri/capabilities/default.json` references `"pilot:default"` but the pilot plugin is only initialized under `#[cfg(debug_assertions)]` in `lib.rs`. In a release build the plugin isn't registered, making the capability reference stale and potentially causing a build warning or runtime failure.

- Create `src-tauri/capabilities/dev.json` that inherits `default` and adds `"pilot:default"` — apply it to debug builds only (via Tauri's `capabilities` config or a build-time env check).
- Remove `"pilot:default"` from `src-tauri/capabilities/default.json`.

### 10.1.2 Move `tauri-plugin-pilot` out of production dependencies

`src-tauri/Cargo.toml` lists `tauri-plugin-pilot` as a regular `[dependencies]` entry — it compiles into every release binary. Move it under a Cargo feature (e.g. `dev-tools`) used only in debug profiles, or into `[dev-dependencies]` if Tauri supports that for plugins. This keeps test infrastructure out of the shipped binary.

### 10.1.3 Replace placeholder app icons

All five files in `src-tauri/icons/` are Tauri's default placeholder stubs (128×128 PNG is 359 bytes — a real icon is 5–30 KB). Create proper brand icons and replace them. Per `LESSONS_LEARNED.md`, PNGs must be RGBA (4-channel), not RGB — `tauri::generate_context!()` panics at compile time on RGB-only PNGs.

Files to replace:
- `icons/32x32.png`
- `icons/128x128.png`
- `icons/128x128@2x.png`
- `icons/icon.icns` (macOS)
- `icons/icon.ico` (Windows)

### 10.1.4 Add `favicon.png` to `static/`

`src/app.html` references `%sveltekit.assets%/favicon.png` but `static/` contains only a `fonts/` folder. Browser tabs show a broken icon. Add a matching favicon derived from the app icon.

### 10.1.5 Add `LICENSE` file

The README says "MIT" but no `LICENSE` file exists in the repository root. Without it the project is technically all-rights-reserved. Add a standard `LICENSE` (MIT) at the repo root.

### 10.1.6 Enable Content Security Policy

`src-tauri/tauri.conf.json` has `"csp": null`, disabling Tauri's default CSP entirely. Since the app makes no external network calls, a tight policy is straightforward:

```json
"csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
```

Adjust if the WebView requires additional sources (e.g. `blob:` for any canvas/font rendering).

### 10.1.7 Fix `lock().unwrap()` — poison safety in command files

`commands/budgets.rs` (11 occurrences) and `commands/tags.rs` (4 occurrences) call `state.0.lock().unwrap()`. If any command panics while holding the lock the `Mutex` becomes poisoned and every subsequent IPC call panics too, crashing the app with no recovery path short of restart.

`commands/data.rs` already uses the correct pattern:
```rust
let conn = state.0.lock().map_err(|e| e.to_string())?;
```

Apply the same to every `lock().unwrap()` in `budgets.rs` and `tags.rs`.

### 10.1.8 Add Intel Mac (x86_64) CI target

The release matrix only builds `aarch64-apple-darwin`. Add a second macOS entry in `.github/workflows/release.yml`:

```yaml
- platform: macos-13   # Intel x86_64
  args: '--target x86_64-apple-darwin'
```

Update the Rust toolchain step's `targets` expression to cover both architectures.

### 10.1.9 Confirm full E2E suite passes

Run `bash e2e/run-all.sh` clean (fresh DB, both light and dark mode) and confirm all 26 tests pass. Resolve any failures before tagging. See `e2e/CLAUDE.md` for prerequisites and known macOS limitations.

### 10.1.10 Bump version to `1.0.0`

Update in all three places atomically in one commit:
- `package.json` → `"version": "1.0.0"`
- `src-tauri/Cargo.toml` → `version = "1.0.0"`
- `src-tauri/tauri.conf.json` → `"version": "1.0.0"`

Tag the commit `v1.0.0` to trigger the release workflow.

---

## 10.2 Code quality (nice-to-have before v1.0.0)

### 10.2.1 Add input validation in the command layer

`commands/budgets.rs` and `commands/tags.rs` pass all input directly to SQLite with no validation. Add guards before the DB call:
- Reject empty or whitespace-only `name` / `label` fields
- Validate `start_date <= end_date` (ISO string comparison is safe since dates are stored as `YYYY-MM-DD`)
- Enforce reasonable string length limits (e.g. 200 chars for names, 2000 for notes)
- Client-side guard for `amount > i32::MAX` with a clear error message (specta bans `i64`, so the field is capped at ~2.1B Rupiah)

### 10.2.2 Extract shared `unwrap<T>()` helper

The tauri-specta result unwrapper is duplicated in `budgets.svelte.ts` and `tags.svelte.ts` (noted in CLAUDE.md as a known debt). Extract to `src/lib/utils/ipc.ts` and import from there in both stores.

### 10.2.3 Replace deprecated `navigator.platform`

`src/routes/+layout.svelte:42` and `src/lib/components/KeyboardShortcutDialog.svelte:11` use `navigator.platform` to detect macOS. This API is deprecated. Replace with:

```ts
const IS_MAC = navigator.userAgentData?.platform === 'macOS'
  ?? /Mac/.test(navigator.userAgent);
```

---

## 10.3 CI improvements (nice-to-have before v1.0.0)

### 10.3.1 Add test + type-check steps to release workflow

The release CI (`release.yml`) runs `npm ci` then immediately invokes `tauri-action` — no type-check or tests run. A type error or failing unit test currently ships silently. Add before the build step:

```yaml
- name: Type-check frontend
  run: npm run check

- name: Frontend unit tests
  run: npm test

- name: Rust tests
  run: cargo test --manifest-path src-tauri/Cargo.toml
```

### 10.3.2 Add a PR/push CI workflow

Create `.github/workflows/ci.yml` that runs `npm run check`, `npm test`, and `cargo test` on every push and pull request. The release workflow is triggered only by tags — regressions on `main` go undetected until a release is cut.

---

## 10.4 Data & documentation

### 10.4.1 Remove or gate `src/lib/fixtures.json`

A JSON fixture file with sample budgets, tags, and records lives at `src/lib/fixtures.json`. No imports reference it in the current codebase, but it ships in the built frontend assets. Delete it, or move it to a dev-only location (e.g. `e2e/fixtures/`) if it's used for manual testing.

### 10.4.2 Add schema version tracking

The current migration strategy is a single idempotent `ALTER TABLE … ADD COLUMN` guard checked via `PRAGMA table_info`. This works for one migration but doesn't scale. Add a `schema_version` table (one integer row) in `db/schema.rs` so future migrations can be versioned and run in order.

### 10.4.3 Update CLAUDE.md phase table

Mark Phase 9 as `🔄 In Progress` and add Phase 10 once this file is committed.

### 10.4.4 Document currency design decision

`formatCurrency()` is permanently `Rp` (Indonesian Rupiah) with dot-thousands separators — no settings exist to change it. Add a note to `docs/design-system.md` stating that single-currency (IDR) support is an explicit v1 design constraint, not an oversight.

---

## Phase status table (feature checklist)

| # | Item | Status |
|---|---|---|
| 10.1.1 | Fix `pilot:default` in production capability | 🔲 |
| 10.1.2 | Move `tauri-plugin-pilot` to dev-only | 🔲 |
| 10.1.3 | Replace placeholder app icons | 🔲 |
| 10.1.4 | Add `favicon.png` to `static/` | 🔲 |
| 10.1.5 | Add `LICENSE` file | 🔲 |
| 10.1.6 | Enable Content Security Policy | 🔲 |
| 10.1.7 | Fix `lock().unwrap()` → `lock().map_err(...)` | 🔲 |
| 10.1.8 | Add Intel Mac CI target | 🔲 |
| 10.1.9 | Confirm full E2E suite passes | 🔲 |
| 10.1.10 | Bump version to `1.0.0` and tag | 🔲 |
| 10.2.1 | Input validation in command layer | 🔲 |
| 10.2.2 | Extract shared `unwrap<T>()` helper | 🔲 |
| 10.2.3 | Replace deprecated `navigator.platform` | 🔲 |
| 10.3.1 | Add test + type-check to release CI | 🔲 |
| 10.3.2 | Add PR/push CI workflow | 🔲 |
| 10.4.1 | Remove/gate `src/lib/fixtures.json` | 🔲 |
| 10.4.2 | Add schema version tracking | 🔲 |
| 10.4.3 | Update CLAUDE.md phase table | 🔲 |
| 10.4.4 | Document currency design decision | 🔲 |
