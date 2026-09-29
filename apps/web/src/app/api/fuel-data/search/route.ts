import { NextResponse, type NextRequest } from "next/server";
import { searchCompanies } from "@/lib/fuel-data";
import { getSession } from "@/lib/auth/session";
import { captureFuelDataException } from "@/lib/sentry/capture";

export async function GET(req: NextRequest) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 10)));
  try {
    const results = await searchCompanies(q, limit);
    return NextResponse.json({ results });
  } catch (e) {
    captureFuelDataException(e, "search");
    console.error("fuel-data search failed", e);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
