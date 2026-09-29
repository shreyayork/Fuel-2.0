import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export interface PlatformStats {
  /** Public fuel-data snapshot — not derived from Postgres, these are
   *  operator-supplied ground-truth numbers for the Neptune + OpenSearch
   *  side. Update here when the graph is refreshed. */
  public: {
    totalStorageTB: number;
    companiesAnalyzed: number;
    dataPointsPerDay: number;
  };
  /** Private, account-accumulated data. Queried live. */
  private: {
    contextItemsTotal: number;
    contextItemsHubspot: number;
    contextItemsGranola: number;
    contextItemsSlack: number;
    contextItemsLast7d: number;
    contextItemsLast24h: number;
    signalObservationsTotal: number;
    signalObservationsActive: number;
    signalObservationsLast7d: number;
    signalsCatalog: number;
    benchmarkCohorts: number;
    playbooks: number;
    watchlistsTotal: number;
    watchlistCompaniesDistinct: number;
    pipelineCompaniesTotal: number;
    pipelineMatchedDistinct: number;
    integrationsConnected: number;
    advisorsActive: number;
    artifactsTotal: number;
    portfolioUpdatesTotal: number;
    agentRunsTotal: number;
    agentTokensSpent: number;
  };
}

const PUBLIC_SNAPSHOT: PlatformStats["public"] = {
  totalStorageTB: 2.1,
  companiesAnalyzed: 4_400_000,
  dataPointsPerDay: 2_500_000,
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const db = await getDb();
  const rows = await db.execute(sql`
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
      (SELECT count(*)::int FROM signals) AS signals_catalog,
      (SELECT count(*)::int FROM benchmark_cohorts) AS benchmark_cohorts,
      (SELECT count(*)::int FROM playbooks) AS playbooks,
      (SELECT count(*)::int FROM watchlists) AS watchlists_total,
      (SELECT count(DISTINCT company_uuid)::int FROM watchlist_companies) AS watchlist_companies_distinct,
      (SELECT count(*)::int FROM pipeline_companies) AS pipeline_companies_total,
      (SELECT count(DISTINCT fuel_data_uuid)::int FROM pipeline_companies WHERE fuel_data_uuid IS NOT NULL) AS pipeline_matched_distinct,
      (SELECT count(*)::int FROM integration_connections WHERE status = 'connected') AS integrations_connected,
      (SELECT count(*)::int FROM advisors WHERE status = 'active') AS advisors_active,
      (SELECT count(*)::int FROM artifacts) AS artifacts_total,
      (SELECT count(*)::int FROM portfolio_updates) AS portfolio_updates_total,
      (SELECT count(*)::int FROM agent_runs) AS agent_runs_total,
      (SELECT coalesce(sum(cost_tokens), 0)::bigint FROM agent_runs) AS agent_tokens_spent
  `);
  const r = rows.rows[0] as Record<string, string | number>;
  const n = (k: string): number => {
    const v = r?.[k];
    if (v == null) return 0;
    return typeof v === "number" ? v : Number(v);
  };
  return {
    public: PUBLIC_SNAPSHOT,
    private: {
      contextItemsTotal: n("context_items_total"),
      contextItemsHubspot: n("context_items_hubspot"),
      contextItemsGranola: n("context_items_granola"),
      contextItemsSlack: n("context_items_slack"),
      contextItemsLast7d: n("context_items_last_7d"),
      contextItemsLast24h: n("context_items_last_24h"),
      signalObservationsTotal: n("signal_observations_total"),
      signalObservationsActive: n("signal_observations_active"),
      signalObservationsLast7d: n("signal_observations_last_7d"),
      signalsCatalog: n("signals_catalog"),
      benchmarkCohorts: n("benchmark_cohorts"),
      playbooks: n("playbooks"),
      watchlistsTotal: n("watchlists_total"),
      watchlistCompaniesDistinct: n("watchlist_companies_distinct"),
      pipelineCompaniesTotal: n("pipeline_companies_total"),
      pipelineMatchedDistinct: n("pipeline_matched_distinct"),
      integrationsConnected: n("integrations_connected"),
      advisorsActive: n("advisors_active"),
      artifactsTotal: n("artifacts_total"),
      portfolioUpdatesTotal: n("portfolio_updates_total"),
      agentRunsTotal: n("agent_runs_total"),
      agentTokensSpent: n("agent_tokens_spent"),
    },
  };
}
