import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { addCompanyToWatchlist } from "@/lib/watchlists";
import { assertWatchlistWritableBy } from "./_guards";

const input = z.object({
  watchlistId: z.string(),
  companyUuid: z.string().describe("fuel-data or cat_-prefixed UUID"),
  name: z.string().optional().describe("Display name, stored alongside the uuid"),
});

export const addCompanyToWatchlistSkill: Skill<z.infer<typeof input>> = {
  name: "addCompanyToWatchlist",
  title: "Add a company to a watchlist",
  description: "Append a company to a watchlist. Idempotent — repeated calls do nothing.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ watchlistId, companyUuid, name }, ctx) {
    await assertWatchlistWritableBy(ctx, watchlistId);
    await addCompanyToWatchlist({
      watchlistId,
      companyUuid,
      name: name ?? null,
      addedByEmail: ctx.userEmail,
    });
    return { ok: true };
  },
};
