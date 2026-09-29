import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { acceptSuggestedInitiative } from "@/lib/company-initiatives";
import { requireOverviewAccess } from "@/lib/overview/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  initiativeId: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  try {
    const { uuid } = await ctx.params;
    const access = await requireOverviewAccess(uuid);
    if (!access.ok) return access.response;

    const { initiativeId } = Body.parse(await req.json());
    const row = await acceptSuggestedInitiative({
      accountId: access.ctx.accountId,
      id: initiativeId,
      createdByEmail: access.ctx.email,
    });

    if (!row || row.companyUuid !== uuid) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, initiativeId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
