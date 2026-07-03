import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { BriefAdvisorCard } from "./AskFuelChat.tsx";
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
  fullLabel: string;
  description: string;
  icon: string;
  colour: string;
  colourDim: string;
  colourBorder: string;
  barWidth: number;
  barColour: string;
  insight: string;
  signals: CategorySignal[];
  metricKeys: MetricKey[];
  score: number;
  position: string;
  positionColour: string;
  positionTier: PositionTier;
  stats: { label: string; value: string }[];
  benchmarkChips: string[];
  statusLabel: string;
  statusTone: "strong" | "above" | "watch" | "weak";
  confidenceLevel: "High" | "Medium" | "Low";
  confidenceTone: "strong" | "watch" | "weak";
  confidenceRatio: number;
  metricWeights: { key: MetricKey; label: string; weight: number; tier: PositionTier; display: string; positionLabel: string }[];
  openInitiatives: CategoryInitiative[];
  intelligenceCount: number;
  intelligenceTypeLabels: string[];
  suggestedPlaybooks: CategoryPlaybook[];
  detailSnippets: string[];
  detailCompletionPct: number;
  detailAnsweredCount: number;
  detailQuestionCount: number;
  glanceSummary: string;
  glanceFocus: string;
  intelDisplayCount: number;
  scoreContributors: ScoreContributor[];
};

type ScoreContributorSource = "benchmark" | "profile" | "detail";

type ScoreContributor = {
  id: string;
  label: string;
  source: ScoreContributorSource;
  display: string;
  score: number;
  weight: number;
  contribution: number;
  impact: string;
};

export type ScorecardIntelligenceItem = {
  id: string;
  type: string;
  text: string;
  title: string;
  highlight?: string;
};

export type ScorecardProfileMeta = {
  sector?: string;
  employees?: string;
  headquarters?: string;
  domain?: string;
};

export type ScorecardBenchmarkContext = {
  notableCustomers?: string;
  notableHires?: string;
  biggestChallenges?: string;
  otherUpdates?: string;
  openToIntros?: boolean;
};

type CategoryBuildContext = {
  detailAnswers: Record<string, string>;
  intelligenceItems: ScorecardIntelligenceItem[];
  profileMeta?: ScorecardProfileMeta;
  benchmarkContext?: ScorecardBenchmarkContext;
  journeyStage: string;
  benchmark: OnboardingBenchmarkInput;
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
  intelligenceItems?: ScorecardIntelligenceItem[];
  profileMeta?: ScorecardProfileMeta;
  benchmarkContext?: ScorecardBenchmarkContext;
  onUploadPitchDeck?: () => void;
  onRunPlaybook?: (playbookId: string) => void;
  onViewMetric?: (key: MetricKey) => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onGenerateInitiative?: (metricKey: MetricKey, playbookId: string) => void;
  onAddSources?: () => void;
  onAddDetails?: () => void;
  brief?: import("./fuelBrief").Brief | null;
  onViewBrief?: () => void;
  onAskFuel?: () => void;
  activeTourTarget?: string;
  lastPlaybook?: { name: string; kind: string; description: string; category: string } | null;
  onDismissPlaybook?: () => void;
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
  label: string; fullLabel: string; description: string; icon: string; colour: string; colourDim: string; colourBorder: string; drillTitle: string; urgentLabel: string;
}> = {
  dev: { label: "R&D", fullLabel: "Research and Development", description: "Headcount, gross margin, R&D velocity and technical execution.", icon: "⚙", colour: "#00B48A", colourDim: "rgba(0,180,138,0.08)",   colourBorder: "rgba(0,180,138,0.22)",   drillTitle: "Engineering & product",  urgentLabel: "R&D velocity"  },
  mkt: { label: "GTM", fullLabel: "Go-to-Market",          description: "Revenue, growth, retention, customers and GTM execution.",       icon: "↗", colour: "#9BD4BC", colourDim: "rgba(155,212,188,0.08)", colourBorder: "rgba(155,212,188,0.22)", drillTitle: "GTM & acquisition",      urgentLabel: "GTM motion"    },
  rev: { label: "G&A", fullLabel: "General and Administrative",  description: "Cash, burn, runway and operational performance.",                icon: "◎", colour: "#D4A86A", colourDim: "rgba(212,168,106,0.08)", colourBorder: "rgba(212,168,106,0.22)", drillTitle: "Revenue operations",     urgentLabel: "Cash runway"   },
};

// Status labels — richer than raw quartile
const STATUS_FROM_TIER: Record<PositionTier, { label: string; tone: "strong" | "above" | "watch" | "weak" }> = {
  top:    { label: "Leading Cohort",  tone: "strong" },
  upper:  { label: "Above Average",   tone: "above"  },
  mid:    { label: "Around Median",   tone: "watch"  },
  lower:  { label: "Needs Attention", tone: "watch"  },
  bottom: { label: "Critical",        tone: "weak"   },
};

// Confidence = share of a category's metrics that have logged values.
function confidenceFor(metricKeys: MetricKey[], metricMap: Record<MetricKey, EvaluatedMetric>): { level: "High" | "Medium" | "Low"; tone: "strong" | "watch" | "weak"; ratio: number } {
  const total = metricKeys.length || 1;
  const filled = metricKeys.filter(k => metricMap[k]?.value != null).length;
  const ratio = filled / total;
  if (ratio >= 0.8) return { level: "High",   tone: "strong", ratio };
  if (ratio >= 0.5) return { level: "Medium", tone: "watch",  ratio };
  return { level: "Low", tone: "weak", ratio };
}

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

function colourFromScore(score: number): string {
  if (score >= 80) return COLOUR_STRONG;
  if (score >= 65) return COLOUR_ABOVE;
  if (score >= 50) return COLOUR_AROUND;
  if (score >= 35) return COLOUR_BELOW;
  return COLOUR_WEAK;
}

function statusFromCompositeScore(score: number): { label: string; tone: "strong" | "above" | "watch" | "weak" } {
  if (score >= 80) return { label: "Leading Cohort", tone: "strong" };
  if (score >= 65) return { label: "Above Average", tone: "above" };
  if (score >= 50) return { label: "Around Median", tone: "watch" };
  if (score >= 35) return { label: "Needs Attention", tone: "watch" };
  return { label: "Critical", tone: "weak" };
}

function contributorTone(score: number): "strong" | "watch" | "weak" {
  if (score >= 72) return "strong";
  if (score >= 50) return "watch";
  return "weak";
}

function defaultFounderImpact(score: number): string {
  if (score < 40) return "High drag — founders feel this in execution and fundraising conversations.";
  if (score < 55) return "Moderate risk — slows the team and weakens your cohort story.";
  if (score < 72) return "Neutral — tighten before it becomes a bottleneck.";
  return "Supporting the track — keep momentum.";
}

const SCORE_WEIGHT_BENCHMARK = 45;
const SCORE_WEIGHT_PROFILE = 15;
const SCORE_WEIGHT_DETAIL = 40;

const SOURCE_LABELS: Record<ScoreContributorSource, string> = {
  benchmark: "Benchmark",
  profile: "Profile",
  detail: "Answers",
};

const DETAIL_ANSWER_SCORES: Record<string, Record<string, number>> = {
  dev_product_type: { "SaaS / web app": 78, "API / platform": 82, Marketplace: 70, "Hardware + software": 62 },
  dev_ai_role: { "Core product": 86, "A feature": 72, "Not yet": 54 },
  dev_challenge: { Speed: 66, Quality: 58, "Roadmap clarity": 50 },
  dev_ship_cadence: { "Multiple times a day": 92, Weekly: 82, Monthly: 56, "Ad hoc": 38 },
  dev_team_shape: { "Squads by area": 88, "Single team": 76, Outsourced: 46, "Solo / founder-built": 52 },
  dev_tech_lead: { "Yes, full-time": 94, Fractional: 66, No: 36 },
  dev_stack_maturity: { "Built to scale": 90, "Works for now": 72, "Hitting limits": 42, "Not sure": 48 },
  mkt_sales_motion: { "Product-led": 86, "Sales-led": 78, "Founder-led": 52, "Not yet": 36 },
  mkt_funnel_gap: { Awareness: 58, Conversion: 50, Retention: 44 },
  mkt_investor_intros: { Yes: 80, "Not right now": 68, "Actively fundraising": 74 },
  mkt_top_channel: { Outbound: 72, "Inbound / content": 78, Partnerships: 76, Events: 70, Paid: 64 },
  mkt_marketing_owner: { "Dedicated hire": 88, "Founder-led": 48, Agency: 70, "No one yet": 34 },
  mkt_sales_cycle: { "Under 30 days": 84, "1–3 months": 74, "3–6 months": 58, "6+ months": 46 },
  mkt_icp_clarity: { "Crisp & validated": 92, Forming: 62, "Still exploring": 40 },
  rev_crm: { HubSpot: 82, Salesforce: 86, Spreadsheets: 48, "None yet": 30 },
  rev_forecast: { "High confidence": 90, "Some visibility": 62, "Mostly guesswork": 38 },
  rev_biggest_gap: { "Pipeline hygiene": 52, Reporting: 56, "Billing / collections": 48, Forecasting: 44 },
  rev_metrics_tracked: { "All tracked": 92, "Some tracked": 64, "None yet": 32 },
  rev_billing: { "Fully automated": 86, Manual: 44, Hybrid: 68 },
  rev_finance_setup: { "In-house finance": 88, "Fractional CFO": 78, "Founder-managed": 46, Outsourced: 72 },
  rev_runway_visibility: { "Tracked monthly": 90, "Rough estimate": 58, "Not tracked": 34 },
};

const DETAIL_ANSWER_IMPACT: Record<string, Record<string, string>> = {
  dev_challenge: { Quality: "Quality debt compounds — founders end up firefighting instead of selling.", Speed: "Shipping fast without guardrails burns founder time on rework.", "Roadmap clarity": "Unclear roadmap pulls founders back into product every week." },
  dev_ship_cadence: { "Ad hoc": "Irregular shipping hides product risk until customers churn.", Monthly: "Monthly cadence lags peer velocity at your stage." },
  dev_tech_lead: { No: "No technical lead leaves architecture and hiring on the founder.", Fractional: "Fractional tech leadership caps scale readiness." },
  dev_stack_maturity: { "Hitting limits": "Scale limits force expensive rewrites when you should be growing." },
  dev_team_shape: { "Solo / founder-built": "Founder-built everything becomes the bottleneck past ~10 FTEs.", Outsourced: "Heavy outsourcing slows iteration when GTM needs product moves." },
  mkt_sales_motion: { "Founder-led": "Founder-led sales caps growth — you become the bottleneck.", "Not yet": "No motion yet — investors will ask how revenue actually happens." },
  mkt_marketing_owner: { "Founder-led": "Founder-owned marketing steals time from product and fundraising.", "No one yet": "No marketing owner means pipeline stays unpredictable." },
  mkt_icp_clarity: { "Still exploring": "Fuzzy ICP wastes outbound and lengthens sales cycles.", Forming: "Forming ICP still spreads founder attention across too many bets." },
  mkt_funnel_gap: { Retention: "Retention gaps show up late — founders feel it in NRR conversations first.", Conversion: "Conversion leaks burn cash before you can prove GTM fit." },
  rev_crm: { "None yet": "No CRM — founders manually track pipeline and miss follow-ups.", Spreadsheets: "Spreadsheet RevOps breaks the moment you add a second seller." },
  rev_forecast: { "Mostly guesswork": "Guesswork forecasts fail board and investor reviews.", "Some visibility": "Partial visibility still leaves founders surprised at month-end." },
  rev_runway_visibility: { "Not tracked": "Unknown runway is the fastest path to a founder crisis.", "Rough estimate": "Rough runway math fails when burn shifts month to month." },
  rev_metrics_tracked: { "None yet": "Untracked unit economics weaken every fundraising conversation." },
  rev_finance_setup: { "Founder-managed": "Founder-managed books steal 5–10 hrs/mo and delay close." },
};

function makeContributor(
  id: string,
  label: string,
  source: ScoreContributorSource,
  display: string,
  score: number,
  weight: number,
  impact?: string,
): ScoreContributor {
  const w = Math.round(weight * 10) / 10;
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return {
    id,
    label,
    source,
    display,
    score: s,
    weight: w,
    contribution: Math.round((s * w / 100) * 10) / 10,
    impact: impact ?? defaultFounderImpact(s),
  };
}

function buildProfileContributor(category: ScorecardCategory, ctx: CategoryBuildContext): ScoreContributor {
  const inputs = buildProfileInputs(category, ctx);
  const display = inputs.length ? inputs.join(" · ") : "Not provided";
  const score = Math.min(100, 30 + inputs.length * 14);
  return makeContributor(
    "profile_summary",
    "Company profile",
    "profile",
    display,
    score,
    SCORE_WEIGHT_PROFILE,
    inputs.length ? display : "No profile inputs logged.",
  );
}

function buildDetailContributors(category: ScorecardCategory, answers: DetailAnswers): ScoreContributor[] {
  const section = DETAIL_SECTIONS.find(s => s.id === category);
  if (!section?.questions.length) return [];
  const perQ = SCORE_WEIGHT_DETAIL / section.questions.length;

  return section.questions.map(q => {
    const val = answers[q.id];
    const score = val ? (DETAIL_ANSWER_SCORES[q.id]?.[val] ?? 58) : 30;
    const label = DETAIL_QUESTION_LABEL[q.id] ?? q.prompt.replace(/\?$/, "");
    return makeContributor(q.id, label, "detail", val ?? "Not answered", score, perQ, val ?? "Not answered");
  });
}

function buildBenchmarkContributors(
  category: ScorecardCategory,
  metricMap: Record<MetricKey, EvaluatedMetric>,
  runway: number | null,
): ScoreContributor[] {
  const keys = CATEGORY_METRIC_KEYS[category];
  const perMetric = keys.length ? SCORE_WEIGHT_BENCHMARK / keys.length : 0;

  return keys.map(key => {
    const m = metricMap[key];
    const hasValue = m?.value != null;
    const score = hasValue ? tierToScore(m.tier) : 28;
    const impact = hasValue ? `${m.display} · ${m.positionLabel}` : "Not logged";

    if (category === "rev" && key === "monthlyBurn" && runway != null && runway < 6) {
      return makeContributor(key, m.label, "benchmark", m.display, Math.min(score, 25), perMetric, `${m.display} · ~${runway.toFixed(0)} mo runway`);
    }

    return makeContributor(
      key,
      m?.label ?? key,
      "benchmark",
      hasValue ? m.display : "Not logged",
      score,
      perMetric,
      impact,
    );
  });
}

function buildCategoryScoreContributors(
  category: ScorecardCategory,
  metricMap: Record<MetricKey, EvaluatedMetric>,
  runway: number | null,
  ctx: CategoryBuildContext,
): { contributors: ScoreContributor[]; compositeScore: number } {
  const raw = [
    ...buildBenchmarkContributors(category, metricMap, runway),
    buildProfileContributor(category, ctx),
    ...buildDetailContributors(category, ctx.detailAnswers),
  ];

  const compositeScore = Math.round(raw.reduce((sum, c) => sum + c.contribution, 0));
  const contributors = [...raw].sort((a, b) => a.score - b.score || b.weight - a.weight);

  return { contributors, compositeScore };
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
  const stats: { label: string; value: string }[] = [];

  if (category === "dev") {
    const hc = metricMap.headcount, gm = metricMap.grossMargin;
    insight = hc.value != null
      ? `${hc.display} FTEs is ${hc.positionLabel.toLowerCase()} for your cohort. ${gm.value != null ? `Gross margin (${gm.display}) is ${gm.positionLabel.toLowerCase()} — ${gm.tier === "top" || gm.tier === "upper" ? "strong unit economics for this stage." : "review COGS before scaling headcount."}` : "Connect your delivery stack to unlock R&D velocity signals."}`
      : `Engineering setup hasn't been connected yet. ${gm.value != null ? `Gross margin (${gm.display}) is ${gm.positionLabel.toLowerCase()}` : ""}. Add context to unlock R&D signals.`;
    signals.push({ text: hc.value != null ? `${hc.display} FTEs · ${hc.positionLabel.toLowerCase()}` : "Engineering setup unknown", colour: hc.value != null ? hc.colour : COLOUR_AROUND });
    signals.push({ text: gm.value != null ? `Gross margin ${gm.display}` : "Gross margin not logged", colour: gm.value != null ? gm.colour : COLOUR_AROUND });
    stats.push({ label: "FTEs", value: hc.display });
    stats.push({ label: "Gross margin", value: gm.display });
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
    stats.push({ label: "ARR", value: arr.display });
    stats.push({ label: "Customers", value: cust.display });
    stats.push({ label: "Retention", value: ret.display });
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
    stats.push({ label: "Cash", value: cash.display });
    stats.push({ label: "Burn", value: burn.display });
    stats.push({ label: "Runway", value: runway != null ? `${runway.toFixed(0)}m` : "—" });
  }

  return {
    id: category, label: meta.label, fullLabel: meta.fullLabel, description: meta.description, icon: meta.icon,
    colour: meta.colour, colourDim: meta.colourDim, colourBorder: meta.colourBorder,
    barWidth: avgScore, barColour: TIER_COLOUR[worst],
    insight, signals, metricKeys: keys,
    score: Math.round(avgScore),
    position: tiers.length ? POSITION_LABELS[worst] : "Not logged",
    positionColour: TIER_COLOUR[worst],
    positionTier: worst,
    stats,
    benchmarkChips: buildBenchmarkChips(category, metricMap, runway),
    statusLabel: STATUS_FROM_TIER[worst].label,
    statusTone: STATUS_FROM_TIER[worst].tone,
    confidenceLevel: confidenceFor(keys, metricMap).level,
    confidenceTone: confidenceFor(keys, metricMap).tone,
    confidenceRatio: confidenceFor(keys, metricMap).ratio,
    metricWeights: keys.map((k, _i, arr) => {
      const m = metricMap[k];
      return { key: k, label: m?.label ?? k, weight: Math.round(100 / arr.length), tier: m?.tier ?? "mid", display: m?.display ?? "—", positionLabel: m?.positionLabel ?? "Not logged" };
    }),
    openInitiatives: buildCategoryInitiatives(category, metricMap, runway),
    intelligenceCount: 0,
    intelligenceTypeLabels: [],
    suggestedPlaybooks: CATEGORY_PLAYBOOKS[category],
    detailSnippets: [],
    detailCompletionPct: 0,
    detailAnsweredCount: 0,
    detailQuestionCount: 0,
    glanceSummary: "",
    glanceFocus: "",
    intelDisplayCount: 0,
    scoreContributors: [],
  };
}

// Chips that go under "BENCHMARK INPUTS" on the category card.
function buildBenchmarkChips(category: ScorecardCategory, metricMap: Record<MetricKey, EvaluatedMetric>, runway: number | null): string[] {
  const chips: string[] = [];
  if (category === "dev") {
    const hc = metricMap.headcount, gm = metricMap.grossMargin;
    if (hc.value != null) chips.push(`${hc.display} FTEs`);
    if (gm.value != null) chips.push(`${gm.display} Gross margin`);
    chips.push("Seed", "Healthcare");
  }
  if (category === "mkt") {
    const arr = metricMap.arr, cust = metricMap.payingCustomers, ret = metricMap.logoRetention;
    if (arr.value != null)  chips.push(`ARR ${arr.display}`);
    if (cust.value != null) chips.push(`${cust.display} Customers`);
    if (ret.value != null)  chips.push(`${ret.display} Retention`);
  }
  if (category === "rev") {
    const burn = metricMap.monthlyBurn;
    if (runway != null) chips.push(runway < 1 ? "Runway < 1 mo" : `Runway ${runway.toFixed(0)}mo`);
    if (burn.value != null) chips.push(`Burn ${burn.display}/mo`);
    chips.push("Seed");
  }
  return chips;
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
  arr:             [{ id: "marketing-repeatable-gtm",    title: "Repeatable GTM Motion",       track: "GTM"   }, { id: "marketing-icp-sprint",      title: "ICP Validation Sprint",     track: "GTM"   }, { id: "revops-pipeline-rhythm",    title: "Pipeline Operating Rhythm", track: "G&A"      }],
  arrGrowth:       [{ id: "marketing-outbound-review",   title: "Outbound Performance Review", track: "GTM"   }, { id: "marketing-repeatable-gtm",  title: "Repeatable GTM Motion",     track: "GTM"   }],
  nrr:             [{ id: "revops-retention",            title: "Retention Playbook",          track: "G&A"      }, { id: "revops-pipeline-rhythm",    title: "Pipeline Operating Rhythm", track: "G&A"      }],
  logoRetention:   [{ id: "marketing-icp-sprint",        title: "ICP Validation Sprint",       track: "GTM"   }, { id: "revops-retention",          title: "Retention Playbook",        track: "G&A"      }],
  payingCustomers: [{ id: "revops-pipeline-rhythm",      title: "Pipeline Operating Rhythm",   track: "G&A"      }, { id: "marketing-repeatable-gtm",  title: "Repeatable GTM Motion",     track: "GTM"   }],
  grossMargin:     [{ id: "finops-margin-review",        title: "Margin Review",               track: "FinOps"      }, { id: "finops-runway-burn-review", title: "Runway & Burn Review",      track: "FinOps"      }],
  monthlyBurn:     [{ id: "finops-runway-burn-review",   title: "Runway & Burn Review",        track: "FinOps"      }, { id: "finops-burn-efficiency",    title: "Burn Efficiency Review",    track: "FinOps"      }],
  cashOnHand:      [{ id: "finops-runway-burn-review",   title: "Runway & Burn Review",        track: "FinOps"      }, { id: "finops-board-readiness",    title: "Board Readiness Review",    track: "FinOps"      }],
  headcount:       [{ id: "dev-launch-signal-review",    title: "Launch Signal Review",        track: "R&D" }, { id: "dev-scale-readiness",       title: "Scale Readiness Check",     track: "R&D" }],
};

const METRIC_PLAYBOOK_TRACKS: Partial<Record<MetricKey, Array<MetricPlaybookOption["track"]>>> = {
  arr: ["GTM", "G&A"], arrGrowth: ["GTM"], nrr: ["G&A"], logoRetention: ["GTM", "G&A"],
  payingCustomers: ["G&A", "GTM"], grossMargin: ["FinOps"], monthlyBurn: ["FinOps"], cashOnHand: ["FinOps"], headcount: ["R&D"],
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

function playbooksForCategory(category: ScorecardCategory, journeyStage: string): CategoryPlaybook[] {
  const pbMap = buildMetricPlaybooksMap(journeyStage);
  const keys = CATEGORY_METRIC_KEYS[category];
  const fromMetrics: CategoryPlaybook[] = [];
  keys.forEach(key => {
    (pbMap[key] ?? []).forEach(p => {
      if (!fromMetrics.some(x => x.id === p.id)) {
        fromMetrics.push({ id: p.id, title: p.title, description: "" });
      }
    });
  });
  const merged = [...CATEGORY_PLAYBOOKS[category]];
  fromMetrics.forEach(p => {
    if (!merged.some(x => x.id === p.id || x.title === p.title)) merged.push(p);
  });
  return merged.slice(0, 4);
}

// ─── UI: Category overview card ───────────────────────────────────────────────
function trendArrow(tier: PositionTier): string {
  if (tier === "top" || tier === "upper") return "↗";
  if (tier === "mid") return "→";
  return "↘";
}

function computeGlancePopoverLayout(
  rect: DOMRect,
  popoverH: number,
): { style: React.CSSProperties; placement: "above" | "below" } {
  const popoverW = Math.min(380, window.innerWidth - 48);
  const gap = 10;
  const margin = 12;
  const maxH = Math.min(480, window.innerHeight - margin * 2);
  const effectiveH = Math.min(popoverH, maxH);
  const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const placeAbove = spaceBelow < effectiveH && spaceAbove >= spaceBelow;

  const top = placeAbove
    ? Math.max(margin, rect.top - gap - effectiveH)
    : Math.min(rect.bottom + gap, window.innerHeight - effectiveH - margin);

  return {
    placement: placeAbove ? "above" : "below",
    style: {
      position: "fixed",
      top,
      right: Math.max(margin, window.innerWidth - rect.right),
      left: "auto",
      bottom: "auto",
      width: popoverW,
      zIndex: 1000,
    },
  };
}

function ScoreHealthPopover({
  cat,
  score,
  updatedLabel = "2h ago",
  onClickStop,
  popoverRef,
  popoverStyle,
  placement = "below",
  isFixed = false,
  onMouseEnter,
  onMouseLeave,
}: {
  cat: Pick<CategoryData, "label" | "barColour" | "confidenceLevel" | "confidenceTone" | "scoreContributors">;
  score: number;
  updatedLabel?: string;
  onClickStop?: (e: React.MouseEvent) => void;
  popoverRef?: React.Ref<HTMLDivElement>;
  popoverStyle?: React.CSSProperties;
  placement?: "above" | "below";
  isFixed?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const contributors = cat.scoreContributors;
  const weightSum = Math.round(contributors.reduce((s, c) => s + c.weight, 0) * 10) / 10;
  const contribSum = Math.round(contributors.reduce((s, c) => s + c.contribution, 0) * 10) / 10;

  return (
    <div
      ref={popoverRef}
      className={`sc-cat-popover sc-glance-score-popover${isFixed ? " is-fixed" : ""}${placement === "above" ? " is-above" : ""}`}
      style={popoverStyle}
      role="tooltip"
      onClick={onClickStop ?? (e => e.stopPropagation())}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sc-cat-pop-head">
        <span className="sc-cat-pop-eyebrow">Track health · {cat.label}</span>
        <strong className="sc-cat-pop-score" style={{ color: cat.barColour }}>{score}<i>/100</i></strong>
      </div>
      <p className="sc-cat-pop-explain">
        Weighted from benchmark metrics ({SCORE_WEIGHT_BENCHMARK}%), company profile ({SCORE_WEIGHT_PROFILE}%), and your {cat.label} answers ({SCORE_WEIGHT_DETAIL}%). Sorted by what pulls founders down most.
      </p>
      <div className="sc-cat-pop-rows sc-cat-pop-rows-stacked">
        {contributors.map((c, i) => (
          <div
            key={c.id}
            className={`sc-cat-pop-block sc-cat-pop-tone-${contributorTone(c.score)}${i === 0 && c.score < 55 ? " is-top-priority" : ""}`}
          >
            <div className="sc-cat-pop-block-head">
              <span className={`sc-cat-pop-source is-${c.source}`}>{SOURCE_LABELS[c.source]}</span>
              <span className="sc-cat-pop-block-weight">{c.weight}% · +{c.contribution} pts</span>
            </div>
            <div className="sc-cat-pop-block-title">{c.label}</div>
            <div className="sc-cat-pop-block-meta">
              <span className="sc-cat-pop-block-val">{c.display}</span>
              <strong className={`sc-cat-pop-block-score sc-cat-tone-${contributorTone(c.score)}`}>{c.score}</strong>
            </div>
            <p className="sc-cat-pop-impact">{c.impact}</p>
          </div>
        ))}
      </div>
      <div className="sc-cat-pop-total">
        <span>Weighted total</span>
        <strong style={{ color: cat.barColour }}>{contribSum} / 100</strong>
        <span className="sc-cat-pop-total-note">({weightSum}% inputs)</span>
      </div>
      <div className="sc-cat-pop-foot">
        <span>Confidence · <strong className={`sc-cat-pop-conf sc-cat-tone-${cat.confidenceTone}`}>{cat.confidenceLevel}</strong></span>
        <span>Updated {updatedLabel}</span>
      </div>
    </div>
  );
}

function GlanceScoreRing({
  cat,
  score,
  isOpen,
  onRequestOpen,
  onRequestClose,
}: {
  cat: CategoryData;
  score: number;
  isOpen: boolean;
  onRequestOpen: () => void;
  onRequestClose: () => void;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | undefined>();
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const size = 76;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const updatePopoverPosition = useCallback((event?: Event) => {
    const scrollTarget = event?.target;
    if (scrollTarget instanceof Node && popoverRef.current?.contains(scrollTarget)) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverH = popoverRef.current?.offsetHeight ?? 300;
    const { style, placement: nextPlacement } = computeGlancePopoverLayout(rect, popoverH);
    setPlacement(nextPlacement);
    setPopoverStyle(style);
  }, []);

  const openPopover = useCallback(() => {
    onRequestOpen();
  }, [onRequestOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverStyle(undefined);
      setPlacement("below");
      return;
    }

    const trigger = triggerRef.current;
    if (trigger) {
      const { style, placement: nextPlacement } = computeGlancePopoverLayout(trigger.getBoundingClientRect(), 300);
      setPopoverStyle(style);
      setPlacement(nextPlacement);
    }

    updatePopoverPosition();
    const onScroll = (event: Event) => updatePopoverPosition(event);
    const onResize = () => updatePopoverPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen, updatePopoverPosition, cat.scoreContributors.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      onRequestClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRequestClose();
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onRequestClose]);

  const popoverNode = isOpen && popoverStyle ? (
    <ScoreHealthPopover
      cat={cat}
      score={score}
      popoverRef={popoverRef}
      popoverStyle={popoverStyle}
      placement={placement}
      isFixed
      onClickStop={e => e.stopPropagation()}
    />
  ) : null;

  return (
    <div className="sc-glance-ring-wrap">
      <div
        ref={triggerRef}
        className="sc-glance-ring-trigger"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Track health ${score}, ${cat.statusLabel}. Show how this score is calculated.`}
        onMouseEnter={openPopover}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openPopover();
          }
        }}
      >
        <div
          className="sc-glance-ring-svg-wrap"
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="sc-glance-ring" aria-hidden>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--surface-3)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={cat.barColour}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <div className="sc-glance-ring-label">
            <strong style={{ color: cat.barColour }}>{score}</strong>
          </div>
        </div>
        {typeof document !== "undefined" && popoverNode
          ? createPortal(popoverNode, document.body)
          : null}
      </div>
      <span className={`sc-glance-ring-status sc-cat-tone-${cat.statusTone}`}>{cat.statusLabel}</span>
    </div>
  );
}

function buildGlanceAnswersCta(
  trackLabel: string,
  answered: number,
  total: number,
): { label: string; meta: string; tone: "empty" | "partial" | "almost" | "complete" } {
  const remaining = Math.max(0, total - answered);

  if (total === 0) {
    return { label: `Update ${trackLabel} answers`, meta: "", tone: "empty" };
  }

  if (answered === 0) {
    return {
      label: `Add ${trackLabel} context`,
      meta: `${total} quick questions · sharpens this score`,
      tone: "empty",
    };
  }

  if (remaining === 0) {
    return {
      label: `${trackLabel} context on file`,
      meta: "update anytime",
      tone: "complete",
    };
  }

  if (remaining === 1) {
    return {
      label: `Finish ${trackLabel} context`,
      meta: "1 question left · biggest score lift now",
      tone: "almost",
    };
  }

  if (remaining <= 2) {
    return {
      label: `Almost done with ${trackLabel}`,
      meta: `${remaining} questions left`,
      tone: "almost",
    };
  }

  if (answered >= Math.ceil(total / 2)) {
    return {
      label: `${answered} of ${total} ${trackLabel} answers in`,
      meta: `${remaining} more unlocks a sharper score`,
      tone: "partial",
    };
  }

  return {
    label: `Add ${trackLabel} context`,
    meta: `${answered} of ${total} done · ${remaining} to go`,
    tone: "partial",
  };
}

function CategoryGlanceRow({
  cat,
  runway,
  onOpen,
  onUpdateDetails,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
  glancePopoverOpen,
  onGlancePopoverOpen,
  onGlancePopoverClose,
  tourTarget,
}: {
  cat: CategoryData;
  runway: number | null;
  onOpen: () => void;
  onUpdateDetails?: () => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: (id: string) => void;
  glancePopoverOpen: boolean;
  onGlancePopoverOpen: () => void;
  onGlancePopoverClose: () => void;
  tourTarget?: string;
}) {
  const score = Math.max(0, Math.min(100, cat.score));
  const focusLine = cat.glanceFocus;
  const answersCta = buildGlanceAnswersCta(cat.label, cat.detailAnsweredCount, cat.detailQuestionCount);

  return (
    <article
      className={`sc-glance-row${tourTarget ? " tour-highlight" : ""}`}
      data-tour-target={tourTarget}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      role="button"
      tabIndex={0}
      aria-label={`${cat.fullLabel}, ${score} out of 100, ${cat.statusLabel}`}
    >
      <div className="sc-glance-layout">
        <div className="sc-glance-main">
          <div className="sc-glance-id">
            <span className="sc-glance-icon" style={{ background: cat.colourDim, color: cat.colour, borderColor: cat.colourBorder }} aria-hidden>{cat.icon}</span>
            <div className="sc-glance-copy">
              <h3 className="sc-glance-name">
                <span>{cat.label}</span>
                <span className="sc-glance-name-sep" aria-hidden>·</span>
                <span>{cat.fullLabel}</span>
                <span className="sc-glance-name-arrow" aria-hidden>→</span>
              </h3>
              {focusLine ? <p className="sc-glance-focus">{focusLine}</p> : null}
              {onUpdateDetails ? (
                <button
                  type="button"
                  className={`sc-glance-answers-btn is-${answersCta.tone}`}
                  onClick={e => { e.stopPropagation(); onUpdateDetails(); }}
                >
                  {answersCta.label}
                  {answersCta.meta ? (
                    <>
                      {" · "}
                      <span className="sc-glance-answers-btn-meta">{answersCta.meta}</span>
                    </>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>
          <div className="sc-glance-foot">
            <div className="sc-glance-meta-badges" onClick={e => e.stopPropagation()}>
              {cat.openInitiatives.length > 0 ? (
                <button type="button" className="sc-glance-meta-badge" onClick={() => onOpenInitiatives?.()}>
                  {cat.openInitiatives.length} initiative{cat.openInitiatives.length === 1 ? "" : "s"}
                </button>
              ) : null}
              <button type="button" className="sc-glance-meta-badge is-intel" onClick={() => onOpenIntelligence?.()}>
                {cat.intelDisplayCount > 0 ? `${cat.intelDisplayCount} intel` : "Intelligence"}
              </button>
              {cat.suggestedPlaybooks.length > 0 ? (
                <button
                  type="button"
                  className="sc-glance-meta-badge is-playbook"
                  onClick={() => onRunPlaybook?.(cat.suggestedPlaybooks[0].id)}
                >
                  {cat.suggestedPlaybooks.length} playbook{cat.suggestedPlaybooks.length === 1 ? "" : "s"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <GlanceScoreRing
          cat={cat}
          score={score}
          isOpen={glancePopoverOpen}
          onRequestOpen={onGlancePopoverOpen}
          onRequestClose={onGlancePopoverClose}
        />
      </div>
    </article>
  );
}

function CategoryCard({ cat, onClick, onViewDetails, onViewBenchmark, expanded, updatedLabel, tourTarget }: { cat: CategoryData; onClick: () => void; onViewDetails?: () => void; onViewBenchmark?: () => void; expanded?: boolean; updatedLabel: string; tourTarget?: string }) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const score = Math.max(0, Math.min(100, cat.score));

  const strengths  = cat.metricWeights.filter(m => m.tier === "top" || m.tier === "upper");
  const weaknesses = cat.metricWeights.filter(m => m.tier === "bottom" || m.tier === "lower");

  return (
    <div
      className={`sc-cat sc-cat-wide sc-cat-tone-${cat.statusTone}${tourTarget ? " tour-highlight" : ""}`}
      data-tour-target={tourTarget}
    >
      <div className="sc-cat-header">
        <div className="sc-cat-header-id">
          <div className="sc-cat-icon" style={{ background: cat.colourDim, color: cat.colour, borderColor: cat.colourBorder }} aria-hidden>{cat.icon}</div>
          <div className="sc-cat-header-text">
            <div className="sc-cat-header-title">
              <h3 className="sc-cat-full-name">{cat.fullLabel}</h3>
              <span className="sc-cat-abbr" style={{ background: cat.colourDim, color: cat.colour, borderColor: cat.colourBorder }}>{cat.label}</span>
            </div>
            <p className="sc-cat-description">{cat.description}</p>
          </div>
        </div>
        <div className="sc-cat-header-actions">
          <button type="button" className="sc-cat-header-btn" onClick={(e) => { e.stopPropagation(); (onViewBenchmark ?? onClick)(); }}>View Benchmark <span aria-hidden="true">→</span></button>
          {!expanded && (
            <button type="button" className="sc-cat-header-btn" onClick={(e) => { e.stopPropagation(); (onViewDetails ?? onClick)(); }}>View Details <span aria-hidden="true">→</span></button>
          )}
          <button type="button" className="sc-cat-menu" aria-label="Card actions" onClick={(e) => { e.stopPropagation(); }}>⋯</button>
        </div>
      </div>

      <div className="sc-cat-body">
        <div className="sc-cat-score-col">
          <div
            className="sc-cat-donut-wrap"
            onMouseEnter={() => setPopoverOpen(true)}
            onMouseLeave={() => setPopoverOpen(false)}
            style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 108, padding: "6px 4px" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, color: "var(--text-1)", lineHeight: 1 }}>
              <strong style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em" }}>{score}</strong>
              <span style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 500 }}>/100</span>
            </div>
            {popoverOpen && (
              <ScoreHealthPopover cat={cat} score={score} updatedLabel={updatedLabel} />
            )}
          </div>
          <div className={`sc-cat-status sc-cat-tone-${cat.statusTone}`}>{cat.statusLabel}</div>
          <div className={`sc-cat-confidence sc-cat-tone-${cat.confidenceTone}`}>{cat.confidenceLevel} confidence</div>
        </div>

        <div className="sc-cat-health-col">
          <div className="sc-cat-health-head">
            <span className="sc-cat-health-label">Benchmark Health</span>
            <button
              type="button"
              className="sc-cat-info"
              aria-label="How benchmark health is calculated"
              onMouseEnter={() => setPopoverOpen(true)}
              onMouseLeave={() => setPopoverOpen(false)}
              onClick={(e) => { e.stopPropagation(); setPopoverOpen(o => !o); }}
            >ⓘ</button>
          </div>
          <div
            role="meter"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Benchmark health ${score}`}
            style={{ position: "relative", height: 8, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden", margin: "6px 0 4px" }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${score}%`,
                background: cat.barColour,
                borderRadius: 999,
                transition: "width 300ms ease",
              }}
            />
          </div>
          <div className="sc-cat-segbar-legend"><span>Weak</span><span>Strong</span></div>
          <p className="sc-cat-insight">{cat.insight}</p>

          <div className="sc-cat-inputs-label">Benchmark Inputs</div>
          <div className="sc-cat-chips">
            {cat.benchmarkChips.map((chip, i) => (
              <span key={i} className="sc-cat-chip">{chip}</span>
            ))}
          </div>
        </div>

        <div className="sc-cat-sw-col-wrap">
          <div className="sc-cat-sw-block">
            <span className="sc-cat-sw-label sc-cat-tone-strong">Primary strengths</span>
            {strengths.length > 0 ? (
              <ul className="sc-cat-sw-list">
                {strengths.slice(0, 3).map(s => <li key={s.key}><strong>{s.label}</strong> <em>{s.positionLabel}</em></li>)}
              </ul>
            ) : (
              <p className="sc-cat-sw-empty">No metrics in the top quartile yet.</p>
            )}
          </div>
          <div className="sc-cat-sw-block">
            <span className="sc-cat-sw-label sc-cat-tone-weak">Needs improvement</span>
            {weaknesses.length > 0 ? (
              <ul className="sc-cat-sw-list">
                {weaknesses.slice(0, 3).map(s => <li key={s.key}><strong>{s.label}</strong> <em>{s.positionLabel}</em></li>)}
              </ul>
            ) : (
              <p className="sc-cat-sw-empty">No metrics flagged below the cohort.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail-enrichment form schema ────────────────────────────────────────────
type DetailQuestion = {
  id: string;
  prompt: string;
  options: string[];
  multi?: boolean;
};
type DetailSection = {
  id: ScorecardCategory;
  title: string;
  subtitle: string;
  icon: string;
  questions: DetailQuestion[];
};

const DETAIL_SECTIONS: DetailSection[] = [
  {
    id: "dev",
    title: "R&D",
    subtitle: "Product & engineering",
    icon: "⚙",
    questions: [
      { id: "dev_product_type", prompt: "What type of product are you building?", options: ["SaaS / web app", "API / platform", "Marketplace", "Hardware + software"] },
      { id: "dev_ai_role", prompt: "Is AI core to your product?", options: ["Core product", "A feature", "Not yet"] },
      { id: "dev_challenge", prompt: "What is your biggest product challenge right now?", options: ["Speed", "Quality", "Roadmap clarity"] },
      { id: "dev_ship_cadence", prompt: "How often do you ship to production?", options: ["Multiple times a day", "Weekly", "Monthly", "Ad hoc"] },
      { id: "dev_team_shape", prompt: "How is your engineering team structured?", options: ["Single team", "Squads by area", "Outsourced", "Solo / founder-built"] },
      { id: "dev_tech_lead", prompt: "Do you have a technical co-founder or CTO?", options: ["Yes, full-time", "Fractional", "No"] },
      { id: "dev_stack_maturity", prompt: "How mature is your architecture for scale?", options: ["Built to scale", "Works for now", "Hitting limits", "Not sure"] },
    ],
  },
  {
    id: "mkt",
    title: "GTM",
    subtitle: "Sales & growth",
    icon: "↗",
    questions: [
      { id: "mkt_sales_motion", prompt: "What is your primary sales motion?", options: ["Sales-led", "Product-led", "Founder-led", "Not yet"] },
      { id: "mkt_funnel_gap", prompt: "Where does your funnel break down most?", options: ["Awareness", "Conversion", "Retention"] },
      { id: "mkt_investor_intros", prompt: "Are you open to investor intros from York IE?", options: ["Yes", "Not right now", "Actively fundraising"] },
      { id: "mkt_top_channel", prompt: "Which channel drives most of your pipeline?", options: ["Outbound", "Inbound / content", "Partnerships", "Events", "Paid"] },
      { id: "mkt_marketing_owner", prompt: "Who owns marketing today?", options: ["Dedicated hire", "Founder-led", "Agency", "No one yet"] },
      { id: "mkt_sales_cycle", prompt: "What's your average sales cycle?", options: ["Under 30 days", "1–3 months", "3–6 months", "6+ months"] },
      { id: "mkt_icp_clarity", prompt: "How well-defined is your ICP?", options: ["Crisp & validated", "Forming", "Still exploring"] },
    ],
  },
  {
    id: "rev",
    title: "G&A",
    subtitle: "Revenue operations & finance",
    icon: "◎",
    questions: [
      { id: "rev_crm", prompt: "Which CRM / RevOps stack do you run on?", options: ["HubSpot", "Salesforce", "Spreadsheets", "None yet"] },
      { id: "rev_forecast", prompt: "How predictable is your revenue forecast?", options: ["High confidence", "Some visibility", "Mostly guesswork"] },
      { id: "rev_biggest_gap", prompt: "What's your biggest RevOps gap?", options: ["Pipeline hygiene", "Reporting", "Billing / collections", "Forecasting"] },
      { id: "rev_metrics_tracked", prompt: "Do you track core SaaS metrics (CAC, LTV, NRR)?", options: ["All tracked", "Some tracked", "None yet"] },
      { id: "rev_billing", prompt: "How do you handle billing & invoicing?", options: ["Fully automated", "Manual", "Hybrid"] },
      { id: "rev_finance_setup", prompt: "What's your current finance setup?", options: ["In-house finance", "Fractional CFO", "Founder-managed", "Outsourced"] },
      { id: "rev_runway_visibility", prompt: "How clear is your runway & burn picture?", options: ["Tracked monthly", "Rough estimate", "Not tracked"] },
    ],
  },
];

const DETAIL_TOTAL_Q = DETAIL_SECTIONS.reduce((n, s) => n + s.questions.length, 0);
type DetailAnswers = Record<string, string>;

function loadDetailAnswers(companyName: string): DetailAnswers {
  try {
    const raw = window.localStorage.getItem(`fuel-details-${companyName}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveDetailAnswers(companyName: string, answers: DetailAnswers) {
  try { window.localStorage.setItem(`fuel-details-${companyName}`, JSON.stringify(answers)); } catch { /* ignore */ }
}
function countSectionAnswers(section: DetailSection, answers: DetailAnswers): number {
  return section.questions.filter(q => answers[q.id]).length;
}

const INTEL_TYPE_TO_CATEGORY: Record<string, ScorecardCategory> = {
  product: "dev",
  efficiency: "dev",
  team: "dev",
  growth: "mkt",
  retention: "mkt",
  gtm: "mkt",
  finance: "rev",
  fundraising: "rev",
  strategic: "rev",
};

const DETAIL_QUESTION_LABEL: Partial<Record<string, string>> = {
  dev_product_type: "Product type",
  dev_ai_role: "AI role",
  dev_challenge: "Product challenge",
  dev_ship_cadence: "Ship cadence",
  dev_team_shape: "Team structure",
  dev_tech_lead: "Technical lead",
  dev_stack_maturity: "Architecture",
  mkt_sales_motion: "Sales motion",
  mkt_funnel_gap: "Funnel gap",
  mkt_investor_intros: "Investor intros",
  mkt_top_channel: "Top channel",
  mkt_marketing_owner: "Marketing owner",
  mkt_sales_cycle: "Sales cycle",
  mkt_icp_clarity: "ICP",
  rev_crm: "CRM",
  rev_forecast: "Forecast",
  rev_biggest_gap: "RevOps gap",
  rev_metrics_tracked: "SaaS metrics",
  rev_billing: "Billing",
  rev_finance_setup: "Finance setup",
  rev_runway_visibility: "Runway visibility",
};

function intelligenceForCategory(category: ScorecardCategory, items: ScorecardIntelligenceItem[]): ScorecardIntelligenceItem[] {
  return items.filter(item => INTEL_TYPE_TO_CATEGORY[item.type.toLowerCase()] === category);
}

function buildDetailSnippets(category: ScorecardCategory, answers: DetailAnswers): string[] {
  const section = DETAIL_SECTIONS.find(s => s.id === category);
  if (!section) return [];
  return section.questions.flatMap(q => {
    const val = answers[q.id]?.trim();
    if (!val) return [];
    const label = DETAIL_QUESTION_LABEL[q.id];
    return [label ? `${label}: ${val}` : val];
  });
}

function buildCategoryBenchmarkInputs(
  category: ScorecardCategory,
  metricMap: Record<MetricKey, EvaluatedMetric>,
  runway: number | null,
): string[] {
  const parts: string[] = [];
  CATEGORY_METRIC_KEYS[category].forEach(key => {
    const m = metricMap[key];
    if (m?.value != null) parts.push(`${m.label}: ${m.display}`);
  });
  if (category === "rev" && runway != null && metricMap.cashOnHand.value != null && metricMap.monthlyBurn.value != null) {
    parts.push(`Runway: ~${runway.toFixed(0)} mo`);
  }
  return parts;
}

function buildProfileInputs(
  category: ScorecardCategory,
  ctx: CategoryBuildContext,
): string[] {
  const { profileMeta, benchmarkContext } = ctx;
  const parts: string[] = [];

  if (profileMeta?.sector?.trim()) parts.push(profileMeta.sector.trim());
  if (profileMeta?.employees?.trim()) parts.push(profileMeta.employees.trim());
  if (profileMeta?.headquarters?.trim()) parts.push(profileMeta.headquarters.trim());

  if (category === "dev" && benchmarkContext?.notableHires?.trim()) {
    parts.push(benchmarkContext.notableHires.trim());
  }
  if (category === "mkt") {
    if (benchmarkContext?.notableCustomers?.trim()) parts.push(benchmarkContext.notableCustomers.trim());
    if (benchmarkContext?.openToIntros) parts.push("Open to investor intros");
  }
  if ((category === "mkt" || category === "rev") && benchmarkContext?.biggestChallenges?.trim()) {
    parts.push(benchmarkContext.biggestChallenges.trim());
  }
  if (benchmarkContext?.otherUpdates?.trim()) parts.push(benchmarkContext.otherUpdates.trim());

  return parts;
}

function countCategoryIntelDisplay(
  category: ScorecardCategory,
  items: ScorecardIntelligenceItem[],
  metricMap: Record<MetricKey, EvaluatedMetric>,
): number {
  const fromItems = intelligenceForCategory(category, items).length;
  if (fromItems > 0) return fromItems;
  return CATEGORY_METRIC_KEYS[category].filter(k => metricMap[k]?.value != null).length;
}

function isMissingContributor(c: ScoreContributor): boolean {
  return c.display === "Not answered" || c.display === "Not logged" || c.display === "Not provided";
}

function humanizeWeakContributor(c: ScoreContributor): string | null {
  if (c.score >= 64) return null;

  const val = c.display;

  if (c.source === "benchmark") {
    if (c.score < 40) return `${c.label} at ${val} is well below your cohort.`;
    return `${c.label} at ${val} is below peer median.`;
  }

  if (c.source === "detail") {
    switch (c.id) {
      case "dev_challenge":
        return `You flagged ${val.toLowerCase()} as your biggest product challenge.`;
      case "dev_tech_lead":
        if (val === "No") return "There is no full-time technical lead on file.";
        if (val === "Fractional") return "Technical leadership is fractional only.";
        return null;
      case "dev_ship_cadence":
        if (val === "Ad hoc" || val === "Monthly") return `You ship ${val.toLowerCase()}, which reads slower than peers at this stage.`;
        return null;
      case "dev_stack_maturity":
        if (val === "Hitting limits" || val === "Not sure") return `Architecture is ${val.toLowerCase()}.`;
        return null;
      case "dev_team_shape":
        if (val === "Solo / founder-built" || val === "Outsourced") return `Engineering is ${val.toLowerCase()}.`;
        return null;
      case "mkt_sales_motion":
        if (val === "Founder-led" || val === "Not yet") return `GTM is still ${val.toLowerCase()}.`;
        return null;
      case "mkt_funnel_gap":
        return `The funnel breaks down most at ${val.toLowerCase()}.`;
      case "mkt_marketing_owner":
        if (val === "Founder-led" || val === "No one yet") return `Marketing is ${val.toLowerCase()}.`;
        return null;
      case "mkt_icp_clarity":
        if (val !== "Crisp & validated") return `ICP is ${val.toLowerCase()}.`;
        return null;
      case "rev_crm":
        if (val === "None yet" || val === "Spreadsheets") return `RevOps runs on ${val.toLowerCase()}.`;
        return null;
      case "rev_forecast":
        if (val !== "High confidence") return `Revenue forecast is ${val.toLowerCase()}.`;
        return null;
      case "rev_runway_visibility":
        if (val !== "Tracked monthly") return `Runway visibility is ${val.toLowerCase()}.`;
        return null;
      case "rev_metrics_tracked":
        if (val === "None yet") return "Core SaaS metrics are not tracked yet.";
        return null;
      default:
        return null;
    }
  }

  if (c.source === "profile" && val === "Not provided") {
    return "Company profile is still thin.";
  }

  return null;
}

function joinNaturalList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  const normalize = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  if (items.length === 2) return `${items[0].replace(/\.$/, "")}, and ${normalize(items[1])}`;
  return `${items.slice(0, -1).join(", ")}, and ${normalize(items[items.length - 1])}`;
}

function buildCategoryFocusNarrative(
  category: ScorecardCategory,
  score: number,
  contributors: ScoreContributor[],
  catIntel: ScorecardIntelligenceItem[],
): string {
  const track = CATEGORY_META[category].label;
  const missing = contributors.filter(isMissingContributor);
  const seen = new Set<string>();
  const weakNotes = [...contributors]
    .filter(c => !isMissingContributor(c))
    .sort((a, b) => a.score - b.score)
    .flatMap(c => {
      const note = humanizeWeakContributor(c);
      if (!note) return [];
      const key = `${c.source}:${c.label}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [note];
    })
    .slice(0, 2);

  let lead: string;
  if (score >= 75) {
    lead = `${track} is in good shape at ${score}.`;
  } else if (score >= 55) {
    lead = `${track} scores ${score} — a few inputs are holding it back.`;
  } else {
    lead = `${track} is at ${score} and needs attention.`;
  }

  const sentences: string[] = [lead];

  if (weakNotes.length) {
    sentences.push(joinNaturalList(weakNotes) + ".");
  }

  if (missing.length) {
    const names = missing.slice(0, 2).map(c => c.label.toLowerCase());
    const tail = missing.length > 2 ? " and a few more fields" : "";
    sentences.push(`Add ${names.join(" and ")}${tail} to sharpen this score.`);
  }

  if (catIntel.length && sentences.length < 3) {
    sentences.push(catIntel[0].text.endsWith(".") ? catIntel[0].text : `${catIntel[0].text}.`);
  }

  return sentences.join(" ");
}

function buildCategoryGlanceSummary(
  category: ScorecardCategory,
  metricMap: Record<MetricKey, EvaluatedMetric>,
  runway: number | null,
  ctx: CategoryBuildContext,
  detailSnippets: string[],
): string {
  const parts = [
    ...detailSnippets,
    ...buildProfileInputs(category, ctx),
    ...buildCategoryBenchmarkInputs(category, metricMap, runway),
  ].filter(Boolean);
  return parts.slice(0, 5).join(" · ");
}

function computeOverallContextPct(
  benchmark: OnboardingBenchmarkInput,
  detailAnswers: DetailAnswers,
  benchmarkContext?: ScorecardBenchmarkContext,
): number {
  const benchFilled = METRIC_COHORTS.filter(c => parseMetricValue(benchmark[c.key] ?? "")).length / METRIC_COHORTS.length;
  const detailFilled = Object.keys(detailAnswers).filter(k => detailAnswers[k]).length / DETAIL_TOTAL_Q;
  const narrativeFilled = [
    benchmarkContext?.biggestChallenges,
    benchmarkContext?.notableCustomers,
    benchmarkContext?.notableHires,
    benchmarkContext?.otherUpdates,
  ].filter(v => v?.trim()).length / 4;
  return Math.round((benchFilled * 0.5 + detailFilled * 0.35 + narrativeFilled * 0.15) * 100);
}

function enrichCategoryData(
  base: CategoryData,
  metricMap: Record<MetricKey, EvaluatedMetric>,
  runway: number | null,
  ctx: CategoryBuildContext,
): CategoryData {
  const catIntel = intelligenceForCategory(base.id, ctx.intelligenceItems);
  const intelTypes = [...new Set(catIntel.map(i => i.type))];
  const detailSnippets = buildDetailSnippets(base.id, ctx.detailAnswers);
  const section = DETAIL_SECTIONS.find(s => s.id === base.id);
  const sectionAnswered = section ? countSectionAnswers(section, ctx.detailAnswers) : 0;
  const sectionTotal = section?.questions.length ?? 0;
  const sectionPct = sectionTotal
    ? Math.round((sectionAnswered / sectionTotal) * 100)
    : 0;
  const initiatives = buildCategoryInitiatives(base.id, metricMap, runway);
  const playbooks = playbooksForCategory(base.id, ctx.journeyStage);

  let insight = base.insight;
  if (detailSnippets.length) {
    const lead = insight.endsWith(".") ? insight.slice(0, -1) : insight;
    insight = `${lead} — ${detailSnippets.slice(0, 2).join(" · ")}.`;
  }
  if (sectionPct > 0 && sectionPct < 100) {
    insight += ` View details is ${sectionPct}% complete for ${base.label}.`;
  } else if (sectionPct === 0) {
    insight += ` Add ${base.label} context in View details to sharpen this track.`;
  }
  if (ctx.benchmarkContext?.biggestChallenges && (base.id === "mkt" || base.id === "rev")) {
    const challenge = ctx.benchmarkContext.biggestChallenges.trim();
    if (challenge) {
      insight += ` Benchmark note: ${challenge.length > 90 ? `${challenge.slice(0, 90)}…` : challenge}.`;
    }
  }
  if (ctx.benchmarkContext?.notableCustomers && base.id === "mkt") {
    const customers = ctx.benchmarkContext.notableCustomers.trim();
    if (customers) insight += ` Notable customers: ${customers.length > 60 ? `${customers.slice(0, 60)}…` : customers}.`;
  }
  if (catIntel.length) {
    const latest = catIntel[0];
    insight += ` ${catIntel.length} tagged intelligence signal${catIntel.length > 1 ? "s" : ""} — latest: ${latest.text}.`;
  }

  const { contributors, compositeScore } = buildCategoryScoreContributors(base.id, metricMap, runway, ctx);
  const compositeStatus = statusFromCompositeScore(compositeScore);

  return {
    ...base,
    score: compositeScore,
    barWidth: compositeScore,
    barColour: colourFromScore(compositeScore),
    statusLabel: compositeStatus.label,
    statusTone: compositeStatus.tone,
    scoreContributors: contributors,
    insight,
    openInitiatives: initiatives,
    intelligenceCount: catIntel.length,
    intelligenceTypeLabels: intelTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    suggestedPlaybooks: playbooks,
    detailSnippets,
    detailCompletionPct: sectionPct,
    detailAnsweredCount: sectionAnswered,
    detailQuestionCount: sectionTotal,
    glanceSummary: buildCategoryGlanceSummary(base.id, metricMap, runway, ctx, detailSnippets),
    glanceFocus: buildCategoryFocusNarrative(base.id, compositeScore, contributors, catIntel),
    intelDisplayCount: countCategoryIntelDisplay(base.id, ctx.intelligenceItems, metricMap),
  };
}

function buildAdvisorSummary(
  companyName: string,
  categories: CategoryData[],
  runway: number | null,
  ctx: CategoryBuildContext,
): string {
  const contextPct = computeOverallContextPct(ctx.benchmark, ctx.detailAnswers, ctx.benchmarkContext);
  const urgentCount = categories.filter(c => categoryUrgency(c, runway) === "urgent").length;
  const watchCount = categories.filter(c => categoryUrgency(c, runway) === "watch").length;
  const totalIntel = ctx.intelligenceItems.length;
  const totalInitiatives = categories.reduce((n, c) => n + c.openInitiatives.length, 0);
  const sector = ctx.profileMeta?.sector ? ` (${ctx.profileMeta.sector.split("·")[0]?.trim()})` : "";

  const trackNotes = categories.map(cat => {
    const parts: string[] = [];
    if (cat.detailSnippets[0]) parts.push(cat.detailSnippets[0]);
    else if (cat.positionTier === "top" || cat.positionTier === "upper") parts.push(`${cat.label} on pace`);
    else if (categoryUrgency(cat, runway) === "urgent") parts.push(`${cat.label} needs attention`);
    if (cat.intelligenceCount) parts.push(`${cat.intelligenceCount} intel`);
    if (cat.openInitiatives.length) parts.push(`${cat.openInitiatives.length} initiative${cat.openInitiatives.length > 1 ? "s" : ""}`);
    return parts.length ? `${cat.label}: ${parts.join(", ")}` : null;
  }).filter(Boolean);

  const profileLine = contextPct >= 80
    ? `Profile, benchmark, and detail forms are ${contextPct}% complete`
    : `Profile and benchmark context is ${contextPct}% complete — finish View details and benchmark fields to sharpen summaries`;

  let statusLine = "";
  if (urgentCount > 0) {
    statusLine = `${urgentCount} urgent gap${urgentCount > 1 ? "s" : ""} vs cohort${watchCount > 0 ? `, ${watchCount} to watch` : ""}.`;
  } else if (watchCount > 0) {
    statusLine = `Mostly on pace — ${watchCount} area${watchCount > 1 ? "s" : ""} to watch.`;
  } else {
    statusLine = "Tracking with your cohort across R&D, GTM, and G&A.";
  }

  const intelLine = totalIntel > 0
    ? `${totalIntel} intelligence signal${totalIntel > 1 ? "s" : ""} from profile, benchmark, and sources.`
    : "Add sources or complete benchmark to generate intelligence.";

  const initiativeLine = totalInitiatives > 0
    ? `${totalInitiatives} open initiative${totalInitiatives > 1 ? "s" : ""} suggested across tracks.`
    : "";

  const trackLine = trackNotes.length ? ` ${trackNotes.join(" · ")}.` : "";

  return `${companyName}${sector} — ${profileLine}. ${statusLine} ${intelLine}${initiativeLine ? ` ${initiativeLine}` : ""}${trackLine} Use the tracks below to drill in.`;
}

// ─── UI: Detail-enrichment drawer ─────────────────────────────────────────────
function DetailsDrawer({
  companyName, answers, onSelect, onSaveClose, onClose, initialStep = 0,
}: {
  companyName: string;
  answers: DetailAnswers;
  onSelect: (qid: string, value: string) => void;
  onSaveClose: () => void;
  onClose: () => void;
  initialStep?: number;
}) {
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const section = DETAIL_SECTIONS[step];
  const answeredTotal = Object.keys(answers).filter(k => answers[k]).length;
  const isLast = step === DETAIL_SECTIONS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="sc-drawer-scrim" onClick={onClose}>
      <aside className="sc-drawer" onClick={e => e.stopPropagation()} role="dialog" aria-label="Add company details">
        <header className="sc-drawer-head">
          <div>
            <span className="sc-drawer-eyebrow">✦ Fuel AI · Add details</span>
            <strong className="sc-drawer-co">{companyName}</strong>
          </div>
          <button type="button" className="sc-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="sc-drawer-steps">
          {DETAIL_SECTIONS.map((s, i) => {
            const done = countSectionAnswers(s, answers);
            return (
              <button
                key={s.id}
                type="button"
                className={`sc-drawer-step${i === step ? " is-active" : ""}`}
                onClick={() => setStep(i)}
              >
                <span className="sc-drawer-step-ix">{i + 1}</span>
                <span className="sc-drawer-step-label">{s.title}</span>
                <span className="sc-drawer-step-count">{done}/{s.questions.length}</span>
              </button>
            );
          })}
        </div>

        <div className="sc-drawer-progress">
          <div className="sc-drawer-progress-bar" style={{ width: `${Math.round((answeredTotal / DETAIL_TOTAL_Q) * 100)}%` }} />
        </div>

        <div className="sc-drawer-body">
          <div className="sc-drawer-section-head">
            <span className="sc-drawer-section-icon" aria-hidden>{section.icon}</span>
            <div>
              <div className="sc-drawer-section-title">{section.title}</div>
              <div className="sc-drawer-section-sub">{section.subtitle}</div>
            </div>
          </div>

          {section.questions.map(q => (
            <div key={q.id} className="sc-drawer-q">
              <div className="sc-drawer-q-prompt">{q.prompt}</div>
              <div className="sc-drawer-opts">
                {q.options.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`sc-drawer-opt${answers[q.id] === opt ? " is-selected" : ""}`}
                    onClick={() => onSelect(q.id, answers[q.id] === opt ? "" : opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="sc-drawer-foot">
          <button type="button" className="sc-drawer-btn ghost" onClick={onSaveClose}>
            Save &amp; close
          </button>
          <div className="sc-drawer-foot-nav">
            {!isFirst && (
              <button type="button" className="sc-drawer-btn secondary" onClick={() => setStep(s => s - 1)}>
                Back
              </button>
            )}
            {!isLast ? (
              <button type="button" className="sc-drawer-btn primary" onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            ) : (
              <button type="button" className="sc-drawer-btn primary" onClick={onSaveClose}>
                Save details
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}

// ─── Focus intelligence tags for advisor (no track duplication) ───────────────
type FocusIntelTag = { id: string; label: string; urgency: "urgent" | "watch" };

function isWeakTier(tier: PositionTier): boolean {
  return tier === "bottom" || tier === "lower";
}

function categoryUrgency(cat: CategoryData, runway: number | null): "urgent" | "watch" | "ok" {
  if (cat.id === "rev" && runway != null && runway < 6) return "urgent";
  if (cat.positionTier === "bottom" || cat.positionTier === "lower") return "urgent";
  if (cat.positionTier === "mid") return "watch";
  return "ok";
}

function buildFocusIntelTags(
  categories: CategoryData[],
  metricMap: Record<MetricKey, EvaluatedMetric>,
  runway: number | null,
  intelligenceItems: ScorecardIntelligenceItem[] = [],
): FocusIntelTag[] {
  const tagMap = new Map<string, FocusIntelTag>();

  const add = (id: string, label: string, urgency: "urgent" | "watch") => {
    const key = id.toLowerCase();
    const existing = tagMap.get(key);
    if (!existing || (urgency === "urgent" && existing.urgency === "watch")) {
      tagMap.set(key, { id: key, label, urgency });
    }
  };

  categories.forEach(cat => {
    const urgency = categoryUrgency(cat, runway);
    if (urgency === "ok") return;
    if (cat.id === "dev") {
      add("efficiency", "Efficiency", urgency);
      add("team", "Team", urgency);
    }
    if (cat.id === "mkt") {
      add("growth", "Growth", urgency);
      add("retention", "Retention", urgency);
      add("gtm", "GTM", urgency);
    }
    if (cat.id === "rev") {
      add("finance", "Finance", urgency);
      if (runway != null && runway < 12) add("fundraising", "Fundraising", urgency);
    }
  });

  (Object.keys(metricMap) as MetricKey[]).forEach(key => {
    const metric = metricMap[key];
    const cohort = COHORT_BY_KEY[key];
    if (!metric?.value || !cohort || !isWeakTier(metric.tier)) return;
    add(
      cohort.intelCategory.toLowerCase(),
      cohort.intelCategory,
      metric.tier === "bottom" ? "urgent" : "watch",
    );
  });

  intelligenceItems.forEach(item => {
    const cat = INTEL_TYPE_TO_CATEGORY[item.type.toLowerCase()];
    const category = categories.find(c => c.id === cat);
    const urgency = category ? categoryUrgency(category, runway) : "watch";
    add(item.type.toLowerCase(), item.type.charAt(0).toUpperCase() + item.type.slice(1), urgency === "ok" ? "watch" : urgency);
  });

  return [...tagMap.values()].sort((a, b) => {
    if (a.urgency === b.urgency) return a.label.localeCompare(b.label);
    return a.urgency === "urgent" ? -1 : 1;
  });
}

// ─── UI: Advisor panel (summary + intelligence focus tags only) ───────────────
function OverviewAdvisorPanel({
  categories,
  runway,
  companyName,
  metricMap,
  buildContext,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
}: {
  categories: CategoryData[];
  runway: number | null;
  companyName: string;
  metricMap: Record<MetricKey, EvaluatedMetric>;
  buildContext: CategoryBuildContext;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: (id: string) => void;
}) {
  const focusTags = buildFocusIntelTags(categories, metricMap, runway, buildContext.intelligenceItems);
  const summary = buildAdvisorSummary(companyName, categories, runway, buildContext);
  const totalInitiatives = categories.reduce((n, c) => n + c.openInitiatives.length, 0);
  const totalPlaybooks = categories.reduce((n, c) => n + c.suggestedPlaybooks.length, 0);

  return (
    <div className="overview-advisor-body">
      <p className="overview-advisor-summary">{summary}</p>
      <div className="overview-advisor-stats">
        {buildContext.intelligenceItems.length > 0 ? (
          <button type="button" className="sc-glance-meta-badge is-intel" onClick={() => onOpenIntelligence?.()}>
            {buildContext.intelligenceItems.length} intelligence
          </button>
        ) : null}
        {totalInitiatives > 0 ? (
          <button type="button" className="sc-glance-meta-badge" onClick={() => onOpenInitiatives?.()}>
            {totalInitiatives} initiatives
          </button>
        ) : null}
        {totalPlaybooks > 0 ? (
          <button type="button" className="sc-glance-meta-badge is-playbook" onClick={() => onRunPlaybook?.(categories[0]?.suggestedPlaybooks[0]?.id ?? "")}>
            {totalPlaybooks} playbooks
          </button>
        ) : null}
      </div>
      {focusTags.length > 0 ? (
        <>
          <span className="overview-advisor-label">Intelligence focus</span>
          <div className="signals-filter-row overview-advisor-tags">
            {focusTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                className={tag.urgency === "urgent" ? "is-focus-urgent" : "is-focus-watch"}
                onClick={() => onOpenIntelligence?.()}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="overview-advisor-note">Complete benchmark and View details to unlock intelligence focus tags.</p>
      )}
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

// ─── UI: Development detail (rich) ────────────────────────────────────────────
const DEV_HISTORY = {
  shipVelocity:   [{ q: "Q1·25", us: 12, peer: 14 }, { q: "Q2·25", us: 14, peer: 14 }, { q: "Q3·25", us: 16, peer: 15 }, { q: "Q4·25", us: 19, peer: 15 }, { q: "Q1·26", us: 22, peer: 16 }, { q: "Q2·26", us: 26, peer: 17 }],
  qualityScore:   [{ q: "Q1·25", us: 64, peer: 70 }, { q: "Q2·25", us: 68, peer: 71 }, { q: "Q3·25", us: 72, peer: 72 }, { q: "Q4·25", us: 78, peer: 72 }, { q: "Q1·26", us: 84, peer: 73 }, { q: "Q2·26", us: 88, peer: 74 }],
  fteHeadcount:   [55, 62, 70, 80, 92, 100],
  grossMargin:    [78, 82, 86, 90, 96, 100],
};

const DEV_KPIS: { key: string; label: string; value: string; delta: string; deltaUp: boolean; series: number[] }[] = [
  { key: "fte",     label: "FTE headcount",      value: "100",  delta: "+8 QoQ",      deltaUp: true,  series: DEV_HISTORY.fteHeadcount },
  { key: "margin",  label: "Gross margin",       value: "100%", delta: "+4 pts",      deltaUp: true,  series: DEV_HISTORY.grossMargin },
  { key: "ship",    label: "Releases / quarter", value: "26",   delta: "+4 vs Q1",    deltaUp: true,  series: DEV_HISTORY.shipVelocity.map(d => d.us) },
  { key: "quality", label: "Quality score",      value: "88",   delta: "+4 vs Q1",    deltaUp: true,  series: DEV_HISTORY.qualityScore.map(d => d.us) },
];

const DEV_INTEL: { id: string; flag: "good" | "warn" | "crit"; tag: string; text: string; when: string }[] = [
  { id: "i1", flag: "good", tag: "Shipping",  text: "Patriot Pay's ship velocity now beats cohort median by 53% — the gap widened again in Q2.", when: "2h ago" },
  { id: "i2", flag: "good", tag: "Quality",   text: "Regression suite passes at 98%. Two non-critical flaky tests isolated this sprint.",         when: "Yesterday" },
  { id: "i3", flag: "warn", tag: "Roadmap",   text: "Mobile intake queued behind active regression work — engineering capacity decision needed.", when: "2 days ago" },
  { id: "i4", flag: "good", tag: "AI Leverage", text: "Prompt reuse across the Operator Thread Module unlocked ~31% engineering throughput.",     when: "5 days ago" },
];

const DEV_INITIATIVES: { id: string; title: string; owner: string; progress: number; status: "On track" | "At risk" | "Done"; due: string }[] = [
  { id: "n1", title: "Operator Thread Module — build & ship sprint 3",  owner: "Matt L.", progress: 72, status: "On track", due: "Nov 22" },
  { id: "n2", title: "Mobile intake — design handoff to engineering",   owner: "Priya R.", progress: 28, status: "At risk",  due: "Dec 6" },
  { id: "n3", title: "Postgres tuning — burn down P95 latency",         owner: "Jake S.", progress: 100, status: "Done",     due: "Oct 22" },
];

const DEV_TEAM = [
  { role: "Engineering", count: 58, lead: "Matt L." },
  { role: "AI / ML",     count: 12, lead: "Priya R." },
  { role: "UX / Design", count: 9,  lead: "Jess K." },
  { role: "QA",          count: 11, lead: "Dana T." },
  { role: "DevOps",      count: 10, lead: "Jake S." },
];

const DEV_ACTIVITY = [
  { icon: "✓", text: "Patient Billing Agent v1 launched to all 12 customers",  date: "Nov 10" },
  { icon: "→", text: "Operator Thread Module — build in progress (sprint 3)", date: "Nov 8" },
  { icon: "✓", text: "PostgreSQL migration complete · 35% infra cost reduction", date: "Oct 22" },
  { icon: "✓", text: "UX sprint 2 — flow redesign approved",                  date: "Oct 14" },
];

const FLAG_FILL = { good: "#3FE0A4", warn: "#E5B544", crit: "#E56B6B" } as const;

function CategoryExpandedPanel({
  cat,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
}: {
  cat: CategoryData;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: (id: string) => void;
}) {
  const playbooks = CATEGORY_PLAYBOOKS[cat.id];
  const accent = cat.barColour;

  const cardStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--surface-4)",
    borderRadius: 12,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };
  const sectionLbl: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-3)",
  };
  const cardHeader: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
  const primaryBtn: React.CSSProperties = {
    background: "transparent",
    color: "var(--text-1)",
    border: "1px solid var(--surface-4)",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
  const ctaGreen = FLAG_FILL.good;
  const linkBtn: React.CSSProperties = {
    background: "transparent",
    color: ctaGreen,
    border: "none",
    padding: "8px 0 0",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderTop: "1px solid var(--surface-4)",
    marginTop: "auto",
    paddingTop: 12,
    width: "100%",
    justifyContent: "space-between",
  };
  const chipStyle: React.CSSProperties = {
    background: "var(--surface-3)",
    border: "1px solid var(--surface-4)",
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 11,
    color: "var(--text-2)",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  const sources = ["GitHub", "Linear", "HubSpot", "Notes"];
  const suggested = { title: `Ship velocity report for ${cat.label}`, desc: "Auto-drafted from cohort delta + last 4 sprints." };

  return (
    <div style={{ margin: "-4px 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Row 1: 2-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Col 1: Latest AI Intelligence */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={sectionLbl}>Latest AI Intelligence</span>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>Updated 2h ago</span>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Sources</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sources.map(s => (
                <span key={s} style={chipStyle}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-3)" }} />
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DEV_INTEL.slice(0, 3).map(i => (
              <div key={i.id} style={{ display: "grid", gridTemplateColumns: "4px 1fr auto", gap: 10, alignItems: "start" }}>
                <span style={{ width: 4, height: "100%", minHeight: 34, borderRadius: 2, background: FLAG_FILL[i.flag] }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>{i.tag}</span>
                  <span style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.4 }}>{i.text}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>{i.when}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--surface-3)", border: "1px dashed var(--surface-4)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 700 }}>Suggested Initiative</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 600 }}>{suggested.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.45 }}>{suggested.desc}</div>
            <button type="button" style={{ background: "transparent", color: "var(--text-1)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }} onClick={() => onOpenInitiatives?.()}>+ Create Initiative</button>
          </div>

          <button type="button" style={linkBtn} onClick={() => onOpenIntelligence?.()}>
            View Detail in Intelligence <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* Col 2: Active Initiatives */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={sectionLbl}>Active Initiatives</span>
            <button type="button" style={primaryBtn} onClick={() => onOpenInitiatives?.()}>+ Create New</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DEV_INITIATIVES.map(init => {
              const statusColour = init.status === "Done" ? accent : init.status === "At risk" ? FLAG_FILL.warn : accent;
              return (
                <div key={init.id} style={{ background: "var(--surface-3)", border: "1px solid var(--surface-4)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 600, lineHeight: 1.35 }}>{init.title}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColour, background: `${statusColour}22`, border: `1px solid ${statusColour}55`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{init.status}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--text-3)" }}>
                    <span>{init.owner}</span>
                    <span>Due {init.due}</span>
                    <span style={{ marginLeft: "auto", color: "var(--text-1)", fontWeight: 600 }}>{init.progress}%</span>
                  </div>
                  <div style={{ height: 4, background: "var(--surface-4)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${init.progress}%`, height: "100%", background: statusColour, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" style={linkBtn} onClick={() => onOpenInitiatives?.()}>
            View All in Initiatives <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* Row 2: Playbooks + Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={sectionLbl}>Suggested Playbooks</span>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{playbooks.length} available</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {playbooks.map(pb => (
              <button
                key={pb.id}
                type="button"
                onClick={() => onRunPlaybook?.(pb.id)}
                style={{
                  background: "var(--surface-3)",
                  border: "1px solid var(--surface-4)",
                  borderLeft: `3px solid ${accent}`,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 600 }}>{pb.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.45 }}>{pb.description}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, marginTop: 4 }}>Run playbook →</div>
              </button>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={sectionLbl}>Recent Activity</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {DEV_ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: i < DEV_ACTIVITY.length - 1 ? "1px solid var(--surface-4)" : "none" }}>
                <span style={{ color: "var(--text-3)", fontSize: 14, textAlign: "center" }}>{a.icon}</span>
                <span style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.4 }}>{a.text}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ data, colour }: { data: number[]; colour: string }) {
  if (!data.length) return null;
  const w = 96, h = 28, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const xs = data.map((_, i) => pad + (i * (w - pad * 2)) / (data.length - 1));
  const ys = data.map(v => h - pad - ((v - min) / range) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${path} L${xs[xs.length - 1]},${h} L${xs[0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="dev-spark" preserveAspectRatio="none">
      <path d={area} fill={colour} opacity="0.16" />
      <path d={path} fill="none" stroke={colour} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={colour} />
    </svg>
  );
}

function CompareLineChart({ data, colour, label, peerLabel }: { data: { q: string; us: number; peer: number }[]; colour: string; label: string; peerLabel: string }) {
  const w = 720, h = 360, padX = 56, padTop = 28, padBot = 52;
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const allValues = data.flatMap(d => [d.us, d.peer]);
  const min = Math.min(...allValues) * 0.9;
  const max = Math.max(...allValues) * 1.05;
  const range = max - min || 1;
  const xAt = (i: number) => padX + (i * (w - padX * 2)) / (data.length - 1);
  const yAt = (v: number) => h - padBot - ((v - min) / range) * (h - padTop - padBot);
  const pathUs   = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(d.us).toFixed(1)}`).join(" ");
  const areaUs   = `${pathUs} L${xAt(data.length - 1)},${h - padBot} L${xAt(0)},${h - padBot} Z`;
  const pathPeer = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(d.peer).toFixed(1)}`).join(" ");
  const ticks = 4;
  const gridYs = Array.from({ length: ticks + 1 }, (_, i) => padTop + (i * (h - padTop - padBot)) / ticks);
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => Math.round(max - (i * range) / ticks));

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const xPx = xRatio * w;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(xAt(i) - xPx);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setHoverIdx(best);
  }

  const hover = hoverIdx != null ? data[hoverIdx] : null;
  const hoverX = hoverIdx != null ? xAt(hoverIdx) : 0;
  const tipW = 200;
  const tipH = 78;
  const tipLeft = Math.max(padX, Math.min(hoverX - tipW / 2, w - padX - tipW));
  const tipBelow = hoverIdx != null && yAt(data[hoverIdx].us) < padTop + tipH + 20;
  const tipTop = tipBelow
    ? Math.min(yAt(data[hoverIdx!].us) + 18, h - padBot - tipH - 4)
    : Math.max(padTop, yAt(data[hoverIdx!]?.us ?? 0) - tipH - 14);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className="dev-chart-svg"
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {gridYs.map((y, i) => (
        <g key={i}>
          <line x1={padX} x2={w - padX} y1={y} y2={y} stroke="var(--border)" strokeWidth="1.2" strokeDasharray={i === ticks ? "0" : "4 4"} />
          <text x={padX - 12} y={y + 5} textAnchor="end" fontSize="15" fill="var(--text-3)" fontFamily="inherit">{yLabels[i]}</text>
        </g>
      ))}
      <path d={areaUs} fill={colour} opacity="0.14" />
      <path d={pathPeer} fill="none" stroke="var(--text-3)" strokeWidth="2.2" strokeDasharray="7 5" />
      <path d={pathUs}   fill="none" stroke={colour} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.q}>
          <circle cx={xAt(i)} cy={yAt(d.peer)} r={hoverIdx === i ? 5 : 3} fill="var(--text-3)" stroke="var(--bg)" strokeWidth="2" />
          <circle cx={xAt(i)} cy={yAt(d.us)} r={hoverIdx === i ? 7.5 : 5} fill={colour} stroke="var(--bg)" strokeWidth="2.2" />
          <text x={xAt(i)} y={h - 16} textAnchor="middle" fontSize="15" fill={hoverIdx === i ? "var(--text-1)" : "var(--text-3)"} fontFamily="inherit" fontWeight={hoverIdx === i ? 600 : 400}>{d.q}</text>
        </g>
      ))}
      {hover != null && hoverIdx != null ? (
        <g pointerEvents="none">
          <line x1={hoverX} x2={hoverX} y1={padTop} y2={h - padBot} stroke={colour} strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="5 5" />
          <g transform={`translate(${tipLeft},${tipTop})`}>
            <rect width={tipW} height={tipH} rx="9" fill="var(--surface-3)" stroke={colour} strokeOpacity="0.55" strokeWidth="1.2" />
            <text x="14" y="22" fontSize="13" fontWeight="700" fill="var(--text-3)" letterSpacing="1" fontFamily="inherit">{hover.q.toUpperCase()}</text>
            <circle cx="18" cy="44" r="5" fill={colour} />
            <text x="30" y="48" fontSize="14" fill="var(--text-2)" fontFamily="inherit">{label}</text>
            <text x={tipW - 14} y="48" textAnchor="end" fontSize="15" fontWeight="700" fill="var(--text-1)" fontFamily="inherit" fontVariantNumeric="tabular-nums">{hover.us}</text>
            <circle cx="18" cy="64" r="5" fill="none" stroke="var(--text-3)" strokeWidth="1.6" strokeDasharray="3 2" />
            <text x="30" y="68" fontSize="14" fill="var(--text-3)" fontFamily="inherit">{peerLabel}</text>
            <text x={tipW - 14} y="68" textAnchor="end" fontSize="15" fontWeight="600" fill="var(--text-2)" fontFamily="inherit" fontVariantNumeric="tabular-nums">{hover.peer}</text>
          </g>
        </g>
      ) : null}
    </svg>
  );
}

function DevTeamCluster({ team, catColour }: { team: typeof DEV_TEAM; catColour: string }) {
  // Build a small set of avatars from the named leads
  const avatars = team.map((t, i) => {
    const initials = t.lead.split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();
    const palette: [string, string][] = [
      ["#3FE0A4", "#1E7A4A"],
      ["#E5B544", "#B07A1F"],
      ["#A78BFA", "#5E47B5"],
      ["#9BD4BC", "#3FA483"],
      ["#D4A86A", "#9A6A2A"],
    ];
    const [a, b] = palette[i % palette.length];
    return { ...t, initials, gradFrom: a, gradTo: b };
  });
  const totalFte = team.reduce((acc, t) => acc + t.count, 0);

  return (
    <div className="dev-hero-team" tabIndex={0}>
      <div className="dev-hero-team-meta">
        <span className="dev-hero-team-label">Team</span>
        <strong className="dev-hero-team-count" style={{ color: catColour }}>{totalFte} FTE</strong>
      </div>
      <div className="dev-hero-team-stack">
        {avatars.map(av => (
          <div
            key={av.role}
            className="dev-hero-team-avatar"
            style={{ background: `linear-gradient(135deg, ${av.gradFrom}, ${av.gradTo})` }}
            title={`${av.lead} · ${av.role}`}
          >
            {av.initials}
          </div>
        ))}
      </div>
      <div className="dev-hero-team-pop" role="tooltip">
        <div className="dev-hero-team-pop-head">Team &amp; resourcing</div>
        {avatars.map(av => (
          <div key={av.role} className="dev-hero-team-pop-row">
            <span
              className="dev-hero-team-pop-avatar"
              style={{ background: `linear-gradient(135deg, ${av.gradFrom}, ${av.gradTo})` }}
            >
              {av.initials}
            </span>
            <span className="dev-hero-team-pop-role">{av.role}</span>
            <span className="dev-hero-team-pop-lead">{av.lead}</span>
            <span className="dev-hero-team-pop-count">{av.count} FTE</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryDetailView({
  category, metricMap, runway, onBack, onRunPlaybook, onOpenInitiatives, companyName,
}: {
  category: ScorecardCategory;
  metricMap: Record<MetricKey, EvaluatedMetric>;
  runway: number | null;
  onBack: () => void;
  onRunPlaybook?: (id: string) => void;
  onOpenInitiatives?: () => void;
  companyName: string;
}) {
  const meta = CATEGORY_META[category];
  const catData = buildCategoryData(category, metricMap, runway);
  const playbooks = CATEGORY_PLAYBOOKS[category];
  const healthScore = Math.round(catData.barWidth);
  const positionLabel = catData.signals[0]?.text ?? "Around median";

  // Hide tabs + company header while in detail view
  useEffect(() => {
    document.body.classList.add("scorecard-detail-open");
    return () => { document.body.classList.remove("scorecard-detail-open"); };
  }, []);

  return (
    <div className="scorecard-v2 dev-detail">
      <div className="dev-detail-header">
        <button type="button" className="dev-detail-close" onClick={onBack} aria-label="Close">
          <span>Close</span><span aria-hidden="true">✕</span>
        </button>
      </div>

      <div className="dev-hero-row">
      <div className="dev-hero" style={{ "--cat-col": meta.colour } as React.CSSProperties}>
        <div className="dev-hero-top">
          <div className="dev-hero-top-left">
            <div className="dev-hero-badge" style={{ background: meta.colourDim, borderColor: meta.colourBorder, color: meta.colour }}>
              {meta.icon} {meta.label.toUpperCase()}
            </div>
            <span className="dev-hero-meta">2026-Q2 · Updated 2h ago</span>
          </div>
          <DevTeamCluster team={DEV_TEAM} catColour={meta.colour} />
        </div>

        <div className="dev-hero-body">
          <div className="dev-hero-info">
            <h2 className="dev-hero-title">{meta.drillTitle}</h2>
            <p className="dev-hero-insight">{catData.insight}</p>
          </div>

          <div className="dev-hero-score">
            <span className="dev-hero-score-label">Health score</span>
            <div className="dev-hero-score-num">
              <strong style={{ color: meta.colour }}>{healthScore}</strong>
              <span>/ 100</span>
            </div>
            <span className="dev-hero-score-tag" style={{ background: meta.colourDim, color: meta.colour, borderColor: meta.colourBorder }}>
              Top quartile
            </span>
          </div>
        </div>

        <div className="dev-hero-quartile">
          <div className="dev-hero-quartile-track">
            <div className="dev-hero-quartile-seg q1" />
            <div className="dev-hero-quartile-seg q2" />
            <div className="dev-hero-quartile-seg q3" />
            <div className="dev-hero-quartile-seg q4" style={{ background: meta.colour }} />
            <div className="dev-hero-quartile-marker" style={{ left: `${healthScore}%`, background: meta.colour, boxShadow: `0 0 0 4px var(--bg), 0 0 12px ${meta.colour}` }} />
          </div>
          <div className="dev-hero-quartile-labels">
            <span>P25</span>
            <span>P50</span>
            <span>P75</span>
            <span style={{ color: meta.colour, fontWeight: 600 }}>{positionLabel}</span>
            <span>P90</span>
          </div>
        </div>
      </div>

      {/* Row 1: Hero (left) + Key metrics (right) */}
      <div className="dev-row-card dev-hero-metrics">
          <div className="scorecard-section-lbl" style={{ marginTop: 0 }}>Key metrics</div>
          <div className="dev-kpi-grid">
            {DEV_KPIS.map(k => (
              <div key={k.key} className="dev-kpi-card">
                <div className="dev-kpi-label">{k.label}</div>
                <div className="dev-kpi-value-row">
                  <strong>{k.value}</strong>
                  <span className={`dev-kpi-delta ${k.deltaUp ? "up" : "down"}`}>{k.deltaUp ? "↑" : "↓"} {k.delta}</span>
                </div>
                <MiniSparkline data={k.series} colour={meta.colour} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Intelligence + Initiatives + Playbooks side-by-side */}
      <div className="dev-row-3col">
        <div className="dev-row-card">
          <div className="scorecard-section-lbl" style={{ marginTop: 0 }}>Latest AI intelligence</div>
          <div className="dev-intel-grid">
            {DEV_INTEL.map(i => (
              <div key={i.id} className="dev-intel-row">
                <span className="dev-intel-flag" style={{ background: FLAG_FILL[i.flag] }} />
                <div className="dev-intel-body">
                  <span className="dev-intel-tag">{i.tag}</span>
                  <span className="dev-intel-text">{i.text}</span>
                </div>
                <span className="dev-intel-when">{i.when}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dev-row-card">
          <div className="scorecard-drill-init-header" style={{ marginTop: 0 }}>
            <div className="scorecard-section-lbl" style={{ margin: 0 }}>Active initiatives</div>
            <button type="button" className="scorecard-drill-init-create" onClick={() => onOpenInitiatives?.()}>+ New</button>
          </div>
          <div className="dev-initiatives">
            {DEV_INITIATIVES.map(init => {
              const colour = init.status === "Done" ? meta.colour : init.status === "At risk" ? FLAG_FILL.warn : meta.colour;
              return (
                <div key={init.id} className="dev-initiative-row">
                  <div className="dev-initiative-info">
                    <div className="dev-initiative-title">{init.title}</div>
                    <div className="dev-initiative-meta">{init.owner} · due {init.due}</div>
                  </div>
                  <div className="dev-initiative-progress">
                    <div className="dev-initiative-bar">
                      <div className="dev-initiative-bar-fill" style={{ width: `${init.progress}%`, background: colour }} />
                    </div>
                    <span>{init.progress}%</span>
                  </div>
                  <span className={`dev-initiative-status status-${init.status.toLowerCase().replace(/\s/g, "-")}`}>{init.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dev-row-card">
          <div className="scorecard-section-lbl" style={{ marginTop: 0 }}>Recommended playbooks</div>
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
        </div>
      </div>

      {/* Recent activity (compact, full width) */}
      <div className="dev-row-card" style={{ marginTop: 16 }}>
        <div className="scorecard-section-lbl" style={{ marginTop: 0 }}>Recent activity</div>
        <div className="dev-activity-list">
          {DEV_ACTIVITY.map((a, i) => (
            <div key={i} className="dev-activity-row">
              <span className="dev-activity-icon" style={{ color: meta.colour }}>{a.icon}</span>
              <span className="dev-activity-text">{a.text}</span>
              <span className="dev-activity-date">{a.date}</span>
            </div>
          ))}
        </div>
      </div>
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
const BENCHMARK_DRAWER_FIELDS: {
  key: keyof OnboardingBenchmarkInput;
  label: string;
  unit: "percent" | "usd" | "count";
  p25: number; p75: number; p90: number;
}[] = [
  { key: "arrGrowth",       label: "ARR Growth (YoY)",       unit: "percent", p25: 18,      p75: 80,        p90: 140 },
  { key: "nrr",             label: "Net Revenue Retention", unit: "percent", p25: 88,      p75: 118,       p90: 130 },
  { key: "grossMargin",     label: "Gross Margin",          unit: "percent", p25: 48,      p75: 74,        p90: 82 },
  { key: "logoRetention",   label: "Logo Retention",        unit: "percent", p25: 72,      p75: 91,        p90: 96 },
  { key: "monthlyBurn",     label: "Monthly Net Burn",      unit: "usd",     p25: 40000,   p75: 160000,    p90: 280000 },
  { key: "cashOnHand",      label: "Cash on Hand",          unit: "usd",     p25: 800000,  p75: 4000000,   p90: 8000000 },
  { key: "headcount",       label: "Headcount (FTE)",       unit: "count",   p25: 8,       p75: 28,        p90: 50 },
  { key: "payingCustomers", label: "Paying Customers",      unit: "count",   p25: 18,      p75: 90,        p90: 180 },
];

function formatBenchmarkDrawerValue(value: number, unit: "percent" | "usd" | "count") {
  if (unit === "percent") return `${value}%`;
  if (unit === "usd") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    if (value >= 1_000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }
  return String(value);
}

function valueToBarPercent(v: number, p25: number, p75: number, p90: number) {
  if (v <= 0 || !Number.isFinite(v)) return 0;
  if (v <= p25) return (v / p25) * 20;
  if (v <= p75) return 20 + ((v - p25) / (p75 - p25)) * 40;
  if (v <= p90) return 60 + ((v - p75) / (p90 - p75)) * 25;
  return Math.min(100, 85 + ((v - p90) / p90) * 15);
}

function BenchmarkEditDrawer({
  open, onClose, benchmark, companyName, onSave,
}: {
  open: boolean;
  onClose: () => void;
  benchmark: OnboardingBenchmarkInput;
  companyName: string;
  onSave: (next: Partial<OnboardingBenchmarkInput>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const lastOpen = useRef(false);

  useEffect(() => {
    if (open && !lastOpen.current) {
      const next: Record<string, string> = {};
      BENCHMARK_DRAWER_FIELDS.forEach(f => { next[f.key] = (benchmark as any)[f.key] ?? ""; });
      setDraft(next);
    }
    lastOpen.current = open;
  }, [open, benchmark]);

  if (!open) return null;

  const update = (key: string, val: string) => setDraft(d => ({ ...d, [key]: val.replace(/[^0-9.]/g, "") }));
  const save = () => { onSave(draft as Partial<OnboardingBenchmarkInput>); onClose(); };

  return (
    <div className="bench-drawer-scrim" onClick={onClose}>
      <aside className="bench-drawer" onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit benchmark">
        <header className="bench-drawer-head">
          <div>
            <h2 className="bench-drawer-title">How do you stack up?</h2>
            <p className="bench-drawer-sub">Enter your numbers — the bar shows where you sit. Fuel refreshes intelligence and initiatives once metrics are in.</p>
          </div>
          <button type="button" className="bench-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="bench-drawer-body">
          <div className="bench-drawer-intro">
            <strong>✦ The more you share, the sharper your intelligence</strong>
            <p>Every number narrows your cohort. Once metrics are entered, Fuel rebuilds {companyName}&rsquo;s intelligence, suggested initiatives, and playbooks. This step is optional.</p>
          </div>

          {BENCHMARK_DRAWER_FIELDS.map(field => {
            const raw = draft[field.key] ?? "";
            const num = parseFloat(raw);
            const hasValue = !isNaN(num) && raw !== "";
            const pctValue = hasValue ? valueToBarPercent(num, field.p25, field.p75, field.p90) : 0;
            const p25Pct = valueToBarPercent(field.p25, field.p25, field.p75, field.p90);
            const p75Pct = valueToBarPercent(field.p75, field.p25, field.p75, field.p90);
            const p90Pct = valueToBarPercent(field.p90, field.p25, field.p75, field.p90);
            return (
              <div key={field.key} className="bench-field">
                <label className="bench-field-label">{field.label.toUpperCase()}</label>
                <input
                  className="bench-field-input"
                  inputMode="decimal"
                  value={raw}
                  onChange={e => update(field.key, e.target.value)}
                  placeholder="—"
                />
                <div className="bench-field-bar">
                  <div className="bench-bar-track">
                    <div className="bench-bar-fill" style={{ width: `${pctValue}%` }} />
                    {hasValue ? <div className="bench-bar-dot" style={{ left: `${pctValue}%` }} /> : null}
                  </div>
                  <div className="bench-bar-ticks">
                    <span style={{ left: `${p25Pct}%` }}>P25 {formatBenchmarkDrawerValue(field.p25, field.unit)}</span>
                    <span style={{ left: `${p75Pct}%` }}>P75 {formatBenchmarkDrawerValue(field.p75, field.unit)}</span>
                    <span style={{ left: `${p90Pct}%` }}>P90 {formatBenchmarkDrawerValue(field.p90, field.unit)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          <p className="bench-drawer-foot">Numbers stay in your workspace and are never shared externally.</p>
        </div>

        <footer className="bench-drawer-actions">
          <button type="button" className="bench-drawer-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="bench-drawer-save" onClick={save}>Save benchmark</button>
        </footer>
      </aside>
    </div>
  );
}

function AddSourcesDrawer({
  open, onClose, onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (source: { title: string; type: string; description: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Pitch deck");
  const [typeOpen, setTypeOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastOpenRef = useRef(false);

  const SOURCE_TYPES = [
    "Pitch deck",
    "Investor notes",
    "Investment memo",
    "Board deck",
    "Financial model",
    "Cap table",
    "Product roadmap",
    "Customer contract",
    "Due diligence pack",
  ];

  useEffect(() => {
    if (open && !lastOpenRef.current) {
      setTitle(""); setType("Pitch deck"); setDescription(""); setTypeOpen(false); setFile(null);
    }
    lastOpenRef.current = open;
  }, [open]);

  if (!open) return null;

  const canSubmit = title.trim().length > 0 || !!file;
  const submit = () => {
    if (!canSubmit) return;
    onGenerate({ title: title.trim() || (file ? file.name : ""), type, description: description.trim() });
    onClose();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };
  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="bench-drawer-scrim" onClick={onClose}>
      <aside className="bench-drawer add-sources-drawer" onClick={e => e.stopPropagation()} role="dialog" aria-label="Add source">
        <header className="bench-drawer-head">
          <div>
            <div className="add-sources-eyebrow">SOURCES</div>
            <h2 className="bench-drawer-title" style={{ fontSize: 22 }}>Auto-generate sources from connected context</h2>
            <p className="bench-drawer-sub">Capture notes, connector activity, and meetings — then turn them into intelligence.</p>
          </div>
          <div className="add-sources-actions">
            <button type="button" className="bench-drawer-cancel" onClick={onClose}>Cancel</button>
            <button type="button" className="bench-drawer-save" onClick={submit} disabled={!canSubmit} style={!canSubmit ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
              Generate intelligence
            </button>
          </div>
        </header>

        <div className="bench-drawer-body">
          <div className="bench-field">
            <label className="bench-field-label">UPLOAD</label>
            <div
              className={`add-sources-upload${file ? " has-file" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <div className="add-sources-upload-icon">▣</div>
                  <div className="add-sources-upload-meta">
                    <strong>{file.name}</strong>
                    <span>{formatBytes(file.size)} · click to replace</span>
                  </div>
                  <button
                    type="button"
                    className="add-sources-upload-clear"
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    aria-label="Remove file"
                  >✕</button>
                </>
              ) : (
                <>
                  <div className="add-sources-upload-icon">↑</div>
                  <div className="add-sources-upload-meta">
                    <strong>Drop a file or click to browse</strong>
                    <span>PDF, DOCX, XLSX, PPTX, CSV — up to 25 MB</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bench-field">
            <label className="bench-field-label">TITLE</label>
            <div className="add-sources-title-row">
              <input
                className="bench-field-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Q3 enterprise pipeline risk"
              />
              <div className="add-sources-type-wrap">
                <button type="button" className="add-sources-type-trigger" onClick={() => setTypeOpen(o => !o)}>
                  <span>{type}</span>
                  <span className="add-sources-type-caret">▾</span>
                </button>
                {typeOpen ? (
                  <div className="add-sources-type-menu">
                    {SOURCE_TYPES.map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`add-sources-type-item${t === type ? " active" : ""}`}
                        onClick={() => { setType(t); setTypeOpen(false); }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bench-field">
            <label className="bench-field-label">DESCRIPTION</label>
            <textarea
              className="bench-field-input add-sources-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What should Fuel extract from this source?"
              rows={6}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function ScorecardV2({
  benchmark,
  cohortLabel = "B2B SaaS · Seed · US",
  companyName = "Patriot Pay",
  journeyStage = "Early Revenue",
  intelligenceItems = [],
  profileMeta,
  benchmarkContext,
  onRunPlaybook,
  onOpenIntelligence,
  onOpenInitiatives,
  onGenerateInitiative,
  onAddSources,
  onAddDetails,
  brief = null,
  onViewBrief,
  onAskFuel,
  lastPlaybook = null,
  onDismissPlaybook,
  activeTourTarget,
}: ScorecardV2Props) {
  const [activeView, setActiveView] = useState<ScorecardView>("overview");
  const [editBenchmarkOpen, setEditBenchmarkOpen] = useState(false);
  const [benchmarkSaved, setBenchmarkSaved] = useState(false);
  const [addSourcesOpen, setAddSourcesOpen] = useState(false);
  const cName = companyName ?? "This company";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(0);
  const [openGlancePopover, setOpenGlancePopover] = useState<ScorecardCategory | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const [detailAnswers, setDetailAnswers] = useState<DetailAnswers>(() => loadDetailAnswers(cName));

  // Re-hydrate saved answers once the company name resolves (prop may arrive after mount).
  useEffect(() => {
    setDetailAnswers(loadDetailAnswers(cName));
  }, [cName]);

  const selectDetail = (qid: string, value: string) => {
    setDetailAnswers(prev => {
      const next = { ...prev };
      if (value) next[qid] = value; else delete next[qid];
      saveDetailAnswers(cName, next);
      return next;
    });
  };

  const openDetailsDrawer = (category?: ScorecardCategory) => {
    const idx = category ? DETAIL_SECTIONS.findIndex(s => s.id === category) : 0;
    setDrawerStep(idx >= 0 ? idx : 0);
    setDrawerOpen(true);
  };

  const metrics   = useMemo(() => evaluateMetrics(benchmark), [benchmark]);
  const metricMap = useMemo(() => getMetricMap(metrics), [metrics]);
  const runway    = useMemo(() => estimateRunwayMonths(metricMap.cashOnHand, metricMap.monthlyBurn), [metricMap]);

  const categoryIds: ScorecardCategory[] = ["dev", "mkt", "rev"];
  const buildContext = useMemo<CategoryBuildContext>(() => ({
    detailAnswers,
    intelligenceItems,
    profileMeta,
    benchmarkContext,
    journeyStage,
    benchmark,
  }), [detailAnswers, intelligenceItems, profileMeta, benchmarkContext, journeyStage, benchmark]);

  const categoryData = useMemo(
    () => categoryIds.map(id => enrichCategoryData(buildCategoryData(id, metricMap, runway), metricMap, runway, buildContext)),
    [metricMap, runway, buildContext],
  );

  if (activeView === "dev" || activeView === "mkt" || activeView === "rev") {
    return (
      <CategoryDetailView
        category={activeView}
        metricMap={metricMap}
        runway={runway}
        onBack={() => setActiveView("overview")}
        onRunPlaybook={onRunPlaybook}
        onOpenInitiatives={onOpenInitiatives}
        companyName={cName}
      />
    );
  }

  if (false && (activeView === "dev" || activeView === "mkt" || activeView === "rev")) {
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
      <div className="data-room-head sc-overview-head">
        <div>
          <span>Benchmark overview</span>
          <h2>Overview</h2>
          <p>Three focus areas vs your cohort — open a track for metrics, intelligence, and next steps.</p>
        </div>
        <div className="data-room-head-actions">
          <button type="button" className="signals-private-btn secondary" onClick={() => setActiveView("benchmark")}>
            Full benchmark →
          </button>
        </div>
      </div>

      <div
        className={`sc-adv-featured-wrap sc-adv-featured-wrap-simple${advisorOpen ? "" : " is-collapsed"}`}
        data-tour-target="ai-advisor"
      >
        <div
          className="sc-adv-featured-toggle"
          onClick={() => setAdvisorOpen(o => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAdvisorOpen(o => !o); } }}
          aria-expanded={advisorOpen}
        >
          <span className="sc-adv-featured-toggle-label">✦ Fuel AI · Advisor</span>
          <span className="sc-adv-featured-toggle-meta">{cName}</span>
          <div className="sc-adv-featured-header-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sc-adv-header-btn"
              onClick={() => setEditBenchmarkOpen(true)}
            >
              <span className="sc-adv-header-btn-icon">+</span>
              {benchmarkSaved ? "View Benchmark" : "Add / Edit Benchmark"}
            </button>
            <button
              type="button"
              className="sc-adv-header-btn"
              onClick={() => setAddSourcesOpen(true)}
            >
              <span className="sc-adv-header-btn-icon">+</span>
              Add Sources
            </button>
            <button
              type="button"
              className="sc-adv-header-btn"
              onClick={() => openDetailsDrawer()}
            >
              View details
              <span className="sc-adv-header-btn-info" aria-hidden="true">ⓘ</span>
            </button>
          </div>
          <span className="sc-adv-featured-chev" aria-hidden="true">▾</span>
        </div>
        {advisorOpen ? (
          lastPlaybook ? (
            <div className="sc-playbook-card sc-adv-featured sc-adv-featured-simple">
              <div className="sc-playbook-head">
                <div>
                  <span className="sc-playbook-eyebrow">▤ Playbook · {lastPlaybook.kind}</span>
                  <strong className="sc-playbook-title">{lastPlaybook.name}</strong>
                </div>
                <button type="button" className="sc-playbook-x" onClick={() => onDismissPlaybook?.()} aria-label="Dismiss">✕</button>
              </div>
              <p className="sc-playbook-desc">{lastPlaybook.description}</p>
              <button type="button" className="sc-playbook-cta" onClick={() => onAskFuel?.()}>Open in Ask Fuel AI →</button>
            </div>
          ) : brief ? (
            <div className="sc-adv-featured sc-adv-featured-simple">
              <BriefAdvisorCard brief={brief} onViewDetails={() => openDetailsDrawer()} />
            </div>
          ) : (
            <div className="overview-advisor-panel">
              <OverviewAdvisorPanel
                categories={categoryData}
                runway={runway}
                companyName={cName}
                metricMap={metricMap}
                buildContext={buildContext}
                onOpenIntelligence={onOpenIntelligence}
                onOpenInitiatives={onOpenInitiatives}
                onRunPlaybook={onRunPlaybook}
              />
            </div>
          )
        ) : null}
      </div>

      <div className="sc-overview-tracks sc-overview-tracks-glance">
        {categoryData.map(cat => (
          <CategoryGlanceRow
            key={cat.id}
            cat={cat}
            runway={runway}
            onOpen={() => setActiveView(cat.id)}
            onUpdateDetails={() => openDetailsDrawer(cat.id)}
            onOpenIntelligence={onOpenIntelligence}
            onOpenInitiatives={onOpenInitiatives}
            onRunPlaybook={onRunPlaybook}
            glancePopoverOpen={openGlancePopover === cat.id}
            onGlancePopoverOpen={() => setOpenGlancePopover(cat.id)}
            onGlancePopoverClose={() => setOpenGlancePopover(null)}
            tourTarget={activeTourTarget === `category-${cat.id}` ? `category-${cat.id}` : undefined}
          />
        ))}
      </div>

      {drawerOpen && (
        <DetailsDrawer
          companyName={cName}
          answers={detailAnswers}
          initialStep={drawerStep}
          onSelect={selectDetail}
          onSaveClose={() => setDrawerOpen(false)}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <BenchmarkEditDrawer
        open={editBenchmarkOpen}
        onClose={() => setEditBenchmarkOpen(false)}
        benchmark={benchmark}
        companyName={cName}
        onSave={() => setBenchmarkSaved(true)}
      />

      <AddSourcesDrawer
        open={addSourcesOpen}
        onClose={() => setAddSourcesOpen(false)}
        onGenerate={() => {}}
      />
    </div>
  );
}
