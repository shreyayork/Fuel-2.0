import { NextResponse } from "next/server";
import { verifyHubspotSignature, type HubspotWebhookEvent } from "@/lib/integrations/hubspot-webhook";
import { applyWebhookEvents } from "@/lib/hubspot-webhook-sync";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canonicalUrl(req: Request): string {
  // HubSpot signs the URL they sent us. Prefer APP_URL so signature verification
  // matches the registered webhook target even when Lambda sees a different host.
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const path = new URL(req.url).pathname + new URL(req.url).search;
  return `${base}${path}`;
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-hubspot-signature-v3") ?? "";
  const timestamp = req.headers.get("x-hubspot-request-timestamp") ?? "";
  const body = await req.text();

  const ok = await verifyHubspotSignature({
    method: "POST",
    url: canonicalUrl(req),
    body,
    signature,
    timestamp,
  });
  if (!ok) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let events: HubspotWebhookEvent[];
  try {
    events = JSON.parse(body) as HubspotWebhookEvent[];
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!Array.isArray(events)) {
    return NextResponse.json({ error: "expected_array" }, { status: 400 });
  }

  try {
    const result = await applyWebhookEvents(events);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    // Don't leak internals; log and return 500 so HubSpot retries.
    captureIntegrationException(e, { integration: "hubspot", operation: "webhook" });
    console.error("hubspot webhook error", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
