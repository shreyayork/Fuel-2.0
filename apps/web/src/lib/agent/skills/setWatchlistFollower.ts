import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { setFollower } from "@/lib/watchlists";

const input = z.object({
  watchlistId: z.string(),
  cadence: z.enum(["off", "daily", "weekly", "monthly"]).optional(),
  starred: z.boolean().optional(),
});

export const setWatchlistFollowerSkill: Skill<z.infer<typeof input>> = {
  name: "setWatchlistFollower",
  title: "Update the caller's follow state on a watchlist",
  description:
    "Set or update the caller's follower record on a watchlist — digest cadence (off/daily/weekly/monthly) and star flag. Only affects the caller's own subscription; no ownership check needed.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ watchlistId, cadence, starred }, ctx) {
    await setFollower({
      watchlistId,
      userEmail: ctx.userEmail,
      cadence,
      starred,
    });
    return { ok: true };
  },
};
