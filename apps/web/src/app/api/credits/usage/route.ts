import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import {
  getCreditUsageReport,
  isUsagePeriod,
  normalizeUsageUserFilter,
  parseUsageCustomRangeParams,
} from "@/lib/credits/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  const url = new URL(req.url);
  const periodParam = url.searchParams.get("period") ?? "30d";
  const user = normalizeUsageUserFilter(url.searchParams.get("user"));
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!isUsagePeriod(periodParam)) {
    return NextResponse.json({ error: "invalid_period" }, { status: 400 });
  }

  const hasCustom = from != null || to != null;
  let customRange: { start: Date; end: Date } | undefined;
  if (hasCustom) {
    const parsed = parseUsageCustomRangeParams(from, to);
    if (!parsed.ok) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }
    customRange = { start: parsed.start, end: parsed.end };
  }

  try {
    const report = await getCreditUsageReport({
      accountId: auth.account.id,
      period: periodParam,
      userFilter: user,
      customRange,
    });
    return NextResponse.json(report);
  } catch (error) {
    Sentry.setTag("integration", "credits");
    Sentry.captureException(error);
    throw error;
  }
}
