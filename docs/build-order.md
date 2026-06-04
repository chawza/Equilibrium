# Build Order

Build in this sequence — each step produces a runnable app. Don't skip ahead.

1. **Project scaffold** — `create-tauri-app`, Svelte 5, TypeScript, Tailwind v4
2. **Design tokens** — paste `styles.css` into `app.css`, pre-paint theme script into `app.html <head>`
3. **SQLite schema** — `rusqlite` setup, schema migrations, DB init on app start
4. **Rust IPC layer** — all CRUD commands, `tauri-specta` bindings generation
5. **Layout shell** — Sidebar + `<main>`, routing, `page-enter` animation
6. **Dashboard** — budget cards, sort logic, "New budget" action, "Needs review" detection
7. **Budget Form shell** — header (back + name + status badge), T-account columns, balance bar (static data first)
8. **Record Row** — view mode + edit mode, Enter/Escape handling
9. **Emoji picker** — predefined grid + auto-suggest via Rust command
10. **Tag system** — `TagBadge`, `TagEditor`, inline create-and-attach from record edit mode
11. **Status Stepper** — popover with visual progress + stage list
12. **Tag Manager** — full CRUD, rename/recolor propagation across all records
13. **Stats** — summary tiles, lifecycle-segmented bars, tag breakdown
14. **Settings** — theme toggle, export/import/copy DB, inline reset confirmation, about
15. **Polish** — sonner toasts for all mutations, empty states, focus rings, custom scrollbar, keyboard shortcuts
