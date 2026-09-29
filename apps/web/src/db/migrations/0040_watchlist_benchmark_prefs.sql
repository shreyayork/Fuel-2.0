-- Per-portfolio benchmark configuration (Phase 5 of the Apr 24 plan).
-- A seed-stage fund cares about burn / runway / ARR growth; a growth-stage
-- fund cares about NRR / rule-of-40 / gross margin. Storing the picked
-- metric ids on the watchlist row (nullable → default set) keeps the
-- portfolio distribution panel from dictating one list to every fund.
--
-- Kept as jsonb (not a typed text[] array) so we can evolve the shape later
-- — e.g. `[{"metricId":"arr_usd","weight":0.4}]` for weighted summaries —
-- without another migration. Array-of-strings is what the picker writes today.
ALTER TABLE "watchlists"
  ADD COLUMN "benchmark_metric_ids" jsonb;
