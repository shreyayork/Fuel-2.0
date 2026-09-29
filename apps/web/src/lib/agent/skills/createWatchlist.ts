import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { createWatchlist, isDuplicateWatchlistNameError } from "@/lib/watchlists";

const input = z.object({
  name: z.string().min(1),
  kind: z.enum(["portfolio", "watchlist"]).default("watchlist"),
  scope: z.enum(["private", "account", "team"]).default("private"),
  description: z.string().optional(),
  fundName: z.string().optional(),
  teamIds: z.array(z.string()).optional(),
});

export const createWatchlistSkill: Skill<z.infer<typeof input>> = {
  name: "createWatchlist",
  title: "Create a watchlist",
  description:
    "Create a new watchlist or portfolio owned by the caller. Scope controls visibility (private = owner only, account = all account members, team = linked teams via teamIds).",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ name, kind, scope, description, fundName, teamIds }, ctx) {
    try {
      const row = await createWatchlist({
        name,
        ownerEmail: ctx.userEmail,
        accountId: ctx.accountId,
        kind,
        scope,
        description,
        fundName,
        teamIds: scope === "team" ? teamIds : undefined,
      });
      return { watchlist: row };
    } catch (error) {
      if (isDuplicateWatchlistNameError(error)) {
        return { error: error.message };
      }
      throw error;
    }
  },
};
