/**
 * Pure hover logic for benchmark track tooltips (F20A-256).
 *
 * Axis is 0–100 percentile (pixel → percent), not value/(p90*1.3).
 * Snap: nearest of 25/50/75/90; ties prefer the higher bucket.
 * rawPct ≥ 96 → "Above p90" (anchor at raw; body uses p90 cohort value).
 */

export type TrackHoverBucket = "p25" | "p50" | "p75" | "p90" | "above";

export type TrackHoverCohort = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

export type TrackHoverSnap = {
  bucket: TrackHoverBucket;
  /** Position for indicator / tooltip anchor before clamp (0–100). */
  anchorPct: number;
};

export type TrackHoverTooltip = {
  bucket: TrackHoverBucket;
  title: string;
  body: string;
  /** Indicator + raw tooltip anchor before clamp. */
  indicatorPct: number;
  /** Clamped horizontal placement for tooltip (12–88). */
  tooltipLeftPct: number;
};

const SNAP_POINTS = [25, 50, 75, 90] as const;
const ABOVE_THRESHOLD = 96;
const TOOLTIP_CLAMP_MIN = 12;
const TOOLTIP_CLAMP_MAX = 88;

const TITLES: Record<TrackHoverBucket, string> = {
  p25: "p25",
  p50: "p50 · median",
  p75: "p75",
  p90: "p90",
  above: "Above p90",
};

const BODY_HIGHER: Record<TrackHoverBucket, string> = {
  p25: "{value} — 25% of peers are at or below this. Most of the cohort sits above this number.",
  p50: "{value} — the middle of the peer set. Half of companies are below this, half are above.",
  p75: "{value} — 75% of peers are at or below this. This is ahead of most of the cohort.",
  p90: "{value} — only the strongest 10% of peers sit above this.",
  above:
    "{value} sits past the top of this peer set — stronger than almost every company you are comparing against.",
};

const BODY_LOWER: Record<TrackHoverBucket, string> = {
  p25: "{value} — 25% of peers are at or below this. On this metric, lower is better, so this is the stronger end of the set.",
  p50: "{value} — the middle of the peer set. Half of companies sit below this number.",
  p75: "{value} — 75% of peers are at or below this. Most of the cohort is doing better on this metric.",
  p90: "{value} — only the heaviest 10% of peers sit above this.",
  above:
    "{value} sits past the top of this peer set. On this metric, lower is better — almost every peer is lighter than this.",
};

function snapPointToBucket(
  point: (typeof SNAP_POINTS)[number],
): Exclude<TrackHoverBucket, "above"> {
  if (point === 25) return "p25";
  if (point === 50) return "p50";
  if (point === 75) return "p75";
  return "p90";
}

/**
 * Snap raw track percent to a percentile bucket.
 * Exact midpoints (equal distance) prefer the higher snap point.
 */
export function trackHoverBucket(rawPct: number): TrackHoverSnap {
  const raw = Number.isFinite(rawPct)
    ? Math.min(100, Math.max(0, rawPct))
    : 0;

  if (raw >= ABOVE_THRESHOLD) {
    return { bucket: "above", anchorPct: raw };
  }

  let best: (typeof SNAP_POINTS)[number] = SNAP_POINTS[0];
  let bestDist = Math.abs(raw - best);
  for (const point of SNAP_POINTS) {
    const dist = Math.abs(raw - point);
    if (dist < bestDist || (dist === bestDist && point > best)) {
      best = point;
      bestDist = dist;
    }
  }

  return { bucket: snapPointToBucket(best), anchorPct: best };
}

export function clampTooltipAnchorPct(anchorPct: number): number {
  if (!Number.isFinite(anchorPct)) return TOOLTIP_CLAMP_MIN;
  return Math.min(TOOLTIP_CLAMP_MAX, Math.max(TOOLTIP_CLAMP_MIN, anchorPct));
}

export function cohortValueForBucket(
  bucket: TrackHoverBucket,
  cohort: TrackHoverCohort,
): number | null {
  const key = bucket === "above" ? "p90" : bucket;
  const value = cohort[key];
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

export function trackHoverTitle(bucket: TrackHoverBucket): string {
  return TITLES[bucket];
}

export function trackHoverBody(
  bucket: TrackHoverBucket,
  formattedValue: string,
  lowerIsBetter: boolean,
): string {
  const template = lowerIsBetter ? BODY_LOWER[bucket] : BODY_HIGHER[bucket];
  return template.replace("{value}", formattedValue);
}

export function resolveTrackHoverTooltip(args: {
  rawPct: number;
  cohort: TrackHoverCohort;
  lowerIsBetter: boolean;
  formatValue: (value: number) => string;
}): TrackHoverTooltip | null {
  const snap = trackHoverBucket(args.rawPct);
  const cohortValue = cohortValueForBucket(snap.bucket, args.cohort);
  if (cohortValue == null) return null;

  const formatted = args.formatValue(cohortValue);
  if (!formatted.trim()) return null;

  return {
    bucket: snap.bucket,
    title: trackHoverTitle(snap.bucket),
    body: trackHoverBody(snap.bucket, formatted, args.lowerIsBetter),
    indicatorPct: snap.anchorPct,
    tooltipLeftPct: clampTooltipAnchorPct(snap.anchorPct),
  };
}
