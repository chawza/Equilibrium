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

**Date-range filter** (below header, margin-bottom 22px):
- "Dates" caption label + two `<input type="date">` pickers (from → to) + "Clear" text button (shown only when active)
- `max` on the start input = current end value; `min` on the end input = current start value
- When active: keeps only budgets whose date range overlaps the filter window (start..end inclusive)
- "No budgets overlap this date range." empty state when filter active and nothing matches

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
- Margin below: 6px then date caption then 28px gap before notes

**Budget notes** (`BudgetNotes`):
Three display states controlled by whether content exists and whether the user has expanded it:
- **Empty:** faint "Add a note" inline button (note icon, 13px muted text). Click → enters edit mode.
- **Collapsed:** single-line summary row — note icon + first line of text (truncated, ellipsis) + chevron-right indicator. Click → expands.
- **Expanded:** left border rail (`2px solid hsl(var(--border))`, `padding-left: 14px`), "NOTES" uppercase label + edit + collapse buttons, rendered markdown content (`click to edit`).
- **Edit mode:** auto-resizing textarea with ring focus shadow, hint text "Markdown · Esc or Save to render", and a Save button (`mousedown` commits to avoid blur race). Esc also commits.
- Supports: `#/##/###` headings, `- / * / +` bullet lists, `1. 2.` ordered lists, `>` blockquote, `**bold**`, `*italic*`, `` `code` ``, `[text](url)` links, `---` separator.

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

**Balance summary** (full-width card, `margin-top: 16px`, `padding: 18px 22px`):
- Headline row: state icon + label + hint, with signed gap amount aligned right.
- States:
  - No records yet: muted plus icon and guidance text.
  - Balanced: inflow-green check icon and `Rp 0` difference.
  - Needs allocating: amber accent and `+ Rp X` unspent amount.
  - Over budget: muted orange accent and `- Rp X` over amount.
- Tuner track: left 44% "Spend more" zone, center 12% balanced target, right 44% "Over budget" zone.
- Needle: centered when balanced, moves left/right by the signed gap relative to inflow or outflow, clamped to the track ends.
- Footer labels: "Spend more", "Balanced", and "Over budget"; active state gets stronger weight and accent color.

**By tag summary** (below the balance summary):
- Section heading "By tag" with inflow/outflow legend.
- One row per tag used in this budget. A multi-tagged record contributes its full amount to each attached tag.
- Untagged records are excluded.
- Empty state: "No tagged records yet." when the budget has records but none carry tags.
- Row layout: `[TagBadge 96px] [inflow amount 96px + bar] [outflow amount 96px + bar]`.
- Rows sort by combined inflow + outflow total descending.

**Status Stepper popover** (280px wide):
- Label "BUDGET LIFECYCLE" (11px, semibold, uppercase)
- Horizontal progress: 4 dots connected by lines (past = blue with check, current = solid blue ring, future = border-only)
- Clickable list of stages with name + description
- Footer: "Stages run in order, but you can jump to any stage."

---

## 3. Stats (`/stats`)

**Max-width:** 720px, centered

Header: "Stats" + right caption "All-time · N budgets"

**Filter card** (always visible, above all charts):

Three filter rows inside a card (`padding: 16px 20px`). Header row: "Filter" label (left) + "Clear all" button (right, only when filter is active).

- **Include row** (`label: "Include"`) — AND-tag filter. Removable `TagBadge` pills + "Add tag" dropdown. Dropdown is guided: only shows tags present on currently-matching records (adding one always keeps at least one match). When ≥2 tags selected, shows caption "records with all N". Empty = no tag filter.
- **Exclude row** (`label: "Exclude"`) — OR-drop filter. `ExcludeChip` pills (strikethrough, muted) + "Hide tag" dropdown. Records carrying ANY excluded tag are removed from the result. Placeholder caption "e.g. hide unconfirmed records" when empty.
- **Type row** (`label: "Type"`) — `RecordTypeToggle` segmented control: All / Inflow / Outflow.

Footer (below a border): live match count — `"X of Y records match · across Z budgets"` when filter is active; `"Y records"` when inactive. Green dot when matches > 0, muted dot when 0.

Filter state persists to `localStorage('eq_statsFilter')` as `{ tagIds: string[], excludeTagIds: string[], recordType: 'all'|'inflow'|'outflow' }`. Replaces the old `eq_statsTags` key on first read.

**Empty state** (when matchCount === 0):
- Centered card with chart icon, "No records match this filter" heading, contextual explanation (adapts to which filter axes are active), "Clear filters" outline button.

**Summary tiles** (2-column grid, gap 10px; only shown when matchCount > 0):
- Total inflow tile: `+Rp X.XXX.XXX` in inflow color (17px/600). Dims to opacity 0.5 when type = 'outflow'.
- Total outflow tile: `−Rp X.XXX.XXX` in outflow color. Dims to opacity 0.5 when type = 'inflow'.

**Inflow vs Outflow card** (only shown when matchCount > 0):
- Title: "Inflow vs Outflow" normally; "Inflow by lifecycle" when type = inflow; "Outflow by lifecycle" when type = outflow.
- Two horizontal bars (inflow row, outflow row). When type filter is set to a single type, only that bar is rendered.
- Each bar segmented by budget status, with opacity encoding lifecycle stage:
  - `closed`: 1.0 — `review`: 0.82 — `active`: 0.62 — `plan`: 0.34
- Segment dividers: 1.5px inset right shadow
- Hover segment → tooltip: status label + formatted amount
- Legend below: colored squares + status labels + caption

**Breakdown by Tag card** (only shown when matchCount > 0):
- Title: "Breakdown by Tag" when no include tags active; "Co-occurring Tags" when include tags are set (included tags are excluded from this chart — they'd be at 100% and add noise).
- Tag count caption top-right.
- Horizontal bar chart per tag: `[TagBadge 90px] [TagSplitBar] [amount 100px]`
- Bar max is the highest single-tag total in the current filtered set.
- Legend adapts to active type filter (hides the irrelevant color swatch).
- Empty state caption when no tags in filtered set.

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

**Max-width:** 560px, centered. 5 sections:

**Appearance**
- Dark mode toggle row: icon (Moon/Sun) + label + description + `ThemeSwitch` (iOS-style 44×26 pill button)

**Data** (one card, rows with dividers)
- Export to CSV (Download icon + outline button) → exports all records as a spreadsheet
- Import from CSV (Upload icon + outline button) → navigates to the `import` page (`ImportCsv`)
- Backup database (Database icon + outline button) → saves a full SQLite snapshot
- Restore database (swap icon + outline button) → replaces all current data with a backup file; confirmation: inline "Overwrite all? [Cancel] [Restore]"

**Help** (one card, rows with dividers)
- App Tour (Book icon + "Show again" outline button) → opens `TourModal`
- Budget Guide (Grid icon + "Show again" outline button) → opens `BudgetGuideModal`
- Keyboard Shortcuts (Keyboard icon + "View" outline button) → opens `KeyboardShortcutDialog`

**Danger Zone** (card with `border-color: hsl(var(--destructive) / 0.2)`)
- "Reset all data" + description + destructive button
- Confirmation: inline replacement — hide the button, show "Are you sure? [Cancel] [Confirm]" — no AlertDialog

**About**
- Logo (36×36) + "Equilibrium" (15px/600) + version caption
- "A local-first personal budgeting app. Built with Tauri + Svelte. Your data stays on your machine."

---

## 6. Import from CSV (`/import`)

Accessed from Settings → "Import from CSV". Sidebar shows `settings` as active.

**Max-width:** 640px, centered

**Header:**
- Ghost back button (icon-sm) + "Import from CSV" page title (24px/600)
- Subtitle: "Upload a CSV of records. Accept or decline each one before adding them to your budgets."

**Drop area** (full-width `<label>` element):
- Dashed border (`1.5px dashed hsl(var(--border))`), `padding: 40px 24px`, center-aligned
- Upload icon (44×44 rounded bg) + heading + caption "Accepts .csv exported from Equilibrium"
- Drag-over state: border → `hsl(var(--ring))`, background → `hsl(var(--accent))`
- Clicking the label triggers hidden `<input type="file" accept=".csv">`

**Template link** (below drop area):
- "Not sure about the format?" caption + "Download template" underline button + Download icon
- Downloads a starter CSV with headers: `emoji, label, type, amount, tags, notes`

**Preview section** (shown after file is loaded):
- Heading "Preview" + caption: `{filename} · N records across M budgets · K declined`
- "Clear" ghost button to reset
- Records grouped by budget — one `EqCard` per budget group:
  - **Group header** (`padding: 12px 16px`, bottom border): grid icon + budget name + badge ("New budget" in primary color or "Add to existing" in default) + date range caption (for new budgets) + "N of M kept" caption right-aligned
  - **Each record row** (`padding: 9px 16px`, dividers between rows):
    - Emoji (16px, fades to 0.4 when declined)
    - Label (13px/500, line-through + muted when declined)
    - Tag badges (flex fill, fades when declined)
    - **Type toggle button:** colored arrow icon (↓ inflow / ↑ outflow) + amount — clicking flips inflow↔outflow; disabled-looking when declined
    - **Accept button:** 26×26 icon button, `check` icon — active = green tint bg + green icon
    - **Decline button:** 26×26 icon button, `x` icon — active = destructive tint bg + red icon
    - Declined rows: light destructive background tint (`hsl(var(--destructive) / 0.05)`)

**Footer actions** (right-aligned):
- "Cancel" outline button → back to settings
- "Import N records" primary button — disabled when accepted count = 0
