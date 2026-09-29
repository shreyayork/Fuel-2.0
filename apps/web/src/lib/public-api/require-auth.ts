import "server-only";
import { NextResponse } from "next/server";
import { verifyPublicApiClientAuth } from "./client-auth";

/**
 * Audit + gate for /api/public/* routes.
 * Returns a 401/503 response when auth fails, or null when authenticated.
 * Logs success/failure without secrets or credential material.
 */
export function requirePublicApiAuth(req: Request): NextResponse | null {
  const result = verifyPublicApiClientAuth(req);

  if (result.ok) {
    console.info("[public-api] auth_ok", {
      clientId: result.clientId,
      path: new URL(req.url).pathname,
    });
    return null;
  }

  console.warn("[public-api] auth_fail", {
    reason: result.reason,
    path: new URL(req.url).pathname,
  });

  if (result.reason === "not_configured") {
    return NextResponse.json({ error: "public_api_not_configured" }, { status: 503 });
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
