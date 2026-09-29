import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import { createManualIntelligence } from "@/lib/intelligence/queries";
import { INTELLIGENCE_CATEGORIES } from "@/lib/intelligence/constants";
import { currentPeriod } from "@/lib/portfolio-updates";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categorySchema = z.enum(INTELLIGENCE_CATEGORIES);

const bodySchema = z.object({
  category: categorySchema,
  /** Optional in initiative drawer context — defaults to current period. */
  period: z.string().min(1).optional(),
  headline: z.string().min(1).max(120),
  keyDetail: z.string().max(240).optional(),
  summary: z.string().max(500).optional(),
});

function accessErrorResponse(error: DataRoomAccessError) {
  return NextResponse.json(
    { error: error.code },
    { status: error.code === "not_found" ? 404 : 403 },
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  const { uuid } = await ctx.params;

  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const account = await getActiveAccountForUser(email);
  if (!account) {
    return NextResponse.json({ error: "no_account" }, { status: 403 });
  }

  try {
    await assertCompanyDataRoomAccess(account, uuid);
  } catch (e) {
    if (e instanceof DataRoomAccessError) return accessErrorResponse(e);
    throw e;
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const row = await createManualIntelligence({
      accountId: account.id,
      companyUuid: uuid,
      category: parsed.category,
      period: parsed.period?.trim() || currentPeriod(),
      headline: parsed.headline,
      keyDetail: parsed.keyDetail ?? null,
      summary: parsed.summary ?? null,
      authorEmail: email,
    });
    return NextResponse.json(row);
  } catch (e) {
    captureIntegrationException(e, {
      integration: "database",
      operation: "intelligence_manual_log",
      context: { companyUuid: uuid },
    });
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
