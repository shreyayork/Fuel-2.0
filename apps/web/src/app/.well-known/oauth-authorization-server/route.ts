import { NextResponse } from "next/server";
import { oauthIssuer } from "@/lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 8414 Authorization Server Metadata. Drives DCR + authorize + token
 * for any MCP client that lands on /api/mcp without credentials. PKCE-only
 * (no `plain` method), confidential client secret optional.
 */
export async function GET() {
  const issuer = oauthIssuer();
  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/api/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/api/mcp/oauth/token`,
    registration_endpoint: `${issuer}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp"],
  });
}
