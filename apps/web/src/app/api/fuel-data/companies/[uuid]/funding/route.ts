import { NextResponse, type NextRequest } from "next/server";
import { getCompanyFunding } from "@/lib/fuel-data";
import { getSession } from "@/lib/auth/session";
import { captureFuelDataException } from "@/lib/sentry/capture";

export async function GET(req: NextRequest, ctx: { params: Promise<{ uuid: string }> }) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { uuid } = await ctx.params;
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50)));
  try {
    const rounds = await getCompanyFunding(uuid, limit);
    return NextResponse.json({ rounds });
  } catch (e) {
    captureFuelDataException(e, "funding");
    console.error("fuel-data funding failed", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
