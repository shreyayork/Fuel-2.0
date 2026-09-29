-- Pending magic-link invites. The raw token lives only in the email URL;
-- we store sha256(token) as the PK so a DB leak can't hand out live invites.
-- Lifecycle: accepted_at set on consumption, revoked_at on admin revoke,
-- expires_at enforced at lookup time.
CREATE TABLE IF NOT EXISTS "invite_tokens" (
  "token_hash" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "email" text NOT NULL,
  "role" "account_role" NOT NULL DEFAULT 'member',
  "invited_by_email" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "invite_tokens"
    ADD CONSTRAINT "invite_tokens_account_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "invite_tokens_account_email_idx"
  ON "invite_tokens" ("account_id", "email");

-- Hot path: "list pending invites for an account" — drop accepted + revoked
-- before scanning.
CREATE INDEX IF NOT EXISTS "invite_tokens_pending_idx"
  ON "invite_tokens" ("account_id")
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
