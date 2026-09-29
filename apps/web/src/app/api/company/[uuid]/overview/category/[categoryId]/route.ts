import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireOverviewAccess } from "@/lib/overview/access";
import { isOverviewCategoryId } from "@/lib/overview/constants";
import { loadOverviewCohortContext } from "@/lib/overview/cohort";
import { buildOverviewInput } from "@/lib/overview/map-input";
import { loadCategoryDetail } from "@/lib/overview/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ uuid: string; categoryId: string }> },
): Promise<Response> {
  try {
    const { uuid, categoryId } = await ctx.params;
    if (!isOverviewCategoryId(categoryId)) {
      return NextResponse.json({ error: "invalid_category" }, { status: 400 });
    }

    const access = await requireOverviewAccess(uuid);
    if (!access.ok) return access.response;

    const { cohortKey, benchmarkRows } = await loadOverviewCohortContext(uuid);
    const input = await buildOverviewInput({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      cohortKey,
      benchmarkRows,
    });

    const detail = await loadCategoryDetail({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      categoryId,
      cohortKey,
      benchmarkRows,
      benchmarkValues: input.benchmarkValues,
    });

    return NextResponse.json(detail);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
