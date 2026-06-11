# Equilibrium — Design Brief

A starting document for Phase 2 design work. Use this as a reference when designing screens in Figma / Claude Design.

---

## Product summary

A local-first, desktop personal budgeting app built with Tauri. The user creates monthly budgets, adds inflow/outflow records, tags them, and reviews spending over time. No accounts, no cloud — data lives as a SQLite file on disk.

## Design system: shadcn-svelte

We use **shadcn-svelte** as the foundation — a copy-paste component library built on Bits UI (headless accessible primitives) + Tailwind CSS. Components are owned in-project, not installed as a package dependency.

**Figma kit:** https://www.figma.com/community/file/1203061493325953101/shadcn-ui-design-system
**Docs:** https://www.shadcn-svelte.com/docs
**Figma with variables & Tailwind classes:** https://www.figma.com/community/file/1342715840824755935

## Design principles

1. **Quiet UI, loud data** — the interface is neutral and recedes. Color comes from tags and amounts, not from the chrome.
2. **Flat and clean** — shadcn-svelte's default aesthetic: subtle borders, soft radius, generous whitespace.
3. **Dense but scannable** — budget records are compact rows, but spacing and typography create clear hierarchy.
4. **Local and trustworthy** — the app should feel solid and private, like a well-made notebook.

## Target platform

Desktop app via Tauri (macOS, Windows, Linux). Design for a minimum window size of 900×600, optimum ~1200×800. No mobile.

---

## Color system (shadcn-svelte theming)

shadcn-svelte uses CSS variables in HSL format. We extend the default theme with budget-specific tokens.

### Base theme (CSS variables)

These are shadcn-svelte's built-in tokens. We use the "zinc" base (neutral, clean):

```css
:root {
  --background: 0 0% 100%;          /* white */
  --foreground: 240 10% 3.9%;       /* near black */
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;          /* dark neutral */
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;      /* light gray surface */
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;     /* red */
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}
```

### Custom budget tokens (extending shadcn theme)

These are app-specific additions layered on top:

```css
:root {
  /* Inflow / Outflow */
  --inflow: 142 76% 36%;            /* green-600: #16A34A */
  --inflow-foreground: 0 0% 100%;
  --outflow: 0 72% 51%;             /* red-600: #DC2626 */
  --outflow-foreground: 0 0% 100%;

  /* Budget status */
  --status-plan: 38 92% 50%;        /* amber-600: #D97706 */
  --status-active: 217 91% 60%;     /* blue-600: #2563EB */
  --status-review: 263 70% 50%;     /* violet-600: #7C3AED */
  --status-closed: 220 9% 46%;      /* gray-500: #6B7280 */
}
```

### Tag color palette

Users pick from 10 predefined colors when creating a tag. Each has a soft fill and a dark text variant for the Badge component:

| Name | Fill (bg) | Text | Example usage |
|---|---|---|---|
| Red | #FEE2E2 | #991B1B | obligation, urgent |
| Orange | #FFEDD5 | #9A3412 | utilities |
| Amber | #FEF3C7 | #92400E | grocery, food |
| Green | #DCFCE7 | #166534 | saving, investment |
| Teal | #CCFBF1 | #115E59 | health, wellness |
| Blue | #DBEAFE | #1E40AF | monthly, recurring |
| Indigo | #E0E7FF | #3730A3 | education |
| Purple | #F3E8FF | #6B21A8 | entertainment |
| Pink | #FCE7F3 | #9D174D | gift, personal |
| Gray | #F3F4F6 | #374151 | misc, uncategorized |

These are implemented as custom Badge variants, not part of the core shadcn theme.

---

## Typography

shadcn-svelte uses Tailwind's default type scale with system font stack. We follow it:

| Element | Tailwind class | Size | Weight |
|---|---|---|---|
| Page title | `text-2xl font-semibold` | 24px | 600 |
| Section heading | `text-base font-semibold` | 16px | 600 |
| Card title | `text-sm font-medium` | 14px | 500 |
| Record label | `text-sm` | 14px | 400 |
| Amount | `text-sm font-medium` | 14px | 500 |
| Tag pill (Badge) | `text-xs font-medium` | 12px | 500 |
| Status badge | `text-xs font-medium` | 12px | 500 |
| Caption/date | `text-xs text-muted-foreground` | 12px | 400 |

---

## Spacing and layout

Tailwind's default spacing scale (4px base): 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px, 10=40px, 12=48px

### Layout structure

Uses shadcn-svelte's **Sidebar** component for the nav shell.

```
┌──────────────────────────────────────────┐
│  Sidebar (220px)  │  Main content area   │
│                   │                      │
│  ┌─────────────┐  │                      │
│  │ App logo    │  │                      │
│  ├─────────────┤  │                      │
│  │ Dashboard   │  │                      │
│  │ Stats       │  │                      │
│  │ Settings    │  │                      │
│  ├─────────────┤  │                      │
│  │             │  │                      │
│  │ (spacer)    │  │                      │
│  │             │  │                      │
│  │ Version     │  │                      │
│  └─────────────┘  │                      │
└──────────────────────────────────────────┘
```

- Sidebar: shadcn `Sidebar` component (collapsible, fixed ~220px)
- Main content: flexible width, `--background` color, `p-8` padding
- Max content width inside main: 800px (centered for wide screens)

---

## Components — shadcn-svelte mapping

Each UI element maps to a shadcn-svelte component (or a thin wrapper around one).

### Budget card → `Card`

Appears on the Dashboard. One card per budget.

```
┌──────────────────────────────────────────┐
│  June 2026                [active]       │
│  Jun 1 – Jun 30                          │
│                                          │
│  ↑ Rp 8.500.000   ↓ Rp 6.200.000       │
│                         net +2.300.000   │
└──────────────────────────────────────────┘
```

- Uses `Card` + `CardHeader` + `CardContent` with `hover:border-border/80 transition-colors`
- Status: `Badge` with custom variant (plan=amber, active=blue, review=violet, closed=gray)
- Amounts: `text-[hsl(var(--inflow))]` / `text-[hsl(var(--outflow))]`
- Sorting: active → plan → review → closed, then by date desc. Closed: `opacity-60`.

### Record row → `Card` (compact)

Appears in the T-account columns. One per record.

```
┌──────────────────────────────────────────┐
│  💼  Salary            +8.500.000        │
│      [wage] [monthly]                    │
└──────────────────────────────────────────┘
```

- Compact `Card` with `p-2.5 px-3`
- Emoji (16px) + label (`text-sm font-medium`)
- Amount: `text-sm font-medium`, colored by column
- Tags: `Badge` with custom tag color variant
- Hover: reveal edit/delete `Button` icons via `group-hover`

### Tag pill → `Badge` (custom variant)

```
[ 🛒 grocery ]
```

- `Badge` with `variant="outline"` customized per tag color
- Background + text from tag color palette table
- `rounded-full` for pill shape

### Status badge → `Badge`

```
[ active ]
```

- `Badge` with custom variant per status (plan, active, review, closed)
- Each maps to `--status-plan`, `--status-active`, etc.

### Amount input → `InputGroup` + `Input` + `Select`

```
┌─────────────────────────────────┐
│  [Inflow ▾]  Rp  |  8.500.000  │
└─────────────────────────────────┘
```

- shadcn `Select` for inflow/outflow toggle (left, color changes)
- shadcn `Input` for amount (right-aligned, numeric)
- Wrapped in `InputGroup` for joined appearance
- Currency prefix ("Rp") as addon

### Emoji picker → `Popover` + custom grid

```
┌──────────────────────────────────┐
│  Suggested: 🛒  (from "grocery") │
│  ─────────────────────────────── │
│  💼 🏠 🛒 💰 🚗 ⚡ 🎁 📈 🏥 ☕  │
│  🎓 🏋️ 🎮 📱 🛍️ ✈️ 🐾 👶 📝 💡  │
│  🍕 🎬 💊 🧾 🏦 📦 🔧 🎵 👔 🌐  │
└──────────────────────────────────┘
```

- shadcn `Popover` as container
- Top: auto-suggested emoji from Rust keyword engine (highlighted with `ring-2 ring-ring`)
- Grid: CSS grid of `Button` variants, 6 per row
- Selected: `ring-2 ring-ring`

### Balance bar → `Card` + `Progress`

Spans full width below both T-account columns.

```
┌──────────────────────────────────────────────────────┐
│  Balance                              + Rp 3.200.000 │
│  [████████████████████████████░░░░░░░░░░░░░░░░░░░░]  │
│  63% of inflow allocated                37% remaining │
└──────────────────────────────────────────────────────┘
```

- `Card` wrapper
- Amount: `text-lg font-medium`, `text-[hsl(var(--inflow))]` if positive, `text-destructive` if negative
- shadcn `Progress` component for the bar
- When overbudget: `Progress` fill uses `--destructive`
- Purpose: positive = spending headroom, negative = overbudget for retrospection

### Empty state → `Empty`

When a page has no data. shadcn-svelte has an `Empty` component.

```
┌──────────────────────────────────┐
│                                  │
│         📋                       │
│                                  │
│   No budgets yet                 │
│   Create your first monthly      │
│   budget to get started.         │
│                                  │
│   [ + New budget ]               │
│                                  │
└──────────────────────────────────┘
```

- `Empty` with emoji illustration, heading, description, and CTA `Button`

### Additional components

| App element | shadcn-svelte component |
|---|---|
| App shell | `Sidebar` + layout |
| Budget card | `Card` + `Badge` |
| Record row | `Card` (compact) + `Badge` |
| Tag pill | `Badge` (custom variant) |
| Status badge | `Badge` (custom variant) |
| Amount input | `InputGroup` + `Input` + `Select` |
| Emoji picker | `Popover` + grid of `Button` |
| Tag selector | `Combobox` (multi-select) |
| Balance bar | `Card` + `Progress` |
| Date range | `DatePicker` / `RangeCalendar` |
| Budget name | `Input` |
| Empty states | `Empty` + `Button` |
| Delete confirm | `AlertDialog` |
| Status change | `DropdownMenu` |
| Context menu | `ContextMenu` |
| Toast feedback | `Sonner` |
| Stats charts | `Chart` (LayerChart) |

---

## Screens

### 1. Dashboard

The home screen. Shows all budgets as cards.

**Layout:**
- Page title: "Budgets" with a "+ New budget" button on the right
- Budget cards in a single-column list, full width (up to max 800px)
- Cards sorted: active → plan → review → closed (then by date desc within each group)
- Closed budgets dimmed

**Interactions:**
- Click card → navigate to Budget Form (edit mode)
- Click "+ New budget" → navigate to Budget Form (create mode)
- Right-click card → context menu: duplicate, delete, change status

### 2. Budget Form (T-account layout)

The core screen for creating/editing a budget. Uses a split-column "T-account" layout — inflow on the left, outflow on the right — inspired by classic bookkeeping ledgers.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  ← Back       June 2026                    [active]  │
│  Name: [ June 2026          ]  Jun 1 – Jun 30       │
│                                                      │
│  ┌─── Inflow ──── [+] ─┐  ┌─── Outflow ── [+] ──┐  │
│  │                      │  │                      │  │
│  │ 💼 Salary  8.500.000 │  │ 🏠 Rent    2.500.000 │  │
│  │   [wage] [monthly]   │  │   [obligation]       │  │
│  │                      │  │                      │  │
│  │ 📈 Dividend  150.000 │  │ 🛒 Grocery 1.200.000 │  │
│  │   [investment]       │  │   [grocery] [weekly]  │  │
│  │                      │  │                      │  │
│  │ ┄┄ + new inflow ┄┄  │  │ ⚡ Electric  350.000  │  │
│  │                      │  │   [utility]           │  │
│  │                      │  │                      │  │
│  │                      │  │ 💰 Saving  1.000.000  │  │
│  │                      │  │   [saving]            │  │
│  │                      │  │                      │  │
│  │                      │  │ 🍕 Eat out   400.000  │  │
│  │                      │  │   [dining] [weekly]   │  │
│  │                      │  │                      │  │
│  │                      │  │ ┄┄ + new outflow ┄┄  │  │
│  ├──────────────────────┤  ├──────────────────────┤  │
│  │ Total    8.650.000   │  │ Total    5.450.000   │  │
│  └──────────────────────┘  └──────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ Balance                        + Rp 3.200.000    ││
│  │ [████████████████████████░░░░░░░░░░░░░░░░░░░░░]  ││
│  │ 63% allocated                    37% remaining   ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**Key design rules:**
- Two equal-width columns: left = inflow (green header), right = outflow (red header)
- Each column has its own "+ add" button and dashed "new record" placeholder at the bottom
- Each column shows its own subtotal at the bottom
- Columns grow independently — if outflow has more records, the left column just has whitespace (intentional: it visually shows the imbalance)
- Below both columns: the balance bar spans full width

**Balance bar behavior:**
- Positive balance (inflow > outflow): green amount, bar shows % allocated, remaining % is empty. This means spending headroom is left.
- Negative balance (outflow > inflow): red amount, bar fills 100% + red overflow glow. This is overbudget — a signal for self-retrospection.
- Zero balance: neutral color, bar is fully filled.

**Interactions:**
- Inline record editing: click a record row to expand into edit mode
- Each column has its own "+ add" — new records are automatically typed as inflow or outflow based on which column
- Typing a label triggers auto-icon suggestion
- Summary and balance bar update live as records change
- Status can be changed via the badge (dropdown)
- Drag records between columns to reclassify (stretch goal)

### 3. Stats

Analytics across budgets.

**Layout:**
- Top: budget selector (dropdown or horizontal scroll of budget pills)
- Section 1: Inflow vs Outflow bar chart (side-by-side bars per budget)
- Section 2: Tag breakdown (horizontal bar chart or donut showing spend per tag, colored by tag color)
- Section 3: Trend line across multiple budgets (net balance over time)

**Notes for design:**
- Keep charts simple — no 3D, no animations, flat fills with the tag/semantic colors
- Charts should use the tag color palette so the visual language is consistent
- If no data, show empty state

### 4. Settings

Data management and app preferences.

**Layout:**
- Section: Data
  - Export to JSON (button)
  - Import from JSON (button + file picker)
  - Copy SQLite file (button, copies the raw .db file)
- Section: Danger zone
  - Reset all data (button, red, with confirmation dialog)
- Section: About
  - App version
  - "Built with Tauri + Svelte"

---

## Iconography

The app uses emoji exclusively for icons on records and tags. The predefined emoji set:

**Inflow:**
💼 salary/wage, 🎁 gift received, 💵 bonus, 📈 investment return, 🏦 bank interest

**Outflow:**
🏠 rent/housing, 🛒 grocery, 🚗 car/transport, ⚡ utilities, 💊 health, 🎓 education, 🏋️ fitness, 🎮 entertainment, 📱 tech/phone, 🛍️ shopping, ✈️ travel, 🐾 pets, 👶 children, 🍕 dining out, 🎬 media/streaming, 🔧 maintenance, 🎵 subscriptions, 👔 clothing

**Neutral:**
💰 saving, 📝 general/fallback, 💡 ideas/misc, 🧾 bills, 📦 delivery, 🌐 internet

---

## Interaction patterns

**Navigation:** sidebar click switches the main content area. No page transitions, instant swap.

**Adding a record:** click "+ add" in either column → empty row appears at bottom of that column in edit mode → record type (inflow/outflow) is auto-set by which column → user types label → auto-icon appears → user sets amount → optionally picks tags → press Enter or click away to save.

**Editing a record:** click a row → it expands in-place to show editable fields → edit → click away or Enter to save.

**Deleting:** hover a record → trash icon appears → click → confirmation popover ("Delete this record?") → confirm.

**Status change:** click the status badge on a budget → dropdown with 4 options → select → immediate change.

---

## Sample data for mockups

Use this data when designing screens:

**Budget: June 2026** (status: active)

| Emoji | Label | Type | Amount | Tags |
|---|---|---|---|---|
| 💼 | Salary | inflow | 8.500.000 | wage, monthly |
| 🏠 | Rent | outflow | 2.500.000 | obligation, monthly |
| 🛒 | Groceries | outflow | 1.200.000 | grocery, weekly |
| ⚡ | Electricity | outflow | 350.000 | utility, monthly |
| 💰 | Emergency fund | outflow | 1.000.000 | saving |
| 🎁 | Mom's birthday | outflow | 250.000 | gift |
| 📈 | Stock dividend | inflow | 150.000 | investment |
| 🍕 | Eating out | outflow | 400.000 | dining, weekly |

**Budget: July 2026** (status: plan)

| Emoji | Label | Type | Amount | Tags |
|---|---|---|---|---|
| 💼 | Salary | inflow | 8.500.000 | wage, monthly |
| 🏠 | Rent | outflow | 2.500.000 | obligation, monthly |
| 🛒 | Groceries | outflow | 1.000.000 | grocery, weekly |
| ⚡ | Electricity | outflow | 350.000 | utility, monthly |
| 💰 | Emergency fund | outflow | 1.500.000 | saving |

**Budget: May 2026** (status: closed)

Same shape as June but dimmed in the UI.

---

## Notes for the designer

- Currency is Indonesian Rupiah (Rp), no decimal places, use dot as thousands separator (e.g., Rp 8.500.000)
- App name: **Equilibrium**
- Dark mode is a future consideration, not in v1 — but keep color tokens abstracted so it's easy to add later
- Window title bar: use Tauri's default native title bar, no custom chrome
- Sidebar should feel like a desktop app nav (VS Code, Notion, etc.), not a mobile hamburger menu
