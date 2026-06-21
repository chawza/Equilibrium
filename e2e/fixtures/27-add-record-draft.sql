-- Fixture for 27-add-record-draft — one active budget, no records.
PRAGMA foreign_keys = ON;
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Draft Test Budget', 'active', date('now','start of month'), date('now','start of month','+1 month','-1 day'));
