import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { searchPeople } from "@/lib/fuel-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * JSON endpoint over fuel-data's `searchPeople` Gremlin query.
 * Auth-gated. The Add Advisor form is manual-only; this remains for other callers.
 */
export async function GET(req: Request) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session?.email) return NextResponse.json({ results: [] }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const limit = Math.max(1, Math.min(25, Number(url.searchParams.get("limit") ?? "15")));
  const results = await searchPeople(q, limit);
  return NextResponse.json({ results });
}
