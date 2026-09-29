-- Long-tail signal values on a portfolio update: Record<signal_id, value>.
-- Hardcoded columns stay for existing UI; new signals flow through jsonb
-- without schema migrations. source_observation_ids tracks the observations
-- that seeded the row so we can re-open them in the footnote view.
ALTER TABLE "portfolio_updates" ADD COLUMN "signals" jsonb;
ALTER TABLE "portfolio_updates" ADD COLUMN "source_observation_ids" jsonb;
