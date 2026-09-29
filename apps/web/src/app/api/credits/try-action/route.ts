import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isCreditActionType } from "@/lib/credits/constants";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import { tryCreditAction } from "@/lib/credits/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  let body: { action?: string; referenceId?: string };
  try {
    body = (await req.json()) as { action?: string; referenceId?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = body.action ?? "";
  if (!isCreditActionType(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  try {
    const result = await tryCreditAction(auth.account.id, action, {
      referenceId: body.referenceId,
      userEmail: auth.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    Sentry.setTag("integration", "credits");
    Sentry.captureException(error);
    throw error;
  }
}
