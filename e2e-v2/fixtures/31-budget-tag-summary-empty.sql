INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'No Tagged Records', 'active', '2026-06-01', '2026-06-30');

INSERT INTO records (id, budget_id, type, emoji, label, amount, notes) VALUES
  (1, 1, 'inflow', '💰', 'Income without tag', 100000, NULL),
  (2, 1, 'outflow', '🛒', 'Expense without tag', 40000, NULL);
