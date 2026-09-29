import { NextResponse } from "next/server";
import { oauthIssuer, SCOPE_DEFAULT } from "@/lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 9728 Protected Resource Metadata. Claude.ai's "Custom Connector" web
 * flow fetches this URL after the MCP server returns a 401 with a
 * `WWW-Authenticate: Bearer resource_metadata="…"` pointer.
 *
 * `authorization_servers` lists where to discover the OAuth flow — for us
 * it's our own /.well-known/oauth-authorization-server document.
 */
export async function GET() {
  const issuer = oauthIssuer();
  return NextResponse.json({
    resource: `${issuer}/api/mcp`,
    authorization_servers: [issuer],
    scopes_supported: [SCOPE_DEFAULT],
    bearer_methods_supported: ["header"],
  });
}
