INSERT INTO tags (id, name, color) VALUES
  (1, 'Groceries', 'green'),
  (2, 'Transport', 'blue'),
  (3, 'Utilities', 'amber'),
  (4, 'Entertainment', 'purple');
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Sort Test', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'outflow', '🛒', 'Shopping', 50000),
  (2, 1, 'outflow', '🚌', 'Bus', 20000),
  (3, 1, 'outflow', '💡', 'Power', 40000),
  (4, 1, 'outflow', '🎬', 'Movie', 30000);
INSERT INTO record_tags (record_id, tag_id) VALUES
  (1, 1), (2, 2), (2, 1), (3, 3), (4, 4);
