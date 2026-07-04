INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Delete Records', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'inflow', '💼', 'Salary', 100000),
  (2, 1, 'outflow', '🛒', 'Groceries', 30000),
  (3, 1, 'outflow', '🚌', 'Commute', 15000);
