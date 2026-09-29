import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isGenericProvider, parseEmailDomain } from "@/lib/auth/email-domains";
import { searchOnboardCompanies } from "@/lib/onboard/resolve-company-hint-bundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Typeahead company search — fuel-data OpenSearch, session domain used for ranking only. */
export async function GET(req: Request): Promise<Response> {
  try {
    if (process.env.COGNITO_USER_POOL_ID) {
      const session = await getSession();
      if (!session) redirect("/sign-in?next=/onboard");
    }

    const session = await getSession();
    const email = session?.email ?? "mike@york.ie";
    if (!email) {
      return NextResponse.json({ error: "no_session" }, { status: 401 });
    }

    if (isGenericProvider(email)) {
      return NextResponse.json({ error: "blocked_provider" }, { status: 400 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (!q) {
      return NextResponse.json({ candidates: [] });
    }

    const domain = parseEmailDomain(email);
    const candidates = await searchOnboardCompanies(q, domain, 8);
    return NextResponse.json({ candidates });
  } catch (e) {
    console.error("GET /api/onboard/company-search failed", e);
    return NextResponse.json({ candidates: [] });
  }
}
