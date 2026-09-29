import "server-only";
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function parseBasicAuth(header: string | null): { id: string; secret: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return { id: decoded.slice(0, sep), secret: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

export type PublicApiAuthFailureReason =
  | "not_configured"
  | "missing_credentials"
  | "invalid_credentials";

export type PublicApiAuthResult =
  | { ok: true; clientId: string }
  | { ok: false; reason: PublicApiAuthFailureReason };

/**
 * Machine-to-machine auth for /api/public/* routes.
 * Expects PUBLIC_API_CLIENT_ID + PUBLIC_API_CLIENT_SECRET in env.
 *
 * Accepted credential transports (in order):
 *   1. Authorization: Basic base64(clientId:clientSecret)
 *   2. X-Client-Id + X-Client-Secret headers
 *
 * Never log or return the client secret.
 */
export function verifyPublicApiClientAuth(req: Request): PublicApiAuthResult {
  const expectedId = process.env.PUBLIC_API_CLIENT_ID;
  const expectedSecret = process.env.PUBLIC_API_CLIENT_SECRET;
  if (!expectedId || !expectedSecret) {
    return { ok: false, reason: "not_configured" };
  }

  const basic = parseBasicAuth(req.headers.get("authorization"));
  const clientId = basic?.id ?? req.headers.get("x-client-id") ?? "";
  const clientSecret = basic?.secret ?? req.headers.get("x-client-secret") ?? "";
  if (!clientId || !clientSecret) {
    return { ok: false, reason: "missing_credentials" };
  }

  const valid = safeEqual(clientId, expectedId) && safeEqual(clientSecret, expectedSecret);
  if (!valid) {
    return { ok: false, reason: "invalid_credentials" };
  }

  return { ok: true, clientId };
}
