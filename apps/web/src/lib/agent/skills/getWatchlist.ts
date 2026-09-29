import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getWatchlist, getWatchlistCompanies, userCanViewWatchlist } from "@/lib/watchlists";

const input = z.object({
  id: z.string(),
});

export const getWatchlistSkill: Skill<z.infer<typeof input>> = {
  name: "getWatchlist",
  title: "Get a watchlist with companies",
  description: "Return the watchlist row plus its member companies, newest addition first.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ id }, ctx) {
    const wl = await getWatchlist(id);
    if (!wl) return { watchlist: null, companies: [] };
    const canView = await userCanViewWatchlist({
      watchlist: wl,
      userEmail: ctx.userEmail,
      accountId: ctx.accountId,
    });
    if (!canView) {
      return { watchlist: null, companies: [] };
    }
    const companies = await getWatchlistCompanies(id);
    return { watchlist: wl, companies };
  },
};
