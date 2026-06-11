# Equilibrium — Typography

---

## Font Stack

**Primary:** `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

Load via Google Fonts:
```
https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap
```

> **Implementation note:** In the Tauri app, bundle Geist as a local font instead of loading from Google Fonts. The system font fallback stack ensures graceful degradation.

---

## Type Scale

| Role | CSS Class | Font Size | Font Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|---|
| Page title | `.text-page-title` | `24px` | `600` (semibold) | `1.2` | `-0.025em` | "Budgets", "Stats", "Tags", "Settings" |
| Section heading | `.text-section-heading` | `16px` | `600` (semibold) | `1.4` | — | Card section titles, "Inflow vs Outflow" |
| Card title | `.text-card-title` | `14px` | `500` (medium) | `1.4` | — | Record labels |
| Amount | `.text-amount` | `14px` | `500` (medium) | — | `-0.01em` | Currency values (tabular-nums) |
| Caption | `.text-caption` | `12px` | `400` (regular) | — | — | Date ranges, usage counts, help text |
| Badge/Tag | (inline) | `12px` | `500` (medium) | `18px` | — | Tag pills, status badges |
| Budget card name | (inline) | `15px` | `600` (semibold) | — | `-0.01em` | Budget name in card |
| Balance value | (inline) | `18px` | `600` (semibold) | — | `-0.02em` | Balance bar amount |
| Stat tile value | (inline) | `17px` | `600` (semibold) | — | `-0.02em` | Stat summary amounts |
| Column header | (inline) | `13px` | `600` (semibold) | — | `0.06em` | "INFLOW" / "OUTFLOW" (uppercase) |
| Column total label | (inline) | `12px` | `500` (medium) | — | `0.04em` | "TOTAL" (uppercase) |
| Column total value | (inline) | `15px` | `600` (semibold) | — | — | Column total amount |
| Body text | (default) | `14px` | `400`/`500` | — | — | General UI text |
| Sidebar version | (inline) | `10px` | `400` | — | `0.02em` | "v1.0" |
| Tooltip | (inline) | `12px` | `500` | — | — | Sidebar tooltips |

---

## Numeric Formatting

- **`font-variant-numeric: tabular-nums`** — applied to all amount/currency values for column alignment
- **Currency format:** `Rp X.XXX.XXX` — Indonesian Rupiah, no decimals, dot as thousands separator
- **Formatting function:** `'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')`

---

## Text Colors

| Context | Color Token |
|---|---|
| Primary text | `hsl(var(--foreground))` |
| Secondary/caption | `hsl(var(--muted-foreground))` |
| Inflow amounts | `hsl(var(--inflow))` |
| Outflow amounts | `hsl(var(--outflow))` |
| Positive balance | `hsl(var(--inflow))` |
| Negative balance | `hsl(var(--destructive))` |
| Zero balance | `hsl(var(--muted-foreground))` |
| Destructive actions | `hsl(var(--destructive))` |

---

## Text Rendering

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

Applied globally on `body`.

---

## CSS Classes to Implement

```css
.text-page-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.text-section-heading {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.text-card-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.text-amount {
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.text-caption {
  font-size: 12px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}
```
