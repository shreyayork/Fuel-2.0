import { NextResponse } from "next/server";
import {
  verifySlackSignature,
  type SlackEventEnvelope,
  type SlackMessageEvent,
} from "@/lib/integrations/slack-webhook";
import { getSigningSecret } from "@/lib/integrations/oauth";
import { findAccountsByTeamId, ingestSlackMessage } from "@/lib/integrations/slack-ingest";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Slack Events API endpoint. Handles the one-time URL verification
 * handshake + live event envelopes. Verifies HMAC signature on every
 * request and rejects payloads > 5 minutes old.
 *
 * We ACK with 200 as soon as events are parsed and dispatch ingestion
 * without awaiting — Slack retries on timeouts, and a failed ingest
 * shouldn't create duplicates (idempotent on source + ts).
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";

  const signingSecret = await getSigningSecret("slack");
  if (!signingSecret) {
    return NextResponse.json({ error: "slack_not_configured" }, { status: 500 });
  }
  if (!verifySlackSignature({ signingSecret, timestamp, rawBody, signature })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let envelope: SlackEventEnvelope;
  try {
    envelope = JSON.parse(rawBody) as SlackEventEnvelope;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  // URL verification handshake — Slack's one-time challenge when you
  // configure the Events API endpoint.
  if (envelope.type === "url_verification" && envelope.challenge) {
    return NextResponse.json({ challenge: envelope.challenge });
  }

  if (envelope.type !== "event_callback" || !envelope.event || !envelope.team_id) {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget dispatch. Slack wants <3s response time.
  void dispatch(envelope).catch((e) => {
    captureIntegrationException(e, { integration: "slack", operation: "events_dispatch" });
    console.warn(`[slack-events] dispatch failed: ${(e as Error).message?.slice(0, 200)}`);
  });

  return NextResponse.json({ ok: true });
}

async function dispatch(envelope: SlackEventEnvelope): Promise<void> {
  const event = envelope.event;
  if (!event || !envelope.team_id) return;

  // We only handle user-originated `message` events in this phase. File-only
  // uploads arrive as message events with subtype=file_share and fall through
  // the same path.
  if (event.type !== "message") return;
  const msg = event as SlackMessageEvent;

  const conns = await findAccountsByTeamId(envelope.team_id);
  if (conns.length === 0) return;

  for (const conn of conns) {
    try {
      await ingestSlackMessage({ accountId: conn.accountId, connection: conn, event: msg });
    } catch (e) {
      captureIntegrationException(e, {
        integration: "slack",
        operation: "ingest_message",
        level: "warning",
        context: { accountId: conn.accountId },
      });
      console.warn(
        `[slack-events] ingest failed account=${conn.accountId} ts=${msg.ts}: ${(e as Error).message?.slice(0, 200)}`,
      );
    }
  }
}
