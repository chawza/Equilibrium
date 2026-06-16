# Design System

The design follows one principle: **quiet UI, loud data.** The interface is neutral and recedes. Color comes from tag badges and amount values — not from the chrome. Borders are subtle, surfaces are clean, whitespace is generous.

Base theme: **zinc-inspired neutral palette** (slightly cool gray). Extended with budget-specific tokens for inflow, outflow, and status colors.

---

## CSS Tokens

Copy these verbatim into `app.css`. All color tokens are HSL channel triplets consumed via `hsl(var(--token))`.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;

  /* Budget-specific */
  --inflow: 142 76% 36%;
  --inflow-foreground: 0 0% 100%;
  --outflow: 0 72% 51%;
  --outflow-foreground: 0 0% 100%;

  /* Status reference tokens (used in stepper, not in badges — see Status Badges below) */
  --status-plan: 38 92% 50%;
  --status-active: 217 91% 60%;
  --status-review: 263 70% 50%;
  --status-closed: 220 9% 46%;

  --sidebar-width: 56px;
}

.dark {
  --background: 240 10% 4.5%;
  --foreground: 0 0% 96%;
  --card: 240 8% 7.5%;
  --card-foreground: 0 0% 96%;
  --popover: 240 8% 8.5%;
  --popover-foreground: 0 0% 96%;
  --primary: 0 0% 96%;
  --primary-foreground: 240 6% 10%;
  --secondary: 240 5% 16%;
  --secondary-foreground: 0 0% 96%;
  --muted: 240 5% 15%;
  --muted-foreground: 240 5% 62%;
  --accent: 240 5% 19%;
  --accent-foreground: 0 0% 96%;
  --destructive: 0 62% 52%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5% 18%;
  --input: 240 5% 20%;
  --ring: 240 5% 70%;

  --inflow: 142 64% 47%;
  --inflow-foreground: 0 0% 100%;
  --outflow: 0 72% 60%;
  --outflow-foreground: 0 0% 100%;
}
```

---

## Typography

Font: **Geist** (bundle locally, not CDN). Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`.

Apply globally: `-webkit-font-smoothing: antialiased`.

| Role | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Page title | 24px | 600 | -0.025em | `text-page-title` class |
| Section heading | 16px | 600 | — | `text-section-heading` |
| Card title / record label | 14px | 500 | — | `text-card-title` |
| Amount | 14px | 500 | -0.01em | `text-amount`, tabular-nums |
| Caption / date | 12px | 400 | — | `text-caption`, muted-foreground |
| Badge / tag pill | 12px | 500 | — | 18px line-height |
| Budget card name | 15px | 600 | -0.01em | — |
| Balance value | 18px | 600 | -0.02em | — |
| Stat tile value | 17px | 600 | -0.02em | — |
| Column header ("INFLOW") | 13px | 600 | 0.06em | uppercase |
| Column total label ("TOTAL") | 12px | 500 | 0.04em | uppercase |
| Column total amount | 15px | 600 | — | tabular-nums |
| Sidebar version | 10px | 400 | 0.02em | 0.6 opacity |

**Currency:** `Rp X.XXX.XXX` — no decimals, dot as thousands separator.
```
'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
```

**Design decision:** IDR (Indonesian Rupiah) is the only supported currency for v1.0.0. Multi-currency support is not planned for v1. There is no currency selector in Settings. This is an explicit scope constraint, not an oversight.

---

## Status Badge Colors

Badges use a **unified blue-hue lifecycle palette** — not the multi-color `--status-*` tokens. Apply via inline styles or a lookup map.

| Status | Light bg | Light fg | Dark bg | Dark fg |
|---|---|---|---|---|
| plan | `#EFF4FE` | `#3B6FD4` | `#172541` | `#9CBAF6` |
| active | `#DBE7FB` | `#1E47A8` | `#1C3158` | `#B4CDF8` |
| review | `#C5D8F7` | `#1A3A86` | `#243C66` | `#CADCFB` |
| closed | `#EEF1F6` | `#7A879C` | `#27292F` | `#9BA5B3` |

"Needs review" badge (overdue active budget) uses the **amber tag colors** — same fill/text as the `amber` tag color, with an alert icon.

---

## Tag Color System

10 predefined colors. Users pick one per tag. Tags display as soft-fill pills with a colored dot indicator.

| Key | Light fill | Light text | Dark fill | Dark text | Dot (both) |
|---|---|---|---|---|---|
| red | `#FEE2E2` | `#991B1B` | `#3A1E1E` | `#F7A8A8` | `#DC2626` |
| orange | `#FFEDD5` | `#9A3412` | `#3A2615` | `#FBBF8F` | `#EA580C` |
| amber | `#FEF3C7` | `#92400E` | `#392E12` | `#F8D27A` | `#D97706` |
| green | `#DCFCE7` | `#166534` | `#14301E` | `#86E5A6` | `#16A34A` |
| teal | `#CCFBF1` | `#115E59` | `#103230` | `#5FE3D0` | `#0D9488` |
| blue | `#DBEAFE` | `#1E40AF` | `#15294A` | `#9AC0F7` | `#2563EB` |
| indigo | `#E0E7FF` | `#3730A3` | `#1E2150` | `#ABB6F8` | `#4F46E5` |
| purple | `#F3E8FF` | `#6B21A8` | `#281B3E` | `#D6B0F2` | `#9333EA` |
| pink | `#FCE7F3` | `#9D174D` | `#3A1B2B` | `#F4A6CE` | `#DB2777` |
| gray | `#F3F4F6` | `#374151` | `#26272B` | `#CBD2DC` | `#6B7280` |

---

## App Logo

34×34 rounded square, background `hsl(var(--foreground))`.

```svg
<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
  <path d="M2 12h20M12 2v20" stroke="hsl(var(--background))" stroke-width="2" stroke-linecap="round"/>
  <circle cx="6" cy="8" r="2" fill="#16A34A" />
  <circle cx="18" cy="16" r="2" fill="#DC2626" />
</svg>
```

Cross shape = balance. Green dot upper-left = inflow. Red dot lower-right = outflow.

---

## Dark Mode

Theme toggled in Settings, persisted in `localStorage('eq_theme')`, applied via `.dark` on `<html>`.

**Critical:** place this script in `<head>` before any JS loads to prevent flash:

```html
<script>
  (function() {
    var t = localStorage.getItem('eq_theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

---

## Spacing & Layout

- Main content padding: `32px`
- Max widths: `720px` (Dashboard, Stats, Tags), `800px` (Budget Form), `560px` (Settings)
- Sidebar: `56px` fixed, full height, `border-right`
- Body + root: `overflow: hidden; height: 100vh`
- Main: `flex: 1; overflow: auto`
- Custom scrollbar: `6px` wide, transparent track, `hsl(var(--border))` thumb

---

## Shadows & Transitions

| Context | Value |
|---|---|
| Popover | `0 4px 16px rgba(0,0,0,0.08)` |
| Status stepper | `0 8px 24px rgba(0,0,0,0.12)` |
| Over-budget glow | `0 0 8px hsl(var(--destructive) / 0.4)` |
| Card hover | `0 1px 3px hsl(var(--foreground) / 0.04)` |

Page mount animation: `opacity: 0; translateY(6px)` → settled, `200ms ease-out` (CSS class `page-enter`).
