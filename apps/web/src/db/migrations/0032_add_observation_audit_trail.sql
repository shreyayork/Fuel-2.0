-- Audit trail for signal observations + cross-user Granola meeting merge.
--
-- Observations: stop deleting prior rows on re-extraction. Mark them
-- superseded so the audit-trail UI can show the history of a value
-- ("2.4M → 2.6M, corrected by mike@york.ie on 2026-04-20"). Denormalize
-- author_email onto the observation for fast "who recorded this" queries
-- without a join back through context_items or agent_runs.
--
-- Context items: add a meeting_key so two team members syncing Granola
-- notes on the same calendar meeting merge into a single context item
-- instead of fighting over the deterministic id. contributors tracks every
-- author whose notes are folded in.

ALTER TABLE "signal_observations"
  ADD COLUMN IF NOT EXISTS "superseded_at" timestamp,
  ADD COLUMN IF NOT EXISTS "superseded_by_id" text,
  ADD COLUMN IF NOT EXISTS "author_email" text;

DO $$ BEGIN
  ALTER TABLE "signal_observations"
    ADD CONSTRAINT "signal_observations_superseded_by_id_fk"
    FOREIGN KEY ("superseded_by_id") REFERENCES "signal_observations"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Hot path: "current observations for a company" — drop superseded rows
-- before hitting the main composite index.
CREATE INDEX IF NOT EXISTS "signal_observations_current_idx"
  ON "signal_observations" ("account_id", "company_uuid")
  WHERE "superseded_at" IS NULL;

ALTER TABLE "context_items"
  ADD COLUMN IF NOT EXISTS "meeting_key" text,
  ADD COLUMN IF NOT EXISTS "contributors" jsonb;

-- Partial index: meeting_key is only meaningful for meeting_transcript rows.
CREATE INDEX IF NOT EXISTS "context_items_meeting_key_idx"
  ON "context_items" ("account_id", "company_uuid", "meeting_key")
  WHERE "meeting_key" IS NOT NULL;
