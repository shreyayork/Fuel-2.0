import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireCreditsAuth, isAuthResponse } from "@/lib/credits/auth";
import { dismissProfileCompletionPrompt } from "@/lib/credits/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;
  try {
    await dismissProfileCompletionPrompt(auth.account.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.setTag("integration", "credits");
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
