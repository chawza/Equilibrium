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

## tauri-specta rc.25 wraps `Result<T, E>` commands with `typedError`

The generated `bindings.ts` wraps fallible commands in a tagged union via `typedError`:

```typescript
// Generated signature (NOT a plain Promise<T>):
listTags: () => Promise<{ status: "ok"; data: TagWithUsage[] } | { status: "error"; error: string }>
```

Calling `await commands.listTags()` returns the wrapper object, not the array. You must unwrap it. Add a helper in any store that calls these commands:

```typescript
function unwrap<T>(result: { status: 'ok'; data: T } | { status: 'error'; error: string }): T {
    if (result.status === 'ok') return result.data;
    throw new Error(result.error);
}

// Usage:
this.list = unwrap(await commands.listTags());
```

---

## specta forbids `i64`/`u64`/`i128`/`u128` in exported types

specta-typescript panics at startup if any exported struct contains these types:

```
Failed to export TypeScript bindings: Attempted to export "" but Specta forbids
exporting BigInt-style types (usize, isize, i64, u64, i128, u128)
```

Use `i32` / `u32` for IDs and counts in all command-facing structs. Cast from SQLite's `i64` at the boundary:

```rust
let id = conn.last_insert_rowid() as i32;
let count: i32 = row.get(0)?;
```

---

## Tauri commands returning `Result<T, E>` require `E: specta::Type`

specta rc.25 needs both the Ok and Err types to implement `specta::Type` for `FunctionResult` to be satisfied. `AppError` can't derive `Type` easily because its inner types (`rusqlite::Error`, `std::io::Error`) don't implement it. Use `Result<T, String>` in command return types and `.map_err(|e| e.to_string())?` at each fallible call site. Define a local `type CmdResult<T> = std::result::Result<T, String>` at the top of the command module.

Affects both `async fn` and sync `fn` commands.

---

## `{@const}` can only be a direct child of Svelte control blocks

In Svelte 5, `{@const}` is only valid as an immediate child of `{#if}`, `{:else}`, `{#each}`, `{#snippet}`, etc. Placing it inside an HTML element (`<div>`, `<span>`, etc.) is a compile error.

For values that depend on reactive `$state`, use `$derived` at the top of the `<script>` block instead:

```svelte
<!-- ❌ fails: inside an HTML element -->
<div>
  {@const cs = tagStyle(color)}
  <span style="background: {cs.fill}">...</span>
</div>

<!-- ✅ works: inside a Svelte block -->
{#each items as item}
  {@const cs = tagStyle(item.color)}
  <span style="background: {cs.fill}">...</span>
{/each}

<!-- ✅ works: $derived for reactive state -->
let cs = $derived(tagStyle(color));
```

---

## `Result` type alias shadows `std::result::Result` in `impl Serialize`

Relevant any time a new error type is added with a local `Result<T>` alias. The `Serialize` impl's return type must use the full path:

```rust
// ✅
fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>

// ❌ — resolves to Result<S::Ok, AppError>, type mismatch
fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
```
