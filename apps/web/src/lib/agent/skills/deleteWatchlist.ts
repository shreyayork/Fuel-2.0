import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { deleteWatchlist } from "@/lib/watchlists";
import { assertWatchlistWritableBy } from "./_guards";

const input = z.object({
  id: z.string(),
});

export const deleteWatchlistSkill: Skill<z.infer<typeof input>> = {
  name: "deleteWatchlist",
  title: "Delete a watchlist",
  description:
    "Delete a watchlist the caller owns (or a shared account-scoped one). Cascades to members, shares, followers.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ id }, ctx) {
    await assertWatchlistWritableBy(ctx, id);
    await deleteWatchlist(id);
    return { ok: true };
  },
};
