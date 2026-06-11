# Handoff: Equilibrium

A comprehensive developer handoff for implementing the Equilibrium budget app. The design files in this bundle are **HTML/React prototypes** — reference implementations showing the exact intended look and behavior. The task is to **recreate these designs in the target stack (Tauri v2 + Svelte 5 + TypeScript + Tailwind CSS + shadcn-svelte)** using the codebase's established patterns and libraries.

---

## About the Design Files

The `design_files/` folder contains the full working HTML prototype:

| File | Description |
|---|---|
| `Equilibrium.html` | Entry point — loads all scripts |
| `styles.css` | Global CSS tokens and base styles |
| `components/core.jsx` | Data model, helpers, UI primitives (Card, Badge, Button, Input, Progress, Icon, Tooltip, Dropdown, ConfirmPopover), Sidebar |
| `components/views.jsx` | Dashboard (budget card list), Tag Manager |
| `components/record-row.jsx` | Record Row (view + inline edit), Emoji Picker, Tag Editor |
| `components/budget-form.jsx` | Budget Form (T-account layout), Status Stepper |
| `components/screens-app.jsx` | Stats, Settings, App shell (routing + state) |

> Open `Equilibrium.html` in a browser to interact with the full prototype. All state persists in localStorage.

---

## Fidelity

**High-fidelity (hifi).** These are pixel-perfect mockups with final colors, typography, spacing, dark mode, and fully working interactions. The developer should recreate the UI with exact visual fidelity using shadcn-svelte components and Tailwind utility classes.

---

## Tech Stack Mapping

| Prototype | Production |
|---|---|
| React 18 + Babel (inline JSX) | Svelte 5 + TypeScript |
| CSS custom properties (hand-written) | Tailwind CSS + shadcn-svelte theme config |
| localStorage | SQLite via rusqlite (Rust backend) |
| Custom UI components | shadcn-svelte components (Card, Badge, Button, Input, Progress, Popover, etc.) |
| Inline SVG icons | lucide-svelte |
| Google Fonts (Geist) | Locally bundled Geist font |
| Client-side state (React useState) | Svelte 5 runes ($state, $derived, $effect) |
| JSON in localStorage | tauri-specta v2 IPC → Rust CRUD commands |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Tauri Window                       │
│  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │          │  │                                  │  │
│  │ Sidebar  │  │  Main Content Area               │  │
│  │ (56px)   │  │  (flex: 1, overflow: auto)       │  │
│  │          │  │  padding: 32px                   │  │
│  │ [Budgets]│  │                                  │  │
│  │ [Stats]  │  │  ┌──────────────────────────┐    │  │
│  │ [Tags]   │  │  │  Page content             │    │  │
│  │ [Setting]│  │  │  (max-width varies)       │    │  │
│  │          │  │  │  centered                 │    │  │
│  │          │  │  └──────────────────────────┘    │  │
│  │          │  │                                  │  │
│  │  v1.0    │  │                                  │  │
│  └──────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- **Body:** `overflow: hidden; height: 100vh`
- **Root layout:** `display: flex; height: 100vh`
- **Sidebar:** fixed `56px` width, icon-only, border-right
- **Main:** `flex: 1; overflow: auto; padding: 32px`
- **Navigation:** instant page swap, no transitions between pages (only a subtle `pageEnter` animation on mount)

---

## Screens / Views

### 1. Dashboard (Budgets List)

**Route:** `/` or `dashboard`
**Max width:** `720px`, centered
**Purpose:** Home screen. Shows all budgets as cards.

**Header:**
- Page title: "Budgets" (`.text-page-title`, 24px/600)
- Right: "+ New budget" button (sm, default variant, plus icon in primary-foreground color)
- Gap between title and button: `space-between`
- Margin below header: `28px`

**Budget Cards:**
- Single column, gap `10px`
- Sort order: `active` → `plan` → `review` → `closed`, then by `id` descending within each group
- Closed budgets: `opacity: 0.55`

**Each Budget Card** (`EqCard` hoverable):
- Padding: `14px 18px`
- **Row 1:** Budget name (15px/600, `-0.01em` tracking) + right-aligned status badge(s)
  - If budget is overdue for review: show amber "Needs review" badge before the status badge
- **Row 2:** Date range caption (`text-caption`) + overdue message if applicable
  - Margin below: `14px`
- **Row 3:** Inflow/Outflow amounts + net balance
  - Inflow: green ↑ arrow (11px) + formatted amount in inflow color
  - Outflow: red ↓ arrow (11px) + formatted amount in outflow color
  - Net: right-aligned, `+` prefix if positive, inflow color if positive, destructive color if negative
  - Amounts row gap: `24px`

**"Needs Review" Logic:**
- An `active` budget whose `endDate` has passed is flagged
- Badge: amber tag fill/text, alert icon (13px) + "Needs review" (12px/600)
- Date range shows: "· ended X day(s) ago" in amber text

**Interactions:**
- Click card → navigate to Budget Form
- Click "+ New budget" → create new budget with current month name, status `plan`, navigate to Budget Form

---

### 2. Budget Form (T-Account Layout)

**Route:** `budget/:id`
**Max width:** `800px`, centered
**Purpose:** Core editing screen. T-account layout (inflow left, outflow right).

**Header:**
- Back button: ghost icon (32×32, rounded-8, back arrow)
- Budget name: `.text-page-title`
- Status stepper: clickable status badge → opens lifecycle popover
- Date range caption below, padded left `44px`
- Margin below date: `28px`

**T-Account Columns:**
```
┌──── Inflow ── [+] ────┐ │ ┌──── Outflow ── [+] ───┐
│ Record rows            │ │ │ Record rows             │
│ ┄┄ + new inflow ┄┄    │ │ │ ┄┄ + new outflow ┄┄    │
│ (flex spacer)          │ │ │ (flex spacer)           │
├────────────────────────┤ │ ├─────────────────────────┤
│ Total     Rp X.XXX.XXX│ │ │ Total      Rp X.XXX.XXX│
└────────────────────────┘ │ └─────────────────────────┘
```

- Layout: `display: flex; align-items: stretch`
- Each column: `flex: 1; min-width: 0`
- Center divider: `1px` wide, `hsl(var(--border))`, `align-self: stretch`
- Column gap: configurable via tweaks (default `16px`), split as padding on each side of divider

**Column Header:**
- Dot indicator: `8×8px` circle, column accent color, `opacity: 0.7`
- Label: `13px`, weight `600`, uppercase, `0.06em` letter-spacing, muted-foreground
- Plus button: ghost `icon-sm`, icon in accent color

**Records:** list of `RecordRow` components, gap `2px`

**New Record Placeholder:**
- Dashed border (`1.5px`), full width, centered text "[+ icon] Add {type}"
- Hover: border tints to column color at 0.4 opacity, text becomes column color, background tints at 0.04 opacity

**Column Total:**
- Top border: `1px solid hsl(var(--border))`
- "TOTAL" label: `12px`, weight `500`, uppercase, `0.04em` tracking
- Amount: `15px`, weight `600`, tabular-nums, column accent color

**Balance Bar** (below both columns):
- `EqCard`, margin-top `16px`, padding `16px 20px`
- Label "Balance" in `13px/500` muted-foreground
- Amount: `18px/600`, tabular-nums, `-0.02em` tracking
  - Positive: `+` prefix, inflow color
  - Negative: `−` prefix, destructive color
  - Zero: muted-foreground color
- Progress bar: outflow/inflow ratio
  - Over-budget: destructive color + red glow
- Footer captions: "X% allocated" left, "X% remaining" right (or "X% over budget")

---

### 3. Stats

**Route:** `stats`
**Max width:** `720px`, centered
**Purpose:** Aggregate analytics across all budgets.

**Header:** "Stats" title + right-aligned caption "All-time · N budgets"

**Summary Tiles:** 2-column grid, gap `10px`
- Total inflow tile: inflow color, `+ Rp X.XXX.XXX`
- Total outflow tile: outflow color, `− Rp X.XXX.XXX`
- Each tile: `EqCard`, padding `14px 16px`, caption label + value (17px/600, tabular-nums)

**Inflow vs Outflow Card:**
- Section heading: "Inflow vs Outflow"
- Two stacked horizontal bars (inflow, outflow) against the same max scale
- **Lifecycle segmentation:** each bar is split into segments by budget status, with opacity encoding lifecycle stage:
  - `closed`: opacity `1.0` (realized)
  - `review`: opacity `0.82`
  - `active`: opacity `0.62`
  - `plan`: opacity `0.34` (projected)
- Segments have `1.5px` inset right shadow between them
- Hover a segment → tooltip shows status label + formatted amount
- Legend below bars: colored squares + status labels + explanatory caption

**Total by Tag Card:**
- User-curated tag selection (persisted in localStorage key `eq_statsTags`)
- Default: top 4 outflow spenders
- Tag selector: removable `TagBadge` pills + "Add tag" dropdown
- Horizontal bar chart: tag badge (90px) + bar + amount (100px right-aligned)
  - Bar fill: tag fill color with `1px` border in tag text color at `0.12` opacity
  - Bar track: `hsl(var(--secondary))`
- Top-right: total of selected tags

---

### 4. Tag Manager

**Route:** `tags`
**Max width:** `620px`, centered
**Purpose:** Full CRUD for the tag registry.

**Header:** "Tags" title + "New tag" button (sm)
**Subtitle:** "N tags · rename or recolor a tag to update it everywhere it's used."

**Create Form** (when active):
- `EqCard` with ring-tinted border
- Input (flex 1) + live `TagPreview` pill
- Color picker (10 swatches)
- Cancel / "Create tag" buttons

**Tag List** (`EqCard`):
- Each row: `TagBadge` with dot (150px) + usage count caption (flex 1) + edit button (ghost icon-sm)
- Dividers between rows: `1px solid hsl(var(--border))`, margin `0 18px`

**Edit Mode** (replaces row in-place):
- Background: `hsl(var(--accent) / 0.5)`
- Input + live `TagPreview`
- Color picker
- Bottom: Delete (destructive ghost, with confirm popover) | Cancel + Save

**Validation:**
- Empty name → "Tag name cannot be empty."
- Duplicate name → "A tag named 'X' already exists."

---

### 5. Settings

**Route:** `settings`
**Max width:** `560px`, centered

**Sections:**

1. **Appearance**
   - Dark mode toggle: icon (sun/moon) + label + description + `ThemeSwitch`

2. **Data** (3 rows in one card, separated by dividers)
   - Export to JSON: download icon + label + description + outline button
   - Import from JSON: upload icon + label + description + outline button
   - Copy SQLite file: database icon + label + description + outline button

3. **Danger Zone**
   - Card with `border-color: hsl(var(--destructive) / 0.2)`
   - "Reset all data" + description + destructive button
   - Confirmation: inline "Are you sure?" + Cancel + Confirm buttons

4. **About**
   - App logo (36×36) + "Equilibrium" (15px/600) + version caption
   - Description: "A local-first personal budgeting app. Built with Tauri + Svelte. Your data stays on your machine."

---

## Interactions & Behavior

### Navigation
- Sidebar icon click → instant page swap
- `pageEnter` animation on each page mount: `opacity: 0; translateY(6px)` → settled, `200ms ease-out`
- Current page persisted in localStorage (`eq_page`)

### Record CRUD
- **Add:** Click "+ add" in column or dashed placeholder → new empty record appended, enters edit mode immediately
- **Edit:** Click any record row → expands in-place to edit mode
  - Label input: typing triggers emoji auto-suggestion
  - Amount input: auto-formats with dot separators, only digits allowed
  - Notes: optional text input
  - Tags: inline tag editor (attach/detach/create)
  - Enter → save, Escape → cancel
- **Delete:** Hover record → trash icon appears → click → confirm popover → delete

### Budget Lifecycle
- Status badge clickable → Status Stepper popover
- 4 stages: Plan → Active → Review → Closed
- Any stage can be jumped to (no enforced order)
- Horizontal stepper shows progress visually

### Tag Management (affects all budgets)
- Rename: updates tag key in registry + all record tag arrays
- Recolor: updates color in registry, all badges refresh
- Delete: removes from registry + strips from all record tag arrays
- Create: adds to registry with chosen color

### Theme
- Toggle in Settings
- Persists to localStorage (`eq_theme`)
- Applied via `.dark` class on `<html>` element
- Pre-paint script in `<head>` reads localStorage to prevent flash

### Data Persistence (prototype → production mapping)

| Prototype (localStorage) | Production (SQLite + Rust) |
|---|---|
| `eq_budgets` (JSON) | `budgets` table + `records` table |
| `eq_tagRegistry` (JSON) | `tags` table |
| `eq_page` | Client-side SvelteKit/SPA router state |
| `eq_selectedBudget` | Route parameter |
| `eq_theme` | `preferences` table or OS native preference |
| `eq_statsTags` | `user_preferences` table |

---

## State Management

### Core State
- `budgets: Budget[]` — array of all budgets with nested records
- `page: string` — current active page (`dashboard` | `budget` | `stats` | `tags` | `settings`)
- `selectedBudgetId: number | null` — which budget is open in Budget Form
- `theme: 'light' | 'dark'` — current color scheme

### Tag Registry (global, outside component tree)
- `TAG_REGISTRY: Record<string, ColorKey>` — maps tag names → color keys
- Mutated via helper functions (`registerTag`, `renameTagInRegistry`, `removeTagFromRegistry`, `setTagColor`)
- React components force-refresh via a bump counter

### Derived State
- Budget totals: computed from `budget.records.filter(type).reduce(sum)`
- Tag usage counts: computed by scanning all records across all budgets
- "Needs review": `budget.status === 'active' && endDate < now`
- Stats aggregations: computed from all budgets

---

## Data Model

### Budget
```typescript
interface Budget {
  id: number;
  name: string;           // e.g. "June 2026"
  startDate: string;      // e.g. "Jun 1, 2026"
  endDate: string;        // e.g. "Jun 30, 2026"
  status: 'plan' | 'active' | 'review' | 'closed';
  records: Record[];
}
```

### Record
```typescript
interface Record {
  id: number;
  emoji: string;          // single emoji character
  label: string;          // e.g. "Salary"
  type: 'inflow' | 'outflow';
  amount: number;         // integer, in Rupiah (no decimals)
  tags: string[];         // array of tag names
  notes?: string;         // optional free text
}
```

### Tag (in production DB)
```typescript
interface Tag {
  id: number;
  name: string;           // lowercase, unique
  color: ColorKey;        // one of: red|orange|amber|green|teal|blue|indigo|purple|pink|gray
}
```

### Auto-generated IDs
- Prototype uses an incrementing counter starting at 1000
- Production should use SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`

---

## Responsive Behavior

**Not responsive.** This is a desktop-only Tauri app. Design for:
- Minimum window: `900×600`
- Optimum: `~1200×800`
- No mobile or tablet layouts

The layout is a fixed sidebar + flexible main content area. Content areas use `max-width` to center on wide screens.

---

## Scrolling

- `body` and `#root`: `overflow: hidden; height: 100vh`
- `<main>`: `overflow: auto` (the only scroll container)
- Custom scrollbar: `6px` wide, transparent track, `hsl(var(--border))` thumb with `3px` border-radius

---

## Accessibility Notes

- Focus ring: `2px solid hsl(var(--ring))`, `outline-offset: 2px`
- Toggle switch uses `role="switch"` + `aria-checked`
- All interactive elements are `<button>` elements (keyboard accessible)
- Delete actions require confirmation (popover with Cancel/Delete)

---

## Files in This Package

```
design_handoff_equilibrium/
├── README.md                          ← You are here
├── design_system/
│   ├── TOKENS.md                      ← Complete design token reference
│   ├── TYPOGRAPHY.md                  ← Font stack, type scale, text colors
│   ├── COMPONENTS.md                  ← Component inventory with specs
│   └── ICONS.md                       ← Icon set + emoji system
├── design_files/
│   ├── Equilibrium.html               ← Entry point (open in browser)
│   ├── styles.css                     ← Global tokens + base styles
│   └── components/
│       ├── core.jsx                   ← Data model + UI primitives + Sidebar
│       ├── views.jsx                  ← Dashboard + Tag Manager
│       ├── record-row.jsx             ← Record Row + Emoji Picker + Tag Editor
│       ├── budget-form.jsx            ← Budget Form + Status Stepper
│       └── screens-app.jsx            ← Stats + Settings + App shell
└── reference/
    ├── DESIGN_BRIEF.md                ← Original design brief
    └── PROJECT_PLAN.md                ← Full project plan with phases
```

---

## Implementation Priority

1. **Project setup** — Tauri v2 + Svelte 5 + Tailwind + shadcn-svelte + theme config
2. **Design tokens** — Copy `styles.css` tokens into `tailwind.config.ts` and `app.css`
3. **Rust data layer** — SQLite schema, CRUD commands, tauri-specta bindings
4. **Layout shell** — Sidebar + main content area + routing
5. **Dashboard** — Budget cards, sorting, create new
6. **Budget Form** — T-account layout, record rows, inline editing
7. **Record editing** — Emoji picker, tag editor, amount formatting
8. **Stats** — Summary tiles, stacked bars, tag breakdown
9. **Tag Manager** — CRUD, rename propagation, color picker
10. **Settings** — Theme toggle, data export/import, reset
11. **Polish** — Needs-review detection, page animations, scrollbar, focus states
