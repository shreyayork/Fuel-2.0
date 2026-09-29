/**
 * Cognito refresh-token exchange. Deliberately free of `server-only` and
 * `next/headers` imports so this module is safe to load from the Edge-runtime
 * middleware as well as from route handlers.
 *
 * Returns null on any failure (network error, expired refresh_token, Cognito
 * config missing). Caller decides how to react (clear cookies → sign-in).
 */

export interface RefreshedTokens {
  idToken: string;
  accessToken: string;
  expiresIn: number;
}

export async function exchangeRefreshToken(
  refreshToken: string,
): Promise<RefreshedTokens | null> {
  const hostedUi = process.env.COGNITO_HOSTED_UI;
  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
  if (!hostedUi || !clientId) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });
  try {
    const res = await fetch(`${hostedUi}/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id_token?: string;
      access_token?: string;
      expires_in?: number;
    };
    if (!data.id_token || !data.access_token || !data.expires_in) return null;
    return {
      idToken: data.id_token,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch {
    return null;
  }
}

/**
 * Read the JWT `exp` claim without verifying the signature. We only use this
 * in middleware to decide *when* to refresh — the real verification still
 * happens in verifyIdToken() on the server. Returns the expiry in seconds
 * since epoch, or null if the token is malformed.
 */
export function readJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    // atob handles standard base64; Cognito tokens use URL-safe base64, so
    // swap -/_ back to +/ and pad with '=' before decoding.
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), "=");
    const json = globalThis.atob(payload);
    const parsed = JSON.parse(json) as { exp?: number };
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}
