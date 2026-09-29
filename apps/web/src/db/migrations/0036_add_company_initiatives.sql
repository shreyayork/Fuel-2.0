-- Account-scoped initiatives attached to a real (fuel-data or catalog)
-- company. Kept separate from the legacy `initiatives` table — that one's
-- wired to the fixture `companies` (serial int PK) + `people` + is still
-- read by a couple of fixture views we haven't retired yet. New operator
-- work goes here; the legacy table can age out.
CREATE TABLE "company_initiatives" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  -- fuel-data organization UUID or cat_-prefixed catalog UUID.
  "company_uuid" text NOT NULL,
  "kind" "initiative_kind" NOT NULL,
  "name" text NOT NULL,
  -- Functional area: "gtm" | "product" | "finance" | "people" | "ops" | "other".
  "area" text NOT NULL DEFAULT 'other',
  -- Free-form short summary of what we're doing / why.
  "description" text,
  -- "active" | "paused" | "completed" | "archived"
  "status" text NOT NULL DEFAULT 'active',
  -- Operator accountable for the initiative (user email).
  "owner_email" text NOT NULL,
  -- Optional target completion date ("2026-q2", "end of July 2026", etc).
  "due" text,
  -- Optional link back to the artifact (brief / playbook run) that
  -- proposed this initiative — audit trail from "AI suggested" → "we ran
  -- it." Null for manually created initiatives.
  "source_artifact_id" text,
  "created_by_email" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "company_initiatives"
  ADD CONSTRAINT "company_initiatives_account_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade;

ALTER TABLE "company_initiatives"
  ADD CONSTRAINT "company_initiatives_source_artifact_id_fk"
  FOREIGN KEY ("source_artifact_id") REFERENCES "artifacts"("id") ON DELETE set null;

CREATE INDEX "company_initiatives_company_idx"
  ON "company_initiatives" ("account_id", "company_uuid");

CREATE INDEX "company_initiatives_owner_idx"
  ON "company_initiatives" ("account_id", "owner_email");

--> statement-breakpoint

-- Advisors linked to a specific initiative — subset of the company's
-- advisor pool (company_advisors). UI flow: company shows its full
-- advisor roster; when you open or create an initiative, you pick which
-- of those advisors is helping with THIS one.
CREATE TABLE "company_initiative_advisors" (
  "initiative_id" text NOT NULL,
  "advisor_id" text NOT NULL,
  -- Optional role on this initiative ("lead", "domain expert", "intro").
  "role" text,
  "added_by_email" text NOT NULL,
  "added_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("initiative_id", "advisor_id")
);

ALTER TABLE "company_initiative_advisors"
  ADD CONSTRAINT "company_initiative_advisors_initiative_id_fk"
  FOREIGN KEY ("initiative_id") REFERENCES "company_initiatives"("id") ON DELETE cascade;

ALTER TABLE "company_initiative_advisors"
  ADD CONSTRAINT "company_initiative_advisors_advisor_id_fk"
  FOREIGN KEY ("advisor_id") REFERENCES "advisors"("id") ON DELETE cascade;
