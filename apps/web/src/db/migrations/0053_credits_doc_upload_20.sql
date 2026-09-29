-- Doc upload + signal now includes former Crunchbase enrichment cost (15 + 5 → 20).
UPDATE "credit_action_costs"
SET "cost" = 20, "updated_at" = now()
WHERE "action_slug" = 'docUpload';
--> statement-breakpoint
UPDATE "credit_action_costs"
SET "active" = false, "updated_at" = now()
WHERE "action_slug" = 'crunchbaseEnrichment';
