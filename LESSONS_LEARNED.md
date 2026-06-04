# Lessons Learned

Tips that apply to all future sessions on this project. These are non-obvious traps that will recur as new features are added — the fixes are in the committed code, but the same mistakes are easy to make again in new files.

---

## Always use `@lucide/svelte` — not `lucide-svelte`

`lucide-svelte` is deprecated and not installed. Every new component that imports an icon must use:

```ts
import { Plus, ChevronLeft, Trash2, ... } from '@lucide/svelte';
```

CLAUDE.md's stack table still says `lucide-svelte` — ignore it, that's stale.

---

## Tauri v2 capability permissions need the `core:` prefix

When adding new permissions in `src-tauri/capabilities/default.json`, all built-in permissions are namespaced. The build gives a long error that lists all valid strings.

```json
// ✅
"permissions": ["core:default", "core:path:default", "core:fs:allow-read-file"]

// ❌ build error
"permissions": ["core:default", "path:default"]
```

---

## Replacement icons must be RGBA PNG

The placeholder icons in `src-tauri/icons/` are correct as-is. When replacing them with real brand icons, `tauri::generate_context!()` will panic at compile time if the PNGs are RGB (3-channel) instead of RGBA (4-channel). Export with alpha channel.

---

## Don't bump `tauri-specta` / `specta` or change from exact pins

Both crates are still pre-release. The Cargo.toml pins them with `=` — do not change to `"2"` or run `cargo update` on them. Mismatched RC versions between `specta` and `tauri-specta` cause subtle type errors.

```toml
# Keep exactly as-is
specta            = { version = "=2.0.0-rc.25", features = ["derive"] }
specta-typescript = "0.0.12"
tauri-specta      = { version = "=2.0.0-rc.25", features = ["derive", "typescript"] }
```

---

## Don't bump `rusqlite` past `0.39` on Rust 1.94.x

`rusqlite 0.40` depends on `libsqlite3-sys 0.38` which uses `cfg_select!` — an unstable feature not yet stable in Rust 1.94. Bump only after confirming the Rust toolchain supports it.

---

## `Result` type alias shadows `std::result::Result` in `impl Serialize`

Relevant any time a new error type is added with a local `Result<T>` alias. The `Serialize` impl's return type must use the full path:

```rust
// ✅
fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>

// ❌ — resolves to Result<S::Ok, AppError>, type mismatch
fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
```
