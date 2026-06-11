# Equilibrium — Design Tokens

Complete reference of every design token used in the prototype. Map these to your Tailwind/shadcn-svelte config.

---

## Base Theme (shadcn-svelte "zinc")

All color tokens are stored as HSL channel triplets (`H S% L%`) and consumed via `hsl(var(--token))`. This is the standard shadcn-svelte convention.

### Light Mode (`:root`)

| Token | HSL Value | Hex Approx. | Usage |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page background |
| `--foreground` | `240 10% 3.9%` | `#09090B` | Primary text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card surfaces |
| `--card-foreground` | `240 10% 3.9%` | `#09090B` | Card text |
| `--popover` | `0 0% 100%` | `#FFFFFF` | Popover/dropdown bg |
| `--popover-foreground` | `240 10% 3.9%` | `#09090B` | Popover text |
| `--primary` | `240 5.9% 10%` | `#18181B` | Primary buttons, active elements |
| `--primary-foreground` | `0 0% 98%` | `#FAFAFA` | Text on primary |
| `--secondary` | `240 4.8% 95.9%` | `#F4F4F5` | Secondary surfaces, progress track |
| `--secondary-foreground` | `240 5.9% 10%` | `#18181B` | Text on secondary |
| `--muted` | `240 4.8% 95.9%` | `#F4F4F5` | Muted backgrounds |
| `--muted-foreground` | `240 3.8% 46.1%` | `#71717A` | Captions, secondary text |
| `--accent` | `240 4.8% 95.9%` | `#F4F4F5` | Hover/active states |
| `--accent-foreground` | `240 5.9% 10%` | `#18181B` | Text on accent |
| `--destructive` | `0 84.2% 60.2%` | `#EF4444` | Delete, over-budget |
| `--destructive-foreground` | `0 0% 98%` | `#FAFAFA` | Text on destructive |
| `--border` | `240 5.9% 90%` | `#E4E4E7` | Borders, dividers |
| `--input` | `240 5.9% 90%` | `#E4E4E7` | Input borders |
| `--ring` | `240 5.9% 10%` | `#18181B` | Focus rings |
| `--radius` | `0.5rem` | `8px` | Default border-radius |

### Dark Mode (`.dark`)

| Token | HSL Value | Hex Approx. | Usage |
|---|---|---|---|
| `--background` | `240 10% 4.5%` | `#0C0C0F` | Page background |
| `--foreground` | `0 0% 96%` | `#F5F5F5` | Primary text |
| `--card` | `240 8% 7.5%` | `#121215` | Card surfaces |
| `--card-foreground` | `0 0% 96%` | `#F5F5F5` | Card text |
| `--popover` | `240 8% 8.5%` | `#141417` | Popover/dropdown bg |
| `--popover-foreground` | `0 0% 96%` | `#F5F5F5` | Popover text |
| `--primary` | `0 0% 96%` | `#F5F5F5` | Primary buttons (inverted) |
| `--primary-foreground` | `240 6% 10%` | `#181819` | Text on primary |
| `--secondary` | `240 5% 16%` | `#262629` | Secondary surfaces |
| `--secondary-foreground` | `0 0% 96%` | `#F5F5F5` | Text on secondary |
| `--muted` | `240 5% 15%` | `#242426` | Muted backgrounds |
| `--muted-foreground` | `240 5% 62%` | `#9C9CA0` | Captions, secondary text |
| `--accent` | `240 5% 19%` | `#2E2E32` | Hover/active states |
| `--accent-foreground` | `0 0% 96%` | `#F5F5F5` | Text on accent |
| `--destructive` | `0 62% 52%` | `#D03535` | Delete, over-budget |
| `--destructive-foreground` | `0 0% 98%` | `#FAFAFA` | Text on destructive |
| `--border` | `240 5% 18%` | `#2C2C30` | Borders, dividers |
| `--input` | `240 5% 20%` | `#303034` | Input borders |
| `--ring` | `240 5% 70%` | `#B0B0B8` | Focus rings |

---

## App-Specific Semantic Tokens

### Inflow / Outflow

| Token | Light HSL | Light Hex | Dark HSL | Dark Hex |
|---|---|---|---|---|
| `--inflow` | `142 76% 36%` | `#16A34A` | `142 64% 47%` | `#22C55E` |
| `--inflow-foreground` | `0 0% 100%` | `#FFFFFF` | `0 0% 100%` | `#FFFFFF` |
| `--outflow` | `0 72% 51%` | `#DC2626` | `0 72% 60%` | `#EF4444` |
| `--outflow-foreground` | `0 0% 100%` | `#FFFFFF` | `0 0% 100%` | `#FFFFFF` |

### Budget Status (CSS tokens — used for reference, not for badges)

| Token | HSL | Hex |
|---|---|---|
| `--status-plan` | `38 92% 50%` | `#D97706` |
| `--status-active` | `217 91% 60%` | `#2563EB` |
| `--status-review` | `263 70% 50%` | `#7C3AED` |
| `--status-closed` | `220 9% 46%` | `#6B7280` |

### Status Badge Colors (single-hue blue lifecycle)

The prototype uses a unified blue-hue system for status badges (not the multi-color `--status-*` tokens above). This is the implemented approach:

**Light mode:**

| Status | Background | Foreground |
|---|---|---|
| Plan | `#EFF4FE` | `#3B6FD4` |
| Active | `#DBE7FB` | `#1E47A8` |
| Review | `#C5D8F7` | `#1A3A86` |
| Closed | `#EEF1F6` | `#7A879C` |

**Dark mode:**

| Status | Background | Foreground |
|---|---|---|
| Plan | `#172541` | `#9CBAF6` |
| Active | `#1C3158` | `#B4CDF8` |
| Review | `#243C66` | `#CADCFB` |
| Closed | `#27292F` | `#9BA5B3` |

---

## Tag Color System

10 predefined colors. Users select one when creating/editing tags.

### Light Mode

| Color Key | Fill (bg) | Text | Dot (solid) |
|---|---|---|---|
| `red` | `#FEE2E2` | `#991B1B` | `#DC2626` |
| `orange` | `#FFEDD5` | `#9A3412` | `#EA580C` |
| `amber` | `#FEF3C7` | `#92400E` | `#D97706` |
| `green` | `#DCFCE7` | `#166534` | `#16A34A` |
| `teal` | `#CCFBF1` | `#115E59` | `#0D9488` |
| `blue` | `#DBEAFE` | `#1E40AF` | `#2563EB` |
| `indigo` | `#E0E7FF` | `#3730A3` | `#4F46E5` |
| `purple` | `#F3E8FF` | `#6B21A8` | `#9333EA` |
| `pink` | `#FCE7F3` | `#9D174D` | `#DB2777` |
| `gray` | `#F3F4F6` | `#374151` | `#6B7280` |

### Dark Mode

| Color Key | Fill (bg) | Text |
|---|---|---|
| `red` | `#3A1E1E` | `#F7A8A8` |
| `orange` | `#3A2615` | `#FBBF8F` |
| `amber` | `#392E12` | `#F8D27A` |
| `green` | `#14301E` | `#86E5A6` |
| `teal` | `#103230` | `#5FE3D0` |
| `blue` | `#15294A` | `#9AC0F7` |
| `indigo` | `#1E2150` | `#ABB6F8` |
| `purple` | `#281B3E` | `#D6B0F2` |
| `pink` | `#3A1B2B` | `#F4A6CE` |
| `gray` | `#26272B` | `#CBD2DC` |

> The "dot" color (solid swatch, used in legends and color pickers) is shared between light and dark modes.

---

## Layout Constants

| Token | Value | Usage |
|---|---|---|
| `--sidebar-width` | `56px` | Icon-only sidebar width |
| `--radius` | `0.5rem` (8px) | Default border radius |
| Main content padding | `32px` | `padding: 32px` on `<main>` |
| Max content width | `720px` (Dashboard, Stats, Tags) / `800px` (Budget Form) / `560px` (Settings) | `max-width` on page containers |

---

## Spacing Scale

Follows Tailwind's 4px base system:

| Tailwind | Pixels | Common usage |
|---|---|---|
| `1` | `4px` | Tight inner gaps |
| `1.5` | `6px` | Button gap, record row gap |
| `2` | `8px` | Small gaps, tag gaps |
| `2.5` | `10px` | Card inner padding, column header margin |
| `3` | `12px` | Section heading margins |
| `3.5` | `14px` | Card padding, section spacing |
| `4` | `16px` | Standard section gap |
| `5` | `20px` | Section bottom margin |
| `6` | `24px` | Amount row gap |
| `7` | `28px` | Page title bottom margin |
| `8` | `32px` | Main content padding |

---

## Shadows

| Context | Value |
|---|---|
| Popover/dropdown | `0 4px 16px rgba(0,0,0,0.08)` |
| Confirm popover | `0 4px 16px rgba(0,0,0,0.1)` |
| Status stepper | `0 8px 24px rgba(0,0,0,0.12)` |
| Tooltip | `0 2px 8px rgba(0,0,0,0.15)` |
| Card hover | `0 1px 3px hsl(var(--foreground) / 0.04)` |
| Toggle thumb | `0 1px 3px rgba(0,0,0,0.25)` |
| Toast | `0 4px 16px rgba(0,0,0,0.15)` |
| Over-budget glow | `0 0 8px hsl(var(--destructive) / 0.4)` |

---

## Transitions

| Property | Duration | Easing | Context |
|---|---|---|---|
| `background` | `120ms` | default | Button hover, row hover |
| `border-color` | `150ms` | default | Card hover, input focus |
| `opacity` | `120ms` | default | Hover reveals, disabled states |
| `color` | `120ms` | default | Nav icon active/inactive |
| `width` | `400ms` | `ease` | Progress bar fill |
| `outline-color` | `120ms` | default | Color picker swatch selection |
| Page enter animation | `200ms` | `ease-out` | `translateY(6px)` + `opacity: 0` → settled |
| Theme toggle bg | `180ms` | `ease` | Toggle switch |
