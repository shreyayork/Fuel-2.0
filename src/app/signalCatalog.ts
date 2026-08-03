export type SignalCategory = {
  key: string;
  label: string;
  icon: string;
  signals: SignalDef[];
};

export type SignalDef = {
  name: string;
  unit?: string;
};

export const SIGNAL_CATALOG: SignalCategory[] = [
  {
    key: "growth",
    label: "Growth",
    icon: "↑",
    signals: [
      { name: "ARR", unit: "usd" },
      { name: "ARR growth (QoQ)", unit: "pct" },
      { name: "ARR growth (YoY)", unit: "pct" },
      { name: "Churned logos", unit: "count" },
      { name: "Expansion ARR", unit: "usd" },
      { name: "Expansion ARR share", unit: "pct" },
      { name: "Growth endurance", unit: "pct" },
      { name: "MRR", unit: "usd" },
      { name: "New ARR (total)", unit: "usd" },
      { name: "New logo ARR", unit: "usd" },
      { name: "New logos", unit: "count" },
      { name: "Paid customers", unit: "count" },
      { name: "Planned ARR growth", unit: "pct" },
    ],
  },
  {
    key: "retention",
    label: "Retention",
    icon: "◈",
    signals: [
      { name: "ARR downsell rate", unit: "pct" },
      { name: "Churn rate", unit: "pct" },
      { name: "Gross ARR churn", unit: "pct" },
      { name: "Gross revenue retention", unit: "pct" },
      { name: "Logo retention", unit: "pct" },
      { name: "Net revenue retention", unit: "pct" },
      { name: "NRR calculation basis" },
      { name: "Upsell / expansion rate", unit: "pct" },
    ],
  },
  {
    key: "efficiency",
    label: "Efficiency",
    icon: "⊘",
    signals: [
      { name: "Blended CAC ratio", unit: "ratio" },
      { name: "Burn multiple", unit: "ratio" },
      { name: "CAC payback", unit: "months" },
      { name: "Expansion CAC ratio", unit: "ratio" },
      { name: "Fully-loaded CAC payback", unit: "months" },
      { name: "Gross magic number", unit: "ratio" },
      { name: "Gross margin (blended)", unit: "pct" },
      { name: "LTV / CAC", unit: "ratio" },
      { name: "Net magic number", unit: "ratio" },
      { name: "New customer CAC ratio", unit: "ratio" },
      { name: "New-only CAC payback", unit: "months" },
      { name: "Rule of 40", unit: "pct" },
      { name: "Services gross margin", unit: "pct" },
      { name: "Subscription gross margin", unit: "pct" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: "$",
    signals: [
      { name: "ARR : capital raised", unit: "ratio" },
      { name: "Cash on hand", unit: "usd" },
      { name: "EBITDA margin", unit: "pct" },
      { name: "Free cash flow margin", unit: "pct" },
      { name: "G&A % of revenue", unit: "pct" },
      { name: "Monthly net burn", unit: "usd" },
      { name: "R&D % of revenue", unit: "pct" },
      { name: "Runway", unit: "months" },
      { name: "S&M % of revenue", unit: "pct" },
      { name: "Services revenue share", unit: "pct" },
      { name: "Subscription revenue share", unit: "pct" },
      { name: "Total capital raised", unit: "usd" },
    ],
  },
  {
    key: "fundraising",
    label: "Fundraising",
    icon: "◇",
    signals: [
      { name: "Actively fundraising" },
      { name: "Committed so far", unit: "usd" },
      { name: "Discount", unit: "pct" },
      { name: "EV / ARR multiple at last round", unit: "ratio" },
      { name: "Fundraise timing" },
      { name: "Investor intros wanted" },
      { name: "Lead investor" },
      { name: "Months since last round", unit: "months" },
      { name: "Open to investor intros" },
      { name: "Pre-money at last round", unit: "usd" },
      { name: "Round stage" },
      { name: "Round type" },
      { name: "Target close date" },
      { name: "Target investors" },
      { name: "Target post-money", unit: "usd" },
      { name: "Target pre-money", unit: "usd" },
      { name: "Target round size", unit: "usd" },
      { name: "Valuation cap", unit: "usd" },
    ],
  },
  {
    key: "gtm",
    label: "Go to market",
    icon: "→",
    signals: [
      { name: "ACV", unit: "usd" },
      { name: "AE productivity (new ARR / AE)", unit: "usd" },
      { name: "AE quota (fully-ramped)", unit: "usd" },
      { name: "Average deal size", unit: "usd" },
      { name: "Channel / GTM challenges" },
      { name: "Competitive pressure" },
      { name: "Notable customers (period)" },
      { name: "Pipeline coverage", unit: "ratio" },
      { name: "Pricing model" },
      { name: "Primary contract length", unit: "months" },
      { name: "Primary GTM motion" },
      { name: "Quota attainment rate", unit: "pct" },
      { name: "Sales cycle length", unit: "days" },
      { name: "Win rate", unit: "pct" },
    ],
  },
  {
    key: "product",
    label: "Product",
    icon: "⚙",
    signals: [
      { name: "AI classification" },
      { name: "AI monetization status" },
      { name: "AI spend change (YoY)", unit: "pct" },
      { name: "Daily active users", unit: "count" },
      { name: "DAU / MAU stickiness", unit: "ratio" },
      { name: "Feature adoption", unit: "pct" },
      { name: "Monthly active users", unit: "count" },
      { name: "NPS", unit: "score" },
      { name: "Product portfolio breadth", unit: "count" },
    ],
  },
  {
    key: "team",
    label: "Team",
    icon: "○",
    signals: [
      { name: "AE headcount", unit: "count" },
      { name: "ARR per FTE", unit: "usd" },
      { name: "CSM headcount", unit: "count" },
      { name: "Culture concerns" },
      { name: "Engineering headcount", unit: "count" },
      { name: "Executive departures", unit: "count" },
      { name: "FTE headcount", unit: "count" },
      { name: "Hiring challenges" },
      { name: "Hiring needs" },
      { name: "Notable hires (period)" },
      { name: "Sales headcount", unit: "count" },
      { name: "SDR/BDR headcount", unit: "count" },
    ],
  },
  {
    key: "strategic",
    label: "Strategic",
    icon: "◉",
    signals: [
      { name: "Competitive moat" },
      { name: "Financing source" },
      { name: "Key opportunities" },
      { name: "Key risks" },
      { name: "Market shifts" },
      { name: "Software sector" },
    ],
  },
  {
    key: "customer_success",
    label: "Customer Success",
    icon: "◎",
    signals: [
      { name: "ARR by customer segment" },
      { name: "ARR by geography" },
      { name: "CSM book of business", unit: "usd" },
    ],
  },
  {
    key: "board_reporting",
    label: "Board Reporting",
    icon: "▣",
    signals: [
      { name: "Challenges (period)" },
      { name: "EBITDA-breakeven reached" },
      { name: "Forecast optimism", unit: "pct" },
      { name: "Meets Rule of 40" },
      { name: "Other updates (period)" },
    ],
  },
  {
    key: "vendor_stack",
    label: "Vendor Stack",
    icon: "⊞",
    signals: [
      { name: "Banking partner" },
      { name: "Cap table platform" },
      { name: "Cloud provider" },
      { name: "CRM platform" },
      { name: "D&O insurance provider" },
      { name: "Legal counsel" },
    ],
  },
];

export const SIGNAL_CATALOG_BY_KEY: Record<string, SignalCategory> = Object.fromEntries(
  SIGNAL_CATALOG.map(cat => [cat.key, cat]),
);

/** Signals for a given category key, in catalog order */
export function getSignalsForCategory(categoryKey: string): SignalDef[] {
  return SIGNAL_CATALOG_BY_KEY[categoryKey]?.signals ?? [];
}

/** All category keys in priority display order */
export const SIGNAL_CATEGORY_KEYS = SIGNAL_CATALOG.map(c => c.key);
