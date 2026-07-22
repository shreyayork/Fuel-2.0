import type { OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";

export type ScorecardCategory = "dev" | "mkt" | "rev";
export type DetailSectionId = ScorecardCategory | "profile";

export type DetailAnswers = Record<string, string>;

export type DetailQuestion = {
  id: string;
  prompt: string;
  options?: string[];
  subtitle?: string;
  kind?: "choice" | "text";
  placeholder?: string;
  group?: string;
  multi?: boolean;
  showWhen?: (answers: DetailAnswers) => boolean;
};

export type DetailSection = {
  id: DetailSectionId;
  title: string;
  subtitle: string;
  /** One-line scope shown on investor brief pillar cards — matches View details section. */
  definition?: string;
  icon: string;
  questions: DetailQuestion[];
};

export const DEV_PRODUCT_STAGES = [
  "Idea — not yet in development",
  "In active development",
  "Built — not yet launched",
  "Launched — early users or customers",
  "Launched — scaling usage or revenue",
] as const;

export const ONBOARDING_TRACK_FIELDS = [
  "dev_product_stage",
  "dev_product_type",
  "dev_delivery_constraint",
  "mkt_sales_motion",
  "mkt_funnel_gap",
  "mkt_icp_clarity",
  "mkt_revenue_tracking",
  "rev_runway",
  "rev_finance_management",
  "rev_capital_priority",
] as const;

export type OnboardingTrackField = (typeof ONBOARDING_TRACK_FIELDS)[number];

export type OnboardingTrackAnswers = Record<OnboardingTrackField, string>;

export const DETAIL_SECTIONS: DetailSection[] = [
  {
    id: "profile",
    title: "Profile",
    subtitle: "Enrichment & founder context",
    icon: "◆",
    questions: [
      {
        id: "profile_product_description",
        prompt: "Product description — wedge, ICP nuance, and why you win",
        kind: "text",
        placeholder: "What you build, who it's for, and what makes you different.",
      },
      {
        id: "profile_top_priorities",
        prompt: "Top 3 priorities this quarter",
        kind: "text",
        placeholder: "e.g. Launch v2, close 5 enterprise pilots, hire first AE",
      },
      {
        id: "profile_public_data_wrong",
        prompt: "Anything public data gets wrong about your business?",
        kind: "text",
        placeholder: "Optional — correct category, stage, headcount, or positioning.",
      },
      {
        id: "profile_biggest_risk",
        prompt: "Biggest risk you're managing right now",
        kind: "text",
        placeholder: "Optional — runway, product, GTM, team, or market risk.",
      },
    ],
  },
  {
    id: "dev",
    title: "R&D",
    subtitle: "Research & development",
    definition: "Your product and technical foundation — stage, team, ship cadence, and build quality.",
    icon: "⚙",
    questions: [
      {
        id: "dev_product_stage",
        prompt: "Where is your product today?",
        options: [...DEV_PRODUCT_STAGES],
      },
      {
        id: "dev_product_type",
        prompt: "What type of product are you building?",
        options: ["SaaS / web app", "Marketplace", "API or developer platform", "Other"],
      },
      {
        id: "dev_delivery_constraint",
        prompt: "What is the primary constraint slowing down your product delivery?",
        options: [
          "Planning and prioritization",
          "Capacity and hiring",
          "Quality and reliability",
          "Technical debt / Architecture",
        ],
      },
      {
        id: "dev_primary_customer",
        prompt: "Who is your primary customer for the product you're building?",
        options: [
          "End user and buyer are the same role",
          "User and buyer are different",
          "Still validating who the real buyer is",
          "Building for multiple segments — no focus yet",
        ],
      },
      {
        id: "dev_launch_timeline",
        prompt: "Target launch or next major release",
        subtitle: "Skip if already scaling usage or revenue.",
        options: [
          "Already live — no fixed date",
          "Within 3 months",
          "3–6 months",
          "6–12 months",
          "No target date yet",
        ],
        showWhen: answers => answers.dev_product_stage !== "Launched — scaling usage or revenue",
      },
      {
        id: "dev_build_model",
        prompt: "How is the product being built?",
        options: [
          "Founders building internally",
          "In-house engineering team",
          "Contract dev / agency",
          "Offshore or hybrid team",
          "Not building yet — manual or services first",
        ],
      },
      {
        id: "dev_engineering_size",
        prompt: "Engineering team size today",
        options: [
          "No engineers (founders only)",
          "1–3 engineers",
          "4–10 engineers",
          "11+ engineers",
        ],
      },
      {
        id: "dev_ship_cadence",
        prompt: "How do you ship releases today?",
        options: [
          "Ad hoc — no regular cadence",
          "Regular releases (e.g. weekly / biweekly)",
          "CI/CD with staged rollout",
          "Not shipping yet",
        ],
      },
      {
        id: "dev_ai_role",
        prompt: "Is AI core to what you're building?",
        options: ["Core to the product", "Important feature", "Exploring", "Not applicable"],
      },
      {
        id: "dev_compliance",
        prompt: "Do you need compliance / security for enterprise sales?",
        options: ["Not yet", "On roadmap (e.g. SOC 2, ISO)", "In progress", "Already certified"],
      },
      {
        id: "dev_prioritization",
        prompt: "How do you prioritize what to build next?",
        options: [
          "Data/Usage Analytics",
          "Customer Interviews",
          "Sales/Founder Intuition",
          "Ad-hoc / No formal process",
        ],
      },
      {
        id: "dev_feature_debt_split",
        prompt: "Roughly what % of your engineering time is spent on New Features vs. Bugs/Tech Debt?",
        options: [
          "Mostly New Features (80/20)",
          "Balanced (70/30)",
          "Heavy focus on Tech Debt/Bugs (50/50 or less)",
        ],
      },
      {
        id: "dev_eng_bottleneck",
        prompt: "Biggest engineering bottleneck right now",
        subtitle: "Select all that apply",
        multi: true,
        options: [
          "Planning and prioritization",
          "Code review / quality gates",
          "QA and testing",
          "Deployments and incidents",
          "Hiring and capacity",
          "Technical debt / architecture",
        ],
      },
    ],
  },
  {
    id: "mkt",
    title: "GTM",
    subtitle: "Go-to-market",
    definition: "How you sell and grow — motion, pipeline, ideal customer, pricing, and demand.",
    icon: "↗",
    questions: [
      {
        id: "mkt_sales_motion",
        prompt: "What is your primary go-to-market motion?",
        options: ["Sales-led", "Product-led", "Founder-led", "Not yet"],
      },
      {
        id: "mkt_funnel_gap",
        prompt: "Where are you losing the most ground?",
        subtitle: "Pick the stage where growth is stalling — demand, deals, or retention.",
        options: ["Awareness", "Conversion", "Retention"],
      },
      {
        id: "mkt_icp_clarity",
        prompt: "How clear is your ideal customer profile today?",
        subtitle: "Can your team describe who buys, why they buy, and who to disqualify?",
        options: [
          "Documented and shared",
          "Written ICP the team uses for targeting and qualification",
          "Clear in founder's head",
          "We know who fits, but it's not written or enforced yet",
          "Still a hypothesis",
          "Early signal from customers, but not validated",
          "Not defined yet",
          "Selling broadly or still figuring out who fits",
        ],
      },
      {
        id: "mkt_revenue_tracking",
        prompt: "How do you track and close revenue today?",
        options: [
          "CRM with a defined sales process",
          "CRM but informal process",
          "Spreadsheet or lightweight tracking",
          "No systematic pipeline yet",
        ],
      },
      {
        id: "mkt_deal_size",
        prompt: "Typical deal size (ACV band)",
        options: ["Under $5K", "$5K–$25K", "$25K–$100K", "Over $100K", "Not sure yet"],
      },
      {
        id: "mkt_pricing_model",
        prompt: "Primary pricing model",
        options: ["Flat subscription", "Usage-based", "Tiered / per seat", "Hybrid", "Still figuring out"],
      },
      {
        id: "mkt_demand_source",
        prompt: "Primary demand source today",
        options: [
          "Inbound / content",
          "Paid acquisition",
          "Outbound sales",
          "Product-led / self-serve",
          "Partners / channel",
          "Mix of channels",
          "Still figuring out",
        ],
      },
      {
        id: "mkt_sales_team",
        prompt: "Sales team today",
        options: [
          "Founder only",
          "Founder + 1 AE or SDR",
          "Small team (2–5 in sales)",
          "Larger sales org (6+)",
          "No sales hire yet",
        ],
      },
      {
        id: "mkt_marketing_capacity",
        prompt: "Marketing capacity today",
        options: [
          "No dedicated marketing — founders or sales cover it",
          "1 marketing generalist",
          "Small marketing team (2+)",
          "Agency or fractional support",
          "Not applicable yet",
        ],
      },
      {
        id: "mkt_cac_payback",
        prompt: "Do you track CAC payback today?",
        options: ["Yes — tracked regularly", "Rough estimate only", "Not yet"],
      },
      {
        id: "mkt_contract_length",
        prompt: "Primary contract length",
        options: ["Monthly", "Annual", "Multi-year", "Mix", "Not applicable yet"],
      },
      {
        id: "mkt_competitive_pressure",
        prompt: "How would you describe competitive pressure?",
        options: [
          "Low — category is early or we lead",
          "Moderate — several credible alternatives",
          "High — crowded market, price or feature pressure",
          "Not sure yet",
        ],
      },
      {
        id: "mkt_deal_stall",
        prompt: "Where do deals most often stall?",
        options: [
          "Before first meeting / demo",
          "After demo — no decision",
          "Late stage — legal, security, procurement",
          "Pricing or budget",
          "Not enough pipeline to tell",
        ],
        showWhen: answers => answers.mkt_funnel_gap === "Conversion",
      },
      {
        id: "mkt_pipeline_definitions",
        prompt: "Pipeline definitions",
        subtitle: "Documented MQL, SQL, and SAL criteria for the team.",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, documented and shared — We have written criteria that the team uses.",
          "Informal / Shared understanding — We have a general idea of what these terms mean, but it's not documented or strictly enforced.",
          "Not defined yet — We don't use these definitions or are still figuring out our pipeline stages.",
        ],
        showWhen: showAdvancedGtmAudit,
      },
      {
        id: "mkt_mql_sql_visibility",
        prompt: "Conversion visibility",
        subtitle: "MQL to SQL conversion rate tracking.",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, we track this regularly",
          "Rough estimate only",
          "Not tracking this currently",
        ],
        showWhen: showAdvancedGtmAudit,
      },
      {
        id: "mkt_pricing_governance",
        prompt: "Pricing & discounting governance",
        subtitle: "CPQ tool or defined approval workflow.",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, structured process/tool in place",
          "Informal / Manual process",
          "No specific process yet",
        ],
        showWhen: showAdvancedGtmAudit,
      },
      {
        id: "mkt_cross_functional_slas",
        prompt: "Cross-functional alignment",
        subtitle: "SLAs between Marketing/SDR and AE teams.",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, defined and tracked",
          "Informal / Verbal agreements",
          "No, we don't have these agreements",
        ],
        showWhen: showAdvancedGtmAudit,
      },
    ],
  },
  {
    id: "rev",
    title: "G&A",
    subtitle: "General & administrative",
    definition: "How you run the business day to day — cash, runway, finance, and capital plans.",
    icon: "◎",
    questions: [
      {
        id: "rev_runway",
        prompt: "How long is your current runway?",
        options: ["Under 6 months", "6–12 months", "12–18 months", "Over 18 months"],
      },
      {
        id: "rev_finance_management",
        prompt: "How do you manage company finances today?",
        options: [
          "Accounting software with regular close",
          "Spreadsheet + accountant or bookkeeper",
          "Founder-managed / informal",
          "Not set up yet",
        ],
      },
      {
        id: "rev_capital_priority",
        prompt: "What's your near-term capital and reporting priority?",
        options: [
          "Actively fundraising",
          "Open to investor introductions",
          "Focused on extending runway / reaching profitability",
          "Not focused on capital right now",
        ],
      },
      {
        id: "rev_twelve_month_goal",
        prompt: "What are you optimizing for in the next 12 months?",
        options: [
          "Raise next round",
          "Extend runway / reach profitability",
          "Scale growth with current capital",
          "Explore strategic options (M&A, partnerships)",
          "Not sure yet",
        ],
      },
      {
        id: "rev_unit_economics",
        prompt: "How do you track your unit economics (e.g., CAC, LTV, Payback)?",
        options: [
          "Real-time / Automated",
          "Monthly / Spreadsheet-based",
          "Rough manual estimates",
          "Not yet",
        ],
      },
      {
        id: "rev_forecast",
        prompt: "Do you have a forward-looking financial forecast (budget) that you update regularly?",
        options: [
          "Yes, monthly rolling forecast",
          "Yes, static annual budget",
          "No, we track historicals only",
        ],
      },
      {
        id: "rev_cap_table",
        prompt: "How do you manage your Cap Table and equity?",
        options: [
          "Cap table software (e.g., Carta, Pulley)",
          "Spreadsheet-based",
          "Not managed yet",
        ],
      },
      {
        id: "rev_operating_mode",
        prompt: "Current operating mode",
        options: [
          "Growth-first",
          "Balanced growth and efficiency",
          "Efficiency / path to profitability",
        ],
      },
      {
        id: "rev_team_size",
        prompt: "Total team size (FTE)",
        options: ["1–5", "6–15", "16–50", "50+"],
      },
      {
        id: "rev_hiring_plans",
        prompt: "Hiring plans for the next 6 months",
        options: [
          "Hiring aggressively",
          "Selective hires only",
          "Hiring freeze / defer",
          "Not sure yet",
        ],
      },
      {
        id: "rev_board_reporting",
        prompt: "Board / investor reporting cadence",
        options: [
          "Monthly updates",
          "Quarterly board / investor reporting",
          "Ad hoc only",
          "No investors or board yet",
        ],
      },
      {
        id: "rev_segment_economics",
        prompt: "Do you know revenue or cost by customer segment?",
        options: [
          "Yes — tracked by segment",
          "Partially — some segments only",
          "Not yet — single blended view",
          "Not applicable — pre-revenue",
        ],
        showWhen: answers => !isPreRevenue(answers),
      },
      {
        id: "rev_raise_needs",
        prompt: "What do you need most for your raise?",
        options: [
          "Investor narrative and deck",
          "Metrics and data room",
          "Introductions",
          "Financial model and use of funds",
          "Process and timeline discipline",
          "All of the above",
        ],
        showWhen: answers =>
          answers.rev_capital_priority === "Actively fundraising"
          || answers.rev_twelve_month_goal === "Raise next round",
      },
    ],
  },
];

export const TRACK_DETAIL_SECTIONS = DETAIL_SECTIONS.filter(
  (s): s is DetailSection & { id: ScorecardCategory } => s.id !== "profile",
);

export function showAdvancedGtmAudit(answers: DetailAnswers): boolean {
  return answers.dev_product_stage === "Launched — scaling usage or revenue"
    || answers.mkt_sales_team === "Small team (2–5 in sales)"
    || answers.mkt_sales_team === "Larger sales org (6+)";
}

export function isPreRevenue(answers: DetailAnswers, benchmark?: OnboardingBenchmarkInput): boolean {
  const earlyStage = answers.dev_product_stage === "Idea — not yet in development"
    || answers.dev_product_stage === "In active development"
    || answers.dev_product_stage === "Built — not yet launched";
  if (earlyStage) return true;
  const arr = benchmark?.arr?.replace(/[^0-9.]/g, "");
  if (arr && Number(arr) > 0) return false;
  return false;
}

export function isQuestionVisible(question: DetailQuestion, answers: DetailAnswers): boolean {
  return question.showWhen ? question.showWhen(answers) : true;
}

export function getVisibleQuestions(section: DetailSection, answers: DetailAnswers): DetailQuestion[] {
  return section.questions.filter(q => isQuestionVisible(q, answers));
}

export function countApplicableQuestions(answers: DetailAnswers, sectionId?: DetailSectionId): number {
  const sections = sectionId
    ? DETAIL_SECTIONS.filter(s => s.id === sectionId)
    : DETAIL_SECTIONS;
  return sections.reduce(
    (n, section) => n + getVisibleQuestions(section, answers).length,
    0,
  );
}

export function countSectionAnswers(section: DetailSection, answers: DetailAnswers): number {
  return getVisibleQuestions(section, answers).filter(q => answers[q.id]?.trim()).length;
}

export function countDetailAnswers(answers: DetailAnswers): number {
  return DETAIL_SECTIONS.flatMap(s => getVisibleQuestions(s, answers))
    .filter(q => answers[q.id]?.trim())
    .length;
}

export function mapOnboardingToDetailAnswers(
  track: Partial<OnboardingTrackAnswers>,
  profile?: { productDescription?: string; approxHeadcount?: string },
): DetailAnswers {
  const out: DetailAnswers = {};
  const put = (id: string, value?: string) => {
    if (value?.trim()) out[id] = value.trim();
  };

  ONBOARDING_TRACK_FIELDS.forEach(key => put(key, track[key]));

  put("profile_product_description", profile?.productDescription);
  if (profile?.approxHeadcount?.trim()) {
    const band = headcountToTeamSizeBand(profile.approxHeadcount);
    if (band) put("rev_team_size", band);
  }

  return out;
}

export function emptyOnboardingTrackAnswers(): OnboardingTrackAnswers {
  return Object.fromEntries(ONBOARDING_TRACK_FIELDS.map(k => [k, ""])) as OnboardingTrackAnswers;
}

export const DETAIL_MULTI_DELIMITER = " · ";

export function parseMultiSelectAnswer(value?: string): string[] {
  if (!value?.trim()) return [];
  return value.split(DETAIL_MULTI_DELIMITER).map(s => s.trim()).filter(Boolean);
}

export function toggleMultiSelectAnswer(current: string | undefined, option: string): string {
  const selected = parseMultiSelectAnswer(current);
  const next = selected.includes(option)
    ? selected.filter(s => s !== option)
    : [...selected, option];
  return next.join(DETAIL_MULTI_DELIMITER);
}

export function isMultiSelectSelected(value: string | undefined, option: string): boolean {
  return parseMultiSelectAnswer(value).includes(option);
}

export const DETAIL_QUESTION_BY_ID: Record<string, DetailQuestion> = Object.fromEntries(
  DETAIL_SECTIONS.flatMap(s => s.questions.map(q => [q.id, q])),
);

function headcountToTeamSizeBand(raw: string): string | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  if (!n) return null;
  if (n <= 5) return "1–5";
  if (n <= 15) return "6–15";
  if (n <= 50) return "16–50";
  return "50+";
}

export const DETAIL_QUESTION_LABEL: Partial<Record<string, string>> = {
  profile_product_description: "Product description",
  profile_top_priorities: "Top priorities",
  profile_public_data_wrong: "Public data corrections",
  profile_biggest_risk: "Biggest risk",
  dev_product_stage: "Product stage",
  dev_product_type: "Product type",
  dev_delivery_constraint: "Delivery constraint",
  dev_primary_customer: "Primary customer",
  dev_launch_timeline: "Launch timeline",
  dev_build_model: "Build model",
  dev_engineering_size: "Engineering size",
  dev_ship_cadence: "Ship cadence",
  dev_ai_role: "AI Role",
  dev_compliance: "Compliance",
  dev_prioritization: "Prioritization",
  dev_feature_debt_split: "Feature vs debt split",
  dev_eng_bottleneck: "Engineering bottleneck",
  mkt_sales_motion: "GTM motion",
  mkt_funnel_gap: "Funnel gap",
  mkt_icp_clarity: "ICP clarity",
  mkt_revenue_tracking: "Revenue tracking",
  mkt_deal_size: "Deal size",
  mkt_pricing_model: "Pricing model",
  mkt_demand_source: "Demand source",
  mkt_sales_team: "Sales team",
  mkt_marketing_capacity: "Marketing capacity",
  mkt_cac_payback: "CAC payback",
  mkt_contract_length: "Contract length",
  mkt_competitive_pressure: "Competitive pressure",
  mkt_deal_stall: "Deal stall point",
  mkt_pipeline_definitions: "Pipeline definitions",
  mkt_mql_sql_visibility: "MQL→SQL visibility",
  mkt_pricing_governance: "Pricing governance",
  mkt_cross_functional_slas: "Cross-functional SLAs",
  rev_runway: "Runway",
  rev_finance_management: "Finance management",
  rev_capital_priority: "Capital priority",
  rev_twelve_month_goal: "12-month goal",
  rev_unit_economics: "Unit economics",
  rev_forecast: "Forecast",
  rev_cap_table: "Cap table",
  rev_operating_mode: "Operating mode",
  rev_team_size: "Team size",
  rev_hiring_plans: "Hiring plans",
  rev_board_reporting: "Board reporting",
  rev_segment_economics: "Segment economics",
  rev_raise_needs: "Raise needs",
};
