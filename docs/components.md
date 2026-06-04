# Components

---

## shadcn-svelte — Install These

```
npx shadcn-svelte@latest add card badge button input progress tooltip
npx shadcn-svelte@latest add popover dropdown-menu switch sonner separator
```

> `AlertDialog` is intentionally not used in this app — the Danger Zone confirmation is inline, not a dialog.

---

## Custom Components — Build from Scratch

These don't exist in shadcn. Each is small and self-contained.

| Component | What it does |
|---|---|
| `TagBadge.svelte` | Pill badge that resolves fill/text/dot colors from `TAG_COLORS` lookup by color key. Optional dot, optional remove button. |
| `StatusBadge.svelte` | Budget status pill. Uses `STATUS_BADGE` lookup (blue-hue palette), not Tailwind classes. |
| `EmojiPicker.svelte` | Popover with a "Suggested" row (from label text) + 6-column emoji grid. Selected state: ring + accent bg. |
| `ColorPicker.svelte` | 10 circular swatches (24×24) using TAG dot colors. Selected: outline + check icon. |
| `StatusStepper.svelte` | Popover (280px) with visual horizontal stepper — dots connected by lines, clickable stage list, footer note. |
| `BalanceBar.svelte` | Card with balance amount + segmented progress bar + footer captions. Handles over-budget glow. |
| `RecordRow.svelte` | Two-mode component: view (compact row) and edit (inline expanded). Enter = save, Escape = cancel. |
| `TagEditor.svelte` | Inline multi-tag attach/detach within record edit mode. Supports creating and attaching a new tag in one step. |

---

## Key Component Behaviors

**RecordRow (edit mode):**
- Ring border on the edit container: `1px solid hsl(var(--ring))` + `box-shadow: 0 0 0 2px hsl(var(--ring) / 0.08)`
- Row 1: emoji picker trigger (32×32) + label input (flex 1) + amount input (140px, "Rp" prefix, right-aligned, digits only)
- Row 2: notes input (full width)
- Row 3: TagEditor + cancel/save actions
- Label input triggers emoji auto-suggest on keystroke

**EmojiPicker:**
- Suggested section: single 34×34 button — the auto-suggested emoji from the current label
- Grid: 6 columns, 32×32 buttons
- Selected emoji: `ring-2 ring-ring` + accent background

**StatusStepper:**
- Dot states: past = tinted blue + check icon, current = solid blue (#2563EB) + white center + outer ring, future = border-only
- Clicking any stage item in the list calls `update_budget` with the new status

**TagBadge (removable):**
- 15×15 circular remove button with × icon — appears when `removable` prop is true
- Used in Tag Editor (record), Tag Selector (stats), and Tag Manager

**ColorPicker:**
- Uses the TAG dot colors (solid swatches), not fill colors
- `outline: 2px solid hsl(var(--foreground))` on selected, `outline-offset: 2px`

---

## Icon Mapping (lucide-svelte)

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
