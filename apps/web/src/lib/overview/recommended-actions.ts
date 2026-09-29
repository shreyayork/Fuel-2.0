import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { catalogCompanies, companyDetailAnswers, companyIntelligence } from "@/db/schema";
import { listArtifactsForCompany } from "@/lib/artifacts";
import type { CatalogOnboardingSnapshot } from "@/lib/onboard/claim-profile";
import {
  currentPeriod,
  getLatestSubmittedForCompany,
} from "@/lib/portfolio-updates";
import { BENCHMARK_DRAWER_FIELDS, countLoggedBenchmarkMetrics } from "./benchmark-drawer-fields";
import type { RecommendedActionsContext } from "./build-recommended-actions";
import { currentQuarterLabel } from "./constants";
import {
  countApplicableQuestions,
  countDetailAnswers,
} from "./detail-question-catalog";
import { mapOnboardingToAnswers } from "./onboarding-field-map";

export {
  buildAdvisorRecommendedActions,
  type RecommendedAction,
  type RecommendedActionsContext,
} from "./build-recommended-actions";

async function countUserIntelligence(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        ne(companyIntelligence.source, "overview_generation"),
      ),
    );
  return row?.count ?? 0;
}

async function latestDetailQuarterLabel(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ quarterLabel: companyDetailAnswers.quarterLabel })
    .from(companyDetailAnswers)
    .where(
      and(
        eq(companyDetailAnswers.accountId, opts.accountId),
        eq(companyDetailAnswers.companyUuid, opts.companyUuid),
      ),
    )
    .orderBy(desc(companyDetailAnswers.updatedAt))
    .limit(1);
  return row?.quarterLabel ?? null;
}

export async function loadRecommendedActionsContext(opts: {
  accountId: string;
  companyUuid: string;
  answers: Record<string, string | null | undefined>;
  benchmarkValues: Record<string, number | null | undefined>;
  onboarding?: CatalogOnboardingSnapshot | null;
}): Promise<RecommendedActionsContext> {
  const benchFilled = countLoggedBenchmarkMetrics(opts.benchmarkValues);
  const benchTotal = BENCHMARK_DRAWER_FIELDS.length;
  const benchComplete = benchFilled >= benchTotal;

  const latestSubmitted = await getLatestSubmittedForCompany({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
  });
  const benchQuarterStale =
    benchComplete
    && latestSubmitted != null
    && latestSubmitted.period !== currentPeriod();

  const artifacts = await listArtifactsForCompany({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    limit: 100,
  });
  const userIntelCount = await countUserIntelligence(opts);
  const docCount = artifacts.length;
  const hasUserSources = docCount > 0 || userIntelCount > 0;

  const detailTotal = countApplicableQuestions(opts.answers);
  const detailAnswered = countDetailAnswers(opts.answers);

  let onboarding = opts.onboarding ?? null;
  if (!onboarding) {
    const db = await getDb();
    const [catalog] = await db
      .select({ sources: catalogCompanies.sources })
      .from(catalogCompanies)
      .where(
        and(
          eq(catalogCompanies.id, opts.companyUuid),
          eq(catalogCompanies.accountId, opts.accountId),
        ),
      )
      .limit(1);
    onboarding =
      (catalog?.sources as { onboarding?: CatalogOnboardingSnapshot } | undefined)
        ?.onboarding ?? null;
  }

  const onboardingSeeded = mapOnboardingToAnswers(onboarding).filter(
    (a) => !a.questionId.startsWith("profile_"),
  ).length;

  const savedDetailQuarter = await latestDetailQuarterLabel(opts);
  const detailsQuarterStale =
    detailTotal > 0
    && detailAnswered >= detailTotal
    && savedDetailQuarter != null
    && savedDetailQuarter !== currentQuarterLabel();

  return {
    benchFilled,
    benchTotal,
    benchQuarterStale,
    hasUserSources,
    docCount,
    userIntelCount,
    detailTotal,
    detailAnswered,
    onboardingSeeded,
    detailsQuarterStale,
  };
}
