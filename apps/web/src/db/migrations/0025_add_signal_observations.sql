-- Append-only event log of every signal value we observe, from any source.
-- One context_item can produce N rows. Latest-by-(company, signal, period)
-- is the current value; rolled up into benchmark_cohorts for York's
-- internal cohort.
CREATE TABLE "signal_observations" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "company_uuid" text NOT NULL,
  "signal_id" text NOT NULL,
  "period" text NOT NULL,
  "as_of" date,
  "value_numeric" real,
  "value_text" text,
  "value_bool" boolean,
  "sentiment" smallint,
  "source" text NOT NULL,
  "context_item_id" text,
  "agent_run_id" text,
  "confidence" real,
  "raw_snippet" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "signal_observations"
  ADD CONSTRAINT "signal_observations_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
ALTER TABLE "signal_observations"
  ADD CONSTRAINT "signal_observations_signal_id_signals_id_fk"
  FOREIGN KEY ("signal_id") REFERENCES "signals"("id") ON DELETE CASCADE;
ALTER TABLE "signal_observations"
  ADD CONSTRAINT "signal_observations_context_item_id_context_items_id_fk"
  FOREIGN KEY ("context_item_id") REFERENCES "context_items"("id") ON DELETE SET NULL;
ALTER TABLE "signal_observations"
  ADD CONSTRAINT "signal_observations_agent_run_id_agent_runs_id_fk"
  FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL;

CREATE INDEX "signal_observations_account_company_signal_period_idx"
  ON "signal_observations" ("account_id", "company_uuid", "signal_id", "period");
CREATE INDEX "signal_observations_context_item_idx"
  ON "signal_observations" ("context_item_id");
CREATE INDEX "signal_observations_created_at_idx"
  ON "signal_observations" ("created_at");
