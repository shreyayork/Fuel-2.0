/** View-only third-party company overview payloads (fuel-data / public sources). */

export type ThirdPartyFundingRound = {
  date: string;
  round: string;
  amount: string;
  investors: string[];
};

export type ThirdPartyNewsItem = {
  title: string;
  source: string;
  when: string;
};

export type ThirdPartySimilarCompany = {
  name: string;
  logo: string;
  logoBg: string;
};

export type ThirdPartyOverviewRecord = {
  companyId: string;
  about: string;
  totalFunding: string;
  fundingRoundsCount: string;
  lastRound: string;
  lastRoundHint: string;
  founded: string;
  foundedHint: string;
  headquarters: string;
  employees: string;
  sectors: string[];
  keywords: string[];
  keywordTotal: number;
  rounds: ThirdPartyFundingRound[];
  /** Cumulative raised points for sparkline (oldest → newest), in $M. */
  cumulativeRaisedMm: number[];
  news: ThirdPartyNewsItem[];
  publicLinks: { label: string; href: string }[];
  similarCompanies: ThirdPartySimilarCompany[];
  dataSources: { name: string; detail: string; badge?: string }[];
  advisorPoolTotal: number;
};

export const SWIGGY_OVERVIEW: ThirdPartyOverviewRecord = {
  companyId: "swiggy",
  about:
    "Swiggy is an on-demand convenience platform from India offering food delivery, groceries, meat, fruit & veggies, and dining-out options across 500+ cities.",
  totalFunding: "$5.1B",
  fundingRoundsCount: "20",
  lastRound: "Dec 2025",
  lastRoundHint: "1 mo ago",
  founded: "Aug 2014",
  foundedHint: "10.3y old",
  headquarters: "Bangalore, Karnataka, IN",
  employees: "5001-10000",
  sectors: [
    "restaurants",
    "same day delivery",
    "food delivery",
    "delivery",
    "grocery",
  ],
  keywords: [
    "food",
    "delivery",
    "order",
    "restaurant",
    "grocery",
    "online",
    "meal",
    "dining",
    "marketplace",
    "logistics",
    "convenience",
    "hyperlocal",
  ],
  keywordTotal: 32,
  rounds: [
    {
      date: "Dec 2025",
      round: "Post-Ipo Equity",
      amount: "$1.1B",
      investors: ["SoftBank Vision Fund", "Prosus", "Accel"],
    },
    {
      date: "May 2025",
      round: "Secondary Market",
      amount: "$250M",
      investors: ["Temasek", "Invesco"],
    },
    {
      date: "Jan 2024",
      round: "Series J",
      amount: "$700M",
      investors: ["SoftBank Vision Fund", "Prosus", "Accel"],
    },
    {
      date: "Apr 2022",
      round: "Series I",
      amount: "$700M",
      investors: ["SoftBank Vision Fund", "Prosus"],
    },
    {
      date: "Jul 2021",
      round: "Series H",
      amount: "$1.25B",
      investors: ["SoftBank Vision Fund", "Prosus", "DST Global"],
    },
    {
      date: "Feb 2021",
      round: "Series G",
      amount: "$800M",
      investors: ["SoftBank Vision Fund", "Accel", "DST Global"],
    },
    {
      date: "Dec 2018",
      round: "Series F",
      amount: "$1.0B",
      investors: ["SoftBank Vision Fund", "Naspers", "DST Global"],
    },
    {
      date: "Jun 2018",
      round: "Series E",
      amount: "$210M",
      investors: ["Naspers", "DST Global", "Accel"],
    },
    {
      date: "May 2017",
      round: "Series D",
      amount: "$80M",
      investors: ["Naspers", "Accel", "SAIF Partners"],
    },
    {
      date: "Sep 2016",
      round: "Series C",
      amount: "$105M",
      investors: ["Naspers", "Accel", "SAIF Partners"],
    },
    {
      date: "Jan 2016",
      round: "Series B",
      amount: "$15M",
      investors: ["Accel", "SAIF Partners", "Norwest"],
    },
    {
      date: "Apr 2015",
      round: "Series A",
      amount: "$2.0M",
      investors: ["Accel", "SAIF Partners"],
    },
  ],
  cumulativeRaisedMm: [2, 17, 122, 202, 412, 1412, 2212, 3462, 4162, 4862, 5112, 5112],
  news: [
    {
      title: "Swiggy announces acquisition of Dineout",
      source: "SWIGGY",
      when: "1d ago",
    },
    {
      title: "Swiggy Instamart expands to 40 new cities",
      source: "ECONOMIC TIMES",
      when: "3d ago",
    },
    {
      title: "Swiggy reports strong festive-season order growth",
      source: "MINT",
      when: "1w ago",
    },
    {
      title: "Swiggy deepens dark-store network for quicker grocery delivery",
      source: "YOURSTORY",
      when: "2w ago",
    },
  ],
  publicLinks: [],
  similarCompanies: [
    { name: "Zomato", logo: "Z", logoBg: "#E23744" },
    { name: "Dunzo", logo: "D", logoBg: "#00B14F" },
    { name: "BigBasket", logo: "B", logoBg: "#84C225" },
    { name: "Zepto", logo: "Z", logoBg: "#7C3AED" },
    { name: "Blinkit", logo: "B", logoBg: "#F8C301" },
    { name: "Uber Eats", logo: "U", logoBg: "#06C167" },
  ],
  dataSources: [
    { name: "Crunchbase", detail: "organizations", badge: "PUBLIC" },
    { name: "LinkedIn", detail: "company profile", badge: "PUBLIC" },
    { name: "Open Corporates", detail: "entity registry" },
  ],
  advisorPoolTotal: 24,
};

/** Sector-aligned overview fixtures for portfolio third-party companies. */
export const THIRD_PARTY_OVERVIEW_BY_ID: Record<string, ThirdPartyOverviewRecord> = {
  patriotpay: {
    companyId: "patriotpay",
    about:
      "Patriot Pay is a healthcare payments company helping medical practices modernize patient billing, collections, and revenue operations through workflow automation and AI-assisted billing support.",
    totalFunding: "$4.2M",
    fundingRoundsCount: "2",
    lastRound: "Feb 2024",
    lastRoundHint: "Seed",
    founded: "2021",
    foundedHint: "4 yrs active",
    headquarters: "Boston, MA, US",
    employees: "11-50",
    sectors: ["healthcare", "patient billing", "fintech", "b2b saas"],
    keywords: [
      "patient billing",
      "healthcare payments",
      "revenue cycle",
      "ai agent",
      "smb practices",
      "collections",
      "payments",
      "fintech",
    ],
    keywordTotal: 16,
    rounds: [
      {
        date: "Feb 2024",
        round: "Seed",
        amount: "$4.2M",
        investors: ["York IE", "Angels"],
      },
      {
        date: "Aug 2022",
        round: "Pre-seed",
        amount: "$750K",
        investors: ["Founder network"],
      },
    ],
    cumulativeRaisedMm: [0.75, 4.95],
    news: [
      {
        title: "Patriot Pay expands AI billing support for SMB practices",
        source: "PATRIOT PAY",
        when: "1w ago",
      },
      {
        title: "York IE highlights Patriot Pay in healthcare payments thesis",
        source: "YORK IE",
        when: "3w ago",
      },
    ],
    publicLinks: [],
    similarCompanies: [
      { name: "Cedar", logo: "C", logoBg: "#1E4D8C" },
      { name: "Inbox Health", logo: "I", logoBg: "#0D9488" },
      { name: "Rivet Health", logo: "R", logoBg: "#5B3A8C" },
      { name: "PayZen", logo: "P", logoBg: "#C9A227" },
      { name: "Finpay", logo: "F", logoBg: "#4A90B8" },
    ],
    dataSources: [
      { name: "Crunchbase", detail: "organizations", badge: "PUBLIC" },
      { name: "LinkedIn", detail: "company profile", badge: "PUBLIC" },
      { name: "Website", detail: "public" },
    ],
    advisorPoolTotal: 12,
  },
  swiggy: SWIGGY_OVERVIEW,
  "operator-ai": {
    companyId: "operator-ai",
    about:
      "Operator AI builds AI workflow automation for operations teams — routing work, summarizing context, and closing loops across tools without adding headcount.",
    totalFunding: "$12.4M",
    fundingRoundsCount: "3",
    lastRound: "Nov 2023",
    lastRoundHint: "Seed",
    founded: "Jan 2022",
    foundedHint: "4.1y old",
    headquarters: "San Francisco, CA, US",
    employees: "11-50",
    sectors: ["ai operations", "workflow automation", "b2b saas"],
    keywords: [
      "ai",
      "automation",
      "workflow",
      "operations",
      "agents",
      "productivity",
      "saas",
      "orchestration",
    ],
    keywordTotal: 18,
    rounds: [
      {
        date: "Nov 2023",
        round: "Seed",
        amount: "$7.5M",
        investors: ["York IE", "Operator Angels"],
      },
      {
        date: "Jun 2022",
        round: "Pre-seed",
        amount: "$3.2M",
        investors: ["Founder network", "Angels"],
      },
      {
        date: "Feb 2022",
        round: "Angel",
        amount: "$1.7M",
        investors: ["Angels"],
      },
    ],
    cumulativeRaisedMm: [1.7, 4.9, 12.4],
    news: [
      {
        title: "Operator AI launches agent workspace for ops teams",
        source: "OPERATOR AI",
        when: "5d ago",
      },
      {
        title: "York IE highlights Operator AI in portfolio update",
        source: "YORK IE",
        when: "2w ago",
      },
    ],
    publicLinks: [],
    similarCompanies: [
      { name: "UiPath", logo: "U", logoBg: "#FA4616" },
      { name: "Zapier", logo: "Z", logoBg: "#FF4A00" },
      { name: "Motion", logo: "M", logoBg: "#5B3A8C" },
      { name: "Adept", logo: "A", logoBg: "#1F6FEB" },
    ],
    dataSources: [
      { name: "Crunchbase", detail: "organizations", badge: "PUBLIC" },
      { name: "LinkedIn", detail: "company profile", badge: "PUBLIC" },
      { name: "fuel-data", detail: "external company profile" },
    ],
    advisorPoolTotal: 8,
  },
  "sync-sports": {
    companyId: "sync-sports",
    about:
      "Sync Sports connects athletes, clubs, and fans with real-time performance data, scheduling, and sponsorship workflows for modern sports organizations.",
    totalFunding: "$8.1M",
    fundingRoundsCount: "2",
    lastRound: "Aug 2023",
    lastRoundHint: "Seed",
    founded: "Mar 2021",
    foundedHint: "5.0y old",
    headquarters: "Austin, TX, US",
    employees: "11-50",
    sectors: ["sports tech", "fan engagement", "saas"],
    keywords: ["sports", "athletes", "clubs", "performance", "fans", "sponsorship"],
    keywordTotal: 14,
    rounds: [
      {
        date: "Aug 2023",
        round: "Seed",
        amount: "$6.0M",
        investors: ["York IE", "Sports angels"],
      },
      {
        date: "Oct 2021",
        round: "Pre-seed",
        amount: "$2.1M",
        investors: ["Founder network"],
      },
    ],
    cumulativeRaisedMm: [2.1, 8.1],
    news: [
      {
        title: "Sync Sports partners with regional collegiate athletic conferences",
        source: "SYNC SPORTS",
        when: "4d ago",
      },
    ],
    publicLinks: [],
    similarCompanies: [
      { name: "Hudl", logo: "H", logoBg: "#FF6600" },
      { name: "Teamworks", logo: "T", logoBg: "#0B5FFF" },
      { name: "Catapult", logo: "C", logoBg: "#111827" },
    ],
    dataSources: [
      { name: "Crunchbase", detail: "organizations", badge: "PUBLIC" },
      { name: "LinkedIn", detail: "company profile", badge: "PUBLIC" },
      { name: "fuel-data", detail: "external company profile" },
    ],
    advisorPoolTotal: 5,
  },
  winrate: {
    companyId: "winrate",
    about:
      "Winrate helps B2B revenue teams improve win probability with deal intelligence, coaching signals, and pipeline diagnostics.",
    totalFunding: "$9.6M",
    fundingRoundsCount: "2",
    lastRound: "Jan 2024",
    lastRoundHint: "Seed",
    founded: "May 2020",
    foundedHint: "5.8y old",
    headquarters: "New York, NY, US",
    employees: "11-50",
    sectors: ["sales tech", "revenue intelligence", "b2b saas"],
    keywords: ["sales", "pipeline", "win rate", "coaching", "crm", "revenue"],
    keywordTotal: 16,
    rounds: [
      {
        date: "Jan 2024",
        round: "Seed",
        amount: "$7.0M",
        investors: ["York IE", "GTM angels"],
      },
      {
        date: "Sep 2021",
        round: "Pre-seed",
        amount: "$2.6M",
        investors: ["Founder network"],
      },
    ],
    cumulativeRaisedMm: [2.6, 9.6],
    news: [
      {
        title: "Winrate ships deal-risk scoring for HubSpot and Salesforce",
        source: "WINRATE",
        when: "6d ago",
      },
    ],
    publicLinks: [],
    similarCompanies: [
      { name: "Gong", logo: "G", logoBg: "#7B61FF" },
      { name: "Clari", logo: "C", logoBg: "#FF5A5F" },
      { name: "Outreach", logo: "O", logoBg: "#5951FF" },
    ],
    dataSources: [
      { name: "Crunchbase", detail: "organizations", badge: "PUBLIC" },
      { name: "LinkedIn", detail: "company profile", badge: "PUBLIC" },
      { name: "fuel-data", detail: "external company profile" },
    ],
    advisorPoolTotal: 6,
  },
};

export function getThirdPartyOverview(companyId: string): ThirdPartyOverviewRecord | null {
  return THIRD_PARTY_OVERVIEW_BY_ID[companyId] ?? null;
}

export type ThirdPartyContextFeedItem = {
  id: string;
  title: string;
  description: string;
  source: string;
  when: string;
  logoSeed: string;
};

export type ThirdPartyIntelligenceSignal = {
  id: string;
  type: string;
  subtype: string;
  text: string;
  highlight: string;
  title: string;
  date: string;
  age: string;
  periodLabel: string;
};

const EMPTY_INTEL_COPY: { type: string; subtype: string; empty: string }[] = [
  {
    type: "retention",
    subtype: "Logo retention",
    empty: "No logo retention reported. Logo retention (% of customers who renew) is a leading indicator of product stickiness.",
  },
  {
    type: "retention",
    subtype: "Net revenue retention",
    empty: "No net revenue retention reported. NRR shows whether existing customers expand or shrink over time.",
  },
  {
    type: "efficiency",
    subtype: "Gross margin (blended)",
    empty: "No gross margin reported. Blended gross margin is a core efficiency signal for unit economics.",
  },
  {
    type: "growth",
    subtype: "Paid customers",
    empty: "No paid customer count reported. Paying logos help frame growth quality alongside ARR.",
  },
  {
    type: "growth",
    subtype: "ARR",
    empty: "No ARR reported. Annual recurring revenue anchors growth and efficiency benchmarks.",
  },
  {
    type: "finance",
    subtype: "Cash on hand",
    empty: "No cash on hand reported. Liquidity context matters for runway and fundraising timing.",
  },
  {
    type: "finance",
    subtype: "Monthly net burn",
    empty: "No monthly net burn reported. Burn vs cash on hand shapes runway estimates.",
  },
];

/** Public / fuel-data intelligence rows for third-party company Intelligence tab. */
export function buildThirdPartyPublicIntelligence(
  companyId: string,
  companyName: string,
): ThirdPartyIntelligenceSignal[] {
  const record = getThirdPartyOverview(companyId);
  const updatedAge = "This quarter";
  const date = "2026-Q3";
  const items: ThirdPartyIntelligenceSignal[] = [];

  if (record?.employees) {
    items.push({
      id: `intel-public-${companyId}-fte`,
      type: "team",
      subtype: "FTE headcount",
      text: "FTE headcount",
      highlight: record.employees,
      title: `${companyName} headcount`,
      date,
      age: updatedAge,
      periodLabel: "Q3 2026",
    });
  }

  if (record?.totalFunding) {
    items.push({
      id: `intel-public-${companyId}-capital`,
      type: "finance",
      subtype: "Total capital raised",
      text: "Total capital raised",
      highlight: record.totalFunding,
      title: `${companyName} total funding`,
      date,
      age: updatedAge,
      periodLabel: "Q3 2026",
    });
  }

  if (record?.lastRound) {
    items.push({
      id: `intel-public-${companyId}-round-stage`,
      type: "fundraising",
      subtype: "Round stage",
      text: "Round stage",
      highlight: record.rounds[0]?.round ?? record.lastRoundHint ?? record.lastRound,
      title: `${companyName} round stage`,
      date,
      age: updatedAge,
      periodLabel: "Q3 2026",
    });
    items.push({
      id: `intel-public-${companyId}-months-since`,
      type: "fundraising",
      subtype: "Months since last round",
      text: "Months since last round",
      highlight: record.lastRoundHint || record.lastRound,
      title: `${companyName} last round timing`,
      date,
      age: updatedAge,
      periodLabel: "Q3 2026",
    });
  }

  items.push({
    id: `intel-public-${companyId}-intros`,
    type: "fundraising",
    subtype: "Open to investor intros",
    text: "Open to investor intros",
    highlight: "No",
    title: `${companyName} investor intros`,
    date,
    age: updatedAge,
    periodLabel: "Q3 2026",
  });

  for (const row of EMPTY_INTEL_COPY) {
    items.push({
      id: `intel-public-${companyId}-${row.type}-${row.subtype.replace(/\W+/g, "-").toLowerCase()}`,
      type: row.type,
      subtype: row.subtype,
      text: row.subtype,
      highlight: row.empty,
      title: row.subtype,
      date,
      age: updatedAge,
      periodLabel: "Q3 2026",
    });
  }

  return items;
}

function expandNewsToContextFeed(
  companyId: string,
  companyName: string,
  news: ThirdPartyNewsItem[],
): ThirdPartyContextFeedItem[] {
  return news.map((item, index) => ({
    id: `ctx-${companyId}-${index}`,
    title: item.title,
    description: `${item.title} — reported for ${companyName}. Sourced from public market intelligence and fuel-data context for this external company.`,
    source: item.source.toLowerCase().includes(".") ? item.source.toLowerCase() : `${item.source.toLowerCase().replace(/\s+/g, "")}.com`,
    when: item.when,
    logoSeed: `${companyId}-news-${index}`,
  }));
}

const EXTRA_CONTEXT_BY_ID: Record<string, ThirdPartyContextFeedItem[]> = {
  swiggy: [
    {
      id: "ctx-swiggy-extra-1",
      title: "Swiggy scales Instamart dark stores ahead of festive demand",
      description:
        "Operational expansion continues as Swiggy densifies quick-commerce inventory nodes to protect delivery SLAs in tier-1 metros.",
      source: "livemint.com",
      when: "3w ago",
      logoSeed: "swiggy-extra-1",
    },
    {
      id: "ctx-swiggy-extra-2",
      title: "Food delivery comps watch Swiggy’s post-IPO capital allocation",
      description:
        "Investors are tracking how Swiggy balances contribution margin in food delivery against growth spend in Instamart and new categories.",
      source: "techcrunch.com",
      when: "1mo ago",
      logoSeed: "swiggy-extra-2",
    },
  ],
};

/** Context Feed cards for third-party companies (news + market updates). */
export function getThirdPartyContextFeed(
  companyId: string,
  companyName: string,
): ThirdPartyContextFeedItem[] {
  const record = getThirdPartyOverview(companyId);
  const fromNews = expandNewsToContextFeed(companyId, companyName, record?.news ?? []);
  const extras = EXTRA_CONTEXT_BY_ID[companyId] ?? [];
  if (fromNews.length || extras.length) return [...fromNews, ...extras];

  return [
    {
      id: `ctx-${companyId}-fallback-1`,
      title: `Public updates for ${companyName}`,
      description:
        "No curated context articles yet. Fuel will surface market news, product launches, and funding mentions here as sources connect.",
      source: "fuel-data",
      when: "—",
      logoSeed: `${companyId}-fallback`,
    },
  ];
}
