import { NextResponse } from "next/server";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import { catalogFlowForAccount, getProPlanDto } from "@/lib/credits/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;
  const flow = await catalogFlowForAccount(auth.account.id);
  const plan = await getProPlanDto(flow);
  return NextResponse.json({ plan });
}
