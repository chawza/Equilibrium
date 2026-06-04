# Data Model

---

## SQLite Schema

```sql
CREATE TABLE budgets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  start_date TEXT    NOT NULL,  -- e.g. "Jun 1, 2026"
  end_date   TEXT    NOT NULL,  -- e.g. "Jun 30, 2026"
  status     TEXT    NOT NULL DEFAULT 'plan',  -- plan|active|review|closed
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id  INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,  -- inflow|outflow
  emoji      TEXT    NOT NULL DEFAULT '📝',
  label      TEXT    NOT NULL,
  amount     INTEGER NOT NULL DEFAULT 0,  -- whole Rupiah, no decimals
  notes      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL  -- one of: red|orange|amber|green|teal|blue|indigo|purple|pink|gray
  -- No emoji field — emoji lives on records only
);

CREATE TABLE record_tags (
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (record_id, tag_id)
);
```

---

## TypeScript Types

```typescript
type BudgetStatus = 'plan' | 'active' | 'review' | 'closed';
type ColorKey = 'red' | 'orange' | 'amber' | 'green' | 'teal' | 'blue' | 'indigo' | 'purple' | 'pink' | 'gray';
type RecordType = 'inflow' | 'outflow';

interface Budget {
  id: number;
  name: string;
  startDate: string;   // "Jun 1, 2026"
  endDate: string;     // "Jun 30, 2026"
  status: BudgetStatus;
  createdAt: string;
  records: Record[];   // eager-loaded
}

interface Record {
  id: number;
  budgetId: number;
  type: RecordType;
  emoji: string;       // single emoji character
  label: string;
  amount: number;      // integer Rupiah, no decimals
  notes?: string;
  tags: Tag[];         // eager-loaded via record_tags
}

interface Tag {
  id: number;
  name: string;
  color: ColorKey;
  // No emoji field
}
```

---

## IPC Command Surface

All commands go through `tauri-specta`. Types are auto-generated — don't hand-edit bindings.

**Budgets**
```
get_budgets()                                                      → Budget[]
get_budget(id)                                                     → Budget
create_budget(name, start_date, end_date)                          → Budget
update_budget(id, name, start_date, end_date, status)              → Budget
delete_budget(id)
```

**Records**
```
create_record(budget_id, type, emoji, label, amount, notes?)       → Record
update_record(id, emoji, label, amount, notes?)                    → Record
delete_record(id)
```

**Tags**
```
get_tags()                                                         → Tag[]
create_tag(name, color)                                            → Tag
update_tag(id, name, color)                                        → Tag
delete_tag(id)                         -- strips tag from all records
set_record_tags(record_id, tag_ids[])  -- replaces all tags on a record
```

**Data**
```
export_json()     → String   -- full dump
import_json(json)            -- replaces all data
get_db_path()     → String   -- for the "Copy SQLite file" button
reset_all_data()
```

**Emoji**
```
auto_suggest_emoji(label)   → String   -- returns single emoji char
```

---

## Budget Lifecycle

```
plan → active → review → closed
```

Any stage can be jumped to — no enforced order. Users navigate via the Status Stepper popover on the Budget Form.

**"Needs review" detection** (client-side): `status === 'active' && new Date(endDate) < new Date()`. Show amber badge + "ended N day(s) ago" in the date line.
