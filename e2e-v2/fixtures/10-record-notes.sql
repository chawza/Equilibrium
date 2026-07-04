INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Notes Test', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'inflow', '💼', 'Salary', 500000);
