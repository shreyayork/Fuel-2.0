import { NextResponse } from "next/server";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import { getSubscribedBilling } from "@/lib/credits/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  const billing = await getSubscribedBilling(auth.account.id);
  return NextResponse.json({ billing });
}
