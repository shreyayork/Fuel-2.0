-- Rename the fixture-era "signals" table out of the way so we can use the
-- name for the new platform-wide signal catalog (quantitative + qualitative
-- observations extracted from Slack, Granola, notes, etc).
ALTER TABLE "signals" RENAME TO "fixture_signals";
