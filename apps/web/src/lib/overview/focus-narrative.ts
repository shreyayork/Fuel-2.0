import type { OverviewCategoryId } from "./constants";
import type { ScoreContributor } from "./types";

const TRACK_FOCUS_NAME: Record<OverviewCategoryId, string> = {
  dev: "Product & engineering",
  mkt: "Go to Market",
  rev: "Ops & finance",
};

/** Friendly labels used in “Next lever: …” lines — Design ScorecardV2. */
const METRIC_FRIENDLY: Record<string, string> = {
  ARR: "revenue",
  "ARR growth YoY": "revenue growth",
  "ARR growth (YoY)": "revenue growth",
  "Net revenue retention": "net retention",
  "Logo retention": "customer retention",
  "Gross margin": "gross margin",
  "Monthly net burn": "burn",
  "Cash on hand": "cash",
  "FTE headcount": "team size",
  Headcount: "team size",
  "Paying customers": "paying customers",
};

function isMissingContributor(c: ScoreContributor): boolean {
  return (
    c.display === "Not answered" ||
    c.display === "Not logged" ||
    c.display === "Not provided"
  );
}

function friendlyMetricLabel(label: string): string {
  return METRIC_FRIENDLY[label] ?? label.toLowerCase();
}

/** Plain-language guard for glance prose (Design founderPlainCopy). */
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

function humanizeFounderFocus(c: ScoreContributor): string | null {
  const val = c.display;
  switch (c.id) {
    case "dev_delivery_constraint":
      return `Your top product constraint right now: ${val.toLowerCase()}.`;
    case "dev_build_model":
      if (val.includes("Founders building") || val.includes("Not building yet")) {
        return "You're still founder-built — line up engineering capacity before the next growth push.";
      }
      if (val === "Contract dev / agency") {
        return "Engineering is agency-led — tighten ownership before scale.";
      }
      return null;
    case "dev_ship_cadence":
      if (val === "Ad hoc — no regular cadence" || val === "Not shipping yet") {
        return "Shipping cadence is slow — faster releases usually unlock the next growth step.";
      }
      return null;
    case "mkt_sales_motion":
      if (val === "Founder-led" || val === "Not yet" || val === "Not yet defined") {
        return "Sales is still founder-led — document what works before you hire reps.";
      }
      return null;
    case "mkt_funnel_gap":
      return `Growth is bottlenecked at "${val}" — fix that before spending more at the top of the funnel.`;
    case "mkt_marketing_capacity":
      if (val === "No dedicated marketing — founders or sales cover it") {
        return "Marketing isn't owned yet — put someone clearly in charge so demand generation doesn't stall.";
      }
      return null;
    case "mkt_revenue_tracking":
      if (val === "No systematic pipeline yet" || val === "Spreadsheet or lightweight tracking") {
        return "Pipeline still lives in spreadsheets — a real CRM will sharpen your forecast and planning.";
      }
      return null;
    case "rev_forecast":
      if (val !== "Yes, monthly rolling forecast") {
        return "Financial forecast discipline is shaky — tighten rolling forecast hygiene first.";
      }
      return null;
    default:
      return null;
  }
}

function pickFounderFocusLine(contributors: ScoreContributor[]): string | null {
  const missing = contributors.filter(isMissingContributor);
  if (missing.length >= 2) {
    return `Log ${missing[0]!.label.toLowerCase()} and ${missing[1]!.label.toLowerCase()} so Fuel can score this track properly.`;
  }

  const detailSignals = contributors
    .filter((c) => c.source === "detail" && !isMissingContributor(c))
    .sort((a, b) => a.score - b.score);
  for (const c of detailSignals) {
    const line = humanizeFounderFocus(c);
    if (line) return line;
  }

  const benchGap = contributors
    .filter((c) => c.source === "benchmark" && !isMissingContributor(c) && c.score < 58)
    .sort((a, b) => a.score - b.score)[0];
  if (benchGap) {
    return `Next lever: ${friendlyMetricLabel(benchGap.label)} — you're behind similar companies on this input.`;
  }

  if (missing.length === 1) {
    return `Add ${missing[0]!.label.toLowerCase()} to unlock a sharper read on this track.`;
  }

  return null;
}

/**
 * Deterministic glance focus line — ported from Design ScorecardV2
 * `buildCategoryFocusNarrative`. Prefer this over AI `focus_narrative`.
 */
export function buildCategoryFocusNarrative(
  categoryId: OverviewCategoryId,
  score: number,
  contributors: ScoreContributor[],
): string {
  const trackName = TRACK_FOCUS_NAME[categoryId];
  const bounded = Math.max(0, Math.min(100, Math.round(score)));

  let opener: string;
  if (bounded >= 80) {
    opener = `Strong ${trackName} (${bounded}/100) — you're in good shape vs peers.`;
  } else if (bounded >= 65) {
    opener = `Solid ${trackName} (${bounded}/100) with a few levers left to pull.`;
  } else if (bounded >= 50) {
    opener = `${trackName} is at ${bounded}/100 — fixable gaps if you focus now.`;
  } else {
    opener = `${trackName} needs attention (${bounded}/100) — peers are pulling ahead.`;
  }

  const focus = pickFounderFocusLine(contributors);
  return founderPlainCopy(focus ? `${opener} ${focus}` : opener);
}
