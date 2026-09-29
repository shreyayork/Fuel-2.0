import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ProviderDefinition, OAuth2Config, ProviderId } from "./registry";

/** RFC 8414 Authorization Server Metadata — the subset we consume. */
export interface OAuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
  scopes_supported?: string[];
}

export async function fetchServerMetadata(discoveryUrl: string): Promise<OAuthServerMetadata> {
  const res = await fetch(discoveryUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`OAuth metadata fetch failed: ${res.status} ${discoveryUrl}`);
  }
  return (await res.json()) as OAuthServerMetadata;
}

export interface DcrRegistration {
  clientId: string;
  clientSecret?: string;
  registrationAccessToken?: string;
  registrationClientUri?: string;
}

/**
 * Register a fresh OAuth client via RFC 7591 Dynamic Client Registration. The
 * returned credentials must be persisted on the connection so refresh works.
 */
export async function registerDynamicClient(opts: {
  registrationEndpoint: string;
  redirectUri: string;
  clientName?: string;
}): Promise<DcrRegistration> {
  const body = {
    client_name: opts.clientName ?? "Fuel 2.0",
    redirect_uris: [opts.redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
    application_type: "web",
  };
  const res = await fetch(opts.registrationEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DCR failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const clientId = data.client_id as string | undefined;
  if (!clientId) throw new Error("DCR response missing client_id");
  return {
    clientId,
    clientSecret: data.client_secret as string | undefined,
    registrationAccessToken: data.registration_access_token as string | undefined,
    registrationClientUri: data.registration_client_uri as string | undefined,
  };
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/**
 * Client credentials (client_id + client_secret) for a provider. Stored in AWS
 * Secrets Manager as JSON `{clientId, clientSecret}` under the convention name
 * `fuel2-<stage>-<provider>-oauth`. Local dev can set env vars
 * `<PROVIDER>_CLIENT_ID` + `<PROVIDER>_CLIENT_SECRET` to bypass.
 */
export interface ClientCreds {
  clientId: string;
  clientSecret: string;
}

const credsCache = new Map<ProviderId, ClientCreds>();

function envVarName(provider: ProviderId, key: "CLIENT_ID" | "CLIENT_SECRET"): string {
  return `${provider.toUpperCase()}_${key}`;
}

function secretNameFor(provider: ProviderId): string {
  const stage = process.env.STAGE ?? "stage";
  return `fuel2-${stage}-${provider}-oauth`;
}

export async function getClientCreds(provider: ProviderId): Promise<ClientCreds | null> {
  const cached = credsCache.get(provider);
  if (cached) return cached;

  const envId = process.env[envVarName(provider, "CLIENT_ID")];
  const envSecret = process.env[envVarName(provider, "CLIENT_SECRET")];
  if (envId && envSecret) {
    const c = { clientId: envId, clientSecret: envSecret };
    credsCache.set(provider, c);
    return c;
  }

  // Secrets Manager lookup. The CDK is expected to grant read on the secret.
  // We skip if no secrets-manager env is present (pure local dev).
  const secretId = process.env[`${provider.toUpperCase()}_SECRET_ARN`] ?? secretNameFor(provider);
  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      "@aws-sdk/client-secrets-manager"
    );
    const sm = new SecretsManagerClient({});
    const res = await sm.send(new GetSecretValueCommand({ SecretId: secretId }));
    if (!res.SecretString) return null;
    // Support two key conventions: camelCase (hubspot) and <PROVIDER>_CLIENT_*
    // uppercase (some out-of-band-created secrets).
    const parsed = JSON.parse(res.SecretString) as Record<string, string | undefined>;
    const upperId = `${provider.toUpperCase()}_CLIENT_ID`;
    const upperSecret = `${provider.toUpperCase()}_CLIENT_SECRET`;
    const clientId = parsed.clientId ?? parsed[upperId];
    const clientSecret = parsed.clientSecret ?? parsed[upperSecret];
    if (!clientId || !clientSecret) return null;
    const creds = { clientId, clientSecret };
    credsCache.set(provider, creds);
    return creds;
  } catch {
    return null;
  }
}

/**
 * Slack-specific: fetch the HMAC signing secret used to verify Events API
 * request bodies. Lives in the same secret as the OAuth client credentials
 * — key `signingSecret` (preferred) or `SLACK_SIGNING_SECRET` (uppercase).
 */
const signingSecretCache = new Map<ProviderId, string>();
export async function getSigningSecret(provider: ProviderId): Promise<string | null> {
  const cached = signingSecretCache.get(provider);
  if (cached) return cached;
  const envKey = `${provider.toUpperCase()}_SIGNING_SECRET`;
  const fromEnv = process.env[envKey];
  if (fromEnv) {
    signingSecretCache.set(provider, fromEnv);
    return fromEnv;
  }
  const secretId = process.env[`${provider.toUpperCase()}_SECRET_ARN`] ?? secretNameFor(provider);
  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      "@aws-sdk/client-secrets-manager"
    );
    const sm = new SecretsManagerClient({});
    const res = await sm.send(new GetSecretValueCommand({ SecretId: secretId }));
    if (!res.SecretString) return null;
    const parsed = JSON.parse(res.SecretString) as Record<string, string | undefined>;
    const upperKey = `${provider.toUpperCase()}_SIGNING_SECRET`;
    const val = parsed.signingSecret ?? parsed[upperKey];
    if (!val) return null;
    signingSecretCache.set(provider, val);
    return val;
  } catch {
    return null;
  }
}

function redirectUriFor(provider: ProviderId, origin: string): string {
  const override = process.env[`${provider.toUpperCase()}_REDIRECT_URI`];
  if (override) return override;
  // Prefer APP_URL so we register the canonical hostname (e.g. stage.v2.fuel.york.ie)
  // rather than the Lambda Function URL that sits behind CloudFront.
  const base = process.env.APP_URL ?? origin;
  return `${base}/api/integrations/${provider}/callback`;
}

export async function isConfigured(provider: ProviderDefinition, origin: string): Promise<boolean> {
  if (provider.auth.kind !== "oauth2") return false;
  // DCR providers don't require pre-registered client creds — we register on
  // the fly during install.
  if (provider.auth.dcr) return redirectUriFor(provider.id, origin).length > 0;
  const creds = await getClientCreds(provider.id);
  return creds !== null && redirectUriFor(provider.id, origin).length > 0;
}

export interface DcrInstallPrep {
  authorizeUrl: string;
  /** Cookie payload — callback needs these to finish the token exchange. */
  dcrState: {
    clientId: string;
    clientSecret?: string;
    tokenUrl: string;
    codeVerifier: string;
    registrationAccessToken?: string;
    registrationClientUri?: string;
  };
}

/** Full DCR install flow: discover → register → build authorize URL with PKCE. */
export async function prepareDcrInstall(opts: {
  provider: ProviderDefinition;
  origin: string;
  state: string;
}): Promise<DcrInstallPrep> {
  if (opts.provider.auth.kind !== "oauth2" || !opts.provider.auth.dcr) {
    throw new Error(`${opts.provider.id} is not a DCR provider`);
  }
  const auth = opts.provider.auth;
  if (!auth.discoveryUrl) throw new Error(`${opts.provider.id} missing discoveryUrl`);
  const meta = await fetchServerMetadata(auth.discoveryUrl);
  if (!meta.registration_endpoint) {
    throw new Error(`${opts.provider.id} metadata has no registration_endpoint`);
  }
  const redirectUri = redirectUriFor(opts.provider.id, opts.origin);
  const reg = await registerDynamicClient({
    registrationEndpoint: meta.registration_endpoint,
    redirectUri,
    clientName: `Fuel 2.0 (${opts.state.split(".")[0]})`,
  });
  const pkce = generatePkcePair();
  const u = new URL(meta.authorization_endpoint);
  u.searchParams.set("client_id", reg.clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", opts.state);
  u.searchParams.set("code_challenge", pkce.challenge);
  u.searchParams.set("code_challenge_method", "S256");
  const scopes = auth.defaultScopes.length ? auth.defaultScopes : meta.scopes_supported;
  if (scopes && scopes.length > 0) u.searchParams.set("scope", scopes.join(" "));
  return {
    authorizeUrl: u.toString(),
    dcrState: {
      clientId: reg.clientId,
      clientSecret: reg.clientSecret,
      tokenUrl: meta.token_endpoint,
      codeVerifier: pkce.verifier,
      registrationAccessToken: reg.registrationAccessToken,
      registrationClientUri: reg.registrationClientUri,
    },
  };
}

export async function buildAuthorizeUrl(opts: {
  provider: ProviderDefinition;
  origin: string;
  state: string;
  scopes?: string[];
}): Promise<string> {
  if (opts.provider.auth.kind !== "oauth2") {
    throw new Error(`${opts.provider.id} does not use OAuth`);
  }
  const creds = await getClientCreds(opts.provider.id);
  if (!creds) throw new Error(`${opts.provider.id} OAuth credentials not configured`);
  const auth = opts.provider.auth;
  if (!auth.authorizeUrl) throw new Error(`${opts.provider.id} missing authorizeUrl`);
  const redirectUri = redirectUriFor(opts.provider.id, opts.origin);
  const u = new URL(auth.authorizeUrl);
  u.searchParams.set("client_id", creds.clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", (opts.scopes ?? auth.defaultScopes).join(" "));
  u.searchParams.set("state", opts.state);
  return u.toString();
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * DCR token exchange — uses per-connection client creds from the install cookie,
 * plus PKCE verifier.
 */
export async function exchangeDcrCode(opts: {
  provider: ProviderDefinition;
  origin: string;
  code: string;
  dcrState: DcrInstallPrep["dcrState"];
}): Promise<OAuthTokens> {
  const redirectUri = redirectUriFor(opts.provider.id, opts.origin);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: opts.dcrState.clientId,
    redirect_uri: redirectUri,
    code: opts.code,
    code_verifier: opts.dcrState.codeVerifier,
  });
  if (opts.dcrState.clientSecret) body.set("client_secret", opts.dcrState.clientSecret);
  const res = await fetch(opts.dcrState.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.provider.id} token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as OAuthTokens;
}

export async function exchangeCodeForTokens(opts: {
  provider: ProviderDefinition;
  origin: string;
  code: string;
}): Promise<OAuthTokens> {
  if (opts.provider.auth.kind !== "oauth2") {
    throw new Error(`${opts.provider.id} does not use OAuth`);
  }
  const auth = opts.provider.auth as OAuth2Config;
  const creds = await getClientCreds(opts.provider.id);
  if (!creds) throw new Error(`${opts.provider.id} OAuth credentials not configured`);
  if (!auth.tokenUrl) throw new Error(`${opts.provider.id} missing tokenUrl`);
  const redirectUri = redirectUriFor(opts.provider.id, opts.origin);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: redirectUri,
    code: opts.code,
  });
  const res = await fetch(auth.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.provider.id} token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as OAuthTokens;
}

export async function refreshTokens(opts: {
  provider: ProviderDefinition;
  refreshToken: string;
}): Promise<OAuthTokens> {
  if (opts.provider.auth.kind !== "oauth2") {
    throw new Error(`${opts.provider.id} does not use OAuth`);
  }
  const auth = opts.provider.auth as OAuth2Config;
  if (!auth.tokenUrl) throw new Error(`${opts.provider.id} missing tokenUrl`);
  const creds = await getClientCreds(opts.provider.id);
  if (!creds) throw new Error(`${opts.provider.id} OAuth credentials not configured`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: opts.refreshToken,
  });
  const res = await fetch(auth.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.provider.id} refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as OAuthTokens;
}
