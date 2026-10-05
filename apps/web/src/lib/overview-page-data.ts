import "server-only";

import { listWatchlists, getWatchlistCompanies } from "@/lib/watchlists";
import { listLatestQuantitativeObservationsForCompanies } from "@/lib/observations";

const OVERVIEW_SIGNAL_IDS = [
  "arr_usd",
  "arr_growth_yoy_pct",
  "nrr_pct",
  "monthly_burn_usd",
  "cash_on_hand_usd",
] as const;

export type OverviewCompanyCard = {
  uuid: string;
  name: string;
  portfolioNames: string[];
  arrUsd: number | null;
  arrGrowthPct: number | null;
  nrrPct: number | null;
  monthlyBurnUsd: number | null;
  cashOnHandUsd: number | null;
};

export type OverviewPageData = {
  accountName: string;
  portfolioCount: number;
  companies: OverviewCompanyCard[];
  kpis: {
    combinedArrUsd: number | null;
    avgGrowthPct: number | null;
    avgNrrPct: number | null;
    monthlyBurnUsd: number | null;
    lowRunwayCount: number;
  };
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Aggregate portfolio companies + latest quantitative readings for the
 * PM Overview home (KPI strip + company cards).
 */
export async function loadOverviewPageData(opts: {
  userEmail: string;
  accountId: string;
  accountName: string;
}): Promise<OverviewPageData> {
  const portfolios = await listWatchlists({
    userEmail: opts.userEmail,
    accountId: opts.accountId,
    scope: "all",
    kind: "portfolio",
  });

  const membership = await Promise.all(
    portfolios.map(async (p) => ({
      portfolio: p,
      companies: await getWatchlistCompanies(p.id),
    })),
  );

  const byUuid = new Map<
    string,
    { name: string; portfolioNames: string[] }
  >();
  for (const { portfolio, companies } of membership) {
    for (const c of companies) {
      const existing = byUuid.get(c.companyUuid);
      if (existing) {
        if (!existing.portfolioNames.includes(portfolio.name)) {
          existing.portfolioNames.push(portfolio.name);
        }
        if (!existing.name && c.name) existing.name = c.name;
      } else {
        byUuid.set(c.companyUuid, {
          name: c.name ?? c.companyUuid.slice(0, 8),
          portfolioNames: [portfolio.name],
        });
      }
    }
  }

  const uuids = Array.from(byUuid.keys());
  const observations =
    uuids.length > 0
      ? await listLatestQuantitativeObservationsForCompanies({
          accountId: opts.accountId,
          companyUuids: uuids,
          signalIds: [...OVERVIEW_SIGNAL_IDS],
        })
      : new Map();

  const read = (signalId: string, uuid: string): number | null => {
    const v = observations.get(signalId)?.get(uuid)?.valueNumeric;
    return v != null && Number.isFinite(v) ? v : null;
  };

  const companies: OverviewCompanyCard[] = uuids
    .map((uuid) => {
      const meta = byUuid.get(uuid)!;
      return {
        uuid,
        name: meta.name,
        portfolioNames: meta.portfolioNames,
        arrUsd: read("arr_usd", uuid),
        arrGrowthPct: read("arr_growth_yoy_pct", uuid),
        nrrPct: read("nrr_pct", uuid),
        monthlyBurnUsd: read("monthly_burn_usd", uuid),
        cashOnHandUsd: read("cash_on_hand_usd", uuid),
      };
    })
    .sort((a, b) => (b.arrUsd ?? -1) - (a.arrUsd ?? -1));

  const arrValues = companies
    .map((c) => c.arrUsd)
    .filter((v): v is number => v != null);
  const growthValues = companies
    .map((c) => c.arrGrowthPct)
    .filter((v): v is number => v != null);
  const nrrValues = companies
    .map((c) => c.nrrPct)
    .filter((v): v is number => v != null);
  const burnValues = companies
    .map((c) => c.monthlyBurnUsd)
    .filter((v): v is number => v != null);

  let lowRunwayCount = 0;
  for (const c of companies) {
    if (c.monthlyBurnUsd != null && c.monthlyBurnUsd > 0 && c.cashOnHandUsd != null) {
      const months = c.cashOnHandUsd / c.monthlyBurnUsd;
      if (months < 12) lowRunwayCount += 1;
    }
  }

  return {
    accountName: opts.accountName,
    portfolioCount: portfolios.length,
    companies,
    kpis: {
      combinedArrUsd: arrValues.length
        ? arrValues.reduce((s, v) => s + v, 0)
        : null,
      avgGrowthPct: median(growthValues),
      avgNrrPct: median(nrrValues),
      monthlyBurnUsd: burnValues.length
        ? burnValues.reduce((s, v) => s + v, 0)
        : null,
      lowRunwayCount,
    },
  };
}
