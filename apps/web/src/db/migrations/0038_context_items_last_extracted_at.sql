-- Tracks when signal extraction last *ran* against a context_item, not
-- whether it found anything. Critical distinction: retroExtract used to
-- filter on `NOT EXISTS (SELECT 1 FROM signal_observations ...)`, which
-- meant every 1-line reply / "thanks!" / auto-forward with genuinely
-- nothing extractable got re-asked against Claude Haiku on every run —
-- a perpetual cost leak that scales with ingest.
--
-- Now onlyMissing=true means `last_extracted_at IS NULL` (never tried)
-- and callers can opt into a `retryAfterDays` window for catalog
-- changes. Backfill: leave existing rows at NULL so the next retro
-- pass still sees them once; after that they settle.
ALTER TABLE "context_items" ADD COLUMN "last_extracted_at" timestamp;

-- Backfill: any item with at least one observation has already been
-- extracted. Set last_extracted_at = now so the next retro pass
-- doesn't re-process the entire already-extracted corpus. Items that
-- genuinely produced zero observations but weren't yet tombstoned
-- remain NULL — that's correct; they'll be picked up once, stamped,
-- and not re-asked until a retryAfterDays window elapses.
UPDATE "context_items"
SET "last_extracted_at" = NOW()
WHERE EXISTS (
  SELECT 1 FROM "signal_observations"
  WHERE "signal_observations"."context_item_id" = "context_items"."id"
);

-- Partial index for the common "never extracted" retro query.
CREATE INDEX "context_items_pending_extraction_idx"
  ON "context_items" ("account_id", "last_extracted_at")
  WHERE "last_extracted_at" IS NULL;
