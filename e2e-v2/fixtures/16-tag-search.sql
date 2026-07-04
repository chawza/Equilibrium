-- v2 override of e2e/fixtures/16-tag-search.sql.
-- The app normalizes tag names to lowercase on create/rename, and the search
-- filter relies on that invariant (it lowercases only the query — see
-- src/routes/tags/+page.svelte). The legacy fixture's capitalized names can
-- never match a search, so seed app-conform lowercase names instead.
INSERT INTO tags (id, name, color) VALUES
  (1, 'groceries', 'green'),
  (2, 'transport', 'blue'),
  (3, 'utilities', 'amber'),
  (4, 'entertainment', 'purple');
