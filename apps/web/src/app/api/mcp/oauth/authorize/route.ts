import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import {
  createAuthorizationCode,
  getClient,
  isAllowedRedirectUri,
} from "@/lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth 2.1 authorize endpoint with PKCE. Two phases:
 *
 *   1. Initial GET — validates client_id + redirect_uri + PKCE params,
 *      ensures the user has a Fuel session (Cognito sign-in), then renders
 *      a tiny consent page asking the user to grant the named client access.
 *
 *   2. Consent POST — the consent form posts back here with `consent=allow`;
 *      we mint an auth code and 302 to redirect_uri?code=…&state=….
 *
 * On any error before redirect_uri is validated, we return a JSON error
 * (per RFC 6749 §4.1.2.1). After validation, we redirect with `error=…`.
 */

type Params = {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  state?: string;
  scope?: string;
  code_challenge: string;
  code_challenge_method: string;
};

function readParams(req: Request): Partial<Params> {
  const u = new URL(req.url);
  const get = (k: string) => u.searchParams.get(k) ?? undefined;
  return {
    client_id: get("client_id"),
    redirect_uri: get("redirect_uri"),
    response_type: get("response_type"),
    state: get("state"),
    scope: get("scope"),
    code_challenge: get("code_challenge"),
    code_challenge_method: get("code_challenge_method"),
  };
}

function jsonError(error: string, description?: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

function redirectError(redirectUri: string, error: string, state?: string, description?: string) {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (description) u.searchParams.set("error_description", description);
  if (state) u.searchParams.set("state", state);
  return NextResponse.redirect(u.toString(), { status: 302 });
}

export async function GET(req: Request) {
  const p = readParams(req);
  if (!p.client_id) return jsonError("invalid_request", "missing client_id");
  const client = await getClient(p.client_id);
  if (!client) return jsonError("invalid_client", "unknown client_id", 401);
  if (!p.redirect_uri || !isAllowedRedirectUri(client, p.redirect_uri)) {
    return jsonError("invalid_request", "redirect_uri not registered for client");
  }
  if (p.response_type !== "code") {
    return redirectError(p.redirect_uri, "unsupported_response_type", p.state);
  }
  if (!p.code_challenge || p.code_challenge_method !== "S256") {
    return redirectError(
      p.redirect_uri,
      "invalid_request",
      p.state,
      "PKCE required: code_challenge + code_challenge_method=S256",
    );
  }

  // Require Fuel sign-in. If not signed in, bounce through /sign-in with a
  // returnTo back to this same authorize URL so the consent screen is the
  // very next thing the user sees.
  const session = process.env.COGNITO_USER_POOL_ID ? await getSession() : null;
  const email = session?.email ?? (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) {
    const back = new URL(req.url);
    redirect(`/sign-in?returnTo=${encodeURIComponent(back.pathname + back.search)}`);
  }
  const account = await getActiveAccountForUser(email!);
  if (!account) {
    return redirectError(p.redirect_uri, "access_denied", p.state, "no active account");
  }

  // Render a minimal consent page. Form posts back to the same URL with
  // consent=allow (or deny) — handled in POST below.
  const fields = [
    ["client_id", p.client_id],
    ["redirect_uri", p.redirect_uri],
    ["response_type", p.response_type],
    ["state", p.state ?? ""],
    ["scope", p.scope ?? "mcp"],
    ["code_challenge", p.code_challenge],
    ["code_challenge_method", p.code_challenge_method],
  ];
  const hidden = fields
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v ?? "")}" />`)
    .join("\n");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Authorize ${escapeHtml(client.name)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:40px 20px;background:#0e1620;color:#e6ebf2;display:flex;justify-content:center}
  .card{max-width:480px;width:100%;background:#162232;border:1px solid #243246;border-radius:10px;padding:28px}
  h1{font-size:20px;margin:0 0 8px}
  p{font-size:14px;color:#9aa4b2;line-height:1.5;margin:6px 0}
  .who{font-size:13px;color:#7d8896;margin-top:18px}
  .scopes{margin:14px 0;padding:12px 14px;background:#0e1620;border:1px solid #243246;border-radius:6px;font-size:13px;color:#cbd2dc}
  .row{display:flex;gap:10px;margin-top:18px}
  button{flex:1;padding:10px 14px;border-radius:6px;border:1px solid #243246;font-size:13px;font-weight:500;cursor:pointer}
  .allow{background:#00B48A;color:#0e1620;border-color:#00B48A}
  .deny{background:transparent;color:#cbd2dc}
</style></head><body>
<div class="card">
  <h1>${escapeHtml(client.name)} wants to connect</h1>
  <p>This will let it call your Fuel MCP tools — search companies, add notes, list pipelines, etc — on your behalf.</p>
  <div class="scopes"><strong>Scope:</strong> ${escapeHtml(p.scope ?? "mcp")}</div>
  <p class="who">Signed in as <strong>${escapeHtml(email!)}</strong> · account <strong>${escapeHtml(account.name)}</strong></p>
  <form method="POST" class="row">
    ${hidden}
    <button class="deny" type="submit" name="consent" value="deny">Deny</button>
    <button class="allow" type="submit" name="consent" value="allow">Allow</button>
  </form>
</div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const p: Partial<Params & { consent: string }> = {
    client_id: get("client_id"),
    redirect_uri: get("redirect_uri"),
    response_type: get("response_type"),
    state: get("state"),
    scope: get("scope"),
    code_challenge: get("code_challenge"),
    code_challenge_method: get("code_challenge_method"),
    consent: get("consent"),
  };

  if (!p.client_id) return jsonError("invalid_request", "missing client_id");
  const client = await getClient(p.client_id);
  if (!client) return jsonError("invalid_client", "unknown client_id", 401);
  if (!p.redirect_uri || !isAllowedRedirectUri(client, p.redirect_uri)) {
    return jsonError("invalid_request", "redirect_uri not registered for client");
  }
  if (p.consent !== "allow") {
    return redirectError(p.redirect_uri, "access_denied", p.state, "user denied consent");
  }
  if (!p.code_challenge || p.code_challenge_method !== "S256") {
    return redirectError(p.redirect_uri, "invalid_request", p.state, "PKCE required");
  }

  const session = process.env.COGNITO_USER_POOL_ID ? await getSession() : null;
  const email = session?.email ?? (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) return redirectError(p.redirect_uri, "access_denied", p.state, "session expired");
  const account = await getActiveAccountForUser(email);
  if (!account) return redirectError(p.redirect_uri, "access_denied", p.state, "no active account");

  const code = await createAuthorizationCode({
    clientId: p.client_id,
    userEmail: email,
    accountId: account.id,
    redirectUri: p.redirect_uri,
    scope: p.scope ?? "mcp",
    codeChallenge: p.code_challenge,
    codeChallengeMethod: p.code_challenge_method,
  });

  const u = new URL(p.redirect_uri);
  u.searchParams.set("code", code);
  if (p.state) u.searchParams.set("state", p.state);
  return NextResponse.redirect(u.toString(), { status: 302 });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
