import "server-only";
import { NextResponse } from "next/server";
import { verifyHubClientAuth } from "./client-auth";

/**
 * Returns a 401/503 response when Hub API auth fails, or null when the
 * request is authenticated.
 */
export function requireHubAuth(req: Request): NextResponse | null {
  if (!process.env.HUB_API_CLIENT_ID || !process.env.HUB_API_CLIENT_SECRET) {
    return NextResponse.json({ error: "hub_api_not_configured" }, { status: 503 });
  }
  if (!verifyHubClientAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
