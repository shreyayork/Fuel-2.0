import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getClientCreds } from "./oauth";

/**
 * Verify a HubSpot v3 webhook signature.
 *
 * HubSpot computes `Base64(HMAC-SHA256(client_secret, method+uri+body+timestamp))`
 * and sends it in `X-HubSpot-Signature-v3`. Timestamp is in ms in
 * `X-HubSpot-Request-Timestamp`. We reject timestamps older than 5 minutes to
 * limit replay risk.
 */
export async function verifyHubspotSignature(opts: {
  method: string;
  url: string; // full URL including query string
  body: string;
  signature: string;
  timestamp: string;
}): Promise<boolean> {
  const ts = Number(opts.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;

  const creds = await getClientCreds("hubspot");
  if (!creds) return false;

  const source = `${opts.method}${opts.url}${opts.body}${opts.timestamp}`;
  const expected = createHmac("sha256", creds.clientSecret).update(source).digest("base64");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(opts.signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// --- Event types we care about ---------------------------------------------

export interface HubspotWebhookEvent {
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType:
    | "deal.creation"
    | "deal.deletion"
    | "deal.propertyChange"
    | "deal.merge"
    | "company.creation"
    | "company.deletion"
    | "company.propertyChange"
    // Generic subscriptions use object.* + objectTypeId to disambiguate.
    // HubSpot delivers these for NOTE / EMAIL / etc., since those types
    // aren't supported in the legacy bucket.
    | "object.creation"
    | "object.deletion"
    | "object.propertyChange"
    | "object.merge"
    | string;
  attemptNumber: number;
  objectId: number;
  /**
   * Only present on generic (object.*) events. `"0-4"` = note, `"0-49"` =
   * email, `"0-3"` = deal, etc. Legacy events (deal.*, company.*) omit this
   * and the subscription type itself is the type discriminator.
   */
  objectTypeId?: string;
  changeSource?: string;
  propertyName?: string;
  propertyValue?: string;
}

/**
 * HubSpot object type id ↔ short name. Used to route generic `object.*`
 * webhook events to the correct ingest handler.
 */
export const OBJECT_TYPE_NAMES: Record<string, "note" | "email"> = {
  "0-4": "note",
  "0-49": "email",
};
