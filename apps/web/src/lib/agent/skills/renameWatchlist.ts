import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { isDuplicateWatchlistNameError, renameWatchlist } from "@/lib/watchlists";
import { assertWatchlistWritableBy } from "./_guards";

const input = z.object({
  id: z.string(),
  name: z.string().min(1),
});

export const renameWatchlistSkill: Skill<z.infer<typeof input>> = {
  name: "renameWatchlist",
  title: "Rename a watchlist",
  description: "Rename a watchlist the caller owns (or a shared account-scoped one).",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ id, name }, ctx) {
    await assertWatchlistWritableBy(ctx, id);
    try {
      await renameWatchlist(id, name);
      return { ok: true };
    } catch (error) {
      if (isDuplicateWatchlistNameError(error)) {
        return { error: error.message };
      }
      throw error;
    }
  },
};
