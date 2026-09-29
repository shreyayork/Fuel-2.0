-- Per-(account, connection) config for non-deal HubSpot ingestion (notes +
-- emails). One row per HubSpot connection; both toggles default off so
-- existing installs don't start syncing until a user opts in.
CREATE TABLE "integration_activity_configs" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "connection_id" text NOT NULL,
  "provider" "integration_provider" NOT NULL,
  "sync_emails" boolean DEFAULT false NOT NULL,
  "sync_notes" boolean DEFAULT false NOT NULL,
  -- 'company' | 'contact' | 'both' — which HubSpot association walks the
  -- resolver uses when mapping an activity to a Fuel company.
  "association_scope" text DEFAULT 'both' NOT NULL,
  -- First-time backfill cutoff; null means "forward only from enable time".
  "backfill_since" timestamp,
  "last_email_sync_at" timestamp,
  "last_note_sync_at" timestamp,
  "sync_state" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "integration_activity_configs"
  ADD CONSTRAINT "integration_activity_configs_account_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade;

ALTER TABLE "integration_activity_configs"
  ADD CONSTRAINT "integration_activity_configs_connection_id_fk"
  FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "integration_activity_configs_unique"
  ON "integration_activity_configs" ("account_id", "connection_id", "provider");

--> statement-breakpoint

-- Resolution cache: HubSpot company/contact id → Fuel company uuid. Shared
-- by deal sync (future backfill) and activity sync. `fuel_data_uuid IS NULL`
-- with `resolution_source = 'unresolved'` means "we looked and found no
-- match"; rows stale past the TTL are re-resolved by the caller.
CREATE TABLE "integration_company_links" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "connection_id" text NOT NULL,
  "provider" "integration_provider" NOT NULL,
  -- 'company' or 'contact'
  "provider_object_type" text NOT NULL,
  "provider_object_id" text NOT NULL,
  "provider_domain" text,
  "fuel_data_uuid" text,
  -- 'catalog' | 'fuel-data' | 'unresolved'
  "resolution_source" text,
  "last_resolved_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "integration_company_links"
  ADD CONSTRAINT "integration_company_links_account_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade;

ALTER TABLE "integration_company_links"
  ADD CONSTRAINT "integration_company_links_connection_id_fk"
  FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "integration_company_links_unique"
  ON "integration_company_links" ("account_id", "connection_id", "provider_object_type", "provider_object_id");

CREATE INDEX "integration_company_links_account_provider_idx"
  ON "integration_company_links" ("account_id", "provider");
