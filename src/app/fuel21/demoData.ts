/** Content + nav matching the provided Fuel mockup screenshots only. */

export type NavId = "dashboard" | "context" | "rd";

export const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "rd", label: "R&D" },
  { id: "context", label: "Context Engine" },
];

export const WORKSPACE = {
  name: "PatriotPay.ai",
  kind: "Founder workspace",
  initial: "P",
};

export const USER = {
  name: "Jordan Davis",
  role: "Founder",
  initials: "JD",
};

export const RECENTLY_VIEWED = [
  { id: "stripe", label: "Stripe · Company research" },
  { id: "adyen", label: "Adyen · Company research" },
];

export const SCORE_CARDS = [
  { id: "rd" as const, label: "R&D", score: 78, delta: "+6 vs. 8 weeks ago", spark: [62, 64, 68, 70, 72, 74, 78] },
  { id: "gtm" as const, label: "GTM", score: 71, delta: "+4 vs. 8 weeks ago", spark: [58, 60, 63, 65, 67, 69, 71] },
  { id: "ga" as const, label: "G&A", score: 74, delta: "+3 vs. 8 weeks ago", spark: [64, 66, 68, 69, 71, 72, 74] },
];

/** Dashboard Fuel Brief — summary + short initiative briefs for the founder. */
export const FUEL_BRIEF = {
  summary:
    "Retention is a strength for Patriot Pay, but growth sits in the bottom quartile of the FinTech · Seed cohort. Completing cash and burn inputs will unlock a sharper finance and operations score.",
  initiativeBriefs: [
    {
      track: "R&D",
      title: "Close the payment-flow test gap",
      detail: "Twelve critical checkout paths are still untested — protect releases before the next ship window.",
    },
    {
      track: "GTM",
      title: "Rebalance the paid growth mix",
      detail: "Shift spend toward channels with clearer payback so growth can move off the bottom of the cohort.",
    },
    {
      track: "G&A",
      title: "Finish cash and burn inputs",
      detail: "A living 13-week cash view unlocks a sharper finance and operations score for the board.",
    },
  ],
  tags: ["Benchmark · Q3 2025", "Pitch deck · Nov 3"],
};

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
  { name: "Slack", status: "Connected" },
  { name: "Granola", status: "Connected" },
  { name: "HubSpot", status: "Connected" },
];

export type ContextTab = "all" | "manual" | "files" | "slack" | "granola" | "hubspot";

export const CONTEXT_TABS: { id: ContextTab; label: string; count: number }[] = [
  { id: "all", label: "All", count: 7 },
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
  return NAV_ITEMS.find(n => n.id === page)?.label ?? "Dashboard";
}
