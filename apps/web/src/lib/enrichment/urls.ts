import "server-only";

/**
 * Normalize a LinkedIn company URL so cache hits are stable across variations.
 * Accepts full URLs, `linkedin.com/company/<slug>`, or just the slug.
 */
export function normalizeLinkedInCompanyUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    const u = new URL(trimmed);
    const slug = u.pathname
      .replace(/^\/company\/|^\/showcase\//, "")
      .replace(/\/.*$/, "");
    if (!slug) throw new Error("invalid LinkedIn company URL");
    return `https://www.linkedin.com/company/${slug.toLowerCase()}`;
  }
  if (trimmed.includes("/")) {
    const slug = trimmed.split("/").pop()!;
    return `https://www.linkedin.com/company/${slug.toLowerCase()}`;
  }
  return `https://www.linkedin.com/company/${trimmed.toLowerCase()}`;
}

export function normalizeLinkedInProfileUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    const u = new URL(trimmed);
    const slug = u.pathname.replace(/^\/in\//, "").replace(/\/.*$/, "");
    if (!slug) throw new Error("invalid LinkedIn profile URL");
    return `https://www.linkedin.com/in/${slug.toLowerCase()}`;
  }
  if (trimmed.includes("/")) {
    const slug = trimmed.split("/").pop()!;
    return `https://www.linkedin.com/in/${slug.toLowerCase()}`;
  }
  return `https://www.linkedin.com/in/${trimmed.toLowerCase()}`;
}

export function normalizeCrunchbaseCompanyUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    const u = new URL(trimmed);
    const slug = u.pathname
      .replace(/^\/organization\//, "")
      .replace(/\/.*$/, "");
    if (!slug) throw new Error("invalid Crunchbase URL");
    return `https://www.crunchbase.com/organization/${slug.toLowerCase()}`;
  }
  return `https://www.crunchbase.com/organization/${trimmed.toLowerCase()}`;
}

/**
 * Derive a Crunchbase organization slug from a canonical domain.
 * Uses the first hostname label only (`acme.com` → `acme`).
 */
export function crunchbaseSlugFromDomain(domain: string): string {
  const candidates = crunchbaseSlugCandidatesFromDomain(domain);
  return candidates[0] ?? domain.split(".")[0] ?? domain;
}

const DOMAIN_CRUNCHBASE_SLUG_OVERRIDES: Record<string, string[]> = {
  "york.ie": ["york-ie"],
  "yorkiegrowth.io": ["york-ie"],
};

const DOMAIN_LINKEDIN_SLUG_OVERRIDES: Record<string, string[]> = {
  "york.ie": ["york-ie"],
  "yorkiegrowth.io": ["york-ie"],
};

export interface ExtractedSocialUrls {
  linkedinUrl: string | null;
  twitterUrl: string | null;
  crunchbaseUrl: string | null;
}

/** Pull company social profile URLs from raw HTML or markdown (footer links, etc.). */
export function extractSocialUrlsFromText(text: string): ExtractedSocialUrls {
  const linkedin =
    /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+/i.exec(text)?.[0] ??
    null;
  const twitter =
    /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i.exec(text)?.[0] ??
    null;
  const crunchbase =
    /https?:\/\/(?:www\.)?crunchbase\.com\/organization\/[a-zA-Z0-9_-]+/i.exec(
      text,
    )?.[0] ?? null;

  return {
    linkedinUrl: linkedin ? normalizeLinkedInCompanyUrl(linkedin) : null,
    twitterUrl: twitter,
    crunchbaseUrl: crunchbase
      ? normalizeCrunchbaseCompanyUrl(crunchbase)
      : null,
  };
}

/** Ordered LinkedIn company slug guesses when the homepage has no explicit link. */
export function linkedinCompanySlugCandidatesFromDomain(domain: string): string[] {
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  const root = (parts[0] ?? host).replace(/[^a-z0-9-]/g, "");
  const ordered: string[] = [];

  const add = (slug: string) => {
    const s = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (s && !ordered.includes(s)) ordered.push(s);
  };

  const overrides = DOMAIN_LINKEDIN_SLUG_OVERRIDES[host];
  if (overrides?.length) {
    for (const slug of overrides) add(slug);
    return ordered;
  }

  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    if (tld.length === 2) add(`${root}-${tld}`);
    if (parts.length >= 3) add(`${parts[0]}-${parts[1]}`);
  }

  add(root);
  return ordered;
}

/** Ordered slug guesses for Bright Data Crunchbase scrapes (most likely first). */
export function crunchbaseSlugCandidatesFromDomain(domain: string): string[] {
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  const root = (parts[0] ?? host).replace(/[^a-z0-9-]/g, "");
  const ordered: string[] = [];

  const add = (slug: string) => {
    const s = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (s && !ordered.includes(s)) ordered.push(s);
  };

  const overrides = DOMAIN_CRUNCHBASE_SLUG_OVERRIDES[host];
  if (overrides?.length) {
    for (const slug of overrides) add(slug);
    return ordered;
  }

  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    // york.ie → york-ie
    if (tld.length === 2) add(`${root}-${tld}`);
    // acme.co.uk → acme-co
    if (parts.length >= 3) add(`${parts[0]}-${parts[1]}`);
  }

  add(root);
  return ordered;
}

/**
 * SSRF guard for any URL we're about to `fetch()` server-side based on user
 * input (catalog domains, onboarding domain extraction, scraper inputs).
 *
 * Throws when the target would hit AWS instance metadata, private IPs,
 * loopback, link-local, or non-public hosts. Call this *before* the fetch.
 * Bright Data scrapes go through an external proxy so they're lower risk,
 * but apply it consistently anywhere we pass user-supplied URLs.
 */
export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(`unsafe url: ${reason}`);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_TLDS = new Set([
  "local",
  "internal",
  "localhost",
  "lan",
  "intranet",
  "private",
  "test",
  "example",
  "invalid",
]);

function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true; // loopback
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isIPv6Literal(host: string): boolean {
  // URL hosts wrap v6 in brackets, but new URL() strips them — we still see
  // colons in the raw host. Anything with a colon is treated as v6 and refused
  // outright; we don't need v6 outbound for any provider we talk to.
  return host.includes(":");
}

export function assertPublicHttpUrl(input: string): void {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeUrlError("invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`disallowed scheme ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("embedded credentials");
  }
  const host = url.hostname.toLowerCase();
  if (!host) throw new UnsafeUrlError("missing host");
  if (isIPv6Literal(host)) throw new UnsafeUrlError("IPv6 literal");
  if (isPrivateIPv4(host))
    throw new UnsafeUrlError(`private/reserved IPv4 ${host}`);
  // Catch IP-literal v4 anywhere else (e.g. public IPs we still want to deny
  // because allowing them lets attackers target any service by IP). We require
  // a real domain name.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    throw new UnsafeUrlError(`IPv4 literal ${host}`);
  }
  const labels = host.split(".");
  if (labels.length < 2) throw new UnsafeUrlError(`single-label host ${host}`);
  const tld = labels[labels.length - 1];
  if (BLOCKED_TLDS.has(tld)) throw new UnsafeUrlError(`blocked TLD .${tld}`);
}
