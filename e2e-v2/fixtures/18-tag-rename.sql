-- Fixture for 07-tag-crud — tag, budget, tagged record.
INSERT INTO tags (id, name, color) VALUES (1, 'Groceries', 'green');
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Tag Test', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (1, 1, 'outflow', '🛒', 'Shopping', 50000);
INSERT INTO record_tags (record_id, tag_id) VALUES (1, 1);
