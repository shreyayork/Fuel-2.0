import * as path from "path";
import { randomUUID } from "node:crypto";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import {
  benchmarks,
  catalogCompanies,
  companies,
  initiatives,
  initiativeTeam,
  people,
  portfolioUpdates,
  fixtureSignals,
  watchlists,
  watchlistCompanies,
  advisors,
} from "../../../../apps/web/src/db/schema";
import { sql as drizzleSql } from "drizzle-orm";
import { fixture } from "../../../../apps/web/src/db/fixture";
import { seedPlaybooksAndBenchmarks } from "../../../../apps/web/src/db/seed-playbooks";
import { seedSignalCatalog } from "../../../../apps/web/src/db/seed-signals";
import { seedFaqDefaults } from "../../../../apps/web/src/db/seed-faq";

export interface PortfolioImportRow {
  name: string;
  companyUuid: string | null;
  domain?: string | null;
  fteCount?: number | null;
  paidCustomerCount?: number | null;
  arrUsd?: number | null;
  arrGrowthYoyPct?: number | null;
  nrrPct?: number | null;
  logoRetentionPct?: number | null;
  grossMarginPct?: number | null;
  cacPaybackMonths?: number | null;
  burnMultiple?: number | null;
  ruleOf40Pct?: number | null;
  cashOnHandUsd?: number | null;
  monthlyBurnUsd?: number | null;
  notableCustomers?: string | null;
  notableHires?: string | null;
  otherUpdates?: string | null;
  challenges?: string | null;
  bankingPartner?: string | null;
  legalCounsel?: string | null;
  cloudProvider?: string | null;
  capTablePlatform?: string | null;
  doInsuranceProvider?: string | null;
  crmPlatform?: string | null;
  openToInvestorIntros?: boolean | null;
}

export interface AdvisorImportRow {
  id: string;
  name: string;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  expertise?: string[] | null;
  focusIndustries?: string[] | null;
  fuelDataPersonId?: string | null;
  publicCard?: boolean;
}

type Event = {
  seed?: boolean;
  force?: boolean;
  importPortfolioUpdates?: {
    accountId?: string;
    period?: string;
    submittedByEmail?: string;
    rows: PortfolioImportRow[];
  };
  importAdvisors?: {
    accountId?: string;
    curatedByEmail?: string;
    rows: AdvisorImportRow[];
  };
  createPortfolio?: {
    accountId: string;
    name: string;
    ownerEmail: string;
    kind?: "portfolio" | "watchlist";
    scope?: "private" | "account" | "team";
    fundName?: string | null;
    companyUuids: Array<{ uuid: string; name: string }>;
  };
};

export const handler = async (event: Event = {}) => {
  const sm = new SecretsManagerClient({});
  const res = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN! }));
  if (!res.SecretString) throw new Error("DB secret has no SecretString");
  const s = JSON.parse(res.SecretString) as { username: string; password: string; dbname?: string };
  const dbname = s.dbname ?? "fuel";
  const connStr = `postgres://${encodeURIComponent(s.username)}:${encodeURIComponent(s.password)}@${process.env.DB_PROXY_ENDPOINT}:5432/${dbname}?sslmode=require`;
  const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });

    // Global content (playbooks + benchmark cohorts) is always idempotently
    // seeded — these are platform libraries, not customer data.
    try {
      const libs = await seedPlaybooksAndBenchmarks(db);
      console.log("seeded libraries", libs);
    } catch (e) {
      console.warn("library seed failed (non-fatal):", (e as Error).message);
    }

    try {
      const sigs = await seedSignalCatalog(db);
      console.log("seeded signal catalog", sigs);
    } catch (e) {
      console.warn("signal catalog seed failed (non-fatal):", (e as Error).message);
    }

    try {
      const faqs = await seedFaqDefaults(db);
      console.log("seeded FAQ defaults", faqs);
    } catch (e) {
      console.warn("FAQ seed failed (non-fatal):", (e as Error).message);
    }

    let seededCount: number | null = null;
    if (event.seed) {
      const [{ count }] = await db
        .select({ count: sql<string>`count(*)::text` })
        .from(companies);
      if (event.force || Number(count) === 0) {
        seededCount = await seedAll(db);
      } else {
        seededCount = 0;
      }
    }

    let importReport: Awaited<ReturnType<typeof runPortfolioImport>> | null = null;
    if (event.importPortfolioUpdates) {
      importReport = await runPortfolioImport(db, event.importPortfolioUpdates);
    }

    let advisorImportReport: Awaited<ReturnType<typeof runAdvisorImport>> | null = null;
    if (event.importAdvisors) {
      advisorImportReport = await runAdvisorImport(db, event.importAdvisors);
    }

    let createPortfolioReport: Awaited<ReturnType<typeof runCreatePortfolio>> | null = null;
    if (event.createPortfolio) {
      createPortfolioReport = await runCreatePortfolio(db, event.createPortfolio);
    }

    if ((event as { diagnosePortfolio?: string }).diagnosePortfolio) {
      const email = (event as { diagnosePortfolio: string }).diagnosePortfolio;
      const wlByKind = await db.execute(drizzleSql`
        SELECT w.kind, count(*) AS n,
          (SELECT count(*) FROM watchlist_companies wc
            JOIN watchlists w2 ON w2.id = wc.watchlist_id
            WHERE w2.kind = w.kind AND w2.owner_email = ${email}
          ) AS company_count
        FROM watchlists w
        WHERE w.owner_email = ${email}
        GROUP BY w.kind
      `);
      const sample = await db.execute(drizzleSql`
        SELECT id, name, kind, fund_name, account_id,
          (SELECT count(*) FROM watchlist_companies wc WHERE wc.watchlist_id = w.id) AS companies
        FROM watchlists w
        WHERE owner_email = ${email}
        ORDER BY w.created_at DESC
        LIMIT 20
      `);
      const updates = await db.execute(drizzleSql`SELECT count(*) AS n FROM portfolio_updates`);
      const catalog = await db.execute(drizzleSql`SELECT count(*) AS n FROM catalog_companies`);
      return {
        ok: true,
        email,
        watchlistsByKind: wlByKind.rows,
        sampleWatchlists: sample.rows,
        portfolioUpdatesTotal: (updates.rows[0] as { n: number } | undefined)?.n ?? 0,
        catalogCompaniesTotal: (catalog.rows[0] as { n: number } | undefined)?.n ?? 0,
      };
    }

    if ((event as { diagnoseAccountMembership?: string }).diagnoseAccountMembership) {
      const email = (event as { diagnoseAccountMembership: string }).diagnoseAccountMembership;
      const prefRow = await db.execute(drizzleSql`
        SELECT value, updated_at FROM user_preferences
        WHERE user_email = ${email} AND key = 'active_account'
        LIMIT 1
      `);
      const preferredAccountId = (prefRow.rows[0] as { value?: string } | undefined)?.value ?? null;
      const allAccounts = await db.execute(drizzleSql`
        SELECT a.id, a.name, a.creator_email,
          (SELECT count(*) FROM account_members am WHERE am.account_id = a.id) AS member_count
        FROM accounts a
        ORDER BY a.name
      `);
      // Match the app's getActiveAccountForUser sort: owner first, then
      // memberCount desc. Alphabetical tiebreak last.
      const myMemberships = await db.execute(drizzleSql`
        SELECT am.account_id, a.name, am.role,
          (SELECT count(*)::int FROM account_members am2 WHERE am2.account_id = am.account_id) AS member_count
        FROM account_members am
        JOIN accounts a ON a.id = am.account_id
        WHERE am.user_email = ${email}
        ORDER BY (am.role = 'owner') DESC,
          (SELECT count(*) FROM account_members am3 WHERE am3.account_id = am.account_id) DESC,
          a.name
      `);
      // App's real algorithm: preference first (if user is still a member),
      // otherwise owner + most-members heuristic.
      const memberIds = new Set((myMemberships.rows as Array<{ account_id: string }>).map((r) => r.account_id));
      const activeAccountId =
        preferredAccountId && memberIds.has(preferredAccountId)
          ? preferredAccountId
          : ((myMemberships.rows[0] as { account_id?: string } | undefined)?.account_id ?? null);
      const membersOfActive = activeAccountId
        ? await db.execute(drizzleSql`
            SELECT user_email, role, created_at, accepted_at
            FROM account_members
            WHERE account_id = ${activeAccountId}
            ORDER BY created_at DESC
          `)
        : { rows: [] };
      return {
        ok: true,
        email,
        preferredAccountId,
        activeAccountId: activeAccountId ?? null,
        myMemberships: myMemberships.rows,
        membersOfActiveAccount: membersOfActive.rows,
        allAccounts: allAccounts.rows,
      };
    }

    if ((event as { diagnoseSlack?: boolean }).diagnoseSlack) {
      const conns = await db.execute(drizzleSql`
        SELECT id, account_id, status, installed_by_email, installed_at,
               account_external_id,
               (metadata->>'teamName') AS team_name,
               (metadata->>'teamId') AS team_id,
               (metadata->>'botUserId') AS bot_user_id,
               CASE WHEN credentials IS NOT NULL THEN true ELSE false END AS has_token
        FROM integration_connections
        WHERE provider = 'slack'
        ORDER BY installed_at DESC
      `);
      const subs = await db.execute(drizzleSql`
        SELECT id, account_id, connection_id, provider_channel_id,
               provider_channel_name, is_private, enabled, last_event_at
        FROM integration_channel_subscriptions
        WHERE provider = 'slack'
        ORDER BY created_at DESC
      `);
      const recentMsgs = await db.execute(drizzleSql`
        SELECT id, company_uuid, source, source_external_id, occurred_at,
               LEFT(content, 160) AS head, metadata
        FROM context_items
        WHERE kind = 'slack_message'
        ORDER BY occurred_at DESC
        LIMIT 10
      `);
      return {
        ok: true,
        connections: conns.rows,
        subscriptions: subs.rows,
        recentMessages: recentMsgs.rows,
      };
    }

    if ((event as { diagnoseCompanyScope?: { accountId: string; needle: string } }).diagnoseCompanyScope) {
      const opts = (event as { diagnoseCompanyScope: { accountId: string; needle: string } }).diagnoseCompanyScope;
      const needle = `%${opts.needle.toLowerCase()}%`;
      const pipeline = await db.execute(drizzleSql`
        SELECT pc.provider_deal_id, pc.provider_company_id, pc.company_name,
               pc.company_domain, pc.fuel_data_uuid, pc.deal_name, pc.pipeline_config_id
        FROM pipeline_companies pc
        WHERE pc.account_id = ${opts.accountId}
          AND (LOWER(COALESCE(pc.company_name,'')) LIKE ${needle}
               OR LOWER(COALESCE(pc.deal_name,'')) LIKE ${needle}
               OR LOWER(COALESCE(pc.company_domain,'')) LIKE ${needle})
        LIMIT 5
      `);
      const watchlist = await db.execute(drizzleSql`
        SELECT wc.watchlist_id, wc.company_uuid, wc.name, w.name AS watchlist_name
        FROM watchlist_companies wc
        JOIN watchlists w ON w.id = wc.watchlist_id
        WHERE w.account_id = ${opts.accountId}
          AND LOWER(COALESCE(wc.name,'')) LIKE ${needle}
        LIMIT 5
      `);
      const links = await db.execute(drizzleSql`
        SELECT provider_object_type, provider_object_id, provider_domain,
               fuel_data_uuid, resolution_source
        FROM integration_company_links
        WHERE account_id = ${opts.accountId}
          AND LOWER(COALESCE(provider_domain,'')) LIKE ${needle}
        LIMIT 5
      `);
      const contextItems = await db.execute(drizzleSql`
        SELECT ci.id, ci.source, ci.title, ci.company_uuid, ci.occurred_at
        FROM context_items ci
        WHERE ci.account_id = ${opts.accountId}
          AND (LOWER(COALESCE(ci.title,'')) LIKE ${needle}
               OR LOWER(COALESCE(ci.content,'')) LIKE ${needle})
        ORDER BY ci.occurred_at DESC
        LIMIT 5
      `);
      return {
        ok: true,
        needle: opts.needle,
        pipeline: pipeline.rows,
        watchlist: watchlist.rows,
        integrationCompanyLinks: links.rows,
        matchingContextItems: contextItems.rows,
      };
    }

    if ((event as { platformStats?: boolean }).platformStats) {
      const counts = await db.execute(drizzleSql`
        SELECT
          (SELECT count(*)::int FROM context_items) AS context_items_total,
          (SELECT count(*)::int FROM context_items WHERE source LIKE 'hubspot:%') AS context_items_hubspot,
          (SELECT count(*)::int FROM context_items WHERE source LIKE 'granola:%') AS context_items_granola,
          (SELECT count(*)::int FROM context_items WHERE source LIKE 'slack:%') AS context_items_slack,
          (SELECT count(*)::int FROM context_items WHERE created_at > NOW() - INTERVAL '7 days') AS context_items_last_7d,
          (SELECT count(*)::int FROM context_items WHERE created_at > NOW() - INTERVAL '24 hours') AS context_items_last_24h,
          (SELECT count(*)::int FROM signal_observations) AS signal_observations_total,
          (SELECT count(*)::int FROM signal_observations WHERE superseded_at IS NULL) AS signal_observations_active,
          (SELECT count(*)::int FROM signal_observations WHERE created_at > NOW() - INTERVAL '7 days') AS signal_observations_last_7d,
          (SELECT count(*)::int FROM signals) AS signals_catalog_total,
          (SELECT count(*)::int FROM benchmark_cohorts) AS benchmark_cohorts_total,
          (SELECT count(*)::int FROM playbooks) AS playbooks_total,
          (SELECT count(*)::int FROM watchlists) AS watchlists_total,
          (SELECT count(*)::int FROM watchlist_companies) AS watchlist_company_rows,
          (SELECT count(DISTINCT company_uuid)::int FROM watchlist_companies) AS watchlist_companies_distinct,
          (SELECT count(*)::int FROM catalog_companies) AS catalog_companies,
          (SELECT count(*)::int FROM pipeline_companies) AS pipeline_companies_total,
          (SELECT count(DISTINCT fuel_data_uuid)::int FROM pipeline_companies WHERE fuel_data_uuid IS NOT NULL) AS pipeline_matched_distinct,
          (SELECT count(*)::int FROM integration_connections WHERE status = 'connected') AS integrations_connected,
          (SELECT count(*)::int FROM integration_company_links) AS integration_company_links,
          (SELECT count(*)::int FROM advisors WHERE status = 'active') AS advisors_active,
          (SELECT count(*)::int FROM artifacts) AS artifacts_total,
          (SELECT count(*)::int FROM portfolio_updates) AS portfolio_updates_total,
          (SELECT count(*)::int FROM accounts) AS accounts_total,
          (SELECT count(*)::int FROM account_members) AS account_members_total,
          (SELECT count(*)::int FROM agent_runs) AS agent_runs_total,
          (SELECT coalesce(sum(cost_tokens), 0)::int FROM agent_runs) AS agent_tokens_spent
      `);
      return { ok: true, stats: counts.rows[0] ?? null };
    }

    if ((event as { exportCompanySignals?: boolean }).exportCompanySignals) {
      // Wide-format export: one row per company with an active arr_usd
      // observation, latest active value per signal pivoted into columns.
      // Numeric signals come from value_numeric, qualitative from value_text,
      // boolean from value_bool. Stage-of-growth resolves preferentially to
      // the company's own `current_round_stage` (qualitative) and otherwise
      // a coarse bracket derived from ARR magnitude.
      const rows = await db.execute(drizzleSql`
        WITH latest AS (
          SELECT DISTINCT ON (company_uuid, signal_id)
            company_uuid, signal_id,
            value_numeric, value_text, value_bool,
            period, as_of, created_at
          FROM signal_observations
          WHERE superseded_at IS NULL
          ORDER BY company_uuid, signal_id,
                   COALESCE(as_of::text, period) DESC, created_at DESC
        ),
        with_arr AS (
          SELECT DISTINCT company_uuid
          FROM latest
          WHERE signal_id = 'arr_usd' AND value_numeric IS NOT NULL
        ),
        pivoted AS (
          SELECT
            l.company_uuid,
            MAX(value_numeric) FILTER (WHERE signal_id = 'arr_usd')                    AS arr_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'arr_growth_yoy_pct')         AS arr_growth_yoy_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'arr_growth_qoq_pct')         AS arr_growth_qoq_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'arr_growth_planned_pct')     AS arr_growth_planned_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'mrr_usd')                    AS mrr_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'new_arr_usd')                AS new_arr_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'new_logo_arr_usd')           AS new_logo_arr_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'expansion_arr_usd')          AS expansion_arr_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'expansion_arr_share_pct')    AS expansion_arr_share_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'paid_customer_count')        AS paid_customer_count,
            MAX(value_numeric) FILTER (WHERE signal_id = 'new_logos_count')            AS new_logos_count,
            MAX(value_numeric) FILTER (WHERE signal_id = 'churned_logos_count')        AS churned_logos_count,
            MAX(value_numeric) FILTER (WHERE signal_id = 'nrr_pct')                    AS nrr_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'grr_pct')                    AS grr_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'logo_retention_pct')         AS logo_retention_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'churn_rate_pct')             AS churn_rate_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'gross_arr_churn_pct')        AS gross_arr_churn_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'cac_payback_months')         AS cac_payback_months,
            MAX(value_numeric) FILTER (WHERE signal_id = 'fully_loaded_cac_payback_months') AS fully_loaded_cac_payback_months,
            MAX(value_numeric) FILTER (WHERE signal_id = 'new_cac_ratio')              AS new_cac_ratio,
            MAX(value_numeric) FILTER (WHERE signal_id = 'blended_cac_ratio')          AS blended_cac_ratio,
            MAX(value_numeric) FILTER (WHERE signal_id = 'burn_multiple')              AS burn_multiple,
            MAX(value_numeric) FILTER (WHERE signal_id = 'rule_of_40_pct')             AS rule_of_40_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'gross_magic_number')         AS gross_magic_number,
            MAX(value_numeric) FILTER (WHERE signal_id = 'net_magic_number')           AS net_magic_number,
            MAX(value_numeric) FILTER (WHERE signal_id = 'gross_margin_pct')           AS gross_margin_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'gross_margin_subscription_pct') AS gross_margin_subscription_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'ltv_cac_ratio')              AS ltv_cac_ratio,
            MAX(value_numeric) FILTER (WHERE signal_id = 'cash_on_hand_usd')           AS cash_on_hand_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'monthly_burn_usd')           AS monthly_burn_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'runway_months')              AS runway_months,
            MAX(value_numeric) FILTER (WHERE signal_id = 'ebitda_margin_pct')          AS ebitda_margin_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'fcf_margin_pct')             AS fcf_margin_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'sm_pct_revenue')             AS sm_pct_revenue,
            MAX(value_numeric) FILTER (WHERE signal_id = 'rd_pct_revenue')             AS rd_pct_revenue,
            MAX(value_numeric) FILTER (WHERE signal_id = 'ga_pct_revenue')             AS ga_pct_revenue,
            MAX(value_numeric) FILTER (WHERE signal_id = 'arr_to_capital_raised_ratio') AS arr_to_capital_raised_ratio,
            MAX(value_numeric) FILTER (WHERE signal_id = 'capital_raised_total_usd')   AS capital_raised_total_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'fte_count')                  AS fte_count,
            MAX(value_numeric) FILTER (WHERE signal_id = 'arr_per_fte_usd')            AS arr_per_fte_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'engineering_headcount')      AS engineering_headcount,
            MAX(value_numeric) FILTER (WHERE signal_id = 'sales_headcount')            AS sales_headcount,
            MAX(value_numeric) FILTER (WHERE signal_id = 'ae_headcount')               AS ae_headcount,
            MAX(value_numeric) FILTER (WHERE signal_id = 'sdr_bdr_headcount')          AS sdr_bdr_headcount,
            MAX(value_numeric) FILTER (WHERE signal_id = 'csm_headcount')              AS csm_headcount,
            MAX(value_numeric) FILTER (WHERE signal_id = 'acv_usd')                    AS acv_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'average_deal_size_usd')      AS average_deal_size_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'sales_cycle_days')           AS sales_cycle_days,
            MAX(value_numeric) FILTER (WHERE signal_id = 'win_rate_pct')               AS win_rate_pct,
            MAX(value_numeric) FILTER (WHERE signal_id = 'last_round_pre_money_valuation_usd') AS last_round_pre_money_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'last_round_ev_arr_multiple') AS last_round_ev_arr_multiple,
            MAX(value_numeric) FILTER (WHERE signal_id = 'months_since_last_round')    AS months_since_last_round,
            MAX(value_numeric) FILTER (WHERE signal_id = 'current_round_target_amount_usd')   AS current_round_target_amount_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'current_round_committed_amount_usd') AS current_round_committed_amount_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'current_round_target_post_money_usd') AS current_round_target_post_money_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'current_round_valuation_cap_usd')    AS current_round_valuation_cap_usd,
            MAX(value_numeric) FILTER (WHERE signal_id = 'nps_score')                  AS nps_score,
            MAX(value_numeric) FILTER (WHERE signal_id = 'dau_count')                  AS dau_count,
            MAX(value_numeric) FILTER (WHERE signal_id = 'mau_count')                  AS mau_count,
            MAX(value_text)    FILTER (WHERE signal_id = 'current_round_stage')        AS current_round_stage,
            MAX(value_text)    FILTER (WHERE signal_id = 'current_round_type')         AS current_round_type,
            MAX(value_text)    FILTER (WHERE signal_id = 'current_round_lead_investor') AS current_round_lead_investor,
            MAX(value_text)    FILTER (WHERE signal_id = 'pricing_model')              AS pricing_model,
            MAX(value_text)    FILTER (WHERE signal_id = 'go_to_market_motion')        AS go_to_market_motion,
            MAX(value_text)    FILTER (WHERE signal_id = 'sector_category')            AS sector_category,
            MAX(value_text)    FILTER (WHERE signal_id = 'ai_selection_category')      AS ai_selection_category,
            MAX(value_text)    FILTER (WHERE signal_id = 'ai_monetization_status')     AS ai_monetization_status,
            MAX(value_text)    FILTER (WHERE signal_id = 'financing_source')           AS financing_source,
            MAX(value_text)    FILTER (WHERE signal_id = 'notable_customers')          AS notable_customers,
            MAX(value_text)    FILTER (WHERE signal_id = 'notable_hires')              AS notable_hires,
            MAX(value_text)    FILTER (WHERE signal_id = 'banking_partner')            AS banking_partner,
            MAX(value_text)    FILTER (WHERE signal_id = 'cloud_provider')             AS cloud_provider,
            MAX(value_text)    FILTER (WHERE signal_id = 'crm_platform')               AS crm_platform,
            BOOL_OR(value_bool) FILTER (WHERE signal_id = 'actively_fundraising')      AS actively_fundraising,
            BOOL_OR(value_bool) FILTER (WHERE signal_id = 'open_to_investor_intros')   AS open_to_investor_intros,
            BOOL_OR(value_bool) FILTER (WHERE signal_id = 'met_rule_of_40_flag')       AS met_rule_of_40_flag,
            BOOL_OR(value_bool) FILTER (WHERE signal_id = 'breakeven_achieved_flag')   AS breakeven_achieved_flag,
            MAX(COALESCE(as_of::text, period))                                               AS latest_period,
            COUNT(*)::int                                                              AS active_signal_count
          FROM latest l
          JOIN with_arr w USING (company_uuid)
          GROUP BY l.company_uuid
        ),
        names AS (
          SELECT DISTINCT ON (fuel_data_uuid)
            fuel_data_uuid AS company_uuid,
            company_name,
            company_domain,
            company_industry
          FROM pipeline_companies
          WHERE fuel_data_uuid IS NOT NULL
          ORDER BY fuel_data_uuid, last_seen_at DESC
        ),
        wlnames AS (
          SELECT DISTINCT ON (company_uuid)
            company_uuid, name AS wl_name
          FROM watchlist_companies
          ORDER BY company_uuid, added_at DESC
        )
        SELECT
          COALESCE(n.company_name, w.wl_name) AS company_name,
          n.company_domain,
          n.company_industry,
          CASE
            WHEN p.current_round_stage IS NOT NULL THEN p.current_round_stage
            WHEN p.arr_usd IS NULL                  THEN NULL
            WHEN p.arr_usd <  1000000               THEN 'Pre-seed (ARR <$1M)'
            WHEN p.arr_usd <  5000000               THEN 'Seed ($1-5M ARR)'
            WHEN p.arr_usd < 15000000               THEN 'Series A / Early ($5-15M ARR)'
            WHEN p.arr_usd < 50000000               THEN 'Series B / Growth ($15-50M ARR)'
            WHEN p.arr_usd < 150000000              THEN 'Series C / Scale ($50-150M ARR)'
            ELSE                                         'Late-stage / Public ($150M+ ARR)'
          END AS stage_of_growth,
          p.*
        FROM pivoted p
        LEFT JOIN names n  ON n.company_uuid = p.company_uuid
        LEFT JOIN wlnames w ON w.company_uuid = p.company_uuid
        ORDER BY p.arr_usd DESC NULLS LAST
      `);
      return { ok: true, count: rows.rows.length, rows: rows.rows };
    }

    if ((event as { inspectItem?: { id: string } }).inspectItem) {
      const opts = (event as { inspectItem: { id: string } }).inspectItem;
      const rows = await db.execute(drizzleSql`
        SELECT
          ci.id, ci.kind, ci.source, ci.author_email, ci.title,
          ci.content, ci.occurred_at, ci.last_extracted_at, ci.company_uuid,
          (SELECT json_agg(json_build_object(
            'signal_id', so.signal_id,
            'label', s.label,
            'value_numeric', so.value_numeric,
            'value_text', so.value_text,
            'value_bool', so.value_bool,
            'confidence', so.confidence,
            'raw_snippet', so.raw_snippet
          )) FROM signal_observations so JOIN signals s ON s.id = so.signal_id
          WHERE so.context_item_id = ci.id AND so.superseded_at IS NULL) AS observations
        FROM context_items ci
        WHERE ci.id = ${opts.id}
      `);
      return { ok: true, item: rows.rows[0] ?? null };
    }

    if ((event as { dumpCompanyItems?: { accountId: string; companyUuid: string; limit?: number } }).dumpCompanyItems) {
      const opts = (event as { dumpCompanyItems: { accountId: string; companyUuid: string; limit?: number } }).dumpCompanyItems;
      const rows = await db.execute(drizzleSql`
        SELECT
          ci.id, ci.kind, ci.source, ci.author_email, ci.title,
          ci.occurred_at, ci.last_extracted_at,
          LEFT(ci.content, 800) AS content_head,
          (SELECT count(*) FROM signal_observations so WHERE so.context_item_id = ci.id AND so.superseded_at IS NULL)::int AS obs_count
        FROM context_items ci
        WHERE ci.account_id = ${opts.accountId}
          AND ci.company_uuid = ${opts.companyUuid}
        ORDER BY ci.occurred_at DESC
        LIMIT ${opts.limit ?? 40}
      `);
      return { ok: true, items: rows.rows };
    }

    if ((event as { diagnoseCompanyObservations?: { accountId: string; companyUuid: string; limit?: number } }).diagnoseCompanyObservations) {
      const opts = (event as { diagnoseCompanyObservations: { accountId: string; companyUuid: string; limit?: number } }).diagnoseCompanyObservations;
      const limit = opts.limit ?? 40;
      const rows = await db.execute(drizzleSql`
        SELECT
          so.signal_id, s.label, s.kind, s.unit, s.category, so.period,
          so.value_numeric, so.value_text, so.value_bool, so.confidence,
          so.raw_snippet, so.context_item_id, so.created_at,
          LEFT(ci.content, 400) AS source_content_head,
          ci.source AS context_source,
          ci.author_email AS context_author,
          ci.title AS context_title
        FROM signal_observations so
        JOIN signals s ON s.id = so.signal_id
        LEFT JOIN context_items ci ON ci.id = so.context_item_id
        WHERE so.account_id = ${opts.accountId}
          AND so.company_uuid = ${opts.companyUuid}
          AND so.superseded_at IS NULL
        ORDER BY so.created_at DESC
        LIMIT ${limit}
      `);
      const subjectName = await db.execute(drizzleSql`
        SELECT
          (SELECT name FROM watchlist_companies WHERE company_uuid = ${opts.companyUuid} LIMIT 1) AS watchlist_name,
          (SELECT name FROM catalog_companies WHERE id = ${opts.companyUuid} LIMIT 1) AS catalog_name
      `);
      return {
        ok: true,
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        subjectLookup: subjectName.rows[0] ?? null,
        observations: rows.rows,
      };
    }

    if ((event as { diagnoseSignals?: boolean }).diagnoseSignals) {
      const rows = await db.execute(drizzleSql`
        SELECT so.signal_id, s.label, s.kind, s.unit, so.period,
               so.value_numeric, so.value_text, so.value_bool, so.confidence,
               LEFT(so.raw_snippet, 120) AS snippet,
               so.company_uuid, so.context_item_id, so.created_at
        FROM signal_observations so
        JOIN signals s ON s.id = so.signal_id
        ORDER BY so.created_at DESC
        LIMIT 40
      `);
      // Aggregate counts so retroExtract progress is observable without
      // guessing from the latest-40 sample. Per-account + HubSpot gap
      // when accountId is passed in.
      const accountId = (event as { accountId?: string }).accountId;
      const totals = await db.execute(
        accountId
          ? drizzleSql`
              SELECT
                count(*)::int AS total_observations,
                count(DISTINCT so.context_item_id)::int AS items_with_any,
                count(*) FILTER (WHERE so.created_at > NOW() - INTERVAL '1 minute')::int AS last_1min,
                count(*) FILTER (WHERE so.created_at > NOW() - INTERVAL '5 minutes')::int AS last_5min,
                count(*) FILTER (WHERE so.created_at > NOW() - INTERVAL '1 hour')::int AS last_1h,
                max(so.created_at) AS latest
              FROM signal_observations so
              WHERE so.account_id = ${accountId}
            `
          : drizzleSql`
              SELECT
                count(*)::int AS total_observations,
                count(DISTINCT so.context_item_id)::int AS items_with_any,
                count(*) FILTER (WHERE so.created_at > NOW() - INTERVAL '1 minute')::int AS last_1min,
                count(*) FILTER (WHERE so.created_at > NOW() - INTERVAL '5 minutes')::int AS last_5min,
                count(*) FILTER (WHERE so.created_at > NOW() - INTERVAL '1 hour')::int AS last_1h,
                max(so.created_at) AS latest
              FROM signal_observations so
            `,
      );
      const hubspotGap = accountId
        ? await db.execute(drizzleSql`
            SELECT
              count(*) FILTER (WHERE ci.source LIKE 'hubspot:email:%')::int AS hs_emails_total,
              count(*) FILTER (WHERE ci.source LIKE 'hubspot:note:%')::int AS hs_notes_total,
              count(*) FILTER (
                WHERE ci.source LIKE 'hubspot:email:%'
                  AND NOT EXISTS (SELECT 1 FROM signal_observations so WHERE so.context_item_id = ci.id)
              )::int AS hs_emails_unextracted,
              count(*) FILTER (
                WHERE ci.source LIKE 'hubspot:note:%'
                  AND NOT EXISTS (SELECT 1 FROM signal_observations so WHERE so.context_item_id = ci.id)
              )::int AS hs_notes_unextracted,
              -- Truly-pending = never-tried under the last_extracted_at
              -- semantics. When this hits 0 the cost-leak is closed even
              -- if hs_emails_unextracted is still non-zero (those items
              -- have simply been confirmed as having nothing to extract).
              count(*) FILTER (
                WHERE ci.source LIKE 'hubspot:email:%' AND ci.last_extracted_at IS NULL
              )::int AS hs_emails_pending,
              count(*) FILTER (
                WHERE ci.source LIKE 'hubspot:note:%' AND ci.last_extracted_at IS NULL
              )::int AS hs_notes_pending
            FROM context_items ci
            WHERE ci.account_id = ${accountId}
          `)
        : null;
      return {
        ok: true,
        totals: totals.rows[0] ?? null,
        hubspotGap: hubspotGap?.rows[0] ?? null,
        observations: rows.rows,
      };
    }

    if ((event as { retroExtract?: { accountId?: string; limit?: number; concurrency?: number; onlyMissing?: boolean; sourcePrefix?: string; retryAfterDays?: number } }).retroExtract) {
      const opts = (event as { retroExtract: { accountId?: string; limit?: number; concurrency?: number; onlyMissing?: boolean; sourcePrefix?: string; retryAfterDays?: number } }).retroExtract;
      const extractMod = await import("../../../../apps/web/src/lib/context/extract");
      const { contextItems } = await import("../../../../apps/web/src/db/schema");
      const { and, eq, isNull, isNotNull, like, lt, or, sql: dsql } = await import("drizzle-orm");
      // Default `onlyMissing` to true — the common case is catching up
      // items the bulk backfill skipped. Pass `{onlyMissing: false}` to
      // force-reprocess items that already have observations (e.g. after
      // a signal-catalog change).
      const onlyMissing = opts.onlyMissing !== false;
      const filters = [isNotNull(contextItems.companyUuid)];
      if (opts.accountId) filters.push(eq(contextItems.accountId, opts.accountId));
      if (opts.sourcePrefix) filters.push(like(contextItems.source, `${opts.sourcePrefix}%`));

      // "Pending extraction" = never ran (last_extracted_at IS NULL), or —
      // when retryAfterDays is set — last ran more than N days ago, which
      // is how we periodically re-run after a signal-catalog update.
      // Previously this was `NOT EXISTS signal_observations` which re-paid
      // Claude for every 1-line reply with no extractable signal on every
      // pass. See migration 0038.
      if (onlyMissing) {
        if (opts.retryAfterDays && opts.retryAfterDays > 0) {
          filters.push(
            or(
              isNull(contextItems.lastExtractedAt),
              lt(
                contextItems.lastExtractedAt,
                dsql`NOW() - INTERVAL '${dsql.raw(String(Math.floor(opts.retryAfterDays)))} days'`,
              ),
            )!,
          );
        } else {
          filters.push(isNull(contextItems.lastExtractedAt));
        }
      }
      const where = and(...filters);
      const q = db.select().from(contextItems).where(where);
      const rows = opts.limit ? await q.limit(opts.limit) : await q;
      let extracted = 0;
      let skipped = 0;
      let errors = 0;
      let observations = 0;
      let processed = 0;
      // Bounded concurrency — Claude Haiku calls at ~1-1.5s each; running
      // 5 in parallel takes a 500-item retro-extract from ~12 min to ~2.5
      // min inside the 15-min Lambda ceiling. Bump higher if rate limits
      // allow, lower if we start seeing 429s.
      const concurrency = Math.max(1, Math.min(20, opts.concurrency ?? 5));
      let cursor = 0;
      const worker = async () => {
        while (true) {
          const i = cursor++;
          if (i >= rows.length) return;
          const item = rows[i];
          try {
            const res = await extractMod.onContextItemCreated(item);
            if (res.error) {
              if (["too_short", "no_company", "no_signals"].includes(res.error)) skipped++;
              else errors++;
            } else {
              extracted++;
              observations += res.observations;
            }
          } catch {
            errors++;
          }
          processed++;
          if (processed % 25 === 0) {
            console.log(
              `[retro-extract] ${processed}/${rows.length} — extracted=${extracted} skipped=${skipped} errors=${errors} observations=${observations}`,
            );
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()),
      );
      return {
        ok: true,
        total: rows.length,
        extracted,
        skipped,
        errors,
        observations,
        accountId: opts.accountId ?? null,
        onlyMissing,
        concurrency,
      };
    }

    if ((event as { reconcileHubspot?: { accountId?: string } }).reconcileHubspot) {
      const pipelines = await import("../../../../apps/web/src/lib/pipelines");
      const accountId = (event as { reconcileHubspot: { accountId?: string } }).reconcileHubspot
        .accountId;
      const res = accountId
        ? await pipelines.syncAllEnabledHubspotPipelines({ accountId })
        : await pipelines.reconcileAllAccounts();
      return { ok: true, res };
    }

    if ((event as { probeDomainMapping?: string }).probeDomainMapping) {
      const d = (event as { probeDomainMapping: string }).probeDomainMapping;
      const fd = await import("../../../../apps/web/src/lib/fuel-data");
      async function osearch(body: unknown) {
        const aws4Mod = (await import("aws4")) as typeof import("aws4");
        const endpoint = process.env.FUEL_DATA_OPENSEARCH_ENDPOINT!;
        const host = endpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const bodyStr = JSON.stringify(body);
        const signed = aws4Mod.sign({
          host, method: "POST", path: "/organizations/_search",
          service: "es", region: process.env.AWS_REGION || "us-east-2",
          headers: { "Content-Type": "application/json" },
          body: bodyStr,
        });
        const res = await fetch(`${endpoint.replace(/\/$/, "")}/organizations/_search`, {
          method: "POST", headers: signed.headers as Record<string, string>, body: bodyStr,
        });
        return res.json() as Promise<{ hits?: { hits?: Array<{ _id: string; _source?: Record<string, unknown> }> } }>;
      }
      const [asKeyword, asPlain, asText] = await Promise.all([
        osearch({ size: 1, query: { term: { "domain.keyword": { value: d } } } }),
        osearch({ size: 1, query: { term: { domain: { value: d } } } }),
        osearch({ size: 1, query: { match: { domain: d } } }),
      ]);
      void fd;
      return {
        ok: true,
        domain: d,
        "term domain.keyword": (asKeyword.hits?.hits ?? []).map((h) => ({ id: h._id, name: h._source?.name, domain: h._source?.domain })),
        "term domain": (asPlain.hits?.hits ?? []).map((h) => ({ id: h._id, name: h._source?.name, domain: h._source?.domain })),
        "match domain": (asText.hits?.hits ?? []).map((h) => ({ id: h._id, name: h._source?.name, domain: h._source?.domain })),
      };
    }

    if ((event as { lookupCompany?: string }).lookupCompany) {
      const name = (event as { lookupCompany: string }).lookupCompany;
      const needle = name.toLowerCase();
      const catalog = await db.execute(drizzleSql`
        SELECT id, account_id, name, domain, website FROM catalog_companies
        WHERE LOWER(name) LIKE ${"%" + needle + "%"}
           OR LOWER(COALESCE(domain,'')) LIKE ${"%" + needle + "%"}
           OR LOWER(COALESCE(website,'')) LIKE ${"%" + needle + "%"}
        LIMIT 10
      `);
      const fd = await import("../../../../apps/web/src/lib/fuel-data");
      let byDomain: unknown = null;
      try { byDomain = await fd.getCompanyByDomain("eulerapp.com"); } catch (e) { byDomain = { err: (e as Error).message }; }
      let byDomainAlt: unknown = null;
      try { byDomainAlt = await fd.getCompanyByDomain("euler.com"); } catch (e) { byDomainAlt = { err: (e as Error).message }; }
      let search: unknown = null;
      try { search = (await fd.searchCompanies(name, 8)).map((s) => ({ uuid: s.uuid, name: s.name, domain: s.domain })); } catch (e) { search = { err: (e as Error).message }; }
      return {
        ok: true,
        catalog: catalog.rows,
        byDomain_eulerapp: byDomain,
        byDomain_euler_com: byDomainAlt,
        searchByName: search,
      };
    }

    if ((event as { probeFuelData?: boolean }).probeFuelData) {
      const fd = await import("../../../../apps/web/src/lib/fuel-data");
      const results: Record<string, unknown> = {};
      try {
        const t0 = Date.now();
        const hit = await fd.getCompanyByDomain("eulerapp.com");
        results.opensearch = { ok: true, ms: Date.now() - t0, hit: hit?.name ?? null };
      } catch (e) {
        results.opensearch = { ok: false, err: (e as Error).message?.slice(0, 400) };
      }
      try {
        const t0 = Date.now();
        const sample = await fd.searchCompanies("Euler", 3);
        results.searchCompanies = { ok: true, ms: Date.now() - t0, names: sample.map((s) => s.name) };
      } catch (e) {
        results.searchCompanies = { ok: false, err: (e as Error).message?.slice(0, 400) };
      }
      try {
        const t0 = Date.now();
        const res = await fd.neptuneQuery<number[]>("g.V().limit(1).count()");
        results.neptune = { ok: true, ms: Date.now() - t0, count: res };
      } catch (e) {
        results.neptune = { ok: false, err: (e as Error).message?.slice(0, 400) };
      }
      return { ok: true, probes: results };
    }

    if ((event as { sampleFuelDataUuid?: boolean }).sampleFuelDataUuid) {
      const pc = await db.execute(drizzleSql`
        SELECT fuel_data_uuid, company_name, company_domain FROM pipeline_companies
        WHERE fuel_data_uuid IS NOT NULL LIMIT 5
      `);
      const ctx = await db.execute(drizzleSql`
        SELECT DISTINCT company_uuid, title FROM context_items
        WHERE company_uuid IS NOT NULL AND company_uuid NOT LIKE 'cat_%' LIMIT 5
      `);
      const wc = await db.execute(drizzleSql`
        SELECT DISTINCT company_uuid, name FROM watchlist_companies
        WHERE company_uuid NOT LIKE 'cat_%' LIMIT 5
      `);
      return { ok: true, pipeline: pc.rows, context: ctx.rows, watchlist: wc.rows };
    }

    if ((event as { diagnoseAssociations?: boolean }).diagnoseAssociations) {
      // Check how many stored raw_deal blobs actually have an `associations`
      // key at all. If near-zero, the batch-read isn't returning associations.
      const withAssoc = await db.execute(drizzleSql`
        SELECT count(*)::text AS n FROM pipeline_companies
        WHERE (raw_deal->'associations') IS NOT NULL
      `);
      const withCoAssoc = await db.execute(drizzleSql`
        SELECT count(*)::text AS n FROM pipeline_companies
        WHERE jsonb_array_length(COALESCE(raw_deal->'associations'->'companies'->'results', '[]'::jsonb)) > 0
      `);
      const withContactAssoc = await db.execute(drizzleSql`
        SELECT count(*)::text AS n FROM pipeline_companies
        WHERE jsonb_array_length(COALESCE(raw_deal->'associations'->'contacts'->'results', '[]'::jsonb)) > 0
      `);
      const sampleMatched = await db.execute(drizzleSql`
        SELECT deal_name, fuel_data_uuid,
          (raw_deal->'associations') AS associations,
          (raw_company) AS raw_company
        FROM pipeline_companies
        WHERE fuel_data_uuid IS NOT NULL
        LIMIT 3
      `);
      const sampleUnmatchedEuler = await db.execute(drizzleSql`
        SELECT deal_name, (raw_deal->'associations') AS associations, raw_company
        FROM pipeline_companies
        WHERE deal_name ILIKE '%euler%'
      `);
      return {
        ok: true,
        dealsWithAnyAssociations: (withAssoc.rows[0] as { n?: string } | undefined)?.n,
        dealsWithCompanyAssoc: (withCoAssoc.rows[0] as { n?: string } | undefined)?.n,
        dealsWithContactAssoc: (withContactAssoc.rows[0] as { n?: string } | undefined)?.n,
        sampleMatched: sampleMatched.rows,
        eulerDeals: sampleUnmatchedEuler.rows,
      };
    }

    if ((event as { diagnoseSyncState?: boolean }).diagnoseSyncState) {
      const total = await db.execute(drizzleSql`SELECT count(*)::text AS n FROM pipeline_companies`);
      const matched = await db.execute(
        drizzleSql`SELECT count(*)::text AS n FROM pipeline_companies WHERE fuel_data_uuid IS NOT NULL`,
      );
      const haveDomain = await db.execute(
        drizzleSql`SELECT count(*)::text AS n FROM pipeline_companies WHERE company_domain IS NOT NULL`,
      );
      const haveName = await db.execute(
        drizzleSql`SELECT count(*)::text AS n FROM pipeline_companies WHERE company_name IS NOT NULL`,
      );
      const configs = await db.execute(
        drizzleSql`SELECT id, label, last_sync_at, sync_state FROM integration_pipeline_configs ORDER BY last_sync_at DESC`,
      );
      // Sample 5 unmatched deals with a domain — these should have matched.
      const sampleUnmatchedWithDomain = await db.execute(drizzleSql`
        SELECT deal_name, company_name, company_domain
        FROM pipeline_companies
        WHERE fuel_data_uuid IS NULL AND company_domain IS NOT NULL
        LIMIT 5
      `);
      return {
        ok: true,
        total: (total.rows[0] as { n?: string } | undefined)?.n,
        matched: (matched.rows[0] as { n?: string } | undefined)?.n,
        withDomain: (haveDomain.rows[0] as { n?: string } | undefined)?.n,
        withName: (haveName.rows[0] as { n?: string } | undefined)?.n,
        configs: configs.rows,
        sampleUnmatchedWithDomain: sampleUnmatchedWithDomain.rows,
      };
    }

    if ((event as { diagnoseDeal?: string }).diagnoseDeal) {
      const needle = (event as { diagnoseDeal: string }).diagnoseDeal.toLowerCase();
      const rows = await db.execute(drizzleSql`
        SELECT id, account_id, provider_deal_id, provider_pipeline_stage_id,
               company_name, company_domain, fuel_data_uuid, deal_name,
               raw_deal, raw_company
        FROM pipeline_companies
        WHERE LOWER(COALESCE(company_name,'')) LIKE ${"%" + needle + "%"}
           OR LOWER(COALESCE(deal_name,'')) LIKE ${"%" + needle + "%"}
           OR LOWER(COALESCE(company_domain,'')) LIKE ${"%" + needle + "%"}
        LIMIT 5
      `);
      return { ok: true, rows: rows.rows };
    }

    if ((event as { reassignAccountData?: { from: string; to: string; dryRun?: boolean } }).reassignAccountData) {
      const opts = (event as { reassignAccountData: { from: string; to: string; dryRun?: boolean } })
        .reassignAccountData;
      // Every table with an account_id column that holds user-created data.
      // Account-membership + teams are NOT moved — those are the account's
      // own identity. Moving them would fold the accounts together.
      const tables = [
        "integration_connections",
        "integration_pipeline_configs",
        "pipeline_companies",
        "watchlists",
        "context_items",
        "artifacts",
        "catalog_companies",
        "portfolio_updates",
        "advisors",
        "company_advisors",
        "investor_bookmarks",
        "mcp_api_tokens",
      ];
      const report: Record<string, number> = {};
      for (const tbl of tables) {
        // Use a parametrised IDENTIFIER is not possible with drizzleSql; we
        // whitelisted `tbl` above, so inlining is safe.
        const countRes = await db.execute(
          drizzleSql.raw(
            `SELECT count(*)::text AS n FROM ${tbl} WHERE account_id = '${opts.from}'`,
          ),
        );
        const n = Number((countRes.rows[0] as { n?: string } | undefined)?.n ?? 0);
        report[tbl] = n;
        if (!opts.dryRun && n > 0) {
          await db.execute(
            drizzleSql.raw(
              `UPDATE ${tbl} SET account_id = '${opts.to}' WHERE account_id = '${opts.from}'`,
            ),
          );
        }
      }
      return {
        ok: true,
        dryRun: !!opts.dryRun,
        from: opts.from,
        to: opts.to,
        rowsByTable: report,
      };
    }

    if ((event as { diagnoseHubspotActivities?: string }).diagnoseHubspotActivities) {
      const accountId = (event as { diagnoseHubspotActivities: string })
        .diagnoseHubspotActivities;
      const configs = await db.execute(drizzleSql`
        SELECT id, account_id, connection_id, provider, sync_emails, sync_notes,
               association_scope, backfill_since, last_email_sync_at,
               last_note_sync_at, sync_state, created_at, updated_at
        FROM integration_activity_configs
        WHERE account_id = ${accountId}
      `);
      const links = await db.execute(drizzleSql`
        SELECT count(*)::int AS n,
          sum(CASE WHEN fuel_data_uuid IS NOT NULL THEN 1 ELSE 0 END)::int AS matched,
          sum(CASE WHEN resolution_source = 'unresolved' THEN 1 ELSE 0 END)::int AS unresolved
        FROM integration_company_links
        WHERE account_id = ${accountId} AND provider = 'hubspot'
      `);
      const sampleLinks = await db.execute(drizzleSql`
        SELECT provider_object_type, provider_object_id, provider_domain,
               fuel_data_uuid, resolution_source, last_resolved_at
        FROM integration_company_links
        WHERE account_id = ${accountId} AND provider = 'hubspot'
        ORDER BY last_resolved_at DESC
        LIMIT 10
      `);
      const activityCounts = await db.execute(drizzleSql`
        SELECT count(*)::int AS total,
          sum(CASE WHEN source LIKE 'hubspot:email:%' THEN 1 ELSE 0 END)::int AS emails,
          sum(CASE WHEN source LIKE 'hubspot:note:%' THEN 1 ELSE 0 END)::int AS notes,
          count(DISTINCT source)::int AS distinct_sources
        FROM context_items
        WHERE account_id = ${accountId} AND kind = 'hubspot_activity'
      `);
      const dupes = await db.execute(drizzleSql`
        SELECT source, count(*)::int AS n
        FROM context_items
        WHERE account_id = ${accountId} AND kind = 'hubspot_activity'
        GROUP BY source
        HAVING count(*) > 1
        ORDER BY count(*) DESC
        LIMIT 10
      `);
      const ingestTimes = await db.execute(drizzleSql`
        SELECT MIN(created_at) AS first_ingest,
               MAX(created_at) AS last_ingest,
               count(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')::int AS last_5min,
               count(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute')::int AS last_1min
        FROM context_items
        WHERE account_id = ${accountId} AND kind = 'hubspot_activity'
      `);
      const recentActivity = await db.execute(drizzleSql`
        SELECT id, company_uuid, source, LEFT(title, 100) AS title, author_email,
               occurred_at, LEFT(content, 200) AS head
        FROM context_items
        WHERE account_id = ${accountId} AND kind = 'hubspot_activity'
        ORDER BY occurred_at DESC
        LIMIT 10
      `);
      return {
        ok: true,
        accountId,
        configs: configs.rows,
        companyLinks: links.rows[0] ?? null,
        sampleLinks: sampleLinks.rows,
        activityCounts: activityCounts.rows[0] ?? null,
        ingestTimes: ingestTimes.rows[0] ?? null,
        duplicateSources: dupes.rows,
        recentActivity: recentActivity.rows,
      };
    }

    if ((event as { diagnoseIntegrations?: boolean }).diagnoseIntegrations) {
      const connRows = await db.execute(drizzleSql`
        SELECT account_id, provider, status, installed_by_email,
               installed_at, last_sync_at,
               CASE WHEN credentials IS NOT NULL THEN true ELSE false END AS has_credentials
        FROM integration_connections
        ORDER BY installed_at DESC
      `);
      const pipelineRows = await db.execute(drizzleSql`
        SELECT account_id, provider, enabled, label, last_sync_at
        FROM integration_pipeline_configs
        ORDER BY last_sync_at DESC NULLS LAST
      `);
      const allAccounts = await db.execute(drizzleSql`
        SELECT id, name FROM accounts ORDER BY name
      `);
      return {
        ok: true,
        connections: connRows.rows,
        pipelineConfigs: pipelineRows.rows,
        accounts: allAccounts.rows,
      };
    }

    if ((event as { diagnoseUserAccounts?: string }).diagnoseUserAccounts) {
      const email = (event as { diagnoseUserAccounts?: string }).diagnoseUserAccounts!;
      const rows = await db.execute(drizzleSql`
        SELECT a.id, a.name, am.role,
          (SELECT count(*) FROM account_members am2 WHERE am2.account_id = am.account_id) AS member_count
        FROM account_members am
        JOIN accounts a ON a.id = am.account_id
        WHERE am.user_email = ${email}
        ORDER BY a.name
      `);
      const advisorCounts = await db.execute(drizzleSql`
        SELECT account_id, count(*)::text AS n FROM advisors GROUP BY account_id
      `);
      return { ok: true, accounts: rows.rows, advisorsByAccount: advisorCounts.rows };
    }

    if ((event as { diagnose?: boolean }).diagnose) {
      const rows = await db.execute(
        sql`SELECT metric, p25, p50, p75, p90, inverted_good, unit FROM benchmark_cohorts WHERE cohort_key = 'b2b_saas:series_a:us' AND metric = 'arr_usd'`,
      );
      return { ok: true, rows: rows.rows };
    }

    if ((event as { diagnoseGranola?: boolean }).diagnoseGranola) {
      const rows = await db.execute(
        sql`SELECT id, company_uuid, title, source, occurred_at, LENGTH(content) AS len, LEFT(content, 400) AS head FROM context_items WHERE source LIKE 'granola:%' ORDER BY occurred_at DESC LIMIT 15`,
      );
      return { ok: true, rows: rows.rows };
    }

    if ((event as { purgeGranola?: boolean }).purgeGranola) {
      const rows = await db.execute(
        sql`DELETE FROM context_items WHERE source LIKE 'granola:%' RETURNING id`,
      );
      return { ok: true, deleted: rows.rows.length };
    }

    if ((event as { fixStageData?: { dryRun?: boolean; targetAccountId?: string } }).fixStageData) {
      const opts = (event as { fixStageData: { dryRun?: boolean; targetAccountId?: string } })
        .fixStageData;
      const dryRun = opts.dryRun !== false; // default to dry run for safety
      const targetAccountId = opts.targetAccountId ?? "001e127f-74c0-4fc2-bb17-0b1b0351db49";
      const seedFundId = "988394d1-7ada-4947-b15a-f510534b1b90";

      const report: Record<string, unknown> = { dryRun, targetAccountId };

      // 1. Counts BEFORE any changes so the operator can sanity-check.
      const seedFundCompaniesQ = await db.execute(drizzleSql`
        SELECT wc.company_uuid
        FROM watchlist_companies wc
        WHERE wc.watchlist_id = ${seedFundId}
      `);
      const seedFundUuids = (seedFundCompaniesQ.rows as Array<{ company_uuid: string }>).map(
        (r) => r.company_uuid,
      );
      report.seedFundCompanyCount = seedFundUuids.length;

      const seedFundRow = await db.execute(drizzleSql`
        SELECT id, name, kind, account_id FROM watchlists WHERE id = ${seedFundId}
      `);
      report.seedFundBefore = seedFundRow.rows[0] ?? null;

      // Count watchlist-kind rows we're about to nuke and their children.
      const wlCounts = await db.execute(drizzleSql`
        SELECT
          (SELECT count(*) FROM watchlists WHERE kind = 'watchlist') AS watchlists,
          (SELECT count(*) FROM watchlist_companies WHERE watchlist_id IN
            (SELECT id FROM watchlists WHERE kind = 'watchlist')) AS watchlist_companies,
          (SELECT count(*) FROM watchlist_shares WHERE watchlist_id IN
            (SELECT id FROM watchlists WHERE kind = 'watchlist')) AS watchlist_shares,
          (SELECT count(*) FROM watchlist_followers WHERE watchlist_id IN
            (SELECT id FROM watchlists WHERE kind = 'watchlist')) AS watchlist_followers,
          (SELECT count(*) FROM watchlist_teams WHERE watchlist_id IN
            (SELECT id FROM watchlists WHERE kind = 'watchlist')) AS watchlist_teams
      `);
      report.watchlistCounts = wlCounts.rows[0];

      const ciCount = await db.execute(drizzleSql`SELECT count(*) AS n FROM context_items`);
      const artCount = await db.execute(drizzleSql`SELECT count(*) AS n FROM artifacts`);
      report.contextItems = (ciCount.rows[0] as { n?: string | number }).n;
      report.artifacts = (artCount.rows[0] as { n?: string | number }).n;

      // Orphan accounts = account_id rows referenced by any data table but that
      // no real user is a member of. The 3 UUIDs called out by the diag earlier.
      const orphans = [
        "7aec7db6-b179-4f79-9bb6-448aaa0673e7",
        "1b270d87-1c80-4f83-a468-aa8d4b0a8bfe",
        "f78e0d2c-8a1f-4694-9de4-c3596bd7e837",
      ];
      report.orphansToDelete = orphans;

      if (dryRun) {
        // Preview how many rows would be reassigned. Subselect against
        // watchlist_companies so we avoid passing an array as a pg param
        // (drizzleSql splats arrays into positional params, not text[]).
        if (seedFundUuids.length > 0) {
          const obsCount = await db.execute(drizzleSql`
            SELECT count(*) AS n FROM signal_observations
            WHERE company_uuid IN (
              SELECT company_uuid FROM watchlist_companies WHERE watchlist_id = ${seedFundId}
            )
          `);
          const puCount = await db.execute(drizzleSql`
            SELECT count(*) AS n FROM portfolio_updates
            WHERE company_uuid IN (
              SELECT company_uuid FROM watchlist_companies WHERE watchlist_id = ${seedFundId}
            )
          `);
          report.observationsToReassign = (obsCount.rows[0] as { n?: string }).n;
          report.portfolioUpdatesToReassign = (puCount.rows[0] as { n?: string }).n;
        }
        return { ok: true, dryRun: true, report };
      }

      // --- EXECUTE (non-dry-run) ---
      const executed: Record<string, number | string> = {};

      // a) Reassign Seed Fund portfolio.
      const r1 = await db.execute(drizzleSql`
        UPDATE watchlists SET account_id = ${targetAccountId}, updated_at = NOW()
        WHERE id = ${seedFundId}
      `);
      executed.seedFundReassigned = (r1 as { rowCount?: number }).rowCount ?? 0;

      // b) Reassign signal_observations for Seed Fund companies.
      if (seedFundUuids.length > 0) {
        const r2 = await db.execute(drizzleSql`
          UPDATE signal_observations SET account_id = ${targetAccountId}
          WHERE company_uuid IN (
            SELECT company_uuid FROM watchlist_companies WHERE watchlist_id = ${seedFundId}
          )
        `);
        executed.signalObservationsReassigned = (r2 as { rowCount?: number }).rowCount ?? 0;

        const r3 = await db.execute(drizzleSql`
          UPDATE portfolio_updates SET account_id = ${targetAccountId}, updated_at = NOW()
          WHERE company_uuid IN (
            SELECT company_uuid FROM watchlist_companies WHERE watchlist_id = ${seedFundId}
          )
        `);
        executed.portfolioUpdatesReassigned = (r3 as { rowCount?: number }).rowCount ?? 0;
      }

      // c) Wipe context_items + artifacts wholesale (user re-syncs Granola).
      const r4 = await db.execute(drizzleSql`DELETE FROM context_items`);
      executed.contextItemsDeleted = (r4 as { rowCount?: number }).rowCount ?? 0;
      const r5 = await db.execute(drizzleSql`DELETE FROM artifacts`);
      executed.artifactsDeleted = (r5 as { rowCount?: number }).rowCount ?? 0;

      // d) Nuclear wipe of kind='watchlist' (portfolios stay). FKs on
      //    watchlist_* children have ON DELETE CASCADE to watchlists, but
      //    delete explicitly for clarity + report accuracy.
      const r6a = await db.execute(drizzleSql`
        DELETE FROM watchlist_companies WHERE watchlist_id IN
          (SELECT id FROM watchlists WHERE kind = 'watchlist')
      `);
      executed.watchlistCompaniesDeleted = (r6a as { rowCount?: number }).rowCount ?? 0;
      const r6b = await db.execute(drizzleSql`
        DELETE FROM watchlist_shares WHERE watchlist_id IN
          (SELECT id FROM watchlists WHERE kind = 'watchlist')
      `);
      executed.watchlistSharesDeleted = (r6b as { rowCount?: number }).rowCount ?? 0;
      const r6c = await db.execute(drizzleSql`
        DELETE FROM watchlist_followers WHERE watchlist_id IN
          (SELECT id FROM watchlists WHERE kind = 'watchlist')
      `);
      executed.watchlistFollowersDeleted = (r6c as { rowCount?: number }).rowCount ?? 0;
      const r6d = await db.execute(drizzleSql`
        DELETE FROM watchlist_teams WHERE watchlist_id IN
          (SELECT id FROM watchlists WHERE kind = 'watchlist')
      `);
      executed.watchlistTeamsDeleted = (r6d as { rowCount?: number }).rowCount ?? 0;
      const r6 = await db.execute(drizzleSql`DELETE FROM watchlists WHERE kind = 'watchlist'`);
      executed.watchlistsDeleted = (r6 as { rowCount?: number }).rowCount ?? 0;

      // e) Delete orphan account rows. account_members has ON DELETE CASCADE
      //    so any stragglers get cleaned up. The literal string 'york-ie' is
      //    almost certainly not in accounts.id (text FK, accepts anything) but
      //    try anyway for hygiene. Enumerate explicitly (drizzleSql splats
      //    arrays rather than binding them as text[]).
      const r7 = await db.execute(drizzleSql`
        DELETE FROM accounts WHERE id IN (
          ${orphans[0]}, ${orphans[1]}, ${orphans[2]}, 'york-ie'
        )
      `);
      executed.accountsDeleted = (r7 as { rowCount?: number }).rowCount ?? 0;

      return { ok: true, dryRun: false, report, executed };
    }

    return {
      ok: true,
      migrated: true,
      seeded: seededCount,
      import: importReport,
      advisorImport: advisorImportReport,
      createPortfolio: createPortfolioReport,
    };
  } finally {
    await pool.end();
  }
};

async function runAdvisorImport(
  db: NodePgDatabase,
  opts: {
    accountId?: string;
    curatedByEmail?: string;
    rows: AdvisorImportRow[];
  },
): Promise<{ inserted: number; updated: number; total: number; accountId: string }> {
  const curatedByEmail = opts.curatedByEmail ?? "mike@york.ie";
  // Resolve accountId: explicit opts > first account the curator belongs to
  // (preferring owner role) > hard fail. Lets callers invoke with just an
  // email instead of knowing the legacy-DDB id.
  let accountId = opts.accountId;
  if (!accountId) {
    // Mirror lib/accounts.ts#getActiveAccountForUser: owner-role wins,
    // else the account with the most members wins. Must stay in sync with
    // the app, otherwise advisors land in a different account than the UI
    // reads from.
    const res = await db.execute(drizzleSql`
      WITH mine AS (
        SELECT am.account_id, am.role,
          (SELECT count(*) FROM account_members am2 WHERE am2.account_id = am.account_id) AS member_count
        FROM account_members am
        WHERE am.user_email = ${curatedByEmail}
      )
      SELECT account_id FROM mine
      ORDER BY (role = 'owner') DESC, member_count DESC, account_id ASC
      LIMIT 1
    `);
    const row = res.rows[0] as { account_id?: string } | undefined;
    if (!row?.account_id) {
      throw new Error(`no account found for ${curatedByEmail}`);
    }
    accountId = row.account_id;
  }
  let inserted = 0;
  let updated = 0;
  // Plain upsert per row using raw SQL to stay simple. account_id + id is
  // the effective key; ON CONFLICT updates the common fields.
  for (const r of opts.rows) {
    const res = await db.execute(drizzleSql`
      INSERT INTO advisors (
        id, account_id, fuel_data_person_id, name, title, company, email, phone,
        linkedin_url, photo_url, bio, expertise, focus_industries, location,
        public_card, curated_by_email, status
      ) VALUES (
        ${r.id}, ${accountId}, ${r.fuelDataPersonId ?? null}, ${r.name},
        ${r.title ?? null}, ${r.company ?? null}, ${r.email ?? null}, ${r.phone ?? null},
        ${r.linkedinUrl ?? null}, ${r.photoUrl ?? null}, ${r.bio ?? null},
        ${r.expertise ? JSON.stringify(r.expertise) : null}::jsonb,
        ${r.focusIndustries ? JSON.stringify(r.focusIndustries) : null}::jsonb,
        ${r.location ?? null}, ${r.publicCard ?? false}, ${curatedByEmail}, 'active'
      )
      ON CONFLICT (id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        linkedin_url = EXCLUDED.linkedin_url,
        photo_url = EXCLUDED.photo_url,
        bio = EXCLUDED.bio,
        expertise = EXCLUDED.expertise,
        focus_industries = EXCLUDED.focus_industries,
        location = EXCLUDED.location,
        public_card = EXCLUDED.public_card,
        updated_at = now()
      RETURNING (xmax = 0) AS inserted
    `);
    const row = (res.rows[0] ?? {}) as { inserted?: boolean };
    if (row.inserted) inserted++;
    else updated++;
  }
  // Keep the unused advisors import from being dropped by esbuild shaking.
  void advisors;
  return { inserted, updated, total: opts.rows.length, accountId };
}

async function runPortfolioImport(
  db: NodePgDatabase,
  opts: {
    accountId?: string;
    period?: string;
    submittedByEmail?: string;
    rows: PortfolioImportRow[];
  },
) {
  const accountId = opts.accountId ?? "york-ie";
  const period = opts.period ?? "2026-q1";
  const submittedByEmail = opts.submittedByEmail ?? "mike@york.ie";
  const report: Array<{ name: string; companyUuid: string; matched: boolean; action: string }> = [];

  for (const row of opts.rows) {
    let companyUuid = row.companyUuid;
    let matched = !!companyUuid;

    if (!companyUuid) {
      // Fallback: create a catalog entry with a slug-based id.
      const slug = row.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      companyUuid = `cat_${slug}`;
      await db
        .insert(catalogCompanies)
        .values({
          id: companyUuid,
          accountId,
          name: row.name,
          domain: row.domain ?? null,
          createdByEmail: submittedByEmail,
        })
        .onConflictDoNothing();
    }

    await db
      .insert(portfolioUpdates)
      .values({
        id: `pu_${randomUUID()}`,
        accountId,
        companyUuid,
        period,
        status: "submitted",
        submittedByEmail,
        submittedAt: new Date(),
        fteCount: row.fteCount ?? null,
        paidCustomerCount: row.paidCustomerCount ?? null,
        arrUsd: row.arrUsd ?? null,
        arrGrowthYoyPct: row.arrGrowthYoyPct ?? null,
        nrrPct: row.nrrPct ?? null,
        logoRetentionPct: row.logoRetentionPct ?? null,
        grossMarginPct: row.grossMarginPct ?? null,
        cacPaybackMonths: row.cacPaybackMonths ?? null,
        burnMultiple: row.burnMultiple ?? null,
        ruleOf40Pct: row.ruleOf40Pct ?? null,
        cashOnHandUsd: row.cashOnHandUsd ?? null,
        monthlyBurnUsd: row.monthlyBurnUsd ?? null,
        notableCustomers: row.notableCustomers ?? null,
        notableHires: row.notableHires ?? null,
        otherUpdates: row.otherUpdates ?? null,
        challenges: row.challenges ?? null,
        bankingPartner: row.bankingPartner ?? null,
        legalCounsel: row.legalCounsel ?? null,
        cloudProvider: row.cloudProvider ?? null,
        capTablePlatform: row.capTablePlatform ?? null,
        doInsuranceProvider: row.doInsuranceProvider ?? null,
        crmPlatform: row.crmPlatform ?? null,
        openToInvestorIntros: row.openToInvestorIntros ?? false,
      })
      .onConflictDoUpdate({
        target: [portfolioUpdates.accountId, portfolioUpdates.companyUuid, portfolioUpdates.period],
        set: {
          status: "submitted",
          submittedByEmail,
          updatedAt: new Date(),
          fteCount: row.fteCount ?? null,
          paidCustomerCount: row.paidCustomerCount ?? null,
          arrUsd: row.arrUsd ?? null,
          arrGrowthYoyPct: row.arrGrowthYoyPct ?? null,
          nrrPct: row.nrrPct ?? null,
          logoRetentionPct: row.logoRetentionPct ?? null,
          grossMarginPct: row.grossMarginPct ?? null,
          cacPaybackMonths: row.cacPaybackMonths ?? null,
          burnMultiple: row.burnMultiple ?? null,
          ruleOf40Pct: row.ruleOf40Pct ?? null,
          cashOnHandUsd: row.cashOnHandUsd ?? null,
          monthlyBurnUsd: row.monthlyBurnUsd ?? null,
          notableCustomers: row.notableCustomers ?? null,
          notableHires: row.notableHires ?? null,
          otherUpdates: row.otherUpdates ?? null,
          challenges: row.challenges ?? null,
          bankingPartner: row.bankingPartner ?? null,
          legalCounsel: row.legalCounsel ?? null,
          cloudProvider: row.cloudProvider ?? null,
          capTablePlatform: row.capTablePlatform ?? null,
          doInsuranceProvider: row.doInsuranceProvider ?? null,
          crmPlatform: row.crmPlatform ?? null,
          openToInvestorIntros: row.openToInvestorIntros ?? false,
        },
      });

    report.push({
      name: row.name,
      companyUuid,
      matched,
      action: matched ? "neptune_match" : "catalog_fallback",
    });
  }

  return { count: report.length, rows: report };
}

async function runCreatePortfolio(
  db: NodePgDatabase,
  opts: {
    accountId: string;
    name: string;
    ownerEmail: string;
    kind?: "portfolio" | "watchlist";
    scope?: "private" | "account" | "team";
    fundName?: string | null;
    companyUuids: Array<{ uuid: string; name: string }>;
  },
) {
  const watchlistId = randomUUID();
  await db.insert(watchlists).values({
    id: watchlistId,
    name: opts.name,
    kind: opts.kind ?? "portfolio",
    scope: opts.scope ?? "account",
    ownerEmail: opts.ownerEmail,
    accountId: opts.accountId,
    fundName: opts.fundName ?? null,
  });
  if (opts.companyUuids.length > 0) {
    await db
      .insert(watchlistCompanies)
      .values(
        opts.companyUuids.map((c) => ({
          watchlistId,
          companyUuid: c.uuid,
          name: c.name,
          addedByEmail: opts.ownerEmail,
        })),
      )
      .onConflictDoNothing();
  }
  return { watchlistId, added: opts.companyUuids.length };
}

async function seedAll(db: NodePgDatabase): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE TABLE
        ${initiativeTeam}, ${fixtureSignals}, ${initiatives}, ${benchmarks}, ${companies}, ${people}
        RESTART IDENTITY CASCADE`,
    );

    await tx.insert(people).values(
      fixture.people.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        role: p.role,
        team: p.team,
        focus: p.focus,
      })),
    );

    await tx.insert(companies).values(
      fixture.companies.map((c) => ({
        id: c.id,
        name: c.name,
        logo: c.logo,
        domain: "domain" in c ? c.domain : null,
        stage: c.stage,
        industry: c.industry,
        list: c.list,
        type: c.type,
        arr: c.arr,
        arrGrowth: c.arrGrowth,
        burn: "burn" in c ? c.burn : null,
        runway: "runway" in c ? c.runway : null,
        nrr: c.nrr,
        fitScore: c.fitScore,
        hq: "hq" in c ? c.hq : null,
        founded: "founded" in c ? c.founded : null,
        employees: "employees" in c ? c.employees : null,
        raising: "raising" in c ? !!c.raising : false,
        targetRound: "targetRound" in c ? c.targetRound : null,
        hubspotStage: "hubspotStage" in c ? c.hubspotStage : null,
        hubspotId: "hubspotId" in c ? c.hubspotId : null,
        hubspotOwner: "hubspotOwner" in c ? c.hubspotOwner : null,
      })),
    );

    await tx.insert(initiatives).values(
      fixture.initiatives.map((e) => ({
        id: e.id,
        companyId: e.companyId,
        kind: e.kind,
        name: e.name,
        area: e.area,
        health: "health" in e ? e.health : null,
        automation: "automation" in e ? e.automation : null,
        since: "since" in e ? e.since : null,
        value: "value" in e ? e.value : null,
        signal: "signal" in e ? ([...e.signal] as number[]) : null,
        pct: "pct" in e ? e.pct : null,
        due: "due" in e ? e.due : null,
        ownerId: e.ownerId,
      })),
    );

    const teamRows = fixture.initiatives.flatMap((e) =>
      (e.team ?? [e.ownerId]).map((personId) => ({
        initiativeId: e.id,
        personId,
      })),
    );
    if (teamRows.length) await tx.insert(initiativeTeam).values(teamRows);

    await tx.insert(fixtureSignals).values(
      fixture.signals.map((s) => ({
        companyId: s.companyId,
        at: s.at,
        kind: s.kind,
        text: s.text,
      })),
    );

    await tx.insert(benchmarks).values(fixture.benchmarks.map((b) => ({ ...b })));

    return fixture.companies.length;
  });
}
