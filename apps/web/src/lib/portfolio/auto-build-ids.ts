/**
 * Naming + fundName markers for auto-built investor portfolios.
 * fundName prefix lets us find/delete without a schema migration.
 */

import type { RoundBucket } from "@/lib/portfolio/round-buckets";

export const AUTO_FUND_PREFIX = "auto:fund:";
export const AUTO_ROUND_PREFIX = "auto:round:";

export function firmSlug(firmName: string): string {
  return firmName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "firm";
}

export function combinedFundName(firmName: string): string {
  const base = firmName.trim() || "Firm";
  return /portfolio/i.test(base) ? base : `${base} Portfolio`;
}

export function roundListName(firmName: string, bucket: RoundBucket): string {
  const base = firmName.trim() || "Firm";
  return `${base} · ${bucket}`;
}

export function autoFundKey(firmName: string): string {
  return `${AUTO_FUND_PREFIX}${firmSlug(firmName)}`;
}

export function autoRoundKey(firmName: string, bucket: RoundBucket): string {
  return `${AUTO_ROUND_PREFIX}${firmSlug(firmName)}:${bucket}`;
}

export function isAutoBuiltFundName(fundName: string | null | undefined): boolean {
  if (!fundName) return false;
  return (
    fundName.startsWith(AUTO_FUND_PREFIX) || fundName.startsWith(AUTO_ROUND_PREFIX)
  );
}

/**
 * True when fundName is this firm's auto:fund: / auto:round: key.
 * DELETE / empty-shell rebuild must use this only — never display name —
 * so a user-created list named "{firm} Portfolio" is never removed.
 */
export function isKeyedAutoBuiltFirmList(
  firmName: string,
  list: { fundName?: string | null },
): boolean {
  const fn = list.fundName;
  if (!fn || !isAutoBuiltFundName(fn)) return false;
  const fundKey = autoFundKey(firmName);
  const roundPrefix = `${AUTO_ROUND_PREFIX}${firmSlug(firmName)}:`;
  return fn === fundKey || fn.startsWith(roundPrefix);
}

/**
 * True when a portfolio list belongs to this firm's auto-build set —
 * by fundName key *or* display name (reuse lookup after name collision).
 * Do not use for destructive delete.
 */
export function matchesAutoBuiltFirmList(
  firmName: string,
  list: { name: string; fundName?: string | null },
): boolean {
  if (isKeyedAutoBuiltFirmList(firmName, list)) return true;
  const name = list.name.trim().toLowerCase();
  if (name === combinedFundName(firmName).trim().toLowerCase()) return true;
  for (const bucket of [
    "Pre-seed",
    "Seed",
    "Series A",
    "Series B",
    "Series C",
    "Growth",
  ] as const) {
    if (name === roundListName(firmName, bucket).trim().toLowerCase()) return true;
  }
  return false;
}

/**
 * Empty auto shells eligible for delete+rebuild: keyed auto fundName AND
 * zero companies. Manual lists (no auto fundName) are never eligible.
 */
export function isDeletableEmptyAutoShell(
  firmName: string,
  list: { fundName?: string | null; companyCount?: number },
): boolean {
  if (!isKeyedAutoBuiltFirmList(firmName, list)) return false;
  return (list.companyCount ?? 0) === 0;
}

/** Description marker for manually created portfolios with a required cohort. */
export const MANUAL_COHORT_PREFIX = "cohort:";

export function manualCohortDescription(bucket: RoundBucket): string {
  return `${MANUAL_COHORT_PREFIX}${bucket}`;
}

export function parseManualCohort(
  description: string | null | undefined,
): RoundBucket | null {
  if (!description?.startsWith(MANUAL_COHORT_PREFIX)) return null;
  const raw = description.slice(MANUAL_COHORT_PREFIX.length).trim();
  const allowed = [
    "Pre-seed",
    "Seed",
    "Series A",
    "Series B",
    "Series C",
    "Growth",
  ] as const;
  return (allowed as readonly string[]).includes(raw)
    ? (raw as (typeof allowed)[number])
    : null;
}
