import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_BASE, sessionCookieSecure } from "./cookie-options";
import { verifyIdToken, type FuelSession } from "./verify";

export const ID_COOKIE = "fuel_id";
export const REFRESH_COOKIE = "fuel_refresh";
/** Days we keep the refresh token. Must be ≤ Cognito's refresh-token validity
 *  (currently 30d — see packages/infrastructure/lib/auth.ts). */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Browsers reject cookies > ~4096 bytes; Cognito encrypted refresh tokens can exceed that. */
const MAX_REFRESH_COOKIE_BYTES = 4000;

export async function setSessionCookies(idToken: string, refreshToken: string | undefined, expiresIn: number) {
  const secure = sessionCookieSecure();
  const jar = await cookies();
  jar.set(ID_COOKIE, idToken, {
    ...SESSION_COOKIE_BASE,
    secure,
    maxAge: expiresIn,
  });
  if (refreshToken && refreshToken.length <= MAX_REFRESH_COOKIE_BYTES) {
    jar.set(REFRESH_COOKIE, refreshToken, {
      ...SESSION_COOKIE_BASE,
      secure,
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  }
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ID_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

async function _getSession(): Promise<FuelSession | null> {
  const jar = await cookies();
  const token = jar.get(ID_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyIdToken(token);
  } catch {
    return null;
  }
}

/** Per-request dedupe — layout + page + getCurrentUser share one JWT verify. */
export const getSession = cache(_getSession);

