/** Pure helpers for coupon recipient lists (safe for unit tests). */

export function normalizeRecipientEmails(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const email = entry.trim().toLowerCase();
    if (!email) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function parseEmailList(raw: string): string[] {
  return normalizeRecipientEmails(raw.split(/[\s,;]+/).map((s) => s.trim()));
}

/** Comma-separated recipient row ids from FormData. */
export function parseRecipientIdList(raw: string): string[] {
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Whether a checkbox "send this batch" call should run campaign-wide send.
 * Must always be false — empty or missing batch ids must not widen scope.
 */
export function shouldSendScopedBatchOnly(
  createdRecipientIds: string[] | undefined,
): boolean {
  return Array.isArray(createdRecipientIds) && createdRecipientIds.length > 0;
}
