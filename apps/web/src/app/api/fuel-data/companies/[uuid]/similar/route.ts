import { NextResponse, type NextRequest } from "next/server";
import { searchSimilarCompanies } from "@/lib/fuel-data";
import { getSession } from "@/lib/auth/session";
import { captureFuelDataException } from "@/lib/sentry/capture";

export async function GET(req: NextRequest, ctx: { params: Promise<{ uuid: string }> }) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { uuid } = await ctx.params;
  const limit = Math.min(24, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 6)));
  try {
    const similar = await searchSimilarCompanies(uuid, limit);
    return NextResponse.json({ similar });
  } catch (e) {
    captureFuelDataException(e, "similar");
    console.error("fuel-data similar failed", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
