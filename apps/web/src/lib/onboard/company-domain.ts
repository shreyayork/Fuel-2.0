/**
 * Company website/domain resolution for claim + catalog display.
 * Independent of accounts.verifiedDomain (claiming user's email domain).
 */

/** Strip URL/domain input to bare hostname (no www). Null if unusable. */
export function hostnameFromDomainOrUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  if (!d) return null;
  if (/^https?:\/\//.test(d)) {
    try {
      d = new URL(d).hostname;
    } catch {
      return null;
    }
  }
  d = d.split("/")[0]?.split(":")[0]?.replace(/^www\./, "").trim() ?? "";
  if (!d || !d.includes(".") || d.length < 4) return null;
  // Reject spaces / illegal host chars after strip.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(d)) {
    return null;
  }
  return d;
}

/**
 * Normalize manual "company domain" input for onboard (client + server safe).
 * Accepts example.com, www., https://, trailing paths.
 */
export function normalizeManualCompanyDomain(
  raw: string | null | undefined,
): string | null {
  return hostnameFromDomainOrUrl(raw);
}

function looksLikeHostname(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (!s || /\s/.test(s) || !s.includes(".")) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    s,
  );
}

/**
 * Bare hostname for catalog_companies.domain at claim time.
 * Prefer company website (then domain-like name); email domain only as last resort.
 */
export function resolveCatalogCompanyDomain(opts: {
  website?: string | null;
  companyName?: string | null;
  verifiedEmailDomain: string;
}): string {
  const fromWebsite = hostnameFromDomainOrUrl(opts.website);
  if (fromWebsite) return fromWebsite;

  const name = opts.companyName?.trim() ?? "";
  if (name && looksLikeHostname(name)) {
    const fromName = hostnameFromDomainOrUrl(name);
    if (fromName) return fromName;
  }

  return (
    hostnameFromDomainOrUrl(opts.verifiedEmailDomain) ??
    opts.verifiedEmailDomain.replace(/^www\./i, "").toLowerCase()
  );
}

/**
 * Domain shown on company surfaces. Prefer website hostname so historical
 * rows that stamped email onto `domain` still display the company site.
 */
export function resolveDisplayCompanyDomain(opts: {
  website?: string | null;
  domain?: string | null;
}): string | null {
  return (
    hostnameFromDomainOrUrl(opts.website) ??
    hostnameFromDomainOrUrl(opts.domain)
  );
}
