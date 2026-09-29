import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireOverviewAccess } from "@/lib/overview/access";
import { loadFullSummaryPayload } from "@/lib/overview/load-full-summary";

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

    const url = new URL(_req.url);
    const companyName = url.searchParams.get("name")?.trim() || "Company";

    const data = await loadFullSummaryPayload({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      companyName,
    });
    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
