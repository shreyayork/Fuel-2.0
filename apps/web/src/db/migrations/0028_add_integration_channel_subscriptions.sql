-- Per-channel subscriptions for messaging integrations (Slack first). One row
-- per (connection, provider channel). Message events on enabled rows ingest
-- into context_items; others are dropped.
CREATE TABLE "integration_channel_subscriptions" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "connection_id" text NOT NULL,
  "provider" "integration_provider" NOT NULL,
  "provider_channel_id" text NOT NULL,
  "provider_channel_name" text NOT NULL,
  "is_private" boolean DEFAULT false NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "last_event_at" timestamp,
  "sync_state" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "integration_channel_subscriptions"
  ADD CONSTRAINT "integration_channel_subscriptions_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade;

ALTER TABLE "integration_channel_subscriptions"
  ADD CONSTRAINT "integration_channel_subscriptions_connection_id_integration_connections_id_fk"
  FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "integration_channel_subscriptions_connection_channel_unique"
  ON "integration_channel_subscriptions" ("connection_id", "provider_channel_id");

CREATE INDEX "integration_channel_subscriptions_account_provider_idx"
  ON "integration_channel_subscriptions" ("account_id", "provider");
