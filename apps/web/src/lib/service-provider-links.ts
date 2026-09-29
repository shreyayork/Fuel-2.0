/**
 * Client-safe helpers for service-provider card links and display labels.
 */

/** Turn stored website / LinkedIn values into absolute http(s) URLs for `<a href>`. */
export function normalizeExternalHref(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  // Relative paths resolve against the Fuel host and 404 — treat as invalid.
  if (trimmed.startsWith("/")) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null;

  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) {
    href = `https://${href}`;
  }

  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function providerInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}
