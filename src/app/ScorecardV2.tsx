import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fuel } from "./fuelTokens";
import { statusLineCss, signalUrgencyToStatus } from "./statusSystem";
import {
  clearReloadLandingActive,
  isBrowserReload,
  isReloadLandingActive,
  landingDisplayPercent,
  landingDisplayScore,
} from "./workspaceSession";
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
import {
  DETAIL_SECTIONS,
  DETAIL_QUESTION_LABEL,
  DETAIL_QUESTION_BY_ID,
  TRACK_DETAIL_SECTIONS,
  countApplicableQuestions,
  countDetailAnswers as countTrackDetailAnswers,
  countSectionAnswers,
  computeProfileAnswerProgress,
  getVisibleQuestions,
  hasProfileBasicsStarted,
  isMultiSelectSelected,
  parseMultiSelectAnswer,
  toggleMultiSelectAnswer,
  type DetailAnswers,
  type DetailSectionId,
} from "./trackQuestions.ts";
import {
  resolveYorkOfferForPillar,
  YORK_COMMON_OFFER,
  type YorkServiceOffer,
} from "./yorkIeUpsell";
import { isYorkOfferDismissed } from "./yorkDismiss";
import { YorkPartnerNudge } from "./YorkPartnerNudge";
import { AccountIntegrationsList } from "./account/AccountIntegrationsList.tsx";
import { useSaveExitConfirm } from "./SaveExitConfirmDialog";
import { useDialogA11y } from "./a11y/useDialogA11y";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim";
import { handleTabListKeyDown } from "./a11y/tabListKeyboard";
import { FuelIcon, type FuelIconName } from "./icons";
import { loadDetailAnswers } from "./profileDetailsStorage";
import {
  BENCHMARK_REWARD_CREDITS,
  computeCreditBalance,
  PROFILE_CREDIT_BREAKDOWN,
  PROFILE_EARNABLE_CREDITS,
  PROFILE_MODULE_EARNABLE_TOTAL,
  PROFILE_MODULE_REWARDS,
  PROFILE_STARTING_CREDITS,
  PROFILE_TOTAL_CREDITS,
  remainingBenchmarkRewardCredits,
  remainingIntelligenceRewardCredits,
  remainingProfileModuleCredits,
  tryMarkBenchmarkEarned,
  tryMarkIntelligenceSourcesEarned,
  type EarnedProfileCredits,
  type ProfileCreditReward,
  type ProfileModuleId,
} from "./profileCredits";
import {
  buildProgressReminderMessage,
  buildWorkspaceProgressSummary,
  getModuleWorkspaceStatus,
  MIN_BENCHMARK_METRICS_FOR_UNLOCK,
  workspaceStatusLabel,
  type ReportReadiness,
  type WorkspaceModuleStatus,
} from "./profileProgress";
import "./PatriotPayJourney.css";
import "./overview-ref.css";

// Single source of truth for field definitions (P-values, band positions, units)
const WIZARD_FIELD_BY_KEY = Object.fromEntries(
  BENCHMARK_WIZARD_FIELDS.map(f => [f.key, f]),
) as Record<string, BenchmarkWizardField>;

// ─── Colours ──────────────────────────────────────────────────────────────────
/** Shared status ink — good / watch / bad (design-system tokens). */
const STATUS_GOOD = fuel.statusGood;
const STATUS_WATCH = fuel.statusWatch;
const STATUS_BAD = fuel.statusBad;

function toneColour(kind: "strong" | "above" | "around" | "below" | "weak"): string {
  if (kind === "strong" || kind === "above") return STATUS_GOOD;
  if (kind === "around" || kind === "below") return STATUS_WATCH;
  return STATUS_BAD;
}

const COLOUR_STRONG = () => toneColour("strong");
const COLOUR_ABOVE = () => toneColour("above");
const COLOUR_AROUND = () => toneColour("around");
const COLOUR_BELOW = () => toneColour("below");
const COLOUR_WEAK = () => toneColour("weak");

// ─── Types ────────────────────────────────────────────────────────────────────
type ScorecardView = "overview" | "dev" | "mkt" | "rev" | "benchmark";
type ScorecardCategory = "dev" | "mkt" | "rev";
type MetricKey = keyof OnboardingBenchmarkInput;
type PositionTier = "top" | "upper" | "mid" | "lower" | "bottom";

type MetricCohort = {
  key: MetricKey;
  label: string;
  p25: number; p50: number; p75: number; p90: number;
  unit: "usd" | "percent" | "count" | "months" | "multiple";
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

/** Efficiency metrics also available via benchmark form. */
export type ScorecardEfficiencyExtras = {
  cacPayback?: string;
  burnMultiple?: string;
  period?: string;
};

export type ScorecardActiveInitiative = {
  id: string;
  title: string;
  description: string;
  pillar?: ScorecardCategory;
  status?: string;
  progress?: number;
  /** Target / due label from the initiative (e.g. 2026-q3) — used to order the brief roadmap. */
  due?: string;
  owner?: string;
};

export type ScorecardV2Props = {
  benchmark: OnboardingBenchmarkInput;
  onBenchmarkChange?: (benchmark: OnboardingBenchmarkInput) => void;
  /** Fires after benchmark metrics are saved from the edit drawer. */
  onBenchmarkSaved?: () => void;
  /** Fires when enough benchmark metrics are entered for early unlock. */
  onBenchmarkEarlyUnlock?: () => void;
  cohortLabel?: string;
  companyName?: string;
  journeyStage?: string;
  documentSlots?: ScorecardDocumentSlot[];
  intelligenceItems?: ScorecardIntelligenceItem[];
  profileMeta?: ScorecardProfileMeta;
  benchmarkContext?: ScorecardBenchmarkContext;
  efficiencyExtras?: ScorecardEfficiencyExtras;
  activeInitiatives?: ScorecardActiveInitiative[];
  onAddInitiative?: (initiative: ScorecardActiveInitiative) => void;
  onViewInitiative?: (id: string) => void;
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
  workspaceIntroOpen?: boolean;
  onDismissWorkspaceIntro?: () => void;
  onWorkspaceActivity?: () => void;
  privateWorkspaceLabel?: string;
  /** Post-onboarding Overview generation — skeletons + checklist until ready. */
  overviewBuildPhase?: OverviewBuildPhase | null;
  /** Tracks that finished a build (single-module saves or full onboarding build). */
  overviewBuiltPhases?: ReadonlySet<OverviewBuildPhase>;
  onStartOptionalTour?: () => void;
  onDismissOverviewReady?: () => void;
  /** Controlled tip next to Recommended Actions after Overview finishes building. */
  recActionsTipOpen?: boolean;
  onDismissRecActionsTip?: () => void;
  /** When false, analytics stay locked behind the profile-completion gate. */
  isProfileComplete?: boolean;
  userFirstName?: string;
  onStartProfileCompletion?: (section?: ProfileModuleId | "bench") => void;
  /** Opens the unified complete-profile drawer (same module as Continue Profile). */
  onOpenProfileDetails?: (section?: ProfileModuleId | ScorecardCategory) => void;
  /** Bumps when the unified profile drawer saves — re-hydrates detailAnswers. */
  profileDetailsSyncKey?: number;
  /** While true, skip re-hydrating detailAnswers so drawer edits are not overwritten. */
  profileDrawerOpen?: boolean;
  /** Earned intelligence-unlock credits (50 starting + up to 200 earned). */
  earnedProfileCredits?: EarnedProfileCredits;
  /** Storage key for persisting earned credits (company id). */
  companyKey?: string;
  /** Called when benchmark or intelligence-source credits are earned from Overview actions. */
  onProfileCreditsChange?: (earned: EarnedProfileCredits) => void;
  /** Fires with motivational copy when a milestone credit reward is newly earned. */
  onProfileCreditReward?: (reward: ProfileCreditReward) => void;
  /** After a reload landing, user edited profile/benchmark — regenerate summary + tracks. */
  onLandingContentRestore?: () => void;
  /** True while the post-reload clean landing state is active. */
  reloadLandingActive?: boolean;
  /** Bumped when the workspace tour finishes — resets Overview to module-first landing. */
  tourCompleteSignal?: number;
  /** Parent requests opening the benchmark edit drawer (e.g. from profile preview). */
  benchmarkEditRequestKey?: number;
  /** Fires when the benchmark edit drawer closes. */
  onBenchmarkEditClosed?: () => void;
};

export type OverviewBuildPhase =
  | "summary"
  | "dev"
  | "mkt"
  | "rev"
  | "suggestions"
  | "ready";

const OVERVIEW_BUILD_STEPS: {
  id: Exclude<OverviewBuildPhase, "ready">;
  label: string;
}[] = [
  { id: "summary", label: "Writing your company summary" },
  { id: "dev", label: "Building R&D" },
  { id: "mkt", label: "Building GTM" },
  { id: "rev", label: "Building G&A" },
  { id: "suggestions", label: "Preparing initiatives and playbooks" },
];

const OVERVIEW_BUILD_PHASE_ORDER: OverviewBuildPhase[] = [
  "summary",
  "dev",
  "mkt",
  "rev",
  "suggestions",
  "ready",
];

function overviewBuildPhaseIndex(phase: OverviewBuildPhase): number {
  return OVERVIEW_BUILD_PHASE_ORDER.indexOf(phase);
}

/** Phases populated after a full post-onboarding build completes. */
export const OVERVIEW_ALL_BUILT_PHASES: OverviewBuildPhase[] = [
  "summary",
  "dev",
  "mkt",
  "rev",
  "suggestions",
];

/** Initiative + playbook suggestion counts stay hidden until build finishes. */
function overviewSuggestionsReady(
  phase: OverviewBuildPhase | null | undefined,
  builtPhases?: ReadonlySet<OverviewBuildPhase>,
): boolean {
  if (builtPhases?.has("suggestions")) return true;
  return phase == null || phase === "ready";
}

/** Advisor summary unlocks after the quick summary step. */
function overviewAdvisorReady(
  phase: OverviewBuildPhase | null | undefined,
  builtPhases?: ReadonlySet<OverviewBuildPhase>,
): boolean {
  if (builtPhases?.has("summary")) return true;
  return phase == null || overviewBuildPhaseIndex(phase) > overviewBuildPhaseIndex("summary");
}

/** A track row is ready once its category step has completed or was built earlier. */
function overviewTrackReady(
  categoryId: ScorecardCategory,
  phase: OverviewBuildPhase | null | undefined,
  builtPhases?: ReadonlySet<OverviewBuildPhase>,
): boolean {
  if (builtPhases?.has(categoryId)) return true;
  if (phase === "ready" || phase === "suggestions") return true;
  if (phase == null) return false;
  if (phase === "summary") return false;
  return overviewBuildPhaseIndex(phase) > overviewBuildPhaseIndex(categoryId);
}

/** True while the named track pillar is actively building (not summary/advisor). */
function overviewTrackBuilding(
  categoryId: ScorecardCategory,
  phase: OverviewBuildPhase | null | undefined,
): boolean {
  return phase === categoryId;
}

/**
 * Workspace progress feed — show live category scores unless that pillar is actively
 * animating in the sequential build. Avoids leaving R&D on skeleton when only GTM/G&A
 * phases were persisted from per-module saves.
 */
function workspaceProgressTrackReady(
  categoryId: ScorecardCategory,
  phase: OverviewBuildPhase | null | undefined,
  builtPhases: ReadonlySet<OverviewBuildPhase> | undefined,
  hasWorkspaceContent: boolean,
  displayScoresZero = false,
): boolean {
  if (displayScoresZero) return overviewTrackBuilding(categoryId, phase);
  if (overviewTrackBuilding(categoryId, phase)) return false;
  if (overviewTrackReady(categoryId, phase, builtPhases)) return true;
  if (hasWorkspaceContent && phase !== "summary") return true;
  return false;
}

/** Maps a saved profile module to the overview build phase that should run. */
export function profileModuleToBuildPhase(module: ProfileModuleId): OverviewBuildPhase {
  switch (module) {
    case "company":
      return "summary";
    case "dev":
      return "dev";
    case "gtm":
      return "mkt";
    case "rev":
      return "rev";
    default:
      return "summary";
  }
}

export function overviewBuildPhaseLabel(phase: OverviewBuildPhase): string {
  return OVERVIEW_BUILD_STEPS.find(step => step.id === phase)?.label ?? "Generating report";
}

// ─── Cohort data ──────────────────────────────────────────────────────────────
const METRIC_COHORTS: MetricCohort[] = [
  { key: "arr",             label: "ARR",                   p25: 150_000,   p50: 500_000,   p75: 1_200_000, p90: 2_500_000, unit: "usd",     intelCategory: "Growth"    },
  { key: "arrGrowth",       label: "ARR growth (YoY)",      p25: 120,       p50: 200,       p75: 350,       p90: 600,       unit: "percent", intelCategory: "Growth"    },
  { key: "nrr",             label: "Net revenue retention", p25: 95,        p50: 108,       p75: 125,       p90: 145,       unit: "percent", intelCategory: "Retention" },
  { key: "logoRetention",   label: "Logo retention",        p25: 80,        p50: 88,        p75: 93,        p90: 97,        unit: "percent", intelCategory: "Retention" },
  { key: "grossMargin",     label: "Gross margin",          p25: 55,        p50: 72,        p75: 82,        p90: 88,        unit: "percent", intelCategory: "Efficiency"},
  { key: "cacPayback",      label: "CAC payback",           p25: 10,        p50: 16,        p75: 26,        p90: 42,        unit: "months",  lowerIsBetter: true, intelCategory: "Efficiency" },
  { key: "burnMultiple",    label: "Burn multiple",         p25: 1.3,       p50: 2.1,       p75: 3.4,       p90: 5.5,       unit: "multiple", lowerIsBetter: true, intelCategory: "Efficiency" },
  { key: "ruleOf40",        label: "Rule of 40",            p25: 15,        p50: 28,        p75: 40,        p90: 55,        unit: "percent", intelCategory: "Efficiency" },
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
  rev: ["cashOnHand", "monthlyBurn", "cacPayback", "burnMultiple", "ruleOf40"],
};

const CATEGORY_META: Record<ScorecardCategory, {
  label: string; fullLabel: string; description: string; icon: string; colour: string; colourDim: string; colourBorder: string; drillTitle: string; urgentLabel: string;
}> = {
  dev: { label: "R&D", fullLabel: "Research and Development", description: "Headcount, gross margin, R&D velocity and technical execution.", icon: "⚙", colour: "var(--fuel-accent)", colourDim: "rgba(18, 184, 134, 0.1)",   colourBorder: "rgba(18, 184, 134, 0.28)",   drillTitle: "Engineering & product",  urgentLabel: "R&D velocity"  },
  mkt: { label: "GTM", fullLabel: "Go to Market",          description: "Revenue, growth, retention, customers and GTM execution.",       icon: "↗", colour: "var(--fuel-accent)", colourDim: "rgba(18, 184, 134, 0.1)", colourBorder: "rgba(18, 184, 134, 0.28)", drillTitle: "GTM & acquisition",      urgentLabel: "GTM motion"    },
  rev: { label: "G&A", fullLabel: "General and Administrative",  description: "Cash, burn, runway and operational performance.",                icon: "◎", colour: "#F5A623", colourDim: "rgba(245,166,35,0.1)", colourBorder: "rgba(245,166,35,0.28)", drillTitle: "Revenue operations",     urgentLabel: "Cash runway"   },
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
  const cleaned = raw.replace(/[$,%x,\s]/gi, "").replace(/mo(nths?)?$/i, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}


const POSITION_LABELS: Record<PositionTier, string> = {
  top: "Top quartile", upper: "Above median", mid: "Around median", lower: "Below median", bottom: "Bottom of cohort",
};
function tierColour(tier: PositionTier): string {
  return {
    top: toneColour("strong"),
    upper: toneColour("above"),
    mid: toneColour("around"),
    lower: toneColour("below"),
    bottom: toneColour("weak"),
  }[tier];
}

function worstTier(tiers: PositionTier[]): PositionTier {
  const order: PositionTier[] = ["bottom", "lower", "mid", "upper", "top"];
  return tiers.reduce((w, t) => order.indexOf(t) < order.indexOf(w) ? t : w, "top" as PositionTier);
}

function tierToScore(tier: PositionTier): number {
  return { top: 90, upper: 72, mid: 52, lower: 32, bottom: 12 }[tier];
}

function colourFromScore(score: number): string {
  if (score >= 80) return toneColour("strong");
  if (score >= 65) return toneColour("above");
  if (score >= 50) return toneColour("around");
  if (score >= 35) return toneColour("below");
  return toneColour("weak");
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
  dev_product_stage: {
    "Idea — not yet in development": 42,
    "In active development": 58,
    "Built — not yet launched": 66,
    "Launched — early users or customers": 78,
    "Launched — scaling usage or revenue": 90,
  },
  dev_product_type: { "SaaS / web app": 78, "API or developer platform": 82, Marketplace: 70, Other: 62 },
  dev_delivery_constraint: {
    "Planning and prioritization": 50,
    "Capacity and hiring": 46,
    "Quality and reliability": 58,
    "Technical debt / Architecture": 44,
  },
  dev_primary_customer: {
    "End user and buyer are the same role": 82,
    "User and buyer are different": 74,
    "Still validating who the real buyer is": 48,
    "Building for multiple segments — no focus yet": 38,
  },
  dev_launch_timeline: {
    "Already live — no fixed date": 80,
    "Within 3 months": 72,
    "3–6 months": 66,
    "6–12 months": 58,
    "No target date yet": 42,
  },
  dev_build_model: {
    "In-house engineering team": 86,
    "Founders building internally": 68,
    "Offshore or hybrid team": 62,
    "Contract dev / agency": 48,
    "Not building yet — manual or services first": 36,
  },
  dev_engineering_size: {
    "11+ engineers": 90,
    "4–10 engineers": 78,
    "1–3 engineers": 58,
    "No engineers (founders only)": 42,
  },
  dev_ship_cadence: {
    "CI/CD with staged rollout": 92,
    "Regular releases (e.g. weekly / biweekly)": 82,
    "Ad hoc — no regular cadence": 38,
    "Not shipping yet": 30,
  },
  dev_ai_role: { "Core to the product": 86, "Important feature": 72, Exploring: 58, "Not applicable": 54 },
  dev_compliance: { "Already certified": 92, "In progress": 78, "On roadmap (e.g. SOC 2, ISO)": 62, "Not yet": 48 },
  dev_prioritization: {
    "Data/Usage Analytics": 86,
    "Customer Interviews": 78,
    "Sales/Founder Intuition": 52,
    "Ad-hoc / No formal process": 38,
  },
  dev_feature_debt_split: {
    "Mostly New Features (80/20)": 82,
    "Balanced (70/30)": 72,
    "Heavy focus on Tech Debt/Bugs (50/50 or less)": 48,
  },
  dev_eng_bottleneck: {
    "Planning and prioritization": 50,
    "Code review / quality gates": 54,
    "QA and testing": 52,
    "Deployments and incidents": 48,
    "Hiring and capacity": 46,
    "Technical debt / architecture": 44,
  },
  mkt_sales_motion: { "Product-led": 86, "Sales-led": 78, "Founder-led": 52, "Not yet": 36 },
  mkt_funnel_gap: { Awareness: 58, Conversion: 50, Retention: 44 },
  mkt_icp_clarity: {
    "Documented and shared": 92,
    "Written ICP the team uses for targeting and qualification": 90,
    "Clear in founder's head": 62,
    "We know who fits, but it's not written or enforced yet": 56,
    "Still a hypothesis": 48,
    "Early signal from customers, but not validated": 52,
    "Not defined yet": 38,
    "Selling broadly or still figuring out who fits": 34,
  },
  mkt_revenue_tracking: {
    "CRM with a defined sales process": 88,
    "CRM but informal process": 68,
    "Spreadsheet or lightweight tracking": 48,
    "No systematic pipeline yet": 30,
  },
  mkt_deal_size: { "Over $100K": 86, "$25K–$100K": 78, "$5K–$25K": 68, "Under $5K": 58, "Not sure yet": 44 },
  mkt_pricing_model: { "Flat subscription": 78, "Usage-based": 82, "Tiered / per seat": 76, Hybrid: 80, "Still figuring out": 40 },
  mkt_demand_source: { "Inbound / content": 78, "Product-led / self-serve": 82, "Outbound sales": 72, "Partners / channel": 76, "Paid acquisition": 64, "Mix of channels": 70, "Still figuring out": 40 },
  mkt_sales_team: {
    "Larger sales org (6+)": 90,
    "Small team (2–5 in sales)": 82,
    "Founder + 1 AE or SDR": 68,
    "Founder only": 52,
    "No sales hire yet": 36,
  },
  mkt_marketing_capacity: {
    "Small marketing team (2+)": 88,
    "1 marketing generalist": 76,
    "Agency or fractional support": 70,
    "No dedicated marketing — founders or sales cover it": 48,
    "Not applicable yet": 40,
  },
  mkt_cac_payback: { "Yes — tracked regularly": 88, "Rough estimate only": 58, "Not yet": 34 },
  mkt_competitive_pressure: {
    "Low — category is early or we lead": 82,
    "Moderate — several credible alternatives": 62,
    "High — crowded market, price or feature pressure": 44,
    "Not sure yet": 48,
  },
  mkt_pipeline_definitions: {
    "Yes, documented and shared — We have written criteria that the team uses.": 90,
    "Informal / Shared understanding — We have a general idea of what these terms mean, but it's not documented or strictly enforced.": 58,
    "Not defined yet — We don't use these definitions or are still figuring out our pipeline stages.": 36,
  },
  rev_runway: { "Over 18 months": 90, "12–18 months": 78, "6–12 months": 58, "Under 6 months": 34 },
  rev_finance_management: {
    "Accounting software with regular close": 90,
    "Spreadsheet + accountant or bookkeeper": 68,
    "Founder-managed / informal": 46,
    "Not set up yet": 30,
  },
  rev_capital_priority: {
    "Actively fundraising": 74,
    "Open to investor introductions": 80,
    "Focused on extending runway / reaching profitability": 72,
    "Not focused on capital right now": 68,
  },
  rev_twelve_month_goal: {
    "Scale growth with current capital": 82,
    "Extend runway / reach profitability": 76,
    "Raise next round": 70,
    "Explore strategic options (M&A, partnerships)": 68,
    "Not sure yet": 44,
  },
  rev_unit_economics: {
    "Real-time / Automated": 92,
    "Monthly / Spreadsheet-based": 68,
    "Rough manual estimates": 48,
    "Not yet": 32,
  },
  rev_forecast: {
    "Yes, monthly rolling forecast": 90,
    "Yes, static annual budget": 72,
    "No, we track historicals only": 40,
  },
  rev_operating_mode: {
    "Balanced growth and efficiency": 82,
    "Growth-first": 74,
    "Efficiency / path to profitability": 76,
  },
  rev_team_size: { "50+": 88, "16–50": 78, "6–15": 66, "1–5": 52 },
  rev_hiring_plans: {
    "Selective hires only": 78,
    "Hiring aggressively": 72,
    "Hiring freeze / defer": 58,
    "Not sure yet": 44,
  },
  rev_board_reporting: {
    "Quarterly board / investor reporting": 86,
    "Monthly updates": 82,
    "Ad hoc only": 48,
    "No investors or board yet": 40,
  },
  rev_segment_economics: {
    "Yes — tracked by segment": 88,
    "Partially — some segments only": 62,
    "Not yet — single blended view": 44,
    "Not applicable — pre-revenue": 54,
  },
  rev_raise_needs: {
    "All of the above": 82,
    "Metrics and data room": 78,
    "Investor narrative and deck": 72,
    Introductions: 70,
    "Financial model and use of funds": 74,
    "Process and timeline discipline": 68,
  },
};

const DETAIL_ANSWER_IMPACT: Record<string, Record<string, string>> = {
  dev_delivery_constraint: {
    "Quality and reliability": "Quality debt compounds — founders end up firefighting instead of selling.",
    "Capacity and hiring": "Engineering capacity caps how fast you can respond to GTM signal.",
    "Planning and prioritization": "Unclear prioritization pulls founders back into product every week.",
    "Technical debt / Architecture": "Architecture drag slows every release when GTM needs product moves.",
  },
  dev_ship_cadence: {
    "Ad hoc — no regular cadence": "Irregular shipping hides product risk until customers churn.",
    "Not shipping yet": "No shipping cadence yet — launch readiness becomes the hidden bottleneck.",
  },
  dev_build_model: {
    "Contract dev / agency": "Heavy agency reliance slows iteration when GTM needs product moves.",
    "Not building yet — manual or services first": "Manual delivery becomes the bottleneck once demand shows up.",
  },
  mkt_sales_motion: { "Founder-led": "Founder-led sales caps growth — you become the bottleneck.", "Not yet": "No motion yet — investors will ask how revenue actually happens." },
  mkt_marketing_capacity: { "No dedicated marketing — founders or sales cover it": "Founder-owned marketing steals time from product and fundraising." },
  mkt_icp_clarity: {
    "Not defined yet": "Fuzzy ICP wastes outbound and lengthens sales cycles.",
    "Selling broadly or still figuring out who fits": "Broad selling spreads founder attention across too many bets.",
  },
  mkt_funnel_gap: { Retention: "Retention gaps show up late — founders feel it in NRR conversations first.", Conversion: "Conversion leaks burn cash before you can prove GTM fit." },
  mkt_revenue_tracking: { "No systematic pipeline yet": "No pipeline system — founders manually track deals and miss follow-ups.", "Spreadsheet or lightweight tracking": "Spreadsheet RevOps breaks the moment you add a second seller." },
  rev_forecast: { "No, we track historicals only": "Historical-only finance leaves founders surprised at month-end." },
  rev_runway: { "Under 6 months": "Tight runway is the fastest path to a founder crisis." },
  rev_unit_economics: { "Not yet": "Untracked unit economics weaken every fundraising conversation." },
  rev_finance_management: { "Founder-managed / informal": "Founder-managed books steal 5–10 hrs/mo and delay close." },
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

function scoreDetailAnswer(questionId: string, val: string | null | undefined): number {
  if (!val?.trim()) return 30;
  const table = DETAIL_ANSWER_SCORES[questionId];
  if (!table) return 58;
  const question = DETAIL_QUESTION_BY_ID[questionId];
  if (question?.multi) {
    const parts = parseMultiSelectAnswer(val);
    if (!parts.length) return 30;
    return Math.min(...parts.map(part => table[part] ?? 58));
  }
  return table[val] ?? 58;
}

function buildDetailContributors(category: ScorecardCategory, answers: DetailAnswers): ScoreContributor[] {
  const section = TRACK_DETAIL_SECTIONS.find(s => s.id === category);
  const questions = section ? getVisibleQuestions(section, answers) : [];
  if (!questions.length) return [];
  const perQ = SCORE_WEIGHT_DETAIL / questions.length;

  return questions.map(q => {
    const val = answers[q.id];
    const score = scoreDetailAnswer(q.id, val);
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
    signals.push({ text: hc.value != null ? `${hc.display} FTEs · ${hc.positionLabel.toLowerCase()}` : "Engineering setup unknown", colour: hc.value != null ? hc.colour : COLOUR_AROUND() });
    signals.push({ text: gm.value != null ? `Gross margin ${gm.display}` : "Gross margin not logged", colour: gm.value != null ? gm.colour : COLOUR_AROUND() });
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
    signals.push({ text: !isPreRevenue ? `ARR ${arr.display} · ${arr.positionLabel.toLowerCase()}` : "Pre-revenue · no GTM motion", colour: !isPreRevenue ? arr.colour : COLOUR_WEAK() });
    signals.push({ text: cust.value != null ? `${cust.display} paying customers` : "No acquisition channel data", colour: cust.value != null ? cust.colour : COLOUR_WEAK() });
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
    signals.push({ text: runway != null && runway < 6 ? "Critical cash runway" : cash.value != null ? `${cash.display} cash on hand` : "Cash not logged", colour: runway != null && runway < 6 ? COLOUR_WEAK() : cash.value != null ? cash.colour : COLOUR_AROUND() });
    signals.push({ text: burn.value != null ? `Burn ${burn.display}/mo · ${burn.positionLabel.toLowerCase()}` : "Burn not logged", colour: burn.value != null ? burn.colour : COLOUR_AROUND() });
    stats.push({ label: "Cash", value: cash.display });
    stats.push({ label: "Burn", value: burn.display });
    stats.push({ label: "Runway", value: runway != null ? `${runway.toFixed(0)}m` : "—" });
  }

  return {
    id: category, label: meta.label, fullLabel: meta.fullLabel, description: meta.description, icon: meta.icon,
    colour: meta.colour, colourDim: meta.colourDim, colourBorder: meta.colourBorder,
    barWidth: avgScore, barColour: tierColour(worst),
    insight, signals, metricKeys: keys,
    score: Math.round(avgScore),
    position: tiers.length ? POSITION_LABELS[worst] : "Not logged",
    positionColour: tierColour(worst),
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
      { id: "dev-i1", title: hc.value == null ? "Complete R&D context form" : "Define engineering team structure", description: hc.value == null ? "Unlock engineering signals — 5 questions, under 2 minutes." : "Decide in-house vs contractors before next funding round.", colour: COLOUR_AROUND() },
      { id: "dev-i2", title: gm.tier === "top" || gm.tier === "upper" ? "Protect gross margin as headcount grows" : "Review COGS and delivery cost structure", description: gm.tier === "top" || gm.tier === "upper" ? "High margin is a competitive advantage. Audit hosting and support load before scaling team." : "Small COGS improvements compound into meaningful runway extension.", colour: tierColour(gm.tier) },
    ];
  }
  if (category === "mkt") {
    const arr = metricMap.arr, cust = metricMap.payingCustomers;
    return [
      { id: "mkt-i1", title: arr.value == null || arr.value < 100_000 ? "Define first revenue milestone" : "Scale repeatable acquisition channel", description: arr.value == null || arr.value < 100_000 ? "Set a specific ARR target and identify the first 3 target customers." : `ARR at ${arr.display} — lock the next milestone and the one channel that gets you there.`, colour: arr.value != null && arr.value > 100_000 ? COLOUR_AROUND() : COLOUR_WEAK() },
      { id: "mkt-i2", title: cust.value == null ? "Hire fractional CMO or demand gen lead" : "Connect CRM for acquisition attribution", description: cust.value == null ? "Free up founder bandwidth and build a repeatable acquisition motion." : "Pipeline visibility is a prerequisite for any repeatable sales motion.", colour: COLOUR_AROUND() },
    ];
  }
  const rt = runway ?? 0;
  return [
    { id: "rev-i1", title: rt < 6 ? "Raise bridge round or reduce burn within 30 days" : "Plan next capital event", description: rt < 6 ? "Contact existing investors. Identify top 2–3 non-essential costs to pause." : `${runway != null ? `~${runway.toFixed(0)} months runway` : "Runway unknown"} — begin investor conversations before runway drops below 6 months.`, colour: rt < 6 ? COLOUR_WEAK() : COLOUR_AROUND() },
    { id: "rev-i2", title: "Implement CRM before first sales hire", description: "Pipeline visibility is a prerequisite for any repeatable revenue motion.", colour: COLOUR_AROUND() },
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
  cacPayback:      [{ id: "finops-burn-efficiency",      title: "Burn Efficiency Review",      track: "FinOps"      }, { id: "marketing-repeatable-gtm",  title: "Repeatable GTM Motion",     track: "GTM"   }],
  burnMultiple:    [{ id: "finops-burn-efficiency",      title: "Burn Efficiency Review",      track: "FinOps"      }, { id: "finops-runway-burn-review", title: "Runway & Burn Review",      track: "FinOps"      }],
  ruleOf40:        [{ id: "finops-margin-review",        title: "Margin Review",               track: "FinOps"      }, { id: "finops-runway-burn-review", title: "Runway & Burn Review",      track: "FinOps"      }],
  monthlyBurn:     [{ id: "finops-runway-burn-review",   title: "Runway & Burn Review",        track: "FinOps"      }, { id: "finops-burn-efficiency",    title: "Burn Efficiency Review",    track: "FinOps"      }],
  cashOnHand:      [{ id: "finops-runway-burn-review",   title: "Runway & Burn Review",        track: "FinOps"      }, { id: "finops-board-readiness",    title: "Board Readiness Review",    track: "FinOps"      }],
  headcount:       [{ id: "dev-launch-signal-review",    title: "Launch Signal Review",        track: "R&D" }, { id: "dev-scale-readiness",       title: "Scale Readiness Check",     track: "R&D" }],
};

const METRIC_PLAYBOOK_TRACKS: Partial<Record<MetricKey, Array<MetricPlaybookOption["track"]>>> = {
  arr: ["GTM", "G&A"], arrGrowth: ["GTM"], nrr: ["G&A"], logoRetention: ["GTM", "G&A"],
  payingCustomers: ["G&A", "GTM"], grossMargin: ["FinOps"], cacPayback: ["FinOps", "GTM"],
  burnMultiple: ["FinOps"], ruleOf40: ["FinOps"], monthlyBurn: ["FinOps"], cashOnHand: ["FinOps"], headcount: ["R&D"],
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
  popoverW: number,
  popoverH: number,
): { style: React.CSSProperties; placement: "above" | "below" } {
  const gap = 10;
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(popoverW, Math.max(220, vw - margin * 2));
  const maxH = Math.min(480, vh - margin * 2);
  const measuredH = popoverH > 0 ? popoverH : Math.min(360, maxH);
  const effectiveH = Math.min(measuredH, maxH);

  const spaceBelow = vh - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const placeAbove = spaceBelow < Math.min(effectiveH, 280) && spaceAbove >= spaceBelow;

  let top = placeAbove
    ? rect.top - gap - effectiveH
    : rect.bottom + gap;
  top = Math.max(margin, Math.min(top, vh - effectiveH - margin));

  // Prefer anchoring to the score ring (left-aligned to the trigger).
  let left = rect.left;
  if (left + width > vw - margin) {
    left = rect.right - width;
  }
  left = Math.max(margin, Math.min(left, vw - margin - width));

  const triggerCenterX = rect.left + rect.width / 2;
  const arrowX = Math.min(Math.max(triggerCenterX - left, 18), width - 18);

  return {
    placement: placeAbove ? "above" : "below",
    style: {
      position: "fixed",
      top,
      left,
      right: "auto",
      bottom: "auto",
      width,
      maxHeight: maxH,
      zIndex: 1000,
      ["--sc-pop-arrow-x" as string]: `${arrowX}px`,
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
  size = 88,
  scoreLabel,
}: {
  cat: CategoryData;
  score: number;
  isOpen: boolean;
  onRequestOpen: () => void;
  onRequestClose: () => void;
  className?: string;
  /** Ring diameter in px — use ~72 on horizontal track cards (score-first). */
  size?: number;
  /** Optional formatted score text (e.g. "00" on reload landing). */
  scoreLabel?: string;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | undefined>();
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const stroke = size <= 56 ? 5 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const positionPopover = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverW = Math.min(380, window.innerWidth - 24);
    const popoverH = popoverRef.current?.offsetHeight ?? 0;
    const { style, placement: nextPlacement } = computeGlancePopoverLayout(rect, popoverW, popoverH);
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
    const frame = window.requestAnimationFrame(() => {
      positionPopover();
      window.requestAnimationFrame(positionPopover);
    });
    const onResize = () => positionPopover();
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen, positionPopover, cat.scoreContributors.length, score]);

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

  const popoverNode = isOpen ? (
    <ScoreHealthPopover
      cat={cat}
      score={score}
      popoverRef={popoverRef}
      popoverStyle={popoverStyle ?? {
        position: "fixed",
        top: 0,
        left: -9999,
        visibility: "hidden",
        pointerEvents: "none",
        width: Math.min(380, window.innerWidth - 24),
      }}
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
            <strong style={{ color: cat.barColour }}>{scoreLabel ?? score}</strong>
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

/** Track insight lists stay partially locked until every question in that track is answered. */
function areTrackInsightsLocked(
  cat: Pick<CategoryData, "detailAnsweredCount" | "detailQuestionCount">,
  isProfileComplete = true,
): boolean {
  if (!isProfileComplete) return true;
  if (cat.detailQuestionCount <= 0) return false;
  return cat.detailAnsweredCount < cat.detailQuestionCount;
}

/** Premium insight labels shown as locked placeholders per track */
const PREMIUM_INSIGHTS: Record<string, string[]> = {
  "R&D": ["Competitive benchmark", "Build vs buy analysis", "Peer R&D comparison", "Investor readiness"],
  GTM: ["ICP clarity score", "Revenue benchmark", "Market position", "Growth opportunities"],
  "G&A": ["Burn multiple benchmark", "Runway comparison", "Finance maturity", "Capital efficiency"],
};

/**
 * Glance card insight stack — strengths first, then locked premium teaser.
 * Assumption: show a fixed 2-item strength preview only — no "View more" expand
 * (extra rows cluttered the equal-height track cards).
 */
function GlanceInsightsWrap({
  strengths,
  weaknesses,
  previewLimit = 2,
  trackLabel,
  showImprovements = false,
  onViewMore,
}: {
  strengths: TrackInsightItem[];
  weaknesses: TrackInsightItem[];
  previewLimit?: number;
  trackLabel?: string;
  showImprovements?: boolean;
  onViewMore?: () => void;
}) {
  const visibleStrengths = strengths.slice(0, previewLimit);
  const visibleWeaknesses = weaknesses.slice(0, previewLimit);
  const premiumItems = ((trackLabel && PREMIUM_INSIGHTS[trackLabel]) || PREMIUM_INSIGHTS["R&D"]!).slice(0, 3);

  return (
    <div className="sc-glance-insights-wrap">
      <div className="sc-glance-strength-col">
        <TrackInsightPanel
          tone="strong"
          title="Primary Strengths"
          items={visibleStrengths}
          empty="Complete more track details to surface strengths."
          compact
        />
        {onViewMore ? (
          <button type="button" className="sc-glance-view-more" onClick={onViewMore}>
            View more →
          </button>
        ) : null}
      </div>
      <div className="sc-glance-premium-col">
        {showImprovements && visibleWeaknesses.length > 0 ? (
          <TrackInsightPanel
            tone="weak"
            title="Needs improvement"
            items={visibleWeaknesses}
            empty="Complete track details to surface improvements."
            compact
          />
        ) : (
          <>
            <div className="sc-glance-premium-head">
              <span className="sc-glance-premium-title">Needs improvement</span>
            </div>
            <ul className="sc-glance-premium-list">
              {premiumItems.map(item => (
                <li key={item} className="sc-glance-premium-item">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
                    <rect x="0.75" y="5" width="8.5" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function buildTopImprovementRows(trackLabel: string, items: TrackInsightItem[]): TrackInsightItem[] {
  const premium = (PREMIUM_INSIGHTS[trackLabel] || PREMIUM_INSIGHTS["R&D"]!) ?? [];
  const rows = items.length > 0
    ? items.slice(0, 3)
    : premium.slice(0, 3).map((label, i) => ({
        id: `premium-${i}`,
        label,
        detail: "Unlocks with profile",
      }));

  if (rows.length >= 3) return rows;

  const filled = [...rows];
  for (let i = rows.length; i < 3; i += 1) {
    filled.push({
      id: `premium-fill-${i}`,
      label: premium[i] ?? "Additional recommendation",
      detail: "Unlocks with profile",
    });
  }
  return filled;
}

function TopImprovementsPreview({
  trackLabel,
  items,
  insightsLocked,
  onCompleteProfile,
}: {
  trackLabel: string;
  items: TrackInsightItem[];
  insightsLocked: boolean;
  onCompleteProfile?: () => void;
}) {
  const rows = buildTopImprovementRows(trackLabel, items);

  return (
    <div className="sc-glance-insight-block is-compact">
      <span className="sc-glance-insight-label sc-cat-tone-weak">Needs improvement</span>
      {rows.length > 0 ? (
        <ul className="sc-cat-sw-list">
          {rows.map((item, index) => (
            <li
              key={item.id}
              className={insightsLocked && index >= 1 ? "is-locked-blur" : undefined}
              aria-hidden={insightsLocked && index >= 1 ? true : undefined}
            >
              <strong>{shortInsightChipLabel(item.label)}</strong>
              <em>{item.detail}</em>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sc-cat-sw-empty">Complete track details to surface improvements.</p>
      )}
      {insightsLocked ? (
        <button
          type="button"
          className="sc-glance-complete-profile-btn"
          onClick={e => {
            e.stopPropagation();
            onCompleteProfile?.();
          }}
        >
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
            <rect x="1" y="5.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M3 5.5V3.8a2.5 2.5 0 0 1 5 0V5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Complete profile to unlock
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
  suggestionsReady = true,
}: {
  cat: CategoryData;
  answersCta: ReturnType<typeof buildGlanceAnswersCta>;
  onUpdateDetails?: () => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: (id: string) => void;
  suggestionsReady?: boolean;
}) {
  const initiativeCount = suggestionsReady ? cat.openInitiatives.length : 0;
  const playbookCount = suggestionsReady ? cat.suggestedPlaybooks.length : 0;
  const intelCount = cat.intelDisplayCount;
  const answeredMeta = cat.detailQuestionCount > 0
    ? `${cat.detailAnsweredCount} of ${cat.detailQuestionCount} answered`
    : null;

  return (
    <div className="sc-glance-header-bar" onClick={e => e.stopPropagation()}>
      <div className="sc-glance-header-bar-start">
        <div className="sc-glance-meta-badges">
          {initiativeCount > 0 ? (
            <button type="button" className="sc-glance-meta-badge" onClick={() => onOpenInitiatives?.()}>
              {initiativeCount} initiative{initiativeCount === 1 ? "" : "s"} <span aria-hidden="true">→</span>
            </button>
          ) : suggestionsReady ? (
            <span className="sc-glance-meta-badge">0 initiatives <span aria-hidden="true">→</span></span>
          ) : null}
          <button type="button" className="sc-glance-meta-badge is-intel" onClick={() => onOpenIntelligence?.()}>
            {intelCount} Intelligence signal{intelCount === 1 ? "" : "s"} <span aria-hidden="true">→</span>
          </button>
          {playbookCount > 0 ? (
            <button type="button" className="sc-glance-meta-badge" onClick={() => onRunPlaybook?.(cat.suggestedPlaybooks[0].id)}>
              {playbookCount} playbook{playbookCount === 1 ? "" : "s"} <span aria-hidden="true">→</span>
            </button>
          ) : suggestionsReady ? (
            <span className="sc-glance-meta-badge">0 playbooks <span aria-hidden="true">→</span></span>
          ) : null}
        </div>
      </div>
      {onUpdateDetails ? (
        <div className="sc-glance-header-bar-end">
          {answeredMeta ? (
            <p className="sc-glance-header-bar-answered">{answeredMeta}</p>
          ) : answersCta.meta ? (
            <p className="sc-glance-header-bar-answered">{answersCta.meta}</p>
          ) : null}
          <button
            type="button"
            className="sc-glance-details-link"
            onClick={e => { e.stopPropagation(); onUpdateDetails(); }}
          >
            View details →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function computeProfileProgress(categories: CategoryData[]): number {
  const totalQuestions = categories.reduce((sum, cat) => sum + cat.detailQuestionCount, 0);
  const answered = categories.reduce((sum, cat) => sum + cat.detailAnsweredCount, 0);
  if (totalQuestions === 0) return 32;
  const trackPct = Math.round((answered / totalQuestions) * 68);
  return Math.min(99, 32 + trackPct);
}

// PULSE_OVERVIEW_ARCHIVED — full Pulse tab code lives in src/app/archived/ (see PULSE_TAB_RESTORE.md)
type OverviewDesignTab = "new" | "old" | "workspace";

/** Temporary design comparison — three overview layout approaches. */
function OverviewDesignTabs({
  active,
  onChange,
  activeTourTarget,
}: {
  active: OverviewDesignTab;
  onChange: (tab: OverviewDesignTab) => void;
  activeTourTarget?: string;
}) {
  const tabs: { id: OverviewDesignTab; label: string; title: string; tourTarget?: string }[] = [
    {
      id: "new",
      label: "Advisor-first",
      title: "Approach 1 — full overview with advisor, scores, and progress feed",
    },
    {
      id: "old",
      label: "Gate-first",
      title: "Approach 2 — profile completion gate before analytics unlock",
    },
    {
      id: "workspace",
      label: "Module-first",
      title: "Approach 3 — module cards, credits, and workspace progress feed",
      tourTarget: "tab-workspace",
    },
  ];

  return (
    <div className="sc-overview-design-tabs sc-overview-design-tabs--triple" role="tablist" aria-label="Overview design approaches">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          id={`tab-${tab.id}`}
          role="tab"
          className={`sc-overview-design-tab${active === tab.id ? " is-active" : ""}${tab.tourTarget && activeTourTarget === tab.tourTarget ? " tour-highlight" : ""}`}
          aria-selected={active === tab.id}
          aria-controls={`overview-design-panel-${tab.id}`}
          title={tab.title}
          data-tour-target={tab.tourTarget && activeTourTarget === tab.tourTarget ? tab.tourTarget : undefined}
          onClick={() => onChange(tab.id)}
          onKeyDown={event => handleTabListKeyDown(event, tabs.map(item => item.id), active, onChange)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ProfileCompletionBanner({
  progressPct,
  creditBalance,
  earnedProfileCredits,
  onContinue,
}: {
  progressPct: number;
  creditBalance: number;
  earnedProfileCredits?: EarnedProfileCredits;
  onContinue?: () => void;
}) {
  const profileCreditsToEarn = remainingProfileModuleCredits(earnedProfileCredits);
  const benefits = [
    "Unlock Benchmarking",
    "Improve Recommendations",
    "Increase Intelligence Accuracy",
  ];
  const ringRadius = 30;
  const ringSize = 72;
  const circumference = 2 * Math.PI * ringRadius;

  return (
    <div className="sc-profile-complete-banner" role="region" aria-label="Complete your company profile">
      <div className="sc-profile-complete-ring" aria-hidden="true">
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="var(--panel-border)" strokeWidth="5" />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke="var(--fuel-accent, var(--fuel-accent))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progressPct / 100)}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </svg>
        <span className="sc-profile-complete-ring-label">
          <strong>{progressPct}%</strong>
        </span>
      </div>
      <div className="sc-profile-complete-copy">
        <h2>Complete your company profile</h2>
        <p>
          You have <strong>{creditBalance}</strong> of {PROFILE_TOTAL_CREDITS} credits.
          Earn up to {PROFILE_EARNABLE_CREDITS} more by finishing Profile, R&amp;D, GTM, G&amp;A, and benchmarks.
        </p>
        <ul className="sc-profile-complete-benefits">
          {benefits.map(item => (
            <li key={item}>
              <span className="sc-profile-complete-check" aria-hidden="true">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="sc-profile-complete-actions">
        <button type="button" className="sc-profile-complete-cta" onClick={onContinue}>
          Continue Profile →
          {profileCreditsToEarn > 0 ? (
            <span className="sc-profile-complete-credits-pill">+{profileCreditsToEarn} credits</span>
          ) : null}
        </button>
        <span className="sc-profile-complete-time">Takes &lt;5 min</span>
      </div>
    </div>
  );
}

const PROFILE_UNLOCK_SECTIONS: {
  id: ProfileModuleId;
  title: string;
  description: string;
  footer: string;
  credits: number;
  icon: FuelIconName;
  /** Insight signals already visible (partial) */
  available: string[];
  /** Insight signals unlocked after completing this section */
  unlocks: string[];
}[] = [
  {
    id: "company",
    title: "Complete Profile",
    description: "Company details, location, headcount, funding, and founder context.",
    footer: "Company · Industry · Location · Headcount · Context",
    credits: PROFILE_MODULE_REWARDS.company,
    icon: "company",
    available: ["Company snapshot"],
    unlocks: ["Industry peer comparison", "Cohort matching", "ICP alignment"],
  },
  {
    id: "dev",
    title: "R&D",
    description: "Product stage, build model, and what's slowing delivery.",
    footer: "Stage · Type · Constraint",
    credits: PROFILE_MODULE_REWARDS.dev,
    icon: "development",
    available: ["Product stage signal"],
    unlocks: ["R&D scorecard", "Build readiness", "Technical benchmark"],
  },
  {
    id: "gtm",
    title: "GTM",
    description: "Sales motion, ICP clarity, and how pipeline is tracked.",
    footer: "Motion · ICP · Pipeline",
    credits: PROFILE_MODULE_REWARDS.gtm,
    icon: "gtm",
    available: ["GTM motion summary"],
    unlocks: ["GTM scorecard", "ICP analysis", "Pipeline health"],
  },
  {
    id: "rev",
    title: "G&A",
    description: "Runway, finance ops, and capital priorities.",
    footer: "Runway · Finance · Capital",
    credits: PROFILE_MODULE_REWARDS.rev,
    icon: "finance",
    available: ["Capital stage signal"],
    unlocks: ["Finance scorecard", "Runway analysis", "Burn benchmark"],
  },
];

type ProfileUnlockSectionId = (typeof PROFILE_UNLOCK_SECTIONS)[number]["id"];

function categoryToProfileUnlockSection(categoryId: ScorecardCategory): ProfileUnlockSectionId {
  if (categoryId === "mkt") return "gtm";
  return categoryId;
}

function moduleDetailSectionId(moduleId: ProfileModuleId): DetailSectionId {
  if (moduleId === "company") return "profile";
  if (moduleId === "gtm") return "mkt";
  return moduleId;
}

function getModuleAnswerProgress(moduleId: ProfileModuleId, answers: DetailAnswers) {
  const section = DETAIL_SECTIONS.find(item => item.id === moduleDetailSectionId(moduleId));
  if (!section) return { answered: 0, total: 0, percent: 0 };
  const total = getVisibleQuestions(section, answers).length;
  const answered = countSectionAnswers(section, answers);
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return { answered, total, percent };
}

/** Workspace module cards reflect drawer saves only — not onboarding merge or credits. */
function getWorkspaceProfileModuleState(
  moduleId: ProfileModuleId,
  storedAnswers: DetailAnswers,
) {
  const userProgress = getModuleAnswerProgress(moduleId, storedAnswers);
  const workspaceStatus = getModuleWorkspaceStatus(moduleId, storedAnswers);
  const userStarted = workspaceStatus !== "not_started";
  const complete = workspaceStatus === "complete";
  const insightReady = workspaceStatus === "insight_ready";
  return {
    progress: userStarted
      ? userProgress
      : { answered: 0, total: userProgress.total, percent: 0 },
    complete,
    insightReady,
    workspaceStatus,
    userStarted,
    inProgress: workspaceStatus === "in_progress" || insightReady,
    cta: workspaceModuleCtaLabel(complete, userStarted && !complete),
  };
}

function WorkspaceProgressReminder({
  summary,
  onContinue,
}: {
  summary: ReturnType<typeof buildWorkspaceProgressSummary>;
  onContinue?: () => void;
}) {
  if (summary.reportReadiness === "none" && summary.modulesPartial === 0 && summary.modulesCompleted === 0) {
    return null;
  }

  const message = buildProgressReminderMessage(summary);

  return (
    <section className="sc-workspace-progress-reminder" aria-label="Workspace progress">
      <div className="sc-workspace-progress-reminder-main">
        <div className="sc-workspace-progress-reminder-head">
          <span className="sc-workspace-progress-reminder-eyebrow">
            {summary.reportReadiness === "complete"
              ? "Report complete"
              : summary.reportReadiness === "early"
                ? "Early report ready"
                : "Progress"}
          </span>
          <strong className="sc-workspace-progress-reminder-percent">{summary.overallPercent}%</strong>
        </div>
        <p className="sc-workspace-progress-reminder-copy">{message}</p>
        <div className="sc-workspace-progress-reminder-stats" aria-label="Completion summary">
          <span>{summary.modulesCompleted} complete</span>
          <span>{summary.modulesPartial} in progress</span>
          <span>{summary.modulesNotStarted} not started</span>
          <span>{summary.creditsRemaining} credits left</span>
        </div>
        <div className="sc-workspace-progress-reminder-bar" aria-hidden="true">
          <div
            className="sc-workspace-progress-reminder-bar-fill"
            style={{ width: `${Math.max(summary.overallPercent, 4)}%` }}
          />
        </div>
        <ul className="sc-workspace-progress-reminder-modules">
          {summary.modules.map(row => (
            <li
              key={row.id}
              className={`is-${row.status}${row.creditsEarned ? " is-credited" : ""}`}
            >
              <span className="sc-workspace-progress-reminder-module-label">{row.label}</span>
              <span className="sc-workspace-progress-reminder-module-status">
                {workspaceStatusLabel(row.status)}
                {row.creditsEarned ? " · credited" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {summary.reportReadiness !== "complete" && onContinue ? (
        <button type="button" className="sc-workspace-progress-reminder-cta" onClick={onContinue}>
          Continue modules
        </button>
      ) : null}
    </section>
  );
}

function ProfileCreditRoadmap({
  detailAnswers,
  creditBalance,
  earnedProfileCredits,
  onStart,
  onOpenSources,
}: {
  detailAnswers: DetailAnswers;
  creditBalance: number;
  earnedProfileCredits?: EarnedProfileCredits;
  onStart?: (section?: ProfileUnlockSectionId | "bench") => void;
  onOpenSources?: () => void;
}) {
  const earnedModules = earnedProfileCredits?.modules ?? [];
  const benchmarkEarned = Boolean(
    earnedProfileCredits?.benchmark && earnedProfileCredits?.benchmarkViaSubmit,
  );

  const moduleRows = PROFILE_UNLOCK_SECTIONS.map(section => {
    const progress = getModuleAnswerProgress(section.id, detailAnswers);
    const earned = earnedModules.includes(section.id);
    const complete = earned || (progress.total > 0 && progress.answered >= progress.total);
    return {
      id: section.id,
      label: section.title,
      icon: section.icon,
      credits: section.credits,
      complete,
      inProgress: !complete && progress.answered > 0,
      progressLabel: progress.total > 0 ? `${progress.answered}/${progress.total} answered` : "Not started",
      progressPercent: complete ? 100 : progress.percent,
    };
  });

  const extraRows = [
    {
      id: "benchmark" as const,
      label: "Benchmark",
      icon: "benchmarks" as FuelIconName,
      credits: BENCHMARK_REWARD_CREDITS,
      complete: benchmarkEarned,
      inProgress: false,
      progressLabel: benchmarkEarned ? "Submitted" : "Submit cohort metrics",
      progressPercent: benchmarkEarned ? 100 : 0,
    },
  ];

  const allRows = [...moduleRows, ...extraRows];
  const completedCount = allRows.filter(row => row.complete).length;
  const creditProgressPct = Math.round((creditBalance / PROFILE_TOTAL_CREDITS) * 100);

  return (
    <div className="sc-gate-credit-roadmap" role="region" aria-label="Credit roadmap">
      <div className="sc-gate-section-label">
        Credit roadmap
        <span className="sc-gate-section-chip">
          {completedCount} of {allRows.length} complete
        </span>
      </div>

      <div className="sc-gate-credit-roadmap-shell">
        <aside className="sc-gate-credit-roadmap-balance">
          <span className="sc-gate-credit-roadmap-label">Credit balance</span>
          <div className="sc-gate-credit-roadmap-value">
            <strong>{creditBalance}</strong>
            <span>/ {PROFILE_TOTAL_CREDITS}</span>
          </div>
          <div className="sc-gate-credit-roadmap-meter" aria-hidden="true">
            <div
              className="sc-gate-credit-roadmap-meter-fill"
              style={{ width: `${Math.max(creditProgressPct, 4)}%` }}
            />
          </div>
          <p className="sc-gate-credit-roadmap-copy">
            Complete Profile, R&amp;D, GTM, G&amp;A, and benchmarks to earn up to{" "}
            <strong>{PROFILE_EARNABLE_CREDITS} more credits</strong>.
          </p>
          <div className="sc-gate-credit-roadmap-stats">
            <span>
              <strong>{Math.max(0, PROFILE_EARNABLE_CREDITS - (creditBalance - PROFILE_STARTING_CREDITS))}</strong>
              <em>still to earn</em>
            </span>
            <span>
              <strong>{completedCount}</strong>
              <em>steps done</em>
            </span>
          </div>
        </aside>

        <div className="sc-gate-credit-roadmap-list" role="list">
          {allRows.map(row => (
            <button
              key={row.id}
              type="button"
              role="listitem"
              className={`sc-gate-credit-roadmap-row${row.complete ? " is-complete" : row.inProgress ? " is-progress" : ""}`}
              onClick={() => {
                if (row.id === "benchmark") onStart?.("bench");
                else onStart?.(row.id);
              }}
            >
              <span className={`sc-gate-credit-roadmap-icon${row.complete ? " is-complete" : ""}`} aria-hidden="true">
                <FuelIcon name={row.icon} size={16} />
              </span>
              <span className="sc-gate-credit-roadmap-row-main">
                <span className="sc-gate-credit-roadmap-row-top">
                  <strong>{row.label}</strong>
                  {row.complete ? (
                    <span className="sc-gate-credit-roadmap-badge is-done">Done</span>
                  ) : row.inProgress ? (
                    <span className="sc-gate-credit-roadmap-badge is-active">In progress</span>
                  ) : null}
                </span>
                <span className="sc-gate-credit-roadmap-row-sub">{row.progressLabel}</span>
                {row.id !== "benchmark" ? (
                  <span className="sc-gate-credit-roadmap-row-bar" aria-hidden="true">
                    <span
                      className="sc-gate-credit-roadmap-row-bar-fill"
                      style={{ width: `${row.progressPercent}%` }}
                    />
                  </span>
                ) : null}
              </span>
              <span className="sc-gate-credit-roadmap-row-meta">
                {row.complete ? (
                  <span className="sc-gate-credit-roadmap-done" aria-hidden="true">✓</span>
                ) : (
                  <span className="sc-gate-credit-roadmap-credits">+{row.credits}</span>
                )}
                <span className="sc-gate-credit-roadmap-chevron" aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function workspaceModuleCtaLabel(complete: boolean, inProgress: boolean): string {
  if (complete) return "Review";
  if (inProgress) return "Continue";
  return "Start";
}

function moduleCreditsOfferVisible(
  creditsEarned: boolean,
  insightReady: boolean,
  complete: boolean,
): boolean {
  return !creditsEarned && !insightReady && !complete;
}

type WorkspaceSectionId = ProfileModuleId | "benchmark";

function WorkspaceModuleProgressRing({
  percent,
  answered,
  total,
  complete,
  insightReady,
  displayPercentLabel,
}: {
  percent: number;
  answered: number;
  total: number;
  complete: boolean;
  insightReady: boolean;
  displayPercentLabel?: string;
}) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clampedPercent / 100) * circumference;
  const toneClass = complete ? "is-complete" : insightReady ? "is-insight" : "is-progress";

  return (
    <div
      className={`sc-workspace-module-ring ${toneClass}`}
      role="img"
      aria-label={`${answered} of ${total} profile questions answered, ${clampedPercent} percent`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="sc-workspace-module-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--panel-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="sc-workspace-module-ring-label">
        <strong>{displayPercentLabel ?? `${clampedPercent}%`}</strong>
      </div>
    </div>
  );
}

function WorkspaceModuleCardGrid({
  modules,
  onSelect,
  activeTourTarget,
  active,
  creditBalance,
  creditsTotal = PROFILE_TOTAL_CREDITS,
  displayScoresZero = false,
}: {
  modules: Array<{
    id: WorkspaceSectionId;
    title: string;
    description: string;
    footer: string;
    credits: number;
    icon: FuelIconName;
    complete: boolean;
    insightReady?: boolean;
    creditsOfferVisible?: boolean;
    workspaceStatus?: WorkspaceModuleStatus;
    userStarted: boolean;
    progress: { answered: number; total: number; percent: number };
    cta: string;
    tourTarget?: string;
  }>;
  onSelect: (id: WorkspaceSectionId) => void;
  activeTourTarget?: string;
  active: boolean;
  creditBalance?: number;
  creditsTotal?: number;
  displayScoresZero?: boolean;
}) {
  return (
    <section className="sc-workspace-modules-panel" aria-label="5 modules to complete">
      <div className="sc-workspace-modules-panel-head">
        <div className="sc-workspace-modules-panel-head-main">
          <h3>Your 5 modules</h3>
          <p>
            {active
              ? "Tap a module to continue. Answer 2–3 questions to unlock credits — they add to your credit balance."
              : "All five modules start as Not started. Open any module to begin."}
          </p>
        </div>
        {creditBalance != null ? (
          <div
            className={`sc-workspace-modules-credit-tally${activeTourTarget === "workspace-credits" ? " tour-highlight" : ""}`}
            aria-label="Intelligence credits balance"
            data-tour-target={activeTourTarget === "workspace-credits" ? "workspace-credits" : undefined}
          >
            <span className="sc-workspace-modules-credit-tally-label">Credits</span>
            <strong>{creditBalance.toLocaleString()}</strong>
            <span className="sc-workspace-modules-credit-tally-total">/ {creditsTotal.toLocaleString()}</span>
          </div>
        ) : null}
      </div>
      <div className="sc-workspace-module-grid">
        {modules.map((module) => {
          const displayTitle = module.id === "company" ? "Complete Profile" : module.title;
          const cardStatus = module.complete
            ? "complete"
            : module.insightReady
              ? "insight"
              : module.userStarted
                ? "building"
                : "idle";
          const tourHighlight = module.tourTarget && activeTourTarget === module.tourTarget;
          const statusLabel = module.workspaceStatus
            ? workspaceStatusLabel(module.workspaceStatus)
            : module.complete
              ? "Complete"
              : module.userStarted
                ? "In progress"
                : "Not started";
          const isProfileCard = module.id === "company";

          return (
            <button
              key={module.id}
              type="button"
              className={`sc-workspace-module-card is-${cardStatus}${tourHighlight ? " tour-highlight" : ""}`}
              data-tour-target={tourHighlight ? module.tourTarget : undefined}
              onClick={() => onSelect(module.id)}
            >
              <div className="sc-workspace-module-card-head">
                <div className="sc-workspace-module-card-meta">
                  <span className="sc-workspace-module-card-icon" aria-hidden="true">
                    <FuelIcon name={module.icon} size={16} />
                  </span>
                </div>
                {isProfileCard && module.progress.total > 0 ? (
                  <WorkspaceModuleProgressRing
                    percent={landingDisplayPercent(module.progress.percent, displayScoresZero)}
                    answered={module.progress.answered}
                    total={module.progress.total}
                    complete={module.complete}
                    insightReady={Boolean(module.insightReady)}
                    displayPercentLabel={displayScoresZero ? "00" : undefined}
                  />
                ) : !isProfileCard && module.id === "benchmark" && displayScoresZero ? (
                  <span className="sc-workspace-module-card-pct" aria-label="Benchmark score 0 out of 100">
                    <strong>00</strong>
                    <em>score</em>
                  </span>
                ) : !isProfileCard && module.progress.total > 0 ? (
                  <span
                    className="sc-workspace-module-card-pct"
                    aria-label={`${module.progress.answered} of ${module.progress.total} questions answered`}
                  >
                    <strong>{module.progress.answered}/{module.progress.total}</strong>
                    <em>answered</em>
                  </span>
                ) : null}
              </div>
              <h4 className="sc-workspace-module-card-title">{displayTitle}</h4>
              <p className="sc-workspace-module-card-desc">{module.footer}</p>
              <div className="sc-workspace-module-card-foot">
                <span className={`sc-workspace-module-card-status is-${cardStatus}`}>{statusLabel}</span>
                <div className="sc-workspace-module-card-actions">
                  {module.creditsOfferVisible ? (
                    <span className="sc-workspace-module-card-credits sc-workspace-module-card-credits--offer">
                      Get +{module.credits} credits
                    </span>
                  ) : null}
                  <span className="sc-workspace-module-card-cta">{module.cta} →</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const WORKSPACE_BENCHMARK_SECTION = {
  id: "benchmark" as const,
  title: "Benchmark",
  description: "Submit cohort metrics for peer comparisons and sharper track scores.",
  footer: "Metrics · Cohort · Peer scores",
  credits: BENCHMARK_REWARD_CREDITS,
  icon: "benchmarks" as FuelIconName,
  unlocks: ["Peer comparisons", "Cohort percentile scores", "Track benchmark alignment"],
};

function tourCategoryFromTarget(activeTourTarget?: string): ScorecardCategory | null {
  if (!activeTourTarget?.startsWith("category-")) return null;
  const id = activeTourTarget.slice("category-".length);
  if (id === "dev" || id === "gtm" || id === "rev") return id;
  return null;
}

function shouldShowCategoryGlanceForTour(
  categoryId: ScorecardCategory,
  activeTourTarget?: string,
  phase?: OverviewBuildPhase | null,
  builtPhases?: ReadonlySet<OverviewBuildPhase>,
): boolean {
  if (tourCategoryFromTarget(activeTourTarget) === categoryId) return true;
  return overviewTrackReady(categoryId, phase, builtPhases);
}

function shouldShowWorkspaceCategoryGlanceForTour(
  categoryId: ScorecardCategory,
  activeTourTarget?: string,
  phase?: OverviewBuildPhase | null,
  builtPhases?: ReadonlySet<OverviewBuildPhase>,
  hasWorkspaceContent = false,
  displayScoresZero = false,
): boolean {
  if (tourCategoryFromTarget(activeTourTarget) === categoryId) return true;
  return workspaceProgressTrackReady(
    categoryId,
    phase,
    builtPhases,
    hasWorkspaceContent,
    displayScoresZero,
  );
}

function workspaceTourTarget(sectionId: WorkspaceSectionId): string | undefined {
  if (sectionId === "company") return "workspace-profile-card";
  if (sectionId === "dev") return "workspace-module-rd";
  if (sectionId === "gtm") return "workspace-module-gtm";
  if (sectionId === "rev") return "workspace-module-ga";
  if (sectionId === "benchmark") return "workspace-module-benchmark";
  return undefined;
}

function workspaceSectionStartId(sectionId: WorkspaceSectionId): ProfileUnlockSectionId | "bench" {
  return sectionId === "benchmark" ? "bench" : sectionId;
}

function OverviewWorkspaceDashboard({
  userFirstName = "there",
  companyName,
  detailAnswers,
  storedDetailAnswers: _storedDetailAnswers,
  benchmark,
  earnedProfileCredits,
  categories,
  runway,
  buildContext,
  benchmarkSaved = false,
  documentSlots,
  wikiSummary,
  overviewBuildPhase = null,
  overviewBuiltPhases,
  suggestionsReady = true,
  showWorkspaceSetup = false,
  advisorActions = [],
  privateWorkspace = false,
  isProfileComplete = false,
  onStart,
  onOpenCategory,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
  onOpenWikiSummary,
  onEditBenchmark,
  onAddSources,
  activeTourTarget,
  showShareTip = false,
  onDismissShareTip,
  displayScoresZero = false,
}: {
  userFirstName?: string;
  companyName: string;
  detailAnswers: DetailAnswers;
  /** User-saved drawer answers only — gates report cards (ignores onboarding prefill). */
  storedDetailAnswers: DetailAnswers;
  benchmark: OnboardingBenchmarkInput;
  earnedProfileCredits?: EarnedProfileCredits;
  categories: CategoryData[];
  runway: number | null;
  buildContext: CategoryBuildContext;
  benchmarkSaved?: boolean;
  documentSlots?: ScorecardDocumentSlot[];
  wikiSummary: WikiSummaryContent;
  overviewBuildPhase?: OverviewBuildPhase | null;
  overviewBuiltPhases?: ReadonlySet<OverviewBuildPhase>;
  suggestionsReady?: boolean;
  showWorkspaceSetup?: boolean;
  advisorActions?: AdvisorRecAction[];
  privateWorkspace?: boolean;
  isProfileComplete?: boolean;
  onStart?: (section?: ProfileUnlockSectionId | "bench") => void;
  onOpenCategory?: (categoryId: ScorecardCategory) => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: (id: string) => void;
  onOpenWikiSummary?: (highlightRefId?: number) => void;
  onEditBenchmark?: () => void;
  onAddSources?: () => void;
  activeTourTarget?: string;
  showShareTip?: boolean;
  onDismissShareTip?: () => void;
  displayScoresZero?: boolean;
}) {
  const [openGlancePopover, setOpenGlancePopover] = useState<ScorecardCategory | null>(null);
  const benchmarkEarned = Boolean(
    earnedProfileCredits?.benchmark && earnedProfileCredits?.benchmarkViaSubmit,
  );
  const benchFilled = METRIC_COHORTS.filter(c => parseMetricValue(benchmark[c.key] ?? "")).length;
  const benchTotal = METRIC_COHORTS.length;
  /** Merged onboarding + saved drawer answers — drives visible workspace state after onboarding. */
  const displayAnswers = detailAnswers;

  const profileSections = PROFILE_UNLOCK_SECTIONS.map(section => {
    const moduleState = getWorkspaceProfileModuleState(section.id, displayAnswers);
    const creditsEarned = earnedProfileCredits?.modules.includes(section.id) ?? false;
    return {
      ...section,
      ...moduleState,
      creditsOfferVisible: moduleCreditsOfferVisible(creditsEarned, moduleState.insightReady, moduleState.complete),
      tourTarget: workspaceTourTarget(section.id),
    };
  });

  const benchmarkUserStarted = benchmarkSaved || benchmarkEarned || benchFilled > 0;
  const benchmarkComplete = benchmarkEarned || (benchmarkSaved && benchFilled >= benchTotal);
  const benchmarkInsightReady = !benchmarkComplete && benchFilled >= MIN_BENCHMARK_METRICS_FOR_UNLOCK;
  const benchmarkModule = {
    ...WORKSPACE_BENCHMARK_SECTION,
    progress: benchmarkUserStarted
      ? { answered: benchFilled, total: benchTotal, percent: benchTotal > 0 ? Math.round((benchFilled / benchTotal) * 100) : 0 }
      : { answered: 0, total: benchTotal, percent: 0 },
    complete: benchmarkComplete,
    insightReady: benchmarkInsightReady,
    workspaceStatus: benchmarkComplete
      ? "complete" as const
      : benchmarkInsightReady
        ? "insight_ready" as const
        : benchmarkUserStarted
          ? "in_progress" as const
          : "not_started" as const,
    userStarted: benchmarkUserStarted,
    inProgress: benchmarkUserStarted && !benchmarkComplete,
    cta: workspaceModuleCtaLabel(benchmarkComplete, benchmarkUserStarted && !benchmarkComplete),
    creditsOfferVisible: moduleCreditsOfferVisible(benchmarkEarned, benchmarkInsightReady, benchmarkComplete),
    tourTarget: workspaceTourTarget("benchmark"),
  };

  const modules = [...profileSections, benchmarkModule];
  const progressSummary = buildWorkspaceProgressSummary(
    displayAnswers,
    earnedProfileCredits,
    benchFilled,
    benchTotal,
  );
  const hasWorkspaceContent = hasProfileBasicsStarted(displayAnswers) || benchFilled > 0;
  const startedCount = modules.filter(section => section.userStarted).length;
  const allEmpty = !hasWorkspaceContent && startedCount === 0;
  const contentLandingHidden = displayScoresZero;
  const isBuildingAdvisor = overviewBuildPhase === "summary";
  const isBuildingTrack = categories.some(cat => overviewTrackBuilding(cat.id, overviewBuildPhase));
  const isBuildingReport = isBuildingAdvisor || isBuildingTrack;
  const showProgressFeed = isBuildingReport
    || (!contentLandingHidden && (hasWorkspaceContent || Boolean(overviewBuildPhase)));
  const showAdvisorSection = isBuildingAdvisor
    || isBuildingReport
    || (!contentLandingHidden && (
      hasWorkspaceContent
      || progressSummary.reportReadiness !== "none"
      || Boolean(overviewBuildPhase)
    ));
  const reportReadiness = progressSummary.reportReadiness === "none" && hasWorkspaceContent
    ? "early" as const
    : progressSummary.reportReadiness;
  const showWorkspaceSummaryTop = showAdvisorSection && !showWorkspaceSetup;

  const handleSectionStart = (sectionId: WorkspaceSectionId) => {
    if (sectionId === "benchmark") {
      onEditBenchmark?.();
      return;
    }
    onStart?.(workspaceSectionStartId(sectionId));
  };

  return (
    <div className="sc-workspace-dash" role="region" aria-label="Workspace dashboard">
      <WorkspaceModuleCardGrid
        modules={modules}
        onSelect={handleSectionStart}
        activeTourTarget={activeTourTarget}
        active={!allEmpty}
        creditBalance={progressSummary.creditBalance}
        displayScoresZero={displayScoresZero}
      />

      {showWorkspaceSummaryTop || overviewBuildPhase === "ready" || isBuildingAdvisor ? (
        <section className="sc-workspace-summary-section" aria-label="Workspace summary">
          <div className="sc-adv-featured-wrap sc-workspace-summary-wrap">
            <div className="sc-adv-featured-border" aria-hidden="true" />
            {overviewBuildPhase === "ready" ? (
              <div className="sc-workspace-ready-bar sc-workspace-ready-bar--top" role="status">
                <strong>Your workspace report is ready</strong>
                <span>Review your early summary below — complete modules anytime for deeper insights.</span>
              </div>
            ) : null}
            {isBuildingAdvisor ? (
              <div className="sc-workspace-summary-card">
                <OverviewAdvisorSkeleton />
              </div>
            ) : showWorkspaceSummaryTop ? (
              <div className="sc-workspace-summary-card sc-adv-featured sc-adv-featured-split is-rec-hidden">
                <AdvisorSummaryBriefColumn
                  categories={categories}
                  runway={runway}
                  companyName={companyName}
                  wikiSummary={wikiSummary}
                  onOpenWikiSummary={onOpenWikiSummary ?? (() => {})}
                  onOpenIntelligence={onOpenIntelligence}
                  suggestionsReady={suggestionsReady}
                  overviewBuildPhase={overviewBuildPhase}
                  overviewBuiltPhases={overviewBuiltPhases}
                  reportReadiness={reportReadiness}
                  layout="workspace"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {overviewBuildPhase && overviewBuildPhase !== "ready" ? (
        <OverviewBuildPanel phase={overviewBuildPhase} />
      ) : null}

      {showProgressFeed ? (
        <section className="sc-progress-feed-section sc-workspace-progress-feed" aria-labelledby="sc-workspace-progress-feed-heading">
          <div className="sc-progress-feed-head">
            <h2 id="sc-workspace-progress-feed-heading" className="sc-progress-feed-title">Progress Feed</h2>
          </div>
          <div
            className={`sc-overview-tracks sc-overview-tracks-glance${isBuildingReport ? " sc-overview-tracks-glance--building" : ""}`}
            aria-busy={isBuildingReport}
          >
            {categories.map(cat => (
              shouldShowWorkspaceCategoryGlanceForTour(
                cat.id,
                activeTourTarget,
                overviewBuildPhase,
                overviewBuiltPhases,
                hasWorkspaceContent,
                displayScoresZero,
              ) ? (
                <CategoryGlanceRow
                  key={cat.id}
                  cat={cat}
                  runway={runway}
                  displayScoresZero={displayScoresZero}
                  onOpen={() => onOpenCategory?.(cat.id)}
                  onUpdateDetails={() => onOpenCategory?.(cat.id)}
                  onOpenIntelligence={onOpenIntelligence}
                  onOpenInitiatives={onOpenInitiatives}
                  onRunPlaybook={onRunPlaybook}
                  glancePopoverOpen={openGlancePopover === cat.id}
                  onGlancePopoverOpen={() => setOpenGlancePopover(cat.id)}
                  onGlancePopoverClose={() => setOpenGlancePopover(null)}
                  tourTarget={activeTourTarget === `category-${cat.id}` ? `category-${cat.id}` : undefined}
                  suggestionsReady={suggestionsReady}
                  isProfileComplete={isProfileComplete}
                  onCompleteProfile={() => onStart?.(categoryToProfileUnlockSection(cat.id))}
                />
              ) : (
                <CategoryGlanceRowSkeleton key={cat.id} label={cat.label} />
              )
            ))}
          </div>
        </section>
      ) : null}

      {showWorkspaceSetup ? (
        <div
          className={`sc-adv-featured-wrap sc-workspace-advisor-wrap${activeTourTarget === "ai-advisor" ? " tour-highlight" : ""}`}
          data-tour-target={activeTourTarget === "ai-advisor" ? "ai-advisor" : undefined}
        >
          <div className="sc-adv-featured-border" aria-hidden="true" />
          <OverviewWorkspaceSetupPanel
            companyName={companyName}
            actions={advisorActions}
            onEditBenchmark={onEditBenchmark}
            onAddSources={onAddSources}
            onViewDetails={() => onOpenWikiSummary?.()}
            showShareTip={showShareTip}
            onDismissShareTip={onDismissShareTip}
            tourHighlightRecommended={activeTourTarget === "recommended-actions"}
          />
        </div>
      ) : null}

      <WorkspaceConnectorsSection activeTourTarget={activeTourTarget} />
    </div>
  );
}

function ProfileCompletionRing({
  percent,
  display,
  size = 72,
}: {
  percent: number;
  display: string;
  size?: number;
}) {
  const ringRadius = 30;
  const circumference = 2 * Math.PI * ringRadius;
  return (
    <div className="sc-profile-complete-ring" aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={ringRadius} fill="none" stroke="var(--panel-border)" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          fill="none"
          stroke="var(--fuel-accent, var(--fuel-accent))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="sc-profile-complete-ring-label">
        <strong>{display}</strong>
      </span>
    </div>
  );
}

function ProfileGateConnectors() {
  return (
    <AccountIntegrationsList
      gateLayout
      intro="Connect HubSpot or Granola to enrich your profile and unlock deeper AI insights."
    />
  );
}

/** Module-first workspace — same HubSpot + Granola block as advisor-first / gate-first. */
function WorkspaceConnectorsSection({ activeTourTarget }: { activeTourTarget?: string }) {
  const tourActive = activeTourTarget === "workspace-connectors";
  return (
    <section
      className={`sc-workspace-connectors${tourActive ? " tour-highlight" : ""}`}
      aria-label="Connectors"
      data-tour-target={tourActive ? "workspace-connectors" : undefined}
    >
      <ProfileGateConnectors />
    </section>
  );
}

/** Zero-data / legacy overview — motivates profile completion before analytics exist. */
function ProfileIncompleteGate({
  firstName = "there",
  companyName,
  detailAnswers,
  creditBalance,
  earnedProfileCredits,
  isProfileComplete = false,
  onStart,
  onOpenSources,
}: {
  firstName?: string;
  companyName: string;
  detailAnswers: DetailAnswers;
  creditBalance: number;
  earnedProfileCredits?: EarnedProfileCredits;
  isProfileComplete?: boolean;
  onStart?: (section?: ProfileUnlockSectionId | "bench") => void;
  onOpenSources?: () => void;
}) {
  const profileProgress = computeProfileAnswerProgress(detailAnswers);
  const isFullyEmpty = profileProgress.answered === 0;
  const profileStarted = hasProfileBasicsStarted(detailAnswers);
  const profileCreditsToEarn = remainingProfileModuleCredits(earnedProfileCredits);
  const introBenefits = [
    "Unlock Benchmarking",
    "Improve Recommendations",
    "Increase Intelligence Accuracy",
  ];
  const completionDisplay = isFullyEmpty
    ? "00"
    : `${profileProgress.percent.toString().padStart(2, "0")}%`;

  if (isFullyEmpty) {
    return (
      <div className="sc-profile-gate sc-profile-gate--old sc-profile-gate--zero" role="region" aria-label="Profile completion">
        <div className="sc-profile-old-zero-card">
          <ProfileCompletionRing percent={0} display="00" />
          <div className="sc-profile-old-zero-copy">
            <span className="sc-profile-old-zero-label">Profile completion</span>
            <strong className="sc-profile-old-zero-rate" aria-live="polite">{completionDisplay}%</strong>
            <p>Complete your company profile to unlock R&amp;D, GTM, and G&amp;A intelligence scores.</p>
            <button type="button" className="sc-profile-complete-cta" onClick={() => onStart?.("company")}>
              Start Complete Profile →
              {profileCreditsToEarn > 0 ? (
                <span className="sc-profile-complete-credits-pill">+{profileCreditsToEarn} credits</span>
              ) : null}
            </button>
          </div>
        </div>
        {!isProfileComplete ? <ProfileGateConnectors /> : null}
      </div>
    );
  }

  return (
    <div className="sc-profile-gate sc-profile-gate--old" role="region" aria-label="Your intelligence dashboard">

      <div
        className="sc-profile-complete-banner sc-gate-intro-banner"
        role="region"
        aria-label="Complete your company profile"
      >
        <ProfileCompletionRing percent={profileProgress.percent} display={profileProgress.percent.toString().padStart(2, "0")} />
        <div className="sc-profile-complete-copy">
          <h2>
            {profileStarted
              ? `Welcome back, ${firstName}.`
              : `Build ${companyName}'s intelligence`}
          </h2>
          <p>
            {profileStarted
              ? "Pick up where you left off — each section you finish unlocks live track scores below."
              : `Answer the remaining questions about ${companyName} to turn locked scores into live intelligence.`}
          </p>
          <ul className="sc-profile-complete-benefits">
            {introBenefits.map(item => (
              <li key={item}>
                <span className="sc-profile-complete-check" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="sc-profile-complete-actions">
          <button type="button" className="sc-profile-complete-cta" onClick={() => onStart?.("company")}>
            Continue Profile →
            {profileCreditsToEarn > 0 ? (
              <span className="sc-profile-complete-credits-pill">+{profileCreditsToEarn} credits</span>
            ) : null}
          </button>
          <span className="sc-profile-complete-time">Takes &lt;5 min</span>
        </div>
      </div>

      <ProfileCreditRoadmap
        detailAnswers={detailAnswers}
        creditBalance={creditBalance}
        earnedProfileCredits={earnedProfileCredits}
        onStart={onStart}
        onOpenSources={onOpenSources}
      />

      {!isProfileComplete ? <ProfileGateConnectors /> : null}
    </div>
  );
}

function OverviewBuildPanel({
  phase,
}: {
  phase: OverviewBuildPhase;
}) {
  const idx = overviewBuildPhaseIndex(phase);
  const progress = Math.min(100, Math.round((idx / (OVERVIEW_BUILD_PHASE_ORDER.length - 1)) * 100));
  const activeStep = OVERVIEW_BUILD_STEPS.find(step => step.id === phase) ?? OVERVIEW_BUILD_STEPS[0];

  return (
    <div className="sc-overview-build overview-panel" role="status" aria-live="polite">
      <div className="sc-overview-build-top">
        <div>
          <span className="sc-overview-build-eyebrow">Building your Overview</span>
          <h2 className="sc-overview-build-title">Fuel is using your onboarding answers</h2>
          <p className="sc-overview-build-copy">
            Summary appears first. R&amp;D, GTM, and G&amp;A follow next — other tabs stay available while this builds.
          </p>
        </div>
      </div>
      <div className="sc-overview-build-progress" aria-hidden="true">
        <div className="sc-overview-build-progress-fill" style={{ width: `${Math.max(progress, 8)}%` }} />
      </div>
      <div className="sc-overview-build-active">
        <i className="sc-overview-build-pulse" aria-hidden="true" />
        <div className="sc-overview-build-active-copy">
          <strong>{activeStep.label}</strong>
        </div>
      </div>
    </div>
  );
}

function OverviewAdvisorSkeleton() {
  return (
    <div className="sc-overview-skeleton-advisor" aria-hidden="true">
      <div className="sc-skel-line sc-skel-line-lg" />
      <div className="sc-skel-line" />
      <div className="sc-skel-line sc-skel-line-mid" />
      <div className="sc-skel-chip-row">
        <span className="sc-skel-chip" />
        <span className="sc-skel-chip" />
        <span className="sc-skel-chip" />
      </div>
    </div>
  );
}

function CategoryGlanceRowSkeleton({ label }: { label: string }) {
  return (
    <article className="sc-glance-row sc-glance-row--track sc-glance-row-skeleton" aria-hidden="true">
      <div className="sc-glance-track-lead">
        <div className="sc-skel-ring" />
        <div className="sc-glance-track-identity">
          <h3 className="sc-glance-track-title">
            <span className="sc-glance-track-short">{label}</span>
          </h3>
          <span className="sc-skel-chip" />
        </div>
      </div>
      <div className="sc-glance-track-mid">
        <div className="sc-skel-line" />
        <div className="sc-skel-line sc-skel-line-mid" />
        <div className="sc-skel-insights">
          <div className="sc-skel-line" />
          <div className="sc-skel-line sc-skel-line-mid" />
        </div>
      </div>
      <div className="sc-glance-track-foot">
        <div className="sc-skel-line sc-skel-line-mid" />
      </div>
    </article>
  );
}

function CategoryGlanceRow({
  cat,
  runway: _runway,
  onOpen,
  onUpdateDetails,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
  glancePopoverOpen,
  onGlancePopoverOpen,
  onGlancePopoverClose,
  tourTarget,
  suggestionsReady = true,
  isProfileComplete = true,
  onCompleteProfile,
  displayScoresZero = false,
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
  suggestionsReady?: boolean;
  isProfileComplete?: boolean;
  onCompleteProfile?: () => void;
  displayScoresZero?: boolean;
}) {
  const score = landingDisplayScore(Math.max(0, Math.min(100, cat.score)), displayScoresZero);
  const focusLine = cat.glanceFocus;
  const answersCta = buildGlanceAnswersCta(cat.label, cat.detailAnsweredCount, cat.detailQuestionCount);
  const improvementItems = cat.glanceWeaknessItems.length > 0
    ? cat.glanceWeaknessItems.slice(0, 3)
    : cat.glanceStrengthItems.slice(0, 0);
  const insightsLocked = areTrackInsightsLocked(cat, isProfileComplete);
  const openProfileForTrack = () => (onCompleteProfile ?? onUpdateDetails)?.();

  return (
    <article
      className={`sc-glance-row sc-glance-row--track sc-glance-row--ref${tourTarget ? " tour-highlight" : ""}`}
      data-tour-target={tourTarget}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      role="button"
      tabIndex={0}
      aria-label={`${cat.fullLabel}, ${displayScoresZero ? "00" : score} out of 100, ${cat.statusLabel}. Open track details.`}
    >
      <CategoryGlanceHeaderBar
        cat={cat}
        answersCta={answersCta}
        onUpdateDetails={onUpdateDetails}
        onOpenIntelligence={onOpenIntelligence}
        onOpenInitiatives={onOpenInitiatives}
        onRunPlaybook={onRunPlaybook}
        suggestionsReady={suggestionsReady}
      />

      <div className="sc-glance-track-body">
        <div className="sc-glance-track-lead">
          <GlanceScoreRing
            cat={cat}
            score={score}
            scoreLabel={displayScoresZero ? "00" : undefined}
            isOpen={glancePopoverOpen}
            onRequestOpen={onGlancePopoverOpen}
            onRequestClose={onGlancePopoverClose}
            size={88}
            className="sc-glance-ring-wrap--track sc-glance-ring-wrap--ref"
          />
          <div className="sc-glance-track-lead-copy">
            <h3 className="sc-glance-track-title-link">
              {cat.label} — {cat.fullLabel} <span aria-hidden="true">→</span>
            </h3>
            {focusLine ? <p className="sc-glance-track-focus">{focusLine}</p> : null}
          </div>
        </div>

        <div className="sc-glance-track-mid">
          <TrackInsightPanel
            tone="strong"
            title="Primary Strengths"
            items={cat.glanceStrengthItems.slice(0, 2)}
            empty="Complete more track details to surface strengths."
            compact
          />
        </div>

        <div className="sc-glance-track-improve sc-glance-track-improve-panel" onClick={e => e.stopPropagation()}>
          <TopImprovementsPreview
            trackLabel={cat.label}
            items={improvementItems}
            insightsLocked={insightsLocked}
            onCompleteProfile={openProfileForTrack}
          />
        </div>
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

// ─── Detail-enrichment form schema (see trackQuestions.ts) ───────────────────

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

const BENCHMARK_INTEL_KEY_TO_CATEGORY: Record<string, ScorecardCategory> = {
  openToIntros: "rev",
  cacPayback: "dev",
  burnMultiple: "dev",
  ruleOf40: "dev",
};

function resolveIntelligenceCategory(item: ScorecardIntelligenceItem): ScorecardCategory | null {
  const byType = INTEL_TYPE_TO_CATEGORY[item.type.toLowerCase()];
  if (byType) return byType;

  if (item.id.startsWith("intel-bench-")) {
    const key = item.id.slice("intel-bench-".length);
    if (BENCHMARK_INTEL_KEY_TO_CATEGORY[key]) return BENCHMARK_INTEL_KEY_TO_CATEGORY[key];
    for (const category of Object.keys(CATEGORY_METRIC_KEYS) as ScorecardCategory[]) {
      if (CATEGORY_METRIC_KEYS[category].includes(key as MetricKey)) return category;
    }
  }

  return null;
}

function intelligenceForCategory(category: ScorecardCategory, items: ScorecardIntelligenceItem[]): ScorecardIntelligenceItem[] {
  return items.filter(item => resolveIntelligenceCategory(item) === category);
}

function buildDetailSnippets(category: ScorecardCategory, answers: DetailAnswers): string[] {
  const section = TRACK_DETAIL_SECTIONS.find(s => s.id === category);
  if (!section) return [];
  return getVisibleQuestions(section, answers).flatMap(q => {
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
  const section = TRACK_DETAIL_SECTIONS.find(s => s.id === category);
  if (!section) return [];

  const toneRank: Record<DetailFieldTone, number> = { missing: 0, concern: 1, watch: 2, ok: 3 };

  return getVisibleQuestions(section, answers)
    .map(q => {
      const val = answers[q.id]?.trim() || null;
      const score = scoreDetailAnswer(q.id, val);
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

  const fromBenchmarkKeys = CATEGORY_METRIC_KEYS[category].filter(k => metricMap[k]?.value != null).length;
  const fromCrossTrackBench = items.filter(item => {
    if (!item.id.startsWith("intel-bench-")) return false;
    const key = item.id.slice("intel-bench-".length);
    if (BENCHMARK_INTEL_KEY_TO_CATEGORY[key] === category) return true;
    return CATEGORY_METRIC_KEYS[category].includes(key as MetricKey);
  }).length;

  return Math.max(fromBenchmarkKeys, fromCrossTrackBench);
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
      case "dev_delivery_constraint":
        return `You flagged ${val.toLowerCase()} as your primary delivery constraint.`;
      case "dev_ship_cadence":
        if (val === "Ad hoc — no regular cadence" || val === "Not shipping yet") return `You ship ${val.toLowerCase()}, which reads slower than peers at this stage.`;
        return null;
      case "dev_build_model":
        if (val === "Contract dev / agency" || val === "Not building yet — manual or services first") return `Product is ${val.toLowerCase()}.`;
        return null;
      case "mkt_sales_motion":
        if (val === "Founder-led" || val === "Not yet") return `GTM is still ${val.toLowerCase()}.`;
        return null;
      case "mkt_funnel_gap":
        return `The funnel breaks down most at ${val.toLowerCase()}.`;
      case "mkt_marketing_capacity":
        if (val === "No dedicated marketing — founders or sales cover it") return `Marketing is ${val.toLowerCase()}.`;
        return null;
      case "mkt_icp_clarity":
        if (!val.startsWith("Documented") && !val.startsWith("Written ICP")) return `ICP is ${val.toLowerCase()}.`;
        return null;
      case "mkt_revenue_tracking":
        if (val === "No systematic pipeline yet" || val === "Spreadsheet or lightweight tracking") return `Revenue tracking runs on ${val.toLowerCase()}.`;
        return null;
      case "rev_forecast":
        if (val !== "Yes, monthly rolling forecast") return `Financial forecast is ${val.toLowerCase()}.`;
        return null;
      case "rev_runway":
        if (val === "Under 6 months") return `Runway is ${val.toLowerCase()}.`;
        return null;
      case "rev_unit_economics":
        if (val === "Not yet") return "Unit economics are not tracked yet.";
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

/** Founder-facing metric names for insight chips and glance prose — never one cryptic word. */
const METRIC_FRIENDLY: Record<string, string> = {
  "ARR": "annual recurring revenue",
  "ARR growth (YoY)": "revenue growth",
  "Net revenue retention": "net revenue retention",
  "Logo retention": "customer retention",
  "Gross margin": "gross margin",
  "Monthly net burn": "monthly cash burn",
  "Cash on hand": "cash in the bank",
  "FTE headcount": "team size",
  "Paying customers": "paying customers",
  "CAC payback": "payback on customer acquisition",
  "Burn multiple": "burn multiple",
  "Rule of 40": "growth vs. burn balance",
};

/** Fix leftover ultra-short chip stubs from older friendly maps. */
const INSIGHT_CHIP_FIXUPS: Record<string, string> = {
  cash: "Cash in the bank",
  burn: "Monthly cash burn",
  revenue: "Annual recurring revenue",
  "net retention": "Net revenue retention",
  "customer retention": "Customer retention",
  "team size": "Team size",
  "paying customers": "Paying customers",
  "gross margin": "Gross margin",
  "revenue growth": "Revenue growth",
  "ai role": "AI Role",
};

function friendlyMetricLabel(label: string): string {
  return METRIC_FRIENDLY[label] ?? label.toLowerCase();
}

/** UI labels: first letter capital, rest unchanged (no CSS capitalize/uppercase). */
function toSentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function insightTopicKey(label: string): string {
  const base = label.split(":")[0]?.trim() ?? label;
  return friendlyMetricLabel(base).toLowerCase();
}

/**
 * Chip titles — clear phrases a founder can read at a glance.
 * Prefer full friendly metric names; never leave a one-word stub like “Cash”.
 */
function shortInsightChipLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Insight";
  const colon = trimmed.indexOf(": ");
  const head = colon > 0 && colon <= 56 ? trimmed.slice(0, colon) : trimmed;
  const friendly = friendlyMetricLabel(head);
  const fixup = INSIGHT_CHIP_FIXUPS[friendly.toLowerCase()]
    ?? INSIGHT_CHIP_FIXUPS[head.toLowerCase()];
  const plain = fixup ?? toSentenceCase(friendly);
  return plain.length > 42 ? `${plain.slice(0, 42)}…` : plain;
}

function insightChipDetailFromIntel(item: ScorecardIntelligenceItem): string {
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

function trackFocusName(category: ScorecardCategory): string {
  if (category === "dev") return "Product & engineering";
  if (category === "mkt") return "Go to market";
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
    .replace(/\bGTM\b/g, "go to market")
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
      if (val === "Contract dev / agency") return "Engineering is agency-led — tighten ownership before scale.";
      return null;
    case "dev_ship_cadence":
      if (val === "Ad hoc — no regular cadence" || val === "Not shipping yet") {
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
    .filter(m => (m.tier === "bottom" || m.tier === "lower" || m.tier === "mid") && m.display !== "—" && m.display !== "Not logged")
    .forEach(m => {
      addWeakness(
        `bench-${m.key}`,
        friendlyMetricLabel(m.label),
        m.positionLabel,
        "benchmark",
        m.tier === "bottom" ? 10 : m.tier === "lower" ? 25 : 40,
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
      } else if (m?.value != null && (m.tier === "bottom" || m.tier === "lower" || m.tier === "mid")) {
        addWeakness(
          item.id,
          friendlyMetricLabel(m.label),
          item.highlight ?? m.positionLabel,
          "intelligence",
          m.tier === "bottom" ? 12 : m.tier === "lower" ? 28 : 42,
        );
      }
      return;
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
  insightsLocked = false,
}: {
  tone: "strong" | "weak";
  title: string;
  items: TrackInsightItem[];
  empty: string;
  compact?: boolean;
  insightsLocked?: boolean;
}) {
  return (
    <div className={`sc-glance-insight-block${compact ? " is-compact" : ""}`}>
      <span className={`sc-glance-insight-label sc-cat-tone-${tone}`}>{title}</span>
      {items.length > 0 ? (
        <ul className="sc-cat-sw-list">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={insightsLocked && index >= 1 ? "is-locked-blur" : undefined}
              aria-hidden={insightsLocked && index >= 1 ? true : undefined}
            >
              <strong>{shortInsightChipLabel(item.label)}</strong>
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
  const detailTotal = Math.max(1, countApplicableQuestions(detailAnswers));
  const detailFilled = countTrackDetailAnswers(detailAnswers) / detailTotal;
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
  const section = TRACK_DETAIL_SECTIONS.find(s => s.id === base.id);
  const visibleQuestions = section ? getVisibleQuestions(section, ctx.detailAnswers) : [];
  const sectionAnswered = section ? countSectionAnswers(section, ctx.detailAnswers) : 0;
  const sectionTotal = visibleQuestions.length;
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
    intelligenceCount: countCategoryIntelDisplay(base.id, ctx.intelligenceItems, metricMap),
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
    statusLine = "Tracking with your cohort across product, go to market, and finance.";
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
    statusLine = "Tracking with your cohort across product, go to market, and finance.";
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

type WikiReference = {
  id: number;
  label: string;
  kind: "benchmark" | "profile" | "intelligence" | "document" | "detail";
  detail: string;
};

type WikiParagraphPart = { text: string } | { refId: number };

type WikiParagraph = {
  parts: WikiParagraphPart[];
};

type WikiSummarySection = {
  title: string;
  paragraphs: WikiParagraph[];
};

type WikiSummaryContent = {
  compact: WikiParagraph;
  sections: WikiSummarySection[];
  references: WikiReference[];
};

function wikiText(text: string): WikiParagraphPart {
  return { text };
}

function wikiCite(refId: number): WikiParagraphPart {
  return { refId };
}

function buildOverviewWikiSummary(
  companyName: string,
  categories: CategoryData[],
  runway: number | null,
  ctx: CategoryBuildContext,
  documentSlots: ScorecardDocumentSlot[] | undefined,
  cohortLabel: string,
): WikiSummaryContent {
  const references: WikiReference[] = [];
  const cite = (label: string, kind: WikiReference["kind"], detail: string) => {
    const id = references.length + 1;
    references.push({ id, label, kind, detail });
    return id;
  };

  const sector = ctx.profileMeta?.sector?.split("·")[0]?.trim() || "B2B company";
  const employees = ctx.profileMeta?.employees;
  const headquarters = ctx.profileMeta?.headquarters;
  const domain = ctx.profileMeta?.domain;
  const profileRef = cite(
    "Company profile",
    "profile",
    [sector, employees ? `${employees} employees` : null, headquarters, domain].filter(Boolean).join(" · ") || "Onboarding profile",
  );

  const arrMetric = evaluateMetrics(ctx.benchmark).find(metric => metric.key === "arr");
  const nrrMetric = evaluateMetrics(ctx.benchmark).find(metric => metric.key === "nrr");
  const benchRefs: number[] = [];
  if (arrMetric.value != null) {
    benchRefs.push(cite("Benchmark · ARR", "benchmark", `${arrMetric.display} vs cohort ${arrMetric.p50Display} median`));
  }
  if (nrrMetric.value != null) {
    benchRefs.push(cite("Benchmark · NRR", "benchmark", `${nrrMetric.display} vs cohort ${nrrMetric.p50Display} median`));
  }
  if (!benchRefs.length) {
    benchRefs.push(cite("Benchmark cohort", "benchmark", cohortLabel));
  }

  const intelRefs = ctx.intelligenceItems.slice(0, 4).map(item => cite(
    `Intelligence · ${item.type}`,
    "intelligence",
    item.highlight || item.title || item.text,
  ));

  const docRefs = (documentSlots ?? [])
    .filter(slot => slot.current)
    .slice(0, 3)
    .map(slot => cite(
      `Data room · ${slot.typeLabel}`,
      "document",
      slot.current!.name,
    ));

  const detailSnippets = categories.flatMap(cat => cat.detailSnippets).filter(Boolean).slice(0, 2);
  const detailRefs = detailSnippets.map((snippet, index) => cite(
    `Track details · ${index + 1}`,
    "detail",
    snippet,
  ));

  const urgentCount = categories.filter(c => categoryUrgency(c, runway) === "urgent").length;
  const watchCount = categories.filter(c => categoryUrgency(c, runway) === "watch").length;
  const contextPct = computeOverallContextPct(ctx.benchmark, ctx.detailAnswers, ctx.benchmarkContext);

  const compactRefs = [profileRef, ...benchRefs.slice(0, 1), ...intelRefs.slice(0, 1)].filter(Boolean);
  const compact: WikiParagraph = {
    parts: [
      wikiText(`${companyName} is a ${sector.toLowerCase()} company`),
      ...(headquarters ? [wikiText(` headquartered in ${headquarters}`)] : []),
      wikiText(". "),
      wikiText(
        urgentCount > 0
          ? `Fuel flags ${urgentCount} urgent focus area${urgentCount > 1 ? "s" : ""} against the ${cohortLabel} cohort`
          : watchCount > 0
            ? `Fuel tracks ${watchCount} watch area${watchCount > 1 ? "s" : ""} against the ${cohortLabel} cohort`
            : `Fuel benchmarks performance against the ${cohortLabel} cohort`,
      ),
      ...compactRefs.map(refId => [wikiCite(refId)]).flat(),
      wikiText(
        ctx.intelligenceItems.length
          ? `, with ${ctx.intelligenceItems.length} intelligence signal${ctx.intelligenceItems.length > 1 ? "s" : ""} on file.`
          : ". Add sources to deepen the picture.",
      ),
    ],
  };

  const profileParagraph: WikiParagraph = {
    parts: [
      wikiText(`${companyName} operates in ${sector.toLowerCase()}`),
      ...(employees ? [wikiText(`, with ${employees} employees`)] : []),
      ...(headquarters ? [wikiText(` based in ${headquarters}`)] : []),
      wikiText(". "),
      wikiText(`Company context is ${contextPct}% complete across profile, benchmark, and track detail forms.`),
      wikiCite(profileRef),
      ...(detailRefs[0] ? [wikiText(" "), wikiCite(detailRefs[0])] : []),
    ],
  };

  const benchmarkParagraph: WikiParagraph = {
    parts: [
      wikiText(`Against ${cohortLabel}, `),
      ...(arrMetric.value != null
        ? [
            wikiText(`reported ARR is ${arrMetric.display} (${arrMetric.positionLabel})`),
            wikiCite(benchRefs[0]),
          ]
        : [wikiText("benchmark metrics are still being filled in"), wikiCite(benchRefs[0])]),
      ...(nrrMetric.value != null
        ? [
            wikiText(`. Net revenue retention is ${nrrMetric.display}`),
            wikiCite(benchRefs[1] ?? benchRefs[0]),
          ]
        : []),
      ...(runway != null ? [wikiText(`. Estimated runway is ${runway} months.`)] : []),
      wikiText("."),
    ],
  };

  const intelligenceParagraph: WikiParagraph = {
    parts: intelRefs.length
      ? [
          wikiText(`Fuel is monitoring ${ctx.intelligenceItems.length} intelligence item${ctx.intelligenceItems.length > 1 ? "s" : ""} from benchmark, profile, and connected sources`),
          ...intelRefs.flatMap((refId, index) => (index === 0 ? [wikiCite(refId)] : [wikiText(", "), wikiCite(refId)])),
          wikiText("."),
        ]
      : [
          wikiText("No user-generated intelligence yet — upload a deck, log a signal, or connect CRM and meeting sources to populate this summary."),
        ],
  };

  const tracksParagraph: WikiParagraph = {
    parts: [
      wikiText("Across R&D, GTM, and G&A tracks, "),
      ...categories.flatMap((cat, index) => {
        const chunk: WikiParagraphPart[] = [];
        if (index > 0) chunk.push(wikiText(index === categories.length - 1 ? ", and " : ", "));
        chunk.push(wikiText(`${cat.label} is ${cat.statusLabel.toLowerCase()}`));
        if (cat.intelligenceCount) chunk.push(wikiText(` (${cat.intelligenceCount} intelligence)`));
        return chunk;
      }),
      wikiText("."),
    ],
  };

  const sections: WikiSummarySection[] = [
    { title: "Overview", paragraphs: [profileParagraph] },
    { title: "Benchmark position", paragraphs: [benchmarkParagraph] },
    { title: "Intelligence", paragraphs: [intelligenceParagraph] },
    { title: "Operating tracks", paragraphs: [tracksParagraph] },
  ];

  if (docRefs.length) {
    sections.push({
      title: "Sources on file",
      paragraphs: [{
        parts: [
          wikiText("Private documents in the data room include "),
          ...docRefs.flatMap((refId, index) => (index === 0 ? [wikiCite(refId)] : [wikiText(", "), wikiCite(refId)])),
          wikiText("."),
        ],
      }],
    });
  }

  if (ctx.benchmarkContext?.biggestChallenges?.trim()) {
    const challengeRef = cite("Founder update · Challenges", "detail", ctx.benchmarkContext.biggestChallenges.trim());
    sections.push({
      title: "Current challenges",
      paragraphs: [{
        parts: [
          wikiText("Reported challenges include "),
          wikiText(ctx.benchmarkContext.biggestChallenges.trim()),
          wikiCite(challengeRef),
          wikiText("."),
        ],
      }],
    });
  }

  return { compact, sections, references };
}

function wikiParagraphPlainText(paragraph: WikiParagraph): string {
  return paragraph.parts
    .filter((part): part is { text: string } => "text" in part)
    .map(part => part.text)
    .join("")
    .trim();
}

function renderWikiParagraph(
  paragraph: WikiParagraph,
  keyPrefix: string,
  onCiteClick?: (refId: number) => void,
) {
  return paragraph.parts.map((part, index) => {
    if ("refId" in part) {
      return (
        <button
          key={`${keyPrefix}-cite-${index}`}
          type="button"
          className="sc-wiki-cite"
          onClick={() => onCiteClick?.(part.refId)}
          aria-label={`Source ${part.refId}`}
        >
          [{part.refId}]
        </button>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{part.text}</span>;
  });
}

function buildTrackPitchBrief(cat: CategoryData) {
  const metricHighlights = cat.metricWeights
    .filter(metric => metric.display !== "—" && metric.display !== "Not logged")
    .slice(0, 3);

  return {
    score: cat.score,
    narrative: cat.glanceFocus || cat.insight,
    strengths: [cat.glanceStrength, ...cat.glanceStrengthItems.slice(0, 1).map(item => item.detail)].filter(Boolean),
    risks: [cat.glanceNeedsWork, ...cat.glanceWeaknessItems.slice(0, 1).map(item => item.detail)].filter(Boolean),
    metricHighlights,
  };
}

function synthesizeTrackOperatingAnalysis(category: ScorecardCategory, answers: DetailAnswers): string | null {
  const rows = buildDetailFieldRows(category, answers).filter(row => row.value);
  if (!rows.length) return null;

  const insights = rows
    .map(row => row.note || (row.value ? DETAIL_ANSWER_IMPACT[row.id]?.[row.value] : undefined))
    .filter((line): line is string => Boolean(line));

  const meta = CATEGORY_META[category];
  if (!insights.length) {
    return `Fuel mapped ${rows.length} operating inputs on ${meta.label} — enough to anchor a peer comparison, with more depth available as you add context.`;
  }

  const opening = category === "dev"
    ? "On product and engineering,"
    : category === "mkt"
      ? "On go to market,"
      : "On finance and operations,";

  if (insights.length === 1) return `${opening} ${insights[0]}`;
  return `${opening} ${insights[0]} ${insights[1]}`;
}

function buildFounderNarrativeParagraph(benchmarkContext?: ScorecardBenchmarkContext): string | null {
  const parts: string[] = [];
  if (benchmarkContext?.notableCustomers?.trim()) {
    parts.push(`Customer momentum centers on ${benchmarkContext.notableCustomers.trim()}.`);
  }
  if (benchmarkContext?.notableHires?.trim()) {
    parts.push(`Team build-out highlights ${benchmarkContext.notableHires.trim()}.`);
  }
  if (benchmarkContext?.biggestChallenges?.trim()) {
    parts.push(`Near-term management priority: ${benchmarkContext.biggestChallenges.trim()}.`);
  }
  if (benchmarkContext?.otherUpdates?.trim()) {
    parts.push(benchmarkContext.otherUpdates.trim());
  }
  return parts.length ? parts.join(" ") : null;
}

type InvestorSnapshotRow = {
  id: string;
  label: string;
  you: string;
  colour: string;
  p25: string;
  p50: string;
  p75: string;
  p90: string;
  band: string;
  tier: PositionTier;
  isStrong: boolean;
};

const SNAPSHOT_BAND_LABELS: Record<PositionTier, string> = {
  top: "Top decile",
  upper: "Above median",
  mid: "Around median",
  lower: "Below median",
  bottom: "Below cohort",
};

const EFFICIENCY_EXTRA_COHORTS: {
  id: "cacPayback" | "burnMultiple";
  label: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  lowerIsBetter: boolean;
  format: (n: number) => string;
}[] = [
  {
    id: "cacPayback",
    label: "CAC payback",
    p25: 10,
    p50: 16,
    p75: 26,
    p90: 30,
    lowerIsBetter: true,
    format: n => `${Math.round(n)} mo`,
  },
  {
    id: "burnMultiple",
    label: "Burn multiple",
    p25: 1.3,
    p50: 2.1,
    p75: 3.4,
    p90: 5,
    lowerIsBetter: true,
    format: n => `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}x`,
  },
];

function tierFromCohortBands(
  value: number,
  p25: number,
  p50: number,
  p75: number,
  p90: number,
  lowerIsBetter?: boolean,
): PositionTier {
  if (lowerIsBetter) {
    if (value <= p25) return "top";
    if (value <= p50) return "upper";
    if (value <= p75) return "mid";
    if (value <= p90) return "lower";
    return "bottom";
  }
  if (value >= p90) return "top";
  if (value >= p75) return "upper";
  if (value >= p50) return "mid";
  if (value >= p25) return "lower";
  return "bottom";
}

function buildInvestorSnapshotRows(
  metrics: EvaluatedMetric[],
  extras?: ScorecardEfficiencyExtras | null,
): InvestorSnapshotRow[] {
  const fromMetrics: InvestorSnapshotRow[] = metrics
    .filter(metric => metric.value != null)
    .map(metric => ({
      id: metric.key,
      label: metric.label,
      you: metric.display,
      colour: metric.colour,
      p25: metric.p25Display,
      p50: metric.p50Display,
      p75: metric.p75Display,
      p90: metric.p90Display,
      band: SNAPSHOT_BAND_LABELS[metric.tier],
      tier: metric.tier,
      isStrong: metric.tier === "top" || metric.tier === "upper",
    }));

  const fromExtras: InvestorSnapshotRow[] = EFFICIENCY_EXTRA_COHORTS.flatMap(cohort => {
    const raw = extras?.[cohort.id]?.trim() ?? "";
    const value = parseMetricValue(raw);
    if (value == null) return [];
    const tier = tierFromCohortBands(value, cohort.p25, cohort.p50, cohort.p75, cohort.p90, cohort.lowerIsBetter);
    const colour = getBenchmarkTierStyle(tier).value;
    return [{
      id: cohort.id,
      label: cohort.label,
      you: cohort.format(value),
      colour,
      p25: cohort.format(cohort.p25),
      p50: cohort.format(cohort.p50),
      p75: cohort.format(cohort.p75),
      p90: cohort.format(cohort.p90),
      band: SNAPSHOT_BAND_LABELS[tier],
      tier,
      isStrong: tier === "top" || tier === "upper",
    }];
  });

  // Keep core metrics first; insert efficiency extras after gross margin when present.
  const core = fromMetrics;
  const gmIdx = core.findIndex(row => row.id === "grossMargin");
  if (fromExtras.length && gmIdx >= 0) {
    return [...core.slice(0, gmIdx + 1), ...fromExtras, ...core.slice(gmIdx + 1)];
  }
  return [...core, ...fromExtras];
}

function buildInvestorStandCopy(
  companyName: string,
  rows: InvestorSnapshotRow[],
  runway: number | null,
  cohortLabel: string,
  challenges?: string,
): string[] {
  if (!rows.length) {
    return [`${companyName} has not published benchmark metrics for this period, so peer comparison is not available yet.`];
  }

  const strong = rows.filter(row => row.isStrong);
  const weak = rows.filter(row => row.tier === "bottom" || row.tier === "lower");
  const paragraphs: string[] = [];

  if (strong.length) {
    const names = strong.slice(0, 3).map(row => `${row.label} (${row.you})`).join(", ");
    paragraphs.push(
      `${companyName} sits at or above the ${cohortLabel} median on ${names}.`
      + (runway != null ? ` Reported cash runway is about ${Math.round(runway)} months at the logged burn rate.` : ""),
    );
  } else if (runway != null) {
    paragraphs.push(
      `${companyName} reports roughly ${Math.round(runway)} months of runway against logged cash and burn, pointing to a relatively stronger capital position in this period.`,
    );
  }

  if (weak.length) {
    const names = weak.slice(0, 3).map(row => `${row.label} at ${row.you} (${row.band.toLowerCase()})`).join("; ");
    paragraphs.push(
      `Relative to the same peer set, the company trails most clearly on ${names}, which weighs on the overall operating picture for this period.`
      + (challenges?.trim() ? ` Near-term challenge on record: ${challenges.trim()}.` : ""),
    );
  } else if (challenges?.trim()) {
    paragraphs.push(`Near-term challenge on record: ${challenges.trim()}.`);
  }

  if (!paragraphs.length) {
    paragraphs.push(
      `${companyName} tracks near the ${cohortLabel} cohort midpoints across logged metrics, with no single line item standing out as a clear outlier.`,
    );
  }

  return paragraphs;
}

function buildInvestorFocusAreas(rows: InvestorSnapshotRow[]): { title: string; text: string }[] {
  const weak = [...rows]
    .filter(row => row.tier === "bottom" || row.tier === "lower")
    .sort((a, b) => {
      const order: PositionTier[] = ["bottom", "lower", "mid", "upper", "top"];
      return order.indexOf(a.tier) - order.indexOf(b.tier);
    });

  const picks = weak.slice(0, 2);
  if (!picks.length) {
    return rows.filter(row => row.tier === "mid").slice(0, 2).map(row => ({
      title: `${row.label} (${row.you})`,
      text: `${row.label} is around the cohort median (${row.p50}), so this line sits with peers rather than pulling the snapshot ahead or behind.`,
    }));
  }

  return picks.map(row => ({
    title: `${row.label} (${row.you})`,
    text: `${row.label} is ${row.band.toLowerCase()} against a cohort median of ${row.p50} (p25 ${row.p25} · p75 ${row.p75}), marking a meaningful gap versus comparable companies in this period.`,
  }));
}

function buildPitchExecutiveSummary(
  companyName: string,
  categories: CategoryData[],
  runway: number | null,
  metricMap: Record<MetricKey, EvaluatedMetric>,
  cohortLabel: string,
  contextPct: number,
): string {
  const arr = metricMap.arr;
  const nrr = metricMap.nrr;
  const headlineMetrics = [
    arr?.value != null ? `${arr.display} ARR (${arr.positionLabel.toLowerCase()})` : null,
    nrr?.value != null ? `${nrr.display} NRR` : null,
    runway != null ? `~${runway} mo runway` : null,
  ].filter(Boolean);

  const trackScores = categories.map(cat => `${cat.label} ${cat.score}/100`).join(" · ");
  const metricsClause = headlineMetrics.length
    ? ` Headline numbers: ${headlineMetrics.join(" · ")}.`
    : "";

  return `${companyName} in ${cohortLabel}.${metricsClause} Composite operating score across tracks: ${trackScores}. This brief synthesizes benchmark position, operating context, and intelligence into an investor-style read — not a raw export of form fields (${contextPct}% profile context on file).`;
}

function parseInitiativeDueSortKey(due?: string): number {
  const raw = due?.trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const quarter = raw.match(/^(\d{4})\s*[-/]?\s*q([1-4])$/i);
  if (quarter) {
    const year = Number(quarter[1]);
    const q = Number(quarter[2]);
    return Date.UTC(year, (q - 1) * 3, 1);
  }
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return iso;
  return Number.POSITIVE_INFINITY;
}

function formatInitiativeDueLabel(due?: string): string {
  const raw = due?.trim();
  if (!raw) return "No target date";
  const quarter = raw.match(/^(\d{4})\s*[-/]?\s*q([1-4])$/i);
  if (quarter) return `Q${quarter[2]} ${quarter[1]}`;
  return raw;
}

function initiativeDueMeta(due?: string, now = new Date()): { period: string; context: string } {
  const period = formatInitiativeDueLabel(due);
  const key = parseInitiativeDueSortKey(due);
  if (!Number.isFinite(key)) return { period: "No target date", context: "" };
  const currentQStart = Date.UTC(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const nextQStart = Date.UTC(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
  if (key >= currentQStart && key < nextQStart) return { period, context: "In progress now" };
  if (key < currentQStart) return { period, context: "Previous quarter" };
  return { period, context: "Upcoming" };
}

function pillarCoverageMeta(count: number): { label: string; tone: "blind" | "thin" | "healthy" } {
  if (count <= 0) return { label: "Blind spot", tone: "blind" };
  if (count === 1) return { label: "Thin coverage", tone: "thin" };
  return { label: "Healthy", tone: "healthy" };
}

function initiativeStatusMeta(status?: string): { label: string; tone: "active" | "done" | "paused" | "suggested" } {
  const normalized = (status ?? "Active").trim().toLowerCase();
  if (normalized === "done" || normalized === "completed") return { label: "Completed", tone: "done" };
  if (normalized === "suggested" || normalized === "draft") return { label: "Suggested", tone: "suggested" };
  if (normalized === "paused") return { label: "Paused", tone: "paused" };
  return { label: "Active", tone: "active" };
}

function ScorecardBreadcrumb({
  onOverview,
  current,
  endAction,
}: {
  onOverview: () => void;
  current: string;
  endAction?: React.ReactNode;
}) {
  return (
    <div className="sc-scorecard-breadcrumb-row">
      <nav className="sc-scorecard-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="sc-scorecard-breadcrumb-link" onClick={onOverview}>
          Overview
        </button>
        <span className="sc-scorecard-breadcrumb-sep" aria-hidden="true">/</span>
        <span className="sc-scorecard-breadcrumb-current" aria-current="page">{current}</span>
      </nav>
      {endAction ? <div className="sc-scorecard-breadcrumb-actions">{endAction}</div> : null}
    </div>
  );
}

function OverviewFullSummaryPage({
  companyName,
  summary,
  metrics,
  metricMap,
  categories,
  runway,
  buildContext,
  cohortLabel,
  documentSlots,
  efficiencyExtras,
  activeInitiatives = [],
  onClose,
  highlightRefId = null,
}: {
  companyName: string;
  summary: WikiSummaryContent;
  metrics: EvaluatedMetric[];
  metricMap: Record<MetricKey, EvaluatedMetric>;
  categories: CategoryData[];
  runway: number | null;
  buildContext: CategoryBuildContext;
  cohortLabel: string;
  documentSlots?: ScorecardDocumentSlot[];
  efficiencyExtras?: ScorecardEfficiencyExtras | null;
  activeInitiatives?: ScorecardActiveInitiative[];
  onClose: () => void;
  highlightRefId?: number | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const profileMeta = buildContext.profileMeta;
  const benchmarkContext = buildContext.benchmarkContext;
  const productDescription = buildContext.detailAnswers.profile_product_description?.trim()
    || buildContext.onboardingAnswers?.profileProductDescription?.trim()
    || "";
  const additionalContext = buildContext.detailAnswers.profile_additional_context?.trim()
    || buildContext.onboardingAnswers?.profileAdditionalContext?.trim()
    || "";
  const topPriorities = buildContext.detailAnswers.profile_top_priorities?.trim() || "";
  const publicDataCorrections = buildContext.detailAnswers.profile_public_data_wrong?.trim() || "";
  const biggestRisk = buildContext.detailAnswers.profile_biggest_risk?.trim() || "";
  const headcount = buildContext.detailAnswers.profile_headcount?.trim() || "";
  const hasCompanyFacts = Boolean(
    profileMeta?.sector || profileMeta?.headquarters || profileMeta?.employees || profileMeta?.domain || headcount,
  );
  const hasAboutSection = Boolean(
    productDescription || additionalContext || topPriorities || publicDataCorrections || biggestRisk || hasCompanyFacts,
  );
  const reportDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const now = new Date();
  const snapshotRows = buildInvestorSnapshotRows(metrics, efficiencyExtras);
  const standCopy = buildInvestorStandCopy(
    companyName,
    snapshotRows,
    runway,
    cohortLabel,
    benchmarkContext?.biggestChallenges,
  );
  const focusAreas = buildInvestorFocusAreas(snapshotRows);
  const filledDocs = (documentSlots ?? []).filter(slot => slot.current);

  const operatingGroups = (["dev", "mkt", "rev"] as ScorecardCategory[]).map(id => {
    const rows = buildDetailFieldRows(id, buildContext.detailAnswers)
      .filter(row => row.value);
    return {
      id,
      label: CATEGORY_META[id].fullLabel,
      rows,
    };
  }).filter(group => group.rows.length > 0);

  const scrollToRef = (refId: number) => {
    panelRef.current?.querySelector(`#wiki-ref-${refId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    if (highlightRefId == null) return;
    scrollToRef(highlightRefId);
  }, [highlightRefId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="sc-investor-brief sc-wiki-full-page" ref={panelRef}>
      <div className="sc-investor-brief-chrome">
        <ScorecardBreadcrumb
          onOverview={onClose}
          current={`About ${companyName}`}
          endAction={(
            <button type="button" className="sc-investor-brief-print" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
          )}
        />
      </div>

      <header className="sc-investor-brief-masthead">
        <div className="sc-investor-brief-masthead-brand">
          <span className="sc-investor-brief-logo" aria-hidden="true">F</span>
          <div>
            <strong>Fuel</strong>
            <em>{companyName}</em>
          </div>
        </div>
        <div className="sc-investor-brief-masthead-meta">
          <strong>{reportDate}</strong>
        </div>
      </header>

      {hasAboutSection ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">About</h3>
          {productDescription ? (
            <p className="sc-investor-brief-body">{productDescription}</p>
          ) : null}
          {additionalContext ? (
            <div className="sc-investor-brief-profile-field">
              <p className="sc-investor-brief-analysis-label">Additional context</p>
              <p className="sc-investor-brief-body">{additionalContext}</p>
            </div>
          ) : null}
          {topPriorities ? (
            <div className="sc-investor-brief-profile-field">
              <p className="sc-investor-brief-analysis-label">Top priorities</p>
              <p className="sc-investor-brief-body">{topPriorities}</p>
            </div>
          ) : null}
          {biggestRisk ? (
            <div className="sc-investor-brief-profile-field">
              <p className="sc-investor-brief-analysis-label">Biggest risk</p>
              <p className="sc-investor-brief-body">{biggestRisk}</p>
            </div>
          ) : null}
          {publicDataCorrections ? (
            <div className="sc-investor-brief-profile-field">
              <p className="sc-investor-brief-analysis-label">Public data corrections</p>
              <p className="sc-investor-brief-body">{publicDataCorrections}</p>
            </div>
          ) : null}
          {hasCompanyFacts ? (
          <dl className="sc-investor-brief-facts">
            {profileMeta?.sector ? (
              <>
                <dt>Sector</dt>
                <dd>{profileMeta.sector}</dd>
              </>
            ) : null}
            {profileMeta?.headquarters ? (
              <>
                <dt>Headquarters</dt>
                <dd>{profileMeta.headquarters}</dd>
              </>
            ) : null}
            {headcount ? (
              <>
                <dt>Headcount (FTE)</dt>
                <dd>{headcount}</dd>
              </>
            ) : null}
            {profileMeta?.employees ? (
              <>
                <dt>Team size</dt>
                <dd>{profileMeta.employees}</dd>
              </>
            ) : null}
            {profileMeta?.domain ? (
              <>
                <dt>Domain</dt>
                <dd>{profileMeta.domain}</dd>
              </>
            ) : null}
          </dl>
          ) : null}
        </section>
      ) : null}

      <section className="sc-investor-brief-block">
        <h3 className="sc-investor-brief-h3">Snapshot</h3>
        {snapshotRows.length === 0 ? (
          <p className="sc-investor-brief-empty">No metrics logged for this period.</p>
        ) : (
          <>
            <div className="sc-investor-brief-table-wrap">
              <table className="sc-investor-brief-table">
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">You</th>
                    <th scope="col">Cohort p50</th>
                    <th scope="col">p25</th>
                    <th scope="col">p75</th>
                    <th scope="col">p90</th>
                    <th scope="col">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotRows.map(row => (
                    <tr key={row.id}>
                      <td>{row.label}</td>
                      <td>
                        <strong className="sc-investor-brief-you" style={{ color: row.colour }}>{row.you}</strong>
                      </td>
                      <td>{row.p50}</td>
                      <td>{row.p25}</td>
                      <td>{row.p75}</td>
                      <td>{row.p90}</td>
                      <td>
                        <span className={`sc-investor-brief-band sc-investor-brief-band--${row.tier}`}>
                          {row.isStrong ? <span className="sc-investor-brief-check" aria-hidden="true">✓</span> : null}
                          {row.band}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sc-investor-brief-cohort-note">
              Peer cohort: {cohortLabel}. Values from the latest private benchmark submission.
            </p>
          </>
        )}
      </section>

      {snapshotRows.length > 0 ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">Cohort position</h3>
          <p className="sc-investor-brief-analysis-label">Fuel analysis</p>
          {standCopy.map((paragraph, index) => (
            <p className="sc-investor-brief-body" key={`stand-${index}`}>{paragraph}</p>
          ))}
        </section>
      ) : null}

      {focusAreas.length > 0 ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">Areas to watch</h3>
          <p className="sc-investor-brief-analysis-label">Fuel analysis</p>
          <div className="sc-investor-brief-table-wrap">
            <table className="sc-investor-brief-table sc-investor-brief-notes-table">
              <thead>
                <tr>
                  <th scope="col">Area</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {focusAreas.map(area => (
                  <tr key={area.title}>
                    <td>{area.title}</td>
                    <td>{area.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {(metricMap.cashOnHand?.value != null || metricMap.monthlyBurn?.value != null || runway != null) ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">Capital &amp; runway</h3>
          <dl className="sc-investor-brief-facts">
            {metricMap.cashOnHand?.value != null ? (
              <>
                <dt>Cash on hand</dt>
                <dd style={{ color: metricMap.cashOnHand.colour }}>{metricMap.cashOnHand.display}</dd>
              </>
            ) : null}
            {metricMap.monthlyBurn?.value != null ? (
              <>
                <dt>Monthly net burn</dt>
                <dd style={{ color: metricMap.monthlyBurn.colour }}>{metricMap.monthlyBurn.display}</dd>
              </>
            ) : null}
            {runway != null ? (
              <>
                <dt>Runway</dt>
                <dd>~{Math.round(runway)} mo</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      {operatingGroups.length > 0 ? (
        <section className="sc-investor-brief-block sc-investor-brief-ops-block">
          <h3 className="sc-investor-brief-h3">Operating profile</h3>
          <p className="sc-investor-brief-source-note">
            From stored onboarding and View details answers only — not generated metrics.
          </p>
          <div className="sc-investor-brief-ops">
            {operatingGroups.map(group => (
              <div key={group.id} className="sc-investor-brief-ops-group">
                <h4>{group.label}</h4>
                <div className="sc-investor-brief-ops-grid">
                  {group.rows.map(row => (
                    <div key={row.id} className="sc-investor-brief-ops-item">
                      <span className="sc-investor-brief-ops-label">{row.label}</span>
                      <p className="sc-investor-brief-ops-value">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sc-investor-brief-block sc-investor-brief-initiatives">
        <h3 className="sc-investor-brief-h3">Initiatives roadmap</h3>
        <p className="sc-investor-brief-source-note">
          Strategic pillars with active work ordered by target date. Suggested scorecard ideas are not listed here.
        </p>

        <div className="overview-panel sc-investor-brief-roadmap-board">
          <div className="sc-investor-brief-roadmap-legend" aria-label="Coverage legend">
            <span className="sc-investor-brief-roadmap-legend-item is-blind">Blind spot</span>
            <span className="sc-investor-brief-roadmap-legend-item is-thin">Thin coverage</span>
            <span className="sc-investor-brief-roadmap-legend-item is-healthy">Healthy</span>
          </div>
          <div className="sc-investor-brief-roadmap">
            <div className="sc-investor-brief-roadmap-topline" aria-hidden="true" />
            {categories.map(cat => {
            const pillarInits = activeInitiatives
              .filter(item => item.pillar === cat.id)
              .slice()
              .sort((a, b) => {
                const dueDiff = parseInitiativeDueSortKey(a.due) - parseInitiativeDueSortKey(b.due);
                if (dueDiff !== 0) return dueDiff;
                return a.title.localeCompare(b.title);
              });
            const coverage = pillarCoverageMeta(pillarInits.length);
            return (
              <div
                key={cat.id}
                className="sc-investor-brief-pillar-col"
                style={{
                  "--pillar-col": cat.colour,
                  "--pillar-col-dim": cat.colourDim,
                  "--pillar-col-border": cat.colourBorder,
                } as React.CSSProperties}
              >
                <div className="sc-investor-brief-pillar-cap" aria-hidden="true">
                  <span className="sc-investor-brief-pillar-dot" />
                  <span className="sc-investor-brief-pillar-drop" />
                </div>

                <article className="sc-investor-brief-pillar-card">
                  <span className="sc-investor-brief-pillar-title-pill">{cat.fullLabel}</span>
                  <p className="sc-investor-brief-pillar-card-desc">
                    {TRACK_DETAIL_SECTIONS.find(s => s.id === cat.id)?.definition ?? cat.description}
                  </p>
                  <div className="sc-investor-brief-pillar-card-meta">
                    <strong className="sc-investor-brief-pillar-count">{pillarInits.length}</strong>
                    <span className={`sc-investor-brief-pillar-coverage is-${coverage.tone}`}>
                      {coverage.label}
                    </span>
                  </div>
                  <div className="sc-investor-brief-pillar-card-footer">
                    <span className="sc-investor-brief-pillar-tag">{cat.label}</span>
                  </div>
                </article>

                <div className={`sc-investor-brief-pillar-stack${pillarInits.length === 0 ? " is-empty" : ""}`}>
                  {pillarInits.length === 0 ? (
                    <div className="sc-investor-brief-pillar-empty">
                      <strong>No initiatives</strong>
                      <span>Blind spot on this pillar.</span>
                    </div>
                  ) : (
                    <ol className="sc-investor-brief-roadmap-timeline">
                      {pillarInits.map(init => {
                        const status = initiativeStatusMeta(init.status);
                        const dueMeta = initiativeDueMeta(init.due, now);
                        const hasDue = Boolean(init.due?.trim());
                        return (
                          <li key={init.id} className="sc-investor-brief-roadmap-item">
                            <div className={`sc-investor-brief-roadmap-due-row${hasDue ? "" : " is-undated"}`}>
                              <time className="sc-investor-brief-roadmap-due-pill">{dueMeta.period}</time>
                              {dueMeta.context ? (
                                <span className="sc-investor-brief-roadmap-due-context">{dueMeta.context}</span>
                              ) : null}
                            </div>
                            <article className={`sc-investor-brief-init-card is-${status.tone}`}>
                              <strong>{init.title}</strong>
                              <div className="sc-investor-brief-init-tags">
                                <span className={`sc-investor-brief-init-status is-${status.tone}`}>
                                  {status.label}
                                </span>
                                <span className="sc-investor-brief-init-pillar-tag">{cat.label}</span>
                              </div>
                              {init.description ? <p>{init.description}</p> : null}
                              <div className="sc-investor-brief-init-footer">
                                <em>{init.owner?.trim() || "Unassigned"}</em>
                              </div>
                            </article>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </section>

      <section className="sc-investor-brief-block sc-investor-brief-sources">
        <h3 className="sc-investor-brief-h3">Sources</h3>
        {filledDocs.length > 0 ? (
          <ul className="sc-investor-brief-docs">
            {filledDocs.map(slot => (
              <li key={slot.typeId}>
                <em>{slot.typeLabel}</em>
                <strong>{slot.current!.name}</strong>
              </li>
            ))}
          </ul>
        ) : null}
        <ol className="sc-investor-brief-refs">
          {summary.references.map(reference => (
            <li
              key={reference.id}
              id={`wiki-ref-${reference.id}`}
              className={highlightRefId === reference.id ? "is-highlighted" : ""}
            >
              <button type="button" className="sc-investor-brief-ref-btn" onClick={() => scrollToRef(reference.id)}>
                <strong>[{reference.id}] {reference.label}</strong>
              </button>
              <span>{reference.detail}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
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

function recActionsTipStorageKey(companyName: string): string {
  return `fuel-rec-actions-tip-${companyName}`;
}

function recActionsTipPendingKey(companyName: string): string {
  return `fuel-rec-actions-tip-pending-${companyName}`;
}

/** Call when Overview finishes post-onboarding build — survives navigating away from Overview. */
export function markRecActionsTipPending(companyName: string) {
  try {
    window.sessionStorage.setItem(recActionsTipPendingKey(companyName), "1");
  } catch { /* ignore */ }
}

/** Clear dismiss + pending so a new post-onboarding Overview build can queue the tip on ready. */
export function resetRecActionsTipForOnboarding(companyName: string) {
  try {
    window.localStorage.removeItem(recActionsTipStorageKey(companyName));
    window.sessionStorage.removeItem(recActionsTipPendingKey(companyName));
  } catch { /* ignore */ }
}

export function isRecActionsTipPending(companyName: string): boolean {
  try {
    return window.sessionStorage.getItem(recActionsTipPendingKey(companyName)) === "1";
  } catch {
    return false;
  }
}

export function isRecActionsTipDismissed(companyName: string): boolean {
  try {
    return window.localStorage.getItem(recActionsTipStorageKey(companyName)) === "1";
  } catch {
    return false;
  }
}

function clearRecActionsTipPending(companyName: string) {
  try {
    window.sessionStorage.removeItem(recActionsTipPendingKey(companyName));
  } catch { /* ignore */ }
}

export function dismissRecActionsTip(companyName: string) {
  try {
    window.localStorage.setItem(recActionsTipStorageKey(companyName), "1");
    clearRecActionsTipPending(companyName);
  } catch { /* ignore */ }
}

function RecommendedActionsShareTip({
  companyName,
  onDismiss,
}: {
  companyName: string;
  onDismiss: () => void;
}) {
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismissRef.current?.focus();
  }, []);

  return (
    <div className="sc-adv-rec-tip" role="dialog" aria-modal="true" aria-label="Why complete recommended actions">
      <span className="sc-adv-rec-tip-eyebrow">Start here</span>
      <strong className="sc-adv-rec-tip-title">This is how {companyName} gets an edge</strong>
      <p>
        Every metric, source, and track detail you add turns Fuel into a sharper operator for
        your company — clearer peer gaps, tighter priorities, and the moves that actually move
        growth. Incomplete inputs = generic advice. Finish these and you get a plan built on
        your numbers.
      </p>
      <p className="sc-adv-rec-tip-privacy">Your data is only visible to you.</p>
      <button
        ref={dismissRef}
        type="button"
        className="sc-adv-rec-tip-dismiss"
        onClick={onDismiss}
      >
        Got it
      </button>
    </div>
  );
}

type AdvisorRecAction = {
  title: string;
  sub: string;
  cta: string;
  done: boolean;
  credits: number;
  /** Set when this action's credit reward was already claimed. */
  creditsEarned?: number;
};

function buildAdvisorRecommendedActions(
  buildContext: CategoryBuildContext,
  mergedDetailAnswers: DetailAnswers,
  documentSlots: ScorecardDocumentSlot[] | undefined,
  benchmarkSaved: boolean,
  companyName: string,
  privateWorkspace = false,
  earnedProfileCredits?: EarnedProfileCredits,
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

  const detailTotal = countApplicableQuestions(mergedDetailAnswers);
  const detailAnswered = countTrackDetailAnswers(mergedDetailAnswers);
  const detailComplete = detailAnswered >= detailTotal;
  const detailRemaining = Math.max(0, detailTotal - detailAnswered);
  const onboardingSeeded = countTrackDetailAnswers(mapOnboardingToDetailAnswers(
    buildContext.onboardingAnswers ?? ({} as OnboardingFlowAnswers),
  ));
  const drawerAdded = Math.max(0, detailAnswered - onboardingSeeded);

  const docCount = documentSlots?.filter(s => s.current).length ?? 0;
  const userIntelCount = buildContext.intelligenceItems.filter(i => !i.id.startsWith("intel-bench-")).length;
  const hasUserSources = docCount > 0 || userIntelCount > 0;

  const sourcesNeedAction = !hasUserSources;
  const detailsNeedAction = !detailComplete || detailsQuarterStale;

  let benchmarkAction: AdvisorRecAction;
  if (privateWorkspace && benchMissing) {
    benchmarkAction = {
      title: "Log benchmark read",
      sub: `Your take on ${companyName}'s cohort metrics — ARR, burn, retention, and more.`,
      cta: "Log Benchmark",
      done: false,
      credits: 0,
    };
  } else if (privateWorkspace && benchPartial) {
    benchmarkAction = {
      title: "Finish benchmark read",
      sub: `${benchFilled} of ${benchTotal} metrics logged for ${companyName}.`,
      cta: "Continue",
      done: false,
    };
  } else if (privateWorkspace && benchQuarterStale) {
    benchmarkAction = {
      title: "Refresh benchmark read",
      sub: `${getCurrentQuarterLabel()} — update if their numbers moved since your last pass.`,
      cta: "Update Benchmark",
      done: false,
    };
  } else if (benchMissing) {
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
      title: privateWorkspace ? "Review benchmark read" : "Update Benchmark",
      sub: privateWorkspace
        ? "Refresh if anything shifted since you last logged numbers."
        : "Refresh numbers if anything shifted this quarter.",
      cta: privateWorkspace ? "Review Benchmark" : "Update Benchmark",
      done: true,
    };
  } else {
    benchmarkAction = {
      title: privateWorkspace ? "Review benchmark read" : "Review Benchmark",
      sub: privateWorkspace
        ? `${benchFilled} of ${benchTotal} metrics on file in your workspace.`
        : `${benchFilled} of ${benchTotal} cohort metrics on file.`,
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
      title: privateWorkspace ? "Review intelligence sources" : "Review Intelligence Sources",
      sub: sourceBits
        ? privateWorkspace
          ? `${sourceBits} — add more from calls, decks, or news.`
          : `${sourceBits} — add meetings, decks, or news.`
        : privateWorkspace
          ? "Keep sources current as you learn more about the company."
          : "Keep sources current for fresh intelligence.",
      cta: "Review Sources",
      done: true,
    };
  } else {
    sourcesAction = {
      title: privateWorkspace ? "Add intelligence sources" : "Add Intelligence Sources",
      sub: privateWorkspace
        ? "Calls, decks, articles — anything that informed your read. Private to you."
        : "Meetings, decks, news — fuel intelligence, initiatives & playbooks.",
      cta: privateWorkspace ? "Add Sources" : "+ Add Sources",
      done: false,
    };
  }

  let detailsAction: AdvisorRecAction;
  if (privateWorkspace && detailsQuarterStale && detailComplete) {
    detailsAction = {
      title: "Update track context",
      sub: "New quarter — refresh what you know about product, GTM, and finance.",
      cta: "Update Context",
      done: false,
    };
  } else if (privateWorkspace && detailComplete) {
    detailsAction = {
      title: "Review track context",
      sub: "All tracks filled — update when you learn something new.",
      cta: "Review Context",
      done: true,
    };
  } else if (privateWorkspace && detailAnswered === 0) {
    detailsAction = {
      title: "Add track context",
      sub: `R&D, GTM, and Finance — capture what you know about ${companyName} from diligence and conversations.`,
      cta: "Add Context",
      done: false,
    };
  } else if (privateWorkspace) {
    detailsAction = {
      title: "Add track context",
      sub: `${detailAnswered} of ${detailTotal} fields · ${detailRemaining} left across R&D, GTM, and Finance.`,
      cta: "Add Context",
      done: false,
    };
  } else if (detailsQuarterStale && detailComplete) {
    detailsAction = {
      title: "Update Company Details",
      sub: `New quarter — refresh product, go to market, and finance context.`,
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
  } else if (detailAnswered >= Math.ceil(detailTotal / 2)) {
    detailsAction = {
      title: "Complete Missing Details",
      sub: `${detailAnswered} of ${detailTotal} · ${detailRemaining} left to sharpen tracks.`,
      cta: "+ Add Details",
      done: false,
    };
  } else {
    detailsAction = {
      title: "Complete Missing Details",
      sub: onboardingSeeded > 0
        ? `${onboardingSeeded} from onboarding · ${detailRemaining} remaining.`
        : `${detailAnswered} of ${detailTotal} details added.`,
      cta: "+ Add Details",
      done: false,
    };
  }

  const benchmarkCredits = remainingBenchmarkRewardCredits(earnedProfileCredits);
  const benchmarkCreditsEarned = earnedProfileCredits?.benchmark && earnedProfileCredits?.benchmarkViaSubmit
    ? BENCHMARK_REWARD_CREDITS
    : 0;
  const profileCredits = detailComplete ? 0 : PROFILE_MODULE_EARNABLE_TOTAL;

  return [benchmarkAction, sourcesAction, detailsAction].map((action, index) => ({
    ...action,
    credits: index === 0
      ? benchmarkCredits
      : index === 2
        ? profileCredits
        : 0,
    creditsEarned: index === 0
      ? benchmarkCreditsEarned || undefined
      : undefined,
  }));
}

function RecommendedActionsColumn({
  title,
  actions,
  handlers,
  showShareTip = false,
  onDismissShareTip,
  companyName,
  tourHighlightRecommended = false,
}: {
  title: string;
  actions: AdvisorRecAction[];
  handlers: Array<(() => void) | undefined>;
  showShareTip?: boolean;
  onDismissShareTip?: () => void;
  companyName?: string;
  tourHighlightRecommended?: boolean;
}) {
  return (
    <div className="sc-adv-featured-rec-col">
      <div
        className={`sc-adv-rec-spotlight sc-adv-rec-spotlight--cards${showShareTip ? " is-active" : ""}${tourHighlightRecommended ? " tour-highlight" : ""}`}
        data-tour-target="recommended-actions"
      >
        <div className="sc-adv-rec-title-wrap">
          <div className="sc-adv-rec-title">{title}</div>
          {showShareTip && onDismissShareTip && companyName ? (
            <RecommendedActionsShareTip companyName={companyName} onDismiss={onDismissShareTip} />
          ) : null}
        </div>
        <ol className="sc-adv-rec-list sc-adv-rec-list--cards">
          {actions.map((action, i) => (
            <li key={`${action.title}-${i}`} className="sc-adv-rec-card">
              <div className="sc-adv-rec-card-top">
                <div className="sc-adv-rec-card-head">
                  <span className={`sc-adv-rec-num${action.done || action.creditsEarned ? " is-done" : ""}`}>{i + 1}</span>
                  <div className="sc-adv-rec-title-line">
                    <strong className="sc-adv-rec-name">{action.title}</strong>
                    {action.credits > 0 ? (
                      <span className="sc-adv-rec-credits">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <circle cx="4.2" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.1" />
                          <circle cx="7.8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.1" />
                        </svg>
                        +{action.credits} credits
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="sc-adv-rec-sub">{action.sub}</p>
              {action.creditsEarned ? (
                <p className="sc-adv-rec-earned" role="status">
                  <span className="sc-adv-rec-earned-icon" aria-hidden="true">✓</span>
                  +{action.creditsEarned} credits earned
                </p>
              ) : null}
              <button type="button" className="sc-adv-rec-cta" onClick={handlers[i]}>
                {action.cta} <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Private workspaces (other companies) only generate overview content after inputs exist. */
function isPrivateWorkspaceOverviewReady(
  benchmarkValues: BenchmarkValues,
  mergedDetailAnswers: DetailAnswers,
  documentSlots: ScorecardDocumentSlot[] | undefined,
  intelligenceItems: ScorecardIntelligenceItem[],
): boolean {
  const benchFilled = METRIC_COHORTS.filter(c => parseMetricValue(benchmarkValues[c.key] ?? "")).length;
  if (benchFilled === 0) return false;

  const hasSources = (documentSlots?.filter(s => s.current).length ?? 0) > 0
    || intelligenceItems.some(item => !item.id.startsWith("intel-bench-"));
  if (!hasSources) return false;

  return TRACK_DETAIL_SECTIONS.every(section =>
    countSectionAnswers(section, mergedDetailAnswers) > 0
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
  const status = signalUrgencyToStatus(urgency);
  if (urgency === "urgent") {
    const n = Math.max(1, cat.openInitiatives.length || cat.intelligenceCount || 1);
    return {
      suffix: `${n} new risk${n > 1 ? "s" : ""}`,
      suffixColour: COLOUR_WEAK(),
      dotColour: COLOUR_WEAK(),
      urgent: true,
      borderColour: statusLineCss(status),
    };
  }
  if (urgency === "ok") {
    return {
      suffix: "Stable",
      suffixColour: COLOUR_STRONG(),
      dotColour: COLOUR_STRONG(),
      urgent: false,
      borderColour: statusLineCss(status),
    };
  }
  return {
    suffix: "Watch",
    suffixColour: COLOUR_AROUND(),
    dotColour: COLOUR_AROUND(),
    urgent: false,
    borderColour: statusLineCss(status),
  };
}

function AdvisorSummaryBriefColumn({
  categories,
  runway,
  companyName,
  wikiSummary,
  onOpenWikiSummary,
  onOpenIntelligence,
  suggestionsReady = true,
  overviewBuildPhase = null,
  overviewBuiltPhases,
  reportReadiness = "none",
  layout = "default",
}: {
  categories: CategoryData[];
  runway: number | null;
  companyName: string;
  wikiSummary: WikiSummaryContent;
  onOpenWikiSummary: (highlightRefId?: number) => void;
  onOpenIntelligence?: () => void;
  suggestionsReady?: boolean;
  overviewBuildPhase?: OverviewBuildPhase | null;
  overviewBuiltPhases?: ReadonlySet<OverviewBuildPhase>;
  reportReadiness?: ReportReadiness;
  layout?: "default" | "workspace";
}) {
  const signalTags = (
    <>
      <div className="sc-adv-tags-label">Recent signals</div>
      <div className="sc-adv-tags">
        {categories.map(cat => {
          const signalReady = overviewTrackReady(cat.id, overviewBuildPhase, overviewBuiltPhases);
          const tag = signalReady ? trackSignalTag(cat, runway) : null;
          const totalCount = signalReady
            ? cat.intelDisplayCount
              + (suggestionsReady ? cat.openInitiatives.length : 0)
              + (suggestionsReady ? cat.suggestedPlaybooks.length : 0)
            : null;
          return (
            <button
              key={cat.id}
              type="button"
              className={`sc-adv-tag${tag?.urgent ? " is-urgent" : ""}`}
              style={tag?.borderColour ? { borderColor: tag.borderColour } : undefined}
              onClick={() => onOpenIntelligence?.()}
              aria-label={
                tag && totalCount != null
                  ? `${cat.label} ${tag.suffix} — ${totalCount} total`
                  : `${cat.label} — loading`
              }
            >
              <span
                className="sc-adv-tag-dot"
                style={tag ? { background: tag.dotColour } : undefined}
              />
              {cat.label}
              {tag ? <i style={{ color: tag.suffixColour }}>{tag.suffix}</i> : null}
              {totalCount != null ? <i className="sc-adv-tag-total">{totalCount}</i> : null}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className={`sc-adv-featured-brief-col${layout === "workspace" ? " sc-adv-brief-col--workspace" : ""}`}>
      <div className="sc-adv">
        <div className="sc-adv-head">
          <span className="sc-adv-label">✦ Fuel AI · Advisor</span>
          <span className="sc-adv-company">{companyName}</span>
        </div>
        <div className="sc-adv-rec-title-row">
          <div className="sc-adv-rec-title">Summary</div>
          {reportReadiness === "early" ? (
            <span className="sc-adv-early-report-badge">Early report</span>
          ) : null}
          <span className="sc-wiki-source-count">
            {wikiSummary.references.length} source{wikiSummary.references.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className="ask-ai-btn sc-wiki-expand-btn"
            onClick={() => onOpenWikiSummary()}
            aria-label="Open company brief"
          >
            ✦ Open brief
          </button>
        </div>
        {layout === "workspace" ? (
          <div className="sc-adv-brief-workspace-body">
            <div className="sc-adv-brief-workspace-copy">
              <p className="sc-adv-summary sc-wiki-summary-compact">
                {wikiParagraphPlainText(wikiSummary.compact)}
              </p>
              {reportReadiness === "early" ? (
                <p className="sc-adv-early-report-note">
                  Based on what you&apos;ve shared so far. Complete remaining modules for deeper insights and sharper recommendations.
                </p>
              ) : null}
              <button
                type="button"
                className="sc-wiki-view-more sc-wiki-view-more--workspace-cta"
                onClick={() => onOpenWikiSummary()}
              >
                View brief with references →
              </button>
            </div>
            <div className="sc-adv-brief-workspace-signals">
              {signalTags}
            </div>
          </div>
        ) : (
          <>
            <p className="sc-adv-summary sc-wiki-summary-compact">
              {wikiParagraphPlainText(wikiSummary.compact)}
            </p>
            {reportReadiness === "early" ? (
              <p className="sc-adv-early-report-note">
                Based on what you&apos;ve shared so far. Complete remaining modules for deeper insights and sharper recommendations.
              </p>
            ) : null}
            <button
              type="button"
              className="sc-wiki-view-more"
              onClick={() => onOpenWikiSummary()}
            >
              View brief with references
            </button>
            {signalTags}
          </>
        )}
      </div>
    </div>
  );
}

function OverviewWorkspaceSetupPanel({
  companyName,
  actions,
  onEditBenchmark,
  onAddSources,
  onViewDetails,
  showShareTip = false,
  onDismissShareTip,
  tourHighlightRecommended = false,
}: {
  companyName: string;
  actions: AdvisorRecAction[];
  onEditBenchmark?: () => void;
  onAddSources?: () => void;
  onViewDetails?: () => void;
  showShareTip?: boolean;
  onDismissShareTip?: () => void;
  tourHighlightRecommended?: boolean;
}) {
  const handlers = [onEditBenchmark, onAddSources, onViewDetails];

  return (
    <div className="sc-adv-featured sc-adv-featured-split">
      <div className="sc-adv-featured-brief-col">
        <div className="sc-adv">
          <div className="sc-adv-head">
            <span className="sc-adv-label">✦ Your private workspace</span>
            <span className="sc-adv-company">{companyName}</span>
          </div>
          <div className="sc-adv-rec-title">Getting started</div>
          <p className="sc-adv-summary">
            Build your private view of {companyName}. Add benchmark metrics, intelligence sources,
            and at least one answer in each of R&amp;D, GTM, and Finance to generate your overview.
            Whatever you add here is your personal setup.
          </p>
        </div>
      </div>
      <RecommendedActionsColumn
        title="Next steps"
        actions={actions}
        handlers={handlers}
        showShareTip={showShareTip}
        onDismissShareTip={onDismissShareTip}
        companyName={companyName}
        tourHighlightRecommended={tourHighlightRecommended}
      />
    </div>
  );
}

// ─── UI: Advisor panel (sc-adv split layout + existing scorecard content) ───
function OverviewAdvisorPanel({
  categories,
  runway,
  companyName,
  buildContext,
  benchmarkSaved = false,
  privateWorkspace = false,
  onOpenIntelligence,
  onEditBenchmark,
  onAddSources,
  onViewDetails: _onViewDetails,
  documentSlots,
  wikiSummary,
  onOpenWikiSummary,
  suggestionsReady = true,
  overviewBuildPhase = null,
  overviewBuiltPhases,
  reportReadiness = "none",
  showShareTip = false,
  onDismissShareTip,
  tourHighlightRecommended = false,
  earnedProfileCredits,
  showBriefSummary = true,
  showRecommendedActions = true,
}: {
  categories: CategoryData[];
  runway: number | null;
  companyName: string;
  buildContext: CategoryBuildContext;
  benchmarkSaved?: boolean;
  privateWorkspace?: boolean;
  onOpenIntelligence?: () => void;
  onEditBenchmark?: () => void;
  onAddSources?: () => void;
  onViewDetails?: () => void;
  documentSlots?: ScorecardDocumentSlot[];
  wikiSummary: WikiSummaryContent;
  onOpenWikiSummary: (highlightRefId?: number) => void;
  suggestionsReady?: boolean;
  overviewBuildPhase?: OverviewBuildPhase | null;
  overviewBuiltPhases?: ReadonlySet<OverviewBuildPhase>;
  reportReadiness?: ReportReadiness;
  showShareTip?: boolean;
  onDismissShareTip?: () => void;
  tourHighlightRecommended?: boolean;
  earnedProfileCredits?: EarnedProfileCredits;
  /** Summary + recent signals — workspace hides until Complete Profile is done. */
  showBriefSummary?: boolean;
  showRecommendedActions?: boolean;
}) {
  // Track/company details live in the 5-step profile unlock form — keep advisor to benchmark + sources only.
  const actions = buildAdvisorRecommendedActions(
    buildContext,
    buildContext.detailAnswers,
    documentSlots,
    benchmarkSaved,
    companyName,
    privateWorkspace,
    earnedProfileCredits,
  ).slice(0, 2);
  const actionHandlers = [onEditBenchmark, onAddSources];

  return (
    <div className={`sc-adv-featured sc-adv-featured-split${showBriefSummary ? "" : " is-brief-hidden"}${showRecommendedActions ? "" : " is-rec-hidden"}`}>
      {showBriefSummary ? (
        <AdvisorSummaryBriefColumn
          categories={categories}
          runway={runway}
          companyName={companyName}
          wikiSummary={wikiSummary}
          onOpenWikiSummary={onOpenWikiSummary}
          onOpenIntelligence={onOpenIntelligence}
          suggestionsReady={suggestionsReady}
          overviewBuildPhase={overviewBuildPhase}
          overviewBuiltPhases={overviewBuiltPhases}
          reportReadiness={reportReadiness}
        />
      ) : null}
      {showRecommendedActions ? (
      <RecommendedActionsColumn
        title={privateWorkspace ? "Next steps" : "Recommended Actions"}
        actions={actions}
        handlers={actionHandlers}
        showShareTip={showShareTip}
        onDismissShareTip={onDismissShareTip}
        companyName={companyName}
        tourHighlightRecommended={tourHighlightRecommended}
      />
      ) : null}
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
  weaknesses,
  yorkOffer = null,
}: {
  strengths: TrackInsightItem[];
  weaknesses: TrackInsightItem[];
  yorkOffer?: YorkServiceOffer | null;
}) {
  const gapLabels = weaknesses.map(item => item.label).filter(Boolean);
  const hasAny = strengths.length > 0 || weaknesses.length > 0;
  const [yorkHidden, setYorkHidden] = useState(
    () => !yorkOffer || isYorkOfferDismissed(yorkOffer.id),
  );
  useEffect(() => {
    setYorkHidden(!yorkOffer || isYorkOfferDismissed(yorkOffer.id));
  }, [yorkOffer?.id]);
  const yorkNudge = yorkOffer && !yorkHidden ? (
    <YorkPartnerNudge
      offer={yorkOffer}
      variant="bar"
      className="york-nudge--detail"
      firstName="Shreya"
      gapLabels={gapLabels}
      cta="Talk to York IE"
      onDismissed={() => setYorkHidden(true)}
    />
  ) : null;

  if (!hasAny) {
    return (
      <>
        <p className="sc-cat-sw-empty sc-detail-insights-empty">
          No track insights yet — add profile answers, benchmarks, or sources.
        </p>
        {yorkNudge}
      </>
    );
  }

  return (
    <div className="sc-detail-insights-action">
      <DetailInsightChipStrip
        tone="strong"
        label="What's working"
        items={strengths}
        empty="No strengths flagged yet."
      />
      <DetailInsightChipStrip
        tone="weak"
        label="Needs improvement"
        items={weaknesses}
        empty="No gaps flagged yet."
      />
      {yorkNudge}
    </div>
  );
}

function DetailInsightChipStrip({
  tone,
  label,
  items,
  empty,
}: {
  tone: "strong" | "weak";
  label: string;
  items: TrackInsightItem[];
  empty: string;
}) {
  return (
    <div className={`sc-detail-insights-strip is-${tone}`}>
      <span className="sc-detail-insights-section-label">{label}</span>
      {items.length > 0 ? (
        <div className="sc-detail-strength-chips" role="list">
          {items.map(item => {
            const why = stripInsightSourceSuffix(item.detail) || item.label;
            const chipLabel = shortInsightChipLabel(item.label);
            return (
              <span
                key={item.id}
                className={`sc-detail-insight-chip is-${tone}`}
                role="listitem"
                tabIndex={0}
                aria-label={`${chipLabel}. ${why}`}
              >
                <span className="sc-detail-insight-chip-label">{chipLabel}</span>
                <span className="sc-detail-insight-tip" role="tooltip">
                  <strong>{tone === "strong" ? "Why it's working" : "Why it needs work"}</strong>
                  <em>{why}</em>
                </span>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="sc-cat-sw-empty">{empty}</p>
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
  const detailSection = TRACK_DETAIL_SECTIONS.find(s => s.id === cat.id);
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
                    <span className="sc-detail-form-flag is-missing">Missing</span>
                  ) : row.tone === "concern" ? (
                    <span className="sc-detail-form-flag is-concern">Needs attention</span>
                  ) : row.tone === "watch" ? (
                    <span className="sc-detail-form-flag is-watch">Watch</span>
                  ) : null}
                </div>
                <div className="sc-detail-form-value">{row.value ?? "Not answered"}</div>
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
  active = [],
  categoryId,
  categoryColour,
  weaknesses = [],
  onAddInitiative,
  onOpenInitiatives,
  onViewInitiative,
}: {
  suggested: CategoryInitiative[];
  active?: ScorecardActiveInitiative[];
  categoryId: ScorecardCategory;
  categoryColour: string;
  weaknesses?: TrackInsightItem[];
  onAddInitiative?: (initiative: ScorecardActiveInitiative) => void;
  onOpenInitiatives?: () => void;
  onViewInitiative?: (id: string) => void;
}) {
  const activeForTrack = active.filter(item => {
    if (item.pillar && item.pillar !== categoryId) return false;
    const status = (item.status ?? "Active").trim().toLowerCase();
    return status === "active" || status === "paused";
  });
  const hasActive = activeForTrack.length > 0;
  const [view, setView] = useState<"active" | "suggested">("active");
  const [toast, setToast] = useState<{ message: string; initiativeId: string } | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const addTimerRef = useRef<number | null>(null);
  const showView = hasActive ? view : "suggested";

  const activeTitles = useMemo(
    () => new Set(activeForTrack.map(item => item.title.trim().toLowerCase())),
    [activeForTrack],
  );

  const sortedSuggested = useMemo(() => {
    const scored = suggested
      .filter(init => !activeTitles.has(init.title.trim().toLowerCase()))
      .map(init => ({
        init,
        gap: initiativeMatchesWeakness(init, weaknesses),
      }));
    return scored.sort((a, b) => Number(Boolean(b.gap)) - Number(Boolean(a.gap)));
  }, [suggested, weaknesses, activeTitles]);

  useEffect(() => () => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    if (addTimerRef.current != null) window.clearTimeout(addTimerRef.current);
  }, []);

  const showToast = (message: string, initiativeId: string) => {
    setToast({ message, initiativeId });
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4200);
  };

  const handleAdd = (init: CategoryInitiative) => {
    if (!onAddInitiative) {
      onOpenInitiatives?.();
      return;
    }
    if (addingId) return;

    setAddingId(init.id);
    if (addTimerRef.current != null) window.clearTimeout(addTimerRef.current);
    addTimerRef.current = window.setTimeout(() => {
      const nextId = `${init.id}-${Date.now()}`;
      onAddInitiative({
        id: nextId,
        title: init.title,
        description: init.description,
        pillar: categoryId,
        status: "Active",
        progress: 0,
      });
      setAddingId(null);
      setView("active");
      showToast(`Initiative created · ${init.title}`, nextId);
    }, 1100);
  };

  const suggestedList = sortedSuggested.length > 0 ? (
    <div className="scorecard-drill-init-list sc-detail-init-list">
      {sortedSuggested.map(({ init, gap }) => {
        const isAdding = addingId === init.id;
        return (
          <div
            key={init.id}
            className={`scorecard-drill-init-row${isAdding ? " is-adding" : ""}`}
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
              <button
                type="button"
                className={`scorecard-drill-init-btn${isAdding ? " is-loading" : ""}`}
                onClick={() => handleAdd(init)}
                disabled={Boolean(addingId) || (!onAddInitiative && !onOpenInitiatives)}
                aria-busy={isAdding}
              >
                {isAdding ? (
                  <>
                    <span className="sc-detail-init-spinner" aria-hidden="true" />
                    Adding
                  </>
                ) : (
                  <>Add <span aria-hidden="true">→</span></>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <p className="sc-detail-init-empty">
      {suggested.length > 0
        ? "All suggested initiatives for this track are already active."
        : "No suggested initiatives for this track yet."}
    </p>
  );

  return (
    <div className={`sc-detail-init-stack${addingId ? " is-busy" : ""}`}>
      {toast ? (
        <div className="sc-init-toast" role="status">
          <span>{toast.message}</span>
          {onViewInitiative || onOpenInitiatives ? (
            <button
              type="button"
              className="sc-init-toast-view"
              onClick={() => {
                if (onViewInitiative) onViewInitiative(toast.initiativeId);
                else onOpenInitiatives?.();
                setToast(null);
              }}
            >
              View
            </button>
          ) : null}
        </div>
      ) : null}

      {hasActive ? (
        <div className="sc-detail-init-seg" role="tablist" aria-label="Initiative view">
          <button
            type="button"
            role="tab"
            aria-selected={showView === "active"}
            className={`sc-detail-init-seg-btn${showView === "active" ? " is-active" : ""}`}
            onClick={() => setView("active")}
          >
            Active · {activeForTrack.length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={showView === "suggested"}
            className={`sc-detail-init-seg-btn${showView === "suggested" ? " is-active" : ""}${sortedSuggested.length > 0 ? " has-recs" : ""}`}
            onClick={() => setView("suggested")}
          >
            Suggested{sortedSuggested.length > 0 ? ` · ${sortedSuggested.length}` : ""}
          </button>
        </div>
      ) : null}

      {showView === "active" && hasActive ? (
        <div className="sc-detail-init-group">
          <span className="sc-detail-init-group-label">Active</span>
          <div className="scorecard-drill-init-list sc-detail-init-list">
            {activeForTrack.map(init => (
              <div key={init.id} className="scorecard-drill-init-row" style={{ "--init-col": categoryColour } as React.CSSProperties}>
                <div className="scorecard-drill-init-body">
                  <div className="scorecard-drill-init-title">{init.title}</div>
                  <div className="scorecard-drill-init-desc">{init.description}</div>
                </div>
                <div className="scorecard-drill-init-action">
                  <button
                    type="button"
                    className="scorecard-drill-init-btn"
                    onClick={() => {
                      if (onViewInitiative) onViewInitiative(init.id);
                      else onOpenInitiatives?.();
                    }}
                    disabled={!onViewInitiative && !onOpenInitiatives}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
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
      ["var(--fuel-accent)", "#0fa678"],
      ["#F5A623", "#B07A1F"],
      ["#E05C5C", "#9A3A3A"],
      ["var(--fuel-accent)", "#0fa678"],
      ["#F5A623", "#B07A1F"],
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
  activeInitiatives = [],
  onBack,
  onUpdateDetails,
  onEditBenchmark,
  onOpenIntelligence,
  onOpenInitiatives,
  onAddInitiative,
  onViewInitiative,
  onRunPlaybook,
  suggestionsReady = true,
}: {
  cat: CategoryData;
  metricMap: Record<MetricKey, EvaluatedMetric>;
  detailAnswers: DetailAnswers;
  runway: number | null;
  intelligenceItems: ScorecardIntelligenceItem[];
  activeInitiatives?: ScorecardActiveInitiative[];
  onBack: () => void;
  onUpdateDetails?: () => void;
  onEditBenchmark?: () => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onAddInitiative?: (initiative: ScorecardActiveInitiative) => void;
  onViewInitiative?: (id: string) => void;
  onRunPlaybook?: (playbookId: string) => void;
  suggestionsReady?: boolean;
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
  const playbooks = suggestionsReady
    ? (cat.suggestedPlaybooks.length ? cat.suggestedPlaybooks : CATEGORY_PLAYBOOKS[cat.id])
    : [];
  const suggestedInitiatives = suggestionsReady ? cat.openInitiatives : [];
  const allBenchmarkMetrics = useMemo(
    () => ALL_BENCHMARK_METRIC_KEYS.map(k => metricMap[k]).filter(Boolean),
    [metricMap],
  );
  const yorkOffer = useMemo(
    () => resolveYorkOfferForPillar(cat.id, detailAnswers),
    [cat.id, detailAnswers],
  );

  return (
    <div className="sc-category-detail sc-detail-dashboard">
      <ScorecardBreadcrumb
        onOverview={onBack}
        current={`${cat.label} · ${cat.fullLabel}`}
      />

      <article className="sc-glance-row sc-glance-row-detail sc-detail-hero-widget">
        <CategoryGlanceHeaderBar
          cat={cat}
          answersCta={answersCta}
          onUpdateDetails={onUpdateDetails}
          onOpenIntelligence={onOpenIntelligence}
          onOpenInitiatives={onOpenInitiatives}
          onRunPlaybook={onRunPlaybook}
          suggestionsReady={suggestionsReady}
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
            weaknesses={cat.glanceWeaknessItems}
            yorkOffer={yorkOffer}
          />
        </DetailDashboardWidget>

        <DetailDashboardWidget
          title="Initiatives"
          meta={
            !suggestionsReady
              ? "Building…"
              : suggestedInitiatives.length
                ? `${suggestedInitiatives.length} suggested`
                : undefined
          }
          span={6}
          headerAction={onOpenInitiatives ? (
            <button type="button" className="sc-detail-widget-head-link" onClick={() => onOpenInitiatives()}>
              Open initiatives <span aria-hidden="true">→</span>
            </button>
          ) : null}
        >
          {suggestionsReady ? (
            <CategoryDetailInitiativesWidget
              suggested={suggestedInitiatives}
              active={activeInitiatives}
              categoryId={cat.id}
              categoryColour={cat.colour}
              weaknesses={cat.glanceWeaknessItems}
              onAddInitiative={onAddInitiative}
              onOpenInitiatives={onOpenInitiatives}
              onViewInitiative={onViewInitiative}
            />
          ) : (
            <p className="sc-cat-sw-empty">Initiative suggestions are still preparing.</p>
          )}
        </DetailDashboardWidget>

        <DetailDashboardWidget
          title="Intelligence"
          meta={cat.intelligenceCount ? `${cat.intelligenceCount} signal${cat.intelligenceCount === 1 ? "" : "s"}` : undefined}
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
          meta={
            !suggestionsReady
              ? "Building…"
              : playbooks.length
                ? `${playbooks.length} available`
                : undefined
          }
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
            <p className="sc-cat-sw-empty">
              {suggestionsReady
                ? "No playbooks suggested for this track yet."
                : "Playbook suggestions are still preparing."}
            </p>
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
            <span className="scorecard-drill-intel-val" style={{ color: runway < 6 ? COLOUR_WEAK() : runway < 12 ? COLOUR_AROUND() : COLOUR_ABOVE() }}>
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
export function BenchmarkEditDrawer({
  open, onClose, benchmark, companyName, onSave, elevatedScrim = false,
}: {
  open: boolean;
  onClose: () => void;
  benchmark: OnboardingBenchmarkInput;
  companyName: string;
  onSave: (next: OnboardingBenchmarkInput) => void;
  elevatedScrim?: boolean;
}) {
  const { requestSaveExit, dialog: saveExitConfirmDialog } = useSaveExitConfirm();
  const [draft, setDraft] = useState<OnboardingBenchmarkInput>(benchmark);
  const dialogRef = useRef<HTMLElement>(null);
  const benchmarkSnapshotRef = useRef(benchmark);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);

  useDialogA11y(open, dialogRef, onClose);

  benchmarkSnapshotRef.current = benchmark;

  // Seed draft only when the drawer opens — never while the user is typing.
  useEffect(() => {
    if (!open) return;
    setDraft({ ...benchmarkSnapshotRef.current });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const update = (key: keyof OnboardingBenchmarkInput, val: string) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  };
  const save = () => { onSave(draft); onClose(); };
  const saveAndExit = () => {
    requestSaveExit(save);
  };

  return createPortal(
    <>
    <div
      className={`bench-drawer-scrim bench-drawer-scrim--portal${elevatedScrim ? " bench-drawer-scrim--elevated" : ""}`}
      onPointerDown={handleScrimPointerDown}
      role="presentation"
    >
      <aside
        ref={dialogRef}
        className="bench-drawer"
        {...drawerPanelPointerProps()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit benchmark"
      >
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
          <button type="button" className="bench-drawer-cancel" onClick={saveAndExit}>Save and exit</button>
          <button type="button" className="bench-drawer-save" onClick={save}>Save and next →</button>
        </footer>
      </aside>
    </div>
    {saveExitConfirmDialog}
    </>,
    document.body,
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
  const lastOpenRef = useRef(false);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);

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
      setTitle(""); setType("Pitch deck"); setDescription(""); setTypeOpen(false);
    }
    lastOpenRef.current = open;
  }, [open]);

  if (!open) return null;

  const canSubmit = title.trim().length > 0;
  const submit = () => {
    if (!canSubmit) return;
    onGenerate({ title: title.trim(), type, description: description.trim() });
    onClose();
  };

  return (
    <div className="bench-drawer-scrim" onPointerDown={handleScrimPointerDown} role="presentation">
      <aside className="bench-drawer add-sources-drawer" {...drawerPanelPointerProps()} role="dialog" aria-label="Add source">
        <header className="bench-drawer-head">
          <div>
            <div className="add-sources-eyebrow">Sources</div>
            <h2 className="bench-drawer-title">Auto-generate sources from connected context</h2>
            <p className="bench-drawer-sub">Capture notes, connector activity, and meetings — then turn them into intelligence.</p>
          </div>
          <div className="add-sources-actions">
            <button type="button" className="bench-drawer-cancel" onClick={onClose}>Cancel</button>
            <button type="button" className="bench-drawer-save" onClick={submit} disabled={!canSubmit}>
              Generate intelligence
            </button>
          </div>
        </header>

        <div className="bench-drawer-body">
          <div className="bench-field">
            <label className="bench-field-label">Title</label>
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
            <label className="bench-field-label">Description</label>
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
  onBenchmarkChange,
  onBenchmarkSaved,
  onBenchmarkEarlyUnlock,
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
  workspaceIntroOpen = false,
  onDismissWorkspaceIntro,
  onWorkspaceActivity,
  privateWorkspaceLabel,
  efficiencyExtras,
  activeInitiatives = [],
  onAddInitiative,
  onViewInitiative,
  overviewBuildPhase = null,
  overviewBuiltPhases,
  onStartOptionalTour,
  onDismissOverviewReady,
  recActionsTipOpen = false,
  onDismissRecActionsTip,
  isProfileComplete = true,
  userFirstName = "there",
  onStartProfileCompletion,
  profileDetailsSyncKey = 0,
  profileDrawerOpen = false,
  onOpenProfileDetails,
  earnedProfileCredits,
  companyKey,
  onProfileCreditsChange,
  onProfileCreditReward,
  onLandingContentRestore,
  reloadLandingActive = isReloadLandingActive(),
  tourCompleteSignal = 0,
  benchmarkEditRequestKey = 0,
  onBenchmarkEditClosed,
}: ScorecardV2Props) {
  const [activeView, setActiveView] = useState<ScorecardView>("overview");
  const [overviewDesignTab, setOverviewDesignTab] = useState<OverviewDesignTab>("workspace");
  const [displayScoresZero, setDisplayScoresZero] = useState(() => reloadLandingActive || isReloadLandingActive());
  const landingBaselineRef = useRef<string | null>(null);
  const [editBenchmarkOpen, setEditBenchmarkOpen] = useState(false);
  const [benchmarkEditElevated, setBenchmarkEditElevated] = useState(false);
  const [benchmarkSaved, setBenchmarkSaved] = useState(false);
  const [benchmarkValues, setBenchmarkValues] = useState<OnboardingBenchmarkInput>(benchmark);
  const benchmarkSyncKey = useMemo(() => JSON.stringify(benchmark), [benchmark]);
  const [addSourcesOpen, setAddSourcesOpen] = useState(false);
  const cName = companyName ?? "This company";
  const companyStorageKey = companyKey ?? cName;
  const [openGlancePopover, setOpenGlancePopover] = useState<ScorecardCategory | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const [wikiSummaryOpen, setWikiSummaryOpen] = useState(false);
  const [wikiHighlightRefId, setWikiHighlightRefId] = useState<number | null>(null);
  const [detailAnswers, setDetailAnswers] = useState<DetailAnswers>(() => {
    if (reloadLandingActive || isReloadLandingActive()) return {};
    return loadDetailAnswers(companyStorageKey);
  });

  const mergedDetailAnswers = useMemo(() => {
    if (reloadLandingActive || displayScoresZero) return detailAnswers;
    return mergeDetailAnswers(detailAnswers, onboardingAnswers);
  }, [detailAnswers, onboardingAnswers, reloadLandingActive, displayScoresZero]);

  useEffect(() => {
    if (!isBrowserReload()) return;
    setActiveView("overview");
    setOverviewDesignTab("workspace");
    setEditBenchmarkOpen(false);
    setAddSourcesOpen(false);
    setWikiSummaryOpen(false);
    setOpenGlancePopover(null);
    setAdvisorOpen(false);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!tourCompleteSignal) return;
    setActiveView("overview");
    setOverviewDesignTab("workspace");
    setEditBenchmarkOpen(false);
    setAddSourcesOpen(false);
    setWikiSummaryOpen(false);
    setOpenGlancePopover(null);
    setAdvisorOpen(false);
    window.scrollTo(0, 0);
  }, [tourCompleteSignal]);

  useEffect(() => {
    if (!displayScoresZero) {
      landingBaselineRef.current = null;
    }
  }, [displayScoresZero]);

  useEffect(() => {
    if (!displayScoresZero) return;
    landingBaselineRef.current = null;
  }, [companyStorageKey]);

  useEffect(() => {
    if (!displayScoresZero || landingBaselineRef.current) return;
    landingBaselineRef.current = JSON.stringify({
      company: companyStorageKey,
      sync: profileDetailsSyncKey,
      details: detailAnswers,
      benchmark: benchmarkValues,
    });
  }, [displayScoresZero, companyStorageKey, profileDetailsSyncKey, detailAnswers, benchmarkValues]);

  useEffect(() => {
    if (!displayScoresZero || !landingBaselineRef.current) return;
    const current = JSON.stringify({
      company: companyStorageKey,
      sync: profileDetailsSyncKey,
      details: detailAnswers,
      benchmark: benchmarkValues,
    });
    if (current !== landingBaselineRef.current) {
      setDisplayScoresZero(false);
      clearReloadLandingActive();
      onLandingContentRestore?.();
    }
  }, [displayScoresZero, companyStorageKey, profileDetailsSyncKey, detailAnswers, benchmarkValues, onLandingContentRestore]);

  // Keep advisor expanded and tip in view while the post-onboarding tip is open on Advisor-first.
  useEffect(() => {
    if (!recActionsTipOpen) return;
    if (activeView !== "overview") return;
    if (overviewDesignTab !== "new") return;
    if (overviewBuildPhase != null && overviewBuildPhase !== "ready") return;
    setAdvisorOpen(true);
    setWikiSummaryOpen(false);
    const frame = window.requestAnimationFrame(() => {
      document.querySelector(".sc-adv-rec-tip")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [recActionsTipOpen, overviewBuildPhase, activeView, overviewDesignTab]);

  // Expand advisor when the guided tour points at it or Recommended Actions.
  useEffect(() => {
    if (activeTourTarget !== "ai-advisor" && activeTourTarget !== "recommended-actions") return;
    if (activeView !== "overview") return;
    setAdvisorOpen(true);
    setWikiSummaryOpen(false);
  }, [activeTourTarget, activeView]);

  useEffect(() => {
    if (editBenchmarkOpen) return;
    if (reloadLandingActive && displayScoresZero) {
      setBenchmarkValues(benchmark);
      return;
    }
    setBenchmarkValues(benchmark);
  }, [benchmarkSyncKey, benchmark, editBenchmarkOpen, reloadLandingActive, displayScoresZero]);

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
    if (profileDrawerOpen) return;
    if (reloadLandingActive && displayScoresZero) {
      setDetailAnswers({});
      return;
    }
    setDetailAnswers(loadDetailAnswers(companyStorageKey));
  }, [companyStorageKey, profileDetailsSyncKey, profileDrawerOpen, reloadLandingActive, displayScoresZero]);

  const openDetailsDrawer = (category?: ScorecardCategory) => {
    if (!onOpenProfileDetails) return;
    if (category === "dev" || category === "mkt" || category === "rev") {
      onOpenProfileDetails(category);
      return;
    }
    onOpenProfileDetails("company");
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

  const showWorkspaceSetup = useMemo(() => {
    if (!privateWorkspaceLabel) return false;
    return !isPrivateWorkspaceOverviewReady(
      benchmarkValues,
      mergedDetailAnswers,
      documentSlots,
      intelligenceItems,
    );
  }, [benchmarkValues, documentSlots, intelligenceItems, mergedDetailAnswers, privateWorkspaceLabel]);

  useEffect(() => {
    if (showWorkspaceSetup && (activeView === "dev" || activeView === "mkt" || activeView === "rev")) {
      setActiveView("overview");
    }
  }, [activeView, showWorkspaceSetup]);

  const advisorActions = useMemo(
    () => buildAdvisorRecommendedActions(
      buildContext,
      mergedDetailAnswers,
      documentSlots,
      benchmarkSaved,
      cName,
      Boolean(privateWorkspaceLabel),
      earnedProfileCredits,
    ),
    [benchmarkSaved, buildContext, cName, documentSlots, earnedProfileCredits, mergedDetailAnswers, privateWorkspaceLabel],
  );

  const awardBenchmarkCredits = useCallback((nextValues?: OnboardingBenchmarkInput) => {
    if (!companyKey || remainingBenchmarkRewardCredits(earnedProfileCredits) <= 0) return;
    const values = nextValues ?? benchmarkValues;
    const filled = METRIC_COHORTS.filter(c => parseMetricValue(values[c.key] ?? "")).length;
    if (filled <= 0 && !benchmarkSaved) return;
    const { earned, reward } = tryMarkBenchmarkEarned(companyKey);
    onProfileCreditsChange?.(earned);
    if (reward) onProfileCreditReward?.(reward);
  }, [
    benchmarkSaved,
    benchmarkValues,
    companyKey,
    earnedProfileCredits,
    onProfileCreditReward,
    onProfileCreditsChange,
  ]);

  const awardSourcesCredits = useCallback(() => {
    if (!companyKey || remainingIntelligenceRewardCredits(earnedProfileCredits) <= 0) return;
    const { earned, reward } = tryMarkIntelligenceSourcesEarned(companyKey);
    onProfileCreditsChange?.(earned);
    if (reward) onProfileCreditReward?.(reward);
  }, [companyKey, earnedProfileCredits, onProfileCreditReward, onProfileCreditsChange]);

  const openRecommendedBenchmark = useCallback(() => {
    setBenchmarkEditElevated(false);
    setEditBenchmarkOpen(true);
  }, []);

  const closeBenchmarkEditDrawer = useCallback(() => {
    setEditBenchmarkOpen(false);
    setBenchmarkEditElevated(false);
    onBenchmarkEditClosed?.();
  }, [onBenchmarkEditClosed]);

  useEffect(() => {
    if (!benchmarkEditRequestKey) return;
    setBenchmarkEditElevated(true);
    setEditBenchmarkOpen(true);
  }, [benchmarkEditRequestKey]);

  const openRecommendedSources = useCallback(() => {
    const hasSources = (documentSlots?.filter(s => s.current).length ?? 0) > 0
      || intelligenceItems.some(item => !item.id.startsWith("intel-bench-"));
    if (hasSources) {
      awardSourcesCredits();
    }
    setAddSourcesOpen(true);
  }, [awardSourcesCredits, documentSlots, intelligenceItems]);

  const wikiSummary = useMemo(
    () => buildOverviewWikiSummary(cName, categoryData, runway, buildContext, documentSlots, cohortLabel),
    [buildContext, categoryData, cName, cohortLabel, documentSlots, runway],
  );

  const openWikiSummary = useCallback((highlightRefId?: number) => {
    setWikiHighlightRefId(highlightRefId ?? null);
    setWikiSummaryOpen(true);
  }, []);

  useEffect(() => {
    if (activeView !== "overview" && wikiSummaryOpen) {
      setWikiSummaryOpen(false);
      setWikiHighlightRefId(null);
    }
  }, [activeView, wikiSummaryOpen]);

  const isCategoryDetail = activeView === "dev" || activeView === "mkt" || activeView === "rev";
  const activeCategory = isCategoryDetail ? categoryData.find(c => c.id === activeView) : undefined;
  const suggestionsReady = overviewSuggestionsReady(overviewBuildPhase, overviewBuiltPhases);
  const profileProgressPct = useMemo(() => {
    if (earnedProfileCredits) {
      return Math.round((computeCreditBalance(earnedProfileCredits) / PROFILE_TOTAL_CREDITS) * 100);
    }
    return computeProfileProgress(categoryData);
  }, [earnedProfileCredits, categoryData]);
  const profileCreditBalance = useMemo(
    () => computeCreditBalance(earnedProfileCredits ?? { modules: [], benchmark: false, intelligenceSources: false }),
    [earnedProfileCredits],
  );
  const overviewReportReadiness = useMemo((): ReportReadiness => {
    const benchFilled = METRIC_COHORTS.filter(c => parseMetricValue(benchmarkValues[c.key] ?? "")).length;
    const summary = buildWorkspaceProgressSummary(
      mergedDetailAnswers,
      earnedProfileCredits,
      benchFilled,
      METRIC_COHORTS.length,
    );
    if (summary.reportReadiness === "none" && hasProfileBasicsStarted(mergedDetailAnswers)) {
      return "early";
    }
    return summary.reportReadiness;
  }, [benchmarkValues, earnedProfileCredits, mergedDetailAnswers]);
  const yorkOverviewOffer = useMemo(() => {
    // Overview stays company-wide — common partner card, not a single-track offer/gap.
    const weakTrackLabels = categoryData
      .filter(cat => cat.glanceWeaknessItems.length > 0 || Boolean(cat.glanceNeedsWork?.trim()))
      .map(cat => cat.label);
    return { offer: YORK_COMMON_OFFER, weakTrackLabels };
  }, [categoryData]);
  const [yorkOverviewHidden, setYorkOverviewHidden] = useState(
    () => isYorkOfferDismissed(YORK_COMMON_OFFER.id),
  );
  useEffect(() => {
    setYorkOverviewHidden(isYorkOfferDismissed(YORK_COMMON_OFFER.id));
  }, []);
  /** Tip + scrim only on Advisor-first tab — never block Module-first / Gate-first. */
  const showRecActionsTip =
    recActionsTipOpen
    && suggestionsReady
    && activeView === "overview"
    && overviewDesignTab === "new"
    && !wikiSummaryOpen;
  const showOverviewDesignTabs = !isCategoryDetail && activeView === "overview";
  const showWorkspaceDashboard = showOverviewDesignTabs && overviewDesignTab === "workspace";
  const useOldGateDesign = showOverviewDesignTabs && overviewDesignTab === "old";
  const showNewOverviewContent = showOverviewDesignTabs && overviewDesignTab === "new";

  useEffect(() => {
    if (!activeTourTarget) return;
    if (
      activeTourTarget === "tab-workspace"
      || activeTourTarget.startsWith("workspace-")
    ) {
      setOverviewDesignTab("workspace");
      return;
    }
    if (
      activeTourTarget === "tab-overview"
      || activeTourTarget === "ai-advisor"
      || activeTourTarget === "recommended-actions"
      || activeTourTarget.startsWith("category-")
    ) {
      setOverviewDesignTab("new");
    }
  }, [activeTourTarget]);

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
    <div className={`scorecard-v2${showRecActionsTip ? " is-rec-tip-focus" : ""}`}>
      {showRecActionsTip ? (
        <div className="sc-adv-rec-tip-scrim" aria-hidden="true" />
      ) : null}
      {workspaceIntroOpen ? (
        <div className="sc-workspace-intro">
          <div>
            <strong>Your private overview is ready</strong>
            <p>
              Fuel set up a personal workspace for {cName}. Add benchmarks, track details, intelligence, and initiatives here —
              visible only to your account, never to the founding team or other investors.
            </p>
          </div>
          <button type="button" onClick={onDismissWorkspaceIntro}>Got it</button>
        </div>
      ) : null}
      {privateWorkspaceLabel && isProfileComplete ? (
        <div className="sc-private-workspace-label">{privateWorkspaceLabel}</div>
      ) : null}
      {wikiSummaryOpen && activeView === "overview" ? (
        <OverviewFullSummaryPage
          companyName={cName}
          summary={wikiSummary}
          metrics={metrics}
          metricMap={metricMap}
          categories={categoryData}
          runway={runway}
          buildContext={buildContext}
          cohortLabel={cohortLabel}
          documentSlots={documentSlots}
          efficiencyExtras={efficiencyExtras}
          activeInitiatives={activeInitiatives}
          highlightRefId={wikiHighlightRefId}
          onClose={() => {
            setWikiSummaryOpen(false);
            setWikiHighlightRefId(null);
          }}
        />
      ) : (
        <>
      {showOverviewDesignTabs ? (
        <OverviewDesignTabs
          active={overviewDesignTab}
          onChange={setOverviewDesignTab}
          activeTourTarget={activeTourTarget}
        />
      ) : null}
      {showWorkspaceDashboard ? (
        <OverviewWorkspaceDashboard
          userFirstName={userFirstName}
          companyName={cName}
          detailAnswers={mergedDetailAnswers}
          storedDetailAnswers={detailAnswers}
          benchmark={benchmarkValues}
          earnedProfileCredits={earnedProfileCredits}
          categories={categoryData}
          runway={runway}
          buildContext={buildContext}
          benchmarkSaved={benchmarkSaved}
          documentSlots={documentSlots}
          wikiSummary={wikiSummary}
          overviewBuildPhase={overviewBuildPhase}
          overviewBuiltPhases={overviewBuiltPhases}
          suggestionsReady={suggestionsReady}
          showWorkspaceSetup={showWorkspaceSetup}
          advisorActions={advisorActions}
          privateWorkspace={Boolean(privateWorkspaceLabel)}
          isProfileComplete={isProfileComplete}
          onStart={onStartProfileCompletion}
          onOpenCategory={(categoryId) => setActiveView(categoryId)}
          onOpenIntelligence={onOpenIntelligence}
          onOpenInitiatives={onOpenInitiatives}
          onRunPlaybook={onRunPlaybook}
          onOpenWikiSummary={openWikiSummary}
          onEditBenchmark={openRecommendedBenchmark}
          onAddSources={openRecommendedSources}
          activeTourTarget={activeTourTarget}
          showShareTip={showRecActionsTip}
          onDismissShareTip={onDismissRecActionsTip}
          displayScoresZero={displayScoresZero}
        />
      ) : null}
      {useOldGateDesign ? (
        <ProfileIncompleteGate
          firstName={userFirstName}
          companyName={cName}
          detailAnswers={mergedDetailAnswers}
          creditBalance={profileCreditBalance}
          earnedProfileCredits={earnedProfileCredits}
          isProfileComplete={isProfileComplete}
          onStart={onStartProfileCompletion}
          onOpenSources={openRecommendedSources}
        />
      ) : null}
      {showNewOverviewContent && !isCategoryDetail && !isProfileComplete ? (
        <ProfileCompletionBanner
          progressPct={profileProgressPct}
          creditBalance={profileCreditBalance}
          earnedProfileCredits={earnedProfileCredits}
          onContinue={() => onStartProfileCompletion?.("company")}
        />
      ) : null}
      {showNewOverviewContent && !isCategoryDetail && overviewBuildPhase && overviewBuildPhase !== "ready" ? (
        <OverviewBuildPanel
          phase={overviewBuildPhase}
        />
      ) : null}
      {showNewOverviewContent && !isCategoryDetail && overviewBuildPhase === "ready" ? (
        <div className="sc-overview-ready-bar" role="status">
          <div>
            <strong>Your Overview is ready</strong>
            <span>Scores, advisor, and first suggestions are live.</span>
          </div>
          <div className="sc-overview-ready-actions">
            {onStartOptionalTour ? (
              <button type="button" onClick={onStartOptionalTour}>Take a quick tour</button>
            ) : null}
            <button type="button" className="secondary" onClick={onDismissOverviewReady}>Skip</button>
          </div>
        </div>
      ) : null}
      {showNewOverviewContent && !isCategoryDetail ? (
      <div
        className={`sc-adv-featured-wrap sc-overview-advisor-wrap${advisorOpen ? "" : " is-collapsed"}${showRecActionsTip ? " has-rec-tip-focus" : ""}${activeTourTarget === "ai-advisor" ? " tour-highlight" : ""}`}
        data-tour-target="ai-advisor"
      >
        <div className="sc-adv-featured-border" aria-hidden="true" />
        <div
          className="sc-adv-featured-toggle"
          onClick={() => {
            if (showRecActionsTip) return;
            setAdvisorOpen(o => !o);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (showRecActionsTip) return;
              setAdvisorOpen(o => !o);
            }
          }}
          aria-expanded={advisorOpen}
        >
          <span className="sc-adv-featured-toggle-label">+ Fuel AI · Advisor</span>
          <span className="sc-adv-featured-toggle-meta">
            {overviewBuildPhase && !overviewAdvisorReady(overviewBuildPhase, overviewBuiltPhases)
              ? "Building…"
              : cName}
          </span>
          <span className="sc-adv-featured-chev" aria-hidden="true">▾</span>
        </div>
        {advisorOpen ? (
          overviewBuildPhase && !overviewAdvisorReady(overviewBuildPhase, overviewBuiltPhases) ? (
            <OverviewAdvisorSkeleton />
          ) : showWorkspaceSetup ? (
            <OverviewWorkspaceSetupPanel
              companyName={cName}
              actions={advisorActions}
              onEditBenchmark={openRecommendedBenchmark}
              onAddSources={openRecommendedSources}
              onViewDetails={() => openDetailsDrawer()}
              showShareTip={showRecActionsTip}
              onDismissShareTip={onDismissRecActionsTip}
              tourHighlightRecommended={activeTourTarget === "recommended-actions"}
            />
          ) : (
          <OverviewAdvisorPanel
            categories={categoryData}
            runway={runway}
            companyName={cName}
            buildContext={buildContext}
            benchmarkSaved={benchmarkSaved}
            privateWorkspace={Boolean(privateWorkspaceLabel)}
            onOpenIntelligence={onOpenIntelligence}
            onEditBenchmark={openRecommendedBenchmark}
            onAddSources={openRecommendedSources}
            onViewDetails={() => openDetailsDrawer()}
            documentSlots={documentSlots}
            wikiSummary={wikiSummary}
            onOpenWikiSummary={openWikiSummary}
            suggestionsReady={suggestionsReady}
            overviewBuildPhase={overviewBuildPhase}
            overviewBuiltPhases={overviewBuiltPhases}
            reportReadiness={overviewReportReadiness}
            showShareTip={showRecActionsTip}
            onDismissShareTip={onDismissRecActionsTip}
            tourHighlightRecommended={activeTourTarget === "recommended-actions"}
            earnedProfileCredits={earnedProfileCredits}
          />
          )
        ) : null}
      </div>
      ) : null}

      {isCategoryDetail && activeCategory && isProfileComplete ? (
        <CategoryDetailView
          cat={activeCategory}
          metricMap={metricMap}
          detailAnswers={mergedDetailAnswers}
          runway={runway}
          intelligenceItems={intelligenceItems}
          activeInitiatives={activeInitiatives}
          onBack={() => setActiveView("overview")}
          onUpdateDetails={() => openDetailsDrawer(activeCategory.id)}
          onEditBenchmark={() => setEditBenchmarkOpen(true)}
          onOpenIntelligence={onOpenIntelligence}
          onOpenInitiatives={onOpenInitiatives}
          onAddInitiative={onAddInitiative}
          onViewInitiative={onViewInitiative}
          onRunPlaybook={onRunPlaybook}
          suggestionsReady={suggestionsReady}
        />
      ) : showNewOverviewContent && showWorkspaceSetup ? (
        <div className="sc-workspace-setup-hint">
          <p>Complete benchmark, sources, and R&amp;D · GTM · Finance details above to generate your track scores.</p>
        </div>
      ) : showNewOverviewContent && overviewBuildPhase && overviewBuildPhase === "summary" ? (
        <section className="sc-progress-feed-section" aria-labelledby="sc-progress-feed-heading">
        <div className="sc-progress-feed-head">
          <h2 id="sc-progress-feed-heading" className="sc-progress-feed-title">Progress Feed</h2>
        </div>
        <div className="sc-overview-tracks sc-overview-tracks-glance" aria-busy="true">
          <CategoryGlanceRowSkeleton label="R&D" />
          <CategoryGlanceRowSkeleton label="GTM" />
          <CategoryGlanceRowSkeleton label="G&A" />
        </div>
        </section>
      ) : showNewOverviewContent && !isCategoryDetail ? (
        <section className="sc-progress-feed-section" aria-labelledby="sc-progress-feed-heading">
        <div className="sc-progress-feed-head">
          <h2 id="sc-progress-feed-heading" className="sc-progress-feed-title">Progress Feed</h2>
        </div>
        <div className="sc-overview-tracks sc-overview-tracks-glance">
          {categoryData.map(cat => (
            shouldShowCategoryGlanceForTour(
              cat.id,
              activeTourTarget,
              overviewBuildPhase,
              overviewBuiltPhases,
            ) ? (
              <CategoryGlanceRow
                key={cat.id}
                cat={cat}
                runway={runway}
                displayScoresZero={displayScoresZero}
                onOpen={() => setActiveView(cat.id)}
                onUpdateDetails={() => openDetailsDrawer(cat.id)}
                onOpenIntelligence={onOpenIntelligence}
                onOpenInitiatives={onOpenInitiatives}
                onRunPlaybook={onRunPlaybook}
                glancePopoverOpen={openGlancePopover === cat.id}
                onGlancePopoverOpen={() => setOpenGlancePopover(cat.id)}
                onGlancePopoverClose={() => setOpenGlancePopover(null)}
                tourTarget={activeTourTarget === `category-${cat.id}` ? `category-${cat.id}` : undefined}
                suggestionsReady={suggestionsReady}
                isProfileComplete={isProfileComplete}
                onCompleteProfile={() => onStartProfileCompletion?.(categoryToProfileUnlockSection(cat.id))}
              />
            ) : (
              <CategoryGlanceRowSkeleton key={cat.id} label={cat.label} />
            )
          ))}
        </div>
        </section>
      ) : null}
      {showNewOverviewContent && !isProfileComplete && !isCategoryDetail ? (
        <ProfileGateConnectors />
      ) : null}
        </>
      )}

      <BenchmarkEditDrawer
        open={editBenchmarkOpen}
        onClose={closeBenchmarkEditDrawer}
        elevatedScrim={benchmarkEditElevated}
        benchmark={benchmarkValues}
        companyName={cName}
        onSave={next => {
          setBenchmarkValues(next);
          onBenchmarkChange?.(next);
          setBenchmarkSaved(true);
          saveStoredQuarter(`fuel-benchmark-q-${cName}`);
          awardBenchmarkCredits(next);
          onBenchmarkSaved?.();
          const filled = METRIC_COHORTS.filter(c => parseMetricValue(next[c.key] ?? "")).length;
          if (filled >= MIN_BENCHMARK_METRICS_FOR_UNLOCK) {
            onBenchmarkEarlyUnlock?.();
          }
        }}
      />

      <AddSourcesDrawer
        open={addSourcesOpen}
        onClose={() => setAddSourcesOpen(false)}
        onGenerate={() => {
          awardSourcesCredits();
          onAddSources?.();
        }}
      />
    </div>
  );
}
