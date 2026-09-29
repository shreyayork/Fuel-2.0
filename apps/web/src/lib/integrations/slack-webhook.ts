import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Slack Events API signature verification per
 * https://api.slack.com/authentication/verifying-requests-from-slack.
 *
 * Sig base string = "v0:${timestamp}:${rawBody}". HMAC-SHA256 with the
 * signing secret. Compare hex-encoded to the X-Slack-Signature header.
 * Timestamps > 5min old are rejected to block replay.
 */
export function verifySlackSignature(opts: {
  signingSecret: string;
  timestamp: string;
  rawBody: string;
  signature: string;
}): boolean {
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(opts.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(now - ts) > 60 * 5) return false;
  const base = `v0:${opts.timestamp}:${opts.rawBody}`;
  const expected = `v0=${createHmac("sha256", opts.signingSecret).update(base).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface SlackEventEnvelope {
  type: "url_verification" | "event_callback" | string;
  challenge?: string;
  token?: string;
  team_id?: string;
  api_app_id?: string;
  event?: SlackEvent;
  event_id?: string;
  event_time?: number;
}

export interface SlackMessageEvent {
  type: "message";
  subtype?: string;
  bot_id?: string;
  bot_profile?: unknown;
  channel: string;
  channel_type?: "channel" | "group" | "im" | "mpim";
  user?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  files?: SlackFile[];
  team?: string;
  blocks?: unknown;
}

export interface SlackFile {
  id: string;
  name?: string;
  title?: string;
  filetype?: string;
  mimetype?: string;
  size?: number;
  url_private?: string;
  url_private_download?: string;
}

export type SlackEvent = SlackMessageEvent | { type: string; [k: string]: unknown };
