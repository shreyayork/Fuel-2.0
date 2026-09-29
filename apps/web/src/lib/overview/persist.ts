import "server-only";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  companyIntelligence,
  overviewCategoryScores,
  overviewPlaybookSuggestions,
  overviewSnapshots,
} from "@/db/schema";
import {
  countOpenOverviewInitiativesByCategory,
  createCompanyInitiative,
  type InitiativeArea,
  type InitiativeSourceDocument,
} from "@/lib/company-initiatives";
import { signalCategoryToIntelligenceCategory } from "@/lib/intelligence/category-map";
import type { SignalCatalogDef } from "@/lib/intelligence/signal-catalog";
import { currentPeriod } from "@/lib/portfolio-updates";
import {
  CATEGORY_META,
  type OverviewCategoryId,
} from "./constants";
import { countAnsweredForCategory } from "./map-input";
import { computeCategoryScore } from "./score";
import type { BenchmarkRow } from "./score";
import type { OverviewAiResponse } from "./types";
import { buildCategoryFocusNarrative } from "./focus-narrative";
import {
  buildAdvisorRecommendedActions,
  loadRecommendedActionsContext,
} from "./recommended-actions";
import {
  loadOverviewPlaybookCatalog,
  resolveSuggestedPlaybooks,
  type OverviewPlaybookCatalogEntry,
} from "./playbook-catalog";
import { filterOverviewIntelligence } from "./filter-overview-intelligence";
import { logOverviewPersistStats } from "./perf-log";
import {
  overviewIntelPrefersBenchmark,
  overviewIntelligenceSourceTitle,
  parseOverviewEvidenceSource,
} from "@/lib/intelligence/source-label";
import {
  resolveTaggedIntelligenceLinks,
  type DocIntel,
} from "@/lib/initiatives/from-document-helpers";

type ActiveIntel = {
  id: string;
  type: string;
  title: string;
  highlight: string | null;
  category: string;
  documentVersionId: string | null;
};

type ActiveDoc = {
  id: string;
  title: string;
  typeLabel: string;
};

type GeneratedIntel = {
  id: string;
  type: string;
  title: string;
  highlight: string | null;
  category: string;
  categoryId: OverviewCategoryId;
  signalId: string;
};

function toDocIntel(item: {
  id: string;
  type: string;
  title: string;
  highlight: string | null;
  category: string;
  signalId?: string;
}): DocIntel {
  return {
    id: item.id,
    type: item.type,
    headline: item.title,
    category: item.category,
    highlight: item.highlight,
    signalId: item.signalId,
  };
}

function resolveSourceDocuments(opts: {
  docs:
    | Array<{ id?: string; title: string; type_label?: string }>
    | undefined;
  activeDocuments: ActiveDoc[];
}): InitiativeSourceDocument[] {
  if (!opts.docs?.length) return [];
  const out: InitiativeSourceDocument[] = [];
  for (const doc of opts.docs) {
    const title = doc.title.trim();
    if (!title) continue;
    const byId = doc.id
      ? opts.activeDocuments.find((d) => d.id === doc.id)
      : undefined;
    const byTitle =
      byId ??
      opts.activeDocuments.find(
        (d) =>
          d.title.toLowerCase() === title.toLowerCase() ||
          d.typeLabel.toLowerCase() === title.toLowerCase() ||
          (doc.type_label &&
            d.typeLabel.toLowerCase() === doc.type_label.toLowerCase()),
      );
    out.push({
      id: byTitle?.id ?? doc.id ?? `doc_${randomUUID()}`,
      documentVersionId: byTitle?.id ?? doc.id ?? null,
      title: byTitle?.title ?? title,
      typeLabel: byTitle?.typeLabel ?? doc.type_label ?? null,
    });
  }
  return out;
}

export async function persistOverviewGeneration(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  agentRunId: string | null;
  playbookId: string | null;
  aiModel: string;
  ai: OverviewAiResponse;
  answers: Record<string, string | null>;
  benchmarkRows: BenchmarkRow[];
  benchmarkValues: Record<string, number | null>;
  profileCompletionPct: number;
  playbookCatalog?: OverviewPlaybookCatalogEntry[];
  signalCatalog?: SignalCatalogDef[];
  activeIntelligence?: ActiveIntel[];
  activeDocuments?: ActiveDoc[];
}): Promise<{ snapshotId: string }> {
  const db = await getDb();
  const snapshotId = `ovs_${randomUUID()}`;

  await db
    .delete(overviewSnapshots)
    .where(
      and(
        eq(overviewSnapshots.accountId, opts.accountId),
        eq(overviewSnapshots.companyUuid, opts.companyUuid),
      ),
    );

  // Keep existing draft + active initiatives across regenerates; only append
  // newly suggested ones below. Completed initiatives stay excluded from counts.

  const recCtx = await loadRecommendedActionsContext({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    answers: opts.answers,
    benchmarkValues: opts.benchmarkValues,
  });
  const recommendedActions = buildAdvisorRecommendedActions(recCtx);

  await db.insert(overviewSnapshots).values({
    id: snapshotId,
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    advisorSummary: opts.ai.advisor.summary,
    signalTags: opts.ai.advisor.signal_tags,
    recommendedActions,
    journeyStage: opts.ai.journey_stage?.current ?? null,
    journeyLabel: opts.ai.journey_stage?.label ?? null,
    contextCompletionPct: opts.profileCompletionPct,
    playbookId: opts.playbookId,
    agentRunId: opts.agentRunId,
    aiModel: opts.aiModel,
    generatedAt: new Date(),
  });

  const preparedIntel: Array<
    GeneratedIntel & {
      text: string;
      evidenceSource: ReturnType<typeof parseOverviewEvidenceSource>;
      sourceTitle: string;
      valueNumeric: number | null;
      valueText: string | null;
      valueBool: boolean | null;
    }
  > = [];
  const signalById = new Map(
    (opts.signalCatalog ?? []).map((s) => [s.id, s] as const),
  );
  // Drop Unknown / unlogged-metric placeholders (common after partial onboard).
  const intelligenceItems = filterOverviewIntelligence(opts.ai.intelligence, {
    benchmarkValues: opts.benchmarkValues,
  });
  for (const item of intelligenceItems) {
    const id = `ci_${randomUUID()}`;
    const signalDef = signalById.get(item.signal_id);
    const signalCategory = item.signal_category ?? signalDef?.category ?? item.type;
    const headline = signalDef?.label ?? item.title;
    const preferBenchmark = overviewIntelPrefersBenchmark({
      signalId: item.signal_id,
      benchmarkValues: opts.benchmarkValues,
    });
    const evidenceSource = parseOverviewEvidenceSource(item.evidence_source);
    const sourceTitle =
      overviewIntelligenceSourceTitle({
        categoryId: item.category_id,
        preferBenchmark,
        evidenceSource,
      }) ?? "R&D Form";
    preparedIntel.push({
      id,
      type: item.type,
      title: headline,
      highlight: item.highlight ?? null,
      category: signalCategory,
      categoryId: item.category_id,
      signalId: item.signal_id,
      text: item.text,
      evidenceSource,
      sourceTitle,
      valueNumeric: item.value_numeric ?? null,
      valueText: item.value_text ?? null,
      valueBool: item.value_bool ?? null,
    });
  }

  const playbookCatalog =
    opts.playbookCatalog ??
    (await loadOverviewPlaybookCatalog({ accountId: opts.accountId }));
  const resolvedPlaybooks = await resolveSuggestedPlaybooks({
    accountId: opts.accountId,
    catalog: playbookCatalog,
    suggested: opts.ai.suggested_playbooks,
  });

  // Create new suggested drafts before scoring so initiativeCount includes
  // previous open (draft + active) initiatives plus this generation's suggestions.
  const existingIntel = opts.activeIntelligence ?? [];
  const activeDocuments = opts.activeDocuments ?? [];
  const matchPool: DocIntel[] = [
    ...preparedIntel.map(toDocIntel),
    ...existingIntel.map((item) => toDocIntel(item)),
  ];
  // Multi-tag replacement for the old singular `taggedLink` lookup.
  const { linksByInitiative, persistIds } = resolveTaggedIntelligenceLinks({
    initiatives: opts.ai.suggested_initiatives,
    matchPool,
    generatedIds: preparedIntel.map((item) => item.id),
  });
  logOverviewPersistStats({
    companyUuid: opts.companyUuid,
    snapshotId,
    generatedCount: preparedIntel.length,
    persistedCount: persistIds.size,
    initiativeCount: opts.ai.suggested_initiatives.length,
    taggedLinkCount: linksByInitiative.reduce((n, links) => n + links.length, 0),
  });

  for (const item of preparedIntel) {
    if (!persistIds.has(item.id)) continue;
    await db.insert(companyIntelligence).values({
      id: item.id,
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      category: signalCategoryToIntelligenceCategory(item.category),
      headline: item.title,
      keyDetail: item.highlight ?? null,
      summary: item.text,
      confidence: 1,
      source: "overview_generation",
      generationPath: "overview",
      period: currentPeriod(),
      metadata: {
        overviewCategory: item.categoryId,
        intelligenceType: item.type,
        signalId: item.signalId,
        snapshotId,
        aiGenerated: true,
        valueNumeric: item.valueNumeric,
        valueText: item.valueText,
        valueBool: item.valueBool,
        ...(item.evidenceSource ? { evidenceSource: item.evidenceSource } : {}),
        // Feed Sources chip via documentLabel / resolveDocumentLabel
        title: item.sourceTitle,
      },
      authorEmail: opts.userEmail,
      agentRunId: opts.agentRunId,
    });
  }

  for (let i = 0; i < opts.ai.suggested_initiatives.length; i++) {
    const init = opts.ai.suggested_initiatives[i]!;
    const taggedLinks = linksByInitiative[i] ?? [];
    const area =
      (CATEGORY_META[init.category_id as OverviewCategoryId]?.initiativeArea ??
        "other") as InitiativeArea;
    const rawName = init.title.trim();
    const name =
      rawName && rawName.toLowerCase() !== "initiative"
        ? rawName
        : `${CATEGORY_META[init.category_id].label} operating initiative`;
    const sourceDocuments = resolveSourceDocuments({
      docs: init.source_documents,
      activeDocuments,
    });
    // Persist AI milestones (title / due_date / checked) into initiative_milestones.
    await createCompanyInitiative({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      kind: init.cadence === "one-time" ? "onetime" : "continuous",
      name,
      area,
      description: init.description,
      status: "draft",
      ownerEmail: opts.userEmail,
      due: init.due_date ?? null,
      createdByEmail: opts.userEmail,
      source: "overview",
      overviewSnapshotId: snapshotId,
      overviewCategoryId: init.category_id,
      intelligenceLinks: taggedLinks,
      sourceDocuments,
      sourceRationale: init.source_rationale ?? null,
      benefit: init.benefit ?? null,
      priority: init.priority ?? null,
      baselineMetric: init.baseline_metric ?? null,
      targetMetric: init.target_metric ?? null,
      benchmarkCohort: init.benchmark_cohort ?? null,
      milestones: (init.milestones ?? []).map((m) => ({
        title: m.title,
        dueDate: m.due_date ?? null,
        checked: m.checked === true,
      })),
      yorkHelp: init.york_help
        ? {
            section_title: init.york_help.section_title,
            bullets: init.york_help.bullets.map((b) => ({
              title: b.title || b.milestone || b.primary_service,
              milestone: b.milestone || b.title || b.primary_service,
              help: b.help,
              primary_service: b.primary_service,
              track: b.track,
            })),
            cta_label: init.york_help.cta_label,
          }
        : null,
    });
  }

  // draft (suggested) + active only — survives regenerate when AI returns fewer/none.
  const openInitByCategory = await countOpenOverviewInitiativesByCategory({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });

  for (const cat of opts.ai.categories) {
    const categoryId = cat.id as OverviewCategoryId;
    const scored = computeCategoryScore({
      categoryId,
      answers: opts.answers,
      profileCompletionPct: opts.profileCompletionPct,
      benchmarkValues: opts.benchmarkValues,
      benchmarkRows: opts.benchmarkRows,
    });

    const counts = countAnsweredForCategory(categoryId, opts.answers);
    const catIntel = preparedIntel.filter(
      (item) => persistIds.has(item.id) && item.categoryId === categoryId,
    ).length;
    const catInit = openInitByCategory.get(categoryId) ?? 0;
    const catPb = resolvedPlaybooks.filter((p) => p.category_id === categoryId).length;

    await db.insert(overviewCategoryScores).values({
      id: `ocs_${randomUUID()}`,
      snapshotId,
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      categoryId,
      label: CATEGORY_META[categoryId].label,
      fullLabel: CATEGORY_META[categoryId].fullLabel,
      score: scored.score,
      statusLabel: scored.statusLabel,
      statusTone: scored.statusTone,
      confidenceLevel: cat.confidence_level ?? "Medium",
      focusNarrative: buildCategoryFocusNarrative(
        categoryId,
        scored.score,
        scored.contributors,
      ),
      insight: cat.insight ?? null,
      strengths: [],
      weaknesses: [],
      benchmarkChips: cat.benchmark_chips,
      stats: cat.stats,
      scoreContributors: scored.contributors,
      intelligenceCount: catIntel,
      initiativeCount: catInit,
      playbookCount: catPb,
      detailAnsweredCount: counts.answered,
      detailQuestionCount: counts.total,
    });
  }

  let rank = 0;
  for (const sug of resolvedPlaybooks) {
    await db.insert(overviewPlaybookSuggestions).values({
      id: `ops_${randomUUID()}`,
      snapshotId,
      playbookId: sug.playbookId,
      categoryId: sug.category_id,
      reason: sug.reason,
      rank: rank++,
    });
  }

  return { snapshotId };
}
