/**
 * Rule-based Track insights chips (“What’s working” / “Needs improvement”).
 * Ported from Design/src/app/ScorecardV2.tsx buildTrackInsightLists — not AI-generated.
 */
import type { OverviewCategoryId } from "./constants";
import { CATEGORY_METRIC_KEYS } from "./constants";
import { ONBOARD_UNKNOWN_LABEL } from "@/lib/onboard/unknown-answer";
import type { ScoreContributor } from "./types";

export type TrackInsightItem = {
  id: string;
  label: string;
  detail: string;
  source: "benchmark" | "profile" | "detail" | "intelligence";
  sortKey: number;
};

export type TrackInsightIntelItem = {
  id: string;
  title: string;
  text: string;
  highlight?: string | null;
};

const TRACK_INSIGHT_SOURCE: Record<TrackInsightItem["source"], string> = {
  benchmark: "Benchmark",
  profile: "Profile",
  detail: "Your answers",
  intelligence: "Intelligence",
};

/** Founder-facing chip labels for benchmark metrics (prompt catalog). */
export const TRACK_INSIGHT_METRIC_LABELS: Record<string, string> = {
  arr_usd: "Annual recurring revenue",
  arr_growth_yoy_pct: "Revenue growth",
  nrr_pct: "Net revenue retention",
  logo_retention_pct: "Customer retention",
  gross_margin_pct: "Gross margin",
  monthly_burn_usd: "Monthly cash burn",
  cash_on_hand_usd: "Cash in the bank",
  fte_count: "Team size",
  paid_customer_count: "Paying customers",
  cac_payback: "Payback on customer acquisition",
  burn_multiple: "Burn multiple",
  rule_of_40: "Growth vs. burn balance",
};

const POSITION_LABELS: Record<"top" | "upper" | "mid" | "lower" | "bottom", string> = {
  top: "Top of cohort",
  upper: "Above median",
  mid: "Around median",
  lower: "Below median",
  bottom: "Bottom of cohort",
};

const INTEL_WEAK_HINTS =
  /\b(gap|risk|delay|churn|miss|weak|concern|stall|behind|below|lack|without|guesswork|spreadsheet|founder-led|ad hoc|exploring|fuzzy|not yet|not tracked|manual)\b/i;
const INTEL_STRONG_HINTS =
  /\b(strong|top quartile|validated|crisp|automated|high confidence|ahead|momentum|landed|closed|expansion|efficient|weekly|dedicated hire|hubspot|salesforce)\b/i;

function isMissingContributor(c: ScoreContributor): boolean {
  return (
    c.display === "Not answered" ||
    c.display === "Not logged" ||
    c.display === "Not provided" ||
    // Explicit "I don't know / NA" is unanswered for chips (same as empty).
    c.display === ONBOARD_UNKNOWN_LABEL
  );
}

function tierFromBenchmarkScore(
  score: number,
): "top" | "upper" | "mid" | "lower" | "bottom" {
  if (score >= 85) return "top";
  if (score >= 65) return "upper";
  if (score >= 45) return "mid";
  if (score >= 25) return "lower";
  return "bottom";
}

function toSentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function founderPlainCopy(text: string): string {
  return text
    .replace(/\bDRI\b/g, "a clear owner")
    .replace(/\bdemand gen\b/gi, "demand generation")
    .replace(/\bICP\b/g, "ideal customer profile")
    .replace(/\bNRR\b/g, "net revenue retention")
    .replace(/\bCAC\b/g, "customer acquisition cost")
    .replace(/\bLTV\b/g, "customer lifetime value")
    .replace(/\bYoY\b/g, "year over year")
    .replace(/\bFTE\b/g, "full-time employee")
    .replace(/\bG&A\b/g, "finance and operations")
    .replace(/\bGTM\b/g, "go-to-market")
    .replace(/\bRevOps\b/g, "revenue operations")
    .replace(/\bFinOps\b/g, "finance operations")
    .replace(/\btop-of-funnel\b/gi, "top of the funnel");
}

function insightDetail(detail: string, source: TrackInsightItem["source"]): string {
  return founderPlainCopy(`${detail} · ${TRACK_INSIGHT_SOURCE[source]}`);
}

export function insightTopicKey(label: string): string {
  const base = label.split(":")[0]?.trim() ?? label;
  return base.toLowerCase().replace(/\s+/g, " ");
}

export function shortInsightChipLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Insight";
  const colon = trimmed.indexOf(": ");
  const head = colon > 0 && colon <= 56 ? trimmed.slice(0, colon) : trimmed;
  const plain = toSentenceCase(head);
  return plain.length > 40 ? `${plain.slice(0, 40)}…` : plain;
}

function insightChipDetailFromIntel(item: TrackInsightIntelItem): string {
  const highlight = (item.highlight ?? "").trim();
  if (highlight) return highlight;
  const title = (item.title ?? "").trim();
  const colon = title.indexOf(": ");
  if (colon > 0) {
    const after = title.slice(colon + 2).trim();
    if (after) return after;
  }
  return (item.text ?? "").trim() || "Context captured from sources";
}

function classifyUserIntel(
  item: TrackInsightIntelItem,
): "strength" | "weakness" | "neutral" {
  const blob = `${item.title} ${item.text} ${item.highlight ?? ""}`;
  if (INTEL_WEAK_HINTS.test(blob)) return "weakness";
  if (INTEL_STRONG_HINTS.test(blob)) return "strength";
  return "neutral";
}

function chipLabelForContributor(c: ScoreContributor): string {
  if (c.source === "benchmark") {
    return TRACK_INSIGHT_METRIC_LABELS[c.id] ?? toSentenceCase(c.label);
  }
  if (c.source === "profile") return "Company profile";
  return toSentenceCase(c.label);
}

function intelBenchMetricKey(id: string): string | null {
  if (!id.startsWith("intel-bench-")) return null;
  return id.slice("intel-bench-".length);
}

/**
 * Derive What’s working / Needs improvement chips for one track.
 * Candidates are added in order: benchmarks → profile → detail → intelligence.
 * Mid-range detail scores produce no chip; silence is intentional.
 */
export function buildTrackInsightLists(
  categoryId: OverviewCategoryId,
  contributors: ScoreContributor[],
  intelligence: TrackInsightIntelItem[] = [],
  profileSummary?: string | null,
): { strengths: TrackInsightItem[]; weaknesses: TrackInsightItem[] } {
  const strengths: TrackInsightItem[] = [];
  const weaknesses: TrackInsightItem[] = [];
  const seen = new Set<string>();
  const seenTopics = new Set<string>();

  const addStrength = (
    id: string,
    label: string,
    detail: string,
    source: TrackInsightItem["source"],
    sortKey: number,
  ) => {
    const topic = insightTopicKey(label);
    if (seen.has(id) || seenTopics.has(topic)) return;
    seen.add(id);
    seenTopics.add(topic);
    strengths.push({
      id,
      // Keep catalog short labels (e.g. "GTM motion", "ICP clarity") — match admin / DETAIL_QUESTION_LABEL.
      // Founder plain-language rewrites apply to tooltip detail only.
      label: shortInsightChipLabel(label),
      detail: insightDetail(detail, source),
      source,
      sortKey,
    });
  };

  const addWeakness = (
    id: string,
    label: string,
    detail: string,
    source: TrackInsightItem["source"],
    sortKey: number,
  ) => {
    const topic = insightTopicKey(label);
    if (seen.has(id) || seenTopics.has(topic)) return;
    seen.add(id);
    seenTopics.add(topic);
    weaknesses.push({
      id,
      label: shortInsightChipLabel(label),
      detail: insightDetail(detail, source),
      source,
      sortKey,
    });
  };

  const trackMetrics = new Set(CATEGORY_METRIC_KEYS[categoryId]);
  const benchmarkById = new Map<string, ScoreContributor>();

  for (const c of contributors) {
    if (c.source !== "benchmark" || !trackMetrics.has(c.id)) continue;
    benchmarkById.set(c.id, c);
    if (isMissingContributor(c)) continue;

    const tier = tierFromBenchmarkScore(c.score);
    const position = POSITION_LABELS[tier];
    const label = chipLabelForContributor(c);

    if (tier === "top" || tier === "upper") {
      addStrength(`bench-${c.id}`, label, position, "benchmark", tier === "top" ? 100 : 85);
    } else if (tier === "bottom" || tier === "lower" || tier === "mid") {
      // Around median → Needs improvement (decisive chips; mid is not silence for benchmarks)
      addWeakness(
        `bench-${c.id}`,
        label,
        position,
        "benchmark",
        tier === "bottom" ? 10 : tier === "lower" ? 25 : 40,
      );
    }
  }

  const profile = contributors.find((c) => c.source === "profile");
  if (profile) {
    if (!isMissingContributor(profile) && profile.score >= 55) {
      addStrength(
        "profile",
        "Company profile",
        profileSummary?.trim() || profile.display,
        "profile",
        profile.score,
      );
    } else if (isMissingContributor(profile) || profile.score < 50) {
      addWeakness(
        "profile",
        "Company profile",
        isMissingContributor(profile)
          ? "Add sector, team size, and context"
          : "Profile is still thin",
        "profile",
        isMissingContributor(profile) ? 15 : 30,
      );
    }
  }

  for (const c of contributors) {
    if (c.source !== "detail") continue;
    const label = chipLabelForContributor(c);
    if (isMissingContributor(c)) {
      addWeakness(`detail-${c.id}`, label, "Not answered yet", "detail", 20);
      continue;
    }
    if (c.score >= 72) {
      addStrength(`detail-${c.id}`, label, c.display, "detail", c.score);
    } else if (c.score < 58) {
      addWeakness(`detail-${c.id}`, label, c.display, "detail", c.score);
    }
  }

  for (const item of intelligence) {
    const benchKey = intelBenchMetricKey(item.id);
    if (benchKey) {
      const m = benchmarkById.get(benchKey);
      if (!m || isMissingContributor(m)) continue;
      const label = chipLabelForContributor(m);
      const topic = insightTopicKey(label);
      if (seenTopics.has(topic)) continue;
      const tier = tierFromBenchmarkScore(m.score);
      const detail = item.highlight?.trim() || POSITION_LABELS[tier];
      if (tier === "top" || tier === "upper") {
        addStrength(item.id, label, detail, "intelligence", tier === "top" ? 90 : 75);
      } else if (tier === "bottom" || tier === "lower" || tier === "mid") {
        addWeakness(
          item.id,
          label,
          detail,
          "intelligence",
          tier === "bottom" ? 12 : tier === "lower" ? 28 : 42,
        );
      }
      continue;
    }

    const sentiment = classifyUserIntel(item);
    const rawTitle = item.title?.trim() || item.text?.trim() || "Intelligence signal";
    const label = shortInsightChipLabel(rawTitle);
    const detail = insightChipDetailFromIntel(item);
    if (sentiment === "strength") {
      addStrength(item.id, label, detail, "intelligence", 65);
    } else if (sentiment === "weakness") {
      addWeakness(item.id, label, detail, "intelligence", 35);
    } else {
      addStrength(item.id, label, detail, "intelligence", 55);
    }
  }

  strengths.sort((a, b) => b.sortKey - a.sortKey);
  weaknesses.sort((a, b) => a.sortKey - b.sortKey);

  return { strengths, weaknesses };
}

/** Map derived items into the API StrengthWeakness shape. */
export function toStrengthWeaknessPayload(items: TrackInsightItem[]) {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    detail: item.detail,
    source: item.source,
  }));
}

/** Tip body omits the “ · Benchmark|Profile|…” cue (Design stripInsightSourceSuffix). */
export function stripInsightSourceSuffix(detail: string): string {
  return detail.replace(/\s·\s(Benchmark|Profile|Your answers|Intelligence)$/, "").trim();
}
