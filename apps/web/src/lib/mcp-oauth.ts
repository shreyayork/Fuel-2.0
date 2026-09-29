import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  mcpOauthAuthorizationCodes,
  mcpOauthClients,
  type McpOauthAuthorizationCode,
  type McpOauthClient,
} from "@/db/schema";

/**
 * Issuer + endpoint URLs derived from APP_URL. The OAuth metadata documents
 * MUST advertise stable URLs that match what the request actually hits.
 */
export function oauthIssuer(): string {
  const url = process.env.APP_URL?.replace(/\/$/, "");
  if (!url) throw new Error("APP_URL not set — required for OAuth issuer URL");
  return url;
}

export const SCOPE_DEFAULT = "mcp";
export const CODE_TTL_SECONDS = 60 * 5;
// Tokens issued via OAuth get a 1-year expiry by default (matching the
// max recommended for offline access). Refresh isn't yet implemented.
export const ACCESS_TOKEN_TTL_DAYS = 365;

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/**
 * Verify a PKCE code_verifier against the stored S256 challenge per RFC 7636.
 * Plain method is intentionally not supported.
 */
export function verifyPkce(opts: {
  codeVerifier: string;
  storedChallenge: string;
  storedMethod: string;
}): boolean {
  if (opts.storedMethod !== "S256") return false;
  const expected = base64url(createHash("sha256").update(opts.codeVerifier).digest());
  return expected === opts.storedChallenge;
}

/**
 * Validate a redirect_uri against a client's allow-list. Exact-string match
 * is required by RFC 8252 §7.3 (no scheme/host substitution, no path
 * concatenation).
 */
export function isAllowedRedirectUri(client: McpOauthClient, redirectUri: string): boolean {
  return client.redirectUris.includes(redirectUri);
}

export interface RegisterClientInput {
  /** Optional human-readable name. We always store one — fall back to "MCP Client". */
  client_name?: string;
  redirect_uris: string[];
  /** RFC 7591 — defaults to "none" (PKCE-protected public client). */
  token_endpoint_auth_method?: "none" | "client_secret_post" | "client_secret_basic";
  grant_types?: string[];
  response_types?: string[];
}

export interface RegisteredClient {
  client_id: string;
  client_secret?: string;
  client_id_issued_at: number;
  redirect_uris: string[];
  token_endpoint_auth_method: string;
  grant_types: string[];
  response_types: string[];
}

export async function registerClient(input: RegisterClientInput): Promise<RegisteredClient> {
  if (!Array.isArray(input.redirect_uris) || input.redirect_uris.length === 0) {
    throw new Error("redirect_uris is required");
  }
  for (const u of input.redirect_uris) {
    try {
      const parsed = new URL(u);
      // Only https:// or localhost http:// are allowed; matches the OAuth
      // 2.1 BCP for confidential redirect URIs.
      if (
        parsed.protocol !== "https:" &&
        !(parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
      ) {
        throw new Error("invalid_redirect_uri_scheme");
      }
    } catch {
      throw new Error("invalid_redirect_uri");
    }
  }

  const clientId = `mcpc_${randomBytes(16).toString("base64url")}`;
  const authMethod = input.token_endpoint_auth_method ?? "none";
  let clientSecret: string | undefined;
  let clientSecretHash: string | null = null;
  if (authMethod !== "none") {
    clientSecret = base64url(randomBytes(32));
    clientSecretHash = sha256(clientSecret);
  }

  const db = await getDb();
  await db.insert(mcpOauthClients).values({
    clientId,
    clientSecretHash,
    name: input.client_name ?? "MCP Client",
    redirectUris: input.redirect_uris,
    tokenEndpointAuthMethod: authMethod,
  });

  return {
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: input.redirect_uris,
    token_endpoint_auth_method: authMethod,
    grant_types: input.grant_types ?? ["authorization_code"],
    response_types: input.response_types ?? ["code"],
  };
}

export async function getClient(clientId: string): Promise<McpOauthClient | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(mcpOauthClients)
    .where(eq(mcpOauthClients.clientId, clientId))
    .limit(1);
  return row ?? null;
}

/** Mint an authorization code after a successful /authorize consent. */
export async function createAuthorizationCode(opts: {
  clientId: string;
  userEmail: string;
  accountId: string;
  redirectUri: string;
  scope?: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
}): Promise<string> {
  const code = `mcoc_${randomBytes(24).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);
  const db = await getDb();
  await db.insert(mcpOauthAuthorizationCodes).values({
    code,
    clientId: opts.clientId,
    userEmail: opts.userEmail,
    accountId: opts.accountId,
    redirectUri: opts.redirectUri,
    scope: opts.scope ?? null,
    codeChallenge: opts.codeChallenge,
    codeChallengeMethod: opts.codeChallengeMethod,
    expiresAt,
  });
  return code;
}

/**
 * Single-use code redemption. Returns the code row only on the FIRST call —
 * subsequent calls error (replay protection).
 */
export async function redeemAuthorizationCode(code: string): Promise<McpOauthAuthorizationCode> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(mcpOauthAuthorizationCodes)
    .where(
      and(
        eq(mcpOauthAuthorizationCodes.code, code),
        isNull(mcpOauthAuthorizationCodes.consumedAt),
        gt(mcpOauthAuthorizationCodes.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  if (!row) throw new Error("invalid_grant");
  await db
    .update(mcpOauthAuthorizationCodes)
    .set({ consumedAt: new Date() })
    .where(eq(mcpOauthAuthorizationCodes.code, code));
  return row;
}

/** Constant-time string comparison via sha256 reduction. */
export function verifyClientSecret(provided: string, storedHash: string): boolean {
  return sha256(provided) === storedHash;
}
