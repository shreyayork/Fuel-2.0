import React, { useMemo, useState } from "react";
import {
  BenchmarkPeerComparisonPanel,
  BenchmarkCohortTrack,
  BenchmarkPercentileScale,
  BENCHMARK_WIZARD_FIELDS,
  valueToMarkerPercent,
  getBenchmarkTier,
  getBenchmarkTierStyle,
  formatBenchmarkDisplay,
  suggestPlaybooksForStage,
  type BenchmarkWizardField,
  type MetricPlaybookOption,
} from "./FuelOnboardingChat";
import type { OnboardingBenchmarkInput } from "./PatriotPayJourney";
import "./PatriotPayJourney.css";

// Single source of truth for field definitions (P-values, band positions, units)
const WIZARD_FIELD_BY_KEY = Object.fromEntries(
  BENCHMARK_WIZARD_FIELDS.map(f => [f.key, f]),
) as Record<string, BenchmarkWizardField>;

// ─── Colours ──────────────────────────────────────────────────────────────────
const COLOUR_STRONG = "#3DD68C";
const COLOUR_ABOVE  = "#9BD4BC";
const COLOUR_AROUND = "#D4A86A";
const COLOUR_BELOW  = "#C9976B";
const COLOUR_WEAK   = "#CF8A8A";

// ─── Types ────────────────────────────────────────────────────────────────────
type ScorecardView = "overview" | "dev" | "mkt" | "rev" | "benchmark";
type ScorecardCategory = "dev" | "mkt" | "rev";
type MetricKey = keyof OnboardingBenchmarkInput;
type PositionTier = "top" | "upper" | "mid" | "lower" | "bottom";

type MetricCohort = {
  key: MetricKey;
  label: string;
  p25: number; p50: number; p75: number; p90: number;
  unit: "usd" | "percent" | "count";
  lowerIsBetter?: boolean;
  intelCategory: string;
};

type EvaluatedMetric = {
  key: MetricKey;
  label: string;
  raw: string;
  value: number | null;
  display: string;
  tier: PositionTier;
  positionLabel: string;
  colour: string;
  p25Display: string; p50Display: string; p75Display: string; p90Display: string;
  intelCategory: string;
};

type CategorySignal = { text: string; colour: string };
type CategoryPlaybook = { id: string; title: string; description: string };
type CategoryInitiative = { id: string; title: string; description: string; colour: string };

type CategoryData = {
  id: ScorecardCategory;
  label: string;
  icon: string;
  colour: string;
  colourDim: string;
  colourBorder: string;
  barWidth: number;
  barColour: string;
  insight: string;
  signals: CategorySignal[];
  metricKeys: MetricKey[];
};

export type ScorecardDocumentSlot = {
  typeId: string;
  typeLabel: string;
  current: { name: string } | null;
};

export type ScorecardV2Props = {
  benchmark: OnboardingBenchmarkInput;
  cohortLabel?: string;
  companyName?: string;
  journeyStage?: string;
  documentSlots?: ScorecardDocumentSlot[];
  onUploadPitchDeck?: () => void;
  onRunPlaybook?: (playbookId: string) => void;
  onViewMetric?: (key: MetricKey) => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onGenerateInitiative?: (metricKey: MetricKey, playbookId: string) => void;
};

// ─── Cohort data ──────────────────────────────────────────────────────────────
const METRIC_COHORTS: MetricCohort[] = [
  { key: "arr",             label: "ARR",                   p25: 150_000,   p50: 500_000,   p75: 1_200_000, p90: 2_500_000, unit: "usd",     intelCategory: "Growth"    },
  { key: "arrGrowth",       label: "ARR growth (YoY)",      p25: 120,       p50: 200,       p75: 350,       p90: 600,       unit: "percent", intelCategory: "Growth"    },
  { key: "nrr",             label: "Net revenue retention", p25: 95,        p50: 108,       p75: 125,       p90: 145,       unit: "percent", intelCategory: "Retention" },
  { key: "logoRetention",   label: "Logo retention",        p25: 80,        p50: 88,        p75: 93,        p90: 97,        unit: "percent", intelCategory: "Retention" },
  { key: "grossMargin",     label: "Gross margin",          p25: 55,        p50: 72,        p75: 82,        p90: 88,        unit: "percent", intelCategory: "Efficiency"},
  { key: "monthlyBurn",     label: "Monthly net burn",      p25: 40_000,    p50: 80_000,    p75: 180_000,   p90: 350_000,   unit: "usd",     lowerIsBetter: true, intelCategory: "Finance" },
  { key: "cashOnHand",      label: "Cash on hand",          p25: 500_000,   p50: 1_500_000, p75: 3_000_000, p90: 6_000_000, unit: "usd",     intelCategory: "Finance"   },
  { key: "headcount",       label: "FTE headcount",         p25: 6,         p50: 12,        p75: 22,        p90: 40,        unit: "count",   intelCategory: "Team"      },
  { key: "payingCustomers", label: "Paying customers",      p25: 10,        p50: 40,        p75: 150,       p90: 500,       unit: "count",   intelCategory: "Growth"    },
];

const COHORT_BY_KEY = Object.fromEntries(METRIC_COHORTS.map(c => [c.key, c])) as Record<MetricKey, MetricCohort>;

const CATEGORY_METRIC_KEYS: Record<ScorecardCategory, MetricKey[]> = {
  dev: ["headcount", "grossMargin"],
  mkt: ["arr", "logoRetention", "payingCustomers", "nrr", "arrGrowth"],
  rev: ["cashOnHand", "monthlyBurn"],
};

const CATEGORY_META: Record<ScorecardCategory, {
  label: string; icon: string; colour: string; colourDim: string; colourBorder: string; drillTitle: string; urgentLabel: string;
}> = {
  dev: { label: "Development", icon: "🛠", colour: "#00B48A", colourDim: "rgba(0,180,138,0.08)",   colourBorder: "rgba(0,180,138,0.22)",   drillTitle: "Engineering & product",  urgentLabel: "R&D velocity"  },
  mkt: { label: "Marketing",   icon: "📣", colour: "#9BD4BC", colourDim: "rgba(155,212,188,0.08)", colourBorder: "rgba(155,212,188,0.22)", drillTitle: "GTM & acquisition",       urgentLabel: "GTM motion"    },
  rev: { label: "RevOps",      icon: "⚙️", colour: "#D4A86A", colourDim: "rgba(212,168,106,0.08)", colourBorder: "rgba(212,168,106,0.22)", drillTitle: "Revenue operations",      urgentLabel: "Cash runway"   },
};

const CATEGORY_PLAYBOOKS: Record<ScorecardCategory, CategoryPlaybook[]> = {
  dev: [
    { id: "dev-launch-signal-review", title: "Launch Signal Review",      description: "Evaluates ship cadence, tech debt, and product quality signals"        },
    { id: "dev-scale-readiness",      title: "Scale Readiness Check",     description: "Benchmarks team structure and infrastructure scaling readiness"        },
    { id: "finops-margin-review",     title: "Gross Margin Deep Dive",    description: "Benchmarks margins and identifies cost drivers to watch"               },
  ],
  mkt: [
    { id: "marketing-repeatable-gtm", title: "Repeatable GTM Motion",     description: "Uses customer patterns to shape the next scalable acquisition channel" },
    { id: "marketing-icp-sprint",     title: "ICP Validation Sprint",     description: "Tests ideal customer profile against real outreach signals"            },
    { id: "revops-pipeline-rhythm",   title: "Pipeline Operating Rhythm", description: "Uses stage movement and conversion gaps to guide weekly review"        },
  ],
  rev: [
    { id: "finops-runway-burn-review", title: "Runway & Burn Review",     description: "Maps burn drivers and fastest path to extended runway"                },
    { id: "finops-board-readiness",    title: "Board Readiness Review",   description: "Prepares runway, forecast, and efficiency metrics for stakeholders"   },
    { id: "finops-burn-efficiency",    title: "Burn Efficiency Review",   description: "Benchmarks burn against growth to identify capital efficiency levers"  },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMetricValue(raw: string): number | null {
  const cleaned = raw.replace(/[$,%x,\s]/gi, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}


const POSITION_LABELS: Record<PositionTier, string> = {
  top: "Top quartile", upper: "Above median", mid: "Around median", lower: "Below median", bottom: "Bottom of cohort",
};
const TIER_COLOUR: Record<PositionTier, string> = {
  top: COLOUR_STRONG, upper: COLOUR_ABOVE, mid: COLOUR_AROUND, lower: COLOUR_BELOW, bottom: COLOUR_WEAK,
};


function worstTier(tiers: PositionTier[]): PositionTier {
  const order: PositionTier[] = ["bottom", "lower", "mid", "upper", "top"];
  return tiers.reduce((w, t) => order.indexOf(t) < order.indexOf(w) ? t : w, "top" as PositionTier);
}

function tierToScore(tier: PositionTier): number {
  return { top: 90, upper: 72, mid: 52, lower: 32, bottom: 12 }[tier];
}


function vsMedianText(metric: EvaluatedMetric): string | null {
  if (metric.value == null) return null;
  const cohort = COHORT_BY_KEY[metric.key];
  if (!cohort || cohort.p50 <= 0) return null;
  const ratio = metric.value / cohort.p50;
  if (cohort.lowerIsBetter) {
    if (ratio < 0.4)  return `${(1 / ratio).toFixed(1)}× more capital-efficient than median`;
    if (ratio < 0.75) return "Well below median burn";
    if (ratio < 1.25) return "Around median burn";
    return `${ratio.toFixed(1)}× above median burn`;
  }
  if (ratio >= 3)   return `${ratio.toFixed(1)}× above median`;
  if (ratio >= 2)   return `${ratio.toFixed(1)}× above median`;
  if (ratio >= 1.3) return `${Math.round((ratio - 1) * 100)}% above median`;
  if (ratio >= 1.1) return "Modestly above median";
  if (ratio >= 0.9) return "Around median";
  if (ratio >= 0.5) return `${Math.round((1 - ratio) * 100)}% below median`;
  return "Significantly below median";
}

function evaluateMetrics(benchmark: OnboardingBenchmarkInput): EvaluatedMetric[] {
  return METRIC_COHORTS.map(cohort => {
    const field = WIZARD_FIELD_BY_KEY[cohort.key];
    const raw = benchmark[cohort.key] ?? "";
    const value = parseMetricValue(raw);
    const tier = value != null && field ? getBenchmarkTier(value, field) as PositionTier : "mid";
    const tierStyle = value != null ? getBenchmarkTierStyle(tier) : null;
    return {
      key: cohort.key, label: cohort.label, raw, value,
      display: value != null ? formatBenchmarkDisplay(value, cohort.unit) : raw.trim() || "—",
      tier,
      positionLabel: value != null ? POSITION_LABELS[tier] : "Not logged",
      colour: tierStyle ? tierStyle.value : "var(--text-3)",
      p25Display: formatBenchmarkDisplay(cohort.p25, cohort.unit),
      p50Display: formatBenchmarkDisplay(cohort.p50, cohort.unit),
      p75Display: formatBenchmarkDisplay(cohort.p75, cohort.unit),
      p90Display: formatBenchmarkDisplay(cohort.p90, cohort.unit),
      intelCategory: cohort.intelCategory,
    };
  });
}

function getMetricMap(metrics: EvaluatedMetric[]): Record<MetricKey, EvaluatedMetric> {
  return Object.fromEntries(metrics.map(m => [m.key, m])) as Record<MetricKey, EvaluatedMetric>;
}

function estimateRunwayMonths(cash: EvaluatedMetric, burn: EvaluatedMetric): number | null {
  if (cash.value == null || burn.value == null || burn.value <= 0) return null;
  return cash.value / burn.value;
}

// ─── Category builders ────────────────────────────────────────────────────────
function buildCategoryData(category: ScorecardCategory, metricMap: Record<MetricKey, EvaluatedMetric>, runway: number | null): CategoryData {
  const meta = CATEGORY_META[category];
  const keys = CATEGORY_METRIC_KEYS[category];
  const tiers = keys.map(k => metricMap[k]).filter(m => m?.value != null).map(m => m.tier);
  const avgScore = tiers.length ? tiers.reduce((s, t) => s + tierToScore(t), 0) / tiers.length : 50;
  const worst = tiers.length ? worstTier(tiers) : "mid";

  let insight = "";
  const signals: CategorySignal[] = [];

  if (category === "dev") {
    const hc = metricMap.headcount, gm = metricMap.grossMargin;
    insight = hc.value != null
      ? `${hc.display} FTEs is ${hc.positionLabel.toLowerCase()} for your cohort. ${gm.value != null ? `Gross margin (${gm.display}) is ${gm.positionLabel.toLowerCase()} — ${gm.tier === "top" || gm.tier === "upper" ? "strong unit economics for this stage." : "review COGS before scaling headcount."}` : "Connect your delivery stack to unlock R&D velocity signals."}`
      : `Engineering setup hasn't been connected yet. ${gm.value != null ? `Gross margin (${gm.display}) is ${gm.positionLabel.toLowerCase()}` : ""}. Add context to unlock R&D signals.`;
    signals.push({ text: hc.value != null ? `${hc.display} FTEs · ${hc.positionLabel.toLowerCase()}` : "Engineering setup unknown", colour: hc.value != null ? hc.colour : COLOUR_AROUND });
    signals.push({ text: gm.value != null ? `Gross margin ${gm.display}` : "Gross margin not logged", colour: gm.value != null ? gm.colour : COLOUR_AROUND });
  }
  if (category === "mkt") {
    const arr = metricMap.arr, cust = metricMap.payingCustomers, ret = metricMap.logoRetention;
    const isPreRevenue = arr.value == null || arr.value < 50_000;
    insight = isPreRevenue
      ? "Pre-revenue or very early stage — no meaningful GTM motion data yet. Most Seed peers reach first meaningful ARR by month 12."
      : arr.tier === "bottom" || arr.tier === "lower"
        ? `ARR is ${arr.positionLabel.toLowerCase()} (${arr.display}) versus peers. Focus on the first 10 paying customers before scaling any channel spend.`
        : `ARR at ${arr.display} is ${arr.positionLabel.toLowerCase()}. ${ret.value != null ? `Logo retention (${ret.display}) is ${ret.positionLabel.toLowerCase()}.` : ""}`;
    signals.push({ text: !isPreRevenue ? `ARR ${arr.display} · ${arr.positionLabel.toLowerCase()}` : "Pre-revenue · no GTM motion", colour: !isPreRevenue ? arr.colour : COLOUR_WEAK });
    signals.push({ text: cust.value != null ? `${cust.display} paying customers` : "No acquisition channel data", colour: cust.value != null ? cust.colour : COLOUR_WEAK });
  }
  if (category === "rev") {
    const cash = metricMap.cashOnHand, burn = metricMap.monthlyBurn;
    const rt = runway?.toFixed(1);
    if (runway != null && runway < 6)
      insight = `Cash runway is critically low (~${rt} months). At ${cash.display} cash and ${burn.display} monthly burn, this is the most urgent focus area.`;
    else if (runway != null && runway < 12)
      insight = `~${rt} months of runway at current burn (${burn.display}). Plan the next capital event within 90 days.`;
    else
      insight = `Cash (${cash.display}) and burn (${burn.display}) imply ${runway != null ? `~${rt} months` : "unknown"} runway. ${burn.tier === "top" || burn.tier === "upper" ? "Capital-efficient for stage." : "Review burn before next growth push."}`;
    signals.push({ text: runway != null && runway < 6 ? "Critical cash runway" : cash.value != null ? `${cash.display} cash on hand` : "Cash not logged", colour: runway != null && runway < 6 ? COLOUR_WEAK : cash.value != null ? cash.colour : COLOUR_AROUND });
    signals.push({ text: burn.value != null ? `Burn ${burn.display}/mo · ${burn.positionLabel.toLowerCase()}` : "Burn not logged", colour: burn.value != null ? burn.colour : COLOUR_AROUND });
  }

  return {
    id: category, label: meta.label, icon: meta.icon,
    colour: meta.colour, colourDim: meta.colourDim, colourBorder: meta.colourBorder,
    barWidth: avgScore, barColour: TIER_COLOUR[worst],
    insight, signals, metricKeys: keys,
  };
}

function buildCategoryInitiatives(category: ScorecardCategory, metricMap: Record<MetricKey, EvaluatedMetric>, runway: number | null): CategoryInitiative[] {
  if (category === "dev") {
    const hc = metricMap.headcount, gm = metricMap.grossMargin;
    return [
      { id: "dev-i1", title: hc.value == null ? "Complete R&D context form" : "Define engineering team structure", description: hc.value == null ? "Unlock engineering signals — 5 questions, under 2 minutes." : "Decide in-house vs contractors before next funding round.", colour: COLOUR_AROUND },
      { id: "dev-i2", title: gm.tier === "top" || gm.tier === "upper" ? "Protect gross margin as headcount grows" : "Review COGS and delivery cost structure", description: gm.tier === "top" || gm.tier === "upper" ? "High margin is a competitive advantage. Audit hosting and support load before scaling team." : "Small COGS improvements compound into meaningful runway extension.", colour: TIER_COLOUR[gm.tier] },
    ];
  }
  if (category === "mkt") {
    const arr = metricMap.arr, cust = metricMap.payingCustomers;
    return [
      { id: "mkt-i1", title: arr.value == null || arr.value < 100_000 ? "Define first revenue milestone" : "Scale repeatable acquisition channel", description: arr.value == null || arr.value < 100_000 ? "Set a specific ARR target and identify the first 3 target customers." : `ARR at ${arr.display} — lock the next milestone and the one channel that gets you there.`, colour: arr.value != null && arr.value > 100_000 ? COLOUR_AROUND : COLOUR_WEAK },
      { id: "mkt-i2", title: cust.value == null ? "Hire fractional CMO or demand gen lead" : "Connect CRM for acquisition attribution", description: cust.value == null ? "Free up founder bandwidth and build a repeatable acquisition motion." : "Pipeline visibility is a prerequisite for any repeatable sales motion.", colour: COLOUR_AROUND },
    ];
  }
  const rt = runway ?? 0;
  return [
    { id: "rev-i1", title: rt < 6 ? "Raise bridge round or reduce burn within 30 days" : "Plan next capital event", description: rt < 6 ? "Contact existing investors. Identify top 2–3 non-essential costs to pause." : `${runway != null ? `~${runway.toFixed(0)} months runway` : "Runway unknown"} — begin investor conversations before runway drops below 6 months.`, colour: rt < 6 ? COLOUR_WEAK : COLOUR_AROUND },
    { id: "rev-i2", title: "Implement CRM before first sales hire", description: "Pipeline visibility is a prerequisite for any repeatable revenue motion.", colour: COLOUR_AROUND },
  ];
}

// ─── Metric playbooks map (for full benchmark view) ───────────────────────────
const BASE_METRIC_PLAYBOOKS: Partial<Record<MetricKey, MetricPlaybookOption[]>> = {
  arr:             [{ id: "marketing-repeatable-gtm",    title: "Repeatable GTM Motion",       track: "Marketing"   }, { id: "marketing-icp-sprint",      title: "ICP Validation Sprint",     track: "Marketing"   }, { id: "revops-pipeline-rhythm",    title: "Pipeline Operating Rhythm", track: "RevOps"      }],
  arrGrowth:       [{ id: "marketing-outbound-review",   title: "Outbound Performance Review", track: "Marketing"   }, { id: "marketing-repeatable-gtm",  title: "Repeatable GTM Motion",     track: "Marketing"   }],
  nrr:             [{ id: "revops-retention",            title: "Retention Playbook",          track: "RevOps"      }, { id: "revops-pipeline-rhythm",    title: "Pipeline Operating Rhythm", track: "RevOps"      }],
  logoRetention:   [{ id: "marketing-icp-sprint",        title: "ICP Validation Sprint",       track: "Marketing"   }, { id: "revops-retention",          title: "Retention Playbook",        track: "RevOps"      }],
  payingCustomers: [{ id: "revops-pipeline-rhythm",      title: "Pipeline Operating Rhythm",   track: "RevOps"      }, { id: "marketing-repeatable-gtm",  title: "Repeatable GTM Motion",     track: "Marketing"   }],
  grossMargin:     [{ id: "finops-margin-review",        title: "Margin Review",               track: "FinOps"      }, { id: "finops-runway-burn-review", title: "Runway & Burn Review",      track: "FinOps"      }],
  monthlyBurn:     [{ id: "finops-runway-burn-review",   title: "Runway & Burn Review",        track: "FinOps"      }, { id: "finops-burn-efficiency",    title: "Burn Efficiency Review",    track: "FinOps"      }],
  cashOnHand:      [{ id: "finops-runway-burn-review",   title: "Runway & Burn Review",        track: "FinOps"      }, { id: "finops-board-readiness",    title: "Board Readiness Review",    track: "FinOps"      }],
  headcount:       [{ id: "dev-launch-signal-review",    title: "Launch Signal Review",        track: "Development" }, { id: "dev-scale-readiness",       title: "Scale Readiness Check",     track: "Development" }],
};

const METRIC_PLAYBOOK_TRACKS: Partial<Record<MetricKey, Array<MetricPlaybookOption["track"]>>> = {
  arr: ["Marketing", "RevOps"], arrGrowth: ["Marketing"], nrr: ["RevOps"], logoRetention: ["Marketing", "RevOps"],
  payingCustomers: ["RevOps", "Marketing"], grossMargin: ["FinOps"], monthlyBurn: ["FinOps"], cashOnHand: ["FinOps"], headcount: ["Development"],
};

function dedupeByTitle(pb: MetricPlaybookOption[]): MetricPlaybookOption[] {
  const seen = new Set<string>();
  return pb.filter(p => { if (seen.has(p.title)) return false; seen.add(p.title); return true; });
}

function buildMetricPlaybooksMap(journeyStage: string): Partial<Record<MetricKey, MetricPlaybookOption[]>> {
  const stagePb = suggestPlaybooksForStage(journeyStage);
  const result: Partial<Record<MetricKey, MetricPlaybookOption[]>> = {};
  (Object.keys(BASE_METRIC_PLAYBOOKS) as MetricKey[]).forEach(key => {
    const tracks = new Set(METRIC_PLAYBOOK_TRACKS[key] ?? []);
    const fromStage = stagePb.filter(p => tracks.has(p.track)).map(p => ({
      id: `stage-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: p.title, track: p.track,
    } as MetricPlaybookOption));
    result[key] = dedupeByTitle([...(BASE_METRIC_PLAYBOOKS[key] ?? []), ...fromStage]).slice(0, 4);
  });
  return result;
}

// ─── UI: Category overview card ───────────────────────────────────────────────
function CategoryCard({ cat, onClick }: { cat: CategoryData; onClick: () => void }) {
  return (
    <div className="scorecard-cat-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onClick()}>
      <div className="scorecard-cat-header">
        <div className="scorecard-cat-badge" style={{ background: cat.colourDim, borderColor: cat.colourBorder, color: cat.colour }}>
          <span>{cat.icon}</span>{cat.label}
        </div>
        <span className="scorecard-cat-view-link">View details →</span>
      </div>
      <div className="scorecard-cat-bar-wrap">
        <div className="scorecard-cat-bar-track">
          <div className="scorecard-cat-bar-fill" style={{ width: `${cat.barWidth}%`, background: cat.barColour }} />
        </div>
        <div className="scorecard-cat-bar-ends"><span>Weak</span><span>Strong</span></div>
      </div>
      <div className="scorecard-cat-body">
        <p className="scorecard-cat-insight">{cat.insight}</p>
        <div className="scorecard-cat-signals">
          {cat.signals.map((sig, i) => (
            <div key={i} className="scorecard-cat-signal">
              <div className="scorecard-cat-signal-dot" style={{ background: sig.colour }} />
              <span className="scorecard-cat-signal-text">{sig.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── UI: Advisor panel (overview, below cards) ────────────────────────────────
function OverviewAdvisorPanel({
  metricMap, runway, companyName, onGoToCategory,
}: {
  metricMap: Record<MetricKey, EvaluatedMetric>;
  runway: number | null;
  companyName: string;
  onGoToCategory: (cat: ScorecardCategory) => void;
}) {
  type FocusItem = { id: ScorecardCategory; urgency: "urgent" | "watch" };
  const items: FocusItem[] = [];

  const mktTiers = CATEGORY_METRIC_KEYS.mkt.map(k => metricMap[k]).filter(m => m?.value != null).map(m => m.tier);
  const devTiers = CATEGORY_METRIC_KEYS.dev.map(k => metricMap[k]).filter(m => m?.value != null).map(m => m.tier);
  const revTiers = CATEGORY_METRIC_KEYS.rev.map(k => metricMap[k]).filter(m => m?.value != null).map(m => m.tier);
  const revWorstTier = runway != null && runway < 6 ? worstTier(["bottom", ...revTiers]) : worstTier(revTiers.length ? revTiers : ["mid"]);
  const mktWorstTier = worstTier(mktTiers.length ? mktTiers : ["mid"]);
  const devWorstTier = worstTier(devTiers.length ? devTiers : ["mid"]);

  if (revWorstTier === "bottom" || revWorstTier === "lower") items.push({ id: "rev", urgency: "urgent" });
  if (mktWorstTier === "bottom" || mktWorstTier === "lower") items.push({ id: "mkt", urgency: "urgent" });
  if (devWorstTier === "bottom" || devWorstTier === "lower") items.push({ id: "dev", urgency: "urgent" });
  if (!items.length) {
    if (revWorstTier === "mid")  items.push({ id: "rev", urgency: "watch" });
    if (mktWorstTier === "mid")  items.push({ id: "mkt", urgency: "watch" });
  }
  if (!items.length) return null;

  const urgentCount = items.filter(i => i.urgency === "urgent").length;
  const hasUrgent = urgentCount > 0;

  return (
    <div className="scorecard-advisor-panel">
      <div className="scorecard-advisor-header">
        <span className="scorecard-advisor-label">✦ Fuel AI · Advisor</span>
        <span className="scorecard-advisor-company">{companyName}</span>
      </div>
      <p className="scorecard-advisor-text">
        {hasUrgent
          ? `${companyName} has ${urgentCount} urgent focus area${urgentCount > 1 ? "s" : ""} versus your cohort. Address ${urgentCount > 1 ? "these" : "this"} before your next growth push — the drilldowns above show where to act first.`
          : `${companyName} has areas to watch versus your cohort. Use the drilldowns above to see what to address next.`}
      </p>
      <div className="scorecard-advisor-chips">
        {items.map(item => {
          const meta = CATEGORY_META[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className={`scorecard-advisor-chip${item.urgency === "urgent" ? " is-urgent" : ""}`}
              onClick={() => onGoToCategory(item.id)}
            >
              {item.urgency === "urgent" ? "⚡" : "●"} {meta.urgentLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── UI: Premium metric card (in drilldown) ───────────────────────────────────
// Uses the shared BenchmarkCohortTrack + BenchmarkPercentileScale from FuelOnboardingChat
// for visual consistency with the onboarding benchmark bars.
function MetricCard({ metric, catColour }: { metric: EvaluatedMetric; catColour: string }) {
  const field      = WIZARD_FIELD_BY_KEY[metric.key];
  const marker     = metric.value != null && field ? valueToMarkerPercent(metric.value, field) : null;
  const tierStyle  = metric.value != null ? getBenchmarkTierStyle(metric.tier) : null;
  const vs         = vsMedianText(metric);

  return (
    <div className="scorecard-drill-mcard" style={{ "--cat-col": catColour } as React.CSSProperties}>
      <div className="scorecard-drill-mcard-head">
        <span className="scorecard-drill-mcard-name">{metric.label}</span>
        <span className="scorecard-drill-mcard-intel">{metric.intelCategory}</span>
      </div>

      <div className="scorecard-drill-mcard-main">
        <span className="scorecard-drill-mcard-val" style={{ color: metric.colour }}>
          {metric.value != null ? metric.display : "—"}
        </span>
        {tierStyle ? (
          <span className="scorecard-drill-mcard-pill" style={{
            color: tierStyle.marker,
            background: tierStyle.badgeBg,
            borderColor: tierStyle.badgeBorder,
          }}>
            {metric.positionLabel}
          </span>
        ) : (
          <span className="scorecard-drill-mcard-pill" style={{ color: "var(--text-3)", background: "var(--surface-3)", borderColor: "var(--border)" }}>
            Not logged
          </span>
        )}
      </div>

      {vs && <div className="scorecard-drill-mcard-vs">{vs}</div>}

      {field ? (
        <div style={{ marginTop: 14 }}>
          {/* Full-size bar — identical to onboarding chat bars */}
          <BenchmarkCohortTrack field={field} marker={marker} value={metric.value} />
          <BenchmarkPercentileScale field={field} value={metric.value} />
        </div>
      ) : null}
    </div>
  );
}

// ─── UI: Category drilldown ───────────────────────────────────────────────────
function CategoryDrilldownView({
  category, metricMap, runway, onBack, onRunPlaybook, onOpenInitiatives,
}: {
  category: ScorecardCategory;
  metricMap: Record<MetricKey, EvaluatedMetric>;
  runway: number | null;
  onBack: () => void;
  onRunPlaybook?: (id: string) => void;
  onOpenInitiatives?: () => void;
}) {
  const meta      = CATEGORY_META[category];
  const keys      = CATEGORY_METRIC_KEYS[category];
  const metrics   = keys.map(k => metricMap[k]).filter(Boolean);
  const catData   = buildCategoryData(category, metricMap, runway);
  const playbooks = CATEGORY_PLAYBOOKS[category];
  const initiatives = useMemo(() => buildCategoryInitiatives(category, metricMap, runway), [category, metricMap, runway]);

  // Drilldown metrics: primary ones (first 2 or up to 4 for mkt, but show max 4)
  const drillMetrics = metrics.filter(m => m.value != null).slice(0, 4);
  const missingMetrics = metrics.filter(m => m.value == null);

  return (
    <div className="scorecard-v2">

      {/* ── Hero header ── */}
      <div className="scorecard-drill-hero" style={{ "--cat-col": meta.colour } as React.CSSProperties}>
        <div className="scorecard-drill-hero-nav">
          <button type="button" className="scorecard-drill-back-btn" onClick={onBack}>
            ← Overview
          </button>
          <div className="scorecard-drill-hero-crumb">
            <div className="scorecard-cat-badge" style={{ background: meta.colourDim, borderColor: meta.colourBorder, color: meta.colour, margin: 0 }}>
              {meta.icon} {meta.label}
            </div>
          </div>
        </div>
        <h2 className="scorecard-drill-hero-title">{meta.drillTitle}</h2>
        <p className="scorecard-drill-hero-sub">{catData.insight}</p>

        <div className="scorecard-drill-hero-bar-wrap">
          <div className="scorecard-drill-hero-bar-track">
            <div className="scorecard-drill-hero-bar-fill" style={{ width: `${catData.barWidth}%`, background: catData.barColour }} />
          </div>
          <div className="scorecard-drill-hero-bar-meta">
            <span className="scorecard-drill-hero-bar-end">Weak</span>
            <span className="scorecard-drill-hero-position" style={{ color: catData.barColour }}>
              {catData.signals[0]?.text ?? ""}
            </span>
            <span className="scorecard-drill-hero-bar-end">Strong</span>
          </div>
        </div>
      </div>

      {/* ── Benchmark ── */}
      <div className="scorecard-section-lbl">Benchmark</div>
      <div className="scorecard-drill-metric-grid">
        {drillMetrics.map(m => <MetricCard key={m.key} metric={m} catColour={meta.colour} />)}
      </div>
      {missingMetrics.length > 0 && (
        <div className="scorecard-drill-missing-note">
          {missingMetrics.map(m => m.label).join(", ")} not yet logged — add data to unlock these signals.
        </div>
      )}

      {/* ── Intelligence ── */}
      <div className="scorecard-section-lbl">Intelligence</div>
      <div className="scorecard-drill-intel">
        {metrics.map(m => (
          <div key={m.key} className="scorecard-drill-intel-row">
            <span className="scorecard-drill-intel-cat">{m.intelCategory}</span>
            <span className="scorecard-drill-intel-text">{m.label}{m.value == null ? " — not yet logged" : ""}</span>
            <span className="scorecard-drill-intel-val" style={{ color: m.colour }}>{m.display}</span>
            <span className="scorecard-drill-intel-date">2026-Q2</span>
          </div>
        ))}
        {category === "rev" && runway != null && (
          <div className="scorecard-drill-intel-row">
            <span className="scorecard-drill-intel-cat">Efficiency</span>
            <span className="scorecard-drill-intel-text">Implied runway</span>
            <span className="scorecard-drill-intel-val" style={{ color: runway < 6 ? COLOUR_WEAK : runway < 12 ? COLOUR_AROUND : COLOUR_ABOVE }}>
              {runway.toFixed(1)} mo
            </span>
            <span className="scorecard-drill-intel-date">derived</span>
          </div>
        )}
      </div>

      {/* ── Playbooks ── */}
      <div className="scorecard-section-lbl">Playbooks</div>
      <div className="scorecard-drill-pb-grid">
        {playbooks.map(pb => (
          <button key={pb.id} type="button" className="scorecard-drill-pb-card" onClick={() => onRunPlaybook?.(pb.id)}
            style={{ "--cat-col": meta.colour } as React.CSSProperties}>
            <div className="scorecard-drill-pb-track-strip" style={{ background: meta.colour }} />
            <div className="scorecard-drill-pb-content">
              <div className="scorecard-drill-pb-title">{pb.title}</div>
              <div className="scorecard-drill-pb-desc">{pb.description}</div>
              <div className="scorecard-drill-pb-cta" style={{ color: meta.colour }}>Run playbook →</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Suggested initiatives ── */}
      <div className="scorecard-drill-init-header">
        <div className="scorecard-section-lbl" style={{ margin: 0 }}>Suggested initiatives</div>
        <button type="button" className="scorecard-drill-init-create" onClick={() => onOpenInitiatives?.()}>
          + Create initiative
        </button>
      </div>
      <div className="scorecard-drill-init-list">
        {initiatives.map(init => (
          <div key={init.id} className="scorecard-drill-init-row" style={{ "--init-col": init.colour } as React.CSSProperties}>
            <div className="scorecard-drill-init-body">
              <div className="scorecard-drill-init-title">{init.title}</div>
              <div className="scorecard-drill-init-desc">{init.description}</div>
            </div>
            <div className="scorecard-drill-init-action">
              <button type="button" className="scorecard-drill-init-btn" onClick={() => onOpenInitiatives?.()}>
                + Create
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── UI: Full benchmark drilldown ─────────────────────────────────────────────
function BenchmarkDrilldownView({
  benchmark, cohortLabel, journeyStage, onBack, onOpenIntelligence, onGenerateInitiative,
}: {
  benchmark: OnboardingBenchmarkInput;
  cohortLabel: string;
  journeyStage: string;
  onBack: () => void;
  onOpenIntelligence?: () => void;
  onGenerateInitiative?: (metricKey: MetricKey, playbookId: string) => void;
}) {
  const metricPlaybooks = useMemo(() => buildMetricPlaybooksMap(journeyStage), [journeyStage]);

  return (
    <div className="scorecard-v2">
      <div className="scorecard-v2-drill-header">
        <button type="button" className="scorecard-drill-back-btn" onClick={onBack}>← Overview</button>
        <div style={{ flex: 1 }}>
          <div className="scorecard-v2-drill-title">Full benchmark</div>
          <div style={{ color: "var(--text-3)", fontSize: 12, marginTop: 2 }}>{cohortLabel}</div>
        </div>
      </div>

      <BenchmarkPeerComparisonPanel
        values={benchmark}
        cohortLabel={cohortLabel}
        metricPlaybooks={metricPlaybooks}
        onGenerateInitiative={onGenerateInitiative}
      />

      <section className="scorecard-v2-panel scorecard-v2-intel-gateway" style={{ marginTop: 14 }}>
        <div className="panel-heading"><span>Intelligence</span><strong>Source of truth</strong></div>
        <p className="scorecard-v2-summary">Quarterly submissions, benchmark history, and connector-fed updates live in Intelligence — where all benchmark numbers are tracked over time.</p>
        <button type="button" className="signals-finish-profile-action" onClick={() => onOpenIntelligence?.()}>Open in Intelligence →</button>
      </section>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScorecardV2({
  benchmark,
  cohortLabel = "B2B SaaS · Seed · US",
  companyName = "Patriot Pay",
  journeyStage = "Early Revenue",
  onRunPlaybook,
  onOpenIntelligence,
  onOpenInitiatives,
  onGenerateInitiative,
}: ScorecardV2Props) {
  const [activeView, setActiveView] = useState<ScorecardView>("overview");

  const metrics   = useMemo(() => evaluateMetrics(benchmark), [benchmark]);
  const metricMap = useMemo(() => getMetricMap(metrics), [metrics]);
  const runway    = useMemo(() => estimateRunwayMonths(metricMap.cashOnHand, metricMap.monthlyBurn), [metricMap]);

  const categoryIds: ScorecardCategory[] = ["dev", "mkt", "rev"];
  const categoryData = useMemo(() => categoryIds.map(id => buildCategoryData(id, metricMap, runway)), [metricMap, runway]);

  if (activeView === "dev" || activeView === "mkt" || activeView === "rev") {
    return (
      <CategoryDrilldownView
        category={activeView}
        metricMap={metricMap}
        runway={runway}
        onBack={() => setActiveView("overview")}
        onRunPlaybook={onRunPlaybook}
        onOpenInitiatives={onOpenInitiatives}
      />
    );
  }

  if (activeView === "benchmark") {
    return (
      <BenchmarkDrilldownView
        benchmark={benchmark}
        cohortLabel={cohortLabel}
        journeyStage={journeyStage}
        onBack={() => setActiveView("overview")}
        onOpenIntelligence={onOpenIntelligence}
        onGenerateInitiative={onGenerateInitiative}
      />
    );
  }

  return (
    <div className="scorecard-v2">
      <div className="journey-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="journey-title">Overview</div>
          <div className="journey-sub">Benchmark-driven focus areas — click a track to drill in</div>
        </div>
        <button type="button" className="signals-private-btn secondary" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setActiveView("benchmark")}>
          Full benchmark →
        </button>
      </div>

      <div className="scorecard-cat-grid">
        {categoryData.map(cat => (
          <CategoryCard key={cat.id} cat={cat} onClick={() => setActiveView(cat.id)} />
        ))}
      </div>

      <OverviewAdvisorPanel
        metricMap={metricMap}
        runway={runway}
        companyName={companyName}
        onGoToCategory={id => setActiveView(id)}
      />
    </div>
  );
}
