# Design Handoff — Keyboard Shortcut Help Modal

> **Context:** We're adding keyboard shortcuts to the app and need a help modal to make them discoverable. This is the only new UI surface — everything else in the polish phase (emoji backend, empty states) has no design impact.

---

## What You're Designing

A single new component: **KeyboardShortcutDialog** — a modal overlay that lists all available keyboard shortcuts, grouped by category.

### How It Opens

- User presses `?` (when not typing in an input) or `Cmd/Ctrl+/`
- Dismissed with `Escape` or clicking the backdrop

### Reference Points

- **Precedent:** Gmail, GitHub, Slack, Figma all use `?` to open a similar modal
- **Existing design system:** Follow `docs/design-system.md` — zinc neutral palette, Geist font, quiet UI tone
- **Existing Dialog usage:** Use shadcn `Dialog` component (already installed per `docs/components.md`)

---

## Content — Three Groups

The modal displays these shortcuts, grouped:

### Navigation

| Action | macOS | Windows / Linux |
|---|---|---|
| Budgets | `⌘ 1` | `Ctrl+1` |
| Stats | `⌘ 2` | `Ctrl+2` |
| Tags | `⌘ 3` | `Ctrl+3` |
| Settings | `⌘ ,` | `Ctrl+,` |

### Actions

| Action | macOS | Windows / Linux | Where |
|---|---|---|---|
| New budget | `⌘ N` | `Ctrl+N` | Budgets page |
| New tag | `⌘ N` | `Ctrl+N` | Tags page |
| Go back | `Esc` | `Esc` | Budget form |

### Editing

| Action | Key | Where |
|---|---|---|
| Save | `Enter` | Record / tag edit |
| Cancel | `Esc` | Record / tag edit |

> The modal should detect the user's OS and show only the relevant modifier key column (⌘ on macOS, Ctrl on Windows/Linux) — not both side by side.

---

## Design Constraints

- **Width:** ~480px (consistent with Status Stepper popover scale, but wider since it has more content)
- **Max height:** Scrollable if needed, but current content fits without scrolling
- **Header:** "Keyboard Shortcuts" — use `text-section-heading` (16px/600)
- **Group headers:** Category labels ("Navigation", "Actions", "Editing") — use `text-caption` styling (12px/400, muted-foreground), uppercase, with spacing above
- **Key rendering:** Each key combo in `<kbd>` styled pills — `bg-secondary`, `border border-border`, `rounded-md`, `px-1.5 py-0.5`, `text-xs`, `font-mono`. Multiple keys separated by a visual gap (not "+" text)
- **Action labels:** `text-card-title` (14px/500)
- **Layout:** Two columns per row — action label left-aligned, key combo right-aligned
- **Footer:** None — keep it clean
- **Close button:** Standard Dialog close (X) in top-right corner
- **No search:** Not needed for 10 shortcuts. Keep it scannable at a glance

### Dark Mode

Must work in both themes. The `<kbd>` pills should be clearly visible in both — `bg-secondary` + `border` handles this automatically with the existing token system.

---

## Sidebar Tooltip Update

One small addition: sidebar navigation icon tooltips should now include the shortcut hint.

**Current:** `"Budgets"`
**Updated:** `"Budgets ⌘1"` (or `"Budgets Ctrl+1"` on Windows/Linux)

Same for Stats (`⌘2`), Tags (`⌘3`), Settings (`⌘,`).

No visual redesign needed — just append the shortcut text to the existing tooltip string.

---

## What's NOT in Scope for Design

These were decided but have no visual design impact:

- **Emoji suggestion backend** — moving from client-side JS to Rust IPC. Same UI behavior, different engine underneath. No design changes.
- **Empty states** — shipping as-is for v1.0. No refinement needed.

---

## Deliverable

Add the keyboard shortcut help modal to the interactive prototype (`design_handoff_equilibrium/design_files/Equilibrium.html`) or provide a standalone mockup. Either way, show:

1. Light mode appearance
2. Dark mode appearance
3. The `<kbd>` pill styling at actual size
