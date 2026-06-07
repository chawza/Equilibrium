# Equilibrium Coding Guidelines

## No single-character variable names

Every named binding must be self-documenting. Single-character names make code harder to search, harder to read at a glance, and harder to refactor safely.

**Rule:** All of the following must use descriptive names — no single-character identifiers:
- `let` / `const` / `var` bindings
- Function and method parameters
- Closure parameters (including iterator callbacks)
- Loop variables (`for x in`, `for (x, y) in`)
- Struct destructuring targets

```ts
// ❌ bad
const b = budgetsStore.current;
this.list.filter((b) => b.id !== id);
b.records.reduce((s, r) => s + r.amount, 0);

// ✅ good
const budget = budgetsStore.current;
this.list.filter((budget) => budget.id !== id);
budget.records.reduce((sum, record) => sum + record.amount, 0);
```

```rust
// ❌ bad
let b = create_budget(&conn, ...)?;
let r = create_record(&conn, b.id, ...)?;
for t in &snapshot.tags { ... }
for (a, b) in after.iter().zip(original.iter()) { ... }

// ✅ good
let budget = create_budget(&conn, ...)?;
let record = create_record(&conn, budget.id, ...)?;
for tag in &snapshot.tags { ... }
for (actual, expected) in after.iter().zip(original.iter()) { ... }
```

### Accepted exceptions

| Context | Allowed | Reason |
|---|---|---|
| Rust error mapping | `\|e\| e.to_string()` | Universal convention; `e` is the only thing in scope |
| Svelte `catch (e)` | `catch (e)` | JS convention for error-only catch blocks |
| Sort comparators | `(a, b) => a.name.localeCompare(b.name)` | Standard sort signature; `a`/`b` are unambiguous |

Everything else uses a real name. When in doubt, prefer clarity over brevity.

## Naming conventions

### Rust
| Kind | Convention | Example |
|---|---|---|
| Variables / bindings | `snake_case` | `budget_entry`, `record_type` |
| Test helper functions | `snake_case`, imperative | `make_budget`, `fresh_conn` |
| Test data bindings | Domain noun | `budget`, `record`, `tag`, `tag1`, `tag2` |

### TypeScript / Svelte
| Kind | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `budgetEntry`, `recordType` |
| Component state | `camelCase` | `normalizedQuery`, `inflowCounts` |
| Callback params | Domain noun | `budget`, `record`, `tag`, `entry` |

## Applies to tests too

Tests are first-class code. Single-character names in test bodies are just as confusing as in production code — they give no indication of what a value represents when a test fails.

```rust
// ❌ bad
let b = make_budget(&conn);
let r = create_record(&conn, b.id, "inflow", ...);
assert_eq!(r.amount, 5_000_000);

// ✅ good
let budget = make_budget(&conn);
let record = create_record(&conn, budget.id, "inflow", ...);
assert_eq!(record.amount, 5_000_000);
```
