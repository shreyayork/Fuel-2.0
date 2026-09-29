import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireOverviewAccess } from "@/lib/overview/access";
import { isOverviewCategoryId } from "@/lib/overview/constants";
import { loadScoreBreakdown } from "@/lib/overview/queries";

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

    const data = await loadScoreBreakdown({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      categoryId,
    });

    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
