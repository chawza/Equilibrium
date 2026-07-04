-- Fixture for 03-record-edit — one budget with a 50.000 inflow record.
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Edit Test', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'inflow', '💰', 'Test Inflow', 50000);
