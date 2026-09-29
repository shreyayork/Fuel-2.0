/**
 * Merge investor holdings from multiple sources; prefer domain, else name.
 * Domain normalize mirrors fuel-data (kept local — no server-only import).
 */

import {
  pickLatestRoundBucket,
  type RoundAnnouncement,
  type RoundBucket,
} from "@/lib/portfolio/round-buckets";

export type HoldingSource = "fuel" | "crunchbase";

export type RawHolding = {
  /** Stable company id when known (Neptune/OpenSearch uuid). */
  companyUuid: string;
  name: string;
  domain?: string | null;
  onFuel?: boolean;
  rounds?: RoundAnnouncement[];
  latestRound?: RoundBucket | null;
  source: HoldingSource;
};

export type MergedHolding = {
  companyUuid: string;
  name: string;
  domain: string | null;
  onFuel: boolean;
  latestRound: RoundBucket | null;
  sources: HoldingSource[];
};

function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  if (!d) return null;
  if (/^https?:\/\//.test(d)) {
    try {
      d = new URL(d).hostname;
    } catch {
      return null;
    }
  }
  d = d.split("/")[0].split(":")[0].replace(/^www\./, "").trim();
  if (!d || !/\./.test(d) || d.length < 4) return null;
  return d;
}

function normName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function holdingKey(h: Pick<RawHolding, "domain" | "name" | "companyUuid">): string {
  const domain = h.domain ? normalizeDomain(h.domain) : null;
  if (domain) return `d:${domain}`;
  const name = normName(h.name);
  if (name) return `n:${name}`;
  return `u:${h.companyUuid.trim()}`;
}

/**
 * Collapse duplicate holdings. Prefer domain match, then uuid, then name.
 * When merging: keep first non-empty uuid; onFuel if either; union sources;
 * latestRound recomputed from combined round announcements (or explicit latestRound
 * treated as a synthetic undated round when no announcements provided).
 */
export function mergeHoldings(raw: RawHolding[]): MergedHolding[] {
  const byKey = new Map<string, MergedHolding & { rounds: RoundAnnouncement[] }>();

  for (const h of raw) {
    const key = holdingKey(h);
    const existing = byKey.get(key);
    const rounds = [...(h.rounds ?? [])];
    if (rounds.length === 0 && h.latestRound) {
      rounds.push({ type: h.latestRound, announcedOn: null });
    }

    if (!existing) {
      byKey.set(key, {
        companyUuid: h.companyUuid,
        name: h.name.trim() || h.companyUuid,
        domain: h.domain ? normalizeDomain(h.domain) : null,
        onFuel: Boolean(h.onFuel),
        latestRound: pickLatestRoundBucket(rounds) ?? h.latestRound ?? null,
        sources: [h.source],
        rounds,
      });
      continue;
    }

    if (!existing.companyUuid && h.companyUuid) {
      existing.companyUuid = h.companyUuid;
    }
    if ((!existing.name || existing.name === existing.companyUuid) && h.name.trim()) {
      existing.name = h.name.trim();
    }
    if (!existing.domain && h.domain) {
      existing.domain = normalizeDomain(h.domain);
    }
    existing.onFuel = existing.onFuel || Boolean(h.onFuel);
    if (!existing.sources.includes(h.source)) {
      existing.sources.push(h.source);
    }
    existing.rounds.push(...rounds);
    existing.latestRound = pickLatestRoundBucket(existing.rounds);
  }

  return [...byKey.values()].map(({ rounds: _r, ...rest }) => rest);
}
