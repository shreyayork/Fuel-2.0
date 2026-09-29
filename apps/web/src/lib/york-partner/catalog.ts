import type { YorkPartnerCategoryId } from "./constants";
import type { YorkChipHeadlineMap } from "./types";

/** Normalize chip labels for catalog lookup (case/spacing insensitive). */
export function normalizeChipKey(label: string): string {
  return label.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Default chip → marketing headline catalog from F20A-162 Part 5.
 * Keys are display labels as shown on What’s working / Needs improvement.
 */
export const DEFAULT_CHIP_HEADLINES: Record<
  YorkPartnerCategoryId,
  Record<string, string>
> = {
  dev: {
    "Product stage": "Turn your current product stage into a shippable plan",
    "Product type": "Build the right product shape without burning cycles",
    "Delivery constraint": "Remove the constraint slowing every release",
    "Primary customer": "Align product around the buyer who actually pays",
    "Launch timeline": "Hit the next release date without a scramble",
    "Build model": "A build model that scales past founder-only delivery",
    "Engineering size": "Multiply a small product team without a hiring pause",
    "Ship cadence": "Replace ad hoc releases with a cadence buyers trust",
    "AI Role": "Make AI a product advantage — not a side experiment",
    "AI role": "Make AI a product advantage — not a side experiment",
    Compliance: "Get enterprise-ready security without stalling the roadmap",
    Prioritization: "Turn priorities into a plan the team can actually ship",
    "Feature vs debt split":
      "Balance features and debt so velocity doesn’t collapse",
    "Engineering bottleneck":
      "Put senior builders on the bottleneck slowing the team",
    "Team size": "Right-size the product team for the next growth step",
    "Gross margin": "Protect margin while you keep shipping product",
    "Company profile": "Fill the product context York IE needs to plug in fast",
  },
  mkt: {
    "GTM motion":
      "Build a go-to-market system that outgrows the founder calendar",
    "Funnel gap": "Fix the funnel stage where growth is actually stalling",
    "ICP clarity": "Stop selling to everyone — own one clear buyer",
    "Revenue tracking": "A CRM and pipeline you can actually forecast from",
    "Deal size": "Package and price so deals match the motion you want",
    "Pricing model": "Pricing that converts without confusing the market",
    "Demand source": "Fill the top of funnel with buyers who actually fit",
    "Sales team": "Feed the sales motion with demand and clean RevOps",
    "Marketing capacity": "A fractional marketing pod that hits pipeline goals",
    "CAC payback": "Know what each dollar of growth actually costs",
    "Contract length": "Structure contracts that improve cash and retention",
    "Competitive pressure": "Win deals even when the category gets crowded",
    "Deal stall point": "Fix the exact stage where deals die",
    "Pipeline definitions": "Pipeline stages the team will actually use",
    "MQL→SQL visibility": "See conversion clearly from marketing to sales",
    "Pricing governance": "Discount and pricing rules that protect margin",
    "Cross-functional SLAs":
      "Alignment between marketing, SDR, and AE that sticks",
    "Annual recurring revenue": "Grow ARR with a motion you can repeat",
    "Revenue growth": "Accelerate growth without lighting money on fire",
    "Paying customers":
      "Turn early logos into a repeatable acquisition engine",
    "Customer retention":
      "Keep the customers you already worked hard to win",
    "Net revenue retention":
      "Keep and expand revenue from the base you have",
    "Company profile": "Fill the GTM context York IE needs to plug in fast",
  },
  rev: {
    Runway: "A cash plan in weeks — not quarters",
    "Finance management": "Take finance off the founder’s plate",
    "Capital priority":
      "Show up to capital decisions with numbers that hold up",
    "12-month goal": "A 12-month operating plan tied to real books",
    "Unit economics": "Know what each dollar of growth actually costs",
    Forecast: "Stop steering from the rear-view mirror",
    "Cap table": "Cap table and books ready for diligence",
    "Operating mode":
      "Run growth and efficiency with the same finance system",
    "Team size": "Hire against a plan the books can support",
    "Hiring plans": "Hire selectively without losing financial control",
    "Board reporting": "Board packages investors actually trust",
    "Segment economics": "See revenue and cost by segment — not one blur",
    "Raise needs": "Be raise-ready on narrative, metrics, and process",
    "Cash in the bank": "Make cash visibility a weekly operating habit",
    "Monthly cash burn": "Bring burn under a plan before the next squeeze",
    "Payback on customer acquisition":
      "Tie spend to payback the board can believe",
    "Burn multiple":
      "Improve burn multiple with operating finance, not hope",
    "Growth vs. burn balance":
      "Balance growth and burn with numbers you can defend",
    "Company profile":
      "Fill the finance context York IE needs to plug in fast",
  },
};

function toNormalizedMap(
  source: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [label, headline] of Object.entries(source)) {
    out[normalizeChipKey(label)] = headline;
  }
  return out;
}

export function defaultChipHeadlineMap(): YorkChipHeadlineMap {
  return {
    dev: toNormalizedMap(DEFAULT_CHIP_HEADLINES.dev),
    mkt: toNormalizedMap(DEFAULT_CHIP_HEADLINES.mkt),
    rev: toNormalizedMap(DEFAULT_CHIP_HEADLINES.rev),
  };
}

/** Canonical display labels for Super Admin tables (unique per category). */
export function defaultChipRowsForCategory(
  category: YorkPartnerCategoryId,
): Array<{ chipLabel: string; headline: string }> {
  const seen = new Set<string>();
  const rows: Array<{ chipLabel: string; headline: string }> = [];
  for (const [chipLabel, headline] of Object.entries(
    DEFAULT_CHIP_HEADLINES[category],
  )) {
    const key = normalizeChipKey(chipLabel);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ chipLabel, headline });
  }
  return rows;
}

export function fallbackChipHeadline(chipLabel: string): string {
  const trimmed = chipLabel.replace(/\s+/g, " ").trim();
  const short =
    trimmed.length > 40 ? `${trimmed.slice(0, 40).trimEnd()}…` : trimmed;
  return `Close the gap on ${short || "this area"}`;
}

export function lookupChipHeadline(
  map: YorkChipHeadlineMap,
  category: YorkPartnerCategoryId,
  chipLabel: string,
): string {
  const key = normalizeChipKey(chipLabel);
  return map[category][key] ?? fallbackChipHeadline(chipLabel);
}
