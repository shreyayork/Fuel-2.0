import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { requireOverviewAccess } from "@/lib/overview/access";
import { enqueueOverviewRegenAndLoad } from "@/lib/overview/after-mutation";
import { loadOverviewCohortContext } from "@/lib/overview/cohort";
import { buildOverviewInput, loadPrefillDetailAnswers } from "@/lib/overview/map-input";
import { trimDetailAnswers } from "@/lib/overview/form-payload";
import { upsertDetailAnswers, recalcSnapshotScores } from "@/lib/overview/sync-answers";
import { awardEligibleProfileCredits } from "@/lib/overview/award-profile-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  try {
    const { uuid } = await ctx.params;
    const access = await requireOverviewAccess(uuid);
    if (!access.ok) return access.response;

    const answers = trimDetailAnswers(
      await loadPrefillDetailAnswers({
        accountId: access.ctx.accountId,
        companyUuid: uuid,
      }),
    );

    return NextResponse.json({ answers });
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

    const url = new URL(req.url);
    const regenerate = url.searchParams.get("regenerate") === "true";

    const body = Body.parse(await req.json());
    await upsertDetailAnswers({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      answers: body.answers,
    });

    const rewards = await awardEligibleProfileCredits({
      accountId: access.ctx.accountId,
      answers: body.answers,
    });

    const { cohortKey, benchmarkRows } = await loadOverviewCohortContext(uuid);
    const input = await buildOverviewInput({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      cohortKey,
      benchmarkRows,
    });

    // Deterministic score refresh — immediate for the client.
    await recalcSnapshotScores({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      answers: input.answers,
      benchmarkRows,
      benchmarkValues: input.benchmarkValues,
    });

    // AI advisor / intelligence refresh runs in the background.
    const { regenerating, overview } = await enqueueOverviewRegenAndLoad({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      userEmail: access.ctx.email,
      regenerate,
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
