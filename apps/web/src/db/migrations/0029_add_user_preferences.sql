-- Per-user key/value preference store. Mirrors Fuel 1.0's `UserPreferences`
-- DDB model so the account-migration Lambda can copy `active_account` rows
-- 1:1. PK is (email, key) so an upsert is cheap.
CREATE TABLE "user_preferences" (
  "user_email" text NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_email", "key")
);

CREATE INDEX "user_preferences_email_idx" ON "user_preferences" ("user_email");
