/** HttpOnly session cookies are Secure only when the app is served over HTTPS. */
export function sessionCookieSecure(): boolean {
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      return new URL(appUrl).protocol === "https:";
    } catch {
      // fall through
    }
  }
  return process.env.NODE_ENV === "production";
}

export const SESSION_COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};
