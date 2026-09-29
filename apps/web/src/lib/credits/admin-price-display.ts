/**
 * Admin catalog strike-through helpers (F20A-244).
 * List/compare-at is display-only; charged amounts stay on price_* columns.
 */

export type StrikePriceDisplay =
  | { showStrike: true; listCents: number; finalCents: number }
  | { showStrike: false; finalCents: number | null };

/** Strike when list is set and strictly greater than the charged/final amount. */
export function resolveStrikePrice(
  listPriceCents: number | null | undefined,
  finalCents: number | null | undefined,
): StrikePriceDisplay {
  if (finalCents == null || !Number.isInteger(finalCents)) {
    return { showStrike: false, finalCents: null };
  }
  if (
    listPriceCents != null &&
    Number.isInteger(listPriceCents) &&
    listPriceCents > finalCents
  ) {
    return { showStrike: true, listCents: listPriceCents, finalCents };
  }
  return { showStrike: false, finalCents };
}

/** Same rule as {@link resolveStrikePrice}, for DTO amounts already in USD. */
export function resolveStrikePriceUsd(
  listUsd: number | null | undefined,
  finalUsd: number | null | undefined,
): StrikePriceDisplay {
  return resolveStrikePrice(
    listUsd == null || !Number.isFinite(listUsd) ? null : Math.round(listUsd * 100),
    finalUsd == null || !Number.isFinite(finalUsd) ? null : Math.round(finalUsd * 100),
  );
}

export function formatUsdFromCents(
  cents: number,
  fractionDigits: 0 | 2 = 2,
): string {
  return `$${(cents / 100).toFixed(fractionDigits)}`;
}
