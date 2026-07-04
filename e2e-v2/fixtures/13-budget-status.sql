-- Fixture for 04-budget-status — one plan budget.
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Plan Budget', 'plan', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
