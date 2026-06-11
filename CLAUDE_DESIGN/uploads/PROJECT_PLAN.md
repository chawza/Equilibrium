# Equilibrium — Project Plan

## Overview
A local-first, simple personal budgeting app. No backend, no accounts — just you and your money.

**Tech Stack:** Tauri v2 + Svelte 5 + TypeScript, Tailwind CSS, shadcn-svelte (design system), native SQLite3 via Rust (`rusqlite`).

---

## Phase 1: Brainstorming ✅
- [x] Define data model (Budget, Record, Tag, RecordTag)
- [x] Resolve naming: **Inflow / Outflow** (not income/outcome)
- [x] Choose database: native SQLite3 via Rust (rusqlite)
- [x] Choose tech stack: Tauri v2 + Svelte 5 + TypeScript + Tailwind
- [x] Icon strategy: emoji-based, predefined set (~30 relevant emojis), auto-picker engine
- [x] IPC strategy: tauri-specta v2 for type-safe Rust ↔ Svelte bindings
- [x] Define budget lifecycle: plan → active → review → closed
- [x] Define screens: Dashboard, Budget Form, Stats, Settings

## Phase 2: Design (in Figma or code mockups)
- [ ] Design system: color palette, typography, spacing scale
- [ ] Tag color system (predefined palette users pick from)
- [ ] Dashboard layout
  - [ ] Budget cards sorted by date relevance
  - [ ] Quick stats (total inflow, total outflow, net)
  - [ ] Status badges (plan/active/review/closed)
- [ ] Budget Form layout
  - [ ] Budget metadata (name, date range)
  - [ ] Record list with inline add/edit
  - [ ] Live summary sidebar (total inflow, outflow, balance)
  - [ ] Tag picker (create-on-the-fly or select existing)
- [ ] Stats/Summary page
  - [ ] Inflow vs Outflow bar chart per budget
  - [ ] Tag breakdown (pie/donut chart)
  - [ ] Trend line across budgets
- [ ] Settings/Profile page
  - [ ] Export data (JSON / SQLite file)
  - [ ] Import data
  - [ ] Reset/clear data

## Phase 3: Development

### 3a. Project Setup
- [ ] Initialize Tauri v2 + Svelte 5 + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Install shadcn-svelte + add components (Card, Badge, Button, Input, Popover, Progress, etc.)
- [ ] Configure shadcn theme: extend with --inflow, --outflow, --status-* tokens
- [ ] Set up Rust backend with rusqlite
- [ ] Create database schema & migration system
- [ ] Set up SvelteKit routing (or svelte-spa-router)
- [ ] Set up tauri-specta v2 (type-safe Rust ↔ Svelte bindings)

### 3b. Rust Data Layer (backend)
- [ ] Database initialization & connection management
- [ ] CRUD commands: Budget
- [ ] CRUD commands: Record
- [ ] CRUD commands: Tag
- [ ] RecordTag linking (add/remove tags from records)
- [ ] Query commands: records by budget, records by tag, budget summaries
- [ ] Export command: dump DB to JSON
- [ ] Import command: load JSON into DB
- [ ] Auto-icon picker: keyword → emoji HashMap with substring matching

### 3c. Svelte Pages & Components (frontend)
- [ ] Layout shell (sidebar nav, page container)
- [ ] Dashboard page
  - [ ] Budget card component
  - [ ] Budget list with sorting (active first, then by date)
  - [ ] Empty state
- [ ] Budget Form page (T-account layout)
  - [ ] Budget metadata header (name, date range, status badge)
  - [ ] Split-column view: inflow (left) / outflow (right)
  - [ ] Record card component (emoji, label, amount, tags)
  - [ ] Inline add/edit record per column
  - [ ] Column subtotals
  - [ ] Tag selector (multi-select, create new)
  - [ ] Emoji picker (predefined grid + auto-suggest from label)
  - [ ] Balance bar (full-width, progress bar, overbudget detection)
- [ ] Stats page
  - [ ] Budget selector
  - [ ] Inflow/Outflow summary chart
  - [ ] Tag breakdown chart
- [ ] Settings page
  - [ ] Export to JSON
  - [ ] Import from JSON
  - [ ] Copy/download raw SQLite file

### 3d. Polish
- [ ] Window chrome & native feel (Tauri window config)
- [ ] Loading & empty states
- [ ] Confirm dialogs for destructive actions
- [ ] Keyboard shortcuts
- [ ] Seed data / onboarding for first-time users

## Phase 4: Testing
- [ ] Unit tests: database CRUD operations
- [ ] Unit tests: summary/calculation logic
- [ ] Component tests: Budget form validation
- [ ] Integration test: full budget lifecycle (create → add records → tag → review → close)
- [ ] Cross-platform testing (macOS, Windows, Linux)
- [ ] Window resize / responsive testing
- [ ] Data export/import round-trip test
- [ ] Edge cases: empty budgets, zero amounts, duplicate tags, long text

---

## Data Model Summary

```
Budget:       id, name, start_date, end_date, status, created_at
Record:       id, budget_id (FK), type (inflow|outflow), label, amount, notes, created_at
Tag:          id, name, color, icon (emoji string)
RecordTag:    record_id (FK), tag_id (FK)
```

## Key Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Naming | Inflow / Outflow | Clear, covers all cases (wages, gifts, transfers) |
| Platform | Tauri v2 | Desktop app, tiny binary, native SQLite, Rust backend |
| Frontend | Svelte 5 + TypeScript | Reactive, minimal boilerplate, fast |
| Database | Native SQLite3 (rusqlite) | Real sqlite3 on disk, accessible via CLI too |
| Design system | shadcn-svelte | Copy-paste components, Bits UI + Tailwind, Figma kit available |
| Icons | Emoji (predefined set) | No dependencies, universal rendering |
| Categories | Tags (not dropdowns) | Flexible, user-defined, queryable, color-coded |
| IPC | tauri-specta v2 | Auto-generated TypeScript bindings from Rust commands |
| Auto-icon | Keyword HashMap | Guesses emoji from record label, user can override |
| Auth | None | Local-first, data lives on disk |
| Export | JSON + SQLite download | Simple backup & portability |
