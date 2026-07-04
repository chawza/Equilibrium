-- seeded.sql -- 6 budgets, records, tags.
-- Amounts in IDR integers (e.g. 5000000 = Rp 5.000.000).
-- Status: 'plan' | 'active' | 'review' | 'closed'
-- Type:   'inflow' | 'outflow'
-- Color:  red | orange | amber | green | teal | blue | indigo | purple | pink | gray

PRAGMA foreign_keys = ON;

-- Tags
INSERT INTO tags (id, name, color) VALUES
  (1, 'Food',          'green'),
  (2, 'Transport',     'blue'),
  (3, 'Utilities',     'amber'),
  (4, 'Entertainment', 'purple'),
  (5, 'Healthcare',    'teal');

-- Budgets
-- Budget 4 (April) is active with a past end_date -> client-side "needs review"
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'January 2025',  'closed', '2025-01-01', '2025-01-31'),
  (2, 'February 2025', 'closed', '2025-02-01', '2025-02-28'),
  (3, 'March 2025',    'review', '2025-03-01', '2025-03-31'),
  (4, 'April 2025',    'active', '2025-04-01', '2025-04-30'),
  (5, 'May 2025',      'closed', '2025-05-01', '2025-05-31'),
  (6, 'June 2025',     'active', '2025-06-01', '2025-06-30');

-- Records -- Budget 1: January (closed)
INSERT INTO records (id, budget_id, type, emoji, label, amount, is_adjustment) VALUES
  (1,  1, 'inflow',  '💼', 'Salary',      5000000, 0),
  (2,  1, 'outflow', '🛒', 'Groceries',   1200000, 0),
  (3,  1, 'outflow', '🚌', 'Commute',      300000, 0),
  (4,  1, 'outflow', '💡', 'Electricity',  450000, 0),
  (5,  1, 'outflow', '🎬', 'Cinema',       150000, 0);

-- Records -- Budget 2: February (closed)
INSERT INTO records (id, budget_id, type, emoji, label, amount, is_adjustment) VALUES
  (6,  2, 'inflow',  '💼', 'Salary',       5000000, 0),
  (7,  2, 'outflow', '🛒', 'Groceries',    1500000, 0),
  (8,  2, 'outflow', '🚌', 'Commute',       250000, 0),
  (9,  2, 'outflow', '🎬', 'Subscription',   79000, 0),
  (10, 2, 'outflow', '💊', 'Doctor visit',  400000, 0);

-- Records -- Budget 3: March (review)
INSERT INTO records (id, budget_id, type, emoji, label, amount, is_adjustment) VALUES
  (11, 3, 'inflow',  '💼', 'Salary',       5500000, 0),
  (12, 3, 'inflow',  '🎁', 'Bonus',         500000, 0),
  (13, 3, 'outflow', '🛒', 'Groceries',    1100000, 0),
  (14, 3, 'outflow', '🚌', 'Commute',       200000, 0),
  (15, 3, 'outflow', '💡', 'Utilities',     550000, 0);

-- Records -- Budget 4: April (active, past end_date)
-- Record 19 is an adjustment (added after end_date passed)
INSERT INTO records (id, budget_id, type, emoji, label, amount, is_adjustment) VALUES
  (16, 4, 'inflow',  '💼', 'Salary',    5000000, 0),
  (17, 4, 'outflow', '🛒', 'Groceries', 1300000, 0),
  (18, 4, 'outflow', '🚗', 'Grab',       450000, 0),
  (19, 4, 'outflow', '💊', 'Medicine',   120000, 1);

-- Records -- Budget 5: May (closed)
INSERT INTO records (id, budget_id, type, emoji, label, amount, is_adjustment) VALUES
  (20, 5, 'inflow',  '💼', 'Salary',      5000000, 0),
  (21, 5, 'outflow', '🛒', 'Groceries',   1400000, 0),
  (22, 5, 'outflow', '🚌', 'Commute',      280000, 0),
  (23, 5, 'outflow', '💡', 'Electricity',  500000, 0);

-- Records -- Budget 6: June (active, current)
INSERT INTO records (id, budget_id, type, emoji, label, amount, is_adjustment) VALUES
  (24, 6, 'inflow',  '💼', 'Salary',    5000000, 0),
  (25, 6, 'outflow', '🛒', 'Groceries',  700000, 0),
  (26, 6, 'outflow', '🚌', 'Commute',    150000, 0);

-- record_tags
INSERT INTO record_tags (record_id, tag_id) VALUES
  -- Food
  (2,1),(7,1),(13,1),(17,1),(21,1),(25,1),
  -- Transport
  (3,2),(8,2),(14,2),(18,2),(22,2),(26,2),
  -- Utilities
  (4,3),(15,3),(23,3),
  -- Entertainment
  (5,4),(9,4),
  -- Healthcare
  (10,5),(19,5);
