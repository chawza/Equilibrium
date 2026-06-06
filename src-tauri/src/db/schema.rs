/// SQLite schema — verbatim from docs/data-model.md.
/// Run once on app startup via db::init().
pub const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS budgets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  start_date TEXT    NOT NULL,
  end_date   TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'plan',
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id      INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL,
  emoji          TEXT    NOT NULL DEFAULT '📝',
  label          TEXT    NOT NULL,
  amount         INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  is_adjustment  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS record_tags (
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (record_id, tag_id)
);
"#;
