-- Fixture for 06-balance-over-budget — outflow (80.000) > inflow (50.000).
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Over Budget', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'inflow',  '💰', 'Income',  50000),
  (2, 1, 'outflow', '🛒', 'Expense', 80000);
