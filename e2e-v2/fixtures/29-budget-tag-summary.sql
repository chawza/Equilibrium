PRAGMA foreign_keys = ON;

INSERT INTO tags (id, name, color) VALUES
  (1, 'income', 'green'),
  (2, 'food', 'orange'),
  (3, 'shared', 'blue');

INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Tag Summary Budget', 'active', '2026-06-01', '2026-06-30');

INSERT INTO records (id, budget_id, type, emoji, label, amount, notes) VALUES
  (1, 1, 'inflow', '💼', 'Salary', 150000, 'monthly pay'),
  (2, 1, 'outflow', '🛒', 'Groceries', 40000, 'weekly shop'),
  (3, 1, 'outflow', '🍜', 'Lunch', 25000, 'team lunch'),
  (4, 1, 'outflow', '🧾', 'Untagged fee', 10000, 'should not appear in tag summary');

INSERT INTO record_tags (record_id, tag_id) VALUES
  (1, 1),
  (1, 3),
  (2, 2),
  (2, 3),
  (3, 2);
