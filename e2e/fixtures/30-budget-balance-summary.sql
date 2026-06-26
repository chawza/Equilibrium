INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Empty Summary', 'plan', '2026-06-01', '2026-06-30'),
  (2, 'Balanced Summary', 'active', '2026-06-01', '2026-06-30'),
  (3, 'Unspent Summary', 'active', '2026-06-01', '2026-06-30');

INSERT INTO records (id, budget_id, type, emoji, label, amount, notes) VALUES
  (1, 2, 'inflow', '💰', 'Income', 100000, NULL),
  (2, 2, 'outflow', '🛒', 'Expense', 100000, NULL),
  (3, 3, 'inflow', '💰', 'Income', 150000, NULL),
  (4, 3, 'outflow', '🛒', 'Expense', 50000, NULL);
