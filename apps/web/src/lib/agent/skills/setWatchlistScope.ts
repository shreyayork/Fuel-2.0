import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { setScope } from "@/lib/watchlists";
import { assertWatchlistWritableBy } from "./_guards";

const input = z.object({
  id: z.string(),
  scope: z.enum(["private", "account", "team"]),
  teamIds: z.array(z.string()).optional(),
});

export const setWatchlistScopeSkill: Skill<z.infer<typeof input>> = {
  name: "setWatchlistScope",
  title: "Change a watchlist's scope",
  description:
    "Change a watchlist's visibility scope (private / account / team). For team scope, pass teamIds to link teams via watchlist_teams.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ id, scope, teamIds }, ctx) {
    await assertWatchlistWritableBy(ctx, id);
    await setScope(id, scope, scope === "team" ? teamIds : undefined);
    return { ok: true };
  },
};
