INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Date Format Test', 'active', '2025-06-15', '2025-06-30');
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'inflow', '💼', 'Salary', 500000);
