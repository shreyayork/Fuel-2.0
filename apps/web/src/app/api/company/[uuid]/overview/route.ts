import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireOverviewAccess } from "@/lib/overview/access";
import { loadOverviewCohortContext } from "@/lib/overview/cohort";
import { loadOverviewApiResponse } from "@/lib/overview/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  try {
    const { uuid } = await ctx.params;
    const access = await requireOverviewAccess(uuid);
    if (!access.ok) return access.response;

    const { cohortKey, benchmarkRows, allCohorts } = await loadOverviewCohortContext(uuid);
    const data = await loadOverviewApiResponse({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      cohortKey,
      benchmarkRows,
      allCohorts,
    });
    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
