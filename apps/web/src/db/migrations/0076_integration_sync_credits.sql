-- Per-integration sync credit costs (default 0 = free / hidden from activity dialog).
INSERT INTO "credit_action_costs" ("action_slug", "label", "cost", "active", "updated_at")
VALUES
  ('hubspotSync', 'HubSpot sync', 0, true, now()),
  ('granolaSync', 'Granola sync', 0, true, now()),
  ('slackSync', 'Slack sync', 0, true, now())
ON CONFLICT ("action_slug") DO NOTHING;
