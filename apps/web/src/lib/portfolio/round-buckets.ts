/**
 * Normalize funding-round labels into Portfolios latest-round buckets.
 * Membership is always the company's most recent announced round (not thesis).
 */

export const ROUND_BUCKETS = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Growth",
] as const;

export type RoundBucket = (typeof ROUND_BUCKETS)[number];

/** Aliases → bucket. Keys are lowercased, punctuation collapsed to spaces. */
const ALIAS_TO_BUCKET: Record<string, RoundBucket> = {
  "pre seed": "Pre-seed",
  preseed: "Pre-seed",
  "pre-seed": "Pre-seed",
  angel: "Pre-seed",
  seed: "Seed",
  "seed+": "Seed",
  "seed plus": "Seed",
  "series a": "Series A",
  "series a1": "Series A",
  "series a-1": "Series A",
  "series a 1": "Series A",
  "series b": "Series B",
  "series b1": "Series B",
  "series b-1": "Series B",
  "series c": "Series C",
  "series c1": "Series C",
  "series c+": "Growth",
  "series c plus": "Growth",
  "series d": "Growth",
  "series e": "Growth",
  "series f": "Growth",
  growth: "Growth",
  "growth equity": "Growth",
  "late stage": "Growth",
  "late-stage": "Growth",
  ipo: "Growth",
  "post ipo": "Growth",
  "post-ipo": "Growth",
};

function canonicalizeRoundLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a messy round label to a Portfolios bucket, or null if unknown. */
export function toRoundBucket(raw: string | null | undefined): RoundBucket | null {
  if (!raw?.trim()) return null;
  const key = canonicalizeRoundLabel(raw);
  if (ALIAS_TO_BUCKET[key]) return ALIAS_TO_BUCKET[key];

  // Series A-1 / Seed+ style leftovers after canonicalize
  const series = /^series\s+([a-f])(?:\s*[-\s]?\s*\d+)?\+?$/.exec(key);
  if (series) {
    const letter = series[1];
    if (letter === "a") return "Series A";
    if (letter === "b") return "Series B";
    if (letter === "c") return "Series C";
    return "Growth";
  }
  if (key.startsWith("seed")) return "Seed";
  if (key.includes("growth") || key.includes("ipo")) return "Growth";
  return null;
}

export type RoundAnnouncement = {
  type?: string | null;
  announcedOn?: string | null;
};

/**
 * Latest usable round = newest by announcedOn that maps to a bucket.
 * Rounds without dates sort last; unknown types are skipped.
 */
export function pickLatestRoundBucket(
  rounds: RoundAnnouncement[],
): RoundBucket | null {
  if (rounds.length === 0) return null;
  const sorted = [...rounds].sort((a, b) =>
    (b.announcedOn ?? "").localeCompare(a.announcedOn ?? ""),
  );
  for (const r of sorted) {
    const bucket = toRoundBucket(r.type);
    if (bucket) return bucket;
  }
  return null;
}

/** Group companies by latest-round bucket; omit empty buckets. Unknown → unbucketed. */
export function groupByLatestRoundBucket<T extends { latestRound: RoundBucket | null }>(
  companies: T[],
): { byBucket: Map<RoundBucket, T[]>; unbucketed: T[] } {
  const byBucket = new Map<RoundBucket, T[]>();
  const unbucketed: T[] = [];
  for (const c of companies) {
    if (!c.latestRound) {
      unbucketed.push(c);
      continue;
    }
    const list = byBucket.get(c.latestRound) ?? [];
    list.push(c);
    byBucket.set(c.latestRound, list);
  }
  return { byBucket, unbucketed };
}
