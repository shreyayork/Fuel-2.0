import "server-only";

import {
  getCompany,
  getCompanyFunding,
  getInvestor,
  searchInvestors,
  type FundingRound,
} from "@/lib/fuel-data";
import { brightDataScrape } from "@/lib/enrichment/brightdata";
import { cachedFetch } from "@/lib/enrichment/cache";
import { mapCrunchbaseFundingFields } from "@/lib/enrichment/crunchbase-fields";
import { normalizeCrunchbaseCompanyUrl } from "@/lib/enrichment/urls";
import {
  captureIntegrationException,
  captureIntegrationMessage,
} from "@/lib/sentry/capture";
import {
  addCompanyToWatchlist,
  createWatchlist,
  deleteWatchlist,
  isDuplicateWatchlistNameError,
  listWatchlists,
  setFollower,
  type WatchlistListItem,
} from "@/lib/watchlists";
import {
  autoFundKey,
  autoRoundKey,
  combinedFundName,
  isDeletableEmptyAutoShell,
  isKeyedAutoBuiltFirmList,
  matchesAutoBuiltFirmList,
  roundListName,
} from "@/lib/portfolio/auto-build-ids";
import {
  companiesToAdd,
  emptyShellPlan,
  shouldWarnAutoBuild,
  skipPopulatedAutoLists,
  type AutoBuildStageCounts,
} from "@/lib/portfolio/auto-build-plan";
import { mergeHoldings, type RawHolding } from "@/lib/portfolio/merge-holdings";
import {
  groupByLatestRoundBucket,
  pickLatestRoundBucket,
  ROUND_BUCKETS,
  type RoundAnnouncement,
} from "@/lib/portfolio/round-buckets";

const HOLDINGS_CAP = 200;
const CB_SCRAPE_CONCURRENCY = 4;

export type AutoBuildResult = {
  firmName: string;
  holdingCount: number;
  portfolioIds: string[];
  skipped: boolean;
  reason?: "already_built" | "no_firm" | "ok";
};

function roundsFromFunding(rows: FundingRound[]): RoundAnnouncement[] {
  return rows.map((r) => ({
    type: r.investmentType ?? null,
    announcedOn: r.announcedOn ?? null,
  }));
}

function crunchbaseUrlFromCompany(doc: {
  homepageUrl?: string;
  cbUrl?: string;
  raw?: Record<string, unknown>;
} | null): string | null {
  if (!doc) return null;
  const raw = doc.raw ?? {};
  const candidates = [
    doc.cbUrl,
    raw.crunchbase_url,
    raw.crunchbaseUrl,
    raw.cb_url,
    doc.homepageUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /crunchbase\.com/i.test(c)) {
      return c;
    }
  }
  return null;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () =>
      worker(),
    ),
  );
  return out;
}

/**
 * Resolve firm → Neptune holdings → enrich latest rounds → create portfolios.
 * Skip only when this firm's keyed auto lists already have companies.
 * Empty keyed shells are refilled. `force` does not delete non-empty lists.
 */
export async function autoBuildInvestorPortfolios(opts: {
  accountId: string;
  userEmail: string;
  firmName: string;
  firmDomain?: string | null;
  force?: boolean;
}): Promise<AutoBuildResult> {
  const firmName = opts.firmName.trim();
  if (!firmName) {
    return {
      firmName: "",
      holdingCount: 0,
      portfolioIds: [],
      skipped: true,
      reason: "no_firm",
    };
  }

  const existing = await listWatchlists({
    userEmail: opts.userEmail,
    accountId: opts.accountId,
    scope: "all",
    kind: "portfolio",
  });
  const fundKey = autoFundKey(firmName);
  // Destructive ops: only lists with this firm's auto:fund: / auto:round: keys.
  const keyedAutoLists = existing.filter((w) =>
    isKeyedAutoBuiltFirmList(firmName, w),
  );
  const keyed = keyedAutoLists.map((w) => ({
    id: w.id,
    companyCount: w.companyCount ?? 0,
  }));
  const populated = skipPopulatedAutoLists({
    force: Boolean(opts.force),
    keyedLists: keyed,
  });
  if (populated.skip) {
    reportAutoBuild({
      invested_in_edges: null,
      backed_count: 0,
      merged_count: 0,
      persisted_count: populated.holdingCount,
      reason: "already_built",
    });
    return {
      firmName,
      holdingCount: populated.holdingCount,
      portfolioIds: populated.portfolioIds,
      skipped: true,
      reason: "already_built",
    };
  }

  let fetched: FirmHoldingsFetch = {
    holdings: [],
    investedInEdges: null,
    backedCount: 0,
  };
  try {
    fetched = await fetchFirmHoldings({
      firmName,
      firmDomain: opts.firmDomain,
    });
  } catch (e) {
    captureIntegrationException(e, {
      integration: "neptune",
      operation: "investor_portfolio_auto_build_fetch",
      tags: {
        neptune_failure_mode: "neptune_connection_failure",
        empty_fallback: true,
      },
      context: {
        firmName: firmName.slice(0, 120),
        firmDomain: opts.firmDomain?.slice(0, 120) ?? null,
      },
    });
    fetched = { holdings: [], investedInEdges: null, backedCount: 0 };
  }

  const merged = mergeHoldings(fetched.holdings).filter((h) => h.companyUuid);
  const stageBase = {
    invested_in_edges: fetched.investedInEdges,
    backed_count: fetched.backedCount,
    merged_count: merged.length,
  };

  // Empty auto shells: rebuild only when we have holdings to fill.
  // No holdings → keep shells (honest empty); avoids delete/rebuild loop.
  // Never delete keyed lists that already have companies.
  const shells = emptyShellPlan({
    keyedLists: keyed,
    mergedCount: merged.length,
  });
  if (shells.action === "keep") {
    reportAutoBuild({
      ...stageBase,
      persisted_count: 0,
      reason: "already_built",
    });
    return {
      firmName,
      holdingCount: 0,
      portfolioIds: shells.portfolioIds,
      skipped: true,
      reason: "already_built",
    };
  }
  for (const id of shells.deleteIds) {
    if (!keyedAutoLists.some((w) => w.id === id && isDeletableEmptyAutoShell(firmName, w))) {
      continue;
    }
    await deleteWatchlist(id);
  }

  const { byBucket } = groupByLatestRoundBucket(merged);

  const portfolioIds: string[] = [];

  const combined = await createAutoPortfolioOrReuse({
    firmName,
    name: combinedFundName(firmName),
    fundName: fundKey,
    userEmail: opts.userEmail,
    accountId: opts.accountId,
  });
  portfolioIds.push(combined.id);
  await setFollower({
    watchlistId: combined.id,
    userEmail: opts.userEmail,
    starred: true,
  });
  // Always fill — including when create lost the name race and reused
  // the winner. addCompanyToWatchlist is idempotent (onConflictDoNothing).
  let persistedCount = 0;
  for (const h of companiesToAdd(merged, combined.reused)) {
    await addCompanyToWatchlist({
      watchlistId: combined.id,
      companyUuid: h.companyUuid,
      name: h.name,
      addedByEmail: opts.userEmail,
    });
    persistedCount += 1;
  }

  for (const bucket of ROUND_BUCKETS) {
    const companies = byBucket.get(bucket);
    if (!companies || companies.length === 0) continue;
    const wl = await createAutoPortfolioOrReuse({
      firmName,
      name: roundListName(firmName, bucket),
      fundName: autoRoundKey(firmName, bucket),
      userEmail: opts.userEmail,
      accountId: opts.accountId,
    });
    portfolioIds.push(wl.id);
    await setFollower({
      watchlistId: wl.id,
      userEmail: opts.userEmail,
      starred: true,
    });
    for (const h of companiesToAdd(companies, wl.reused)) {
      await addCompanyToWatchlist({
        watchlistId: wl.id,
        companyUuid: h.companyUuid,
        name: h.name,
        addedByEmail: opts.userEmail,
      });
    }
  }

  reportAutoBuild({
    ...stageBase,
    persisted_count: persistedCount,
    reason: "ok",
  });

  return {
    firmName,
    holdingCount: persistedCount,
    portfolioIds,
    skipped: false,
    reason: "ok",
  };
}

function reportAutoBuild(counts: AutoBuildStageCounts): void {
  captureIntegrationMessage("investor portfolio auto-build stage counts", {
    integration: "neptune",
    operation: "investor_portfolio_auto_build",
    level: shouldWarnAutoBuild(counts) ? "warning" : "info",
    tags: {
      reason: counts.reason,
      empty_portfolio: counts.persisted_count === 0,
    },
    context: {
      invested_in_edges: counts.invested_in_edges,
      backed_count: counts.backed_count,
      merged_count: counts.merged_count,
      persisted_count: counts.persisted_count,
      reason: counts.reason,
    },
  });
}

/** Create portfolio; on name collision from concurrent claim/ensure, reuse winner. */
async function createAutoPortfolioOrReuse(opts: {
  firmName: string;
  name: string;
  fundName: string;
  userEmail: string;
  accountId: string;
}): Promise<{ id: string; reused: boolean }> {
  try {
    const wl = await createWatchlist({
      name: opts.name,
      ownerEmail: opts.userEmail,
      accountId: opts.accountId,
      scope: "account",
      kind: "portfolio",
      fundName: opts.fundName,
    });
    return { id: wl.id, reused: false };
  } catch (e) {
    if (!isDuplicateWatchlistNameError(e)) throw e;
    const lists = await listWatchlists({
      userEmail: opts.userEmail,
      accountId: opts.accountId,
      scope: "all",
      kind: "portfolio",
    });
    const hit = findMatchingFirmList(opts.firmName, opts.name, opts.fundName, lists);
    if (!hit) throw e;
    return { id: hit.id, reused: true };
  }
}

function findMatchingFirmList(
  firmName: string,
  name: string,
  fundName: string,
  lists: WatchlistListItem[],
): WatchlistListItem | undefined {
  const byFund = lists.find((w) => w.fundName === fundName);
  if (byFund) return byFund;
  const want = name.trim().toLowerCase();
  return lists.find(
    (w) =>
      matchesAutoBuiltFirmList(firmName, w) &&
      w.name.trim().toLowerCase() === want,
  );
}

type FirmHoldingsFetch = {
  holdings: RawHolding[];
  investedInEdges: number | null;
  backedCount: number;
};

const EMPTY_FETCH: FirmHoldingsFetch = {
  holdings: [],
  investedInEdges: null,
  backedCount: 0,
};

async function fetchFirmHoldings(opts: {
  firmName: string;
  firmDomain?: string | null;
}): Promise<FirmHoldingsFetch> {
  // Domain-first on organization vertices (Neptune has no `investor` label).
  // searchInvestors falls back to exact name when the domain query is empty.
  const hits = await searchInvestors(opts.firmName, {
    limit: 5,
    domain: opts.firmDomain,
  });
  if (hits.length === 0) return EMPTY_FETCH;

  // Prefer exact domain hit, else best name hit with most investments.
  let investorId = hits[0]?.id;
  let investedInEdges = hits[0]?.investmentCount ?? null;
  if (opts.firmDomain) {
    const domain = opts.firmDomain.toLowerCase().replace(/^www\./, "");
    const byDomain = hits.find(
      (h) =>
        (h.domain ?? "").toLowerCase() === domain ||
        (h.website ?? "").toLowerCase().includes(domain),
    );
    if (byDomain) {
      investorId = byDomain.id;
      investedInEdges = byDomain.investmentCount ?? investedInEdges;
    }
  } else {
    const ranked = [...hits].sort(
      (a, b) => (b.investmentCount ?? 0) - (a.investmentCount ?? 0),
    );
    investorId = ranked[0]?.id;
    investedInEdges = ranked[0]?.investmentCount ?? null;
  }
  if (!investorId) return { ...EMPTY_FETCH, investedInEdges };

  const profile = await getInvestor(investorId);
  const backedCount = profile?.backedCompanies?.length ?? 0;
  if (!profile?.backedCompanies?.length) {
    return { holdings: [], investedInEdges, backedCount };
  }

  const backed = profile.backedCompanies.slice(0, HOLDINGS_CAP);

  const enriched = await mapPool(backed, CB_SCRAPE_CONCURRENCY, async (co) => {
    const companyUuid = co.uuid;
    let domain: string | null = null;
    let onFuel = false;
    let rounds: RoundAnnouncement[] = [];

    try {
      const [funding, doc] = await Promise.all([
        getCompanyFunding(companyUuid, 50),
        getCompany(companyUuid),
      ]);
      onFuel = doc != null;
      domain = doc?.domain ?? null;
      rounds = roundsFromFunding(funding);

      if (rounds.length === 0 || pickLatestRoundBucket(rounds) == null) {
        const cbUrl = crunchbaseUrlFromCompany(doc);
        if (cbUrl) {
          try {
            const url = normalizeCrunchbaseCompanyUrl(cbUrl);
            const scraped = await cachedFetch({
              source: "brightdata:crunchbase_company",
              subjectKey: url,
              ttlSeconds: 30 * 24 * 3600,
              costTokens: 5_000,
              fetcher: () =>
                brightDataScrape({ kind: "crunchbase_company", url }),
            });
            if (scraped.data) {
              const mapped = mapCrunchbaseFundingFields(
                scraped.data as Record<string, unknown>,
              );
              if (mapped.fundingRounds?.length) {
                rounds = mapped.fundingRounds.map((r) => ({
                  type: r.roundType,
                  announcedOn: r.announcedOn,
                }));
              }
            }
          } catch (e) {
            captureIntegrationException(e, {
              integration: "brightdata",
              operation: "investor_portfolio_cb_round_fill",
              level: "warning",
            });
          }
        }
      }
    } catch (e) {
      captureIntegrationException(e, {
        integration: "neptune",
        operation: "investor_portfolio_enrich_company",
        level: "warning",
      });
    }

    const holding: RawHolding = {
      companyUuid,
      name: co.name,
      domain,
      onFuel,
      rounds,
      latestRound: pickLatestRoundBucket(rounds),
      source: "fuel",
    };
    return holding;
  });

  return { holdings: enriched, investedInEdges, backedCount };
}
