export type InvestorCompanyRef = {
  id: string;
  name: string;
  displayName: string;
  domain: string;
  logo: string;
  logoBg: string;
  logoUrl?: string;
  meta: string;
  headquarters: string;
  employees: string;
  linkedin: string;
  onFuel: boolean;
};

export type PipelineBoardId =
  | "growth_fund"
  | "operating_projects"
  | "seed_fund"
  | "operating_subscriptions";

export type PipelineStage =
  | "appointment"
  | "qualified"
  | "presentation"
  | "decision"
  | "contract";

export type PipelineDeal = {
  id: string;
  boardId: PipelineBoardId;
  company: string;
  companyId: string;
  stage: PipelineStage;
  amount: string;
  amountValue: number;
  domain: string | null;
  category: string | null;
  closeDate: string;
  redFlag: boolean;
  onFuel: boolean;
  logo: string;
  logoBg: string;
};

export type PipelineBoard = {
  id: PipelineBoardId;
  label: string;
};

export type QoqMovement = "up" | "flat" | "down";

export type PortfolioRedFlagKind =
  | "runway"
  | "arr_decline"
  | "nrr"
  | "stale_benchmark";

export type PortfolioRedFlag = {
  kind: PortfolioRedFlagKind;
  label: string;
};

export type PortfolioCompany = InvestorCompanyRef & {
  ownership: string;
  invested: string;
  investedAmount: number;
  estimatedValue: number;
  arr: string;
  arrGrowthQoQ: number;
  nrr: number;
  runwayMonths: number;
  runway: string;
  stage: string;
  sector: string;
  investedAt: string;
  daysSinceBenchmark: number;
  health: "strong" | "watch" | "struggling";
  strugglingAreas: string[];
  lastUpdate: string;
  founderEmail?: string;
};

export type SuggestedFounder = InvestorCompanyRef & {
  matchScore: number;
  matchReason: string;
  stage: string;
  sector: string;
  geography: string;
  timing: string;
  yorkIe: string;
  similarTo: string | null;
  overlap: string;
  arrBand: string;
};

export type PortfolioCompanyView = PortfolioCompany & {
  moic: number;
  qoqMovement: QoqMovement;
  redFlags: PortfolioRedFlag[];
  urgentFlag: PortfolioRedFlag | null;
};

export type PortfolioFundTotals = {
  totalInvested: number;
  estimatedValue: number;
  blendedMoic: number;
  activeCompanies: number;
  redFlagCompanies: number;
};

export type SectorAllocationSlice = {
  sector: string;
  investedAmount: number;
  share: number;
  color: string;
};

export type DemographicAllocationSlice = {
  region: string;
  investedAmount: number;
  share: number;
  companyCount: number;
  color: string;
};

/** Theme-aware via --inv-chart-* on .investor-dashboard (see investor.css). */
const SECTOR_COLORS = [
  "var(--inv-chart-1)",
  "var(--inv-chart-2)",
  "var(--inv-chart-3)",
  "var(--inv-chart-4)",
  "var(--inv-chart-5)",
];
const DEMOGRAPHIC_COLORS = [
  "var(--inv-chart-1)",
  "var(--inv-chart-2)",
  "var(--inv-chart-3)",
  "var(--inv-chart-4)",
  "var(--inv-chart-5)",
];

export const PIPELINE_BOARDS: PipelineBoard[] = [
  { id: "growth_fund", label: "Growth Fund" },
  { id: "operating_projects", label: "Operating - Projects" },
  { id: "seed_fund", label: "Seed Fund" },
  { id: "operating_subscriptions", label: "Operating - Subscriptions" },
];

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "appointment", label: "Appointment Scheduled" },
  { id: "qualified", label: "Qualified To Buy" },
  { id: "presentation", label: "Presentation Scheduled" },
  { id: "decision", label: "Decision Maker Bought-In" },
  { id: "contract", label: "Contract Sent" },
];

export function buildClearbitLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}

/** Slug for local dummy logo assets under /public/company-logos/. */
export function companyLogoSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Portfolio / benchmark graph logo set (files in /public/company-logos/). */
export const COMPANY_LOGO_ASSET_SLUGS = [
  "airtable",
  "anthropic",
  "brex",
  "canva",
  "checkout-com",
  "databricks",
  "datadog",
  "deel",
  "discord",
  "dropbox",
  "figma",
  "gusto",
  "klarna",
  "linear",
  "mongodb",
  "monzo",
  "notion",
  "openai",
  "operator-ai",
  "patriot-pay",
  "plaid",
  "ramp",
  "retool",
  "rippling",
  "scale-ai",
  "slack",
  "snowflake",
  "stripe",
  "sync-sports",
  "vercel",
] as const;

const COMPANY_LOGO_ASSET_SET = new Set<string>(COMPANY_LOGO_ASSET_SLUGS);

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministic pick from the portfolio logo set (stable per company). */
export function pickCompanyLogoAssetUrl(seed: string): string {
  const slug = COMPANY_LOGO_ASSET_SLUGS[hashSeed(seed) % COMPANY_LOGO_ASSET_SLUGS.length]!;
  return `/company-logos/${slug}.svg`;
}

export function buildCompanyLogoAssetUrl(label: string): string {
  return `/company-logos/${companyLogoSlug(label)}.svg`;
}

export function resolveCompanyLogoUrl(
  company: Pick<InvestorCompanyRef, "displayName" | "domain" | "logoUrl"> & { id?: string },
): string {
  if (company.logoUrl) {
    const explicitSlug = company.logoUrl.replace(/^.*\//, "").replace(/\.svg$/i, "");
    if (COMPANY_LOGO_ASSET_SET.has(explicitSlug) || company.logoUrl.startsWith("http")) {
      return company.logoUrl;
    }
  }
  const namedSlug = companyLogoSlug(company.displayName);
  if (COMPANY_LOGO_ASSET_SET.has(namedSlug)) {
    return `/company-logos/${namedSlug}.svg`;
  }
  return pickCompanyLogoAssetUrl(company.id || company.domain || company.displayName);
}

export const INVESTOR_PORTFOLIO: PortfolioCompany[] = [
  {
    id: "patriotpay",
    name: "patriotpay",
    displayName: "Patriot Pay",
    domain: "patriotpay.com",
    logo: "P",
    logoBg: "#1E4D8C",
    logoUrl: buildCompanyLogoAssetUrl("Patriot Pay"),
    meta: "Healthcare · Patient Billing · Seed",
    headquarters: "Boston, MA, US",
    employees: "11-50",
    linkedin: "linkedin.com/company/patriotpay",
    onFuel: true,
    ownership: "8.2%",
    invested: "$500K",
    investedAmount: 500_000,
    estimatedValue: 720_000,
    arr: "$1.1M",
    arrGrowthQoQ: 12,
    nrr: 94,
    runwayMonths: 9,
    runway: "9 mo",
    stage: "Seed",
    sector: "Healthcare",
    investedAt: "Feb 2024",
    daysSinceBenchmark: 18,
    health: "watch",
    strugglingAreas: ["GTM motion still founder-led", "NRR below cohort median"],
    lastUpdate: "2 days ago",
    founderEmail: "founders@patriotpay.com",
  },
  {
    id: "operator-ai",
    name: "operator-ai",
    displayName: "Operator AI",
    domain: "operator.ai",
    logo: "O",
    logoBg: "#5B3A8C",
    logoUrl: buildCompanyLogoAssetUrl("Operator AI"),
    meta: "AI Operations · Workflow Automation · Seed",
    headquarters: "San Francisco, CA, US",
    employees: "11-50",
    linkedin: "linkedin.com/company/operator-ai",
    onFuel: true,
    ownership: "6.5%",
    invested: "$750K",
    investedAmount: 750_000,
    estimatedValue: 1_650_000,
    arr: "$890K",
    arrGrowthQoQ: 28,
    nrr: 112,
    runwayMonths: 14,
    runway: "14 mo",
    stage: "Seed",
    sector: "AI Operations",
    investedAt: "Nov 2023",
    daysSinceBenchmark: 12,
    health: "strong",
    strugglingAreas: [],
    lastUpdate: "5 days ago",
    founderEmail: "founders@operator.ai",
  },
  {
    id: "sync-sports",
    name: "sync-sports",
    displayName: "Sync Sports",
    domain: "syncsports.io",
    logo: "S",
    logoBg: "#8C5B3A",
    logoUrl: buildCompanyLogoAssetUrl("Sync Sports"),
    meta: "Sports Tech · Fan Engagement · Seed",
    headquarters: "Austin, TX, US",
    employees: "11-50",
    linkedin: "linkedin.com/company/sync-sports",
    onFuel: false,
    ownership: "5.1%",
    invested: "$400K",
    investedAmount: 400_000,
    estimatedValue: 280_000,
    arr: "$620K",
    arrGrowthQoQ: -38,
    nrr: 86,
    runwayMonths: 5,
    runway: "5 mo",
    stage: "Seed",
    sector: "Sports Tech",
    investedAt: "Jun 2024",
    daysSinceBenchmark: 104,
    health: "struggling",
    strugglingAreas: ["Runway under 6 months", "Pipeline conversion lagging", "No RevOps owner"],
    lastUpdate: "1 week ago",
    founderEmail: "founders@syncsports.io",
  },
];

export const INVESTOR_PIPELINE: PipelineDeal[] = [
  {
    id: "d1",
    boardId: "growth_fund",
    company: "Euler",
    companyId: "euler",
    stage: "appointment",
    amount: "$5.0M",
    amountValue: 5_000_000,
    domain: null,
    category: null,
    closeDate: "Apr 30",
    redFlag: true,
    onFuel: true,
    logo: "E",
    logoBg: "#1E4D8C",
  },
  {
    id: "d2",
    boardId: "growth_fund",
    company: "Pixaera",
    companyId: "pixaera",
    stage: "appointment",
    amount: "",
    amountValue: 0,
    domain: "pixaera.com",
    category: null,
    closeDate: "May 31",
    redFlag: true,
    onFuel: false,
    logo: "P",
    logoBg: "#3A5C8C",
  },
  {
    id: "d3",
    boardId: "growth_fund",
    company: "Guthrie AI",
    companyId: "guthrie-ai",
    stage: "appointment",
    amount: "",
    amountValue: 0,
    domain: null,
    category: null,
    closeDate: "May 31",
    redFlag: true,
    onFuel: false,
    logo: "G",
    logoBg: "#5B3A8C",
  },
  {
    id: "d4",
    boardId: "growth_fund",
    company: "Upshop",
    companyId: "upshop",
    stage: "appointment",
    amount: "",
    amountValue: 0,
    domain: null,
    category: "COMPUTER_SOFTWARE",
    closeDate: "May 31",
    redFlag: true,
    onFuel: false,
    logo: "U",
    logoBg: "#8C5B3A",
  },
  {
    id: "d5",
    boardId: "growth_fund",
    company: "Ledgerly",
    companyId: "ledgerly",
    stage: "qualified",
    amount: "$500K",
    amountValue: 500_000,
    domain: "ledgerly.com",
    category: null,
    closeDate: "Jun 15",
    redFlag: true,
    onFuel: true,
    logo: "L",
    logoBg: "#2A5C8C",
  },
  {
    id: "d6",
    boardId: "growth_fund",
    company: "Winrate",
    companyId: "winrate",
    stage: "qualified",
    amount: "$250K",
    amountValue: 250_000,
    domain: "winrate.io",
    category: null,
    closeDate: "Jul 12",
    redFlag: true,
    onFuel: false,
    logo: "W",
    logoBg: "#3A8C5B",
  },
  {
    id: "d7",
    boardId: "growth_fund",
    company: "Patriot Pay",
    companyId: "patriotpay",
    stage: "presentation",
    amount: "$500K",
    amountValue: 500_000,
    domain: "patriotpay.com",
    category: null,
    closeDate: "May 20",
    redFlag: true,
    onFuel: true,
    logo: "P",
    logoBg: "#1E4D8C",
  },
  {
    id: "d8",
    boardId: "growth_fund",
    company: "Nova Health",
    companyId: "nova-health",
    stage: "presentation",
    amount: "$1.2M",
    amountValue: 1_200_000,
    domain: "novahealth.co",
    category: null,
    closeDate: "Jun 1",
    redFlag: true,
    onFuel: false,
    logo: "N",
    logoBg: "#6B3A8C",
  },
  {
    id: "d9",
    boardId: "growth_fund",
    company: "Operator AI",
    companyId: "operator-ai",
    stage: "presentation",
    amount: "$750K",
    amountValue: 750_000,
    domain: "operator.ai",
    category: null,
    closeDate: "May 8",
    redFlag: false,
    onFuel: true,
    logo: "O",
    logoBg: "#5B3A8C",
  },
  {
    id: "d10",
    boardId: "growth_fund",
    company: "Sync Sports",
    companyId: "sync-sports",
    stage: "presentation",
    amount: "$400K",
    amountValue: 400_000,
    domain: null,
    category: null,
    closeDate: "Aug 3",
    redFlag: true,
    onFuel: false,
    logo: "S",
    logoBg: "#8C5B3A",
  },
  {
    id: "d11",
    boardId: "growth_fund",
    company: "Brightpath",
    companyId: "brightpath",
    stage: "presentation",
    amount: "",
    amountValue: 0,
    domain: "brightpath.io",
    category: null,
    closeDate: "Sep 14",
    redFlag: true,
    onFuel: false,
    logo: "B",
    logoBg: "#2A6B5C",
  },
  {
    id: "d12",
    boardId: "growth_fund",
    company: "Northline",
    companyId: "northline",
    stage: "contract",
    amount: "$8.0M",
    amountValue: 8_000_000,
    domain: "northline.com",
    category: null,
    closeDate: "Apr 18",
    redFlag: true,
    onFuel: true,
    logo: "N",
    logoBg: "#1E5C8C",
  },
  {
    id: "d13",
    boardId: "growth_fund",
    company: "Harbor Ops",
    companyId: "harbor-ops",
    stage: "contract",
    amount: "$7.0M",
    amountValue: 7_000_000,
    domain: null,
    category: "COMPUTER_SOFTWARE",
    closeDate: "May 2",
    redFlag: true,
    onFuel: false,
    logo: "H",
    logoBg: "#8C3A5B",
  },
  {
    id: "d14",
    boardId: "seed_fund",
    company: "Winrate",
    companyId: "winrate",
    stage: "appointment",
    amount: "$250K",
    amountValue: 250_000,
    domain: "winrate.io",
    category: null,
    closeDate: "Jun 30",
    redFlag: false,
    onFuel: false,
    logo: "W",
    logoBg: "#3A8C5B",
  },
  {
    id: "d15",
    boardId: "seed_fund",
    company: "Ledgerly",
    companyId: "ledgerly",
    stage: "qualified",
    amount: "$500K",
    amountValue: 500_000,
    domain: "ledgerly.com",
    category: null,
    closeDate: "Jul 22",
    redFlag: true,
    onFuel: true,
    logo: "L",
    logoBg: "#2A5C8C",
  },
];

export const SUGGESTED_FOUNDERS: SuggestedFounder[] = [
  {
    id: "swiggy",
    name: "swiggy",
    displayName: "Swiggy",
    domain: "swiggy.com",
    logo: "S",
    logoBg: "#FC8019",
    meta: "ipo · restaurants",
    headquarters: "Bangalore, Karnataka, IN",
    employees: "5001-10000",
    linkedin: "linkedin.com/company/swiggy",
    onFuel: false,
    matchScore: 64,
    matchReason:
      "Large public consumer marketplace with deep funding history — useful third-party reference for food delivery and hyperlocal logistics comps.",
    stage: "IPO",
    sector: "Consumer Marketplace",
    geography: "India",
    timing: "Public company",
    yorkIe: "External · fuel-data",
    similarTo: "Zomato",
    overlap: "Third-party company — not in portfolio",
    arrBand: "Public",
  },
  {
    id: "ledgerly",
    name: "ledgerly",
    displayName: "Ledgerly",
    domain: "ledgerly.com",
    logo: "L",
    logoBg: "#2A5C8C",
    meta: "FinTech · SMB Accounting · Seed",
    headquarters: "San Francisco, CA, US",
    employees: "11-50",
    linkedin: "linkedin.com/company/ledgerly",
    onFuel: true,
    matchScore: 82,
    matchReason:
      "SMB accounting SaaS at $800K–$1.2M ARR with a complete Fuel benchmark. Clean thesis fit for your B2B seed check, no portfolio overlap, and a round likely inside six months.",
    stage: "Seed",
    sector: "FinTech",
    geography: "United States",
    timing: "Likely raising in 6 months",
    yorkIe: "Engaged 9 months · Benchmark complete",
    similarTo: "Operator AI",
    overlap: "No portfolio overlap — new exposure",
    arrBand: "$800K–$1.2M ARR",
  },
  {
    id: "patriotpay",
    name: "patriotpay",
    displayName: "Patriot Pay",
    domain: "patriotpay.com",
    logo: "P",
    logoBg: "#1E4D8C",
    meta: "Healthcare · Patient Billing · Seed",
    headquarters: "Boston, MA, US",
    employees: "11-50",
    linkedin: "linkedin.com/company/patriotpay",
    onFuel: true,
    matchScore: 91,
    matchReason:
      "Patient billing SaaS past $1M ARR with live cohort benchmarks already in diligence. You know the NRR and GTM gaps — strongest path to deepen before the next raise in 3–4 months.",
    stage: "Seed",
    sector: "Healthcare",
    geography: "United States",
    timing: "Likely raising in 3–4 months",
    yorkIe: "Engaged 14 months · Benchmark complete",
    similarTo: null,
    overlap: "Already in portfolio — deepen diligence",
    arrBand: "$1M+ ARR",
  },
  {
    id: "winrate",
    name: "winrate",
    displayName: "Winrate",
    domain: "winrate.io",
    logo: "W",
    logoBg: "#3A8C5B",
    meta: "Sales Tech · Forecasting · Pre-seed",
    headquarters: "Chicago, IL, US",
    employees: "1-10",
    linkedin: "linkedin.com/company/winrate",
    onFuel: false,
    matchScore: 78,
    matchReason:
      "Pre-revenue sales forecasting wedge aimed at early GTM teams. Fits your software thesis with no portfolio overlap — early look while the profile is still public-only and the raise is 9–12 months out.",
    stage: "Pre-seed",
    sector: "Sales Tech",
    geography: "United States",
    timing: "Likely raising in 9–12 months",
    yorkIe: "Not engaged yet · Public profile only",
    similarTo: "Operator AI",
    overlap: "No portfolio overlap — new exposure",
    arrBand: "Pre-revenue",
  },
  {
    id: "nova-health",
    name: "nova-health",
    displayName: "Nova Health",
    domain: "novahealth.co",
    logo: "N",
    logoBg: "#6B3A8C",
    meta: "Healthcare · Revenue Cycle · Series A",
    headquarters: "Nashville, TN, US",
    employees: "51-200",
    linkedin: "linkedin.com/company/nova-health",
    onFuel: false,
    matchScore: 72,
    matchReason:
      "Revenue-cycle platform at $3M+ ARR and Series A scale, adjacent to Patriot Pay. Investible if you want more healthcare RCM exposure — weigh concentration against the larger check.",
    stage: "Series A",
    sector: "Healthcare",
    geography: "United States",
    timing: "Likely raising in 12+ months",
    yorkIe: "Introduced via advisor · Profile incomplete",
    similarTo: "Patriot Pay",
    overlap: "Sector overlap with Patriot Pay — concentrated exposure",
    arrBand: "$3M+ ARR",
  },
].sort((left, right) => Number(right.onFuel) - Number(left.onFuel) || right.matchScore - left.matchScore);

export type WatchlistScope = "Workspace" | "Private" | "Team";
export type WatchlistOwnerKind = "mine" | "shared";

export const WATCHLIST_VISIBILITY_OPTIONS: WatchlistScope[] = [
  "Workspace",
  "Private",
  "Team",
];

export function watchlistOwnerKindForScope(scope: WatchlistScope): WatchlistOwnerKind {
  return scope === "Private" ? "mine" : "shared";
}

export const WATCHLIST_TEAM_OPTIONS = [
  "Alpha",
  "Beta",
  "Growth",
  "Platform",
  "Deal team",
] as const;

export type WatchlistTeam = (typeof WATCHLIST_TEAM_OPTIONS)[number];

export type WatchlistEditDraft = {
  name: string;
  scope: WatchlistScope;
  teams: string[];
};

export function buildWatchlistEditDraft(row: WatchlistRow): WatchlistEditDraft {
  return {
    name: row.name,
    scope: row.scope,
    teams: row.scope === "Team" ? [...(row.teams ?? [])] : [],
  };
}

export function isWatchlistEditValid(draft: WatchlistEditDraft): boolean {
  if (!draft.name.trim()) return false;
  if (draft.scope === "Team" && draft.teams.length === 0) return false;
  return true;
}

export function applyWatchlistEdit(row: WatchlistRow, draft: WatchlistEditDraft): WatchlistRow {
  const name = draft.name.trim();
  const ownerKind = watchlistOwnerKindForScope(draft.scope);
  const teams = draft.scope === "Team" ? draft.teams : [];
  return {
    ...row,
    name,
    scope: draft.scope,
    teams,
    ownerKind,
    updatedAt: "Just now",
  };
}

export type WatchlistCompanyChip = {
  logo: string;
  logoBg: string;
  name: string;
  logoUrl?: string;
};

export type WatchlistCompanyEntry = WatchlistCompanyChip & {
  id: string;
  addedAt: string;
  addedBy: string;
};

export type WatchlistRow = {
  id: string;
  name: string;
  entries: WatchlistCompanyEntry[];
  ownerName: string;
  ownerEmail: string;
  ownerKind: WatchlistOwnerKind;
  scope: WatchlistScope;
  /** Selected teams when scope is Team. */
  teams: string[];
  updatedAt: string;
  digest: "Off" | "Weekly" | "Daily";
  starred: boolean;
};

export function watchlistEntryCount(row: WatchlistRow): number {
  return row.entries?.length ?? 0;
}

export function watchlistPreviewChips(row: WatchlistRow, limit = 4): WatchlistCompanyChip[] {
  return (row.entries ?? []).slice(0, limit).map(({ logo, logoBg, name, logoUrl }) => ({
    logo,
    logoBg,
    name,
    logoUrl,
  }));
}

export function watchlistOwnerDisplay(row: WatchlistRow): string {
  if (row.ownerKind === "mine") return "you";
  return row.ownerName;
}

export function watchlistAccessInitials(row: WatchlistRow): string {
  const label = row.teams?.[0] ?? row.ownerName;
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

export function watchlistTeamLabels(row: WatchlistRow): string[] {
  if (row.scope !== "Team") return [];
  return row.teams ?? [];
}

export function watchlistAccessName(row: WatchlistRow): string {
  if (row.scope === "Team" && (row.teams?.length ?? 0) > 0) {
    return row.teams!.join(", ");
  }
  return row.ownerName;
}

export function watchlistVisibilityCopy(row: WatchlistRow): string {
  const teams = row.teams ?? [];
  if (row.scope === "Private") return "Visible to you only.";
  if (row.scope === "Workspace") return "Visible to your workspace.";
  if (teams.length === 0) return "Select teams to share with.";
  if (teams.length === 1) return `Visible to ${teams[0]}.`;
  if (teams.length === 2) return `Visible to ${teams[0]} and ${teams[1]}.`;
  return `Visible to ${teams.slice(0, -1).join(", ")}, and ${teams.at(-1)}.`;
}

export function buildWatchlistEntry(
  name: string,
  opts: Partial<Pick<WatchlistCompanyEntry, "id" | "logo" | "logoBg" | "logoUrl" | "addedAt" | "addedBy">> = {},
): WatchlistCompanyEntry {
  return {
    id: opts.id ?? `wl-co-${companyLogoSlug(name)}`,
    name,
    logo: opts.logo ?? name.trim().slice(0, 1).toUpperCase(),
    logoBg: opts.logoBg ?? "#6b7280",
    logoUrl: opts.logoUrl ?? buildCompanyLogoAssetUrl(name),
    addedAt: opts.addedAt ?? "Just now",
    addedBy: opts.addedBy ?? "you",
  };
}

export const INVESTOR_WATCHLISTS: WatchlistRow[] = [
  {
    id: "wl-alpha",
    name: "Alpha's Watchlist",
    entries: [
      buildWatchlistEntry("York IE", {
        id: "york-ie",
        logo: "Y",
        logoBg: "#6b7280",
        addedAt: "0m ago",
        addedBy: "you",
      }),
    ],
    ownerName: "you",
    ownerEmail: "",
    ownerKind: "mine",
    scope: "Team",
    teams: ["Alpha"],
    updatedAt: "0m ago",
    digest: "Off",
    starred: false,
  },
  {
    id: "wl-swiggy",
    name: "swiggy",
    entries: [],
    ownerName: "bhavik.s",
    ownerEmail: "bhavik.s@york.ie",
    ownerKind: "shared",
    scope: "Workspace",
    teams: [],
    updatedAt: "25d ago",
    digest: "Off",
    starred: false,
  },
  {
    id: "wl-ge-partners",
    name: "GE Partners",
    entries: [
      buildWatchlistEntry("Patriot Pay", { logo: "P", logoBg: "#1E4D8C", addedAt: "25d ago", addedBy: "bhavik.s" }),
      buildWatchlistEntry("Operator AI", { logo: "O", logoBg: "#5B3A8C", addedAt: "25d ago", addedBy: "bhavik.s" }),
      buildWatchlistEntry("Ledgerly", { logo: "L", logoBg: "#2A5C8C", addedAt: "25d ago", addedBy: "bhavik.s" }),
      buildWatchlistEntry("Nova Health", { logo: "N", logoBg: "#6B3A8C", addedAt: "25d ago", addedBy: "bhavik.s" }),
    ],
    ownerName: "bhavik.s",
    ownerEmail: "bhavik.s@york.ie",
    ownerKind: "shared",
    scope: "Workspace",
    teams: [],
    updatedAt: "25d ago",
    digest: "Off",
    starred: false,
  },
];

export type PortfolioListScope = "Account" | "Personal";
export type PortfolioListOwnerKind = "mine" | "shared";
export type PortfolioListDigest = "Off" | "Weekly" | "Daily";

/** Startup stages for portfolio cohort selection in the create bar. */
export const PORTFOLIO_COHORT_STAGES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Growth",
] as const;

export type PortfolioCohortStage = (typeof PORTFOLIO_COHORT_STAGES)[number];

export function buildPortfolioMeta(fundLabel: string): string {
  return fundLabel.trim();
}

/** Optional fund-label tags beside the name — never show "portfolio" or cohort stages. */
export function portfolioMetaDisplayTags(meta: string): string[] {
  const hiddenLabels = new Set([
    "portfolio",
    ...PORTFOLIO_COHORT_STAGES.map(stage => stage.toLowerCase()),
  ]);
  return meta
    .split("·")
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => !hiddenLabels.has(part.toLowerCase()));
}

export function portfolioCompanyToChip(
  company: Pick<PortfolioCompany, "displayName" | "logo" | "logoBg" | "domain">,
): WatchlistCompanyChip {
  return {
    logo: company.logo,
    logoBg: company.logoBg,
    name: company.displayName,
    logoUrl: resolveCompanyLogoUrl(company),
  };
}

/** Display chips for Seed Fund — 30 companies with local dummy logo assets. */
function seedFundChip(
  logo: string,
  logoBg: string,
  name: string,
): WatchlistCompanyChip {
  return {
    logo,
    logoBg,
    name,
    logoUrl: buildCompanyLogoAssetUrl(name),
  };
}

export const SEED_FUND_PORTFOLIO_CHIPS: WatchlistCompanyChip[] = [
  seedFundChip("P", "#1E4D8C", "Patriot Pay"),
  seedFundChip("O", "#5B3A8C", "Operator AI"),
  seedFundChip("S", "#8C5B3A", "Sync Sports"),
  seedFundChip("St", "#635BFF", "Stripe"),
  seedFundChip("N", "#111111", "Notion"),
  seedFundChip("F", "#A259FF", "Figma"),
  seedFundChip("A", "#FCBF49", "Airtable"),
  seedFundChip("L", "#5E6AD2", "Linear"),
  seedFundChip("V", "#111111", "Vercel"),
  seedFundChip("R", "#354CCB", "Retool"),
  seedFundChip("Ra", "#E4F222", "Ramp"),
  seedFundChip("B", "#FF5A00", "Brex"),
  seedFundChip("D", "#1DB954", "Deel"),
  seedFundChip("Ri", "#FFD748", "Rippling"),
  seedFundChip("G", "#F45D48", "Gusto"),
  seedFundChip("Pl", "#111111", "Plaid"),
  seedFundChip("C", "#0B5FFF", "Checkout.com"),
  seedFundChip("M", "#14233C", "Monzo"),
  seedFundChip("K", "#FFB3C7", "Klarna"),
  seedFundChip("Di", "#5865F2", "Discord"),
  seedFundChip("Sl", "#4A154B", "Slack"),
  seedFundChip("Dr", "#0061FF", "Dropbox"),
  seedFundChip("Ca", "#00C4CC", "Canva"),
  seedFundChip("Mo", "#00ED64", "MongoDB"),
  seedFundChip("Da", "#632CA6", "Datadog"),
  seedFundChip("Sn", "#29B5E8", "Snowflake"),
  seedFundChip("Db", "#FF3621", "Databricks"),
  seedFundChip("Op", "#10A37F", "OpenAI"),
  seedFundChip("An", "#CC785C", "Anthropic"),
  seedFundChip("Sc", "#1F6FEB", "Scale AI"),
];

export const PORTFOLIO_LIST_LOGO_VISIBLE = 3;

function seedFundDomainFromChip(chip: WatchlistCompanyChip): string {
  return `${companyLogoSlug(chip.name).replace(/-/g, "")}.com`;
}

function buildSeedFundPortfolioCompany(chip: WatchlistCompanyChip, index: number): PortfolioCompany {
  const coreIds = ["patriotpay", "operator-ai", "sync-sports"] as const;
  const coreId = coreIds[index];
  if (coreId) {
    const existing = INVESTOR_PORTFOLIO.find(company => company.id === coreId);
    if (existing) return existing;
  }

  const slug = chip.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const domain = seedFundDomainFromChip(chip);
  const investedAmount = 300_000 + (index % 9) * 50_000;
  const moic = 0.75 + (index % 6) * 0.22;
  const estimatedValue = Math.round(investedAmount * moic);
  const arrMillions = 0.45 + (index % 8) * 0.12;
  const healthCycle: PortfolioCompany["health"][] = ["strong", "watch", "struggling"];
  const health = healthCycle[index % healthCycle.length]!;
  const headquarters = ["San Francisco, CA, US", "New York, NY, US", "Boston, MA, US", "Austin, TX, US"];

  return {
    id: `seed-fund-${slug}`,
    name: slug,
    displayName: chip.name,
    domain,
    logo: chip.logo,
    logoBg: chip.logoBg,
    logoUrl: chip.logoUrl ?? buildCompanyLogoAssetUrl(chip.name),
    meta: `B2B SaaS · ${chip.name} · Seed`,
    headquarters: headquarters[index % headquarters.length]!,
    employees: index % 3 === 0 ? "1-10" : "11-50",
    linkedin: `linkedin.com/company/${slug}`,
    onFuel: index % 4 !== 0,
    ownership: `${(4 + (index % 6)).toFixed(1)}%`,
    invested: `$${Math.round(investedAmount / 1000)}K`,
    investedAmount,
    estimatedValue,
    arr: `$${arrMillions.toFixed(1)}M`,
    arrGrowthQoQ: index % 5 === 0 ? -14 : 6 + (index % 6) * 5,
    nrr: 86 + (index % 12) * 2,
    runwayMonths: 6 + (index % 14),
    runway: `${6 + (index % 14)} mo`,
    stage: (["Pre-seed", "Seed", "Seed", "Series A", "Series B"] as const)[index % 5]!,
    sector: (["B2B SaaS", "FinTech", "Healthcare", "AI Operations", "Consumer Marketplace"] as const)[index % 5]!,
    investedAt: ["Jan 2024", "Mar 2024", "May 2024", "Aug 2024", "Nov 2024"][index % 5]!,
    daysSinceBenchmark: 8 + (index % 40),
    health,
    strugglingAreas: health === "struggling"
      ? ["Runway under 9 months"]
      : health === "watch"
        ? ["NRR below cohort median"]
        : [],
    lastUpdate: `${1 + (index % 12)} days ago`,
    founderEmail: `founders@${domain}`,
  };
}

/** Full Seed Fund holdings — 30 companies for list + detail views. */
export const SEED_FUND_EXTENDED_PORTFOLIO: PortfolioCompany[] = SEED_FUND_PORTFOLIO_CHIPS.map(
  (chip, index) => buildSeedFundPortfolioCompany(chip, index),
);

const SEED_FUND_COMPANY_IDS = SEED_FUND_EXTENDED_PORTFOLIO.map(company => company.id);

export function buildSeedFundPortfolioRow(): PortfolioListRow {
  return {
    id: "pf-seed-fund",
    name: "Seed Fund",
    meta: "",
    cohort: "Pre-seed",
    companyCount: SEED_FUND_PORTFOLIO_CHIPS.length,
    companies: SEED_FUND_PORTFOLIO_CHIPS.slice(0, PORTFOLIO_LIST_LOGO_VISIBLE),
    companyIds: SEED_FUND_COMPANY_IDS,
    ownerName: "mike",
    ownerEmail: "mike@york.ie",
    ownerKind: "shared",
    scope: "Account",
    updatedAt: "1mo ago",
    digest: "Off",
    starred: false,
  };
}

export type OnboardingPortfolioInput = {
  fundName: string;
  stages?: readonly string[];
  sectors?: readonly string[];
  checkSize?: string;
  geography?: readonly string[];
};

function onboardingPortfolioName(fundName: string): string {
  const cleanName = fundName.trim() || "My";
  return /\bportfolio\b/i.test(cleanName) ? cleanName : `${cleanName} Portfolio`;
}

function onboardingPortfolioCohort(stages: readonly string[] = []): PortfolioCohortStage {
  const first = stages[0]?.toLowerCase() ?? "";
  if (first.includes("pre-seed")) return "Pre-seed";
  if (first.includes("series a")) return "Series A";
  if (first.includes("series b")) return "Series B";
  if (first.includes("growth") || first.includes("series c")) return "Growth";
  return "Seed";
}

function onboardingFundSlug(fundName: string): string {
  return (fundName.trim() || "my-fund")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function onboardingStageCohorts(stages: readonly string[] = []): PortfolioCohortStage[] {
  const cohorts: PortfolioCohortStage[] = [];
  for (const stage of stages) {
    const lower = stage.toLowerCase();
    if (lower.includes("pre-seed")) cohorts.push("Pre-seed");
    if (lower.includes("seed") && !lower.includes("series")) cohorts.push("Seed");
    if (lower.includes("series a") || lower.includes("a / b")) cohorts.push("Series A");
    if (lower.includes("series b") || lower.includes("a / b")) cohorts.push("Series B");
    if (lower.includes("growth") || lower.includes("series c")) cohorts.push("Growth");
  }
  return [...new Set(cohorts)];
}

function companyMatchesOnboardingSector(company: PortfolioCompany, sector: string): boolean {
  const needle = sector.toLowerCase();
  const hay = `${company.sector} ${company.meta}`.toLowerCase();
  if (needle.includes("saas") || needle.includes("software")) {
    return hay.includes("saas") || hay.includes("software") || hay.includes("sales tech");
  }
  if (needle.includes("fintech")) return hay.includes("fintech") || hay.includes("payment");
  if (needle.includes("health")) return hay.includes("health");
  if (needle.includes("ai") || needle.includes("deep")) {
    return hay.includes("ai") || hay.includes("deep");
  }
  if (needle.includes("consumer")) return hay.includes("consumer") || hay.includes("sports");
  return hay.includes(needle);
}

function companyMatchesOnboardingStage(company: PortfolioCompany, cohort: PortfolioCohortStage): boolean {
  const stage = company.stage.toLowerCase();
  if (cohort === "Growth") return stage.includes("growth") || stage.includes("series c") || stage === "ipo";
  return stage === cohort.toLowerCase();
}

function thesisPortfolioRow(
  id: string,
  name: string,
  cohort: PortfolioCohortStage,
  meta: string,
  companies: PortfolioCompany[],
): PortfolioListRow {
  const chips = companies.slice(0, PORTFOLIO_LIST_LOGO_VISIBLE).map(portfolioCompanyToChip);
  return {
    id,
    name,
    meta,
    cohort,
    companyCount: companies.length,
    companies: chips,
    companyIds: companies.map(company => company.id),
    ownerName: "You",
    ownerEmail: "",
    ownerKind: "mine",
    scope: "Account",
    updatedAt: "Just now",
    digest: "Off",
    starred: true,
  };
}

/** Portfolio prepared from the investor's onboarding thesis for immediate review. */
export function buildOnboardingPortfolioRow(input: OnboardingPortfolioInput): PortfolioListRow {
  const fundSlug = onboardingFundSlug(input.fundName);
  const meta = [
    ...(input.sectors ?? []).slice(0, 2),
    ...(input.geography ?? []).slice(0, 1),
  ].filter((value): value is string => Boolean(value?.trim())).join(" · ");

  return {
    id: `pf-onboarding-${fundSlug}`,
    name: onboardingPortfolioName(input.fundName),
    meta,
    cohort: onboardingPortfolioCohort(input.stages),
    companyCount: SEED_FUND_EXTENDED_PORTFOLIO.length,
    companies: SEED_FUND_PORTFOLIO_CHIPS.slice(0, PORTFOLIO_LIST_LOGO_VISIBLE),
    companyIds: SEED_FUND_COMPANY_IDS,
    ownerName: "You",
    ownerEmail: "",
    ownerKind: "mine",
    scope: "Account",
    updatedAt: "Just now",
    digest: "Off",
    starred: true,
  };
}

/** Fund portfolio plus stage and sector lists from the investor's onboarding answers. */
export function buildOnboardingPortfolioRows(input: OnboardingPortfolioInput): PortfolioListRow[] {
  const fundSlug = onboardingFundSlug(input.fundName);
  const fundLabel = input.fundName.trim() || "My fund";
  const rows = [buildOnboardingPortfolioRow(input)];
  const pool = SEED_FUND_EXTENDED_PORTFOLIO;

  for (const cohort of onboardingStageCohorts(input.stages)) {
    const companies = pool.filter(company => companyMatchesOnboardingStage(company, cohort));
    if (companies.length === 0) continue;
    rows.push(thesisPortfolioRow(
      `pf-onboarding-${fundSlug}-stage-${cohort.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      `${fundLabel} · ${cohort}`,
      cohort,
      cohort,
      companies,
    ));
  }

  for (const sector of input.sectors ?? []) {
    const label = sector.trim();
    if (!label) continue;
    const companies = pool.filter(company => companyMatchesOnboardingSector(company, label));
    if (companies.length === 0) continue;
    rows.push(thesisPortfolioRow(
      `pf-onboarding-${fundSlug}-sector-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      `${fundLabel} · ${label}`,
      onboardingPortfolioCohort(input.stages),
      label,
      companies,
    ));
  }

  const seen = new Set<string>();
  return rows.filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export function buildInitialPortfolioLists(): PortfolioListRow[] {
  return [
    {
      id: "pf-personal",
      name: "Shreya Gokani",
      meta: "",
      cohort: "Seed",
      companyCount: 1,
      companies: [
        portfolioCompanyToChip(INVESTOR_PORTFOLIO[0]!),
      ],
      companyIds: ["patriotpay"],
      ownerName: "shreya.g",
      ownerEmail: "shreya.g@york.ie",
      ownerKind: "mine",
      scope: "Account",
      updatedAt: "1mo ago",
      digest: "Off",
      starred: false,
    },
    buildSeedFundPortfolioRow(),
  ];
}

export type PortfolioListRow = {
  id: string;
  name: string;
  meta: string;
  cohort: PortfolioCohortStage;
  companyCount: number;
  companies: WatchlistCompanyChip[];
  companyIds: string[];
  ownerName: string;
  ownerEmail: string;
  ownerKind: PortfolioListOwnerKind;
  scope: PortfolioListScope;
  updatedAt: string;
  digest: PortfolioListDigest;
  starred: boolean;
};

/** Fund / category portfolios — create the bucket first, then add companies. */
export const INVESTOR_PORTFOLIO_LISTS: PortfolioListRow[] = buildInitialPortfolioLists();

export function companiesForPortfolioList(
  list: PortfolioListRow,
  portfolio: PortfolioCompany[] = INVESTOR_PORTFOLIO,
): PortfolioCompany[] {
  if (list.id === "pf-seed-fund") {
    return SEED_FUND_EXTENDED_PORTFOLIO;
  }

  const byId = new Map(
    [...portfolio, ...SEED_FUND_EXTENDED_PORTFOLIO].map(company => [company.id, company]),
  );
  const ids = list.companyIds.length > 0 ? list.companyIds : portfolio.map(company => company.id);
  return ids
    .map(id => byId.get(id))
    .filter((company): company is PortfolioCompany => Boolean(company));
}

export function normalizePortfolioListRow(row: PortfolioListRow): PortfolioListRow {
  if (row.id === "pf-seed-fund") {
    return buildSeedFundPortfolioRow();
  }
  return row;
}

export type PortfolioBenchmarkDot = {
  id: string;
  name: string;
  /** 0–100 position on the cohort axis */
  position: number;
  /** Performance score 0–100 where higher is always better */
  score: number;
  color: string;
};

export type PortfolioBenchmarkMetric = {
  id: string;
  label: string;
  hint: string | null;
  sampleSize: number;
  cohortP50Label: string;
  portfolioLabel: string;
  /** Approximate cohort min / max shown on the performance axis */
  axisMinLabel: string;
  axisMaxLabel: string;
  /** Portfolio median marker 0–100 */
  portfolioPosition: number;
  /** Green cohort band on the track (P25–P90 style) */
  bandStart: number;
  bandEnd: number;
  lowerIsBetter: boolean;
  /** Trend vs prior period */
  trend: "up" | "down" | "flat";
  /** Whether portfolio median is above cohort P75 */
  isLeader: boolean;
  dots: PortfolioBenchmarkDot[];
  /** Actual portfolio companies, plotted from dummy per-company benchmark numbers. */
  portfolioDots: PortfolioBenchmarkDot[];
};

export type PortfolioBenchmarkSummary = {
  filterLabel: string;
  leadersCount: number;
  leadersDenom: number;
  topPerformer: string;
  topPerformerBenchmarks: number;
  totalQuartiles: number;
  metrics: PortfolioBenchmarkMetric[];
};

/** Green when above / over; watch when mid; bad when low. Three colors only. */
export function colorForBenchmarkScore(score: number): string {
  if (score >= 55) return "var(--status-good, #12b886)";
  if (score >= 35) return "var(--status-watch, #f5a623)";
  return "var(--status-bad, #e05c5c)";
}

function seededUnit(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

function parseUsdCompact(label: string): number {
  const trimmed = label.replace(/[$,\s]/g, "");
  const million = trimmed.match(/^([\d.]+)M$/i);
  if (million) return parseFloat(million[1]!) * 1_000_000;
  const thousand = trimmed.match(/^([\d.]+)K$/i);
  if (thousand) return parseFloat(thousand[1]!) * 1_000;
  const raw = parseFloat(trimmed);
  return Number.isFinite(raw) ? raw : 0;
}

function parseHeadcountBand(employees: string): number {
  if (employees.includes("1-10")) return 7;
  if (employees.includes("11-50")) return 24;
  if (employees.includes("51-200")) return 90;
  if (employees.includes("201")) return 280;
  const parsed = parseInt(employees, 10);
  return Number.isFinite(parsed) ? parsed : 18;
}

function medianNumber(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function valueToAxisPosition(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.min(96, Math.max(4, ((value - min) / (max - min)) * 100));
}

function scoreFromPosition(position: number, lowerIsBetter: boolean): number {
  return lowerIsBetter ? 100 - position : position;
}

type BenchmarkUnit = "x" | "mo" | "pct" | "usd" | "count";

function formatBenchmarkNumber(value: number, unit: BenchmarkUnit): string {
  if (unit === "x") return `${value.toFixed(1)}x`;
  if (unit === "mo") return `${Math.round(value)} mo`;
  if (unit === "pct") return `${Math.round(value)}%`;
  if (unit === "count") return `${Math.round(value)}`;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  if (abs >= 1_000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

/** Dummy cohort percentiles — stand-in until live benchmark data is wired. */
const PORTFOLIO_BENCHMARK_DEFS: Array<{
  id: string;
  label: string;
  hint: string | null;
  unit: BenchmarkUnit;
  min: number;
  max: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  lowerIsBetter: boolean;
}> = [
  { id: "burn", label: "Burn multiple", hint: "lower is better", unit: "x", min: 0.8, max: 5.0, p25: 1.3, p50: 2.1, p75: 3.4, p90: 4.6, lowerIsBetter: true },
  { id: "cac", label: "CAC payback", hint: "lower is better", unit: "mo", min: 6, max: 36, p25: 10, p50: 16, p75: 26, p90: 34, lowerIsBetter: true },
  { id: "gm", label: "Gross margin", hint: null, unit: "pct", min: 45, max: 92, p25: 62, p50: 72, p75: 82, p90: 88, lowerIsBetter: false },
  { id: "r40", label: "Rule of 40", hint: null, unit: "count", min: 5, max: 65, p25: 18, p50: 28, p75: 40, p90: 55, lowerIsBetter: false },
  { id: "cash", label: "Cash on hand", hint: null, unit: "usd", min: 200_000, max: 8_000_000, p25: 800_000, p50: 1_500_000, p75: 3_200_000, p90: 6_000_000, lowerIsBetter: false },
  { id: "burnUsd", label: "Monthly burn", hint: "lower is better", unit: "usd", min: 25_000, max: 250_000, p25: 45_000, p50: 80_000, p75: 140_000, p90: 210_000, lowerIsBetter: true },
  { id: "arr", label: "ARR", hint: null, unit: "usd", min: 50_000, max: 5_000_000, p25: 180_000, p50: 500_000, p75: 1_200_000, p90: 2_500_000, lowerIsBetter: false },
  { id: "arrGrowth", label: "ARR growth YoY", hint: null, unit: "pct", min: 20, max: 400, p25: 80, p50: 180, p75: 260, p90: 340, lowerIsBetter: false },
  { id: "customers", label: "Paid customers", hint: null, unit: "count", min: 5, max: 250, p25: 18, p50: 40, p75: 90, p90: 160, lowerIsBetter: false },
  { id: "logo", label: "Logo retention", hint: null, unit: "pct", min: 60, max: 99, p25: 78, p50: 88, p75: 93, p90: 97, lowerIsBetter: false },
  { id: "nrr", label: "Net revenue retention", hint: null, unit: "pct", min: 75, max: 140, p25: 95, p50: 108, p75: 118, p90: 130, lowerIsBetter: false },
  { id: "fte", label: "Headcount (FTE)", hint: null, unit: "count", min: 3, max: 80, p25: 8, p50: 12, p75: 28, p90: 48, lowerIsBetter: false },
];

type DummyBenchmarkDef = (typeof PORTFOLIO_BENCHMARK_DEFS)[number];

function cohortUsdFactor(cohort: PortfolioCohortStage): number {
  switch (cohort) {
    case "Pre-seed": return 0.28;
    case "Seed": return 0.55;
    case "Series A": return 1;
    case "Series B": return 2.3;
    case "Series C": return 4.8;
    case "Growth": return 8;
  }
}

function enforceIncreasing(values: number[]): number[] {
  const next = [...values];
  for (let index = 1; index < next.length; index += 1) {
    next[index] = Math.max(next[index]!, next[index - 1]! * 1.04 + 0.01);
  }
  return next;
}

/** Dummy cohort table shifted by list stage so Seed vs Series A graphs are not identical. */
function dummyCohortBenchmarksForList(def: DummyBenchmarkDef, list: PortfolioListRow): DummyBenchmarkDef {
  const jitter = 0.94 + seededUnit(`${list.id}:${def.id}:p`) * 0.12;
  const usd = cohortUsdFactor(list.cohort) * jitter;
  let min = def.min;
  let p25 = def.p25;
  let p50 = def.p50;
  let p75 = def.p75;
  let p90 = def.p90;
  let max = def.max;

  if (def.unit === "usd") {
    min *= usd;
    p25 *= usd;
    p50 *= usd;
    p75 *= usd;
    p90 *= usd;
    max *= usd;
  } else if (def.unit === "count") {
    const factor = Math.sqrt(usd) * jitter;
    min *= factor;
    p25 *= factor;
    p50 *= factor;
    p75 *= factor;
    p90 *= factor;
    max *= factor;
  } else if (def.unit === "pct") {
    const delta = def.id === "arrGrowth" ? (1 - usd) * 22 : (usd - 1) * 6;
    min += delta * 0.35;
    p25 += delta * 0.55;
    p50 += delta;
    p75 += delta * 0.75;
    p90 += delta * 0.45;
    max += delta * 0.25;
  } else if (def.unit === "x") {
    const factor = 1.18 / Math.max(0.55, Math.sqrt(usd));
    min *= factor;
    p25 *= factor;
    p50 *= factor;
    p75 *= factor;
    p90 *= factor;
    max *= factor;
  } else {
    const factor = 0.86 + Math.log2(Math.max(1, usd)) * 0.16;
    min *= factor;
    p25 *= factor;
    p50 *= factor;
    p75 *= factor;
    p90 *= factor;
    max *= factor;
  }

  const ordered = enforceIncreasing([min, p25, p50, p75, p90, max]);
  return {
    ...def,
    min: ordered[0]!,
    p25: ordered[1]!,
    p50: ordered[2]!,
    p75: ordered[3]!,
    p90: ordered[4]!,
    max: ordered[5]!,
  };
}

/** Dummy operating metrics for a company — derived from known fields plus a stable seed. */
export function dummyCompanyBenchmarkValues(company: PortfolioCompany): Record<string, number> {
  const roll = (key: string) => seededUnit(`${company.id}:${key}`);
  const arr = parseUsdCompact(company.arr) || 500_000;
  const healthDrag = company.health === "struggling" ? 0.22 : company.health === "watch" ? 0.08 : 0;
  const burn = Math.round((1.05 + roll("burn") * 2.2 + healthDrag * 1.4) * 10) / 10;
  const cac = Math.round(8 + roll("cac") * 20 + healthDrag * 8);
  const gm = Math.round(58 + roll("gm") * 26 - healthDrag * 10);
  const arrGrowth = Math.max(12, Math.round(90 + company.arrGrowthQoQ * 3.4 + roll("growth") * 50));
  const r40 = Math.round(arrGrowth * 0.22 + gm * 0.35 - 12);
  const burnUsd = Math.round(32_000 + roll("mburn") * 150_000 + (arr / 40));
  const cash = Math.round(burnUsd * Math.max(4, company.runwayMonths) * (0.85 + roll("cash") * 0.4));
  const customers = Math.max(6, Math.round(arr / 22_000 + roll("cust") * 18));
  const logo = Math.min(99, Math.max(62, Math.round(company.nrr * 0.76 + roll("logo") * 10)));
  const nrr = company.nrr;
  const fte = Math.max(3, Math.round(parseHeadcountBand(company.employees) + (roll("fte") - 0.5) * 8));
  return {
    burn,
    cac,
    gm,
    r40,
    cash,
    burnUsd,
    arr,
    arrGrowth,
    customers,
    logo,
    nrr,
    fte,
  };
}

function makeValueDot(
  company: PortfolioCompany,
  value: number,
  min: number,
  max: number,
  lowerIsBetter: boolean,
): PortfolioBenchmarkDot {
  const position = valueToAxisPosition(value, min, max);
  const score = scoreFromPosition(position, lowerIsBetter);
  return {
    id: company.id,
    name: company.displayName,
    position,
    score,
    color: colorForBenchmarkScore(score),
  };
}

function makeBenchmarkDot(
  id: string,
  name: string,
  seed: string,
  lowerIsBetter: boolean,
  bandStart: number,
  bandEnd: number,
): PortfolioBenchmarkDot {
  const roll = seededUnit(seed);
  const position = Math.round(
    roll < 0.12
      ? 4 + seededUnit(`${seed}-lo`) * Math.max(8, bandStart - 4)
      : roll > 0.88
        ? bandEnd + seededUnit(`${seed}-hi`) * Math.max(6, 96 - bandEnd)
        : bandStart + seededUnit(`${seed}-mid`) * Math.max(8, bandEnd - bandStart),
  );
  const clamped = Math.min(96, Math.max(4, position));
  const score = lowerIsBetter ? 100 - clamped : clamped;
  return {
    id,
    name,
    position: clamped,
    score,
    color: colorForBenchmarkScore(score),
  };
}

function buildDotsForMetric(
  metricId: string,
  companies: PortfolioCompany[],
  lowerIsBetter: boolean,
  min: number,
  max: number,
): PortfolioBenchmarkDot[] {
  return companies.map(company => makeValueDot(
    company,
    dummyCompanyBenchmarkValues(company)[metricId] ?? min,
    min,
    max,
    lowerIsBetter,
  ));
}

/** Portfolio-company dots for a single metric (used in the company list drawer). */
export function buildBenchmarkDotsForCompanies(
  metricId: string,
  companies: PortfolioCompany[],
  lowerIsBetter: boolean,
  bandStart: number,
  bandEnd: number,
): PortfolioBenchmarkDot[] {
  const def = PORTFOLIO_BENCHMARK_DEFS.find(item => item.id === metricId);
  if (def) return buildDotsForMetric(metricId, companies, def.lowerIsBetter, def.min, def.max);
  return companies.map(company => makeBenchmarkDot(
    company.id,
    company.displayName,
    `${metricId}-${company.id}`,
    lowerIsBetter,
    bandStart,
    bandEnd,
  ));
}

/** Synthetic cohort for large-n preview — sample the curve, keep labeled n at the full size. */
export function buildSyntheticBenchmarkDots(
  metricId: string,
  count: number,
  lowerIsBetter: boolean,
  bandStart: number,
  bandEnd: number,
): PortfolioBenchmarkDot[] {
  const safeCount = Math.max(1, Math.min(100_000, Math.round(count)));
  const renderCount = Math.min(2_400, safeCount);
  return Array.from({ length: renderCount }, (_, index) => makeBenchmarkDot(
    `cohort-${metricId}-${index}`,
    `Cohort co. ${index + 1}`,
    `${metricId}-synthetic-${index}`,
    lowerIsBetter,
    bandStart,
    bandEnd,
  ));
}

export type BenchmarkCohortScale = "portfolio" | "full" | "xlarge" | "percentile";

/** Synthetic cohort sizes for benchmark view dropdown (portfolio uses actual company count). */
export const BENCHMARK_COHORT_SAMPLE_SIZES: Record<"full" | "xlarge", number> = {
  full: 10_000,
  xlarge: 100_000,
};

/** Cohort size used when the percentile table view is selected. */
export const BENCHMARK_PERCENTILE_VIEW_SAMPLE_SIZE = 100;

function benchmarkCohortSampleSize(scale: BenchmarkCohortScale, portfolioCount: number): number {
  if (scale === "portfolio") return portfolioCount;
  if (scale === "percentile") return BENCHMARK_PERCENTILE_VIEW_SAMPLE_SIZE;
  return BENCHMARK_COHORT_SAMPLE_SIZES[scale];
}

export function buildPortfolioBenchmarkSummary(
  list: PortfolioListRow,
  portfolio: PortfolioCompany[] = INVESTOR_PORTFOLIO,
  options?: { cohortScale?: BenchmarkCohortScale },
): PortfolioBenchmarkSummary {
  const companies = companiesForPortfolioList(list, portfolio);
  const portfolioCount = Math.max(1, companies.length);
  const cohortScale = options?.cohortScale ?? "portfolio";
  const sampleSize = benchmarkCohortSampleSize(cohortScale, portfolioCount);
  const valueCache = new Map(companies.map(company => [company.id, dummyCompanyBenchmarkValues(company)]));

  const metrics: PortfolioBenchmarkMetric[] = PORTFOLIO_BENCHMARK_DEFS.map(rawDef => {
    const def = dummyCohortBenchmarksForList(rawDef, list);
    const values = companies.map(company => valueCache.get(company.id)?.[def.id] ?? def.p50);
    const portfolioMedian = medianNumber(values);
    const axisMin = Math.min(def.min, portfolioMedian, ...values);
    const axisMax = Math.max(def.max, portfolioMedian, ...values);
    const portfolioPosition = valueToAxisPosition(portfolioMedian, axisMin, axisMax);
    const bandStart = valueToAxisPosition(def.p25, axisMin, axisMax);
    const bandEnd = valueToAxisPosition(def.p90, axisMin, axisMax);
    const beatsP50 = def.lowerIsBetter ? portfolioMedian < def.p50 : portfolioMedian > def.p50;
    const nearP50 = Math.abs(portfolioMedian - def.p50) / Math.max(1, Math.abs(def.p50)) < 0.04;
    const isLeader = def.lowerIsBetter ? portfolioMedian <= def.p25 : portfolioMedian >= def.p75;
    const portfolioDots = companies.map(company => makeValueDot(
      company,
      valueCache.get(company.id)?.[def.id] ?? def.p50,
      axisMin,
      axisMax,
      def.lowerIsBetter,
    ));
    const dots = portfolioDots;
    return {
      id: def.id,
      label: def.label,
      hint: def.hint,
      sampleSize,
      cohortP50Label: formatBenchmarkNumber(def.p50, def.unit),
      portfolioLabel: formatBenchmarkNumber(portfolioMedian, def.unit),
      axisMinLabel: formatBenchmarkNumber(axisMin, def.unit),
      axisMaxLabel: formatBenchmarkNumber(axisMax, def.unit),
      portfolioPosition,
      bandStart,
      bandEnd,
      lowerIsBetter: def.lowerIsBetter,
      trend: nearP50 ? "flat" : beatsP50 ? (def.lowerIsBetter ? "down" : "up") : (def.lowerIsBetter ? "up" : "down"),
      isLeader,
      dots,
      portfolioDots,
    };
  });

  const winCounts = new Map<string, number>();
  for (const metric of metrics) {
    if (metric.portfolioDots.length === 0) continue;
    const leader = metric.portfolioDots.reduce((best, dot) => (dot.score > best.score ? dot : best));
    winCounts.set(leader.id, (winCounts.get(leader.id) ?? 0) + 1);
  }
  let topId = companies[0]?.id ?? "";
  let topWins = 0;
  for (const [id, count] of winCounts) {
    if (count > topWins) {
      topWins = count;
      topId = id;
    }
  }
  const topCompany = companies.find(company => company.id === topId) ?? companies[0];
  const sectorTag = list.meta.split("·").map(part => part.trim()).find(Boolean) || "B2B SaaS";
  const filterSample = cohortScale === "portfolio" ? Math.max(portfolioCount, 3) : sampleSize;

  return {
    filterLabel: `${sectorTag} · ${list.cohort} · US · n=${filterSample}`,
    leadersCount: metrics.filter(metric => metric.isLeader).length,
    leadersDenom: metrics.length,
    topPerformer: topCompany?.displayName ?? "—",
    topPerformerBenchmarks: topWins,
    totalQuartiles: 16,
    metrics,
  };
}

/** Biweekly thesis digest — new matches surfaced this cycle. */
export const THESIS_DIGEST = {
  cadenceLabel: "Every 2 weeks",
  periodLabel: "Jun 30 – Jul 13",
  headline: "New thesis matches this fortnight",
  lede: "Fuel scored these companies against your check size, sectors, and portfolio overlap. Review the why, then add keepers to a watchlist.",
  companyIds: ["patriotpay", "ledgerly", "winrate"] as string[],
};

export function formatSuggestionScore(score: number): string {
  return `${(score / 10).toFixed(1)} / 10`;
}

export function getPortfolioRedFlags(company: PortfolioCompany): PortfolioRedFlag[] {
  const flags: PortfolioRedFlag[] = [];
  if (company.runwayMonths < 6) {
    flags.push({ kind: "runway", label: `Runway under 6 months (${company.runway})` });
  }
  if (company.arrGrowthQoQ < -30) {
    flags.push({
      kind: "arr_decline",
      label: `ARR growth declined ${Math.abs(company.arrGrowthQoQ)}% QoQ`,
    });
  }
  if (company.nrr < 90) {
    flags.push({ kind: "nrr", label: `NRR dropped below 90% (${company.nrr}%)` });
  }
  if (company.daysSinceBenchmark > 90) {
    flags.push({
      kind: "stale_benchmark",
      label: `No benchmark update in ${company.daysSinceBenchmark} days`,
    });
  }
  return flags;
}

/** ARR growth QoQ → arrow: ≥5% up, ≤−5% down, otherwise flat. */
export function movementFromArrGrowth(arrGrowthQoQ: number): QoqMovement {
  if (arrGrowthQoQ >= 5) return "up";
  if (arrGrowthQoQ <= -5) return "down";
  return "flat";
}

export function buildPortfolioCompanyView(company: PortfolioCompany): PortfolioCompanyView {
  const redFlags = getPortfolioRedFlags(company);
  return {
    ...company,
    moic: company.investedAmount > 0 ? company.estimatedValue / company.investedAmount : 0,
    qoqMovement: movementFromArrGrowth(company.arrGrowthQoQ),
    redFlags,
    urgentFlag: redFlags[0] ?? null,
  };
}

export function buildPortfolioFundTotals(portfolio: PortfolioCompany[]): PortfolioFundTotals {
  const views = portfolio.map(buildPortfolioCompanyView);
  const totalInvested = views.reduce((sum, company) => sum + company.investedAmount, 0);
  const estimatedValue = views.reduce((sum, company) => sum + company.estimatedValue, 0);
  return {
    totalInvested,
    estimatedValue,
    blendedMoic: totalInvested > 0 ? estimatedValue / totalInvested : 0,
    activeCompanies: views.length,
    redFlagCompanies: views.filter(company => company.redFlags.length > 0).length,
  };
}

export function rankPortfolioCompanies(portfolio: PortfolioCompany[]): PortfolioCompanyView[] {
  return portfolio
    .map(buildPortfolioCompanyView)
    .sort((left, right) => right.moic - left.moic);
}

export function buildSectorAllocation(portfolio: PortfolioCompany[]): SectorAllocationSlice[] {
  const bySector = new Map<string, number>();
  for (const company of portfolio) {
    bySector.set(company.sector, (bySector.get(company.sector) ?? 0) + company.investedAmount);
  }
  const total = [...bySector.values()].reduce((sum, amount) => sum + amount, 0);
  return [...bySector.entries()]
    .map(([sector, investedAmount]) => ({
      sector,
      investedAmount,
      share: total > 0 ? investedAmount / total : 0,
      color: "",
    }))
    .sort((left, right) => right.investedAmount - left.investedAmount)
    .map((slice, index) => ({
      ...slice,
      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
    }));
}

/** Map HQ string → state or country for demographic charts. */
export function regionFromHeadquarters(headquarters: string): string {
  const stateNames: Record<string, string> = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
    MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
    OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    DC: "Washington, D.C.",
  };
  const stateMatch = headquarters.match(/,\s*([A-Z]{2})\s*,/);
  if (stateMatch && stateNames[stateMatch[1]]) return stateNames[stateMatch[1]];

  const lower = headquarters.toLowerCase();
  if (/canada|toronto|vancouver|montreal/.test(lower)) return "Canada";
  if (/uk|london/.test(lower)) return "United Kingdom";
  if (/germany|berlin/.test(lower)) return "Germany";
  if (/france|paris/.test(lower)) return "France";
  if (/india|bangalore|mumbai/.test(lower)) return "India";
  if (/,?\s*us\s*$/i.test(headquarters) || /\bunited states\b/.test(lower)) return "United States";
  return headquarters.split(",")[0]?.trim() || "Other";
}

export function buildDemographicAllocation(portfolio: PortfolioCompany[]): DemographicAllocationSlice[] {
  const byRegion = new Map<string, { investedAmount: number; companyCount: number }>();
  for (const company of portfolio) {
    const region = regionFromHeadquarters(company.headquarters);
    const current = byRegion.get(region) ?? { investedAmount: 0, companyCount: 0 };
    byRegion.set(region, {
      investedAmount: current.investedAmount + company.investedAmount,
      companyCount: current.companyCount + 1,
    });
  }
  const total = [...byRegion.values()].reduce((sum, entry) => sum + entry.investedAmount, 0);
  return [...byRegion.entries()]
    .map(([region, entry]) => ({
      region,
      investedAmount: entry.investedAmount,
      companyCount: entry.companyCount,
      share: total > 0 ? entry.investedAmount / total : 0,
      color: "",
    }))
    .sort((left, right) => right.investedAmount - left.investedAmount)
    .map((slice, index) => ({
      ...slice,
      color: DEMOGRAPHIC_COLORS[index % DEMOGRAPHIC_COLORS.length],
    }));
}

export function formatUsdCompact(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function dealsForBoard(boardId: PipelineBoardId): PipelineDeal[] {
  return INVESTOR_PIPELINE.filter(deal => deal.boardId === boardId);
}

export function summarizePipeline(deals: PipelineDeal[]) {
  const totalValue = deals.reduce((sum, deal) => sum + deal.amountValue, 0);
  return {
    dealCount: deals.length,
    totalValue,
    totalLabel: formatUsdCompact(totalValue),
    syncedLabel: "synced 47m ago",
  };
}

export function stageDealTotal(deals: PipelineDeal[]): string | null {
  const total = deals.reduce((sum, deal) => sum + deal.amountValue, 0);
  if (total <= 0) return null;
  return formatUsdCompact(total);
}

export function formatMoic(value: number): string {
  return `${value.toFixed(1)}x`;
}

export function formatGrowthRate(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

export function buildInvestorFundSummary(portfolio: PortfolioCompany[]) {
  const totals = buildPortfolioFundTotals(portfolio);
  const ranked = rankPortfolioCompanies(portfolio);
  const top = ranked[0];
  const flagged = ranked.filter(company => company.redFlags.length > 0);

  return {
    headline: `${totals.activeCompanies} active companies · ${formatMoic(totals.blendedMoic)} blended MOIC`,
    lede: flagged.length
      ? `${flagged.length} compan${flagged.length === 1 ? "y needs" : "ies need"} attention — ${flagged.map(c => c.displayName).join(", ")}. ${top ? `${top.displayName} leads on MOIC at ${formatMoic(top.moic)}.` : ""}`.trim()
      : top
        ? `Portfolio is clear of red flags. ${top.displayName} leads on MOIC at ${formatMoic(top.moic)}.`
        : "No portfolio companies yet.",
    totals,
    ranked,
    flagged,
  };
}

export function investorCompanyToSelected(company: InvestorCompanyRef) {
  return {
    id: company.id,
    name: company.name,
    displayName: company.displayName,
    domain: company.domain,
    logo: company.logo,
    logoBg: company.logoBg,
    logoUrl: resolveCompanyLogoUrl(company),
    meta: company.meta,
    headquarters: company.headquarters,
    employees: company.employees,
    linkedin: company.linkedin,
    onFuel: company.onFuel,
  };
}
