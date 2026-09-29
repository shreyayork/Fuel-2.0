import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_TTL_DAYS,
  getClient,
  isAllowedRedirectUri,
  redeemAuthorizationCode,
  verifyClientSecret,
  verifyPkce,
} from "@/lib/mcp-oauth";
import { createMcpToken } from "@/lib/mcp-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function err(error: string, description?: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

/**
 * OAuth 2.1 token endpoint. Only `authorization_code` grant is supported
 * for now (refresh tokens are a follow-up). Verifies:
 *   - client_id matches a registered DCR client
 *   - if confidential client, client_secret in body matches
 *   - code is valid + unconsumed + not expired (single-use)
 *   - PKCE: S256(code_verifier) == stored code_challenge
 *   - redirect_uri matches the one bound to the code
 *
 * On success: mints an MCP API token (issuedVia=oauth, clientId set) and
 * returns it as the bearer access_token.
 */
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/x-www-form-urlencoded")) {
    return err("invalid_request", "content-type must be application/x-www-form-urlencoded");
  }
  const form = new URLSearchParams(await req.text());
  const grant = form.get("grant_type");
  if (grant !== "authorization_code") return err("unsupported_grant_type");

  const code = form.get("code");
  const clientId = form.get("client_id");
  const codeVerifier = form.get("code_verifier");
  const redirectUri = form.get("redirect_uri");
  const clientSecret = form.get("client_secret");

  if (!code || !clientId || !codeVerifier || !redirectUri) {
    return err("invalid_request", "missing one of code, client_id, code_verifier, redirect_uri");
  }

  const client = await getClient(clientId);
  if (!client) return err("invalid_client", "unknown client_id", 401);
  if (client.tokenEndpointAuthMethod !== "none") {
    if (!clientSecret || !client.clientSecretHash || !verifyClientSecret(clientSecret, client.clientSecretHash)) {
      return err("invalid_client", "client authentication failed", 401);
    }
  }
  if (!isAllowedRedirectUri(client, redirectUri)) {
    return err("invalid_grant", "redirect_uri not registered for client");
  }

  let row;
  try {
    row = await redeemAuthorizationCode(code);
  } catch {
    return err("invalid_grant", "code is invalid, expired, or already used");
  }
  if (row.clientId !== clientId) return err("invalid_grant", "code does not belong to this client");
  if (row.redirectUri !== redirectUri) return err("invalid_grant", "redirect_uri mismatch");
  if (!verifyPkce({
    codeVerifier,
    storedChallenge: row.codeChallenge,
    storedMethod: row.codeChallengeMethod,
  })) {
    return err("invalid_grant", "PKCE verification failed");
  }

  // Mint a Fuel MCP token bound to the user + account stamped on the code.
  const minted = await createMcpToken({
    accountId: row.accountId,
    userEmail: row.userEmail,
    name: `OAuth: ${client.name}`,
    expiresInDays: ACCESS_TOKEN_TTL_DAYS,
    issuedVia: "oauth",
    clientId,
  });

  return NextResponse.json({
    access_token: minted.rawToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60,
    scope: row.scope ?? "mcp",
  });
}
