/**
 * Paging clamps for company search (public API + searchCompanies).
 * OpenSearch organizations index uses default max_result_window=10000
 * (from+size). We do not silently re-clamp offset below that — OS rejects
 * windows that are too large.
 *
 * Deep / full-corpus crawls: use cursor pagination (`cursor` + `search_after`)
 * instead of large offsets. See public companies/search route docs.
 * With limit=50, offset mode is unsafe beyond offset 9950.
 */

export function clampSearchLimit(limit: number | undefined): number {
  return Math.min(50, Math.max(1, limit ?? 10));
}

/** Non-negative finite offset only — no artificial 1000 ceiling. */
export function clampSearchOffset(offset: number | undefined): number {
  const n = offset ?? 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}
