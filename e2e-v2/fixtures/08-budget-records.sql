-- Fixture for 02-budget-records — one active budget for the current month.
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Test Budget', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
