import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { getMergedChipHeadlineMap } from "@/lib/york-partner/headlines";

export const dynamic = "force-dynamic";

/** Authenticated founders + admins: merged chip headline catalog. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const headlines = await getMergedChipHeadlineMap();
    return NextResponse.json({ headlines });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to load headlines" }, { status: 500 });
  }
}
