import { NextResponse } from "next/server";
import { getCreditSnapshot } from "@/lib/credits/queries";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  const snapshot = await getCreditSnapshot(auth.account.id);
  return NextResponse.json({ snapshot });
}
