PRAGMA foreign_keys = ON;

INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Submenu Source', 'active', '2026-01-01', '2026-01-31');

INSERT INTO records (id, budget_id, type, emoji, label, amount, notes) VALUES
  (1, 1, 'inflow', '💼', 'Salary', 100000, 'monthly pay'),
  (2, 1, 'outflow', '🛒', 'Groceries', 40000, 'weekly shop');
