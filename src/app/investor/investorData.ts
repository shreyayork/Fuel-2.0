export type InvestorCompanyRef = {
  id: string;
  name: string;
  displayName: string;
  domain: string;
  logo: string;
  logoBg: string;
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

const SECTOR_COLORS = ["#00B48A", "#4A90B8", "#C9A227", "#8FA99A", "#C98A8A"];
const DEMOGRAPHIC_COLORS = ["#00B48A", "#4A90B8", "#C9A227", "#8FA99A", "#C98A8A"];

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

export const INVESTOR_PORTFOLIO: PortfolioCompany[] = [
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

export type WatchlistScope = "Account" | "Personal";
export type WatchlistOwnerKind = "mine" | "shared";

export type WatchlistCompanyChip = {
  logo: string;
  logoBg: string;
  name: string;
};

export type WatchlistRow = {
  id: string;
  name: string;
  companyCount: number;
  companies: WatchlistCompanyChip[];
  ownerName: string;
  ownerEmail: string;
  ownerKind: WatchlistOwnerKind;
  scope: WatchlistScope;
  updatedAt: string;
  digest: "Off" | "Weekly" | "Daily";
  starred: boolean;
};

export const INVESTOR_WATCHLISTS: WatchlistRow[] = [
  {
    id: "wl-swiggy",
    name: "swiggy",
    companyCount: 0,
    companies: [],
    ownerName: "bhavik.s",
    ownerEmail: "bhavik.s@york.ie",
    ownerKind: "shared",
    scope: "Account",
    updatedAt: "25d ago",
    digest: "Off",
    starred: false,
  },
  {
    id: "wl-ge-partners",
    name: "GE Partners",
    companyCount: 12,
    companies: [
      { logo: "P", logoBg: "#1E4D8C", name: "Patriot Pay" },
      { logo: "O", logoBg: "#5B3A8C", name: "Operator AI" },
      { logo: "L", logoBg: "#2A5C8C", name: "Ledgerly" },
      { logo: "N", logoBg: "#6B3A8C", name: "Nova Health" },
    ],
    ownerName: "bhavik.s",
    ownerEmail: "bhavik.s@york.ie",
    ownerKind: "shared",
    scope: "Account",
    updatedAt: "25d ago",
    digest: "Off",
    starred: false,
  },
];

export type PortfolioListScope = "Account" | "Personal";
export type PortfolioListOwnerKind = "mine" | "shared";
export type PortfolioListDigest = "Off" | "Weekly" | "Daily";

export type PortfolioListRow = {
  id: string;
  name: string;
  meta: string;
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
export const INVESTOR_PORTFOLIO_LISTS: PortfolioListRow[] = [
  {
    id: "pf-personal",
    name: "Shreya Gokani",
    meta: "portfolio",
    companyCount: 1,
    companies: [
      { logo: "PI", logoBg: "#1E4D8C", name: "Pirimid Fintech" },
    ],
    companyIds: ["patriotpay"],
    ownerName: "You",
    ownerEmail: "",
    ownerKind: "mine",
    scope: "Account",
    updatedAt: "28d ago",
    digest: "Off",
    starred: false,
  },
  {
    id: "pf-seed-fund",
    name: "Seed Fund",
    meta: "portfolio · Seed Fund",
    companyCount: 3,
    companies: [
      { logo: "P", logoBg: "#1E4D8C", name: "Patriot Pay" },
      { logo: "O", logoBg: "#5B3A8C", name: "Operator AI" },
      { logo: "S", logoBg: "#8C5B3A", name: "Sync Sports" },
    ],
    companyIds: ["patriotpay", "operator-ai", "sync-sports"],
    ownerName: "mike",
    ownerEmail: "mike@york.ie",
    ownerKind: "shared",
    scope: "Account",
    updatedAt: "1mo ago",
    digest: "Off",
    starred: false,
  },
];

export function companiesForPortfolioList(
  list: PortfolioListRow,
  portfolio: PortfolioCompany[] = INVESTOR_PORTFOLIO,
): PortfolioCompany[] {
  const byId = new Map(portfolio.map(company => [company.id, company]));
  return list.companyIds
    .map(id => byId.get(id))
    .filter((company): company is PortfolioCompany => Boolean(company));
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

/** Green when above / over; yellow → orange → red when below. */
export function colorForBenchmarkScore(score: number): string {
  if (score >= 65) return "#00B48A";
  if (score >= 50) return "#2BB8A0";
  if (score >= 40) return "#D4A86A";
  if (score >= 25) return "#E8923A";
  return "#CF6B6B";
}

function seededUnit(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

function buildDotsForMetric(
  metricId: string,
  companies: PortfolioCompany[],
  lowerIsBetter: boolean,
  bandStart: number,
  bandEnd: number,
): PortfolioBenchmarkDot[] {
  const makeDot = (id: string, name: string, seed: string): PortfolioBenchmarkDot => {
    // Bias dots into / near the cohort band, with some outliers.
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
  };

  return companies.map(company => makeDot(company.id, company.displayName, `${metricId}-${company.id}`));
}

const PORTFOLIO_BENCHMARK_DEFS: Array<{
  id: string;
  label: string;
  hint: string | null;
  cohortP50Label: string;
  portfolioLabel: string;
  portfolioPosition: number;
  bandStart: number;
  bandEnd: number;
  lowerIsBetter: boolean;
  trend: "up" | "down" | "flat";
  isLeader: boolean;
}> = [
  { id: "burn", label: "Burn multiple", hint: "lower is better", cohortP50Label: "2.1x", portfolioLabel: "1.6x", portfolioPosition: 28, bandStart: 18, bandEnd: 58, lowerIsBetter: true, trend: "down", isLeader: true },
  { id: "cac", label: "CAC payback", hint: "lower is better", cohortP50Label: "16 mo", portfolioLabel: "11 mo", portfolioPosition: 32, bandStart: 20, bandEnd: 62, lowerIsBetter: true, trend: "down", isLeader: true },
  { id: "gm", label: "Gross margin", hint: null, cohortP50Label: "72%", portfolioLabel: "78%", portfolioPosition: 68, bandStart: 48, bandEnd: 88, lowerIsBetter: false, trend: "up", isLeader: true },
  { id: "r40", label: "Rule of 40", hint: null, cohortP50Label: "28", portfolioLabel: "41", portfolioPosition: 72, bandStart: 30, bandEnd: 78, lowerIsBetter: false, trend: "up", isLeader: true },
  { id: "cash", label: "Cash on hand", hint: null, cohortP50Label: "$1.5M", portfolioLabel: "$2.1M", portfolioPosition: 58, bandStart: 22, bandEnd: 55, lowerIsBetter: false, trend: "up", isLeader: false },
  { id: "burnUsd", label: "Monthly burn", hint: "lower is better", cohortP50Label: "$80K", portfolioLabel: "$64K", portfolioPosition: 36, bandStart: 16, bandEnd: 56, lowerIsBetter: true, trend: "flat", isLeader: false },
  { id: "arr", label: "ARR", hint: null, cohortP50Label: "$500K", portfolioLabel: "$890K", portfolioPosition: 62, bandStart: 10, bandEnd: 52, lowerIsBetter: false, trend: "up", isLeader: false },
  { id: "arrGrowth", label: "ARR growth YoY", hint: null, cohortP50Label: "180%", portfolioLabel: "210%", portfolioPosition: 56, bandStart: 22, bandEnd: 62, lowerIsBetter: false, trend: "up", isLeader: false },
  { id: "customers", label: "Paid customers", hint: null, cohortP50Label: "40", portfolioLabel: "62", portfolioPosition: 48, bandStart: 8, bandEnd: 42, lowerIsBetter: false, trend: "up", isLeader: false },
  { id: "logo", label: "Logo retention", hint: null, cohortP50Label: "88%", portfolioLabel: "91%", portfolioPosition: 70, bandStart: 58, bandEnd: 92, lowerIsBetter: false, trend: "flat", isLeader: false },
  { id: "nrr", label: "Net revenue retention", hint: null, cohortP50Label: "108%", portfolioLabel: "114%", portfolioPosition: 64, bandStart: 50, bandEnd: 84, lowerIsBetter: false, trend: "up", isLeader: false },
  { id: "fte", label: "Headcount (FTE)", hint: null, cohortP50Label: "12", portfolioLabel: "18", portfolioPosition: 52, bandStart: 18, bandEnd: 58, lowerIsBetter: false, trend: "up", isLeader: false },
];

export function buildPortfolioBenchmarkSummary(
  list: PortfolioListRow,
  portfolio: PortfolioCompany[] = INVESTOR_PORTFOLIO,
): PortfolioBenchmarkSummary {
  const companies = companiesForPortfolioList(list, portfolio);
  const sampleSize = Math.max(1, companies.length);
  const metrics: PortfolioBenchmarkMetric[] = PORTFOLIO_BENCHMARK_DEFS.map(def => ({
    ...def,
    sampleSize,
    dots: buildDotsForMetric(
      def.id,
      companies,
      def.lowerIsBetter,
      def.bandStart,
      def.bandEnd,
    ),
  }));
  const leadersCount = metrics.filter(metric => metric.isLeader).length;
  return {
    filterLabel: `B2B SaaS · Seed · US · n=${Math.max(sampleSize, 3)}`,
    leadersCount,
    leadersDenom: metrics.length,
    topPerformer: companies[1]?.displayName ?? companies[0]?.displayName ?? "—",
    topPerformerBenchmarks: Math.min(7, metrics.length),
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
    meta: company.meta,
    headquarters: company.headquarters,
    employees: company.employees,
    linkedin: company.linkedin,
  };
}
