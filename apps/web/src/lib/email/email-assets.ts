/**
 * Public email PNG paths under apps/web/public/email/.
 * Keep logo paths in sync with packages/infrastructure/lib/email-asset-urls.ts.
 */
/** Display sizes (px) — source PNGs are 2× for retina sharpness. */
export const EMAIL_LOGO_DISPLAY = { lg: 22, sm: 16 } as const;

export const EMAIL_ASSET_PATHS = {
  /** 44×44 PNG displayed at 22×22 */
  logoMarkLg: "/email/york-mark-22.png",
  /** 32×32 PNG displayed at 16×16 */
  logoMarkSm: "/email/york-mark-16.png",
  iconCheckCircle20: "/email/icon-check-circle-20.png",
  /** 32×32 PNG displayed at 16×16 (coupon expiry). */
  iconClock16: "/email/icon-clock-16.png",
  iconActivity20: "/email/icon-activity-20.png",
  iconCpu20: "/email/icon-cpu-20.png",
  iconBriefcase18: "/email/icon-briefcase-18.png",
  iconUsers18: "/email/icon-users-18.png",
  iconRadio18: "/email/icon-radio-18.png",
  iconTrendingUp20: "/email/icon-trending-up-20.png",
  iconFlag20: "/email/icon-flag-20.png",
  iconUser20: "/email/icon-user-20.png",
} as const;

export const EMAIL_LOGO_ALT = "York IE Fuel Platform";

function appBaseUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Base URL for email image assets. Email clients cannot load localhost or
 * relative paths — always emit absolute HTTPS URLs.
 *
 * Override with FUEL_EMAIL_ASSET_BASE_URL when APP_URL is local but assets
 * are already deployed (e.g. dev.v2.fuel.york.ie).
 */
export function emailAssetBaseUrl(): string {
  const explicit = process.env.FUEL_EMAIL_ASSET_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const app = appBaseUrl();
  if (/^https:\/\//i.test(app) && !/localhost|127\.0\.0\.1/i.test(app)) {
    return app;
  }

  const stage = process.env.STAGE?.toLowerCase();
  if (stage === "prod" || stage === "production") return "https://v2.fuel.york.ie";
  if (stage === "dev") return "https://dev.v2.fuel.york.ie";
  return "https://stage.v2.fuel.york.ie";
}

export function emailAssetUrl(assetPath: string): string {
  const path = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${emailAssetBaseUrl()}${path}`;
}

export function emailImg(
  assetPath: string,
  opts: { width: number; height: number; alt: string },
): string {
  const src = emailAssetUrl(assetPath);
  return `<img src="${src}" width="${opts.width}" height="${opts.height}" alt="${opts.alt}" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />`;
}

/** Detect legacy CSS placeholder logo (green square) in rendered HTML. */
export function hasLegacyLogoPlaceholder(html: string): boolean {
  return /background:\s*#009E6D[^>]*border-radius:\s*4px/.test(html)
    || /background:\$\{LIGHT\.accent\}[^>]*border-radius:\s*4px/.test(html);
}

/** Assert F20A-167 light email branding uses hosted PNG logo URLs. */
export function assertLightEmailLogoBranding(html: string): void {
  if (hasLegacyLogoPlaceholder(html)) {
    throw new Error("legacy green-square logo placeholder detected");
  }
  if (!html.includes(EMAIL_ASSET_PATHS.logoMarkLg)) {
    throw new Error("missing large logo PNG path");
  }
  if (!html.includes(EMAIL_ASSET_PATHS.logoMarkSm)) {
    throw new Error("missing footer logo PNG path");
  }
  if (!html.includes(`alt="${EMAIL_LOGO_ALT}"`)) {
    throw new Error("missing logo alt text");
  }
  if (/src="\/email\//.test(html) || /data:image\//.test(html)) {
    throw new Error("relative or data-URI image src detected");
  }
  if (!/src="https:\/\/[^"]+\/email\/york-mark-22\.png"/.test(html)) {
    throw new Error("logo src is not absolute HTTPS");
  }
}
