/** Content + nav matching the provided Fuel mockup screenshots only. */

import {
  getCohortMetricPeer,
  type BenchmarkCohortId,
} from "../benchmarkCohortData.ts";

export type NavId = "dashboard" | "context" | "rd" | "company";

export interface SidebarNavItem {
  id: string;
  label: string;
  badge?: string;
  badgeTone?: "green" | "muted";
  badgeShape?: "circle" | "pill";
  targetNav: NavId;
  scrollTarget?: string;
  children?: SidebarNavItem[];
}

export interface SidebarSection {
  id: string;
  label: string;
  items: SidebarNavItem[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "value-creation",
    label: "Value creation",
    items: [
      { id: "context", label: "Context engine", badge: "4", badgeShape: "circle", targetNav: "context" },
      { id: "intelligence", label: "Intelligence", badge: "5", badgeShape: "circle", targetNav: "dashboard", scrollTarget: ".f21-telemetry-panel" },
      { id: "initiatives", label: "Initiatives", badge: "3", badgeShape: "circle", targetNav: "dashboard", scrollTarget: ".f21-initiatives-panel" },
      { id: "benchmarks", label: "Benchmarks", targetNav: "context" },
      { id: "dataroom", label: "Data room", badge: "12", badgeShape: "pill", targetNav: "dashboard", scrollTarget: ".f21-dataroom-panel" },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    items: [
      { id: "playbooks", label: "Playbooks", targetNav: "dashboard" },
    ],
  },
  {
    id: "network",
    label: "Network",
    items: [
      { id: "advisors", label: "Advisors", badge: "2", badgeShape: "circle", targetNav: "context" },
      { id: "investors", label: "Investors", badge: "3", badgeShape: "circle", targetNav: "context" },
      { id: "watchlists", label: "Watchlist", badge: "2", badgeShape: "circle", targetNav: "context" },
    ],
  },
  {
    id: "public-presence",
    label: "Public presence",
    items: [
      { id: "public-profile", label: "Public profile", targetNav: "context" },
      { id: "blog", label: "Blog", targetNav: "context" },
    ],
  },
  {
    id: "recently-viewed",
    label: "Recently viewed",
    items: [
      { id: "stripe", label: "Stripe, company research", targetNav: "context" },
      { id: "adyen", label: "Adyen, company research", targetNav: "context" },
    ],
  },
];

function flattenNavItems(items: SidebarNavItem[]): SidebarNavItem[] {
  return items.flatMap(item => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { id: "dashboard", label: "Dashboard", targetNav: "dashboard" },
  ...flattenNavItems(SIDEBAR_SECTIONS.flatMap(s => s.items)),
];

export const CONTEXT_ARTIFACTS = [
  { id: "watchlists", title: "Watchlists", meta: "Companies tracked before they enter the pipeline" },
  { id: "pitch-deck", title: "Pitch deck", meta: "Investor narrative · Nov 3" },
  { id: "board-memo", title: "Board memo", meta: "October operating review" },
  { id: "cohort-brief", title: "Cohort brief", meta: "FinTech · Seed peer snapshot" },
  { id: "hiring-plan", title: "Hiring plan", meta: "Engineering and go-to-market headcount" },
];

export const VALUE_CREATION_ITEMS: SidebarNavItem[] =
  SIDEBAR_SECTIONS.find(section => section.id === "value-creation")?.items ?? [];

export const NETWORK_ITEMS: SidebarNavItem[] = [
  { id: "advisors", label: "Advisors", badge: "2", badgeShape: "circle", targetNav: "context" },
  { id: "investors", label: "Investors", badge: "3", badgeShape: "circle", targetNav: "context" },
  { id: "watchlists", label: "Watchlist", badge: "2", badgeShape: "circle", targetNav: "context" },
];

export const NAV_ITEMS = SIDEBAR_NAV_ITEMS;

export const WORKSPACE = {
  name: "PartriotPay.ai",
  kind: "Founder workspace",
  initial: "P",
};

/** Patriot Pay workspace company — matches main-branch FOUNDER_COMPANY / profile page. */
export const FOUNDER_COMPANY = {
  id: "patriotpay",
  displayName: "Patriot Pay",
  domain: "patriotpay.com",
  meta: "FinTech · Payroll & Accounting · Seed",
  headquarters: "Canton, OH, US",
  employees: "51-200",
  linkedin: "linkedin.com/company/patriotsoftware",
} as const;

export const USER = {
  name: "Jordan Davis",
  email: "jordan@patriotpay.ai",
  role: "Patriot Pay",
  initials: "JD",
};

export const RECENTLY_VIEWED = [
  { id: "stripe" as const, label: "Stripe, company research" },
  { id: "adyen" as const, label: "Adyen, company research" },
];

export const RECENTLY_VIEWED_COMPANIES = [
  { id: "volur" as const, label: "Völur", type: "volur" as const },
  { id: "yorkie-1" as const, label: "York IE", type: "yorkie" as const },
  { id: "yorkie-2" as const, label: "York IE", type: "yorkie" as const },
  { id: "swiggy" as const, label: "Swiggy", type: "swiggy" as const },
];

export const USAGE_PLAN = {
  tier: "FREE",
  current: 220,
  total: 220,
  pct: 100,
};

export const INPUT_UPDATE_ITEMS = [
  { id: "benchmarks" as const, label: "Benchmarks", targetNav: "context" as const },
  { id: "update-info" as const, label: "Update information", targetNav: "context" as const },
  { id: "add-context" as const, label: "Add context", targetNav: "context" as const },
];

export const SCORE_CARDS = [
  { id: "rd" as const, label: "R&D", score: 60, delta: "+6 vs. 8 weeks ago", spark: [50, 52, 54, 56, 58, 59, 60] },
  { id: "gtm" as const, label: "GTM", score: 50, delta: "+4 vs. 8 weeks ago", spark: [42, 44, 46, 47, 48, 49, 50] },
  { id: "ga" as const, label: "G&A", score: 75, delta: "+3 vs. 8 weeks ago", spark: [68, 69, 70, 71, 72, 73, 75] },
];

/** Dashboard modules — complete-profile style progress cards. */
export const DASHBOARD_MODULES = [
  {
    id: "profile",
    title: "Profile",
    answered: 9,
    total: 16,
    progress: "9/16 answered",
    tags: ["Company", "Industry", "Location", "Headcount", "Context"],
    status: "In progress" as const,
    credit: "+55 unlocked",
    action: "Continue →",
    href: null as NavId | null,
  },
  {
    id: "rd",
    title: "R&D",
    answered: 1,
    total: 14,
    progress: "1/14 answered",
    tags: ["Stage", "Type", "Constraint"],
    status: "In progress" as const,
    credit: "Get +55",
    action: "Continue →",
    href: "rd" as NavId | null,
  },
  {
    id: "gtm",
    title: "GTM",
    answered: 1,
    total: 19,
    progress: "1/19 answered",
    tags: ["Motion", "ICP", "Pipeline"],
    status: "In progress" as const,
    credit: "Get +55",
    action: "Continue →",
    href: null as NavId | null,
  },
  {
    id: "ga",
    title: "G&A",
    answered: 0,
    total: 12,
    progress: "0/12 answered",
    tags: ["Runway", "Finance", "Capital"],
    status: "Not started" as const,
    credit: "Get +55",
    action: "Start →",
    href: null as NavId | null,
  },
  {
    id: "benchmark",
    title: "Benchmark",
    answered: 12,
    total: 12,
    progress: "12/12 answered",
    tags: ["Metrics", "Cohort", "Peer scores"],
    status: "Complete" as const,
    credit: "+55 unlocked",
    action: "Review →",
    href: null as NavId | null,
  },
];

/**
 * Fuel Brief — narrative + intelligence highlights only
 * (no R&D / GTM / G&A initiative track cards).
 */
export const FUEL_BRIEF = {
  summary:
    "Retention is a strength for Patriot Pay, but growth sits in the bottom quartile of the FinTech · Seed cohort. Completing cash and burn inputs will unlock a sharper finance and operations score.",
  intelligenceHighlights: [
    {
      label: "Annual recurring revenue",
      value: "$35M",
      point: "Latest revenue pulse from accepted finance context — a clear strength signal for the board narrative.",
    },
    {
      label: "Automated test coverage",
      value: "84%",
      point: "Up nine points — quality is improving, which protects release confidence as you scale.",
    },
    {
      label: "Customer acquisition payback",
      value: "19 months",
      point: "Payback lengthened two months — watch channel efficiency before increasing paid spend.",
    },
    {
      label: "Peer growth position",
      value: "Bottom quartile",
      point: "Growth lags FinTech · Seed peers even while retention holds — prioritize signals that move acquisition quality.",
    },
  ],
  tags: ["Benchmark · Q3 2025", "Pitch deck · Nov 3"],
  /** Executive dashboard — strategic framing (not analysis). */
  executiveLeads: [
    "This dashboard scores Product & engineering, Go-to-market, and Finance & operations in one place so you decide where leadership attention goes—not to replace your models, but to choose what to fix first.",
    "Each score backs part of your company story with investors, customers, and your team. When a track slips, treat it as a priority signal and use the cards above before you spread focus across a dozen tools.",
  ],
  executiveBullets: [
    "Product & engineering — delivery credibility drives trust in every roadmap and fundraise conversation.",
    "Go-to-market — revenue motion must keep pace with product investment, or runway burns without proof.",
    "Finance & operations — clear runway and ops discipline are what make hiring and spend tradeoffs honest.",
    "Retention is still a strength ($35M ARR) — lead with that while you lift the weaker tracks.",
  ],
};

/** Growth-stage cohort for Patriot Pay ($35M ARR); seed cohort for payback bands (main branch). */
const TELEMETRY_GROWTH_COHORT: BenchmarkCohortId = "b2b_saas:growth:us";
const TELEMETRY_SEED_COHORT: BenchmarkCohortId = "b2b_saas:seed:us";

function formatPeerUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    if (millions >= 10) return `$${Math.round(millions)}M`;
    return millions % 1 === 0 ? `$${millions.toFixed(0)}M` : `$${millions.toFixed(1)}M`;
  }
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function formatPeerPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatPeerMonths(value: number): string {
  return `${Math.round(value)} mo`;
}

function cohortP50Line(
  cohortId: BenchmarkCohortId,
  metricKey: string,
  format: (value: number) => string,
): string {
  const peer = getCohortMetricPeer(cohortId, metricKey);
  if (!peer) return "";
  return `Cohort P50 ${format(peer.p50)}`;
}

export type ExecutiveTelemetryTile = {
  label: string;
  value: string;
  benchmark: string;
};

export type ExecutiveBenchmarkMetric = {
  cohortId: BenchmarkCohortId;
  fieldKey: "arr" | "nrr" | "cacPayback" | "arrGrowth";
  numericValue: number;
};

/** Benchmark panel — same fields + cohort peers as main-branch benchmark bars (Patriot Pay demo). */
export const EXECUTIVE_BENCHMARK_METRICS: ExecutiveBenchmarkMetric[] = [
  {
    cohortId: TELEMETRY_GROWTH_COHORT,
    fieldKey: "arr",
    numericValue: 35_000_000,
  },
  {
    cohortId: TELEMETRY_GROWTH_COHORT,
    fieldKey: "nrr",
    numericValue: 125,
  },
  {
    cohortId: TELEMETRY_SEED_COHORT,
    fieldKey: "cacPayback",
    numericValue: 19,
  },
  {
    cohortId: TELEMETRY_GROWTH_COHORT,
    fieldKey: "arrGrowth",
    numericValue: 35,
  },
];

/** Real Intelligence grid — company reading + single cohort P50 line (York benchmarkCohortData). */
export const EXECUTIVE_TELEMETRY_TILES: ExecutiveTelemetryTile[] = [
  {
    label: "ARR",
    value: "$35M",
    benchmark: cohortP50Line(TELEMETRY_GROWTH_COHORT, "arr", formatPeerUsd),
  },
  {
    label: "Net revenue retention",
    value: "125%",
    benchmark: cohortP50Line(TELEMETRY_GROWTH_COHORT, "nrr", formatPeerPercent),
  },
  {
    label: "CAC payback",
    value: "19 mo",
    benchmark: cohortP50Line(TELEMETRY_SEED_COHORT, "cacPayback", formatPeerMonths),
  },
  {
    label: "ARR growth (YoY)",
    value: "35%",
    benchmark: cohortP50Line(
      TELEMETRY_GROWTH_COHORT,
      "arrGrowth",
      value => `${formatPeerPercent(value)} YoY`,
    ),
  },
];

export const LATEST_INTELLIGENCE = [
  { label: "ARR", value: "$35M", meta: "Latest", metaTone: "muted" as const },
  { label: "Automated test coverage", value: "84%", meta: "+9pp", metaTone: "good" as const },
  { label: "CAC payback", value: "19mo", meta: "+2mo", metaTone: "good" as const },
];

export const DASHBOARD_INITIATIVES = [
  {
    track: "R&D",
    title: "Build a safer release cadence",
    detail: "Close critical checkout test gaps before the next ship window.",
  },
  {
    track: "GTM",
    title: "Improve the paid growth mix",
    detail: "Rebalance spend toward channels with clearer payback.",
  },
  {
    track: "G&A",
    title: "Build a 13-week cash forecast",
    detail: "Give the board a living view of runway and hiring headroom.",
  },
];

export const DATA_ROOM_FILES = [
  { name: "Pitch deck", type: "PDF" },
  { name: "Investor notes", type: "DOC" },
  { name: "Cap table", type: "XLS" },
];

export const PLAYBOOK_SUGGESTIONS = [
  { title: "Ship with confidence", track: "R&D" },
  { title: "Tune your acquisition mix", track: "GTM" },
  { title: "Plan your cash runway", track: "G&A" },
];

export const CONNECTORS = [
  { id: "slack" as const, name: "Slack", status: "Connected" },
  { id: "granola" as const, name: "Granola", status: "Connected" },
  { id: "hubspot" as const, name: "HubSpot", status: "Connected" },
];

export type ContextTab = "all" | "artifacts" | "manual" | "files" | "slack" | "granola" | "hubspot";

export const CONTEXT_TABS: { id: ContextTab; label: string; count: number }[] = [
  { id: "all", label: "All", count: 7 },
  { id: "artifacts", label: "Artifacts", count: CONTEXT_ARTIFACTS.length },
  { id: "manual", label: "Manual", count: 1 },
  { id: "files", label: "Files", count: 3 },
  { id: "slack", label: "Slack", count: 1 },
  { id: "granola", label: "Granola", count: 1 },
  { id: "hubspot", label: "HubSpot", count: 1 },
];

export type SourceMaterial = {
  id: string;
  title: string;
  source: string;
  meta: string;
  tab: ContextTab;
  intelligence: string;
  related?: string;
  detail: {
    channel?: string;
    synced: string;
    summary: string;
    metrics: { label: string; value: string }[];
    initiative: { tag: string; title: string; detail: string };
  };
};

export const SOURCE_MATERIALS: SourceMaterial[] = [
  {
    id: "oct-finance",
    title: "October finance update.pdf",
    source: "Files",
    meta: "Files · Oct 31 · Processed",
    tab: "files",
    intelligence: "ARR $35M · current Oct 31",
    related: "↳ Close payment-flow test gap",
    detail: {
      synced: "Oct 31 · Processed",
      summary: "October close confirms ARR at $35M with stable gross margin.",
      metrics: [
        { label: "ARR", value: "$35M" },
        { label: "Gross margin", value: "72%" },
      ],
      initiative: {
        tag: "Finance",
        title: "Publish board-ready cash view",
        detail: "Roll October close into the 13-week forecast.",
      },
    },
  },
  {
    id: "sep-board",
    title: "September board deck",
    source: "Files",
    meta: "Files · Sep 28 · Processed",
    tab: "files",
    intelligence: "4.2 deployments / week",
    detail: {
      synced: "Sep 28 · Processed",
      summary: "Board deck highlights delivery velocity and hiring plan.",
      metrics: [{ label: "Deployments", value: "4.2 / week" }],
      initiative: {
        tag: "Delivery",
        title: "Keep release cadence visible",
        detail: "Track deployments against the quality bar.",
      },
    },
  },
  {
    id: "qa-report",
    title: "QA report",
    source: "Files",
    meta: "Files · Nov 1 · Processed",
    tab: "files",
    intelligence: "Automated test coverage 84%",
    related: "↳ Close payment-flow test gap",
    detail: {
      synced: "Nov 1 · Processed",
      summary: "Coverage is up, but checkout paths still need owners.",
      metrics: [
        { label: "Automated test coverage", value: "84%" },
        { label: "Untested critical paths", value: "12" },
      ],
      initiative: {
        tag: "Testing",
        title: "Close the payment-flow test gap",
        detail: "Protect critical checkout flows before release.",
      },
    },
  },
  {
    id: "payment-qa",
    title: "Payment QA thread",
    source: "Slack",
    meta: "Slack · #engineering",
    tab: "slack",
    intelligence: "Checkout test gap corroborated",
    related: "↳ Close payment-flow test gap",
    detail: {
      channel: "#engineering",
      synced: "Nov 2 · Synced Nov 3 at 09:40",
      summary: "Coverage is improving, but critical checkout tests are still missing.",
      metrics: [
        { label: "Automated test coverage", value: "84%" },
        { label: "Untested critical checkout paths", value: "12" },
      ],
      initiative: {
        tag: "Testing",
        title: "Close the payment-flow test gap",
        detail: "Protect critical checkout flows before release.",
      },
    },
  },
  {
    id: "eng-weekly",
    title: "Engineering weekly",
    source: "Granola",
    meta: "Granola · Nov 2 · Synced",
    tab: "granola",
    intelligence: "Squad ownership across 5 teams",
    detail: {
      synced: "Nov 2 · Synced",
      summary: "Weekly notes confirm clear ownership and on-call coverage.",
      metrics: [{ label: "Squads with owners", value: "5" }],
      initiative: {
        tag: "Team",
        title: "Protect squad ownership",
        detail: "On-call and second owners maintain service coverage.",
      },
    },
  },
  {
    id: "deal-review",
    title: "Deal review",
    source: "HubSpot",
    meta: "HubSpot · Nov 1 · Synced",
    tab: "hubspot",
    intelligence: "Pipeline concentration in enterprise",
    detail: {
      synced: "Nov 1 · Synced",
      summary: "Enterprise deals dominate late-stage pipeline this month.",
      metrics: [{ label: "Enterprise share", value: "62%" }],
      initiative: {
        tag: "GTM",
        title: "Improve the paid growth mix",
        detail: "Balance enterprise with more efficient mid-market motions.",
      },
    },
  },
  {
    id: "priorities",
    title: "Current priorities",
    source: "Manual",
    meta: "Manual · Nov 3 · Draft",
    tab: "manual",
    intelligence: "Founder note on Q4 focus",
    detail: {
      synced: "Nov 3 · Draft",
      summary: "Founder priorities: checkout quality, cash forecast, paid mix.",
      metrics: [],
      initiative: {
        tag: "Focus",
        title: "Align Q4 initiatives",
        detail: "Keep the three active tracks moving in parallel.",
      },
    },
  },
];

export const REVIEW_ITEMS = [
  "ARR period classification",
  "Team size: 42 vs 39 · definition mismatch",
  "Finance update / board deck · Not approved",
];

export const RD_WORKING = [
  { title: "Development velocity", detail: "4.2 deployments/week." },
  { title: "Team ownership", detail: "Clear ownership across 5 squads." },
];

export const RD_NEEDS = [
  {
    title: "Testing",
    detail: "84% coverage, but 12 critical checkout paths remain untested.",
  },
  {
    title: "Security",
    detail: "Review 120 days old despite 0 open critical findings.",
  },
  {
    title: "Design",
    detail: "Adoption improving, but customer research remains thin.",
  },
];

export const RD_INITIATIVES = [
  {
    tag: "Testing",
    title: "Close payment testing gap",
    detail: "Protect critical checkout flows.",
  },
  {
    tag: "Security",
    title: "Independent security review",
    detail: "Refresh assurance and prioritize remediation.",
  },
  {
    tag: "Design",
    title: "Validate checkout friction",
    detail: "5 usability sessions identify friction.",
  },
  {
    tag: "Team",
    title: "Protect squad ownership",
    detail: "On-call and second owners maintain service coverage.",
  },
];

export const RD_INTELLIGENCE = [
  { label: "Deployment frequency", value: "4.2/week" },
  { label: "Automated test coverage", value: "84%" },
  { label: "Open critical security findings", value: "0" },
];

export const RD_PLAYBOOKS = [
  "Product & Engineering Assessment",
  "Security Readiness Review",
  "QA Coverage Sprint",
];

export function breadcrumbFor(page: NavId): string {
  if (page === "company") return "Company profile";
  if (page === "rd") return "Research & Development";
  return NAV_ITEMS.find(n => n.id === page)?.label ?? "Dashboard";
}
