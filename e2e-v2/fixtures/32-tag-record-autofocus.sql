-- Issue #8: clicking a record in a tag's detail opens its budget with that
-- record in edit mode (autofocus). Budget id is 2 (not 1) to prove the URL
-- uses the record's own budget. Two records share the tag so we can confirm
-- the *clicked* record (Coffee) is the one focused — not the other (Lunch).
INSERT INTO tags (id, name, color) VALUES (1, 'FocusTag', 'blue');
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (2, 'Autofocus Test', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
INSERT INTO records (id, budget_id, type, emoji, label, amount) VALUES
  (10, 2, 'inflow', '💼', 'Salary', 100000),
  (11, 2, 'outflow', '☕', 'Coffee', 15000),
  (12, 2, 'outflow', '🍜', 'Lunch', 25000);
INSERT INTO record_tags (record_id, tag_id) VALUES (11, 1), (12, 1);
