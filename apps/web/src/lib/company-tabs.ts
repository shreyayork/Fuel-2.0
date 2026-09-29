/** Company profile tab keys — canonical URL values for `?tab=`. */
export const COMPANY_TAB_KEYS = [
  "overview",
  "profile",
  "intelligence",
  "initiatives",
  "research",
  "dataroom",
] as const;

export type CompanyTabKey = (typeof COMPANY_TAB_KEYS)[number];

export type CompanyPublicNavTabItem = {
  key: CompanyTabKey;
  label: string;
  count?: number;
};

/** Legacy `?tab=` values kept for redirects and old deep links. */
const LEGACY_TAB_ALIASES: Record<string, CompanyTabKey> = {
  signals: "intelligence",
  /** Context Feed moved into Intelligence → Sources. */
  context: "intelligence",
};

export function normalizeCompanyTabParam(
  tabParam: string | undefined,
  fallback: CompanyTabKey = "overview",
): CompanyTabKey {
  if (!tabParam) return fallback;
  const aliased = LEGACY_TAB_ALIASES[tabParam];
  if (aliased) return aliased;
  if ((COMPANY_TAB_KEYS as readonly string[]).includes(tabParam)) {
    return tabParam as CompanyTabKey;
  }
  return fallback;
}

export function isLegacyTabAlias(tabParam: string | undefined): boolean {
  return tabParam != null && tabParam in LEGACY_TAB_ALIASES;
}

/**
 * Company public top-nav tabs. Data Room only when the company is claimed
 * (`isClaimedCompanyProfile` / founder home).
 */
export function companyPublicNavItems(opts: {
  isClaimedCompany: boolean;
  initiativeCount?: number;
  artifactCount?: number;
  dataRoomCount?: number;
}): CompanyPublicNavTabItem[] {
  const items: CompanyPublicNavTabItem[] = [
    { key: "overview", label: "Overview" },
    { key: "intelligence", label: "Intelligence" },
    {
      key: "initiatives",
      label: "Initiatives",
      count: opts.initiativeCount || undefined,
    },
    {
      key: "research",
      label: "Research",
      count: opts.artifactCount || undefined,
    },
  ];
  if (opts.isClaimedCompany) {
    items.push({
      key: "dataroom",
      label: "Data Room",
      count: opts.dataRoomCount || undefined,
    });
  }
  return items;
}

/** Deep-link / server resolve: Data Room is claimed-company only. */
export function resolveCompanyTabForClaim(
  tab: CompanyTabKey,
  isClaimedCompany: boolean,
): CompanyTabKey {
  if (tab === "dataroom" && !isClaimedCompany) return "overview";
  return tab;
}
