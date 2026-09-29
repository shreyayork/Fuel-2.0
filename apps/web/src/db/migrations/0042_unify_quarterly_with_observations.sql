-- Unify quarterly portfolio submissions with signal_observations so the
-- benchmark distribution, the agent's "current value" reader, and any
-- future analytics all read from one place instead of special-casing the
-- portfolio_updates table. Adam's Apr 24 note: "let's make those schemas
-- the same."
--
-- This migration has three parts:
--  1. Retire the short-form metric ids from benchmark_cohorts
--     (nrr, gross_margin, logo_retention, arr_growth_yoy, rule_of_40).
--     The seeder replays the same cohorts with the catalog-canonical long
--     form (nrr_pct, gross_margin_pct, …) after this migration runs.
--  2. Backfill signal_observations from every existing portfolio_updates
--     row — one observation per non-null field. Source is tagged with the
--     originating portfolio_updates.id so fanOutUpdateToObservations in
--     lib/portfolio-updates.ts can recognise + supersede on re-save.
--  3. Every field mapping mirrors PORTFOLIO_UPDATE_FIELD_MAP in
--     lib/portfolio-updates.ts. Keep the two in lockstep — if a column is
--     added to portfolio_updates, add a row to both.

-- Ensure gen_random_uuid() is available. PG 13+ ships it in pgcrypto; the
-- IF NOT EXISTS is a no-op when already installed.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--> statement-breakpoint

-- 0. Seed the 11 new catalog signals the backfill below references. The
--    Node-side seeder (seedSignalCatalog in seed-signals.ts) also creates
--    these on every migration-lambda invocation, but seed runs AFTER
--    migrations — so the FK insert below would fail without this inline
--    seed. ON CONFLICT makes the inline + runtime seed idempotent against
--    each other.
INSERT INTO "signals" (
  "id", "label", "category", "kind", "unit", "inverted_good",
  "description", "display_order", "scope", "account_id", "created_at", "updated_at"
) VALUES
  ('notable_customers',    'Notable customers (period)',   'gtm',             'qualitative', NULL, false, 'Logos worth flagging from the quarter — either recent wins or the anchor accounts.', 1100, 'global', NULL, now(), now()),
  ('notable_hires',        'Notable hires (period)',       'team',            'qualitative', NULL, false, 'Senior hires or executive signings the founder highlights as the quarter''s wins.',  1110, 'global', NULL, now(), now()),
  ('other_updates',        'Other updates (period)',       'board_reporting', 'qualitative', NULL, false, 'Free-form quarter narrative that doesn''t fit the structured fields. Keep short.',   1120, 'global', NULL, now(), now()),
  ('quarter_challenges',   'Challenges (period)',          'board_reporting', 'qualitative', NULL, false, 'Founder''s stated challenges for the quarter.',                                       1130, 'global', NULL, now(), now()),
  ('banking_partner',      'Banking partner',              'vendor_stack',    'qualitative', NULL, false, NULL,                                                                                  1200, 'global', NULL, now(), now()),
  ('legal_counsel',        'Legal counsel',                'vendor_stack',    'qualitative', NULL, false, NULL,                                                                                  1210, 'global', NULL, now(), now()),
  ('cloud_provider',       'Cloud provider',               'vendor_stack',    'qualitative', NULL, false, NULL,                                                                                  1220, 'global', NULL, now(), now()),
  ('cap_table_platform',   'Cap table platform',           'vendor_stack',    'qualitative', NULL, false, NULL,                                                                                  1230, 'global', NULL, now(), now()),
  ('do_insurance_provider','D&O insurance provider',       'vendor_stack',    'qualitative', NULL, false, NULL,                                                                                  1240, 'global', NULL, now(), now()),
  ('crm_platform',         'CRM platform',                 'vendor_stack',    'qualitative', NULL, false, NULL,                                                                                  1250, 'global', NULL, now(), now()),
  ('open_to_investor_intros','Open to investor intros',    'fundraising',     'boolean',     NULL, false, NULL,                                                                                  1300, 'global', NULL, now(), now())
ON CONFLICT ("id") DO NOTHING;

--> statement-breakpoint

-- 1. Delete orphaned short-form benchmark rows.
DELETE FROM "benchmark_cohorts"
WHERE "metric" IN ('nrr','gross_margin','logo_retention','arr_growth_yoy','rule_of_40');

-- 1b. Rewrite any watchlist benchmark-metric preferences saved under the
--     old short-form ids so Phase-5 picker selections survive the rename.
UPDATE "watchlists"
SET "benchmark_metric_ids" = (
  SELECT jsonb_agg(
    CASE elem
      WHEN 'nrr' THEN 'nrr_pct'
      WHEN 'gross_margin' THEN 'gross_margin_pct'
      WHEN 'logo_retention' THEN 'logo_retention_pct'
      WHEN 'arr_growth_yoy' THEN 'arr_growth_yoy_pct'
      WHEN 'rule_of_40' THEN 'rule_of_40_pct'
      ELSE elem
    END
  )
  FROM jsonb_array_elements_text("benchmark_metric_ids") AS elem
)
WHERE "benchmark_metric_ids" IS NOT NULL;

--> statement-breakpoint

-- 2. Backfill signal_observations.
--
-- Helper approach: one INSERT per field + period, filtered to non-null
-- values. We stamp confidence = 1.0 (survey is authoritative) and source
-- = portfolio_update:<id>. ON CONFLICT would be nice but signal_observations
-- has no unique key on (account, company, signal, period, source), so we
-- guard against duplicate replays by stamping supersededAt on any prior
-- portfolio_update:* rows first, then inserting fresh.
UPDATE "signal_observations"
SET "superseded_at" = now()
WHERE "source" LIKE 'portfolio_update:%'
  AND "superseded_at" IS NULL;

--> statement-breakpoint

-- Quantitative fields — one INSERT per (portfolio_updates column → signal).
-- gen_random_uuid() is available in Postgres 13+; RDS Aurora ships it.
INSERT INTO "signal_observations" (
  "id", "account_id", "company_uuid", "signal_id", "period",
  "value_numeric", "confidence", "source", "author_email", "created_at"
)
SELECT
  'obs_' || gen_random_uuid(), pu.account_id, pu.company_uuid, map.signal_id, pu.period,
  CASE map.column_name
    WHEN 'arr_usd' THEN pu.arr_usd
    WHEN 'fte_count' THEN pu.fte_count
    WHEN 'paid_customer_count' THEN pu.paid_customer_count
    WHEN 'arr_growth_yoy_pct' THEN pu.arr_growth_yoy_pct
    WHEN 'nrr_pct' THEN pu.nrr_pct
    WHEN 'logo_retention_pct' THEN pu.logo_retention_pct
    WHEN 'gross_margin_pct' THEN pu.gross_margin_pct
    WHEN 'cac_payback_months' THEN pu.cac_payback_months
    WHEN 'burn_multiple' THEN pu.burn_multiple
    WHEN 'rule_of_40_pct' THEN pu.rule_of_40_pct
    WHEN 'cash_on_hand_usd' THEN pu.cash_on_hand_usd
    WHEN 'monthly_burn_usd' THEN pu.monthly_burn_usd
  END::double precision,
  1.0,
  'portfolio_update:' || pu.id,
  pu.submitted_by_email,
  now()
FROM "portfolio_updates" pu
CROSS JOIN (
  VALUES
    ('arr_usd','arr_usd'),
    ('fte_count','fte_count'),
    ('paid_customer_count','paid_customer_count'),
    ('arr_growth_yoy_pct','arr_growth_yoy_pct'),
    ('nrr_pct','nrr_pct'),
    ('logo_retention_pct','logo_retention_pct'),
    ('gross_margin_pct','gross_margin_pct'),
    ('cac_payback_months','cac_payback_months'),
    ('burn_multiple','burn_multiple'),
    ('rule_of_40_pct','rule_of_40_pct'),
    ('cash_on_hand_usd','cash_on_hand_usd'),
    ('monthly_burn_usd','monthly_burn_usd')
) AS map(column_name, signal_id)
WHERE (
  (map.column_name = 'arr_usd' AND pu.arr_usd IS NOT NULL) OR
  (map.column_name = 'fte_count' AND pu.fte_count IS NOT NULL) OR
  (map.column_name = 'paid_customer_count' AND pu.paid_customer_count IS NOT NULL) OR
  (map.column_name = 'arr_growth_yoy_pct' AND pu.arr_growth_yoy_pct IS NOT NULL) OR
  (map.column_name = 'nrr_pct' AND pu.nrr_pct IS NOT NULL) OR
  (map.column_name = 'logo_retention_pct' AND pu.logo_retention_pct IS NOT NULL) OR
  (map.column_name = 'gross_margin_pct' AND pu.gross_margin_pct IS NOT NULL) OR
  (map.column_name = 'cac_payback_months' AND pu.cac_payback_months IS NOT NULL) OR
  (map.column_name = 'burn_multiple' AND pu.burn_multiple IS NOT NULL) OR
  (map.column_name = 'rule_of_40_pct' AND pu.rule_of_40_pct IS NOT NULL) OR
  (map.column_name = 'cash_on_hand_usd' AND pu.cash_on_hand_usd IS NOT NULL) OR
  (map.column_name = 'monthly_burn_usd' AND pu.monthly_burn_usd IS NOT NULL)
);

--> statement-breakpoint

-- Qualitative text fields — notable_customers, notable_hires, other_updates,
-- quarter_challenges, plus the vendor stack.
INSERT INTO "signal_observations" (
  "id", "account_id", "company_uuid", "signal_id", "period",
  "value_text", "confidence", "source", "author_email", "created_at"
)
SELECT
  'obs_' || gen_random_uuid(), pu.account_id, pu.company_uuid, map.signal_id, pu.period,
  CASE map.column_name
    WHEN 'notable_customers' THEN pu.notable_customers
    WHEN 'notable_hires' THEN pu.notable_hires
    WHEN 'other_updates' THEN pu.other_updates
    WHEN 'quarter_challenges' THEN pu.challenges
    WHEN 'banking_partner' THEN pu.banking_partner
    WHEN 'legal_counsel' THEN pu.legal_counsel
    WHEN 'cloud_provider' THEN pu.cloud_provider
    WHEN 'cap_table_platform' THEN pu.cap_table_platform
    WHEN 'do_insurance_provider' THEN pu.do_insurance_provider
    WHEN 'crm_platform' THEN pu.crm_platform
  END,
  1.0,
  'portfolio_update:' || pu.id,
  pu.submitted_by_email,
  now()
FROM "portfolio_updates" pu
CROSS JOIN (
  VALUES
    ('notable_customers','notable_customers'),
    ('notable_hires','notable_hires'),
    ('other_updates','other_updates'),
    ('quarter_challenges','quarter_challenges'),
    ('banking_partner','banking_partner'),
    ('legal_counsel','legal_counsel'),
    ('cloud_provider','cloud_provider'),
    ('cap_table_platform','cap_table_platform'),
    ('do_insurance_provider','do_insurance_provider'),
    ('crm_platform','crm_platform')
) AS map(column_name, signal_id)
WHERE (
  (map.column_name = 'notable_customers' AND NULLIF(pu.notable_customers, '') IS NOT NULL) OR
  (map.column_name = 'notable_hires' AND NULLIF(pu.notable_hires, '') IS NOT NULL) OR
  (map.column_name = 'other_updates' AND NULLIF(pu.other_updates, '') IS NOT NULL) OR
  (map.column_name = 'quarter_challenges' AND NULLIF(pu.challenges, '') IS NOT NULL) OR
  (map.column_name = 'banking_partner' AND NULLIF(pu.banking_partner, '') IS NOT NULL) OR
  (map.column_name = 'legal_counsel' AND NULLIF(pu.legal_counsel, '') IS NOT NULL) OR
  (map.column_name = 'cloud_provider' AND NULLIF(pu.cloud_provider, '') IS NOT NULL) OR
  (map.column_name = 'cap_table_platform' AND NULLIF(pu.cap_table_platform, '') IS NOT NULL) OR
  (map.column_name = 'do_insurance_provider' AND NULLIF(pu.do_insurance_provider, '') IS NOT NULL) OR
  (map.column_name = 'crm_platform' AND NULLIF(pu.crm_platform, '') IS NOT NULL)
);

--> statement-breakpoint

-- Boolean intro opt-in.
INSERT INTO "signal_observations" (
  "id", "account_id", "company_uuid", "signal_id", "period",
  "value_bool", "confidence", "source", "author_email", "created_at"
)
SELECT
  'obs_' || gen_random_uuid(), pu.account_id, pu.company_uuid,
  'open_to_investor_intros', pu.period,
  pu.open_to_investor_intros, 1.0,
  'portfolio_update:' || pu.id,
  pu.submitted_by_email,
  now()
FROM "portfolio_updates" pu
WHERE pu.open_to_investor_intros IS NOT NULL;
