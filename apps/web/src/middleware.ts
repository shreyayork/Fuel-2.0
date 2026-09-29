import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_BASE, sessionCookieSecure } from "@/lib/auth/cookie-options";
import {
  exchangeRefreshToken,
  readJwtExp,
  type RefreshedTokens,
} from "@/lib/auth/refresh";

const ID_COOKIE = "fuel_id";
const REFRESH_COOKIE = "fuel_refresh";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Rotate when the ID token has < this many seconds left. 5 min covers
 *  typical request latencies without being so generous we thrash Cognito. */
const REFRESH_BEFORE_EXPIRY_SECONDS = 5 * 60;

/**
 * Proactive Cognito token refresh. Runs before every matched request; if
 * the id_token cookie is missing or within 5 minutes of expiry AND a
 * refresh_token cookie is present, exchange at Cognito's /oauth2/token and
 * rewrite the response cookies. Failure is silent — the server component
 * downstream will call getSession() which returns null → layout redirects
 * to /sign-in.
 *
 * The matcher (see `config.matcher` below) intentionally excludes the
 * callback route (sets its own cookies), the MCP API (bearer-token auth),
 * the internal cron API (shared-secret), and static assets. Everything
 * else passes through and gets a chance to refresh.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const idToken = req.cookies.get(ID_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  // No refresh_token → nothing we can do. Pass through. Either the user is
  // signed in with a fresh id_token (normal), or they aren't signed in at
  // all (layout handles the redirect).
  if (!refreshToken) return NextResponse.next();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = idToken ? readJwtExp(idToken) : null;
  // Missing id_token, unreadable, or close to expiry → try a refresh.
  const shouldRefresh = !idToken || exp == null || exp - nowSeconds < REFRESH_BEFORE_EXPIRY_SECONDS;
  if (!shouldRefresh) return NextResponse.next();

  const refreshed = await exchangeRefreshToken(refreshToken);
  if (!refreshed) {
    // When an id token is still present, let the server verify it instead of
    // clearing cookies — refresh exchange often fails on localhost (IPv6).
    if (idToken) return NextResponse.next();

    const response = NextResponse.next();
    response.cookies.delete(ID_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }
  return writeRefreshedCookies(req, refreshed, refreshToken);
}

function writeRefreshedCookies(
  req: NextRequest,
  refreshed: RefreshedTokens,
  existingRefreshToken: string,
): NextResponse {
  // Mirror refreshed tokens onto the incoming request so Route Handlers and
  // RSC in the same pass see the new id_token (response Set-Cookie alone is
  // not visible to cookies() until the next browser request).
  req.cookies.set(ID_COOKIE, refreshed.idToken);

  const response = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });
  const secure = sessionCookieSecure();
  response.cookies.set(ID_COOKIE, refreshed.idToken, {
    ...SESSION_COOKIE_BASE,
    secure,
    maxAge: refreshed.expiresIn,
  });
  // Cognito refresh-token rotation is off by default — the refresh_token
  // endpoint returns only id + access tokens. Re-sliding the existing
  // refresh cookie's expiry keeps the 30-day window rolling so an active
  // user never hits the hard limit.
  response.cookies.set(REFRESH_COOKIE, existingRefreshToken, {
    ...SESSION_COOKIE_BASE,
    secure,
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     *   - /api/auth/*     (callback writes its own cookies)
     *   - /api/debug/*     (Sentry verification, disabled in prod)
     *   - /api/mcp        (bearer-token auth, no cookies)
     *   - /api/cron/*     (shared-secret internal calls)
     *   - /api/hub/*      (client-id/secret machine auth, no cookies)
     *   - /api/public/*   (public API client-id/secret auth, no cookies)
     *   - /_next/*        (static + image optimization)
     *   - /sign-in        (unauthenticated page)
     *   - /forgot-password (unauthenticated reset flow)
     *   - static root files (favicon, manifest, york-mark.svg, etc.)
     *   - /email/*        (F20A-167 public email PNGs; also CloudFront→S3)
     */
    "/((?!api/auth|api/debug|api/mcp|api/cron|api/hub|api/public|_next/static|_next/image|sign-in|forgot-password|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|manifest.json|york-mark.svg|email/).*)",
  ],
};
