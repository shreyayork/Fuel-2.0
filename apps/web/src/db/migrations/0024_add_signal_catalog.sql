-- Signal catalog: the authoritative registry of every metric / qualitative
-- observation / boolean flag we can extract from context. Global rows are
-- York's curated set (seeded like playbooks); account rows are customer
-- extensions. Separate id namespace — globally unique text id.
CREATE TYPE "signal_kind" AS ENUM ('quantitative', 'qualitative', 'boolean');
CREATE TYPE "signal_scope" AS ENUM ('global', 'account');

CREATE TABLE "signals" (
  "id" text PRIMARY KEY,
  "label" text NOT NULL,
  "description" text,
  "extraction_hint" text,
  "kind" "signal_kind" NOT NULL,
  "unit" text,
  "category" text NOT NULL,
  "inverted_good" boolean DEFAULT false NOT NULL,
  "scope" "signal_scope" DEFAULT 'global' NOT NULL,
  "account_id" text,
  "validators" jsonb,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "signals"
  ADD CONSTRAINT "signals_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;

CREATE INDEX "signals_scope_idx" ON "signals" ("scope");
CREATE INDEX "signals_category_idx" ON "signals" ("category");
