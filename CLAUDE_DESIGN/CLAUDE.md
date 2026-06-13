# Equilibrium — Project Reference

Personal budgeting app prototype. Track income (**inflow**) and expenses (**outflow**) per month using a double-entry **T-account** layout (money in on the left, out on the right). Currency is Indonesian **Rupiah** (`Rp 8.500.000`). React 18 + Babel, no build step.

## Aesthetic
Minimal, dense, keyboard-driven productivity tool (Linear/shadcn vibe). Clean, restrained, professional — **not** playful. Light + dark mode. Tabular numbers for amounts. Subtle transitions only.

## Architecture
`Equilibrium.html` is the shell: loads Geist font, `styles.css`, React/Babel, then each `components/*.jsx` in order. No bundler — every `.jsx` is a `<script type="text/babel">`. Components share scope via `Object.assign(window, {...})` at the end of each file; new components MUST be exported this way to be visible to others.

**Babel scope rule:** each script file has its own scope. Never name a styles object just `styles` — collisions break everything. Use inline styles (the codebase does) or uniquely-named objects.

### Files (load order)
| File | Contains |
|---|---|
| `tweaks-panel.jsx` | Tweaks shell + `useTweaks`, `Tweak*` controls (starter component) |
| `components/core.jsx` | **Data model, sample data, all helpers, UI primitives, `Sidebar`** |
| `components/views.jsx` | `Dashboard`, `BudgetCard`, `TagManager`, `TagDetail` |
| `components/record-row.jsx` | `RecordRow`, `EmojiGrid`, `NewRecordPlaceholder`, `TagEditor` |
| `components/budget-form.jsx` | `BudgetForm`, `TAccountColumn`, `StatusStepper` |
| `components/keyboard-shortcuts.jsx` | `KeyboardShortcutDialog`, `IS_MAC`, `MOD`, `Kbd` |
| `components/onboarding.jsx` | `TourModal`, `BudgetGuideModal` + concept graphics |
| `components/stats.jsx` | `Stats` page + filter chips, bars, tiles |
| `components/screens-app.jsx` | `Settings`, **`App` (root, state, routing, mount)** |

### Routing
`App` holds a `page` string and switches in `<main>`: `dashboard` → `budget` (BudgetForm) → `stats` → `tags` → `tagDetail` → `settings`. Sidebar nav (56px icon rail) maps to ⌘1/2/3 + ⌘,. No router lib.

## Design tokens — `styles.css`
shadcn **zinc** theme, HSL channel triplets used as `hsl(var(--token))`. Dark mode via `.dark` on `<html>`.
- Core: `--background --foreground --card --primary --secondary --muted --accent --border --input --ring --destructive` (+ `-foreground` pairs)
- Budget-specific: `--inflow` (green), `--outflow` (red), with `-foreground`
- `--radius: 0.5rem`
- Type classes: `.text-page-title` (24/600), `.text-section-heading` (16/600), `.text-card-title` (14/500), `.text-amount` (14/500 tabular), `.text-caption` (12). Amount colors: `.amount-inflow` / `.amount-outflow`.
- Font: **Geist**. Never go below 12px.

## Data model (core.jsx)
```
budget = { id, name, startDate, endDate, status, records[] }
record = { id, emoji, label, type:'inflow'|'outflow', amount, tags[], notes?, is_adjustment? }
```
- **status lifecycle:** `plan → active → review → closed` (StatusStepper). `budgetNeedsReview()` flags an active budget past its end date.
- **Tags:** runtime `TAG_REGISTRY` (name→colorKey). 10 color keys (`red`…`gray`), each with light/dark fill+text+dot palettes. Resolve via `tagColor`, `tagFill`, `tagText`, `tagDot`. Mutate via `registerTag`/`setTagColor`/`renameTagInRegistry`/`removeTagFromRegistry`.
- **Status badges:** single blue hue, intensity = lifecycle stage (`statusBadgeStyle`).
- Helpers: `formatRp`/`parseRp`, `suggestEmoji` (keyword→emoji, EN + Indonesian), `nextId`.
- Bump `DATA_VERSION` when `createSampleData` shape changes — forces re-seed over stale localStorage.

## UI primitives (core.jsx) — reuse these
`EqCard` `EqBadge` `StatusBadge` `TagBadge` `EqButton` (variants: default/secondary/outline/ghost/destructive; sizes sm/md/lg/icon/icon-sm) `EqProgress` `EqInput` `Icon` (named line icons — see set in core.jsx) `Tooltip` `Dropdown` `ConfirmPopover`. Styling is inline, theme-aware via `hsl(var(--…))`.

## Theme
Module-level `EQ_THEME` in core.jsx drives tag/badge color resolvers; `App` keeps it synced with the `.dark` class and `localStorage`. Inline script in the HTML head applies the persisted theme pre-paint to avoid flash.

## Persistence (localStorage keys)
`eq_theme` `eq_budgets` `eq_data_version` `eq_page` `eq_selectedBudget` `eq_tagRegistry` `eq_statsFilter` `eq_toured` `eq_budget_guided`. **Never** clear keys you didn't write.

## Tweaks (current)
`recordStyle` (compact/comfortable row), `showTagsInList` (toggle), `columnGap` (slider). Defaults live in the `TWEAK_DEFAULTS` EDITMODE block in screens-app.jsx.

## Conventions
- Inline styles everywhere; theme colors as `hsl(var(--…))`, never hardcoded hex except the tag/status palettes in core.jsx.
- Keyboard shortcuts are first-class — keep ⌘-nav + the shortcuts dialog in sync when adding pages.
- `data-comment-anchor` on `<main>` — preserve it.
- Note: the attached "Design System" project is empty; **this codebase is the source of truth.**
