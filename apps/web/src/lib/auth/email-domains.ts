import "server-only";

/**
 * Generic / consumer / disposable email providers. A founder signing up with
 * one of these can't be matched to a verifiable company domain, so we refuse
 * to provision an account and show a "use your work email" interstitial.
 *
 * The list is matched against the *suffix* of the email's domain — `gmail.com`
 * blocks both `user@gmail.com` and `user@foo.gmail.com`.
 */
const GENERIC_PROVIDER_LIST = [
  // Big-tech webmail
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  // Privacy-focused webmail
  "proton.me",
  "protonmail.com",
  "pm.me",
  "tutanota.com",
  "tutamail.com",
  "hushmail.com",
  "duck.com",
  // EU / non-US consumer webmail
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  // Productivity-style webmail
  "zoho.com",
  "fastmail.com",
  "hey.com",
  // Disposable / throwaway providers
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "throwawaymail.com",
  "sharklasers.com",
  "getnada.com",
  "trashmail.com",
  "yopmail.com",
] as const;

export const GENERIC_EMAIL_PROVIDERS: ReadonlySet<string> = new Set(
  GENERIC_PROVIDER_LIST,
);

/** Canonical form for DB lookups — matches Cognito signup + invite flows. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Extract and lowercase the domain part of an email. Returns null if the
 * input doesn't look like an email (no @, empty domain, or whitespace).
 *
 * Keep this lossless — it doesn't strip plus-addressing or normalize the
 * local part. Callers that need the local part get a clean lowercased email
 * via `normalizeEmail`.
 */
export function parseEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
  return domain;
}

/**
 * True when the email's domain matches a known generic / disposable provider,
 * including the case where it's a subdomain (e.g. `foo.gmail.com`).
 */
export function isGenericProvider(email: string | null | undefined): boolean {
  const domain = parseEmailDomain(email);
  if (!domain) return true;
  if (GENERIC_EMAIL_PROVIDERS.has(domain)) return true;
  for (const provider of GENERIC_EMAIL_PROVIDERS) {
    if (domain.endsWith(`.${provider}`)) return true;
  }
  return false;
}
