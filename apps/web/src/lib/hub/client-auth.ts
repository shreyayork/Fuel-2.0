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

/**
 * Machine-to-machine auth for /api/hub/* routes.
 * Expects HUB_API_CLIENT_ID + HUB_API_CLIENT_SECRET in env.
 *
 * Accepted credential transports (in order):
 *   1. Authorization: Basic base64(clientId:clientSecret)
 *   2. X-Client-Id + X-Client-Secret headers
 */
export function verifyHubClientAuth(req: Request): boolean {
  const expectedId = process.env.HUB_API_CLIENT_ID;
  const expectedSecret = process.env.HUB_API_CLIENT_SECRET;
  if (!expectedId || !expectedSecret) return false;

  const basic = parseBasicAuth(req.headers.get("authorization"));
  const clientId = basic?.id ?? req.headers.get("x-client-id") ?? "";
  const clientSecret = basic?.secret ?? req.headers.get("x-client-secret") ?? "";
  if (!clientId || !clientSecret) return false;

  return safeEqual(clientId, expectedId) && safeEqual(clientSecret, expectedSecret);
}
