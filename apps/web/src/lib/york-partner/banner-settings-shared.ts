import { DEFAULT_MARKETING_BANNER_DISMISS_DAYS } from "./constants";

const MAX_MARKETING_BANNER_DISMISS_DAYS = 3650;

export type BannerDismissDaysValidation =
  | { ok: true; days: number }
  | { ok: false; message: string };

export function parseMarketingBannerDismissDays(raw: unknown): number | null {
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw <= 0) return null;
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const n = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(n) || n <= 0) return null;
    return n;
  }
  return null;
}

export function coerceMarketingBannerDismissDays(raw: unknown): number {
  return (
    parseMarketingBannerDismissDays(raw) ?? DEFAULT_MARKETING_BANNER_DISMISS_DAYS
  );
}

export function validateMarketingBannerDismissDaysInput(
  raw: unknown,
): BannerDismissDaysValidation {
  const days = parseMarketingBannerDismissDays(raw);
  if (days == null) {
    return {
      ok: false,
      message: "Enter a positive whole number of days.",
    };
  }
  if (days > MAX_MARKETING_BANNER_DISMISS_DAYS) {
    return {
      ok: false,
      message: `Dismissal duration must be ${MAX_MARKETING_BANNER_DISMISS_DAYS} days or fewer.`,
    };
  }
  return { ok: true, days };
}

export function marketingBannerDismissHideMs(
  hideDays = DEFAULT_MARKETING_BANNER_DISMISS_DAYS,
): number {
  return hideDays * 24 * 60 * 60 * 1000;
}
