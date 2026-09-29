import { NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getDb } from "@/db/client";
import { advisors } from "@/db/schema";
import { fetchLinkedInProfile } from "@/lib/enrichment/linkedin-profile";
import { updateAdvisor } from "@/lib/advisors";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// OpenNext-routed functions get the full Lambda timeout; this route is
// intentionally capped client-side by BATCH_MAX.
export const maxDuration = 60;

// One per call keeps every request comfortably under CloudFront's ~30s
// origin timeout even when Bright Data is slow. Client loops until done.
const BATCH_MAX = 1;

/**
 * Bulk-enhance advisors from LinkedIn. Sequential per call, limited to
 * BATCH_MAX rows so the Lambda request doesn't run long. The Bright Data
 * cache (7 days) means subsequent calls re-enhance free. Invoke repeatedly
 * until `remaining` is 0.
 *
 * Query params:
 *   - ?force=1    re-fetch even when linkedinFetchedAt is already set
 *
 * Returns: { enhanced: [...], errors: [...], remaining: number }
 */
export async function POST(req: Request) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) return NextResponse.json({ error: "no account" }, { status: 403 });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const db = await getDb();
  const candidates = await db
    .select()
    .from(advisors)
    .where(
      and(
        eq(advisors.accountId, account.id),
        isNotNull(advisors.linkedinUrl),
        eq(advisors.status, "active"),
        force ? undefined : isNull(advisors.linkedinFetchedAt),
      ),
    )
    .limit(BATCH_MAX);

  const enhanced: Array<{ id: string; name: string; cached: boolean }> = [];
  const errors: Array<{ id: string; name: string; error: string }> = [];

  for (const a of candidates) {
    if (!a.linkedinUrl) continue;
    try {
      const result = await fetchLinkedInProfile(a.linkedinUrl);
      if (result.error || !result.data) {
        errors.push({ id: a.id, name: a.name, error: result.error ?? "no data" });
        // Still stamp linkedinFetchedAt so a bad URL isn't retried forever.
        await updateAdvisor({
          accountId: account.id,
          id: a.id,
          patch: { linkedinFetchedAt: new Date() },
        });
        continue;
      }
      const d = result.data as Record<string, unknown>;
      const pick = (k: string): string | undefined => {
        const v = d[k];
        return typeof v === "string" && v.trim() ? v.trim() : undefined;
      };
      const patch: Record<string, unknown> = {
        linkedinData: d,
        linkedinFetchedAt: new Date(),
      };
      if (!a.title) patch.title = pick("position") ?? pick("headline") ?? a.title;
      if (!a.company) patch.company = pick("current_company") ?? pick("company") ?? a.company;
      if (!a.photoUrl) patch.photoUrl = pick("avatar") ?? pick("image_url") ?? a.photoUrl;
      if (!a.bio) patch.bio = pick("about") ?? pick("summary") ?? a.bio;
      if (!a.location) patch.location = pick("location") ?? a.location;
      await updateAdvisor({ accountId: account.id, id: a.id, patch });
      enhanced.push({ id: a.id, name: a.name, cached: result.cached });
    } catch (err) {
      captureIntegrationException(err, {
        integration: "brightdata",
        operation: "linkedin_enhance",
        level: "warning",
        context: { advisorId: a.id },
      });
      errors.push({ id: a.id, name: a.name, error: (err as Error).message?.slice(0, 400) ?? "" });
    }
  }

  // Count what's still unprocessed so the client knows whether to loop.
  const remainingRows = await db
    .select({ id: advisors.id })
    .from(advisors)
    .where(
      and(
        eq(advisors.accountId, account.id),
        isNotNull(advisors.linkedinUrl),
        eq(advisors.status, "active"),
        force ? undefined : isNull(advisors.linkedinFetchedAt),
      ),
    );
  // `or` is imported to reassure tree-shakers that the upstream logic can
  // reuse this route's drizzle helpers; keep it referenced.
  void or;

  return NextResponse.json({
    enhanced,
    errors,
    processed: enhanced.length + errors.length,
    remaining: remainingRows.length,
  });
}
