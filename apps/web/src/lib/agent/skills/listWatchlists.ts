import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listWatchlists } from "@/lib/watchlists";

const input = z.object({
  scope: z
    .enum([
      "all",
      "portfolios",
      "watchlists",
      "mine",
      "account",
      "team",
      "private",
      "shared",
      "starred",
    ])
    .default("all"),
  kind: z.enum(["portfolio", "watchlist"]).optional(),
});

export const listWatchlistsSkill: Skill<z.infer<typeof input>> = {
  name: "listWatchlists",
  title: "List watchlists visible to the caller",
  description:
    "Return watchlists/portfolios the caller owns, is shared on, or is account-scoped to — with preview companies and follower state.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ scope, kind }, ctx) {
    const items = await listWatchlists({ userEmail: ctx.userEmail, accountId: ctx.accountId, scope, kind });
    return { watchlists: items };
  },
};
