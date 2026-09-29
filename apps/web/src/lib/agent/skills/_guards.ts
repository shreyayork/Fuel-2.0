import "server-only";
import { getWatchlist } from "@/lib/watchlists";
import type { Watchlist } from "@/db/schema";
import type { SkillContext } from "../types";
import { SUPER_ADMIN_GROUP } from "@/lib/auth/superadmin";

export class SkillAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillAuthorizationError";
  }
}

/**
 * Enforce that the MCP caller holds the super-admin Cognito group. Tokens
 * snapshot the caller's groups at creation time; revoking the group
 * upstream doesn't invalidate existing tokens — rotate them if that matters.
 */
export function assertSuperAdmin(ctx: SkillContext): void {
  if (!ctx.groups?.includes(SUPER_ADMIN_GROUP)) {
    throw new SkillAuthorizationError(
      `skill requires the '${SUPER_ADMIN_GROUP}' group; caller ${ctx.userEmail} is not a super admin`,
    );
  }
}

/**
 * Load a watchlist and confirm the caller can mutate it. We accept either:
 *   - the caller owns the watchlist (ownerEmail matches), or
 *   - the watchlist is account-scoped AND the caller is in that account, or
 *   - the watchlist is team-scoped AND the caller is on a linked team.
 * Private watchlists owned by another user are never writable via MCP,
 * even if the caller is in the same account — that matches the UI rules.
 */
export async function assertWatchlistWritableBy(
  ctx: SkillContext,
  watchlistId: string,
): Promise<Watchlist> {
  const wl = await getWatchlist(watchlistId);
  if (!wl) throw new SkillAuthorizationError(`watchlist ${watchlistId} not found`);
  if (wl.ownerEmail === ctx.userEmail) return wl;
  if (wl.scope === "account" && wl.accountId === ctx.accountId) return wl;
  if (wl.scope === "team" && wl.accountId === ctx.accountId) {
    const { userCanViewWatchlist } = await import("@/lib/watchlists");
    const canView = await userCanViewWatchlist({
      watchlist: wl,
      userEmail: ctx.userEmail,
      accountId: ctx.accountId,
    });
    if (canView) return wl;
  }
  throw new SkillAuthorizationError(
    `watchlist ${watchlistId} is not writable by ${ctx.userEmail}`,
  );
}
