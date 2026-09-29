import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { searchInvestors } from "@/lib/fuel-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Thin proxy over fuel-data searchInvestors — authenticated callers only. */
export async function GET(req: Request) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session?.email) return NextResponse.json({ results: [] }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? "20")));
  const results = await searchInvestors(q, limit);
  return NextResponse.json({ results });
}
