# Design Spec Addendum: Adjustment Record Indicator (`is_adjustment`)

Status: not in prototype — this spec fills the gap noted in CLAUDE.md ("amber pill on records where `is_adjustment === true`"). Supersedes the "pill" description below with a card-level treatment.

## What it is

When a record is added to a budget that's in "needs review" state (`status === 'active' && endDate < today`), it's flagged `is_adjustment = true`. This marks it as a late addition made after the budget period technically ended — useful for spotting after-the-fact corrections during review.

## Visual treatment

**No pill. Use a colored left border on the record row card instead** — consistent with the row's existing card shape, doesn't compete with tag pills already living in the row.

```css
border-left: 3px solid #D97706;
```

- Color: `#D97706` — the amber **dot** color from the tag system (design-system.md, "Dot (both)" column). Identical in light and dark mode, so **no theme branching needed**. It already has sufficient contrast against both card backgrounds (`hsl(0 0% 100%)` light / `hsl(240 8% 7.5%)` dark).
- Width: `3px`, solid, flush to the card's left edge (replaces the row's default `1px solid transparent` border on that side only — or layer it via `border-left` override, whichever is cleaner in the component's existing border setup).
- Applies in **all row states**: view, hover, and edit mode. The flag is immutable, so the indicator should never disappear or change as the user interacts with the row.

## Layout reference

```
│▌ 🏦 Salary                    Rp 5.000.000
│   note text if present…
│   #tag1  #tag2
```

(`▌` = the 3px amber left border)

## Where it does NOT apply

- Dashboard "Needs review" badge — already fully designed and implemented in the prototype (`NeedsReviewBadge` in `views.jsx`): amber pill, alert icon, "Needs review" label, shown next to the status badge, plus "· ended X days ago" caption in amber.
- Records on budgets that are not in "needs review" state — never show the border, regardless of past flag state (flag is immutable but only ever set on records created during a "needs review" window).

## Implementation notes for the dev

- `is_adjustment` is set once at `create_record` time by comparing the budget's `end_date` to today — never recalculated afterward.
- DB: add `is_adjustment INTEGER NOT NULL DEFAULT 0` (boolean) to the `records` table schema.
- Frontend: read the flag from the record object and conditionally apply the border style — no derived/computed logic needed at render time.
