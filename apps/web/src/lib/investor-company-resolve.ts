/**
 * Pure helpers for investor → company-profile matching.
 * Free of `server-only` so unit tests can import without OpenSearch/Neptune.
 */

/** Normalize a company/investor name to a lookup key. */
export function normalizeCompanyName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let n = raw.trim().toLowerCase();
  if (!n) return null;
  n = n
    .replace(/[\u2018\u2019'`]/g, "")
    .replace(/[^a-z0-9&\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  n = n.replace(
    /\s+(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|gmbh|ag|sa|plc|ab|oy|pte|bv|nv)\.?$/i,
    "",
  );
  return n.trim() || null;
}

/**
 * Build normalized-name → uuid only when exactly one distinct uuid maps to
 * that key. Ambiguous duplicate names yield no entry (no link).
 */
export function uniqueNormalizedNameToUuid(
  hits: Array<{ uuid: string; name: string }>,
): Map<string, string> {
  const buckets = new Map<string, Set<string>>();
  for (const h of hits) {
    const key = normalizeCompanyName(h.name);
    if (!key || !h.uuid) continue;
    let set = buckets.get(key);
    if (!set) {
      set = new Set();
      buckets.set(key, set);
    }
    set.add(h.uuid);
  }
  const out = new Map<string, string>();
  for (const [key, set] of buckets) {
    if (set.size === 1) {
      const [uuid] = set;
      if (uuid) out.set(key, uuid);
    }
  }
  return out;
}

/**
 * Build domain → uuid only when exactly one org owns that domain.
 * `normalizeDomainFn` injected so this module stays free of fuel-data imports.
 */
export function uniqueDomainToUuid(
  hits: Array<{ uuid: string; domain?: string | null }>,
  normalizeDomainFn: (raw: string | null | undefined) => string | null,
): Map<string, string> {
  const buckets = new Map<string, Set<string>>();
  for (const h of hits) {
    const d = normalizeDomainFn(h.domain);
    if (!d || !h.uuid) continue;
    let set = buckets.get(d);
    if (!set) {
      set = new Set();
      buckets.set(d, set);
    }
    set.add(h.uuid);
  }
  const out = new Map<string, string>();
  for (const [key, set] of buckets) {
    if (set.size === 1) {
      const [uuid] = set;
      if (uuid) out.set(key, uuid);
    }
  }
  return out;
}
