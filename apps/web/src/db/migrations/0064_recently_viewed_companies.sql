-- Per-user recently viewed companies for the sidebar. Cognito email is the
-- user key (no users table). Unique (user_email, company_uuid) so revisits
-- UPSERT viewed_at instead of inserting duplicates.
CREATE TABLE "recently_viewed_companies" (
  "id" text PRIMARY KEY NOT NULL,
  "user_email" text NOT NULL,
  "company_uuid" text NOT NULL,
  "account_id" text,
  "name" text NOT NULL,
  "domain" text,
  "logo_url" text,
  "viewed_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "recently_viewed_user_company_unique"
  ON "recently_viewed_companies" ("user_email", "company_uuid");
--> statement-breakpoint
CREATE INDEX "recently_viewed_user_viewed_idx"
  ON "recently_viewed_companies" ("user_email", "viewed_at");
