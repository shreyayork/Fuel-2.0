import "server-only";
import type { AccountForUser } from "@/lib/accounts";
import { getActiveAccountForUser } from "@/lib/accounts";
import { sanitizeAuthNextPath } from "@/lib/auth/next-path";

/**
 * Default authenticated landing per workspace mode. Founders with a claimed
 * company land on the company Overview tab; PMs on /overview; everyone else
 * on /watchlists.
 */
export function resolveAuthenticatedHomePath(
  account: AccountForUser | null,
): string {
  if (!account) return "/onboard";

  if (!account.portfolioManagerEnabled && account.primaryCompanyUuid) {
    return `/company/${account.primaryCompanyUuid}?tab=overview`;
  }

  if (account.portfolioManagerEnabled) return "/overview";
  return "/watchlists";
}

/**
 * Post-sign-in redirect: honor an explicit same-origin `next` path when
 * provided; otherwise route to the workspace-appropriate home.
 */
export async function resolvePostAuthRedirect(
  email: string,
  nextPath?: string | null,
): Promise<string> {
  const explicit = sanitizeAuthNextPath(nextPath);
  if (explicit) return explicit;
  const account = await getActiveAccountForUser(email);
  return resolveAuthenticatedHomePath(account);
}
