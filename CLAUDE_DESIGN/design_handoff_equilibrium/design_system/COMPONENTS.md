# Equilibrium — Component Inventory

Every UI component used in the prototype, mapped to its shadcn-svelte equivalent. Use this to know exactly which shadcn components to install and how to customize them.

---

## Primitive Components

### 1. Card (`EqCard`)

**shadcn-svelte:** `Card`

```
┌─────────────────────────────────────┐
│  Content area                       │
└─────────────────────────────────────┘
```

**Styles:**
- Background: `hsl(var(--card))`
- Border: `1px solid hsl(var(--border))`
- Border radius: `var(--radius)` (8px)
- Overflow: `hidden`

**Variants:**
- `hoverable` — on hover: border lightens to `hsl(var(--muted-foreground) / 0.3)`, shadow `0 1px 3px hsl(var(--foreground) / 0.04)`
- `dimmed` — `opacity: 0.55` (used for closed budgets)

---

### 2. Button (`EqButton`)

**shadcn-svelte:** `Button`

**Variants:**

| Variant | Background | Text Color | Border |
|---|---|---|---|
| `default` | `hsl(var(--primary))` | `hsl(var(--primary-foreground))` | none |
| `secondary` | `hsl(var(--secondary))` | `hsl(var(--secondary-foreground))` | none |
| `outline` | transparent | `hsl(var(--foreground))` | `1px solid hsl(var(--border))` |
| `ghost` | transparent | `hsl(var(--foreground))` | none |
| `destructive` | `hsl(var(--destructive))` | `hsl(var(--destructive-foreground))` | none |

**Sizes:**

| Size | Padding | Font Size | Height | Border Radius |
|---|---|---|---|---|
| `sm` | `4px 10px` | `12px` | `28px` | `6px` |
| `md` | `6px 14px` | `14px` | `34px` | `var(--radius)` |
| `lg` | `8px 18px` | `14px` | `40px` | `var(--radius)` |
| `icon` | `0` | `14px` | `32×32` | `6px` |
| `icon-sm` | `0` | `12px` | `26×26` | `6px` |

**Shared properties:**
- Font weight: `500`
- Layout: `inline-flex`, `align-items: center`, `justify-content: center`, `gap: 6px`
- Hover: `opacity: 0.85`
- Disabled: `opacity: 0.5`, `cursor: not-allowed`

---

### 3. Badge (`EqBadge`)

**shadcn-svelte:** `Badge`

**Base styles:**
- Layout: `inline-flex`, `align-items: center`, `gap: 4px`
- Padding: `2px 8px`
- Border radius: `9999px` (full pill)
- Font: `12px`, weight `500`, `line-height: 18px`
- White-space: `nowrap`

**Specialized badges:**

#### TagBadge
- Resolves color from tag registry
- Background: tag fill color
- Text: tag text color
- Optional dot indicator (6×6 circle, solid tag dot color)
- Optional remove button (15×15 circle, × icon)

#### StatusBadge
- Uses single-hue blue lifecycle palette (see TOKENS.md)
- Background + foreground from `STATUS_BADGE_LIGHT` / `STATUS_BADGE_DARK`

#### NeedsReviewBadge
- Uses amber tag color
- Shows alert icon + "Needs review" text
- Font weight: `600`
- Padding: `2px 8px 2px 6px`

---

### 4. Input (`EqInput`)

**shadcn-svelte:** `Input`

**Styles:**
- Height: `34px`
- Padding: `0 10px` (or `0 10px 0 32px` with prefix)
- Font: `14px`, inherit family
- Border: `1px solid hsl(var(--input))`
- Border radius: `var(--radius)`
- Background: `hsl(var(--background))`
- Color: `hsl(var(--foreground))`

**States:**
- Focus: border color → `hsl(var(--ring))`
- Blur: border color → `hsl(var(--input))`

**Props:**
- `prefix` — left-aligned label (e.g., "Rp"), absolutely positioned, `13px` muted foreground
- `align` — text alignment (`left` default, `right` for amounts)

---

### 5. Progress Bar (`EqProgress`)

**shadcn-svelte:** `Progress`

**Track:** height `6px`, border-radius `3px`, background `hsl(var(--secondary))`

**Fill:** same height/radius, animated width (`transition: width 0.4s ease`)

**Color logic:**
- Over-budget (value > max): `hsl(var(--destructive))` + glow `0 0 8px hsl(var(--destructive) / 0.4)`
- Inflow variant: `hsl(var(--inflow))`
- Default: `hsl(var(--primary))`

---

### 6. Tooltip

**shadcn-svelte:** `Tooltip`

**Position:** to the right of the trigger, vertically centered

**Styles:**
- Background: `hsl(var(--foreground))`
- Text: `hsl(var(--background))`
- Font: `12px`, weight `500`
- Padding: `4px 10px`
- Border radius: `6px`
- Shadow: `0 2px 8px rgba(0,0,0,0.15)`
- Offset: `8px` from trigger

---

### 7. Dropdown

**shadcn-svelte:** `DropdownMenu`

**Container:**
- Background: `hsl(var(--popover))`
- Border: `1px solid hsl(var(--border))`
- Border radius: `var(--radius)`
- Shadow: `0 4px 16px rgba(0,0,0,0.08)`
- Padding: `4px`
- Min width: `140px`

**Items:**
- Padding: `6px 10px`
- Font: `13px`
- Border radius: `4px`
- Hover: background `hsl(var(--accent))`
- Destructive items: color `hsl(var(--destructive))`

---

### 8. Confirm Popover

**shadcn-svelte:** `AlertDialog` (or custom `Popover`)

**Position:** above trigger, right-aligned

**Styles:**
- Width: `200px`
- Padding: `12px 14px`
- Background/border/shadow: same as Dropdown
- Message: `13px`
- Actions: flex row, right-aligned, gap `6px`
- Buttons: Cancel (ghost sm) + Delete (destructive sm)

---

### 9. Toggle Switch (`ThemeSwitch`)

**shadcn-svelte:** `Switch`

**Track:** `44×26px`, border-radius `13px`, no border

**States:**
- Off: background `hsl(var(--secondary))`
- On: background `hsl(var(--primary))`

**Thumb:** `20×20px`, circle, shadow `0 1px 3px rgba(0,0,0,0.25)`
- Off: background `hsl(var(--background))`
- On: background `hsl(var(--primary-foreground))`

**Transition:** `180ms ease`

---

## Composite Components

### 10. Sidebar

**Layout:** Vertical strip, `56px` wide, full viewport height

**Structure:**
```
┌──────┐
│ Logo │  34×34, rounded-8, bg: foreground
├──────┤  gap: 20px below logo
│  🏠  │  38×38 icon buttons, rounded-8
│  📊  │
│  🏷️  │
│  ⚙️  │  gap: 2px between items
│      │
│ (flex│
│  1)  │
│      │
│ v1.0 │  10px, muted, 0.6 opacity
└──────┘
```

**Active indicator:** 3×16px bar, `border-radius: 2px`, positioned `-9px` left of button, `foreground` color

**Nav items:**
| ID | Icon | Label |
|---|---|---|
| `dashboard` | `home` | Budgets |
| `stats` | `chart` | Stats |
| `tags` | `tag` | Tags |
| `settings` | `settings` | Settings |

**Icon states:**
- Default: `hsl(var(--muted-foreground))`
- Hover: background `hsl(var(--accent))`
- Active: background `hsl(var(--secondary))`, color `hsl(var(--foreground))`, left bar indicator

---

### 11. Record Row

Two modes: **view** and **edit** (inline).

#### View Mode
```
┌────────────────────────────────────────┐
│ 💼  Salary                 Rp 8.500.000│
│     Apartment, due on the 1st          │  ← notes (optional)
│     [wage] [monthly]                   │  ← tags (optional)
└────────────────────────────────────────┘
```

- Background: transparent → `hsl(var(--accent))` on hover
- Border: transparent → `hsl(var(--border))` on hover
- Padding: `8px 12px`
- Emoji: `16px`, width `22px`
- Label: `.text-card-title` (14px/500)
- Amount: `.text-amount`, colored by type
- Notes: `12px`, muted-foreground, padded-left `30px`
- Tags: gap `4px`, padded-left `30px`
- Delete button: ghost icon-sm, appears on hover (opacity 0→1)
- Click anywhere → enters edit mode

#### Edit Mode
```
┌─ ring border ──────────────────────────┐
│ [😀] [Label input        ] [Rp amount ]│
│ [Notes input                          ]│
│ [tag][tag] [+ tag]      [✕] [✓]       │
└────────────────────────────────────────┘
```

- Border: `1px solid hsl(var(--ring))` + box-shadow `0 0 0 2px hsl(var(--ring) / 0.08)`
- Background: `hsl(var(--card))`
- Row 1: emoji picker button (32×32) + label input (flex 1) + amount input (140px, prefix "Rp", right-aligned)
- Row 2: notes text input (full width, 30px height, padded-left 40px)
- Row 3: tag editor + cancel/save buttons
- Enter → save, Escape → cancel

---

### 12. Tag Editor (inline)

Appears within Record Row edit mode.

**Attached tags:** displayed as `TagBadge` pills with remove (×) buttons

**Add button:** dashed-border pill `[+ tag]`
- Triggers a dropdown with search input + tag list
- Typing filters existing tags
- If no match, shows "Create & attach" with color picker

---

### 13. Emoji Picker

**shadcn-svelte:** `Popover` + grid

**Container:** `220px` wide, padding `10px`

**Sections:**
1. **Suggested** — auto-detected from label text, single large button (34×34)
2. **Grid** — 6 columns, 32×32 buttons, gap `3px`

**Selection:** `ring-2 ring-ring` + accent background

**29 predefined emoji:** `💼🏠🛒💰⚡🎁📈🍕🚗💊🎓🏋️🎮📱🛍️✈️🐾👶🎬🔧🎵👔🌐📦🧾💵🏦📝💡`

---

### 14. Status Stepper

**Trigger:** clicking the status badge on Budget Form opens a popover

**Popover:** `280px` wide

**Content:**
1. Section label: "BUDGET LIFECYCLE" (11px, semibold, uppercase, 0.06em spacing)
2. Horizontal progress: 4 dots connected by lines
   - Past: tinted blue dot with check icon, blue line
   - Current: solid blue dot (`#2563EB`) with white center, ring `rgba(37,99,235,0.18)`
   - Future: border-only dot, neutral line
3. Clickable list: each status with number/check, label, description
4. Footer note: "Stages run in order, but you can jump to any stage."

**Status flow:** `plan` → `active` → `review` → `closed`

---

### 15. Color Picker (Tag Manager)

Row of 10 circular swatches, `24×24px`, gap `7px`.

- Uses solid `TAG_DOT` colors
- Selected: `outline: 2px solid hsl(var(--foreground))`, `outline-offset: 2px`, check icon (white, 13px)
- Unselected: `outline: 2px solid transparent`

---

### 16. Toast

**Position:** fixed, bottom `24px`, horizontally centered

**Styles:**
- Background: `hsl(var(--foreground))`
- Text: `hsl(var(--background))`
- Font: `13px`, weight `500`
- Padding: `8px 16px`
- Border radius: `8px`
- Shadow: `0 4px 16px rgba(0,0,0,0.15)`
- Entry: `pageEnter` animation (200ms)
- Auto-dismiss: `2200ms`

> **Implementation:** use `sonner` (shadcn-svelte's toast library) instead of a custom toast.
