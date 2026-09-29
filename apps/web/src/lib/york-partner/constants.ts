/** Client-safe York IE partner marketing constants. */

export const YORK_SERVICES_REQUEST_URL = "https://york.ie/services-request/";
export const YORK_PARTNER_CTA_LABEL = "Talk to York IE";

/** Shared dismiss identity for left sidebar + Overview. */
export const YORK_COMPANY_WIDE_OFFER_ID = "york-common-partner";

/** Per-category detail dismiss identities (independent of company-wide). */
export const YORK_DETAIL_OFFER_IDS = {
  dev: "york-detail-rd",
  mkt: "york-detail-gtm",
  rev: "york-detail-ga",
} as const;

export const YORK_OFFER_IDS = [
  YORK_COMPANY_WIDE_OFFER_ID,
  YORK_DETAIL_OFFER_IDS.dev,
  YORK_DETAIL_OFFER_IDS.mkt,
  YORK_DETAIL_OFFER_IDS.rev,
] as const;

export type YorkOfferId = (typeof YORK_OFFER_IDS)[number];

export function isYorkOfferId(id: string): id is YorkOfferId {
  return (YORK_OFFER_IDS as readonly string[]).includes(id);
}

export const DEFAULT_MARKETING_BANNER_DISMISS_DAYS = 14;

/** Super Admin settings row in `york_chip_headlines`. */
export const YORK_CHIP_SETTINGS_CATEGORY = "settings";
export const YORK_MARKETING_BANNER_DISMISS_DAYS_KEY =
  "marketing_banner_dismiss_days";

export const YORK_HIDE_FOR_MS =
  DEFAULT_MARKETING_BANNER_DISMISS_DAYS * 24 * 60 * 60 * 1000;

export const YORK_COMMON_HEADLINE =
  "Hands-on help across R&D, GTM, and finance";

export const YORK_MAINTAIN_HEADLINES = {
  dev: "Maintain and enhance what’s working on R&D",
  mkt: "Maintain and enhance what’s working on GTM",
  rev: "Maintain and enhance what’s working on G&A",
} as const;

export type YorkPartnerCategoryId = keyof typeof YORK_DETAIL_OFFER_IDS;

export const YORK_CATEGORY_LABELS: Record<YorkPartnerCategoryId, string> = {
  dev: "R&D",
  mkt: "GTM",
  rev: "G&A",
};

export const YORK_PARTNER_CATEGORIES: YorkPartnerCategoryId[] = [
  "dev",
  "mkt",
  "rev",
];
