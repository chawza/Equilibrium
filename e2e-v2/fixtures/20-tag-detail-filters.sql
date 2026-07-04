INSERT INTO tags (id, name, color) VALUES (1, 'DetailTag', 'green');
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Tag Detail Test', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'inflow', '💼', 'Salary A', 100000),
  (2, 1, 'outflow', '🛒', 'Shopping B', 30000),
  (3, 1, 'outflow', '🚌', 'Commute C', 15000),
  (4, 1, 'inflow', '🎁', 'Bonus D', 20000);
INSERT INTO record_tags (record_id, tag_id) VALUES (1, 1), (2, 1), (3, 1), (4, 1);
