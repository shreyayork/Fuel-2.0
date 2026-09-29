/** Authoritative display names for known onboarding domains. */
export const KNOWN_DOMAIN_COMPANY_NAMES: Record<string, string> = {
  "york.ie": "York IE",
  "yorkiegrowth.io": "York IE Growth",
  "patriotpay.com": "Patriot Pay",
  "nexusai.io": "Nexus AI",
  "yorkportfolio.com": "York Portfolio",
};

/** Domains associated with York IE portfolio / partner companies. */
export const YORK_CLIENT_DOMAINS = Object.keys(KNOWN_DOMAIN_COMPANY_NAMES);

export function isYorkClientDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return YORK_CLIENT_DOMAINS.some(
    (y) => d === y || d.endsWith(`.${y}`),
  );
}

export function isYorkClientEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return isYorkClientDomain(domain);
}
