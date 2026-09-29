/**
 * Public email PNG paths — mirrored from apps/web/src/lib/email/email-assets.ts.
 * Cognito/CDK cannot import apps/web; keep paths in sync by hand.
 */
export const EMAIL_ASSET_PATHS = {
  /** 44×44 PNG displayed at 22×22 */
  logoMarkLg: "/email/york-mark-22.png",
  /** 32×32 PNG displayed at 16×16 */
  logoMarkSm: "/email/york-mark-16.png",
} as const;

export const EMAIL_LOGO_DISPLAY = { lg: 22, sm: 16 } as const;

export const EMAIL_LOGO_ALT = "York IE Fuel Platform";

/** Resolve asset host from deployed Fuel app URL (e.g. https://dev.v2.fuel.york.ie). */
export function emailAssetBaseUrlFromAppUrl(appUrl: string): string {
  return appUrl.replace(/\/$/, "");
}

/** Runtime fallback when only STAGE is known (Custom Message Lambda). */
export function emailAssetBaseUrlForStage(stage: string): string {
  const explicit = process.env.FUEL_EMAIL_ASSET_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const normalized = stage.toLowerCase();
  if (normalized === "prod" || normalized === "production") {
    return "https://v2.fuel.york.ie";
  }
  if (normalized === "dev") return "https://dev.v2.fuel.york.ie";
  return "https://stage.v2.fuel.york.ie";
}

export function emailAssetUrl(assetBaseUrl: string, assetPath: string): string {
  const path = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${assetBaseUrl.replace(/\/$/, "")}${path}`;
}

export function emailLogoImg(
  assetBaseUrl: string,
  size: "lg" | "sm",
): string {
  const px = size === "lg" ? EMAIL_LOGO_DISPLAY.lg : EMAIL_LOGO_DISPLAY.sm;
  const path =
    size === "lg" ? EMAIL_ASSET_PATHS.logoMarkLg : EMAIL_ASSET_PATHS.logoMarkSm;
  const src = emailAssetUrl(assetBaseUrl, path);
  return `<img src="${src}" width="${px}" height="${px}" alt="${EMAIL_LOGO_ALT}" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />`;
}
