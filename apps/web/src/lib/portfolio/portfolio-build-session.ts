/**
 * Session flag for the Portfolios build animation.
 * Scoped by account + firm so a later claim in the same browser still plays.
 * A refresh for the same account and firm stays suppressed.
 */

export function portfolioBuildPlayedKey(accountId: string, firmName: string): string {
  const account =
    accountId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "") || "account";
  const firm =
    firmName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "firm";
  return `fuel:portfolio-build-played:${account}:${firm}`;
}

export function shouldPlayPortfolioBuild(opts: {
  kind: string;
  firstLanding: boolean;
  stored: string | null;
}): boolean {
  if (opts.kind !== "portfolio" || !opts.firstLanding) return false;
  return opts.stored !== "1";
}
