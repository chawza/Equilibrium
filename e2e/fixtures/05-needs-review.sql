-- Fixture for 05-needs-review — active budget past end_date + closed budget.
INSERT INTO budgets (id, name, status, start_date, end_date) VALUES
  (1, 'Expired Active', 'active', date('now','-2 months'), date('now','-1 day')),
  (2, 'Old Closed',     'closed', date('now','-2 months'), date('now','-2 days'));
