-- Rename the domain: engagement → initiative. Data-preserving; no drop/recreate.
-- Enum, join table column, tables, and the named PK/FK constraints all renamed
-- so their schema-level names line up with the new domain vocabulary.

ALTER TYPE "public"."engagement_kind" RENAME TO "initiative_kind";--> statement-breakpoint

ALTER TABLE "engagement_team" RENAME TO "initiative_team";--> statement-breakpoint
ALTER TABLE "initiative_team" RENAME COLUMN "engagement_id" TO "initiative_id";--> statement-breakpoint
ALTER TABLE "initiative_team" RENAME CONSTRAINT "engagement_team_engagement_id_person_id_pk" TO "initiative_team_initiative_id_person_id_pk";--> statement-breakpoint
ALTER TABLE "initiative_team" RENAME CONSTRAINT "engagement_team_engagement_id_engagements_id_fk" TO "initiative_team_initiative_id_initiatives_id_fk";--> statement-breakpoint
ALTER TABLE "initiative_team" RENAME CONSTRAINT "engagement_team_person_id_people_id_fk" TO "initiative_team_person_id_people_id_fk";--> statement-breakpoint

ALTER TABLE "engagements" RENAME TO "initiatives";--> statement-breakpoint
ALTER TABLE "initiatives" RENAME CONSTRAINT "engagements_company_id_companies_id_fk" TO "initiatives_company_id_companies_id_fk";--> statement-breakpoint
ALTER TABLE "initiatives" RENAME CONSTRAINT "engagements_owner_id_people_id_fk" TO "initiatives_owner_id_people_id_fk";
