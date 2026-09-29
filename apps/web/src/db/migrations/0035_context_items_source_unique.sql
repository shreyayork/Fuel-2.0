-- Eliminate duplicate context_items sharing the same (account_id, source,
-- source_external_id) triple. Cause: upsertActivityContextItem used a
-- SELECT-then-INSERT pattern, so concurrent writers (webhook + cron, two
-- overlapping cron ticks) could both miss each other's row and both
-- insert. Keep the oldest row per triple to preserve any already-attached
-- signal_observations that point at it via FK (ON DELETE SET NULL still
-- fires, but we avoid the needless SET NULL when we don't have to). Ties
-- on created_at broken by the lexicographically smaller id — deterministic
-- and stable.
DELETE FROM "context_items" t1
USING "context_items" t2
WHERE t1.account_id = t2.account_id
  AND t1.source = t2.source
  AND t1.source_external_id IS NOT NULL
  AND t1.source_external_id = t2.source_external_id
  AND (
    t1.created_at > t2.created_at
    OR (t1.created_at = t2.created_at AND t1.id > t2.id)
  );

-- Unique constraint that makes the upsert valid going forward. NULLs in
-- source_external_id are treated as distinct by Postgres, so manual
-- "user:<email>" context items with no external id coexist fine — the
-- index only binds when an external id is present.
CREATE UNIQUE INDEX "context_items_source_unique"
  ON "context_items" ("account_id", "source", "source_external_id");
