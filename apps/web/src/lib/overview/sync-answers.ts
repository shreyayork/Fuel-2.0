import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { catalogCompanies, companyDetailAnswers } from "@/db/schema";
import type { CatalogOnboardingSnapshot } from "@/lib/onboard/claim-profile";
import type { OnboardingProfileFormSnapshot } from "@/lib/onboard/onboarding-answers";
import { parseFoundedYear } from "@/lib/enrichment/crunchbase-fields";
import { parseProfileFundingRounds } from "./detail-question-catalog";
import { reverseMapToOnboarding } from "./onboarding-field-map";
import { currentQuarterLabel } from "./constants";
import { computeCategoryScore, profileCompletionPct } from "./score";
import type { OverviewCategoryId } from "./constants";
import type { BenchmarkRow } from "./score";
import { countAnsweredForCategory } from "./map-input";
import { randomUUID } from "node:crypto";
import {
  overviewCategoryScores,
  overviewSnapshots,
} from "@/db/schema";
import { buildCategoryFocusNarrative } from "./focus-narrative";

export async function upsertDetailAnswers(opts: {
  accountId: string;
  companyUuid: string;
  answers: Record<string, string>;
}): Promise<void> {
  const db = await getDb();
  const quarter = currentQuarterLabel();

  for (const [questionId, answer] of Object.entries(opts.answers)) {
    const trimmed = answer.trim();
    const [existing] = await db
      .select()
      .from(companyDetailAnswers)
      .where(
        and(
          eq(companyDetailAnswers.accountId, opts.accountId),
          eq(companyDetailAnswers.companyUuid, opts.companyUuid),
          eq(companyDetailAnswers.questionId, questionId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(companyDetailAnswers)
        .set({
          answer: trimmed || null,
          quarterLabel: existing.quarterLabel ?? quarter,
          updatedAt: new Date(),
        })
        .where(eq(companyDetailAnswers.id, existing.id));
    } else {
      await db.insert(companyDetailAnswers).values({
        id: `cda_${randomUUID()}`,
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        questionId,
        answer: trimmed || null,
        quarterLabel: quarter,
        source: "overview",
      });
    }
  }

  await syncAnswersToCatalog(opts);
}

function emptyProfileForm(): OnboardingProfileFormSnapshot {
  return {
    company: "",
    whatTheyDo: "",
    businessModel: "",
    industry: "",
    founded: "",
    city: "",
    stateRegion: "",
    country: "",
    website: "",
    linkedin: "",
    additionalContext: "",
  };
}

/** Update the existing catalog row — never insert a second company. */
async function syncAnswersToCatalog(opts: {
  accountId: string;
  companyUuid: string;
  answers: Record<string, string>;
}): Promise<void> {
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
  if (!catalog) return;

  const answers = opts.answers;
  const patch: {
    name?: string;
    shortDescription?: string | null;
    industry?: string | null;
    foundedOn?: string | null;
    locationCity?: string | null;
    locationState?: string | null;
    locationCountry?: string | null;
    website?: string | null;
    linkedinUrl?: string | null;
    employeeCount?: string | null;
    sources?: Record<string, unknown>;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  let columnsChanged = false;

  const companyName = answers.profile_company?.trim();
  if (companyName) {
    patch.name = companyName.slice(0, 200);
    columnsChanged = true;
  }

  const setNullable = (
    key: "shortDescription" | "industry" | "locationCity" | "locationState" | "locationCountry" | "website" | "linkedinUrl" | "employeeCount",
    questionId: string,
    max: number,
  ) => {
    if (!(questionId in answers)) return;
    const trimmed = answers[questionId]!.trim().slice(0, max);
    patch[key] = trimmed || null;
    columnsChanged = true;
  };
  setNullable("shortDescription", "profile_product_description", 2_000);
  setNullable("industry", "profile_industry", 120);
  setNullable("locationCity", "profile_city", 120);
  setNullable("locationState", "profile_state", 120);
  setNullable("locationCountry", "profile_country", 120);
  setNullable("website", "profile_website", 500);
  setNullable("linkedinUrl", "profile_linkedin", 500);
  setNullable("employeeCount", "profile_headcount", 60);

  if ("profile_founded" in answers) {
    const raw = answers.profile_founded.trim();
    patch.foundedOn = (parseFoundedYear(raw) ?? raw) || null;
    columnsChanged = true;
  }

  const sources = { ...((catalog.sources ?? {}) as Record<string, unknown>) };
  const onboarding = {
    ...((sources.onboarding ?? {}) as CatalogOnboardingSnapshot),
  };
  let snapshotChanged = false;

  for (const [questionId, answer] of Object.entries(answers)) {
    const rev = reverseMapToOnboarding(questionId, answer);
    if (!rev) continue;
    if (rev.profileField) {
      onboarding.profileForm = {
        ...(onboarding.profileForm ?? emptyProfileForm()),
        [rev.profileField]: answer,
      };
      snapshotChanged = true;
    }
    if (rev.operatingField && onboarding.operating) {
      onboarding.operating = {
        ...onboarding.operating,
        [rev.operatingField]: answer,
      };
      snapshotChanged = true;
    }
  }

  if ("profile_funding_rounds" in answers) {
    onboarding.fundingRounds = parseProfileFundingRounds(answers.profile_funding_rounds);
    snapshotChanged = true;
  }

  if (snapshotChanged) {
    sources.onboarding = onboarding;
    patch.sources = sources;
  }

  if (!columnsChanged && !snapshotChanged) return;

  await db
    .update(catalogCompanies)
    .set(patch)
    .where(eq(catalogCompanies.id, opts.companyUuid));
}

export async function recalcSnapshotScores(opts: {
  accountId: string;
  companyUuid: string;
  answers: Record<string, string | null>;
  benchmarkRows: BenchmarkRow[];
  benchmarkValues: Record<string, number | null>;
}): Promise<void> {
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
  if (!snapshot) return;

  const profilePct = profileCompletionPct(opts.answers);
  const categoryIds: OverviewCategoryId[] = ["dev", "mkt", "rev"];

  for (const categoryId of categoryIds) {
    const result = computeCategoryScore({
      categoryId,
      answers: opts.answers,
      profileCompletionPct: profilePct,
      benchmarkValues: opts.benchmarkValues,
      benchmarkRows: opts.benchmarkRows,
    });
    const counts = countAnsweredForCategory(categoryId, opts.answers);

    await db
      .update(overviewCategoryScores)
      .set({
        score: result.score,
        statusLabel: result.statusLabel,
        statusTone: result.statusTone,
        scoreContributors: result.contributors,
        focusNarrative: buildCategoryFocusNarrative(
          categoryId,
          result.score,
          result.contributors,
        ),
        detailAnsweredCount: counts.answered,
        detailQuestionCount: counts.total,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(overviewCategoryScores.snapshotId, snapshot.id),
          eq(overviewCategoryScores.categoryId, categoryId),
        ),
      );
  }
}
