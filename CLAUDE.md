# Equilibrium

A local-first personal budgeting desktop app. No backend, no accounts — data lives as a SQLite file on the user's machine. Users create monthly budgets, record inflows and outflows, tag them, and review spending over time.
---

## Stack

| Layer | Choice |
|---|---|
| Shell | Tauri v2 (Rust backend + WebView frontend) |
| Frontend | Svelte 5 + TypeScript |
| Styling | Tailwind CSS v4 + `bits-ui` (hand-built components — no shadcn-svelte) |
| Database | SQLite3 via `rusqlite` (native, not WASM) |
| IPC | `tauri-specta v2` rc.25 (type-safe Rust ↔ TS bindings) |
| Icons | `@lucide/svelte` (scoped package — NOT `lucide-svelte`) |
| Font | Geist (bundled locally via `@fontsource-variable/geist`) |
| Toast | `svelte-sonner` |
| Routing | SvelteKit SPA mode (`adapter-static`, `fallback: 'index.html'`) |

---

## What Changed from the Original Plan

The design went through significant evolution. Build from the final design — the original brief and project plan are superseded.

| Topic | Original Plan | **Final Design** |
|---|---|---|
| Sidebar | ~220px, text labels | **Icon-only, 56px** |
| Dark mode | "Future v2" | **Included in v1** |
| Screens | 4 screens | **5 screens** (Tag Manager added) |
| Status badges | Multi-color (amber/blue/violet/gray) | **Unified blue-hue** lifecycle palette |
| Status change UX | Simple dropdown | **Status Stepper popover** |
| Stats | Per-budget bar + tag donut + trend | **Summary tiles + lifecycle-segmented bars + tag selector** (no trend line) |
| Settings | Data section only | **4 sections**: Appearance, Data, Danger Zone, About |
| Tag model | Had emoji field | **No emoji on Tag** — emoji lives on Record |
| Budget Form header | Name + status badge | **Back button + name + clickable status badge + date line** |
| "Needs review" | Not planned | **Active budgets past end_date** get amber badge |
| Add-record UX | `+` button only | **Dashed-border placeholder** + `+` in column header |

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
If you are developing UI, you MUST understad the UI pattern from `CLAUDE_DESIGN/README.md`.
if the folder does not exists, please ask user for download it before continue! its .gitignored

```
CLAUDE_DESIGN
├── components // prototype components implemen
├── Equilibrium.html  // prototype starts
├── screenshots  // ignore, development only
├── design_handoff_equilibrium
│   ├── design_files
│   ├── design_system
│   │   ├── COMPONENTS.md
│   │   ├── ICONS.md
│   │   ├── TOKENS.md
│   │   └── TYPOGRAPHY.md
│   ├── README.md
├── styles.css
├── tweaks-panel.jsx
└── uploads  // maybe stale
    ├── DESIGN_BRIEF.md
    ├── handoff-design.md
    └── PROJECT_PLAN.md
```

## Docs Index

| File | Contents |
|---|---|
| `docs/design-system.md` | Color tokens, typography, tag colors, status badge colors, spacing, logo |
| `docs/data-model.md` | SQLite schema, TypeScript types, IPC command surface (21 commands) |
| `docs/screens.md` | All 5 screens — layout, behavior, measurements |
| `docs/components.md` | Component inventory — 9 hand-built components, `bits-ui` primitives |
| `docs/emoji.md` | Predefined emoji set (50 glyphs) + Rust fuzzy suggestion system (Jaro-Winkler, multilingual) |
| `docs/build-order.md` | Recommended implementation sequence |

## Lessons Learned

**Read `LESSONS_LEARNED.md` if you encounter any problem**
It documents real build failures and corrections from prior sessions — wrong import paths, broken crate versions, Tauri v2 quirks, etc. Several entries contradict what this CLAUDE.md says (e.g. the icon package has changed). The lessons file is the source of truth for anything that disagrees with the stack table above. if the fact is not relevant, ask user to remove and do action (bump, update, adjust) if needed.
