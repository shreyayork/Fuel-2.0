import { parseFoundedYear } from "@/lib/enrichment/crunchbase-fields";

/** Inclusive minimum founding year for onboarding. */
export const MIN_FOUNDED_YEAR = 1800;

/** Current calendar year — onboarding founded upper bound. */
export function maxFoundedYear(now = new Date()): number {
  return now.getFullYear();
}

/**
 * Normalize enrichment / free-text founded values to a 4-digit year string.
 * Returns "" when nothing usable is found.
 */
export function normalizeFoundedYearForForm(
  raw: string | null | undefined,
): string {
  if (raw == null) return "";
  const parsed = parseFoundedYear(typeof raw === "string" ? raw.trim() : raw);
  return parsed ?? "";
}

/**
 * True when `raw` is exactly a 4-digit year within the onboarding range.
 * Does not accept ISO dates or embedded years — those must be normalized first.
 */
export function isValidFoundedYear(
  raw: string,
  now = new Date(),
): boolean {
  const s = raw.trim();
  if (!/^\d{4}$/.test(s)) return false;
  const n = Number(s);
  return n >= MIN_FOUNDED_YEAR && n <= maxFoundedYear(now);
}

/** Digits-only, max 4 chars — for controlled year inputs. */
export function filterFoundedYearInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}
