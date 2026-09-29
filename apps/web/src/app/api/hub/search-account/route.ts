import { NextResponse, type NextRequest } from "next/server";
import { searchHubAccounts } from "@/lib/hub/accounts";
import { requireHubAuth } from "@/lib/hub/require-hub-auth";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hub integration: list/search Fuel accounts by name or creator email.
 *
 * Auth: Client ID + Client Secret via Basic auth or X-Client-Id / X-Client-Secret.
 * Env: HUB_API_CLIENT_ID, HUB_API_CLIENT_SECRET
 *
 * GET /api/hub/search-account?search=john
 */
export async function GET(req: NextRequest) {
  const authError = requireHubAuth(req);
  if (authError) return authError;

  const search = req.nextUrl.searchParams.get("search");
  try {
    const results = await searchHubAccounts(search);
    return NextResponse.json(results);
  } catch (e) {
    captureIntegrationException(e, { integration: "hub", operation: "search_account" });
    console.error("[hub/search-account] failed", e);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
