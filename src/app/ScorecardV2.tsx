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
import { mapOnboardingToDetailAnswers, OnboardingBenchmarkFieldList, type OnboardingFlowAnswers } from "./OnboardingFlow.tsx";
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
  glanceStrength: string;
  glanceNeedsWork: string;
  glanceStrengthItems: TrackInsightItem[];
  glanceWeaknessItems: TrackInsightItem[];
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

type TrackInsightItem = {
  id: string;
  label: string;
  detail: string;
  sortKey: number;
};

const TRACK_INSIGHT_SOURCE: Record<ScoreContributorSource | "intelligence", string> = {
  benchmark: "Benchmark",
  profile: "Profile",
  detail: "Your answers",
  intelligence: "Intelligence",
};

const INTEL_WEAK_HINTS = /\b(gap|risk|delay|churn|miss|weak|concern|stall|behind|below|lack|without|guesswork|spreadsheet|founder-led|ad hoc|exploring|fuzzy|not yet|not tracked|manual)\b/i;
const INTEL_STRONG_HINTS = /\b(strong|top quartile|validated|crisp|automated|high confidence|ahead|momentum|landed|closed|expansion|efficient|weekly|dedicated hire|hubspot|salesforce)\b/i;

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
  onboardingAnswers?: OnboardingFlowAnswers | null;
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
  onboardingAnswers?: OnboardingFlowAnswers | null;
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

/** Same benchmark list on every track detail view — not split by R&D / GTM / G&A. */
const ALL_BENCHMARK_METRIC_KEYS: MetricKey[] = METRIC_COHORTS.map(c => c.key);

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
    glanceStrength: "",
    glanceNeedsWork: "",
    glanceStrengthItems: [],
    glanceWeaknessItems: [],
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
  className,
}: {
  cat: CategoryData;
  score: number;
  isOpen: boolean;
  onRequestOpen: () => void;
  onRequestClose: () => void;
  className?: string;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | undefined>();
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const size = 88;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const positionPopover = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverH = popoverRef.current?.offsetHeight ?? 300;
    const { style, placement: nextPlacement } = computeGlancePopoverLayout(rect, popoverH);
    setPlacement(nextPlacement);
    setPopoverStyle(style);
  }, []);

  const togglePopover = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (isOpen) onRequestClose();
    else onRequestOpen();
  }, [isOpen, onRequestClose, onRequestOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverStyle(undefined);
      setPlacement("below");
      return;
    }

    positionPopover();
    const onResize = () => positionPopover();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen, positionPopover, cat.scoreContributors.length]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && popoverRef.current?.contains(target)) return;
      onRequestClose();
    };
    window.addEventListener("scroll", closeOnScroll, true);

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
      window.removeEventListener("scroll", closeOnScroll, true);
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
    <div className={`sc-glance-ring-wrap${className ? ` ${className}` : ""}`}>
      <div
        ref={triggerRef}
        className={`sc-glance-ring-trigger${isOpen ? " is-open" : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Track health ${score}, ${cat.statusLabel}. Click to ${isOpen ? "hide" : "show"} score breakdown.`}
        title="Click for score breakdown"
        onClick={togglePopover}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") togglePopover(e);
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
    return { label: `Update ${trackLabel} details`, meta: "", tone: "empty" };
  }

  if (answered === 0) {
    return {
      label: `Complete ${trackLabel} details`,
      meta: `${total} questions · unlocks a sharper score`,
      tone: "empty",
    };
  }

  if (remaining === 0) {
    return {
      label: `Review ${trackLabel} details`,
      meta: "All answered · update anytime",
      tone: "complete",
    };
  }

  if (remaining === 1) {
    return {
      label: `Finish ${trackLabel} details`,
      meta: "1 question left · biggest score lift now",
      tone: "almost",
    };
  }

  if (remaining <= 2) {
    return {
      label: `Finish ${trackLabel} details`,
      meta: `${remaining} questions left`,
      tone: "almost",
    };
  }

  if (answered >= Math.ceil(total / 2)) {
    return {
      label: `Finish ${trackLabel} details`,
      meta: `${answered} of ${total} answered · ${remaining} to go`,
      tone: "partial",
    };
  }

  return {
    label: `Complete ${trackLabel} details`,
    meta: `${answered} of ${total} answered · ${remaining} remaining`,
    tone: "partial",
  };
}

function GlanceInsightsWrap({
  strengths,
  weaknesses,
  previewLimit = 2,
}: {
  strengths: TrackInsightItem[];
  weaknesses: TrackInsightItem[];
  previewLimit?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const hiddenCount = expanded
    ? 0
    : Math.max(0, strengths.length - previewLimit) + Math.max(0, weaknesses.length - previewLimit);
  const visibleStrengths = expanded ? strengths : strengths.slice(0, previewLimit);
  const visibleWeaknesses = expanded ? weaknesses : weaknesses.slice(0, previewLimit);

  return (
    <div className="sc-glance-insights-wrap">
      <div className="sc-glance-strength-col">
        <TrackInsightPanel
          tone="strong"
          title="Primary strengths"
          items={visibleStrengths}
          empty="No strengths flagged yet."
          compact
        />
      </div>
      <div className="sc-glance-needs-col">
        <TrackInsightPanel
          tone="weak"
          title="Needs improvement"
          items={visibleWeaknesses}
          empty="No gaps flagged yet."
          compact
        />
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="sc-glance-insight-more-btn"
          onClick={e => { e.stopPropagation(); setExpanded(true); }}
        >
          View more <span aria-hidden="true">→</span>
        </button>
      ) : null}
    </div>
  );
}

function CategoryGlanceHeaderBar({
  cat,
  answersCta,
  onUpdateDetails,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
}: {
  cat: CategoryData;
  answersCta: ReturnType<typeof buildGlanceAnswersCta>;
  onUpdateDetails?: () => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: (id: string) => void;
}) {
  return (
    <div className="sc-glance-header-bar" onClick={e => e.stopPropagation()}>
      <div className="sc-glance-header-bar-start">
        <div className="sc-glance-header-bar-links">
          {cat.openInitiatives.length > 0 ? (
            <button type="button" className="sc-cat-header-btn" onClick={() => onOpenInitiatives?.()}>
              {cat.openInitiatives.length} initiative{cat.openInitiatives.length === 1 ? "" : "s"} <span aria-hidden="true">→</span>
            </button>
          ) : null}
          <button type="button" className="sc-cat-header-btn" onClick={() => onOpenIntelligence?.()}>
            {cat.intelDisplayCount > 0 ? `${cat.intelDisplayCount} intelligence` : "Intelligence"} <span aria-hidden="true">→</span>
          </button>
          {cat.suggestedPlaybooks.length > 0 ? (
            <button type="button" className="sc-cat-header-btn" onClick={() => onRunPlaybook?.(cat.suggestedPlaybooks[0].id)}>
              {cat.suggestedPlaybooks.length} playbook{cat.suggestedPlaybooks.length === 1 ? "" : "s"} <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      </div>
      {onUpdateDetails ? (
        <div className="sc-glance-header-bar-end">
          {answersCta.meta ? (
            <p className="sc-glance-header-bar-hint">{answersCta.meta}</p>
          ) : null}
          <button
            type="button"
            className={`sc-cat-header-btn sc-glance-details-btn${answersCta.tone !== "complete" ? " is-priority" : ""}`}
            onClick={e => { e.stopPropagation(); onUpdateDetails(); }}
          >
            {answersCta.label} <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
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
      <CategoryGlanceHeaderBar
        cat={cat}
        answersCta={answersCta}
        onUpdateDetails={onUpdateDetails}
        onOpenIntelligence={onOpenIntelligence}
        onOpenInitiatives={onOpenInitiatives}
        onRunPlaybook={onRunPlaybook}
      />
      <div className="sc-glance-layout">
        <div className="sc-glance-brief-col">
          <div className="sc-glance-id">
            <GlanceScoreRing
              cat={cat}
              score={score}
              isOpen={glancePopoverOpen}
              onRequestOpen={onGlancePopoverOpen}
              onRequestClose={onGlancePopoverClose}
              className="sc-glance-ring-wrap--lead"
            />
            <div className="sc-glance-copy">
              <h3 className="sc-glance-name">
                <span>{cat.label}</span>
                <span className="sc-glance-name-sep" aria-hidden>·</span>
                <span>{cat.fullLabel}</span>
                <span className="sc-glance-name-arrow" aria-hidden>→</span>
              </h3>
              {focusLine ? <p className="sc-glance-focus">{focusLine}</p> : null}
            </div>
          </div>
        </div>
        <GlanceInsightsWrap
          strengths={cat.glanceStrengthItems}
          weaknesses={cat.glanceWeaknessItems}
          previewLimit={2}
        />
      </div>
    </article>
  );
}

function CategoryCard({ cat, onClick, onViewDetails, onViewBenchmark, expanded, updatedLabel, tourTarget }: { cat: CategoryData; onClick: () => void; onViewDetails?: () => void; onViewBenchmark?: () => void; expanded?: boolean; updatedLabel: string; tourTarget?: string }) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const score = Math.max(0, Math.min(100, cat.score));

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
          <TrackInsightPanel
            tone="strong"
            title="Primary strengths"
            items={cat.glanceStrengthItems}
            empty="No strengths flagged yet — add profile, answers, benchmark, or sources."
          />
          <TrackInsightPanel
            tone="weak"
            title="Needs improvement"
            items={cat.glanceWeaknessItems}
            empty="No gaps flagged — keep profile, benchmark, and intelligence current."
          />
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

type DetailFieldTone = "missing" | "concern" | "watch" | "ok";

type DetailFieldRow = {
  id: string;
  label: string;
  value: string | null;
  tone: DetailFieldTone;
  note?: string;
};

function detailFieldTone(score: number, answered: boolean): DetailFieldTone {
  if (!answered) return "missing";
  if (score < 58) return "concern";
  if (score < 72) return "watch";
  return "ok";
}

function buildDetailFieldRows(category: ScorecardCategory, answers: DetailAnswers): DetailFieldRow[] {
  const section = DETAIL_SECTIONS.find(s => s.id === category);
  if (!section) return [];

  const toneRank: Record<DetailFieldTone, number> = { missing: 0, concern: 1, watch: 2, ok: 3 };

  return section.questions
    .map(q => {
      const val = answers[q.id]?.trim() || null;
      const score = val ? (DETAIL_ANSWER_SCORES[q.id]?.[val] ?? 58) : 30;
      const tone = detailFieldTone(score, Boolean(val));
      const label = DETAIL_QUESTION_LABEL[q.id] ?? q.prompt.replace(/\?$/, "");
      const contributor = makeContributor(q.id, label, "detail", val ?? "Not answered", score, 1);
      const note = !val
        ? "Not answered — add this in View details to sharpen your score."
        : DETAIL_ANSWER_IMPACT[q.id]?.[val]
          ?? humanizeFounderFocus(contributor)
          ?? undefined;

      return { id: q.id, label, value: val, tone, note: note ?? undefined };
    })
    .sort((a, b) => toneRank[a.tone] - toneRank[b.tone] || a.label.localeCompare(b.label));
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

const METRIC_FRIENDLY: Record<string, string> = {
  "ARR": "revenue",
  "ARR growth (YoY)": "revenue growth",
  "Net revenue retention": "net retention",
  "Logo retention": "customer retention",
  "Gross margin": "gross margin",
  "Monthly net burn": "burn",
  "Cash on hand": "cash",
  "FTE headcount": "team size",
  "Paying customers": "paying customers",
};

function friendlyMetricLabel(label: string): string {
  return METRIC_FRIENDLY[label] ?? label.toLowerCase();
}

function insightTopicKey(label: string): string {
  const base = label.split(":")[0]?.trim() ?? label;
  return friendlyMetricLabel(base).toLowerCase();
}

function trackFocusName(category: ScorecardCategory): string {
  if (category === "dev") return "Product & engineering";
  if (category === "mkt") return "Go-to-market";
  return "Ops & finance";
}

/** Plain-language guard for glance/advisor prose — see .cursor/skills/fuel-founder-copy */
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
    case "dev_challenge":
      return `Your top product bet right now: ${val.toLowerCase()}.`;
    case "dev_team_shape":
      if (val.includes("Solo") || val.includes("founder")) {
        return "You're still founder-built — line up engineering capacity before the next growth push.";
      }
      if (val === "Outsourced") return "Engineering is outsourced — tighten ownership before scale.";
      return null;
    case "dev_ship_cadence":
      if (val === "Ad hoc" || val === "Monthly") {
        return "Shipping cadence is slow — faster releases usually unlock the next growth step.";
      }
      return null;
    case "mkt_sales_motion":
      if (val === "Founder-led" || val === "Not yet") {
        return "Sales is still founder-led — document what works before you hire reps.";
      }
      return null;
    case "mkt_funnel_gap":
      return `The funnel breaks at ${val.toLowerCase()} — fix that stage before spending more at the top of the funnel.`;
    case "mkt_marketing_owner":
      if (val === "Founder-led" || val === "No one yet") {
        return "Marketing isn't owned yet — put someone clearly in charge so demand generation doesn't stall.";
      }
      return null;
    case "rev_crm":
      if (val === "None yet" || val === "Spreadsheets") {
        return "Pipeline still lives in spreadsheets — a real CRM will sharpen your forecast and planning.";
      }
      return null;
    case "rev_forecast":
      if (val !== "High confidence") {
        return "Revenue forecast confidence is shaky — tighten pipeline hygiene first.";
      }
      return null;
    default:
      return null;
  }
}

function pickFounderFocusLine(contributors: ScoreContributor[]): string | null {
  const missing = contributors.filter(isMissingContributor);
  if (missing.length >= 2) {
    return `Log ${missing[0].label.toLowerCase()} and ${missing[1].label.toLowerCase()} so Fuel can score this track properly.`;
  }

  const detailSignals = contributors
    .filter(c => c.source === "detail" && !isMissingContributor(c))
    .sort((a, b) => a.score - b.score);
  for (const c of detailSignals) {
    const line = humanizeFounderFocus(c);
    if (line) return line;
  }

  const benchGap = contributors
    .filter(c => c.source === "benchmark" && !isMissingContributor(c) && c.score < 58)
    .sort((a, b) => a.score - b.score)[0];
  if (benchGap) {
    return `Next lever: ${friendlyMetricLabel(benchGap.label)} — you're behind similar companies on this input.`;
  }

  if (missing.length === 1) {
    return `Add ${missing[0].label.toLowerCase()} to unlock a sharper read on this track.`;
  }

  return null;
}

function tierRank(tier: PositionTier): number {
  return ({ top: 5, upper: 4, mid: 3, lower: 2, bottom: 1 } as const)[tier] ?? 0;
}

function buildGlanceStrengthLine(
  metricWeights: CategoryData["metricWeights"],
  contributors: ScoreContributor[],
): string {
  const strengths = metricWeights
    .filter(m => (m.tier === "top" || m.tier === "upper") && m.display !== "—" && m.display !== "Not logged")
    .sort((a, b) => tierRank(b.tier) - tierRank(a.tier));
  const best = strengths[0];
  if (best) {
    const name = friendlyMetricLabel(best.label);
    const peerLine = best.tier === "top"
      ? "top of your cohort"
      : "ahead of most peers at your stage";
    return founderPlainCopy(`${name.charAt(0).toUpperCase() + name.slice(1)} is ${peerLine}${best.display !== "—" ? ` (${best.display})` : ""}.`);
  }

  const contributor = contributors
    .filter(c => !isMissingContributor(c) && c.score >= 68)
    .sort((a, b) => b.score - a.score)[0];
  if (contributor) {
    const name = friendlyMetricLabel(contributor.label);
    return founderPlainCopy(`${name.charAt(0).toUpperCase() + name.slice(1)} is holding up well — keep investing here.`);
  }

  return "Log benchmark inputs to surface where you're ahead of peers.";
}

function buildGlanceNeedsWorkLine(
  metricWeights: CategoryData["metricWeights"],
  contributors: ScoreContributor[],
): string {
  const weak = metricWeights
    .filter(m => (m.tier === "bottom" || m.tier === "lower") && m.display !== "—" && m.display !== "Not logged")
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier))[0];
  if (weak) {
    const name = friendlyMetricLabel(weak.label);
    return founderPlainCopy(`${name.charAt(0).toUpperCase() + name.slice(1)} is below cohort${weak.display !== "—" ? ` (${weak.display})` : ""} — closing this gap moves your score fastest.`);
  }

  const softGap = contributors
    .filter(c => !isMissingContributor(c) && c.score < 62)
    .sort((a, b) => a.score - b.score)[0];
  if (softGap) {
    const name = friendlyMetricLabel(softGap.label);
    return founderPlainCopy(`${name.charAt(0).toUpperCase() + name.slice(1)} could use attention — peers are doing better here.`);
  }

  return "No major gaps flagged — keep benchmarks current each quarter.";
}

function stripInsightSourceSuffix(detail: string): string {
  return detail.replace(/\s·\s(Benchmark|Profile|Your answers|Intelligence)$/, "").trim();
}

function filterImportantBenchmarks(metrics: EvaluatedMetric[]): EvaluatedMetric[] {
  return metrics.filter(m => m.value == null || m.tier === "bottom" || m.tier === "lower");
}

function truncateAdvisorLine(text: string, max = 120): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, "");
  return `${cut}…`;
}

function lowercaseLead(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function insightDetail(detail: string, source: keyof typeof TRACK_INSIGHT_SOURCE): string {
  return founderPlainCopy(`${detail} · ${TRACK_INSIGHT_SOURCE[source]}`);
}

function classifyUserIntel(item: ScorecardIntelligenceItem): "strength" | "weakness" | "neutral" {
  const blob = `${item.title} ${item.text} ${item.highlight ?? ""}`;
  if (INTEL_WEAK_HINTS.test(blob)) return "weakness";
  if (INTEL_STRONG_HINTS.test(blob)) return "strength";
  return "neutral";
}

function intelBenchMetricKey(id: string): MetricKey | null {
  if (!id.startsWith("intel-bench-")) return null;
  const key = id.slice("intel-bench-".length) as MetricKey;
  return key in COHORT_BY_KEY ? key : null;
}

function buildTrackInsightLists(
  category: ScorecardCategory,
  metricWeights: CategoryData["metricWeights"],
  contributors: ScoreContributor[],
  catIntel: ScorecardIntelligenceItem[],
  ctx: CategoryBuildContext,
  metricMap: Record<MetricKey, EvaluatedMetric>,
): { strengths: TrackInsightItem[]; weaknesses: TrackInsightItem[] } {
  const strengths: TrackInsightItem[] = [];
  const weaknesses: TrackInsightItem[] = [];
  const seen = new Set<string>();
  const seenTopics = new Set<string>();

  const addStrength = (id: string, label: string, detail: string, source: keyof typeof TRACK_INSIGHT_SOURCE, sortKey: number) => {
    const topic = insightTopicKey(label);
    if (seen.has(id) || seenTopics.has(topic)) return;
    seen.add(id);
    seenTopics.add(topic);
    strengths.push({ id, label: founderPlainCopy(label), detail: insightDetail(detail, source), sortKey });
  };

  const addWeakness = (id: string, label: string, detail: string, source: keyof typeof TRACK_INSIGHT_SOURCE, sortKey: number) => {
    const topic = insightTopicKey(label);
    if (seen.has(id) || seenTopics.has(topic)) return;
    seen.add(id);
    seenTopics.add(topic);
    weaknesses.push({ id, label: founderPlainCopy(label), detail: insightDetail(detail, source), sortKey });
  };

  metricWeights
    .filter(m => (m.tier === "top" || m.tier === "upper") && m.display !== "—" && m.display !== "Not logged")
    .forEach(m => {
      addStrength(
        `bench-${m.key}`,
        friendlyMetricLabel(m.label),
        m.positionLabel,
        "benchmark",
        m.tier === "top" ? 100 : 85,
      );
    });

  metricWeights
    .filter(m => (m.tier === "bottom" || m.tier === "lower") && m.display !== "—" && m.display !== "Not logged")
    .forEach(m => {
      addWeakness(
        `bench-${m.key}`,
        friendlyMetricLabel(m.label),
        m.positionLabel,
        "benchmark",
        m.tier === "bottom" ? 10 : 25,
      );
    });

  const profile = contributors.find(c => c.source === "profile");
  if (profile) {
    const profileInputs = buildProfileInputs(category, ctx);
    if (!isMissingContributor(profile) && profile.score >= 55) {
      addStrength(
        "profile",
        "Company profile",
        profileInputs.slice(0, 2).join(" · ") || profile.display,
        "profile",
        profile.score,
      );
    } else if (isMissingContributor(profile) || profile.score < 50) {
      addWeakness(
        "profile",
        "Company profile",
        isMissingContributor(profile) ? "Add sector, team size, and context" : "Profile is still thin",
        "profile",
        isMissingContributor(profile) ? 15 : 30,
      );
    }
  }

  contributors
    .filter(c => c.source === "detail")
    .forEach(c => {
      const label = friendlyMetricLabel(c.label);
      if (isMissingContributor(c)) {
        addWeakness(`detail-${c.id}`, label, "Not answered yet", "detail", 20);
        return;
      }
      if (c.score >= 72) {
        addStrength(`detail-${c.id}`, label, c.display, "detail", c.score);
      } else if (c.score < 58) {
        addWeakness(`detail-${c.id}`, label, c.display, "detail", c.score);
      }
    });

  catIntel.forEach(item => {
    const benchKey = intelBenchMetricKey(item.id);
    if (benchKey) {
      const m = metricMap[benchKey];
      if (!m) return;
      const topic = insightTopicKey(friendlyMetricLabel(m.label));
      if (seenTopics.has(topic)) return;
      if (m.value != null && (m.tier === "top" || m.tier === "upper")) {
        addStrength(
          item.id,
          friendlyMetricLabel(m.label),
          item.highlight ?? m.positionLabel,
          "intelligence",
          m.tier === "top" ? 90 : 75,
        );
      } else if (m?.value != null && (m.tier === "bottom" || m.tier === "lower")) {
        addWeakness(
          item.id,
          friendlyMetricLabel(m.label),
          item.highlight ?? m.positionLabel,
          "intelligence",
          m.tier === "bottom" ? 12 : 28,
        );
      }
      return;
    }

    const sentiment = classifyUserIntel(item);
    const label = item.title?.trim() || item.text?.trim() || "Intelligence signal";
    const detail = (item.highlight ?? item.text ?? "").trim() || "Context captured from sources";
    if (sentiment === "strength") {
      addStrength(item.id, label, detail.length > 72 ? `${detail.slice(0, 72)}…` : detail, "intelligence", 65);
    } else if (sentiment === "weakness") {
      addWeakness(item.id, label, detail.length > 72 ? `${detail.slice(0, 72)}…` : detail, "intelligence", 35);
    } else {
      addStrength(item.id, label, detail.length > 72 ? `${detail.slice(0, 72)}…` : detail, "intelligence", 55);
    }
  });

  strengths.sort((a, b) => b.sortKey - a.sortKey);
  weaknesses.sort((a, b) => a.sortKey - b.sortKey);

  return {
    strengths,
    weaknesses,
  };
}

function TrackInsightPanel({
  tone,
  title,
  items,
  empty,
  compact = false,
}: {
  tone: "strong" | "weak";
  title: string;
  items: TrackInsightItem[];
  empty: string;
  compact?: boolean;
}) {
  return (
    <div className={`sc-glance-insight-block${compact ? " is-compact" : ""}`}>
      <span className={`sc-glance-insight-label sc-cat-tone-${tone}`}>{title}</span>
      {items.length > 0 ? (
        <ul className="sc-cat-sw-list">
          {items.map(item => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              <em>{item.detail}</em>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sc-cat-sw-empty">{empty}</p>
      )}
    </div>
  );
}

function buildCategoryFocusNarrative(
  category: ScorecardCategory,
  score: number,
  contributors: ScoreContributor[],
  _catIntel: ScorecardIntelligenceItem[],
): string {
  const trackName = trackFocusName(category);

  let opener: string;
  if (score >= 80) {
    opener = `Strong ${trackName} (${score}/100) — you're in good shape vs peers.`;
  } else if (score >= 65) {
    opener = `Solid ${trackName} (${score}/100) with a few levers left to pull.`;
  } else if (score >= 50) {
    opener = `${trackName} is at ${score}/100 — fixable gaps if you focus now.`;
  } else {
    opener = `${trackName} needs attention (${score}/100) — peers are pulling ahead.`;
  }

  const focus = pickFounderFocusLine(contributors);
  return founderPlainCopy(focus ? `${opener} ${focus}` : opener);
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
  const insightLists = buildTrackInsightLists(base.id, base.metricWeights, contributors, catIntel, ctx, metricMap);

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
    glanceStrength: buildGlanceStrengthLine(base.metricWeights, contributors),
    glanceNeedsWork: buildGlanceNeedsWorkLine(base.metricWeights, contributors),
    glanceStrengthItems: insightLists.strengths,
    glanceWeaknessItems: insightLists.weaknesses,
    intelDisplayCount: countCategoryIntelDisplay(base.id, ctx.intelligenceItems, metricMap),
  };
}

function buildAdvisorSummary(
  companyName: string,
  categories: CategoryData[],
  runway: number | null,
  ctx: CategoryBuildContext,
  includeTrackNotes = true,
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
    if (cat.intelligenceCount) parts.push(`${cat.intelligenceCount} intelligence`);
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
    statusLine = "Tracking with your cohort across product, go-to-market, and finance.";
  }

  const intelLine = totalIntel > 0
    ? `${totalIntel} intelligence signal${totalIntel > 1 ? "s" : ""} from profile, benchmark, and sources.`
    : "Add sources or complete benchmark to generate intelligence.";

  const initiativeLine = totalInitiatives > 0
    ? `${totalInitiatives} open initiative${totalInitiatives > 1 ? "s" : ""} suggested across tracks.`
    : "";

  const trackLine = includeTrackNotes && trackNotes.length ? ` ${trackNotes.join(" · ")}.` : "";

  return `${companyName}${sector} — ${profileLine}. ${statusLine} ${intelLine}${initiativeLine ? ` ${initiativeLine}` : ""}${trackLine} Use the tracks below to drill in.`;
}

function buildAdvisorGenericSummary(
  companyName: string,
  categories: CategoryData[],
  runway: number | null,
  ctx: CategoryBuildContext,
): React.ReactNode {
  const contextPct = computeOverallContextPct(ctx.benchmark, ctx.detailAnswers, ctx.benchmarkContext);
  const urgentCount = categories.filter(c => categoryUrgency(c, runway) === "urgent").length;
  const watchCount = categories.filter(c => categoryUrgency(c, runway) === "watch").length;
  const totalIntel = ctx.intelligenceItems.length;
  const totalInitiatives = categories.reduce((n, c) => n + c.openInitiatives.length, 0);
  const sector = ctx.profileMeta?.sector ? ` (${ctx.profileMeta.sector.split("·")[0]?.trim()})` : "";

  const profileLine = contextPct >= 80
    ? `Profile, benchmark, and detail forms are ${contextPct}% complete.`
    : `Profile and benchmark context is ${contextPct}% complete — use recommended actions to sharpen summaries.`;

  const intelLine = totalIntel > 0
    ? `${totalIntel} intelligence signal${totalIntel > 1 ? "s" : ""} from profile, benchmark, and sources.`
    : "Add sources or complete benchmark to generate intelligence.";

  const initiativeLine = totalInitiatives > 0
    ? `${totalInitiatives} open initiative${totalInitiatives > 1 ? "s" : ""} suggested across tracks.`
    : "";

  let statusLine = "";
  if (urgentCount > 0) {
    statusLine = watchCount > 0
      ? `${watchCount} additional area${watchCount > 1 ? "s" : ""} to watch.`
      : "Open a track below to act first.";
  } else if (watchCount > 0) {
    statusLine = `Mostly on pace — ${watchCount} area${watchCount > 1 ? "s" : ""} to watch.`;
  } else {
    statusLine = "Tracking with your cohort across product, go-to-market, and finance.";
  }

  const tail = [profileLine, intelLine, initiativeLine, statusLine].filter(Boolean).join(" ");

  if (urgentCount > 0) {
    return (
      <>
        {companyName}{sector} has{" "}
        <strong>{urgentCount} urgent focus area{urgentCount > 1 ? "s" : ""}</strong>{" "}
        versus your cohort. {tail}
      </>
    );
  }

  return `${companyName}${sector} — ${tail} Use the tracks below to drill in.`;
}

function countDetailAnswers(answers: DetailAnswers): number {
  return DETAIL_SECTIONS.flatMap(s => s.questions).filter(q => answers[q.id]?.trim()).length;
}

function mergeDetailAnswers(stored: DetailAnswers, onboarding?: OnboardingFlowAnswers | null): DetailAnswers {
  if (!onboarding) return stored;
  return { ...mapOnboardingToDetailAnswers(onboarding), ...stored };
}

function getCurrentQuarterLabel(): string {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
}

function loadStoredQuarter(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function saveStoredQuarter(key: string, label = getCurrentQuarterLabel()) {
  try { window.localStorage.setItem(key, label); } catch { /* ignore */ }
}

function isQuarterStale(stored: string | null): boolean {
  return !!stored && stored !== getCurrentQuarterLabel();
}

type AdvisorRecAction = {
  title: string;
  sub: string;
  cta: string;
  done: boolean;
};

function buildAdvisorRecommendedActions(
  buildContext: CategoryBuildContext,
  mergedDetailAnswers: DetailAnswers,
  documentSlots: ScorecardDocumentSlot[] | undefined,
  benchmarkSaved: boolean,
  companyName: string,
): AdvisorRecAction[] {
  const benchFilled = METRIC_COHORTS.filter(c => parseMetricValue(buildContext.benchmark[c.key] ?? "")).length;
  const benchTotal = METRIC_COHORTS.length;
  const benchMissing = benchFilled === 0;
  const benchPartial = benchFilled > 0 && benchFilled < benchTotal;
  const benchComplete = benchFilled === benchTotal || benchmarkSaved;

  const benchQuarterKey = `fuel-benchmark-q-${companyName}`;
  const detailsQuarterKey = `fuel-details-q-${companyName}`;
  const savedBenchQuarter = loadStoredQuarter(benchQuarterKey);
  const savedDetailsQuarter = loadStoredQuarter(detailsQuarterKey);
  const benchQuarterStale = benchComplete && isQuarterStale(savedBenchQuarter);
  const detailsQuarterStale = isQuarterStale(savedDetailsQuarter);

  const detailAnswered = countDetailAnswers(mergedDetailAnswers);
  const detailComplete = detailAnswered >= DETAIL_TOTAL_Q;
  const detailRemaining = DETAIL_TOTAL_Q - detailAnswered;
  const onboardingSeeded = countDetailAnswers(mapOnboardingToDetailAnswers(
    buildContext.onboardingAnswers ?? {},
  ));
  const drawerAdded = Math.max(0, detailAnswered - onboardingSeeded);

  const docCount = documentSlots?.filter(s => s.current).length ?? 0;
  const userIntelCount = buildContext.intelligenceItems.filter(i => !i.id.startsWith("intel-bench-")).length;
  const hasUserSources = docCount > 0 || userIntelCount > 0;

  const sourcesNeedAction = !hasUserSources;
  const detailsNeedAction = !detailComplete || detailsQuarterStale;

  let benchmarkAction: AdvisorRecAction;
  if (benchMissing) {
    benchmarkAction = {
      title: "Complete Benchmark",
      sub: "Add cohort metrics to unlock comparisons.",
      cta: "Edit Benchmark",
      done: false,
    };
  } else if (benchPartial) {
    benchmarkAction = {
      title: "Complete Benchmark",
      sub: `${benchFilled} of ${benchTotal} metrics entered.`,
      cta: "Edit Benchmark",
      done: false,
    };
  } else if (benchQuarterStale) {
    benchmarkAction = {
      title: "Add New Quarter Benchmark",
      sub: `${getCurrentQuarterLabel()} numbers — refresh your cohort snapshot.`,
      cta: "Add Benchmark",
      done: false,
    };
  } else if (benchComplete && !sourcesNeedAction && !detailsNeedAction) {
    benchmarkAction = {
      title: "Update Benchmark",
      sub: "Refresh numbers if anything shifted this quarter.",
      cta: "Update Benchmark",
      done: true,
    };
  } else {
    benchmarkAction = {
      title: "Review Benchmark",
      sub: `${benchFilled} of ${benchTotal} cohort metrics on file.`,
      cta: "Review Benchmark",
      done: true,
    };
  }

  let sourcesAction: AdvisorRecAction;
  if (hasUserSources) {
    const sourceBits = [
      docCount > 0 ? `${docCount} in data room` : null,
      userIntelCount > 0 ? `${userIntelCount} intelligence signal${userIntelCount === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join(" · ");
    sourcesAction = {
      title: "Review Intelligence Sources",
      sub: sourceBits ? `${sourceBits} — add meetings, decks, or news.` : "Keep sources current for fresh intelligence.",
      cta: "Review Sources",
      done: true,
    };
  } else {
    sourcesAction = {
      title: "Add Intelligence Sources",
      sub: "Meetings, decks, news — fuel intelligence, initiatives & playbooks.",
      cta: "+ Add Sources",
      done: false,
    };
  }

  let detailsAction: AdvisorRecAction;
  if (detailsQuarterStale && detailComplete) {
    detailsAction = {
      title: "Update Company Details",
      sub: `New quarter — refresh product, go-to-market, and finance context.`,
      cta: "Update Details",
      done: false,
    };
  } else if (detailComplete) {
    detailsAction = {
      title: "Review Company Details",
      sub: "All 21 answered — keep details current each quarter.",
      cta: "Review Details",
      done: true,
    };
  } else if (onboardingSeeded > 0 && drawerAdded === 0) {
    detailsAction = {
      title: "Complete Missing Details",
      sub: `${onboardingSeeded} from onboarding · ${detailRemaining} more across tracks.`,
      cta: "+ Add Details",
      done: false,
    };
  } else if (detailAnswered >= Math.ceil(DETAIL_TOTAL_Q / 2)) {
    detailsAction = {
      title: "Complete Missing Details",
      sub: `${detailAnswered} of ${DETAIL_TOTAL_Q} · ${detailRemaining} left to sharpen tracks.`,
      cta: "+ Add Details",
      done: false,
    };
  } else {
    detailsAction = {
      title: "Complete Missing Details",
      sub: onboardingSeeded > 0
        ? `${onboardingSeeded} from onboarding · ${detailRemaining} remaining.`
        : `${detailAnswered} of ${DETAIL_TOTAL_Q} details added.`,
      cta: "+ Add Details",
      done: false,
    };
  }

  return [benchmarkAction, sourcesAction, detailsAction];
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

function trackSignalTag(cat: CategoryData, runway: number | null): {
  suffix: string;
  suffixColour: string;
  dotColour: string;
  urgent: boolean;
  borderColour?: string;
} {
  const urgency = categoryUrgency(cat, runway);
  if (urgency === "ok") {
    return {
      suffix: "Stable",
      suffixColour: COLOUR_STRONG,
      dotColour: COLOUR_STRONG,
      urgent: false,
      borderColour: "rgba(0, 180, 138, 0.22)",
    };
  }
  if (urgency === "urgent") {
    const n = Math.max(1, cat.openInitiatives.length || cat.intelligenceCount || 1);
    return {
      suffix: `${n} new risk${n > 1 ? "s" : ""}`,
      suffixColour: COLOUR_WEAK,
      dotColour: COLOUR_WEAK,
      urgent: true,
    };
  }
  return {
    suffix: "Watch",
    suffixColour: COLOUR_AROUND,
    dotColour: COLOUR_AROUND,
    urgent: false,
  };
}

// ─── UI: Advisor panel (sc-adv split layout + existing scorecard content) ───
function OverviewAdvisorPanel({
  categories,
  runway,
  companyName,
  buildContext,
  benchmarkSaved = false,
  onOpenIntelligence,
  onEditBenchmark,
  onAddSources,
  onViewDetails,
  documentSlots,
}: {
  categories: CategoryData[];
  runway: number | null;
  companyName: string;
  buildContext: CategoryBuildContext;
  benchmarkSaved?: boolean;
  onOpenIntelligence?: () => void;
  onEditBenchmark?: () => void;
  onAddSources?: () => void;
  onViewDetails?: () => void;
  documentSlots?: ScorecardDocumentSlot[];
}) {
  const actions = buildAdvisorRecommendedActions(
    buildContext,
    buildContext.detailAnswers,
    documentSlots,
    benchmarkSaved,
    companyName,
  );
  const actionHandlers = [onEditBenchmark, onAddSources, onViewDetails];

  return (
    <div className="sc-adv-featured sc-adv-featured-split">
      <div className="sc-adv-featured-brief-col">
        <div className="sc-adv">
          <div className="sc-adv-head">
            <span className="sc-adv-label">✦ Fuel AI · Advisor</span>
            <span className="sc-adv-company">{companyName}</span>
          </div>
          <div className="sc-adv-rec-title">Summary</div>
          <p className="sc-adv-summary">
            {buildAdvisorGenericSummary(companyName, categories, runway, buildContext)}
          </p>
          <div className="sc-adv-tags-label">Recent signals</div>
          <div className="sc-adv-tags">
            {categories.map(cat => {
              const tag = trackSignalTag(cat, runway);
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`sc-adv-tag${tag.urgent ? " is-urgent" : ""}`}
                  style={tag.borderColour ? { borderColor: tag.borderColour } : undefined}
                  onClick={() => onOpenIntelligence?.()}
                >
                  <span className="sc-adv-tag-dot" style={{ background: tag.dotColour }} />
                  {cat.label}
                  <i style={{ color: tag.suffixColour }}>{tag.suffix}</i>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="sc-adv-featured-rec-col">
        <div className="sc-adv-rec-title">Recommended Actions</div>
        <ol className="sc-adv-rec-list">
          {actions.map((action, i) => (
            <li key={action.title} className="sc-adv-rec-item">
              <span className={`sc-adv-rec-num${action.done ? " is-done" : ""}`}>{i + 1}</span>
              <div className="sc-adv-rec-body">
                <strong className="sc-adv-rec-name">{action.title}</strong>
                <p className="sc-adv-rec-sub">{action.sub}</p>
              </div>
              <button type="button" className="sc-adv-rec-cta" onClick={actionHandlers[i]}>
                {action.cta} <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── UI: Premium metric card (in drilldown) ───────────────────────────────────
// Uses the shared BenchmarkCohortTrack + BenchmarkPercentileScale from FuelOnboardingChat
// for visual consistency with the onboarding benchmark bars.
function MetricCard({ metric, catColour, compactBar = false }: { metric: EvaluatedMetric; catColour: string; compactBar?: boolean }) {
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

      {vs && metric.value != null ? <div className="scorecard-drill-mcard-vs">{vs}</div> : null}

      {field ? (
        <div className="scorecard-drill-mcard-bars">
          <BenchmarkCohortTrack compact={compactBar} field={field} marker={marker} value={metric.value} />
          <BenchmarkPercentileScale compact={compactBar} field={field} value={metric.value} />
        </div>
      ) : null}
    </div>
  );
}

function DetailDashboardWidget({
  title,
  meta,
  span = 6,
  children,
  footer,
  headerAction,
}: {
  title: string;
  meta?: string;
  span?: 6 | 8 | 12;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className={`sc-detail-widget sc-detail-widget--span-${span}`}>
      <div className="sc-detail-widget-head">
        <div className="sc-detail-widget-head-main">
          <strong className="sc-detail-widget-title">{title}</strong>
          {meta ? <span className="sc-detail-widget-meta">{meta}</span> : null}
        </div>
        {headerAction ? <div className="sc-detail-widget-head-action">{headerAction}</div> : null}
      </div>
      <div className="sc-detail-widget-body">{children}</div>
      {footer ? <div className="sc-detail-widget-foot">{footer}</div> : null}
    </section>
  );
}

function initiativeMatchesWeakness(
  init: CategoryInitiative,
  weaknesses: TrackInsightItem[],
): TrackInsightItem | null {
  for (const item of weaknesses) {
    const labelWords = item.label.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const blob = `${init.title} ${init.description}`.toLowerCase();
    if (labelWords.some(w => blob.includes(w))) return item;
  }
  return null;
}

function formatInitiativeReason(gap: TrackInsightItem): string {
  const detail = stripInsightSourceSuffix(gap.detail);
  if (detail) return `${gap.label} — ${founderPlainCopy(detail)}`;
  return gap.label;
}

function CategoryDetailInsightsPanel({
  strengths,
}: {
  strengths: TrackInsightItem[];
}) {
  return (
    <div className="sc-detail-insights-action">
      {strengths.length > 0 ? (
        <div className="sc-detail-strengths-strip">
          <span className="sc-detail-insights-section-label">What&apos;s working</span>
          <div className="sc-detail-strength-chips">
            {strengths.map(item => (
              <span
                key={item.id}
                className="sc-detail-strength-chip"
                title={stripInsightSourceSuffix(item.detail)}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="sc-cat-sw-empty sc-detail-insights-empty">No strengths flagged yet.</p>
      )}
    </div>
  );
}

function BenchmarkCompactRow({ metric, gapOnly = false }: { metric: EvaluatedMetric; gapOnly?: boolean }) {
  const field = WIZARD_FIELD_BY_KEY[metric.key];
  const marker = metric.value != null && field ? valueToMarkerPercent(metric.value, field) : null;
  const tierStyle = metric.value != null ? getBenchmarkTierStyle(metric.tier) : null;

  return (
    <div className={`sc-detail-bench-row${metric.value == null ? " is-empty" : ""}${gapOnly ? " is-gap" : ""}`}>
      <div className="sc-detail-bench-row-head">
        <span className="sc-detail-bench-label">{metric.label}</span>
        <div className="sc-detail-bench-meta">
          <strong className="sc-detail-bench-val" style={{ color: metric.value != null ? metric.colour : undefined }}>
            {metric.value != null ? metric.display : "Not logged"}
          </strong>
          {tierStyle ? (
            <span
              className="sc-detail-bench-pill"
              style={{
                color: tierStyle.marker,
                background: tierStyle.badgeBg,
                borderColor: tierStyle.badgeBorder,
              }}
            >
              {metric.positionLabel}
            </span>
          ) : null}
        </div>
      </div>
      {!gapOnly && field ? (
        <BenchmarkCohortTrack compact field={field} marker={marker} value={metric.value} />
      ) : null}
    </div>
  );
}

function CategoryDetailContextPanel({
  cat,
  allBenchmarkMetrics,
  formRows,
  onEditDetails,
  onEditBenchmark,
}: {
  cat: CategoryData;
  allBenchmarkMetrics: EvaluatedMetric[];
  formRows: DetailFieldRow[];
  onEditDetails?: () => void;
  onEditBenchmark?: () => void;
}) {
  const detailSection = DETAIL_SECTIONS.find(s => s.id === cat.id);
  const importantBenchmarks = useMemo(
    () => filterImportantBenchmarks(allBenchmarkMetrics),
    [allBenchmarkMetrics],
  );
  const loggedCount = allBenchmarkMetrics.filter(m => m.value != null).length;

  return (
    <section className="sc-detail-context-panel">
      <div className="sc-detail-context-head">
        <div>
          <h3 className="sc-detail-context-title">Your inputs</h3>
          <p className="sc-detail-context-sub">
            {detailSection?.title ?? cat.label} answers and benchmark gaps — edit either side to sharpen this track.
          </p>
        </div>
      </div>

      <div className="sc-detail-context-split">
        <div className="sc-detail-context-form-block">
          <div className="sc-detail-context-col-head">
            <div className="sc-detail-context-col-head-main">
              <span className="sc-detail-context-col-label">{detailSection?.title ?? cat.label} details</span>
              <span className="sc-detail-context-col-meta">{cat.detailAnsweredCount} of {cat.detailQuestionCount} answered</span>
            </div>
            {onEditDetails ? (
              <button type="button" className="sc-cat-header-btn sc-detail-context-col-btn" onClick={onEditDetails}>
                Edit answers <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
          <CategoryDetailFormWidget rows={formRows} />
        </div>

        <div className="sc-detail-context-bench-block">
          <div className="sc-detail-context-col-head">
            <div className="sc-detail-context-col-head-main">
              <span className="sc-detail-context-col-label">Benchmark gaps</span>
              <span className="sc-detail-context-col-meta">
                {importantBenchmarks.length} to review · {loggedCount} of {allBenchmarkMetrics.length} logged
              </span>
            </div>
            {onEditBenchmark ? (
              <button type="button" className="sc-cat-header-btn sc-detail-context-col-btn" onClick={onEditBenchmark}>
                Edit benchmark <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
          {importantBenchmarks.length > 0 ? (
            <div className="sc-detail-bench-gap-list">
              {importantBenchmarks.map(metric => (
                <BenchmarkCompactRow key={metric.key} metric={metric} gapOnly />
              ))}
            </div>
          ) : (
            <p className="sc-detail-bench-ok">
              No benchmark gaps flagged — logged metrics are on pace vs cohort.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryDetailFormWidget({
  rows,
}: {
  rows: DetailFieldRow[];
}) {
  const flaggedRows = rows.filter(r => r.tone !== "ok");
  const okRows = rows.filter(r => r.tone === "ok");

  return (
    <div className="sc-detail-form-widget">
      {flaggedRows.length > 0 ? (
        <div className="sc-detail-form-flagged">
          <span className="sc-detail-form-section-label">Needs review</span>
          <div className="sc-detail-form-flagged-list">
            {flaggedRows.map(row => (
              <div key={row.id} className={`sc-detail-form-row is-${row.tone}`}>
                <div className="sc-detail-form-row-head">
                  <span className="sc-detail-form-label">{row.label}</span>
                  {row.tone === "missing" ? (
                    <span className="sc-detail-form-flag">Missing</span>
                  ) : row.tone === "concern" ? (
                    <span className="sc-detail-form-flag">Needs attention</span>
                  ) : row.tone === "watch" ? (
                    <span className="sc-detail-form-flag is-watch">Watch</span>
                  ) : null}
                </div>
                <div className="sc-detail-form-value">{row.value ?? "Not answered"}</div>
                {row.note ? (
                  <p className="sc-detail-form-note">{founderPlainCopy(row.note)}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {okRows.length > 0 ? (
        <div className="sc-detail-form-ok-block">
          <span className="sc-detail-form-section-label">On track</span>
          <div className="sc-detail-form-ok-grid">
            {okRows.map(row => (
              <div key={row.id} className="sc-detail-form-ok-row">
                <span className="sc-detail-form-ok-label">{row.label}</span>
                <span className="sc-detail-form-ok-value">{row.value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategoryDetailInitiativesWidget({
  suggested,
  weaknesses = [],
  onOpenInitiatives,
}: {
  suggested: CategoryInitiative[];
  weaknesses?: TrackInsightItem[];
  onOpenInitiatives?: () => void;
}) {
  const active: CategoryInitiative[] = [];
  const hasActive = active.length > 0;
  const [view, setView] = useState<"active" | "suggested">("active");
  const showView = hasActive ? view : "suggested";

  const sortedSuggested = useMemo(() => {
    const scored = suggested.map(init => ({
      init,
      gap: initiativeMatchesWeakness(init, weaknesses),
    }));
    return scored.sort((a, b) => Number(Boolean(b.gap)) - Number(Boolean(a.gap)));
  }, [suggested, weaknesses]);

  const suggestedList = sortedSuggested.length > 0 ? (
    <div className="scorecard-drill-init-list sc-detail-init-list">
      {sortedSuggested.map(({ init, gap }) => (
        <div
          key={init.id}
          className="scorecard-drill-init-row"
          style={{ "--init-col": init.colour } as React.CSSProperties}
        >
          <div className="scorecard-drill-init-body">
            <div className="scorecard-drill-init-title">{init.title}</div>
            <div className="scorecard-drill-init-desc">
              {gap ? (
                <>
                  <span className="sc-detail-init-reason-label">Why: </span>
                  {truncateAdvisorLine(formatInitiativeReason(gap), 140)}
                </>
              ) : (
                init.description
              )}
            </div>
          </div>
          <div className="scorecard-drill-init-action">
            <button type="button" className="scorecard-drill-init-btn" onClick={() => onOpenInitiatives?.()}>
              Add <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="sc-detail-init-empty">No suggested initiatives for this track yet.</p>
  );

  return (
    <div className="sc-detail-init-stack">
      {hasActive ? (
        <div className="sc-detail-init-seg" role="tablist" aria-label="Initiative view">
          <button
            type="button"
            role="tab"
            aria-selected={showView === "active"}
            className={`sc-detail-init-seg-btn${showView === "active" ? " is-active" : ""}`}
            onClick={() => setView("active")}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={showView === "suggested"}
            className={`sc-detail-init-seg-btn${showView === "suggested" ? " is-active" : ""}${suggested.length > 0 ? " has-recs" : ""}`}
            onClick={() => setView("suggested")}
          >
            Suggested{suggested.length > 0 ? ` · ${suggested.length}` : ""}
          </button>
        </div>
      ) : null}

      {showView === "active" && hasActive ? (
        <div className="sc-detail-init-group">
          <span className="sc-detail-init-group-label">Active</span>
          {active.map(init => (
            <div key={init.id} className="scorecard-drill-init-row" style={{ "--init-col": init.colour } as React.CSSProperties}>
              <div className="scorecard-drill-init-body">
                <div className="scorecard-drill-init-title">{init.title}</div>
                <div className="scorecard-drill-init-desc">{init.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sc-detail-init-group">
          {!hasActive ? <span className="sc-detail-init-group-label">Suggested</span> : null}
          {suggestedList}
        </div>
      )}
    </div>
  );
}

// ─── UI: Category detail (extended overview glance) ───────────────────────────
const DEV_TEAM = [
  { role: "Engineering", count: 58, lead: "Matt L." },
  { role: "AI / ML",     count: 12, lead: "Priya R." },
  { role: "UX / Design", count: 9,  lead: "Jess K." },
  { role: "QA",          count: 11, lead: "Dana T." },
  { role: "DevOps",      count: 10, lead: "Jake S." },
];

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
  cat,
  metricMap,
  detailAnswers,
  runway,
  intelligenceItems,
  onBack,
  onUpdateDetails,
  onEditBenchmark,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
}: {
  cat: CategoryData;
  metricMap: Record<MetricKey, EvaluatedMetric>;
  detailAnswers: DetailAnswers;
  runway: number | null;
  intelligenceItems: ScorecardIntelligenceItem[];
  onBack: () => void;
  onUpdateDetails?: () => void;
  onEditBenchmark?: () => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: (id: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [intelExpanded, setIntelExpanded] = useState(false);
  const score = Math.max(0, Math.min(100, cat.score));
  const answersCta = buildGlanceAnswersCta(cat.label, cat.detailAnsweredCount, cat.detailQuestionCount);
  const formRows = useMemo(
    () => buildDetailFieldRows(cat.id, detailAnswers),
    [cat.id, detailAnswers],
  );
  const catIntel = useMemo(
    () => intelligenceForCategory(cat.id, intelligenceItems),
    [cat.id, intelligenceItems],
  );
  const visibleIntel = intelExpanded ? catIntel : catIntel.slice(0, 5);
  const hiddenIntelCount = Math.max(0, catIntel.length - 5);
  const playbooks = cat.suggestedPlaybooks.length ? cat.suggestedPlaybooks : CATEGORY_PLAYBOOKS[cat.id];
  const allBenchmarkMetrics = useMemo(
    () => ALL_BENCHMARK_METRIC_KEYS.map(k => metricMap[k]).filter(Boolean),
    [metricMap],
  );

  return (
    <div className="sc-category-detail sc-detail-dashboard">
      <button type="button" className="scorecard-drill-back-btn sc-category-detail-back" onClick={onBack}>
        ← Overview
      </button>

      <article className="sc-glance-row sc-glance-row-detail sc-detail-hero-widget">
        <CategoryGlanceHeaderBar
          cat={cat}
          answersCta={answersCta}
          onUpdateDetails={onUpdateDetails}
          onOpenIntelligence={onOpenIntelligence}
          onOpenInitiatives={onOpenInitiatives}
          onRunPlaybook={onRunPlaybook}
        />
        <div className="sc-detail-hero">
          <div className="sc-detail-hero-main">
            <GlanceScoreRing
              cat={cat}
              score={score}
              isOpen={popoverOpen}
              onRequestOpen={() => setPopoverOpen(true)}
              onRequestClose={() => setPopoverOpen(false)}
              className="sc-glance-ring-wrap--lead"
            />
            <div className="sc-glance-copy">
              <h3 className="sc-glance-name sc-glance-name-static">
                <span>{cat.label}</span>
                <span className="sc-glance-name-sep" aria-hidden>·</span>
                <span>{cat.fullLabel}</span>
              </h3>
              {cat.glanceFocus ? <p className="sc-glance-focus">{cat.glanceFocus}</p> : null}
              {cat.glanceSummary ? <p className="sc-detail-context">{cat.glanceSummary}</p> : null}
            </div>
          </div>
          <DevTeamCluster team={DEV_TEAM} catColour={cat.colour} />
        </div>
      </article>

      <div className="sc-detail-widgets-grid">
        <DetailDashboardWidget title="Track insights" span={6}>
          <CategoryDetailInsightsPanel
            strengths={cat.glanceStrengthItems}
          />
        </DetailDashboardWidget>

        <DetailDashboardWidget
          title="Initiatives"
          meta={cat.openInitiatives.length ? `${cat.openInitiatives.length} suggested` : undefined}
          span={6}
          headerAction={onOpenInitiatives ? (
            <button type="button" className="sc-detail-widget-head-link" onClick={() => onOpenInitiatives()}>
              Open initiatives <span aria-hidden="true">→</span>
            </button>
          ) : null}
        >
          <CategoryDetailInitiativesWidget
            suggested={cat.openInitiatives}
            weaknesses={cat.glanceWeaknessItems}
            onOpenInitiatives={onOpenInitiatives}
          />
        </DetailDashboardWidget>

        <DetailDashboardWidget
          title="Intelligence"
          meta={catIntel.length ? `${catIntel.length} signal${catIntel.length === 1 ? "" : "s"}` : undefined}
          span={6}
          footer={(
            <button type="button" className="sc-category-detail-tab-link" onClick={() => onOpenIntelligence?.()}>
              Open in Intelligence <span aria-hidden="true">→</span>
            </button>
          )}
        >
          {catIntel.length > 0 ? (
            <>
              <div className="scorecard-drill-intel">
                {visibleIntel.map(item => (
                  <div key={item.id} className="scorecard-drill-intel-row">
                    <span className="scorecard-drill-intel-cat">{item.type}</span>
                    <span className="scorecard-drill-intel-text">
                      {item.title || item.text}
                      {item.highlight ? ` — ${item.highlight}` : ""}
                    </span>
                  </div>
                ))}
              </div>
              {!intelExpanded && hiddenIntelCount > 0 ? (
                <button
                  type="button"
                  className="sc-glance-insight-more-btn sc-category-detail-more"
                  onClick={() => setIntelExpanded(true)}
                >
                  View more ({hiddenIntelCount}) <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </>
          ) : (
            <p className="sc-cat-sw-empty">No intelligence tagged to this track yet.</p>
          )}
        </DetailDashboardWidget>

        <DetailDashboardWidget
          title="Playbooks"
          meta={playbooks.length ? `${playbooks.length} available` : undefined}
          span={6}
        >
          {playbooks.length > 0 ? (
            <div className="sc-detail-playbook-stack">
              {playbooks.map(pb => (
                <button
                  key={pb.id}
                  type="button"
                  className="scorecard-drill-pb-card"
                  onClick={() => onRunPlaybook?.(pb.id)}
                  style={{ "--cat-col": cat.colour } as React.CSSProperties}
                >
                  <div className="scorecard-drill-pb-track-strip" style={{ background: cat.colour }} />
                  <div className="scorecard-drill-pb-content">
                    <div className="scorecard-drill-pb-title">{pb.title}</div>
                    <div className="scorecard-drill-pb-desc">{pb.description}</div>
                    <div className="scorecard-drill-pb-cta" style={{ color: cat.colour }}>Run playbook →</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="sc-cat-sw-empty">No playbooks suggested for this track yet.</p>
          )}
        </DetailDashboardWidget>
      </div>

      <CategoryDetailContextPanel
        cat={cat}
        allBenchmarkMetrics={allBenchmarkMetrics}
        formRows={formRows}
        onEditDetails={onUpdateDetails}
        onEditBenchmark={onEditBenchmark}
      />
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
function BenchmarkEditDrawer({
  open, onClose, benchmark, companyName, onSave,
}: {
  open: boolean;
  onClose: () => void;
  benchmark: OnboardingBenchmarkInput;
  companyName: string;
  onSave: (next: OnboardingBenchmarkInput) => void;
}) {
  const [draft, setDraft] = useState<OnboardingBenchmarkInput>(benchmark);
  const lastOpen = useRef(false);

  useEffect(() => {
    if (open && !lastOpen.current) {
      setDraft({ ...benchmark });
    }
    lastOpen.current = open;
  }, [open, benchmark]);

  if (!open) return null;

  const update = (key: keyof OnboardingBenchmarkInput, val: string) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  };
  const save = () => { onSave(draft); onClose(); };

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

          <OnboardingBenchmarkFieldList
            values={draft}
            onChange={update}
            inputClassName="bench-field-input"
          />

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
  onboardingAnswers = null,
  documentSlots,
}: ScorecardV2Props) {
  const [activeView, setActiveView] = useState<ScorecardView>("overview");
  const [editBenchmarkOpen, setEditBenchmarkOpen] = useState(false);
  const [benchmarkSaved, setBenchmarkSaved] = useState(false);
  const [benchmarkValues, setBenchmarkValues] = useState<OnboardingBenchmarkInput>(benchmark);
  const [addSourcesOpen, setAddSourcesOpen] = useState(false);
  const cName = companyName ?? "This company";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(0);
  const [openGlancePopover, setOpenGlancePopover] = useState<ScorecardCategory | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const [detailAnswers, setDetailAnswers] = useState<DetailAnswers>(() => loadDetailAnswers(cName));

  const mergedDetailAnswers = useMemo(
    () => mergeDetailAnswers(detailAnswers, onboardingAnswers),
    [detailAnswers, onboardingAnswers],
  );

  useEffect(() => {
    setBenchmarkValues(benchmark);
  }, [benchmark]);

  useEffect(() => {
    const filled = METRIC_COHORTS.filter(c => parseMetricValue(benchmarkValues[c.key] ?? "")).length;
    if (filled > 0 && !loadStoredQuarter(`fuel-benchmark-q-${cName}`)) {
      saveStoredQuarter(`fuel-benchmark-q-${cName}`);
    }
  }, [cName, benchmarkValues]);

  useEffect(() => {
    if (onboardingAnswers && !loadStoredQuarter(`fuel-details-q-${cName}`)) {
      saveStoredQuarter(`fuel-details-q-${cName}`);
    }
  }, [cName, onboardingAnswers]);

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

  const metrics   = useMemo(() => evaluateMetrics(benchmarkValues), [benchmarkValues]);
  const metricMap = useMemo(() => getMetricMap(metrics), [metrics]);
  const runway    = useMemo(() => estimateRunwayMonths(metricMap.cashOnHand, metricMap.monthlyBurn), [metricMap]);

  const categoryIds: ScorecardCategory[] = ["dev", "mkt", "rev"];
  const buildContext = useMemo<CategoryBuildContext>(() => ({
    detailAnswers: mergedDetailAnswers,
    intelligenceItems,
    profileMeta,
    benchmarkContext,
    journeyStage,
    benchmark: benchmarkValues,
    onboardingAnswers,
  }), [mergedDetailAnswers, intelligenceItems, profileMeta, benchmarkContext, journeyStage, benchmarkValues, onboardingAnswers]);

  const categoryData = useMemo(
    () => categoryIds.map(id => enrichCategoryData(buildCategoryData(id, metricMap, runway), metricMap, runway, buildContext)),
    [metricMap, runway, buildContext],
  );

  const isCategoryDetail = activeView === "dev" || activeView === "mkt" || activeView === "rev";
  const activeCategory = isCategoryDetail ? categoryData.find(c => c.id === activeView) : undefined;

  if (activeView === "benchmark") {
    return (
      <BenchmarkDrilldownView
        benchmark={benchmarkValues}
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
      {!isCategoryDetail ? (
      <div
        className={`sc-adv-featured-wrap sc-overview-advisor-wrap${advisorOpen ? "" : " is-collapsed"}`}
        data-tour-target="ai-advisor"
      >
        <div className="sc-adv-featured-border" aria-hidden="true" />
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
          <span className="sc-adv-featured-chev" aria-hidden="true">▾</span>
        </div>
        {advisorOpen ? (
          <>
            {lastPlaybook ? (
              <div className="sc-playbook-card sc-adv-featured">
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
              <div className="sc-adv-featured sc-adv-featured-split">
                <div className="sc-adv-featured-brief-col">
                  <BriefAdvisorCard brief={brief} onViewDetails={() => openDetailsDrawer()} />
                </div>
              </div>
            ) : (
              <OverviewAdvisorPanel
                categories={categoryData}
                runway={runway}
                companyName={cName}
                buildContext={buildContext}
                benchmarkSaved={benchmarkSaved}
                onOpenIntelligence={onOpenIntelligence}
                onEditBenchmark={() => setEditBenchmarkOpen(true)}
                onAddSources={() => setAddSourcesOpen(true)}
                onViewDetails={() => openDetailsDrawer()}
                documentSlots={documentSlots}
              />
            )}
          </>
        ) : null}
      </div>
      ) : null}

      {isCategoryDetail && activeCategory ? (
        <CategoryDetailView
          cat={activeCategory}
          metricMap={metricMap}
          detailAnswers={mergedDetailAnswers}
          runway={runway}
          intelligenceItems={intelligenceItems}
          onBack={() => setActiveView("overview")}
          onUpdateDetails={() => openDetailsDrawer(activeCategory.id)}
          onEditBenchmark={() => setEditBenchmarkOpen(true)}
          onOpenIntelligence={onOpenIntelligence}
          onOpenInitiatives={onOpenInitiatives}
          onRunPlaybook={onRunPlaybook}
        />
      ) : (
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
      )}

      {drawerOpen && (
        <DetailsDrawer
          companyName={cName}
          answers={mergedDetailAnswers}
          initialStep={drawerStep}
          onSelect={selectDetail}
          onSaveClose={() => {
            setDrawerOpen(false);
            saveStoredQuarter(`fuel-details-q-${cName}`);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <BenchmarkEditDrawer
        open={editBenchmarkOpen}
        onClose={() => setEditBenchmarkOpen(false)}
        benchmark={benchmarkValues}
        companyName={cName}
        onSave={next => {
          setBenchmarkValues(next);
          setBenchmarkSaved(true);
          saveStoredQuarter(`fuel-benchmark-q-${cName}`);
        }}
      />

      <AddSourcesDrawer
        open={addSourcesOpen}
        onClose={() => setAddSourcesOpen(false)}
        onGenerate={() => {}}
      />
    </div>
  );
}
