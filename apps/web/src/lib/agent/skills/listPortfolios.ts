import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listWatchlists } from "@/lib/watchlists";

const input = z.object({
  kind: z
    .enum(["portfolio", "watchlist", "all"])
    .optional()
    .default("all")
    .describe(
      "Filter to portfolios (funds), watchlists (market lists), or return both. Default 'all'.",
    ),
  nameContains: z
    .string()
    .optional()
    .describe("Case-insensitive substring match on watchlist name — use this when the caller mentions a specific portfolio by name."),
});

export const listPortfoliosSkill: Skill<
  z.infer<typeof input>,
  {
    items: Array<{
      id: string;
      name: string;
      kind: "portfolio" | "watchlist";
      scope: string;
      fundName: string | null;
      companyCount: number;
      ownerEmail: string;
      updatedAt: string;
    }>;
  }
> = {
  name: "listPortfolios",
  title: "List portfolios and watchlists",
  description:
    "Return the portfolios and watchlists the caller can access, with company counts. Use this as the first step in any cross-portfolio workflow — pick the item by name, then call getPortfolioCompanies with its id.",
  inputSchema: input,
  readOnly: true,
  costTokens: 200,
  async execute({ kind, nameContains }, ctx) {
    const rows = await listWatchlists({
      userEmail: ctx.userEmail,
      accountId: ctx.accountId,
      scope: "all",
      kind: kind === "all" ? undefined : kind,
    });
    const filtered = nameContains
      ? rows.filter((r) => r.name.toLowerCase().includes(nameContains.toLowerCase()))
      : rows;
    return {
      items: filtered.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        scope: r.scope,
        fundName: r.fundName,
        companyCount: r.companyCount,
        ownerEmail: r.ownerEmail,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  },
};
