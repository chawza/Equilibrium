# Components

---

## UI Foundation

Components are hand-built — **no shadcn-svelte is installed**. Primitives come directly from `bits-ui` where needed (e.g. popover, dropdown). Icons from `@lucide/svelte`. The `cn()` utility (clsx + tailwind-merge) lives at `src/lib/utils/cn.ts`. The `src/lib/components/ui/` directory is intentionally empty.

---

## Custom Components

All live in `src/lib/components/`.

| Component | What it does |
|---|---|
| `TagBadge.svelte` | Pill badge that resolves fill/text/dot colors from `TAG_COLORS` lookup by color key. Optional dot, optional remove button. |
| `EmojiGrid.svelte` | Emoji picker popover — a "Suggested" single button (auto-suggested from label text) + 6-column grid of all 50 predefined emojis. Selected state: ring + accent bg. |
| `StatusStepper.svelte` | Popover (280px) with visual horizontal stepper — dots connected by lines, clickable stage list, footer note. |
| `RecordRow.svelte` | Two-mode component: view (compact row) and edit (inline expanded). Enter = save, Escape = cancel. |
| `TagEditor.svelte` | Inline multi-tag attach/detach within record edit mode. Supports creating and attaching a new tag in one step. |
| `TAccountColumn.svelte` | One side of the budget T-account (inflow or outflow). Renders column header, record rows, dashed add-placeholder, and column total. |
| `ConfirmPopover.svelte` | Inline confirmation prompt (used in Tag Detail delete and Settings danger zone). Replaces the target button with "Are you sure? [Cancel] [Confirm]" — no AlertDialog. |
| `ThemeSwitch.svelte` | Toggle switch for dark/light theme — reads/writes `localStorage('eq_theme')` via the theme store. |
| `KeyboardShortcutDialog.svelte` | Modal listing all keyboard shortcuts available in the app. |
| `TagSplitBar.svelte` | Dual-color horizontal bar used in Stats "Breakdown by Tag". Renders an outflow segment + inflow segment proportionally within a single bar track. Total bar width is relative to `max` prop. Hover a segment → tooltip (label + amount). 1.5px inset divider between segments. When only one type is in the filtered set, naturally collapses to a single-color bar. |
| `ExcludeChip.svelte` | Muted strikethrough pill used in the Stats filter "Exclude" row. Shows tag dot (desaturated) + struck-through tag name + circular ×  remove button. Background: `hsl(var(--secondary))`, border: `1px solid hsl(var(--border))`. |
| `RecordTypeToggle.svelte` | Segmented control (All / Inflow / Outflow) used in the Stats filter card. Active segment gets `hsl(var(--background))` background + subtle box-shadow; Inflow active = inflow color text, Outflow active = outflow color text. |

---

## Inline / Non-Component Patterns

Some UI patterns are rendered inline in their route rather than as standalone components:

- **Balance bar** — rendered inside `src/routes/budget/[id]/+page.svelte`. Full-width card showing balance + segmented progress bar + footer captions. Handles over-budget glow.
- **Status badge pill** — rendered inline wherever needed. Styling resolved via `STATUS_BADGE` lookup in `src/lib/constants/status-badge.ts`.
- **Color swatches** — rendered inline in tag create/edit forms. 10 circular swatches from `src/lib/constants/tag-colors.ts` using the dot color values.
- **Tag Detail** — rendered inline in `src/routes/tags/+page.svelte` when a tag is selected. Not a separate route; the tags page switches between `TagManager` (list) and `TagDetail` (single-tag view) based on local state.

---

## Key Component Behaviors

**RecordRow (edit mode):**
- Ring border on the edit container: `1px solid hsl(var(--ring))` + `box-shadow: 0 0 0 2px hsl(var(--ring) / 0.08)`
- Row 1: emoji picker trigger (32×32) + label input (flex 1) + amount input (140px, "Rp" prefix, right-aligned, digits only)
- Row 2: notes input (full width)
- Row 3: TagEditor + cancel/save actions
- Label input triggers emoji auto-suggest on keystroke (calls `auto_suggest_emoji` via IPC)

**EmojiGrid:**
- Suggested section: single 34×34 button — the auto-suggested emoji from the current label
- Grid: 6 columns, 32×32 buttons, all 50 predefined emojis
- Selected emoji: `ring-2 ring-ring` + accent background

**StatusStepper:**
- Dot states: past = tinted blue + check icon, current = solid blue (#2563EB) + white center + outer ring, future = border-only
- Clicking any stage item in the list calls `update_budget` with the new status

**TagBadge (removable):**
- 15×15 circular remove button with × icon — appears when `removable` prop is true
- Used in TagEditor (record), tag selector (stats), and Tag Manager

---

## Icon Mapping (@lucide/svelte)

Import from `@lucide/svelte` (scoped package). Never use the deprecated `lucide-svelte`.

| Usage | Lucide icon |
|---|---|
| Budgets nav | `LayoutGrid` |
| Stats nav | `BarChart3` |
| Tags nav | `Tag` |
| Settings nav | `Settings` |
| Add record | `Plus` |
| Back button | `ChevronLeft` |
| Delete | `Trash2` |
| Edit | `Pencil` |
| Save | `Check` |
| Cancel | `X` |
| Export | `Download` |
| Import | `Upload` |
| SQLite copy | `Database` |
| Needs review | `AlertTriangle` |
| Light theme | `Sun` |
| Dark theme | `Moon` |
