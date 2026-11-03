export type FounderViewTrackId = "rd" | "gtm" | "ga";

export type KpiQuarterPoint = {
  quarter: string;
  value: string;
  growth: string;
};

export type ExecutiveBenchmarkKpi = {
  id: string;
  label: string;
  shortLabel: string;
  value: string;
  rawValue: number;
  delta: string;
  isPositiveDelta: boolean;
  peerMedian: string;
  rawMedian: number;
  p25: string;
  p75: string;
  percentile: number;
  status: "ahead" | "on-track" | "watch";
  statusLabel: string;
  trackId: FounderViewTrackId;
  target?: string;
  category: string;
  definition: string;
  cohortBreakdown: {
    p10: string;
    p25: string;
    median: string;
    p75: string;
    p90: string;
  };
  quarterlyTrend: KpiQuarterPoint[];
  growthLevers: string[];
  dataSource: string;
};

export type TrackBenchmarkMetric = {
  label: string;
  actual: string;
  peerMedian: string;
  status: "ahead" | "lagging" | "unlogged";
};

export type FounderViewTrack = {
  id: FounderViewTrackId;
  label: string;
  fullLabel: string;
  categoryTag: string;
  status: "watch" | "good" | "bad";
  statusLabel: string;
  score: number;
  peerAverage: number;
  topQuartile: number;
  percentile: number;
  summary: string;
  topStrength: string;
  topGap: string;
  inputsAnswered: number;
  inputsTotal: number;
  confidence: "low" | "medium" | "high";
  potentialScoreBoost: number;
  metrics: TrackBenchmarkMetric[];
};

export const FOUNDER_VIEW_COMPANY = {
  name: "Patriot Pay",
  domain: "patriotpay.com",
  meta: "FinTech · Payroll & Accounting SaaS · Seed · Canton, OH",
  initials: "P",
  cohort: "B2B SaaS · Seed ($0–$1M ARR) · 320 peers",
  compositeScore: 24,
  compositeStatus: "Watch Tier",
  compositeVerdict: "Strong pilot retention (104% NRR) offset by missing GTM outbound and financial delivery inputs.",
} as const;

export const EXECUTIVE_BENCHMARK_KPIS: ExecutiveBenchmarkKpi[] = [
  {
    id: "arr",
    label: "Annual Recurring Revenue",
    shortLabel: "ARR",
    value: "$480k",
    rawValue: 480000,
    delta: "+18% QoQ",
    isPositiveDelta: true,
    peerMedian: "$500k",
    rawMedian: 500000,
    p25: "$150k",
    p75: "$1.2M",
    percentile: 48,
    status: "on-track",
    statusLabel: "Near Median",
    trackId: "gtm",
    target: "$650k",
    category: "Scale & Traction",
    definition: "Annualized subscription revenue run-rate calculated from contracted monthly recurring revenue.",
    cohortBreakdown: {
      p10: "$80k",
      p25: "$150k",
      median: "$500k",
      p75: "$1.2M",
      p90: "$2.4M",
    },
    quarterlyTrend: [
      { quarter: "Q1 2024", value: "$320k", growth: "+12.0%" },
      { quarter: "Q2 2024", value: "$360k", growth: "+12.5%" },
      { quarter: "Q3 2024", value: "$406k", growth: "+12.8%" },
      { quarter: "Q4 2024", value: "$480k", growth: "+18.2%" },
    ],
    growthLevers: [
      "Formalize the outbound sales motion targeting Midwest regional healthcare and accounting firms.",
      "Transition self-serve customers into annual commitments with upfront cash discounts to fuel expansion.",
    ],
    dataSource: "Stripe Billing via Carta Sync",
  },
  {
    id: "nrr",
    label: "Net Revenue Retention",
    shortLabel: "NRR",
    value: "104%",
    rawValue: 104,
    delta: "+2.4% MoM",
    isPositiveDelta: true,
    peerMedian: "102%",
    rawMedian: 102,
    p25: "95%",
    p75: "115%",
    percentile: 68,
    status: "ahead",
    statusLabel: "Top 32%",
    trackId: "gtm",
    target: "110%",
    category: "Retention & Moat",
    definition: "Net Revenue Retention measuring customer expansion minus contractions and churn over a rolling 12-month period.",
    cohortBreakdown: {
      p10: "88%",
      p25: "95%",
      median: "102%",
      p75: "115%",
      p90: "128%",
    },
    quarterlyTrend: [
      { quarter: "Q1 2024", value: "98%", growth: "+0.8%" },
      { quarter: "Q2 2024", value: "100%", growth: "+2.0%" },
      { quarter: "Q3 2024", value: "102%", growth: "+2.0%" },
      { quarter: "Q4 2024", value: "104%", growth: "+2.4%" },
    ],
    growthLevers: [
      "Automate seat expansion prompts when client payroll employee counts reach 85% of purchased plan limits.",
      "Bundle automated payroll tax compliance add-on during contract renewals to drive organic account expansion.",
    ],
    dataSource: "Stripe Invoicing & Billing",
  },
  {
    id: "grossMargin",
    label: "Blended Gross Margin",
    shortLabel: "Gross Margin",
    value: "74%",
    rawValue: 74,
    delta: "+3% YoY",
    isPositiveDelta: true,
    peerMedian: "72%",
    rawMedian: 72,
    p25: "58%",
    p75: "82%",
    percentile: 62,
    status: "ahead",
    statusLabel: "Top 40%",
    trackId: "ga",
    target: "78%",
    category: "Unit Economics",
    definition: "Percentage of revenue remaining after subtracting direct cloud infrastructure, banking API, and compliance costs.",
    cohortBreakdown: {
      p10: "48%",
      p25: "58%",
      median: "72%",
      p75: "82%",
      p90: "86%",
    },
    quarterlyTrend: [
      { quarter: "Q1 2024", value: "68%", growth: "+1.2%" },
      { quarter: "Q2 2024", value: "70%", growth: "+2.0%" },
      { quarter: "Q3 2024", value: "71%", growth: "+1.0%" },
      { quarter: "Q4 2024", value: "74%", growth: "+3.0%" },
    ],
    growthLevers: [
      "Renegotiate ACH and direct-deposit interchange fees as annualized volume exceeds $50M.",
      "Reserve cloud infrastructure instances on AWS for high-throughput batch tax runs to shave 4% off hosting COGS.",
    ],
    dataSource: "QuickBooks Online P&L",
  },
  {
    id: "cacPayback",
    label: "CAC Payback Period",
    shortLabel: "CAC Payback",
    value: "14 mos",
    rawValue: 14,
    delta: "-2 mos (faster)",
    isPositiveDelta: true,
    peerMedian: "16 mos",
    rawMedian: 16,
    p25: "10 mos",
    p75: "24 mos",
    percentile: 64,
    status: "ahead",
    statusLabel: "Efficient",
    trackId: "gtm",
    target: "< 12 mos",
    category: "Capital Efficiency",
    definition: "Months of gross profit required to recover the total cost incurred to acquire a paying customer.",
    cohortBreakdown: {
      p10: "28 mos",
      p25: "24 mos",
      median: "16 mos",
      p75: "10 mos",
      p90: "7 mos",
    },
    quarterlyTrend: [
      { quarter: "Q1 2024", value: "19 mos", growth: "-1 mo" },
      { quarter: "Q2 2024", value: "17 mos", growth: "-2 mos" },
      { quarter: "Q3 2024", value: "16 mos", growth: "-1 mo" },
      { quarter: "Q4 2024", value: "14 mos", growth: "-2 mos" },
    ],
    growthLevers: [
      "Target high-density CPA accountant partnerships that convert at 40% lower CAC than cold outbound.",
      "Shorten the sales qualification cycle from 42 days to 28 days using interactive product tours.",
    ],
    dataSource: "HubSpot CRM & P&L",
  },
  {
    id: "runway",
    label: "Estimated Runway",
    shortLabel: "Net Runway",
    value: "15.8 mos",
    rawValue: 15.8,
    delta: "$24k/mo burn",
    isPositiveDelta: false,
    peerMedian: "18.2 mos",
    rawMedian: 18.2,
    p25: "10 mos",
    p75: "24 mos",
    percentile: 42,
    status: "watch",
    statusLabel: "Buffer > 12m",
    trackId: "ga",
    target: "18+ mos",
    category: "Liquidity & Runway",
    definition: "Estimated operational runway in months based on cash balance and rolling 3-month average net cash burn rate.",
    cohortBreakdown: {
      p10: "6 mos",
      p25: "10 mos",
      median: "18.2 mos",
      p75: "24 mos",
      p90: "30+ mos",
    },
    quarterlyTrend: [
      { quarter: "Q1 2024", value: "22.0 mos", growth: "-2.1 mos" },
      { quarter: "Q2 2024", value: "19.8 mos", growth: "-2.2 mos" },
      { quarter: "Q3 2024", value: "17.6 mos", growth: "-2.2 mos" },
      { quarter: "Q4 2024", value: "15.8 mos", growth: "-1.8 mos" },
    ],
    growthLevers: [
      "Maintain net monthly burn rate capped at $26k while continuing 18% QoQ top-line ARR expansion.",
      "Apply for federal and state R&D payroll tax credits to recover an estimated $48k in cash in Q1.",
    ],
    dataSource: "Carta Treasury & Banking",
  },
];

export const FOUNDER_VIEW_TRACKS: FounderViewTrack[] = [
  {
    id: "rd",
    label: "R&D",
    fullLabel: "Research & Development",
    categoryTag: "ENGINEERING & PRODUCT",
    status: "watch",
    statusLabel: "Peers ahead",
    score: 42,
    peerAverage: 58,
    topQuartile: 74,
    percentile: 38,
    summary: "Cloud infrastructure verified. Sprint release cadence unlogged.",
    topStrength: "Modern serverless architecture on AWS",
    topGap: "Engineering velocity & delivery cadence unmeasured",
    inputsAnswered: 0,
    inputsTotal: 14,
    confidence: "low",
    potentialScoreBoost: 22,
    metrics: [
      { label: "Deployment Cadence", actual: "Unlogged", peerMedian: "Bi-weekly", status: "unlogged" },
      { label: "Architecture Health", actual: "Cloud-native (AWS)", peerMedian: "Standard", status: "ahead" },
    ],
  },
  {
    id: "gtm",
    label: "GTM",
    fullLabel: "Go-to-Market",
    categoryTag: "REVENUE ENGINE & ACQUISITION",
    status: "watch",
    statusLabel: "Peers ahead",
    score: 18,
    peerAverage: 46,
    topQuartile: 68,
    percentile: 24,
    summary: "High customer retention (104%), but outbound sales motion unmapped.",
    topStrength: "High pilot cohort retention (104% NRR across 25 accounts)",
    topGap: "Outbound sales motion & CAC payback undefined",
    inputsAnswered: 0,
    inputsTotal: 19,
    confidence: "low",
    potentialScoreBoost: 28,
    metrics: [
      { label: "Net Revenue Retention", actual: "104%", peerMedian: "102%", status: "ahead" },
      { label: "CAC Payback Period", actual: "14 mos", peerMedian: "16 mos", status: "ahead" },
    ],
  },
  {
    id: "ga",
    label: "G&A",
    fullLabel: "General & Administrative",
    categoryTag: "FINANCE, LEGAL & OPS",
    status: "watch",
    statusLabel: "Peers ahead",
    score: 12,
    peerAverage: 52,
    topQuartile: 72,
    percentile: 18,
    summary: "Cap table verified on Carta. Burn multiple requires recurring logging.",
    topStrength: "Clean Delaware C-Corp; zero encumbering debt",
    topGap: "Quarterly cash balance & budget forecast unverified",
    inputsAnswered: 0,
    inputsTotal: 13,
    confidence: "low",
    potentialScoreBoost: 34,
    metrics: [
      { label: "Estimated Runway", actual: "15.8 mos", peerMedian: "18.2 mos", status: "ahead" },
      { label: "Cap Table Hygiene", actual: "Verified (Carta)", peerMedian: "Standard", status: "ahead" },
    ],
  },
];

export const FOUNDER_VIEW_READ = {
  sourceCount: 3,
  sources: ["Carta Cap Table", "Seed SaaS Benchmarks (320 cos)", "York IE Advisory"],
  headline: "Peers lead on GTM acquisition; pilot retention is your core strategic moat.",
  takeaways: [
    {
      title: "Retention Moat",
      desc: "104% NRR sits in the top 32% of Seed peers. Pilot accounts are expanding with zero logo churn.",
      impact: "GTM",
    },
    {
      title: "Finance Runway Safe",
      desc: "15.8 months of runway provides adequate buffer, but outbound CAC payback needs instrumentation.",
      impact: "G&A",
    },
    {
      title: "Delivery Cadence",
      desc: "Engineering architecture is sound on AWS; mapping bi-weekly sprints will boost R&D confidence.",
      impact: "R&D",
    },
  ],
} as const;

export const FOUNDER_VIEW_NEXT_ACTION = {
  rank: 1,
  title: "Define primary GTM sales motion",
  description: "Categorize customer acquisition (founder-led vs outbound) to calibrate your peer CAC benchmark.",
  track: "GTM",
  scoreImpact: "",
  timeEstimate: "2 min",
} as const;

/** Wireframe overview — Key metrics row */
export const FOUNDER_VIEW_KEY_METRICS = [
  {
    id: "arr",
    label: "ARR",
    value: "$480k",
    cohort: "P48 vs cohort",
    percentile: 48,
    missing: false,
  },
  {
    id: "arr-growth",
    label: "ARR growth",
    value: "+18%",
    cohort: "P22 vs cohort",
    percentile: 22,
    missing: false,
  },
  {
    id: "nrr",
    label: "Net revenue retention",
    value: "104%",
    cohort: "P71 vs cohort",
    percentile: 71,
    missing: false,
  },
  {
    id: "burn-multiple",
    label: "Burn multiple",
    value: "—",
    cohort: "Not entered",
    percentile: null,
    missing: true,
  },
] as const;

/** Wireframe overview — Fuel brief + sources */
export const FOUNDER_VIEW_BRIEF = {
  title: "Fuel brief",
  body: "Retention is a strength for Patriot Pay, but growth sits in the bottom quartile of the FinTech · Seed cohort. Completing cash and burn inputs will unlock a sharper G&A score.",
  cta: "Read full brief",
  sources: [
    { id: "benchmark", label: "Benchmark · Q3 2025" },
    { id: "deck", label: "Pitch deck · Nov 3" },
  ],
} as const;

/** Wireframe overview — Next best step form */
export const FOUNDER_VIEW_NEXT_STEP = {
  title: "Next best step",
  headline: "Add cash on hand and net burn",
  fields: [
    { id: "cash", label: "Cash on hand", placeholder: "$" },
    { id: "burn", label: "Net burn / month", placeholder: "$" },
  ],
  cta: "Save and rescore",
} as const;

/** Wireframe overview — track missing inputs shown as Add links */
export const FOUNDER_VIEW_TRACK_GAPS: Record<
  FounderViewTrackId,
  ReadonlyArray<{ id: string; label: string }>
> = {
  rd: [
    { id: "rd-spend", label: "R&D spend % of revenue" },
    { id: "rd-cadence", label: "Release cadence" },
  ],
  gtm: [
    { id: "gtm-cac", label: "CAC payback" },
    { id: "gtm-motion", label: "Primary sales motion" },
  ],
  ga: [
    { id: "ga-cash", label: "Cash on hand" },
    { id: "ga-burn", label: "Net burn" },
  ],
};

export const FOUNDER_VIEW_TRACK_BANNER = {
  text: "Growth is in the bottom quartile of your FinTech · Seed cohort.",
  cta: "Talk to York IE",
} as const;

/** Wireframe overview — In motion (initiatives) */
export const FOUNDER_VIEW_IN_MOTION = {
  title: "In motion",
  viewAll: "View all",
  items: [
    {
      id: "init-series-a",
      title: "Prepare Series A fundraising materials",
      progress: "0/3",
      impact: "Impacts ARR growth · burn multiple",
    },
    {
      id: "init-gtm",
      title: "Define primary GTM sales motion",
      progress: "1/3",
      impact: "Impacts CAC payback · peer score",
    },
    {
      id: "init-rd",
      title: "Instrument engineering delivery cadence",
      progress: "0/2",
      impact: "Impacts R&D score confidence",
    },
  ],
} as const;

/** Wireframe overview — Evidence (data room) */
export const FOUNDER_VIEW_EVIDENCE = {
  title: "Evidence",
  viewAll: "View all",
  items: [
    {
      id: "ev-deck",
      title: "Pitch deck",
      meta: "Uploaded · Nov 3",
      action: "Open" as const,
    },
    {
      id: "ev-brief",
      title: "Intelligence brief",
      meta: "Fuel AI · This week",
      action: "Open" as const,
    },
    {
      id: "ev-model",
      title: "Financial model",
      meta: "Missing",
      action: "Upload" as const,
    },
  ],
} as const;

export const FOUNDER_VIEW_SETUP = {
  title: "Your 5 modules",
  description: "Open any module to add or update the context Fuel uses across your Overview.",
  skipLabel: "Skip",
  modules: [
    {
      id: "company",
      name: "Complete Profile",
      topics: "Company · Industry · Location · Headcount · Context",
      answered: 11,
      total: 15,
      credits: 50,
      creditsEarned: false,
      status: "building" as const,
    },
    {
      id: "rd",
      name: "R&D",
      topics: "Stage · Type · Constraint",
      answered: 3,
      total: 14,
      credits: 50,
      creditsEarned: false,
      status: "building" as const,
    },
    {
      id: "gtm",
      name: "GTM",
      topics: "Motion · ICP · Pipeline",
      answered: 4,
      total: 19,
      credits: 50,
      creditsEarned: false,
      status: "building" as const,
    },
    {
      id: "ga",
      name: "G&A",
      topics: "Runway · Finance · Capital",
      answered: 3,
      total: 14,
      credits: 50,
      creditsEarned: false,
      status: "building" as const,
    },
    {
      id: "benchmark",
      name: "Benchmark",
      topics: "Metrics · Cohort · Peer scores",
      answered: 12,
      total: 12,
      credits: 50,
      creditsEarned: true,
      status: "complete" as const,
    },
  ],
} as const;

export const FOUNDER_VIEW_WORKSPACE_TABS = [
  "Overview",
  "Intelligence",
  "Initiatives",
  "Research",
  "Data room",
] as const;

export type FounderViewWorkspaceTab = "intelligence" | "initiatives" | "research" | "data-room";

/** Compact POVs rolled up from each workspace tab */
export const FOUNDER_VIEW_PULSE = {
  intelligence: {
    tab: "intelligence" as FounderViewWorkspaceTab,
    title: "Intelligence",
    eyebrow: "Signals",
    countLabel: "12 signals",
    meta: "3 need attention · 2 sources awaiting extract",
    items: [
      {
        title: "NRR 104% — top third of seed peers",
        meta: "Retention · High confidence",
        tone: "good" as const,
      },
      {
        title: "Outbound CAC payback still unmapped",
        meta: "Growth · Gap vs peers",
        tone: "watch" as const,
      },
      {
        title: "Burn multiple stale — log this quarter",
        meta: "Finance · 47d old",
        tone: "bad" as const,
      },
    ],
  },
  initiatives: {
    tab: "initiatives" as FounderViewWorkspaceTab,
    title: "Initiatives",
    eyebrow: "Work",
    countLabel: "2 active · 4 suggested",
    meta: "Top gap work tied to scorecard tracks",
    items: [
      {
        title: "Define primary GTM sales motion",
        meta: "Suggested · GTM · ~2 min",
        tone: "watch" as const,
        progress: null as number | null,
      },
      {
        title: "Instrument engineering delivery cadence",
        meta: "Active · R&D",
        tone: "watch" as const,
        progress: 35,
      },
      {
        title: "Quarterly cash & budget forecast",
        meta: "Suggested · G&A",
        tone: "bad" as const,
        progress: null as number | null,
      },
    ],
  },
  dataRoom: {
    tab: "data-room" as FounderViewWorkspaceTab,
    title: "Data room",
    eyebrow: "Documents",
    countLabel: "5 files · 3 with intel",
    meta: "2 critical gaps for fundraising readiness",
    items: [
      {
        title: "Cap table (Carta)",
        meta: "Verified · Intelligence ready",
        tone: "good" as const,
      },
      {
        title: "Pitch deck",
        meta: "Uploaded · No intelligence yet",
        tone: "watch" as const,
      },
      {
        title: "Financial model",
        meta: "Missing",
        tone: "bad" as const,
      },
    ],
  },
  research: {
    tab: "research" as FounderViewWorkspaceTab,
    title: "Research",
    eyebrow: "Briefs",
    countLabel: "2 artifacts",
    meta: "Latest company brief ready to open",
    items: [
      {
        title: "KPI Benchmark brief",
        meta: "Fuel AI · Updated this week",
        tone: "good" as const,
      },
      {
        title: "Pitch Deck Evaluation",
        meta: "Playbook run · 12 days ago",
        tone: "watch" as const,
      },
      {
        title: "Generate a fresh company brief",
        meta: "Pulls scorecard + intel + docs",
        tone: "good" as const,
      },
    ],
  },
} as const;

export const FOUNDER_VIEW_SIDEBAR = {
  brand: {
    name: "YORK·IE",
    version: "FUEL 2.0",
  },
  network: [
    { label: "Advisors", count: 2, id: "advisors" },
    { label: "Service providers", count: 0, id: "providers" },
    { label: "Investors", count: 0, id: "investors" },
  ],
  recentlyViewed: [
    { name: "Patriot Pay", id: "patriot-pay", active: true },
    { name: "Operator AI", id: "operator-ai", active: false },
    { name: "Sync Sports", id: "sync-sports", active: false },
    { name: "Winrate", id: "winrate", active: false },
  ],
  partner: {
    tag: "PARTNER",
    description: "Hands-on advisory across R&D, GTM, and strategic finance.",
    cta: "Talk to York IE →",
  },
  user: {
    name: "Shreya Gokani",
    initials: "SG",
    plan: "Free · 50 / 50 Credits",
  },
} as const;
