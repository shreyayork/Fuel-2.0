import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  catalogCompanies,
  companyDetailAnswers,
  companyIntelligence,
} from "@/db/schema";
import type { CatalogOnboardingSnapshot } from "@/lib/onboard/claim-profile";
import { getLatestSubmittedForCompany } from "@/lib/portfolio-updates";
import type { PortfolioUpdate } from "@/db/schema";
import { listDataRoomSnapshot } from "@/lib/data-room/queries";
import { benchmarkMetricValuesFromColumns } from "./benchmark-drawer-fields";
import {
  buildOverviewCompanyContext,
  buildOverviewFounderNarrative,
  type OverviewCompanyContext,
  type OverviewFounderNarrative,
} from "./company-context";
import type { OverviewCategoryId } from "./constants";
import { currentQuarterLabel } from "./constants";
import {
  TRACK_DETAIL_SECTIONS,
  getVisibleQuestions,
} from "./detail-question-catalog";
import {
  mapCatalogCompanyToProfileAnswers,
  mapOnboardingToAnswers,
  overlayMissingAnswers,
} from "./onboarding-field-map";
import type { BenchmarkRow } from "./score";

export async function loadMergedAnswers(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<Record<string, string | null>> {
  const db = await getDb();
  const [rows, [catalog]] = await Promise.all([
    db
      .select()
      .from(companyDetailAnswers)
      .where(
        and(
          eq(companyDetailAnswers.accountId, opts.accountId),
          eq(companyDetailAnswers.companyUuid, opts.companyUuid),
        ),
      ),
    db
      .select()
      .from(catalogCompanies)
      .where(
        and(
          eq(catalogCompanies.id, opts.companyUuid),
          eq(catalogCompanies.accountId, opts.accountId),
        ),
      )
      .limit(1),
  ]);

  const stored: Record<string, string | null> = {};
  for (const r of rows) {
    stored[r.questionId] = r.answer;
  }

  const onboarding = (catalog?.sources as { onboarding?: CatalogOnboardingSnapshot } | undefined)
    ?.onboarding;
  const fromOnboarding = Object.fromEntries(
    mapOnboardingToAnswers(onboarding).map((m) => [m.questionId, m.answer]),
  );
  const fromCatalog = mapCatalogCompanyToProfileAnswers(catalog);

  return overlayMissingAnswers(stored, fromOnboarding, fromCatalog);
}

export async function seedAnswersFromOnboarding(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<number> {
  const db = await getDb();
  const [catalog] = await db
    .select()
    .from(catalogCompanies)
    .where(
      and(
        eq(catalogCompanies.id, opts.companyUuid),
        eq(catalogCompanies.accountId, opts.accountId),
      ),
    )
    .limit(1);

  if (!catalog?.sources) return 0;

  const onboarding = (catalog.sources as { onboarding?: CatalogOnboardingSnapshot })
    .onboarding;
  const mapped = mapOnboardingToAnswers(onboarding);
  let inserted = 0;

  for (const m of mapped) {
    const [existing] = await db
      .select({ id: companyDetailAnswers.id })
      .from(companyDetailAnswers)
      .where(
        and(
          eq(companyDetailAnswers.accountId, opts.accountId),
          eq(companyDetailAnswers.companyUuid, opts.companyUuid),
          eq(companyDetailAnswers.questionId, m.questionId),
        ),
      )
      .limit(1);
    if (existing) continue;

    await db.insert(companyDetailAnswers).values({
      id: `cda_${randomUUID()}`,
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      questionId: m.questionId,
      answer: m.answer,
      source: m.source,
      quarterLabel: currentQuarterLabel(),
    });
    inserted += 1;
  }

  return inserted;
}

/** Seed missing onboarding rows, then merge catalog/onboarding into stored answers. */
export async function loadPrefillDetailAnswers(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<Record<string, string | null>> {
  await seedAnswersFromOnboarding(opts);
  return loadMergedAnswers(opts);
}

export function benchmarkValuesFromPortfolioUpdate(
  latest: PortfolioUpdate | null | undefined,
): Record<string, number | null> {
  return benchmarkMetricValuesFromColumns(latest);
}

export async function loadBenchmarkValuesForCompany(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<Record<string, number | null>> {
  const latest = await getLatestSubmittedForCompany(opts);
  return benchmarkValuesFromPortfolioUpdate(latest);
}

export async function buildOverviewInput(opts: {
  accountId: string;
  companyUuid: string;
  cohortKey: string | null;
  benchmarkRows: BenchmarkRow[];
}): Promise<{
  companyName: string;
  cohortKey: string | null;
  answers: Record<string, string | null>;
  benchmarkValues: Record<string, number | null>;
  profileCompletionPct: number;
  onboarding: CatalogOnboardingSnapshot | null;
  company: OverviewCompanyContext | undefined;
  founderNarrative: OverviewFounderNarrative | undefined;
  activeIntelligence: Array<{
    id: string;
    type: string;
    title: string;
    highlight: string | null;
    category: string;
    documentVersionId: string | null;
  }>;
  activeDocuments: Array<{
    id: string;
    title: string;
    typeLabel: string;
  }>;
}> {
  const answers = await loadPrefillDetailAnswers(opts);

  const db = await getDb();
  const [catalog] = await db
    .select()
    .from(catalogCompanies)
    .where(
      and(
        eq(catalogCompanies.id, opts.companyUuid),
        eq(catalogCompanies.accountId, opts.accountId),
      ),
    )
    .limit(1);

  const onboarding =
    (catalog?.sources as { onboarding?: CatalogOnboardingSnapshot } | undefined)
      ?.onboarding ?? null;

  const latest = await getLatestSubmittedForCompany({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });

  const benchmarkValues = benchmarkValuesFromPortfolioUpdate(latest);

  const { profileCompletionPct: pct } = await import("./score");
  const profilePct = pct(answers);

  const intelRows = await db
    .select({
      id: companyIntelligence.id,
      category: companyIntelligence.category,
      headline: companyIntelligence.headline,
      keyDetail: companyIntelligence.keyDetail,
      metadata: companyIntelligence.metadata,
      documentVersionId: companyIntelligence.documentVersionId,
    })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        isNull(companyIntelligence.dismissedAt),
      ),
    )
    .orderBy(desc(companyIntelligence.createdAt))
    .limit(40);

  const activeIntelligence = intelRows.map((row) => {
    const meta = (row.metadata ?? {}) as { intelligenceType?: string };
    return {
      id: row.id,
      type: meta.intelligenceType?.trim() || row.category,
      title: row.headline,
      highlight: row.keyDetail,
      category: row.category,
      documentVersionId: row.documentVersionId,
    };
  });

  const dataRoom = await listDataRoomSnapshot({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });
  const activeDocuments = dataRoom.slots
    .filter((slot) => slot.current)
    .map((slot) => ({
      id: slot.current!.id,
      title: slot.current!.name,
      typeLabel: slot.typeLabel,
    }));

  return {
    companyName: catalog?.name ?? "Company",
    cohortKey: opts.cohortKey ?? onboarding?.cohortKey ?? null,
    answers,
    benchmarkValues,
    profileCompletionPct: profilePct,
    onboarding,
    company: buildOverviewCompanyContext({ catalog, onboarding, answers }),
    founderNarrative: buildOverviewFounderNarrative(latest),
    activeIntelligence,
    activeDocuments,
  };
}

export function countAnsweredForCategory(
  categoryId: OverviewCategoryId,
  answers: Record<string, string | null | undefined>,
): { answered: number; total: number } {
  const section = TRACK_DETAIL_SECTIONS.find((s) => s.id === categoryId);
  if (!section) return { answered: 0, total: 0 };
  const visible = getVisibleQuestions(section, answers);
  const answered = visible.filter((q) => answers[q.id]?.trim()).length;
  return { answered, total: visible.length };
}
