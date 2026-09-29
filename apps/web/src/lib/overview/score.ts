import type { OverviewCategoryId } from "./constants";
import {
  BENCHMARK_WEIGHT,
  CATEGORY_METRIC_KEYS,
  DETAIL_WEIGHT,
  INVERTED_METRICS,
  METRIC_LABELS,
  PROFILE_WEIGHT,
  TIER_SCORES,
  tierFromPercentile,
  scoreToStatus,
} from "./constants";
import { scoreForAnswer } from "./answer-scores";
import {
  DETAIL_SECTIONS,
  DETAIL_QUESTION_LABEL,
  TRACK_DETAIL_SECTIONS,
  formatDetailAnswerDisplay,
  getVisibleQuestions,
} from "./detail-question-catalog";
import type { ScoreContributor } from "./types";

export interface BenchmarkRow {
  metric: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  invertedGood: boolean | null;
}

export interface ScoreInput {
  categoryId: OverviewCategoryId;
  answers: Record<string, string | null | undefined>;
  profileCompletionPct: number;
  benchmarkValues: Record<string, number | null | undefined>;
  benchmarkRows: BenchmarkRow[];
}

export interface CategoryScoreResult {
  score: number;
  statusLabel: string;
  statusTone: string;
  contributors: ScoreContributor[];
}

function metricValue(
  benchmarkValues: Record<string, number | null | undefined>,
  metric: string,
): number | null {
  const v = benchmarkValues[metric];
  return v != null && Number.isFinite(v) ? v : null;
}

export function computeCategoryScore(input: ScoreInput): CategoryScoreResult {
  const contributors: ScoreContributor[] = [];
  const metrics = CATEGORY_METRIC_KEYS[input.categoryId];

  for (const metric of metrics) {
    const value = metricValue(input.benchmarkValues, metric);
    const row = input.benchmarkRows.find((r) => r.metric === metric);
    const label = METRIC_LABELS[metric] ?? metric;
    const inverted = INVERTED_METRICS.has(metric) || row?.invertedGood === true;
    const weight = metrics.length > 0 ? BENCHMARK_WEIGHT / metrics.length : 0;

    if (value == null || !row?.p25 || !row.p50 || !row.p75 || !row.p90) {
      contributors.push({
        id: metric,
        label,
        source: "benchmark",
        display: "Not logged",
        score: 40,
        weight,
        contribution: (40 * weight) / 100,
        impact: `${label} is not logged — add benchmark data to improve your score.`,
      });
      continue;
    }

    const tier = tierFromPercentile(
      value,
      row.p25,
      row.p50,
      row.p75,
      row.p90,
      inverted,
    );
    const score = TIER_SCORES[tier] ?? 52;
    contributors.push({
      id: metric,
      label,
      source: "benchmark",
      display: formatMetricDisplay(metric, value),
      score,
      weight,
      contribution: (score * weight) / 100,
      impact: benchmarkImpact(label, tier, inverted),
    });
  }

  contributors.push({
    id: "profile_completion",
    label: "Company profile completeness",
    source: "profile",
    display: `${input.profileCompletionPct}% complete`,
    score: input.profileCompletionPct,
    weight: PROFILE_WEIGHT,
    contribution: (input.profileCompletionPct * PROFILE_WEIGHT) / 100,
    impact:
      input.profileCompletionPct >= 80
        ? "Profile is well filled in."
        : "Complete your company profile to strengthen this category score.",
  });

  const section = TRACK_DETAIL_SECTIONS.find((s) => s.id === input.categoryId);
  const categoryQuestions = section
    ? getVisibleQuestions(section, input.answers)
    : [];
  const detailWeightEach =
    categoryQuestions.length > 0 ? DETAIL_WEIGHT / categoryQuestions.length : 0;

  for (const q of categoryQuestions) {
    const answer = input.answers[q.id];
    const answerScore = scoreForAnswer(q.id, answer ?? null);
    const score = answerScore ?? 30;
    const label = DETAIL_QUESTION_LABEL[q.id] ?? q.prompt;
    const display = formatDetailAnswerDisplay(answer) ?? "Not answered";
    contributors.push({
      id: q.id,
      label,
      source: "detail",
      display,
      score,
      weight: detailWeightEach,
      contribution: (score * detailWeightEach) / 100,
      impact: formatDetailAnswerDisplay(answer)
        ? `Your answer on ${label} affects this track.`
        : `Answer ${label} to improve your score.`,
    });
  }

  contributors.sort((a, b) => a.score - b.score);

  const total = Math.round(
    contributors.reduce((sum, c) => sum + c.contribution, 0),
  );
  const clamped = Math.max(0, Math.min(100, total));
  const status = scoreToStatus(clamped);

  return {
    score: clamped,
    statusLabel: status.label,
    statusTone: status.tone,
    contributors,
  };
}

function formatMetricDisplay(metric: string, value: number): string {
  if (metric.includes("pct")) return `${Math.round(value)}%`;
  if (metric.includes("usd")) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value)}`;
  }
  return String(Math.round(value));
}

function benchmarkImpact(
  label: string,
  tier: string,
  inverted: boolean,
): string {
  const position =
    tier === "top"
      ? "top of your cohort"
      : tier === "upper"
        ? "above median"
        : tier === "mid"
          ? "around median"
          : tier === "lower"
            ? "below median"
            : "bottom quartile";
  if (inverted && label.toLowerCase().includes("burn")) {
    return `Monthly burn is ${position} — lower burn improves capital efficiency.`;
  }
  return `${label} is ${position} versus peers.`;
}

export function profileCompletionPct(
  answers: Record<string, string | null | undefined>,
): number {
  const profileQs = DETAIL_SECTIONS.filter((s) => s.id === "profile" || s.id === "context").flatMap(
    (section) => getVisibleQuestions(section, answers),
  );
  if (profileQs.length === 0) return 50;
  const answered = profileQs.filter((q) => answers[q.id]?.trim()).length;
  return Math.round((answered / profileQs.length) * 100);
}
