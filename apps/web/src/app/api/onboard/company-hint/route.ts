import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isGenericProvider } from "@/lib/auth/email-domains";
import { getCachedCompanyHintBundle } from "@/lib/onboard/resolve-company-hint-bundle";
import { resolveCompanyHint } from "@/lib/onboard/resolve-company-hint";
import { hintToOnboardOption } from "@/lib/onboard/map-company-hit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolve company hint + domain-scoped candidates from session email. */
export async function GET(): Promise<Response> {
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

    const bundle = await getCachedCompanyHintBundle(email);
    return NextResponse.json(bundle);
  } catch (e) {
    console.error("GET /api/onboard/company-hint failed", e);
    const session = await getSession().catch(() => null);
    const email = session?.email ?? "mike@york.ie";
    const hint = await resolveCompanyHint(email);
    const fallback = hintToOnboardOption(hint);
    return NextResponse.json({
      hint,
      candidates: fallback ? [fallback] : [],
    });
  }
}
