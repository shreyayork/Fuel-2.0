import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { removeCompanyFromWatchlist } from "@/lib/watchlists";
import { assertWatchlistWritableBy } from "./_guards";

const input = z.object({
  watchlistId: z.string(),
  companyUuid: z.string(),
});

export const removeCompanyFromWatchlistSkill: Skill<z.infer<typeof input>> = {
  name: "removeCompanyFromWatchlist",
  title: "Remove a company from a watchlist",
  description: "Remove a company from a watchlist. No-op if the company isn't in the list.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ watchlistId, companyUuid }, ctx) {
    await assertWatchlistWritableBy(ctx, watchlistId);
    await removeCompanyFromWatchlist(watchlistId, companyUuid);
    return { ok: true };
  },
};
