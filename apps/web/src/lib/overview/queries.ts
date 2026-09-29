import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  agentRuns,
  companyInitiatives,
  companyIntelligence,
  initiativeMilestones,
  overviewCategoryScores,
  overviewPlaybookSuggestions,
  overviewSnapshots,
  playbooks,
} from "@/db/schema";
import { scoreAnswerRow } from "./answer-scores";
import { countOpenOverviewInitiativesByCategory } from "@/lib/company-initiatives";
import { buildFeedItems, type IntelligenceFeedItem } from "@/lib/intelligence/feed";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import type { IntelligenceCategory } from "@/lib/intelligence/constants";
import {
  CATEGORY_META,
  INVERTED_METRICS,
  METRIC_LABELS,
  OVERVIEW_BENCHMARK_METRIC_KEYS,
  OVERVIEW_GENERATION_KIND,
  isOverviewGenerationStale,
  tierFromPercentile,
  type OverviewCategoryId,
} from "./constants";
import { loadMergedAnswers, loadPrefillDetailAnswers, loadBenchmarkValuesForCompany } from "./map-input";
import {
  TRACK_DETAIL_SECTIONS,
  DETAIL_QUESTION_LABEL,
  formatDetailAnswerDisplay,
  getVisibleQuestions,
} from "./detail-question-catalog";
import {
  loadBenchmarkDrawerPayload,
  trimDetailAnswers,
} from "./form-payload";
import type { OverviewCohortListEntry } from "./cohort-pick";
import type {
  BenchmarkGapRow,
  FormAnswerRow,
  OverviewApiResponse,
  OverviewGenerationStatus,
  ScoreContributor,
} from "./types";
import { ScoreContributorSchema } from "./types";
import type { BenchmarkRow } from "./score";
import {
  buildAdvisorRecommendedActions,
  loadRecommendedActionsContext,
} from "./recommended-actions";
import { buildAdvisorSignalTags } from "./build-signal-tags";
import { buildCategoryFocusNarrative } from "./focus-narrative";
import {
  buildTrackInsightLists,
  toStrengthWeaknessPayload,
  type TrackInsightIntelItem,
} from "./track-insights";
import { computeCategoryScore, profileCompletionPct } from "./score";

export async function getOverviewGenerationStatus(
  accountId: string,
  companyUuid: string,
): Promise<{
  status: OverviewGenerationStatus;
  runId: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  startedAt: string | null;
}> {
  const db = await getDb();

  // Prefer an in-flight job even when a prior snapshot exists (post-save regen).
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.accountId, accountId),
        eq(agentRuns.subjectCompanyUuid, companyUuid),
        eq(agentRuns.kind, OVERVIEW_GENERATION_KIND),
      ),
    )
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);

  if (run && (run.status === "pending" || run.status === "running")) {
    if (isOverviewGenerationStale(run.startedAt)) {
      await db
        .update(agentRuns)
        .set({
          status: "failed",
          errorMessage: "bedrock_timeout",
          completedAt: new Date(),
        })
        .where(eq(agentRuns.id, run.id));
      return {
        status: "failed",
        runId: run.id,
        errorMessage: "bedrock_timeout",
        completedAt: new Date().toISOString(),
        startedAt: run.startedAt.toISOString(),
      };
    }
    return {
      status: run.status === "pending" ? "pending" : "running",
      runId: run.id,
      errorMessage: null,
      completedAt: null,
      startedAt: run.startedAt.toISOString(),
    };
  }

  const [snapshot] = await db
    .select()
    .from(overviewSnapshots)
    .where(
      and(
        eq(overviewSnapshots.accountId, accountId),
        eq(overviewSnapshots.companyUuid, companyUuid),
      ),
    )
    .limit(1);

  if (snapshot) {
    return {
      status: "complete",
      runId: snapshot.agentRunId,
      errorMessage: null,
      completedAt: snapshot.generatedAt.toISOString(),
      startedAt: null,
    };
  }

  if (!run) {
    return {
      status: "none",
      runId: null,
      errorMessage: null,
      completedAt: null,
      startedAt: null,
    };
  }
  if (run.status === "failed") {
    return {
      status: "failed",
      runId: run.id,
      errorMessage: run.errorMessage,
      completedAt: run.completedAt?.toISOString() ?? null,
      startedAt: run.startedAt.toISOString(),
    };
  }

  return {
    status: "none",
    runId: run.id,
    errorMessage: null,
    completedAt: null,
    startedAt: run.startedAt.toISOString(),
  };
}

export async function loadOverviewApiResponse(opts: {
  accountId: string;
  companyUuid: string;
  cohortKey: string | null;
  /** Cohort bands for Edit Benchmark field meta (from loadOverviewCohortContext). */
  benchmarkRows?: BenchmarkRow[];
  allCohorts?: OverviewCohortListEntry[];
}): Promise<OverviewApiResponse> {
  const generation = await getOverviewGenerationStatus(opts.accountId, opts.companyUuid);
  const db = await getDb();
  const benchmarkRows = opts.benchmarkRows ?? [];

  const [snapshot] = await db
    .select()
    .from(overviewSnapshots)
    .where(
      and(
        eq(overviewSnapshots.accountId, opts.accountId),
        eq(overviewSnapshots.companyUuid, opts.companyUuid),
      ),
    )
    .limit(1);

  // Form prefills load even when generation has not produced a snapshot yet.
  const [answers, benchmarkDrawer] = await Promise.all([
    loadPrefillDetailAnswers(opts),
    loadBenchmarkDrawerPayload({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      cohortKey: opts.cohortKey,
      benchmarkRows,
      allCohorts: opts.allCohorts,
    }),
  ]);
  const detailAnswers = trimDetailAnswers(answers);

  if (!snapshot) {
    return {
      generation,
      snapshotId: null,
      advisor: null,
      categories: [],
      cohortKey: opts.cohortKey,
      detailAnswers,
      benchmarkDrawer,
    };
  }

  const scores = await db
    .select()
    .from(overviewCategoryScores)
    .where(eq(overviewCategoryScores.snapshotId, snapshot.id));

  const benchmarkValues = await loadBenchmarkValuesForCompany(opts);
  const recCtx = await loadRecommendedActionsContext({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    answers,
    benchmarkValues,
  });
  const recommendedActions = buildAdvisorRecommendedActions(recCtx);

  const intelRows = await db
    .select({
      id: companyIntelligence.id,
      headline: companyIntelligence.headline,
      summary: companyIntelligence.summary,
      keyDetail: companyIntelligence.keyDetail,
      metadata: companyIntelligence.metadata,
    })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        eq(companyIntelligence.source, "overview_generation"),
      ),
    );

  const latestSnapshotId = snapshot.id;
  const intelByCategory = new Map<OverviewCategoryId, TrackInsightIntelItem[]>();
  const intelCountByCategory = new Map<OverviewCategoryId, number>();
  for (const id of ["dev", "mkt", "rev"] as OverviewCategoryId[]) {
    intelByCategory.set(id, []);
    intelCountByCategory.set(id, 0);
  }
  for (const row of intelRows) {
    const meta = row.metadata as {
      overviewCategory?: string;
      snapshotId?: string;
    } | null;
    // Overview glance + insights: latest regenerate only.
    if (meta?.snapshotId !== latestSnapshotId) continue;
    const cat = meta?.overviewCategory;
    if (cat !== "dev" && cat !== "mkt" && cat !== "rev") continue;
    intelByCategory.get(cat)?.push({
      id: row.id,
      title: row.headline,
      text: row.summary,
      highlight: row.keyDetail,
    });
    intelCountByCategory.set(cat, (intelCountByCategory.get(cat) ?? 0) + 1);
  }

  const profilePct = profileCompletionPct(answers);
  const profileSummary = buildProfileInsightSummary(answers);

  const openInitByCategory = await countOpenOverviewInitiativesByCategory({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });

  const categories = scores.map((s) => {
    const categoryId = s.categoryId as OverviewCategoryId;
    const scored = computeCategoryScore({
      categoryId,
      answers,
      profileCompletionPct: profilePct,
      benchmarkValues,
      benchmarkRows,
    });
    const contributors =
      scored.contributors.length > 0
        ? scored.contributors
        : parseScoreContributors(s.scoreContributors);
    const insights = buildTrackInsightLists(
      categoryId,
      contributors,
      intelByCategory.get(categoryId) ?? [],
      profileSummary,
    );
    return {
      categoryId,
      label: CATEGORY_META[categoryId].label,
      fullLabel: CATEGORY_META[categoryId].fullLabel,
      score: s.score,
      statusLabel: s.statusLabel,
      statusTone: s.statusTone,
      confidenceLevel: s.confidenceLevel,
      focusNarrative: buildCategoryFocusNarrative(categoryId, s.score, contributors),
      insight: s.insight,
      strengths: toStrengthWeaknessPayload(insights.strengths),
      weaknesses: toStrengthWeaknessPayload(insights.weaknesses),
      benchmarkChips: s.benchmarkChips ?? [],
      stats: s.stats ?? [],
      intelligenceCount: intelCountByCategory.get(categoryId) ?? 0,
      initiativeCount: openInitByCategory.get(categoryId) ?? 0,
      playbookCount: s.playbookCount ?? 0,
      detailAnsweredCount: s.detailAnsweredCount ?? 0,
      detailQuestionCount: s.detailQuestionCount ?? 0,
    };
  });

  // Prefer deterministic tags over AI snapshot (often empty / omitted by the model).
  const signalTags = buildAdvisorSignalTags(
    categories.map((c) => ({
      categoryId: c.categoryId,
      score: c.score,
      intelligenceCount: c.intelligenceCount,
      weaknessCount: c.weaknesses.length,
    })),
  );

  return {
    generation,
    snapshotId: snapshot.id,
    advisor: {
      summary: snapshot.advisorSummary,
      signalTags,
      recommendedActions,
      journeyStage: snapshot.journeyStage,
      journeyLabel: snapshot.journeyLabel,
      contextCompletionPct: snapshot.contextCompletionPct ?? 0,
    },
    categories,
    cohortKey: opts.cohortKey,
    detailAnswers,
    benchmarkDrawer,
  };
}

function buildProfileInsightSummary(
  answers: Record<string, string | null | undefined>,
): string | null {
  const parts = [
    answers.profile_product_description,
    answers.profile_top_priorities,
    answers.dev_product_type,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));
  return parts.length > 0 ? parts.slice(0, 3).join(" · ") : null;
}

function parseScoreContributors(raw: unknown): ScoreContributor[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = ScoreContributorSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function loadCategoryDetail(opts: {
  accountId: string;
  companyUuid: string;
  categoryId: OverviewCategoryId;
  cohortKey?: string | null;
  benchmarkRows: BenchmarkRow[];
  benchmarkValues: Record<string, number | null>;
}): Promise<{
  category: OverviewApiResponse["categories"][0] | null;
  /** Latest-snapshot overview intelligence as feed items for SignalDetailDrawer. */
  intelligence: IntelligenceFeedItem[];
  initiatives: {
    suggested: Array<{
      id: string;
      name: string;
      description: string | null;
      benefit: string | null;
      isNew: boolean;
      milestones: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
    }>;
    active: Array<{
      id: string;
      name: string;
      description: string | null;
      milestones: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
    }>;
  };
  playbooks: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    reason: string | null;
  }>;
  formRows: FormAnswerRow[];
  benchmarkGaps: BenchmarkGapRow[];
  /** Company-wide benchmark meta for “Your inputs” (Design filterImportantBenchmarks). */
  benchmarkMeta: { loggedCount: number; totalCount: number };
}> {
  // Must pass cohort bands — without benchmarkRows, computeCategoryScore marks
  // logged metrics as "Not logged" and buildTrackInsightLists drops them, so
  // glance chips like "Customer retention" vanish on the track detail page.
  const overview = await loadOverviewApiResponse({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    cohortKey: opts.cohortKey ?? null,
    benchmarkRows: opts.benchmarkRows,
  });
  const category =
    overview.categories.find((c) => c.categoryId === opts.categoryId) ?? null;

  const db = await getDb();
  const answers = await loadMergedAnswers({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });

  const intelligence = await db
    .select()
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        eq(companyIntelligence.source, "overview_generation"),
      ),
    )
    .orderBy(desc(companyIntelligence.createdAt));

  const filteredIntel = intelligence.filter((row) => {
    const meta = row.metadata as {
      overviewCategory?: string;
      snapshotId?: string;
    } | null;
    if (meta?.overviewCategory !== opts.categoryId) return false;
    // Detail list matches glance: latest overview generation only.
    if (!overview.snapshotId) return false;
    return meta?.snapshotId === overview.snapshotId;
  });

  const intelligenceRows: CompanyIntelligenceRow[] = filteredIntel.map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const metaTitle =
      typeof meta.title === "string" && meta.title.trim() ? meta.title.trim() : null;
    // Overview persist historically wrote 0–100; feed formatter expects 0–1.
    const confidence = row.confidence > 1 ? row.confidence / 100 : row.confidence;
    return {
      id: row.id,
      companyUuid: row.companyUuid,
      category: row.category as IntelligenceCategory,
      headline: row.headline,
      keyDetail: row.keyDetail,
      summary: row.summary,
      confidence,
      source: row.source,
      generationPath: row.generationPath,
      period: row.period,
      contextItemId: row.contextItemId,
      documentVersionId: row.documentVersionId,
      documentLabel: metaTitle,
      rawSnippet: row.rawSnippet,
      isBenchmark: row.isBenchmark,
      authorEmail: row.authorEmail,
      createdAt: row.createdAt.toISOString(),
      overviewCategory:
        typeof meta.overviewCategory === "string" && meta.overviewCategory.trim()
          ? meta.overviewCategory.trim()
          : null,
      evidenceSource:
        typeof meta.evidenceSource === "string" && meta.evidenceSource.trim()
          ? meta.evidenceSource.trim()
          : null,
    };
  });

  const intelligenceFeed = buildFeedItems({
    observations: [],
    intelligence: intelligenceRows,
    catalog: [],
  });

  const initiatives = await db
    .select()
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        eq(companyInitiatives.overviewCategoryId, opts.categoryId),
      ),
    );

  const initiativeIds = initiatives.map((i) => i.id);
  const milestoneRows =
    initiativeIds.length > 0
      ? await db
          .select()
          .from(initiativeMilestones)
          .where(inArray(initiativeMilestones.initiativeId, initiativeIds))
          .orderBy(asc(initiativeMilestones.sortOrder))
      : [];
  const milestonesByInitiative = new Map<
    string,
    Array<{ id: string; title: string; status: string; dueDate: string | null }>
  >();
  for (const m of milestoneRows) {
    const list = milestonesByInitiative.get(m.initiativeId) ?? [];
    list.push({
      id: m.id,
      title: m.label,
      status: m.status,
      dueDate: m.dueDate,
    });
    milestonesByInitiative.set(m.initiativeId, list);
  }

  const latestSnapshotId = overview.snapshotId;
  const mapActive = (i: (typeof initiatives)[number]) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    milestones: milestonesByInitiative.get(i.id) ?? [],
  });
  const mapSuggested = (i: (typeof initiatives)[number]) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    benefit: i.benefit ?? null,
    isNew: Boolean(latestSnapshotId && i.overviewSnapshotId === latestSnapshotId),
    milestones: milestonesByInitiative.get(i.id) ?? [],
  });

  const suggested = initiatives
    .filter((i) => i.status === "draft")
    .map(mapSuggested)
    .sort((a, b) => Number(b.isNew) - Number(a.isNew));
  const active = initiatives.filter((i) => i.status === "active").map(mapActive);

  let playbookRows: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    reason: string | null;
  }> = [];

  if (overview.snapshotId) {
    const suggestions = await db
      .select({
        reason: overviewPlaybookSuggestions.reason,
        playbook: playbooks,
      })
      .from(overviewPlaybookSuggestions)
      .innerJoin(playbooks, eq(playbooks.id, overviewPlaybookSuggestions.playbookId))
      .where(
        and(
          eq(overviewPlaybookSuggestions.snapshotId, overview.snapshotId),
          eq(overviewPlaybookSuggestions.categoryId, opts.categoryId),
        ),
      );

    playbookRows = suggestions.map((s) => ({
      id: s.playbook.id,
      slug: s.playbook.slug,
      title: s.playbook.title,
      description: s.playbook.description,
      content: s.playbook.content,
      reason: s.reason,
    }));
  }

  const section = TRACK_DETAIL_SECTIONS.find((s) => s.id === opts.categoryId);
  const questions = section ? getVisibleQuestions(section, answers) : [];
  const formRows: FormAnswerRow[] = questions.map((q) => {
    const raw = answers[q.id] ?? null;
    const row = scoreAnswerRow(q.id, raw);
    return {
      questionId: q.id,
      label: DETAIL_QUESTION_LABEL[q.id] ?? q.prompt,
      answer: formatDetailAnswerDisplay(raw),
      tone: row.tone,
      flag: row.flag,
    };
  });

  const { gaps: benchmarkGaps, loggedCount, totalCount } = buildBenchmarkGaps(
    opts.benchmarkValues,
    opts.benchmarkRows,
  );

  return {
    category,
    intelligence: intelligenceFeed,
    initiatives: { suggested, active },
    playbooks: playbookRows,
    formRows,
    benchmarkGaps,
    benchmarkMeta: { loggedCount, totalCount },
  };
}

export async function loadScoreBreakdown(opts: {
  accountId: string;
  companyUuid: string;
  categoryId: OverviewCategoryId;
}): Promise<{
  score: number;
  contributors: Array<Record<string, unknown>>;
} | null> {
  const db = await getDb();
  const [snapshot] = await db
    .select()
    .from(overviewSnapshots)
    .where(
      and(
        eq(overviewSnapshots.accountId, opts.accountId),
        eq(overviewSnapshots.companyUuid, opts.companyUuid),
      ),
    )
    .limit(1);
  if (!snapshot) return null;

  const [row] = await db
    .select()
    .from(overviewCategoryScores)
    .where(
      and(
        eq(overviewCategoryScores.snapshotId, snapshot.id),
        eq(overviewCategoryScores.categoryId, opts.categoryId),
      ),
    )
    .limit(1);
  if (!row) return null;

  return {
    score: row.score,
    contributors: (row.scoreContributors ?? []) as Array<Record<string, unknown>>,
  };
}

/**
 * Design filterImportantBenchmarks — company-wide metrics that are
 * not logged or below / bottom of cohort (shown on every track detail).
 */
function buildBenchmarkGaps(
  values: Record<string, number | null>,
  rows: BenchmarkRow[],
): { gaps: BenchmarkGapRow[]; loggedCount: number; totalCount: number } {
  const metrics = OVERVIEW_BENCHMARK_METRIC_KEYS;
  const gaps: BenchmarkGapRow[] = [];
  let loggedCount = 0;

  for (const metric of metrics) {
    const value = values[metric];
    const row = rows.find((r) => r.metric === metric);
    const label = METRIC_LABELS[metric] ?? metric;
    const inverted = INVERTED_METRICS.has(metric) || row?.invertedGood === true;

    if (value == null || !row?.p50) {
      gaps.push({
        metric,
        label,
        value: null,
        position: "Not logged",
        tier: "missing",
      });
      continue;
    }

    loggedCount += 1;
    const tier = tierFromPercentile(
      value,
      row.p25 ?? 0,
      row.p50,
      row.p75 ?? row.p50,
      row.p90 ?? row.p75 ?? row.p50,
      inverted,
    );
    if (tier === "lower" || tier === "bottom") {
      gaps.push({
        metric,
        label,
        value: formatGapValue(metric, value),
        position: tier === "bottom" ? "Bottom of cohort" : "Below median",
        tier,
      });
    }
  }

  return { gaps, loggedCount, totalCount: metrics.length };
}

function formatGapValue(metric: string, value: number): string {
  if (metric.endsWith("_usd")) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value)}`;
  }
  if (metric.endsWith("_pct")) return `${Math.round(value)}%`;
  if (metric.endsWith("_count") || metric === "fte_count") return String(Math.round(value));
  return String(value);
}
