import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { investorBookmarks, type InvestorBookmark } from "@/db/schema";
import { listWatchlists, getWatchlistCompanies } from "@/lib/watchlists";
import {
  getCollaborativeInvestors,
  resolveCompanyUuidsForInvestors,
} from "@/lib/fuel-data";

export async function listBookmarks(accountId: string): Promise<InvestorBookmark[]> {
  const db = await getDb();
  return db
    .select()
    .from(investorBookmarks)
    .where(eq(investorBookmarks.accountId, accountId))
    .orderBy(desc(investorBookmarks.addedAt));
}

/** Bookmark row plus OpenSearch company-profile enrichment for navigation. */
export type InvestorBookmarkView = InvestorBookmark & {
  companyUuid?: string;
  hasCompanyProfile: boolean;
};

/**
 * Bookmarks with the same company-profile resolution as the Network tab
 * (batch UUID → domain → strict name). Used so Bookmarks and Network share
 * one navigation rule: `/company/{uuid}` when a profile exists, else plain text.
 */
export async function listBookmarksWithCompanyProfiles(
  accountId: string,
): Promise<InvestorBookmarkView[]> {
  const rows = await listBookmarks(accountId);
  if (rows.length === 0) return [];

  const endpoint = process.env.FUEL_DATA_OPENSEARCH_ENDPOINT?.trim();
  if (!endpoint) {
    return rows.map((r) => ({
      ...r,
      hasCompanyProfile: false,
    }));
  }

  const companyByInvestorId = await resolveCompanyUuidsForInvestors(
    rows.map((r) => ({ id: r.investorId, name: r.investorName })),
  );

  return rows.map((r) => {
    const companyUuid = companyByInvestorId.get(r.investorId);
    return {
      ...r,
      companyUuid,
      hasCompanyProfile: Boolean(companyUuid),
    };
  });
}

export async function isBookmarked(opts: {
  accountId: string;
  investorId: string;
}): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: investorBookmarks.investorId })
    .from(investorBookmarks)
    .where(
      and(
        eq(investorBookmarks.accountId, opts.accountId),
        eq(investorBookmarks.investorId, opts.investorId),
      ),
    );
  return !!row;
}

export async function bookmarkInvestor(opts: {
  accountId: string;
  investorId: string;
  investorName: string;
  addedByEmail: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .insert(investorBookmarks)
    .values({
      accountId: opts.accountId,
      investorId: opts.investorId,
      investorName: opts.investorName,
      addedByEmail: opts.addedByEmail,
    })
    .onConflictDoUpdate({
      target: [investorBookmarks.accountId, investorBookmarks.investorId],
      set: { investorName: opts.investorName },
    });
}

export async function unbookmarkInvestor(opts: {
  accountId: string;
  investorId: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(investorBookmarks)
    .where(
      and(
        eq(investorBookmarks.accountId, opts.accountId),
        eq(investorBookmarks.investorId, opts.investorId),
      ),
    );
}

export async function countBookmarks(accountId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<string>`count(*)::text` })
    .from(investorBookmarks)
    .where(eq(investorBookmarks.accountId, accountId));
  return Number(row?.n ?? 0);
}

// ---------- Investor Network (auto-curated from portfolio companies) ----------

export interface NetworkInvestorCompany {
  uuid: string;
  name: string;
}

export interface NetworkInvestor {
  id: string;
  name: string;
  coInvestmentCount: number;
  portfolioCompanies: NetworkInvestorCompany[];
  logoUrl?: string;
  domain?: string;
  /** OpenSearch organization uuid when a company profile exists. */
  companyUuid?: string;
  /** True when `companyUuid` is set — Investors tab may link to `/company/{uuid}`. */
  hasCompanyProfile: boolean;
}

/**
 * Auto-curated list of investors who have backed any company in the caller's
 * portfolios. Walks: account portfolios → companies → Neptune funding rounds
 * → investors, then enriches with OpenSearch company profiles (batch).
 */
export async function listInvestorNetwork(opts: {
  userEmail: string;
  accountId: string;
  maxPortfolios?: number;
  maxCompaniesPerPortfolio?: number;
}): Promise<NetworkInvestor[]> {
  // Tightened defaults: at the prior 30×60 = 1,800 fan-out we saw Lambda
  // timeouts when Neptune was slow. The marketplace is a "discovery" view —
  // fewer companies per portfolio still surface the most relevant investors.
  const maxPortfolios = opts.maxPortfolios ?? 10;
  const maxCompaniesPerPortfolio = opts.maxCompaniesPerPortfolio ?? 20;
  const HARD_COMPANY_CAP = 100;

  const portfolios = await listWatchlists({
    userEmail: opts.userEmail,
    accountId: opts.accountId,
    scope: "all",
    kind: "portfolio",
  });

  // Collect unique company uuids across all portfolios (a company can live
  // in multiple portfolios; we only want to fetch its funding once).
  const companyMap = new Map<string, { name: string | null }>();
  for (const wl of portfolios.slice(0, maxPortfolios)) {
    const rows = await getWatchlistCompanies(wl.id);
    for (const row of rows.slice(0, maxCompaniesPerPortfolio)) {
      if (!companyMap.has(row.companyUuid)) {
        companyMap.set(row.companyUuid, { name: row.name });
      }
    }
  }
  const companies = Array.from(companyMap.entries())
    .map(([uuid, meta]) => ({ uuid, name: meta.name ?? uuid }))
    .slice(0, HARD_COMPANY_CAP);
  if (companies.length === 0) return [];
  const companyByUuid = new Map(companies.map((c) => [c.uuid, c]));

  // ONE Gremlin round-trip: visits every seed company, walks to funding
  // rounds → investors, dedupes graph-side, projects logo + domain, and
  // reverse-maps each investor back to the SUBSET of our seed companies
  // they actually backed. Replaces the prior N-company fan-out (was up
  // to ~600 calls) — see lib/fuel-data.ts#getCollaborativeInvestors.
  const investors = await getCollaborativeInvestors(companies.map((c) => c.uuid));

  const base: NetworkInvestor[] = investors
    .map((inv) => {
      const portfolioCompanies: NetworkInvestorCompany[] = inv.companyUuids
        .map((uuid) => companyByUuid.get(uuid))
        .filter((c): c is NetworkInvestorCompany => !!c);
      return {
        id: inv.id,
        name: inv.name,
        coInvestmentCount: portfolioCompanies.length,
        portfolioCompanies,
        logoUrl: inv.logoUrl,
        domain: inv.domain,
        hasCompanyProfile: false,
      } satisfies NetworkInvestor;
    })
    .filter((inv) => inv.coInvestmentCount > 0)
    .sort((a, b) => {
      if (b.coInvestmentCount !== a.coInvestmentCount) return b.coInvestmentCount - a.coInvestmentCount;
      return a.name.localeCompare(b.name);
    });

  // Batch OpenSearch enrichment (id → domain → strict name). Never N+1.
  const companyByInvestorId = await resolveCompanyUuidsForInvestors(
    base.map((inv) => ({ id: inv.id, name: inv.name, domain: inv.domain })),
  );

  return base.map((inv) => {
    const companyUuid = companyByInvestorId.get(inv.id);
    if (!companyUuid) return inv;
    return {
      ...inv,
      companyUuid,
      hasCompanyProfile: true,
    };
  });
}
