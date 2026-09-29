/**
 * Copy + helpers for onboard "Can't find your company?" manual domain entry.
 * Kept pure so unit tests cover UX strings and submit gating without mounting React.
 */

export const ONBOARD_CANT_FIND_COMPANY_LABEL = "Can't find your company?";

export const ONBOARD_MANUAL_DOMAIN_HEADING = "Can't find your company?";

export const ONBOARD_MANUAL_DOMAIN_SUBCOPY =
  "Enter your company website or domain — Fuel will pull profile signals the same way as a search match.";

export const ONBOARD_MANUAL_DOMAIN_INPUT_LABEL = "Company website / domain";

export const ONBOARD_MANUAL_DOMAIN_PLACEHOLDER = "example.com";

export const ONBOARD_MANUAL_DOMAIN_INVALID =
  "Enter a valid domain like example.com";

export type ManualDomainSubmitResult =
  | { ok: true; domain: string }
  | { ok: false; error: string };

/** Validate + normalize raw domain input for manual onboard continue. */
export function parseManualDomainSubmission(
  raw: string,
  normalize: (raw: string) => string | null,
): ManualDomainSubmitResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: ONBOARD_MANUAL_DOMAIN_INVALID };
  }
  const domain = normalize(trimmed);
  if (!domain) {
    return { ok: false, error: ONBOARD_MANUAL_DOMAIN_INVALID };
  }
  return { ok: true, domain };
}
