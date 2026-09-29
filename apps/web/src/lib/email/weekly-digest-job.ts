import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accountMembers,
  accounts,
  catalogCompanies,
  companyInitiatives,
  companyIntelligence,
  initiativeMilestones,
  overviewCategoryScores,
  overviewSnapshots,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import {
  digestBadgeForScore,
  notesFromTrackInsights,
  renderWeeklyDigestEmail,
  type DigestInitiativeItem,
  type DigestIntelligenceItem,
  type DigestScorecardRow,
} from "@/lib/email/weekly-digest";
import { loadOverviewCohortContext } from "@/lib/overview/cohort";
import { CATEGORY_META, type OverviewCategoryId } from "@/lib/overview/constants";
import {
  loadBenchmarkValuesForCompany,
  loadPrefillDetailAnswers,
} from "@/lib/overview/map-input";
import { computeCategoryScore, profileCompletionPct } from "@/lib/overview/score";
import {
  buildTrackInsightLists,
  toStrengthWeaknessPayload,
  type TrackInsightIntelItem,
} from "@/lib/overview/track-insights";
import { ScoreContributorSchema, type ScoreContributor } from "@/lib/overview/types";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  getUserPreference,
  setUserPreference,
} from "@/lib/user-preferences";

const PREF_PREFIX = "email_weekly_digest";

export function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weekOfLabel(d: Date): string {
  const months = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ];
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const dayNum = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  return `WEEK OF ${months[month - 1]} ${dayNum}`;
}

function asCategoryId(id: string): OverviewCategoryId | null {
  if (id === "dev" || id === "mkt" || id === "rev") return id;
  return null;
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

export interface WeeklyDigestJobResult {
  considered: number;
  sent: number;
  skipped: number;
  errors: number;
}

/**
 * Friday digest for founder (operating) workspaces with a primary company.
 * Idempotent per (owner email, account, ISO week).
 *
 * Schedule: EventBridge `cron(0 20 ? * FRI *)` = Friday 20:00 UTC
 * (3:00 PM EST / 4:00 PM EDT). Matches Jira “Friday 3PM EST” in standard time.
 */
export async function runWeeklyDigestJob(now = new Date()): Promise<WeeklyDigestJobResult> {
  const weekKey = isoWeekKey(now);
  const label = weekOfLabel(now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const db = await getDb();
  const rows = await db
    .select({
      accountId: accounts.id,
      companyUuid: accounts.primaryCompanyUuid,
      ownerEmail: accountMembers.userEmail,
      sources: catalogCompanies.sources,
    })
    .from(accounts)
    .innerJoin(
      accountMembers,
      and(
        eq(accountMembers.accountId, accounts.id),
        eq(accountMembers.role, "owner"),
      ),
    )
    .innerJoin(
      catalogCompanies,
      eq(catalogCompanies.id, accounts.primaryCompanyUuid),
    )
    .where(sql`${accounts.primaryCompanyUuid} is not null`);

  const result: WeeklyDigestJobResult = {
    considered: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  for (const row of rows) {
    if (!row.companyUuid) continue;
    result.considered += 1;

    const onboarding = (row.sources as { onboarding?: { flowType?: string } } | null)
      ?.onboarding;
    const flowType = onboarding?.flowType ?? "operating";
    if (flowType === "investor") {
      result.skipped += 1;
      continue;
    }

    const prefKey = `${PREF_PREFIX}:${row.accountId}:${weekKey}`;
    try {
      const already = await getUserPreference({
        userEmail: row.ownerEmail,
        key: prefKey,
      });
      if (already) {
        result.skipped += 1;
        continue;
      }

      const payload = await buildDigestPayload({
        accountId: row.accountId,
        companyUuid: row.companyUuid,
        weekAgo,
        weekOfLabel: label,
      });

      if (
        payload.scorecard.length === 0 &&
        payload.intelligence.length === 0 &&
        payload.initiatives.length === 0
      ) {
        result.skipped += 1;
        continue;
      }

      const rendered = renderWeeklyDigestEmail(payload);
      await sendEmail({
        to: row.ownerEmail,
        subject: `Fuel weekly digest · ${label.replace(/^WEEK OF /, "")}`,
        html: rendered.html,
        text: rendered.text,
      });
      await setUserPreference({
        userEmail: row.ownerEmail,
        key: prefKey,
        value: now.toISOString(),
      });
      result.sent += 1;
    } catch (error) {
      result.errors += 1;
      captureIntegrationException(error, {
        integration: "ses",
        operation: "weekly_digest",
        context: { accountId: row.accountId },
      });
    }
  }

  return result;
}

async function buildDigestPayload(opts: {
  accountId: string;
  companyUuid: string;
  weekAgo: Date;
  weekOfLabel: string;
}): Promise<{
  companyUuid: string;
  weekOfLabel: string;
  scorecard: DigestScorecardRow[];
  intelligence: DigestIntelligenceItem[];
  initiatives: DigestInitiativeItem[];
}> {
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

  const scorecard: DigestScorecardRow[] = [];
  if (snapshot) {
    const scores = await db
      .select()
      .from(overviewCategoryScores)
      .where(eq(overviewCategoryScores.snapshotId, snapshot.id));

    // Live insights (same pipeline as Overview UI) — persisted strengths/weaknesses stay empty.
    const [answers, benchmarkValues, cohort, overviewIntelRows] = await Promise.all([
      loadPrefillDetailAnswers({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
      }),
      loadBenchmarkValuesForCompany({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
      }),
      loadOverviewCohortContext(opts.companyUuid),
      db
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
        ),
    ]);

    const intelByCategory = new Map<OverviewCategoryId, TrackInsightIntelItem[]>();
    for (const id of ["dev", "mkt", "rev"] as OverviewCategoryId[]) {
      intelByCategory.set(id, []);
    }
    for (const row of overviewIntelRows) {
      const meta = row.metadata as {
        overviewCategory?: string;
        snapshotId?: string;
      } | null;
      if (meta?.snapshotId !== snapshot.id) continue;
      const cat = meta?.overviewCategory;
      if (cat !== "dev" && cat !== "mkt" && cat !== "rev") continue;
      intelByCategory.get(cat)?.push({
        id: row.id,
        title: row.headline,
        text: row.summary,
        highlight: row.keyDetail,
      });
    }

    const profilePct = profileCompletionPct(answers);
    const profileSummary = buildProfileInsightSummary(answers);

    for (const catId of ["dev", "mkt", "rev"] as const) {
      const row = scores.find((s) => s.categoryId === catId);
      if (!row || row.score == null) continue;
      const id = asCategoryId(row.categoryId);
      if (!id) continue;
      const score = Number(row.score);
      const scored = computeCategoryScore({
        categoryId: id,
        answers,
        profileCompletionPct: profilePct,
        benchmarkValues,
        benchmarkRows: cohort.benchmarkRows,
      });
      const contributors =
        scored.contributors.length > 0
          ? scored.contributors
          : parseScoreContributors(row.scoreContributors);
      const insights = buildTrackInsightLists(
        id,
        contributors,
        intelByCategory.get(id) ?? [],
        profileSummary,
      );
      const notes = notesFromTrackInsights({
        strengths: toStrengthWeaknessPayload(insights.strengths),
        weaknesses: toStrengthWeaknessPayload(insights.weaknesses),
      });
      scorecard.push({
        label: CATEGORY_META[id].label,
        score: Math.round(score),
        badge: digestBadgeForScore(score),
        workingNote: notes.workingNote,
        needsNote: notes.needsNote,
      });
    }
  }

  const intelRows = await db
    .select({
      category: companyIntelligence.category,
      headline: companyIntelligence.headline,
      keyDetail: companyIntelligence.keyDetail,
      summary: companyIntelligence.summary,
    })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        isNull(companyIntelligence.dismissedAt),
        gte(companyIntelligence.createdAt, opts.weekAgo),
      ),
    )
    .orderBy(desc(companyIntelligence.createdAt))
    .limit(8);

  const intelligence: DigestIntelligenceItem[] = intelRows.map((r) => {
    const category = (r.category ?? "General").trim();
    const sub = (r.headline ?? "").trim() || "Update";
    const note = (r.keyDetail ?? r.summary ?? "").trim() || sub;
    return { line: `${category} | ${sub} - ${note}` };
  });

  const active = await db
    .select({
      id: companyInitiatives.id,
      name: companyInitiatives.name,
    })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        eq(companyInitiatives.status, "active"),
      ),
    )
    .orderBy(desc(companyInitiatives.updatedAt))
    .limit(5);

  const initiatives: DigestInitiativeItem[] = [];
  for (const init of active) {
    const milestones = await db
      .select({ status: initiativeMilestones.status })
      .from(initiativeMilestones)
      .where(eq(initiativeMilestones.initiativeId, init.id));
    let progressPct: number | null = null;
    if (milestones.length > 0) {
      const done = milestones.filter((m) => m.status === "done").length;
      progressPct = Math.round((done / milestones.length) * 100);
    }
    initiatives.push({ name: init.name, progressPct });
  }

  return {
    companyUuid: opts.companyUuid,
    weekOfLabel: opts.weekOfLabel,
    scorecard,
    intelligence,
    initiatives,
  };
}
