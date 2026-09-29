/** Local dev networks often hang on IPv6 to AWS; staging/prod are fine. */
export function shouldForceIpv4(): boolean {
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      const { hostname } = new URL(appUrl);
      if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    } catch {
      // fall through
    }
  }
  return process.env.NODE_ENV === "development";
}
