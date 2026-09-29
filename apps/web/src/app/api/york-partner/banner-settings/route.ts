import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { getMarketingBannerDismissDays } from "@/lib/york-partner/banner-settings";

export const dynamic = "force-dynamic";

/** Authenticated users: current marketing banner temporary-dismiss duration. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const dismissHideDays = await getMarketingBannerDismissDays();
    return NextResponse.json({ dismissHideDays });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to load banner settings" }, { status: 500 });
  }
}
