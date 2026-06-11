# Equilibrium — Icons

The app uses two icon systems: **custom SVG line icons** for UI chrome, and **emoji** for user-facing record/tag decoration.

---

## UI Icons (SVG Line Icons)

All UI icons are rendered as inline SVGs at a `24×24` viewBox. Default size is `18px`, stroke-based (no fills except where noted), `strokeWidth="1.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

| Icon Name | Usage | Notes |
|---|---|---|
| `home` | Sidebar: Budgets nav | 3 rectangles (grid layout) |
| `chart` | Sidebar: Stats nav | 3 vertical bars |
| `tag` | Sidebar: Tags nav | Tag/label shape with circle |
| `settings` | Sidebar: Settings nav | Gear/cog |
| `plus` | Add buttons, new record | Cross shape |
| `back` | Budget form back button | Left chevron |
| `trash` | Delete record/tag | Trash can |
| `edit` | Edit tag button | Pencil |
| `check` | Save, color picker selected | Checkmark (strokeWidth 2) |
| `x` | Cancel, remove tag | × cross |
| `download` | Export data | Arrow down + tray |
| `upload` | Import data | Arrow up + tray |
| `database` | Copy SQLite file | Cylinder/database |
| `alert` | Needs review badge | Triangle with exclamation |
| `sun` | Light theme indicator | Circle + rays |
| `moon` | Dark theme indicator | Crescent |

### Implementation

In shadcn-svelte, use `lucide-svelte` icons — these are the same icon family. Map as follows:

| Prototype Icon | Lucide Equivalent |
|---|---|
| `home` | `LayoutGrid` or `Columns` |
| `chart` | `BarChart3` |
| `tag` | `Tag` |
| `settings` | `Settings` |
| `plus` | `Plus` |
| `back` | `ChevronLeft` |
| `trash` | `Trash2` |
| `edit` | `Pencil` |
| `check` | `Check` |
| `x` | `X` |
| `download` | `Download` |
| `upload` | `Upload` |
| `database` | `Database` |
| `alert` | `AlertTriangle` |
| `sun` | `Sun` |
| `moon` | `Moon` |

---

## App Logo

The logo is a `34×34` rounded square with `foreground` background color, containing a custom SVG:

```svg
<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
  <path d="M2 12h20M12 2v20" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round"/>
  <circle cx="6" cy="8" r="2" fill="hsl(142 76% 36%)" />   <!-- green: inflow -->
  <circle cx="18" cy="16" r="2" fill="hsl(0 72% 51%)" />    <!-- red: outflow -->
</svg>
```

Visual: a plus/cross shape (representing balance) with a green dot (inflow) upper-left and red dot (outflow) lower-right.

---

## Emoji System

Records use emoji as visual identifiers. The user picks from a predefined set of 29 emoji, or an auto-suggestion engine guesses from the record label.

### Predefined Emoji Set

```
💼 🏠 🛒 💰 ⚡ 🎁 📈 🍕 🚗 💊 🎓 🏋️ 🎮 📱 🛍️ ✈️ 🐾 👶 🎬 🔧 🎵 👔 🌐 📦 🧾 💵 🏦 📝 💡
```

### Auto-Suggestion Keywords

The engine maps substrings in the record label to an emoji. Matches are case-insensitive and use `String.includes()`:

| Keywords | Emoji |
|---|---|
| salary, wage, gaji | 💼 |
| rent, housing, sewa, kos | 🏠 |
| grocery, groceries, belanja | 🛒 |
| electric, electricity, listrik, utility | ⚡ |
| saving, emergency, tabungan | 💰 |
| gift, birthday, hadiah | 🎁 |
| dividend, stock, investment, investasi | 📈 |
| eating, eat, restaurant, makan | 🍕 |
| transport, car, fuel, gas | 🚗 |
| health, medicine, doctor, obat | 💊 |
| education, school, course | 🎓 |
| fitness, gym | 🏋️ |
| entertainment, game | 🎮 |
| phone | 📱 |
| internet, wifi | 🌐 |
| shopping, clothes | 🛍️ / 👔 |
| travel, vacation | ✈️ |
| pet, pets | 🐾 |
| child, children, baby | 👶 |
| streaming, netflix, movie | 🎬 |
| maintenance, repair | 🔧 |
| subscription, music | 🎵 |
| delivery | 📦 |
| bill, bills | 🧾 |
| bonus | 💵 |
| interest, bank | 🏦 |

**Fallback:** `📝` (general/memo)

> **Bilingual keywords:** the engine includes Indonesian translations (gaji, sewa, kos, belanja, listrik, tabungan, hadiah, investasi, makan, obat) to support the target user base.
