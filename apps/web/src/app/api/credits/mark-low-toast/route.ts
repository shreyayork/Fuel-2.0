import { NextResponse } from "next/server";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import { markMonthlyLowToastShown } from "@/lib/credits/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  await markMonthlyLowToastShown(auth.account.id);
  return NextResponse.json({ ok: true });
}
