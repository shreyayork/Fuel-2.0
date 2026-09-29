import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { requireOverviewAccess } from "@/lib/overview/access";
import {
  BENCHMARK_DRAWER_FIELDS,
  emptyBenchmarkDrawerValues,
  isAllBenchmarkDrawerValuesFilled,
  parseBenchmarkDrawerValue,
  type BenchmarkDrawerValues,
} from "@/lib/overview/benchmark-drawer-fields";
import {
  enqueueOverviewRegen,
  enqueueOverviewRegenAndLoad,
} from "@/lib/overview/after-mutation";
import {
  loadOverviewCohortContext,
  persistOverviewCohortKey,
} from "@/lib/overview/cohort";
import { loadBenchmarkDrawerPayload } from "@/lib/overview/form-payload";
import { buildOverviewInput, loadMergedAnswers } from "@/lib/overview/map-input";
import { awardEligibleProfileCredits } from "@/lib/overview/award-profile-credits";
import { recalcSnapshotScores } from "@/lib/overview/sync-answers";
import {
  currentPeriod,
  getForPeriod,
  getLatestSubmittedForCompany,
  upsertUpdate,
} from "@/lib/portfolio-updates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  values: z.record(z.string(), z.string()),
  cohortKey: z.string().trim().max(120).nullish(),
  regenerate: z.boolean().optional().default(true),
  /** When false, skip loading the full overview payload (faster for navigate-away flows). */
  includeOverview: z.boolean().optional().default(true),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  try {
    const { uuid } = await ctx.params;
    const access = await requireOverviewAccess(uuid);
    if (!access.ok) return access.response;

    const cohortParam = new URL(req.url).searchParams.get("cohort");
    const { cohortKey, benchmarkRows, allCohorts } = await loadOverviewCohortContext(
      uuid,
      { cohortKeyOverride: cohortParam },
    );
    const payload = await loadBenchmarkDrawerPayload({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      cohortKey,
      benchmarkRows,
      allCohorts,
    });

    return NextResponse.json(payload);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  try {
    const { uuid } = await ctx.params;
    const access = await requireOverviewAccess(uuid);
    if (!access.ok) return access.response;

    const body = Body.parse(await req.json());
    const period = currentPeriod();

    const existing =
      (await getForPeriod({
        accountId: access.ctx.accountId,
        companyUuid: uuid,
        period,
      })) ??
      (await getLatestSubmittedForCompany({
        accountId: access.ctx.accountId,
        companyUuid: uuid,
      }));

    const parsed: Partial<
      Record<(typeof BENCHMARK_DRAWER_FIELDS)[number]["column"], number | null>
    > = {};
    let invalidKey: string | null = null;

    for (const field of BENCHMARK_DRAWER_FIELDS) {
      const raw = body.values[field.key] ?? "";
      if (!raw.trim()) {
        parsed[field.column] = null;
        continue;
      }
      const n = parseBenchmarkDrawerValue(raw);
      if (n == null || n < 0) {
        invalidKey = field.key;
        break;
      }
      parsed[field.column] = field.unit === "count" ? Math.round(n) : n;
    }

    if (invalidKey) {
      return NextResponse.json(
        { error: "invalid_value", field: invalidKey },
        { status: 400 },
      );
    }

    const metric = (
      key: (typeof BENCHMARK_DRAWER_FIELDS)[number]["column"],
    ): number | null => {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        return parsed[key] ?? null;
      }
      const fromExisting = existing?.[key];
      return typeof fromExisting === "number" ? fromExisting : null;
    };

    await upsertUpdate({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      period,
      asOf: existing?.asOf ?? null,
      fteCount: metric("fteCount"),
      paidCustomerCount: metric("paidCustomerCount"),
      arrUsd: metric("arrUsd"),
      arrGrowthYoyPct: metric("arrGrowthYoyPct"),
      nrrPct: metric("nrrPct"),
      logoRetentionPct: metric("logoRetentionPct"),
      grossMarginPct: metric("grossMarginPct"),
      cacPaybackMonths: metric("cacPaybackMonths"),
      burnMultiple: metric("burnMultiple"),
      ruleOf40Pct: metric("ruleOf40Pct"),
      cashOnHandUsd: metric("cashOnHandUsd"),
      monthlyBurnUsd: metric("monthlyBurnUsd"),
      notableCustomers: existing?.notableCustomers ?? null,
      notableHires: existing?.notableHires ?? null,
      otherUpdates: existing?.otherUpdates ?? null,
      challenges: existing?.challenges ?? null,
      bankingPartner: existing?.bankingPartner ?? null,
      legalCounsel: existing?.legalCounsel ?? null,
      cloudProvider: existing?.cloudProvider ?? null,
      capTablePlatform: existing?.capTablePlatform ?? null,
      doInsuranceProvider: existing?.doInsuranceProvider ?? null,
      crmPlatform: existing?.crmPlatform ?? null,
      openToInvestorIntros: existing?.openToInvestorIntros ?? false,
      signals: existing?.signals ?? null,
      sourceObservationIds: existing?.sourceObservationIds ?? null,
      submittedByEmail: access.ctx.email,
      status: "submitted",
    });

    const mergedAnswers = await loadMergedAnswers({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
    });
    const benchValues = emptyBenchmarkDrawerValues();
    for (const key of Object.keys(benchValues) as Array<keyof BenchmarkDrawerValues>) {
      if (body.values[key] != null) benchValues[key] = body.values[key] ?? "";
    }
    const rewards = await awardEligibleProfileCredits({
      accountId: access.ctx.accountId,
      answers: mergedAnswers,
      benchmarkComplete: isAllBenchmarkDrawerValuesFilled(benchValues),
    });

    const requestedCohort = body.cohortKey?.trim() || null;
    if (requestedCohort) {
      const preview = await loadOverviewCohortContext(uuid, {
        cohortKeyOverride: requestedCohort,
      });
      if (preview.allCohorts.some((c) => c.cohortKey === requestedCohort)) {
        await persistOverviewCohortKey({
          accountId: access.ctx.accountId,
          companyUuid: uuid,
          cohortKey: requestedCohort,
        });
      }
    }

    // Navigate-away clients (playbook CTA) return immediately after persist.
    // Score recalc + AI regen continue in the background.
    if (!body.includeOverview) {
      void (async () => {
        try {
          const { cohortKey, benchmarkRows } = await loadOverviewCohortContext(uuid, {
            cohortKeyOverride: requestedCohort,
          });
          const input = await buildOverviewInput({
            accountId: access.ctx.accountId,
            companyUuid: uuid,
            cohortKey,
            benchmarkRows,
          });
          await recalcSnapshotScores({
            accountId: access.ctx.accountId,
            companyUuid: uuid,
            answers: input.answers,
            benchmarkRows,
            benchmarkValues: input.benchmarkValues,
          });
          await enqueueOverviewRegen({
            accountId: access.ctx.accountId,
            companyUuid: uuid,
            userEmail: access.ctx.email,
            regenerate: body.regenerate,
          });
        } catch (error) {
          Sentry.captureException(error);
        }
      })();
      return NextResponse.json({ ok: true, regenerating: body.regenerate, rewards });
    }

    const { cohortKey, benchmarkRows } = await loadOverviewCohortContext(uuid, {
      cohortKeyOverride: requestedCohort,
    });
    const input = await buildOverviewInput({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      cohortKey,
      benchmarkRows,
    });

    await recalcSnapshotScores({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      answers: input.answers,
      benchmarkRows,
      benchmarkValues: input.benchmarkValues,
    });

    const { regenerating, overview } = await enqueueOverviewRegenAndLoad({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      userEmail: access.ctx.email,
      regenerate: body.regenerate,
    });

    return NextResponse.json({ ok: true, regenerating, overview, rewards });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
