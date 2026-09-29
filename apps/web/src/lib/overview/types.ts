import { z } from "zod";
import type { OverviewCategoryId } from "./constants";
import { isMilestoneDueDate } from "@/lib/initiative-milestone-dates";

export const SignalTagSchema = z.object({
  category_id: z.enum(["dev", "mkt", "rev"]),
  label: z.string(),
  urgency: z.enum(["urgent", "watch", "stable"]),
  suffix: z.string(),
  risk_count: z.number(),
});

export const RecommendedActionSchema = z.object({
  title: z.string(),
  sub: z.string(),
  cta: z.string(),
  done: z.boolean(),
  action_type: z.enum(["benchmark", "sources", "details"]),
});

export const StrengthWeaknessSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  source: z.string(),
});

export const ScoreContributorSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.enum(["benchmark", "profile", "detail"]),
  display: z.string(),
  score: z.number(),
  weight: z.number(),
  contribution: z.number(),
  impact: z.string(),
});

export const CategoryAiSchema = z.object({
  id: z.enum(["dev", "mkt", "rev"]),
  label: z.string(),
  full_label: z.string(),
  score: z.number().optional(),
  status_label: z.string().optional(),
  status_tone: z.string().optional(),
  confidence_level: z.string().optional(),
  focus_narrative: z.string().optional(),
  insight: z.string().optional(),
  strengths: z.array(StrengthWeaknessSchema).default([]),
  weaknesses: z.array(StrengthWeaknessSchema).default([]),
  benchmark_chips: z.array(z.string()).default([]),
  stats: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  score_contributors: z.array(ScoreContributorSchema).optional(),
});

export const IntelligenceAiSchema = z.object({
  signal_id: z.string().min(1),
  type: z.string(),
  title: z.string(),
  text: z.string(),
  /** Display string derived server-side from the typed value field. */
  highlight: z.string().optional(),
  value_numeric: z.number().nullable().optional(),
  value_text: z.string().nullable().optional(),
  value_bool: z.boolean().nullable().optional(),
  category_id: z.enum(["dev", "mkt", "rev"]),
  source: z.string(),
  /** Catalog signal category (finance, growth, …) for storage mapping. */
  signal_category: z.string().optional(),
  /** Which INPUT bucket grounded the item; server maps to a Sources chip. */
  evidence_source: z.enum(["profile", "form", "document"]).optional(),
});

export const InitiativeAiSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  category_id: z.enum(["dev", "mkt", "rev"]),
  due_date: z.string().optional(),
  cadence: z.enum(["one-time", "recurring"]).optional(),
  status: z.literal("draft").optional(),
  tagged_intelligence_type: z.string().nullable().optional(),
  /** Related intelligence types/signal ids. Empty when none apply. */
  tagged_intelligence_types: z.array(z.string()).optional(),
  /** Plain-language why this initiative was suggested from evidence. */
  source_rationale: z.string().optional(),
  /** Value of completing the initiative (founder-facing). */
  benefit: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  baseline_metric: z.string().optional(),
  target_metric: z.string().optional(),
  benchmark_cohort: z.string().optional(),
  /**
   * Document-only or document-backed suggestions (Path B).
   * Prefer ids from INPUT.active_documents when available.
   */
  source_documents: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        type_label: z.string().optional(),
      }),
    )
    .optional(),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        due_date: z
          .string()
          .refine(isMilestoneDueDate, "Expected MM-DD-YYYY")
          .optional(),
        checked: z.boolean().optional(),
      }),
    )
    .default([]),
  york_help: z
    .object({
      section_title: z.string(),
      bullets: z
        .array(
          z.object({
            title: z.string().optional(),
            milestone: z.string().optional(),
            help: z.string(),
            primary_service: z.string(),
            track: z.enum(["rd", "gtm", "ga"]),
          }),
        )
        .min(1)
        .max(2),
      cta_label: z.string(),
    })
    .optional(),
});

export const PlaybookSuggestionAiSchema = z.object({
  playbook_slug: z.string(),
  reason: z.string(),
  category_id: z.enum(["dev", "mkt", "rev"]).optional(),
});

export const OverviewAiResponseSchema = z.object({
  advisor: z.object({
    summary: z.string(),
    signal_tags: z.array(SignalTagSchema).default([]),
    recommended_actions: z.array(RecommendedActionSchema).default([]),
  }),
  categories: z.array(CategoryAiSchema).length(3),
  intelligence: z.array(IntelligenceAiSchema).default([]),
  suggested_initiatives: z.array(InitiativeAiSchema).default([]),
  suggested_playbooks: z.array(PlaybookSuggestionAiSchema).default([]),
  journey_stage: z
    .object({
      current: z.string(),
      label: z.string(),
    })
    .optional(),
});

export type OverviewAiResponse = z.infer<typeof OverviewAiResponseSchema>;
export type ScoreContributor = z.infer<typeof ScoreContributorSchema>;

export type OverviewGenerationStatus =
  | "none"
  | "pending"
  | "running"
  | "complete"
  | "failed";

/** Cohort bars + current metric strings for the Edit Benchmark drawer. */
export interface OverviewBenchmarkDrawerPayload {
  period: string;
  cohortKey: string | null;
  values: Record<string, string>;
  fields: Array<{
    key: string;
    label: string;
    placeholder: string;
    unit: string;
    lowerIsBetter: boolean;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  }>;
  allCohorts: Array<{
    cohortKey: string;
    dimensions: {
      businessModel?: string | null;
      stage?: string | null;
      vertical?: string | null;
      geo?: string | null;
    };
    sampleSize: number | null;
  }>;
}

export interface OverviewApiResponse {
  generation: {
    status: OverviewGenerationStatus;
    runId: string | null;
    errorMessage: string | null;
    completedAt: string | null;
    startedAt: string | null;
  };
  snapshotId: string | null;
  advisor: {
    summary: string;
    signalTags: z.infer<typeof SignalTagSchema>[];
    recommendedActions: z.infer<typeof RecommendedActionSchema>[];
    journeyStage: string | null;
    journeyLabel: string | null;
    contextCompletionPct: number;
  } | null;
  categories: Array<{
    categoryId: OverviewCategoryId;
    label: string;
    fullLabel: string;
    score: number;
    statusLabel: string;
    statusTone: string;
    confidenceLevel: string;
    focusNarrative: string | null;
    insight: string | null;
    strengths: z.infer<typeof StrengthWeaknessSchema>[];
    weaknesses: z.infer<typeof StrengthWeaknessSchema>[];
    benchmarkChips: string[];
    stats: Array<{ label: string; value: string }>;
    intelligenceCount: number;
    initiativeCount: number;
    playbookCount: number;
    detailAnsweredCount: number;
    detailQuestionCount: number;
  }>;
  cohortKey: string | null;
  /** Prefilled detail-answer map for the Add Details drawer (avoids a second fetch). */
  detailAnswers: Record<string, string>;
  /** Prefill + cohort field meta for Edit Benchmark (avoids a second fetch). */
  benchmarkDrawer: OverviewBenchmarkDrawerPayload | null;
}

export interface FormAnswerRow {
  questionId: string;
  label: string;
  answer: string | null;
  tone: "ok" | "watch" | "concern" | "missing";
  flag: string | null;
}

export interface BenchmarkGapRow {
  metric: string;
  label: string;
  value: string | null;
  position: string;
  tier: string;
}
