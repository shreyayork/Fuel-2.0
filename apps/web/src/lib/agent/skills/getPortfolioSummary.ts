import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getWatchlist, getWatchlistCompanies } from "@/lib/watchlists";
import { listLatestByCompanies } from "@/lib/portfolio-updates";

const input = z.object({
  watchlistId: z
    .string()
    .optional()
    .describe(
      "Optional watchlist / portfolio id. When provided, aggregates only that portfolio's companies — otherwise returns an empty summary. Use the id returned by listWatchlists or passed in the playbook preamble.",
    ),
});

export const getPortfolioSummarySkill: Skill<
  z.infer<typeof input>,
  {
    watchlistId: string | null;
    watchlistName: string | null;
    companyCount: number;
    reportingCount: number;
    latestPeriod: string | null;
    arrTotalUsd: number;
    avgArrGrowthYoyPct: number | null;
    avgNrrPct: number | null;
    monthlyBurnTotalUsd: number;
    runwayUnder12mCount: number;
    reporters: Array<{
      companyUuid: string;
      name: string | null;
      period: string;
      arrUsd: number | null;
      arrGrowthYoyPct: number | null;
      nrrPct: number | null;
      monthlyBurnUsd: number | null;
      cashOnHandUsd: number | null;
      runwayMonths: number | null;
    }>;
  }
> = {
  name: "getPortfolioSummary",
  title: "Get portfolio KPI summary",
  description:
    "Aggregate a portfolio's most recent quarterly submissions into combined ARR, avg YoY growth, avg NRR, total monthly burn, and <12-month-runway count. Reads live portfolio_updates rows — not fixture. Include the watchlistId for accurate scoping.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_500,
  async execute({ watchlistId }, ctx) {
    const empty = {
      watchlistId: watchlistId ?? null,
      watchlistName: null as string | null,
      companyCount: 0,
      reportingCount: 0,
      latestPeriod: null as string | null,
      arrTotalUsd: 0,
      avgArrGrowthYoyPct: null as number | null,
      avgNrrPct: null as number | null,
      monthlyBurnTotalUsd: 0,
      runwayUnder12mCount: 0,
      reporters: [],
    };
    if (!watchlistId) return empty;
    const watchlist = await getWatchlist(watchlistId);
    if (!watchlist) return empty;
    const members = await getWatchlistCompanies(watchlistId);
    const uuids = members.map((m) => m.companyUuid);
    const nameByUuid = new Map(members.map((m) => [m.companyUuid, m.name ?? null]));
    const latest = await listLatestByCompanies({ accountId: ctx.accountId, companyUuids: uuids });

    const reporters: Array<{
      companyUuid: string;
      name: string | null;
      period: string;
      arrUsd: number | null;
      arrGrowthYoyPct: number | null;
      nrrPct: number | null;
      monthlyBurnUsd: number | null;
      cashOnHandUsd: number | null;
      runwayMonths: number | null;
    }> = [];
    let arrTotalUsd = 0;
    let burnTotalUsd = 0;
    let growthSum = 0;
    let growthCount = 0;
    let nrrSum = 0;
    let nrrCount = 0;
    let runwayUnder12mCount = 0;
    let latestPeriod: string | null = null;

    for (const [uuid, row] of latest.entries()) {
      if (!latestPeriod || row.period > latestPeriod) latestPeriod = row.period;
      if (row.arrUsd != null) arrTotalUsd += row.arrUsd;
      if (row.monthlyBurnUsd != null) burnTotalUsd += row.monthlyBurnUsd;
      if (row.arrGrowthYoyPct != null) {
        growthSum += row.arrGrowthYoyPct;
        growthCount += 1;
      }
      if (row.nrrPct != null) {
        nrrSum += row.nrrPct;
        nrrCount += 1;
      }
      // Runway = cash / monthly burn. Only compute when both are present and
      // burn > 0 (breakeven companies report runway as "unlimited", excluded
      // from the <12-month risk count).
      let runwayMonths: number | null = null;
      if (row.cashOnHandUsd != null && row.monthlyBurnUsd != null && row.monthlyBurnUsd > 0) {
        runwayMonths = Math.round(row.cashOnHandUsd / row.monthlyBurnUsd);
        if (runwayMonths < 12) runwayUnder12mCount += 1;
      }
      reporters.push({
        companyUuid: uuid,
        name: nameByUuid.get(uuid) ?? null,
        period: row.period,
        arrUsd: row.arrUsd,
        arrGrowthYoyPct: row.arrGrowthYoyPct,
        nrrPct: row.nrrPct,
        monthlyBurnUsd: row.monthlyBurnUsd,
        cashOnHandUsd: row.cashOnHandUsd,
        runwayMonths,
      });
    }
    // Newest-period first, then alphabetical so the agent's table ordering
    // is stable across runs.
    reporters.sort((a, b) => {
      if (a.period !== b.period) return a.period < b.period ? 1 : -1;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    return {
      watchlistId,
      watchlistName: watchlist.name,
      companyCount: uuids.length,
      reportingCount: reporters.length,
      latestPeriod,
      arrTotalUsd,
      avgArrGrowthYoyPct: growthCount > 0 ? growthSum / growthCount : null,
      avgNrrPct: nrrCount > 0 ? nrrSum / nrrCount : null,
      monthlyBurnTotalUsd: burnTotalUsd,
      runwayUnder12mCount,
      reporters,
    };
  },
};
