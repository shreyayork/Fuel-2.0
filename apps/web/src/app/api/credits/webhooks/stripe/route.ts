import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { handleStripeWebhook } from "@/lib/credits/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  try {
    const result = await handleStripeWebhook(body, signature);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    return NextResponse.json({ error: "webhook_failed" }, { status: 500 });
  }
}
