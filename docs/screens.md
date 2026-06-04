# Screens

5 screens total. All are full-height pages inside the sidebar shell. Content is centered with `max-width` per screen.

Open `design_handoff_equilibrium/design_files/Equilibrium.html` in a browser for interactive reference.

---

## Layout Shell

```
body (overflow: hidden, height: 100vh)
└── #root (display: flex, height: 100vh)
    ├── <aside> sidebar — 56px fixed, full height, border-right
    │     logo (34px rounded square)
    │     nav icons (38×38 ghost buttons, gap 2px)
    │     spacer (flex: 1)
    │     version label ("v1.0", 10px, muted, 0.6 opacity)
    └── <main> — flex: 1, overflow: auto, padding: 32px
          page content
```

**Sidebar nav:**
| Route | Icon | Tooltip |
|---|---|---|
| `/` | `LayoutGrid` | Budgets |
| `/stats` | `BarChart3` | Stats |
| `/tags` | `Tag` | Tags |
| `/settings` | `Settings` | Settings |

Active state: `bg-secondary` + `text-foreground` + 3×16px left bar indicator (`border-radius: 2px`, `bg-foreground`, positioned −9px from the button's left edge).

---

## 1. Dashboard (`/`)

**Max-width:** 720px, centered

Header: "Budgets" page title + "New budget" button (sm, default variant, Plus icon) aligned right.

Budget cards in a single column, gap `10px`. Sort order: `active → plan → review → closed`, then by `id DESC` within each group. Closed cards: `opacity: 0.55`.

**Each budget card** (hoverable, padding `14px 18px`):
- Row 1: budget name (15px/600, -0.01em) + right-aligned status badges
- Row 2: date range caption — if overdue: "· ended X day(s) ago" in amber
- Row 3 (margin-top 14px): inflow ↑ amount (green) + outflow ↓ amount (red) + net balance right-aligned

**"Needs review" badge:** shown before the status badge when `status === 'active'` and past `endDate`. Uses amber tag colors + alert icon.

**Interactions:**
- Click card → `/budget/:id`
- "New budget" → `create_budget` with current month name + first/last of month → navigate to form

---

## 2. Budget Form (`/budget/:id`)

**Max-width:** 800px, centered

**Header:**
- `ChevronLeft` ghost button (32×32, rounded-8) → back
- Budget name (`text-page-title`, inline-editable)
- Status badge (clickable → opens **Status Stepper popover**)
- Date range caption below, `padding-left: 44px` (aligns past the back button)
- Margin below: 28px

**T-Account layout:**
```
[── Inflow ── [+] ──────] | [── Outflow ── [+] ─────]
  record rows               record rows
  ┄┄ + Add inflow ┄┄        ┄┄ + Add outflow ┄┄
  (flex spacer)             (flex spacer)
  ─────────────────         ──────────────────
  TOTAL   Rp X.XXX          TOTAL   Rp X.XXX
```

- `display: flex; align-items: stretch`
- Center divider: `1px solid hsl(var(--border))`
- Each column: `flex: 1; min-width: 0; padding: 0 8px`

**Column header:** 8×8 dot (accent color, 0.7 opacity) + uppercase label (13px/600, 0.06em) + `+` ghost button (icon-sm, accent color)

**Dashed "Add" placeholder:**
- `border: 1.5px dashed hsl(var(--border))`, centered "[Plus] Add inflow/outflow"
- Hover: border → column accent at 0.4 opacity, text → accent, bg → accent at 0.04 opacity

**Column total:** `border-top: 1px solid hsl(var(--border))` + "TOTAL" label (12px/500, uppercase) + amount (15px/600, column accent color)

**Balance bar** (full-width card, `margin-top: 16px`, `padding: 16px 20px`):
- "Balance" label + amount (18px/600, tabular-nums)
  - Positive: `+` prefix, inflow color
  - Negative: `−` prefix, destructive color
  - Zero: muted-foreground
- Progress bar: `outflow / inflow × 100`
  - Over-budget: destructive color + red glow, does not cap at 100%
- Footer: "X% allocated" left + "X% remaining" or "X% over budget" right

**Status Stepper popover** (280px wide):
- Label "BUDGET LIFECYCLE" (11px, semibold, uppercase)
- Horizontal progress: 4 dots connected by lines (past = blue with check, current = solid blue ring, future = border-only)
- Clickable list of stages with name + description
- Footer: "Stages run in order, but you can jump to any stage."

---

## 3. Stats (`/stats`)

**Max-width:** 720px, centered

Header: "Stats" + right caption "All-time · N budgets"

**Summary tiles** (2-column grid, gap 10px):
- Total inflow tile: `+Rp X.XXX.XXX` in inflow color (17px/600)
- Total outflow tile: `−Rp X.XXX.XXX` in outflow color

**Inflow vs Outflow card:**
- Two horizontal bars (inflow row, outflow row) against the same max scale
- Each bar segmented by budget status, with opacity encoding lifecycle stage:
  - `closed`: 1.0 — `review`: 0.82 — `active`: 0.62 — `plan`: 0.34
- Segment dividers: 1.5px inset right shadow
- Hover segment → tooltip: status label + formatted amount
- Legend below: colored squares + status labels + caption

**Total by Tag card:**
- User selects which tags to display (persisted in `localStorage('eq_statsTags')`)
- Default: top 4 outflow spenders
- Tag selector: removable TagBadge pills + "Add tag" dropdown
- Horizontal bar chart per tag: `[tag badge 90px] [bar] [amount 100px]`
  - Bar fill: tag fill color, 1px border in tag text color at 0.12 opacity
  - Track: `hsl(var(--secondary))`
- Top-right: sum of selected tags

---

## 4. Tag Manager (`/tags`)

**Max-width:** 620px, centered

Header: "Tags" + "New tag" button (sm). Subtitle: "N tags · rename or recolor a tag to update it everywhere it's used."

**Create form** (collapsible card, ring-tinted border when open):
- Text input (flex 1) + live tag preview pill
- Color picker (10 swatches, 24×24, dot colors)
- Cancel + "Create tag" buttons

**Tag list** (single card):
- Each row: TagBadge (min-width 150px) + usage count (flex 1) + edit button (ghost icon-sm)
- Row dividers: `1px solid hsl(var(--border))`, `margin: 0 18px`

**Edit mode** (replaces row in-place):
- Background: `hsl(var(--accent) / 0.5)`
- Input + live preview + color picker
- Footer: Delete (destructive ghost + confirm popover) | Cancel + Save

**Validation:**
- Empty name → "Tag name cannot be empty."
- Duplicate name → "A tag named 'X' already exists."

Changes must propagate immediately across all budgets and records.

---

## 5. Settings (`/settings`)

**Max-width:** 560px, centered. 4 sections:

**Appearance**
- Dark mode toggle row: icon (Moon/Sun) + label + description + ThemeSwitch

**Data** (one card, rows with dividers)
- Export to JSON (Download icon + outline button)
- Import from JSON (Upload icon + outline button)
- Copy SQLite file (Database icon + outline button → `get_db_path()`)

**Danger Zone** (card with `border-color: hsl(var(--destructive) / 0.2)`)
- "Reset all data" + description + destructive button
- Confirmation: inline replacement — hide the button, show "Are you sure? [Cancel] [Confirm]" — no AlertDialog

**About**
- Logo (36×36) + "Equilibrium" (15px/600) + version caption
- "A local-first personal budgeting app. Built with Tauri + Svelte. Your data stays on your machine."
