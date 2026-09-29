import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { exchangeRefreshToken } from "@/lib/auth/refresh";
import { ID_COOKIE, REFRESH_COOKIE, setSessionCookies } from "@/lib/auth/session";
import { verifyIdToken } from "@/lib/auth/verify";

/**
 * Resolve the authenticated user email for API route handlers.
 *
 * Unlike `getSession()`, this retries with a Cognito refresh-token exchange
 * when the id_token cookie is missing or expired. That matters for download
 * links and other GET handlers where middleware may refresh response cookies
 * but the route handler still reads the stale request cookie jar.
 */
async function _resolveAuthedEmail(): Promise<string | null> {
  if (!process.env.COGNITO_USER_POOL_ID) {
    return "mike@york.ie";
  }

  const jar = await cookies();
  const idToken = jar.get(ID_COOKIE)?.value;

  if (idToken) {
    try {
      const session = await verifyIdToken(idToken);
      return session.email;
    } catch {
      // Expired or invalid — fall through to refresh.
    }
  }

  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const refreshed = await exchangeRefreshToken(refreshToken);
  if (!refreshed) return null;

  try {
    const session = await verifyIdToken(refreshed.idToken);
    await setSessionCookies(refreshed.idToken, refreshToken, refreshed.expiresIn);
    return session.email;
  } catch {
    return null;
  }
}

export const resolveAuthedEmail = cache(_resolveAuthedEmail);
