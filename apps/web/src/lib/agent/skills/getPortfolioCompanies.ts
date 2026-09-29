import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getWatchlist, getWatchlistCompanies } from "@/lib/watchlists";
import { listLatestByCompanies } from "@/lib/portfolio-updates";

const input = z.object({
  portfolioId: z
    .string()
    .describe(
      "The watchlist/portfolio UUID — get this from listPortfolios first. If the caller only gave a name, call listPortfolios with nameContains to resolve to an id.",
    ),
  includeLatestMetrics: z
    .boolean()
    .optional()
    .default(true)
    .describe("When true (default), attach each company's most recent private metrics (ARR, NRR, burn, etc.) to the response."),
});

export const getPortfolioCompaniesSkill: Skill<
  z.infer<typeof input>,
  {
    portfolio: {
      id: string;
      name: string;
      kind: "portfolio" | "watchlist";
      fundName: string | null;
      companyCount: number;
    } | null;
    companies: Array<{
      companyUuid: string;
      name: string | null;
      addedAt: string;
      latestMetrics?: {
        period: string;
        status: "draft" | "submitted";
        fteCount: number | null;
        arrUsd: number | null;
        arrGrowthYoyPct: number | null;
        nrrPct: number | null;
        logoRetentionPct: number | null;
        monthlyBurnUsd: number | null;
        cashOnHandUsd: number | null;
        paidCustomerCount: number | null;
        grossMarginPct: number | null;
        ruleOf40Pct: number | null;
        notableCustomers: string | null;
        challenges: string | null;
      } | null;
    }>;
  }
> = {
  name: "getPortfolioCompanies",
  title: "Get all companies in a portfolio or watchlist",
  description:
    "Return every company in a named portfolio/watchlist, optionally with each company's latest private metrics attached. This is the primary entry point for any cross-portfolio analysis (trends, benchmark aggregation, survey rollups).",
  inputSchema: input,
  readOnly: true,
  costTokens: 500,
  async execute({ portfolioId, includeLatestMetrics }, ctx) {
    const watchlist = await getWatchlist(portfolioId);
    if (!watchlist) return { portfolio: null, companies: [] };
    const companies = await getWatchlistCompanies(portfolioId);
    const uuids = companies.map((c) => c.companyUuid);
    const metricsByUuid = includeLatestMetrics && uuids.length > 0
      ? await listLatestByCompanies({ accountId: ctx.accountId, companyUuids: uuids })
      : new Map();

    return {
      portfolio: {
        id: watchlist.id,
        name: watchlist.name,
        kind: watchlist.kind,
        fundName: watchlist.fundName,
        companyCount: companies.length,
      },
      companies: companies.map((c) => {
        const m = metricsByUuid.get(c.companyUuid) ?? null;
        return {
          companyUuid: c.companyUuid,
          name: c.name,
          addedAt: c.addedAt.toISOString(),
          latestMetrics: includeLatestMetrics
            ? m
              ? {
                  period: m.period,
                  status: m.status,
                  fteCount: m.fteCount,
                  arrUsd: m.arrUsd,
                  arrGrowthYoyPct: m.arrGrowthYoyPct,
                  nrrPct: m.nrrPct,
                  logoRetentionPct: m.logoRetentionPct,
                  monthlyBurnUsd: m.monthlyBurnUsd,
                  cashOnHandUsd: m.cashOnHandUsd,
                  paidCustomerCount: m.paidCustomerCount,
                  grossMarginPct: m.grossMarginPct,
                  ruleOf40Pct: m.ruleOf40Pct,
                  notableCustomers: m.notableCustomers,
                  challenges: m.challenges,
                }
              : null
            : undefined,
        };
      }),
    };
  },
};
