import { formatOnboardAnswerDisplay } from "@/lib/onboard/unknown-answer";

export type ScorecardCategory = "dev" | "mkt" | "rev";
export type DetailSectionId = ScorecardCategory | "profile" | "context";
export type DetailDrawerStep = DetailSectionId | "benchmark";

export type DetailAnswers = Record<string, string | null | undefined>;

/** Design `trackQuestions.ts` — text fields are not all textareas. */
export type DetailTextInputType = "short" | "year" | "url" | "count" | "textarea" | "funding_rounds";

/** Digits-only integer string for headcount / count inputs. */
export function filterCountInput(raw: string, maxDigits = 8): string {
  return raw.replace(/\D/g, "").slice(0, maxDigits);
}

export type DetailQuestion = {
  id: string;
  prompt: string;
  options?: string[];
  subtitle?: string;
  kind?: "choice" | "text";
  inputType?: DetailTextInputType;
  rows?: number;
  placeholder?: string;
  group?: string;
  multi?: boolean;
  /** When false, drawer/onboarding omit "I don't know / NA". Default true for choice. */
  allowUnknown?: boolean;
  showWhen?: (answers: DetailAnswers) => boolean;
};

export function resolveTextInputType(question: DetailQuestion): DetailTextInputType {
  if (question.inputType) return question.inputType;
  return "textarea";
}

export const PROFILE_FUNDING_ROUND_TYPES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Bridge",
  "Grant",
  "Revenue-based",
] as const;

export type ProfileFundingRound = {
  id: string;
  type: string;
  amount: string;
  date: string;
  investors: string;
};

export function parseProfileFundingRounds(value?: string | null): ProfileFundingRound[] {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value) as ProfileFundingRound[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeProfileFundingRounds(rounds: ProfileFundingRound[]): string {
  return rounds.length > 0 ? JSON.stringify(rounds) : "";
}

export type DetailSection = {
  id: DetailSectionId;
  title: string;
  subtitle: string;
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

export const DEV_PRODUCT_TYPES = [
  "SaaS Platform",
  "AI Application",
  "AI Infrastructure",
  "Marketplace",
  "Developer Platform / API",
  "Mobile App",
  "Hardware / IoT",
  "Other",
] as const;

export const DEV_DELIVERY_CONSTRAINTS = [
  "Planning and prioritization",
  "Capacity and hiring",
  "Quality and reliability",
  "Technical debt / Architecture",
] as const;

export const MKT_SALES_MOTIONS = [
  "Sales-led",
  "Product-led",
  "Founder-led",
  "Not yet defined",
  "Other",
] as const;

export const MKT_GROWTH_BOTTLENECKS = [
  "Not enough awareness",
  "Not enough qualified pipeline",
  "Too few opportunities convert",
  "Customers aren't expanding or renewing",
  "Unsure",
] as const;

export const MKT_ICP_CLARITY_OPTIONS = [
  "Documented and shared - Written ICP the team uses for targeting and qualification",
  "Clear in founder's head - We know who fits, but it's not written or enforced yet",
  "Still a hypothesis - Early signal from customers, but not validated",
  "Not defined yet - Selling broadly or still figuring out who fits",
] as const;

export const MKT_REVENUE_TRACKING_OPTIONS = [
  "CRM with a defined sales process",
  "CRM but informal process",
  "Spreadsheet or lightweight tracking",
  "No systematic pipeline yet",
] as const;

export const REV_RUNWAY_OPTIONS = [
  "Under 6 months",
  "6–12 months",
  "12–18 months",
  "Over 18 months",
] as const;

export const REV_FINANCE_MANAGEMENT_OPTIONS = [
  "Dedicated finance leader",
  "Outsourced finance/accounting",
  "Founder manages finances",
  "Minimal financial processes",
] as const;

export const REV_CAPITAL_PRIORITY_OPTIONS = [
  "Actively fundraising",
  "Open to investor introductions",
  "Focused on extending runway / reaching profitability",
  "Not focused on capital right now",
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

export const ONBOARDING_MODULE_FIELDS: Record<
  Exclude<import("@/lib/credits/profile-modules").ProfileModuleId, "company">,
  readonly OnboardingTrackField[]
> = {
  dev: ["dev_product_stage", "dev_product_type", "dev_delivery_constraint"],
  gtm: ["mkt_sales_motion", "mkt_funnel_gap", "mkt_icp_clarity", "mkt_revenue_tracking"],
  rev: ["rev_runway", "rev_finance_management", "rev_capital_priority"],
};

export const MANDATORY_PROFILE_QUESTION_IDS = [
  "profile_company",
  "profile_product_description",
  "profile_industry",
] as const;

export function isOnboardingTrackAnswered(
  module: Exclude<import("@/lib/credits/profile-modules").ProfileModuleId, "company">,
  answers: Record<string, string | undefined | null>,
): boolean {
  return ONBOARDING_MODULE_FIELDS[module].every((id) => {
    const q = DETAIL_QUESTION_BY_ID[id];
    if (q?.kind === "text" || !q?.options) return Boolean(answers[id]?.trim());
    return isChoiceAnswerComplete(answers[id] ?? undefined, q.options);
  });
}

export function hasMandatoryProfileAnswers(answers: Record<string, string | undefined | null>): boolean {
  return MANDATORY_PROFILE_QUESTION_IDS.every((id) => Boolean(answers[id]?.trim()));
}

export function completedOnboardingModules(answers: Record<string, string | undefined | null>): Array<
  import("@/lib/credits/profile-modules").ProfileModuleId
> {
  const modules: Array<import("@/lib/credits/profile-modules").ProfileModuleId> = [];
  if (hasMandatoryProfileAnswers(answers)) modules.push("company");
  (["dev", "gtm", "rev"] as const).forEach((id) => {
    if (isOnboardingTrackAnswered(id, answers)) modules.push(id);
  });
  return modules;
}

export function creditUnlockQuestionIds(sectionId: DetailDrawerStep): readonly string[] {
  if (sectionId === "profile") return MANDATORY_PROFILE_QUESTION_IDS;
  if (sectionId === "dev") return ONBOARDING_MODULE_FIELDS.dev;
  if (sectionId === "mkt") return ONBOARDING_MODULE_FIELDS.gtm;
  if (sectionId === "rev") return ONBOARDING_MODULE_FIELDS.rev;
  return [];
}

export function partitionCreditQuestions(
  sectionId: DetailDrawerStep,
  questions: DetailQuestion[],
): { credit: DetailQuestion[]; extra: DetailQuestion[] } {
  const orderedIds = creditUnlockQuestionIds(sectionId);
  if (orderedIds.length === 0) return { credit: [], extra: questions };
  const idSet = new Set(orderedIds);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const credit = orderedIds
    .map((id) => byId.get(id))
    .filter((question): question is DetailQuestion => Boolean(question));
  const extra = questions.filter((question) => !idSet.has(question.id));
  return { credit, extra };
}

/** Max length for free-text after selecting an Other option (matches claim schema). */
export const OTHER_SPECIFY_MAX_LENGTH = 500;

/**
 * Options that should reveal a free-text specify field when selected.
 * Matches plain "Other" and "Other (please specify)" (any casing).
 */
export function isOtherSpecifyOption(option: string): boolean {
  const trimmed = option.trim();
  return /^other$/i.test(trimmed) || /^other \(please specify\)$/i.test(trimmed);
}

export function findOtherSpecifyOption(
  options: readonly string[] | undefined,
): string | undefined {
  return options?.find((opt) => isOtherSpecifyOption(opt));
}

/** True when the stored answer is the Other option, with or without custom text. */
export function isOtherSpecifySelected(
  answer: string | undefined,
  otherOpt: string,
): boolean {
  const value = (answer ?? "").trim();
  if (!value) return false;
  return value === otherOpt || value.startsWith(`${otherOpt}:`);
}

/** Extract the free-text portion from `Other` / `Other (please specify): …`. */
export function parseOtherSpecifyText(
  answer: string | undefined,
  otherOpt: string,
): string {
  const value = answer ?? "";
  const prefix = `${otherOpt}:`;
  if (value.startsWith(prefix)) return value.slice(prefix.length).replace(/^\s+/, "");
  return "";
}

/** Persist Other + optional custom text as a single answer string. */
export function formatOtherSpecifyAnswer(otherOpt: string, text: string): string {
  const trimmed = text.trim().slice(0, OTHER_SPECIFY_MAX_LENGTH);
  return trimmed ? `${otherOpt}: ${trimmed}` : otherOpt;
}

/** Other selected but no custom text yet → incomplete for advance / credit. */
export function isOtherSpecifyComplete(
  answer: string | undefined,
  otherOpt: string,
): boolean {
  return parseOtherSpecifyText(answer, otherOpt).trim().length > 0;
}

/**
 * Choice answer is complete: non-empty, and if Other is selected the specify
 * text is non-empty. Unknown / NA counts as answered via `isAnswered`.
 */
export function isChoiceAnswerComplete(
  answer: string | undefined,
  options: readonly string[] | undefined,
): boolean {
  if (!answer?.trim()) return false;
  const otherOpt = findOtherSpecifyOption(options);
  if (!otherOpt) return true;
  const otherPart =
    parseMultiSelectAnswer(answer).find((part) =>
      isOtherSpecifySelected(part, otherOpt),
    ) ?? (isOtherSpecifySelected(answer, otherOpt) ? answer : undefined);
  if (!otherPart) return true;
  return isOtherSpecifyComplete(otherPart, otherOpt);
}

export const DRAWER_TABS: { id: DetailDrawerStep; label: string }[] = [
  { id: "profile", label: "Company" },
  { id: "context", label: "Context" },
  { id: "dev", label: "R&D" },
  { id: "mkt", label: "GTM" },
  { id: "rev", label: "G&A" },
  { id: "benchmark", label: "Benchmark" },
];

export const BENCHMARK_STEP = {
  id: "benchmark" as const,
  title: "Benchmark",
  subtitle: "Optional — compare metrics",
  icon: "▦",
};

export const DETAIL_SECTIONS: DetailSection[] = [
  {
    id: "profile",
    title: "Company",
    subtitle: "Company identity and public profile",
    icon: "◆",
    questions: [
      {
        id: "profile_company",
        prompt: "Company",
        kind: "text",
        inputType: "short",
        placeholder: "Company legal or brand name",
      },
      {
        id: "profile_product_description",
        prompt: "What they do",
        kind: "text",
        inputType: "textarea",
        rows: 3,
        placeholder: "What you build, who it's for, and what makes you different.",
      },
      {
        id: "profile_industry",
        prompt: "Industry",
        kind: "text",
        inputType: "short",
        placeholder: "e.g. FinTech · Payments",
      },
      {
        id: "profile_founded",
        prompt: "Founded",
        kind: "text",
        inputType: "year",
        group: "Founded & city",
        placeholder: "e.g. 2021",
      },
      {
        id: "profile_city",
        prompt: "City",
        kind: "text",
        inputType: "short",
        group: "Founded & city",
        placeholder: "e.g. Boston",
      },
      {
        id: "profile_state",
        prompt: "State / region",
        kind: "text",
        inputType: "short",
        group: "State & country",
        placeholder: "e.g. MA",
      },
      {
        id: "profile_country",
        prompt: "Country",
        kind: "text",
        inputType: "short",
        group: "State & country",
        placeholder: "e.g. United States",
      },
      {
        id: "profile_website",
        prompt: "Website",
        kind: "text",
        inputType: "url",
        placeholder: "https://example.com",
      },
      {
        id: "profile_linkedin",
        prompt: "LinkedIn",
        kind: "text",
        inputType: "url",
        placeholder: "https://www.linkedin.com/company/…",
      },
      {
        id: "profile_headcount",
        prompt: "Headcount (full-time employees)",
        kind: "text",
        inputType: "count",
        placeholder: "e.g. 18",
      },
      {
        id: "profile_funding_rounds",
        prompt: "Funding rounds",
        kind: "text",
        inputType: "funding_rounds",
      },
      {
        id: "profile_additional_context",
        prompt: "Additional context",
        kind: "text",
        inputType: "textarea",
        rows: 3,
        placeholder: "Customers, priorities, markets, or anything Fuel should remember.",
      },
    ],
  },
  {
    id: "context",
    title: "Context",
    subtitle: "Priorities, corrections, and current risk",
    icon: "◇",
    questions: [
      {
        id: "profile_product_description",
        prompt: "Product description — wedge, ICP nuance, and why you win",
        kind: "text",
        inputType: "textarea",
        rows: 3,
        placeholder: "What you build, who it's for, and what makes you different.",
      },
      {
        id: "profile_top_priorities",
        prompt: "Top 3 priorities this quarter",
        kind: "text",
        inputType: "textarea",
        rows: 3,
        placeholder: "e.g. Launch v2, close 5 enterprise pilots, hire first AE",
      },
      {
        id: "profile_public_data_wrong",
        prompt: "Anything public data gets wrong about your business?",
        kind: "text",
        inputType: "textarea",
        rows: 2,
        placeholder: "Optional — correct category, stage, headcount, or positioning.",
      },
      {
        id: "profile_biggest_risk",
        prompt: "Biggest risk you're managing right now",
        kind: "text",
        inputType: "textarea",
        rows: 2,
        placeholder: "Optional — runway, product, go-to-market, team, or market risk.",
      },
    ],
  },
  {
    id: "dev",
    title: "R&D",
    subtitle: "Research & development",
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
        options: [...DEV_PRODUCT_TYPES],
        allowUnknown: false,
      },
      {
        id: "dev_delivery_constraint",
        prompt: "What is the primary constraint slowing down your product delivery?",
        options: [...DEV_DELIVERY_CONSTRAINTS],
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
        prompt: "What is your target launch or next major release date?",
        options: [
          "Already live — no fixed date",
          "Within 3 months",
          "3–6 months",
          "6–12 months",
          "No target date yet",
        ],
        allowUnknown: false,
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
        prompt: "What is your current engineering team size?",
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
        prompt: "How is AI being used in your product?",
        options: [
          "AI is our core product",
          "AI powers major features",
          "AI improves internal operations",
          "Experimenting",
          "No AI today",
        ],
      },
      {
        id: "dev_compliance",
        prompt: "Do you need compliance or security certifications for enterprise sales?",
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
        id: "dev_eng_bottleneck",
        prompt: "What is your biggest engineering bottleneck right now?",
        options: [
          "Planning and prioritization",
          "Code review / quality gates",
          "QA and testing",
          "Deployments and incidents",
          "Hiring and capacity",
          "Technical debt / architecture",
        ],
      },
      {
        id: "dev_feature_debt_split",
        prompt: "What percentage of engineering time is spent on new features vs. bugs/tech debt?",
        options: [
          "Mostly New Features (80/20)",
          "Balanced (70/30)",
          "Heavy focus on Tech Debt/Bugs (50/50 or less)",
        ],
      },
      {
        id: "dev_six_month_impact",
        prompt: "Which of these would create the biggest impact for your company over the next six months?",
        subtitle: "Select all that apply",
        multi: true,
        options: [
          "Ship product faster",
          "Improve product quality",
          "Reduce engineering costs",
          "Hire engineering talent",
          "Implement AI",
          "Improve product strategy",
          "Modernize architecture",
          "Prepare for enterprise customers",
        ],
      },
    ],
  },
  {
    id: "mkt",
    title: "GTM",
    subtitle: "Go to Market",
    icon: "↗",
    questions: [
      {
        id: "mkt_sales_motion",
        prompt: "What is your primary go-to-market motion?",
        options: [...MKT_SALES_MOTIONS],
      },
      {
        id: "mkt_funnel_gap",
        prompt: "Where is your biggest growth bottleneck today?",
        options: [...MKT_GROWTH_BOTTLENECKS],
      },
      {
        id: "mkt_icp_clarity",
        prompt: "How clear is your ideal customer profile, including who buys and why?",
        options: [...MKT_ICP_CLARITY_OPTIONS],
      },
      {
        id: "mkt_revenue_tracking",
        prompt: "How do you track and close revenue today?",
        options: [...MKT_REVENUE_TRACKING_OPTIONS],
      },
      {
        id: "mkt_pricing_model",
        prompt: "What is your primary pricing model?",
        options: [
          "Flat subscription",
          "Usage-based",
          "Tiered / per seat",
          "Hybrid (Recurring + One-time)",
          "One-time purchase / license",
          "Still figuring out",
        ],
        allowUnknown: false,
      },
      {
        id: "mkt_deal_size",
        prompt: "What is your typical deal size (ARR or one-time value)?",
        options: ["Under $5K", "$5K–$25K", "$25K–$100K", "Over $100K", "Not sure yet"],
      },
      {
        id: "mkt_demand_source",
        prompt: "What is your primary demand source today?",
        options: [
          "Inbound / content",
          "Paid acquisition",
          "Outbound sales",
          "Product-led / self-serve",
          "Partners / channel",
          "Mix of channels",
          "Still figuring out",
        ],
        allowUnknown: false,
      },
      {
        id: "mkt_sales_team",
        prompt: "What is the current size of your sales team?",
        options: [
          "Founder only",
          "Founder + 1 AE or SDR",
          "Small team (2–5 in sales)",
          "Larger sales org (6+)",
          "No sales hire yet",
        ],
        allowUnknown: false,
      },
      {
        id: "mkt_marketing_capacity",
        prompt: "What is your current marketing capacity?",
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
        prompt: "How do you measure marketing success today?",
        options: [
          "CAC / Payback / LTV",
          "Pipeline created",
          "Qualified leads",
          "Website traffic",
          "We don't have consistent metrics",
        ],
      },
      {
        id: "mkt_contract_length",
        prompt: "What is your primary contract length?",
        options: ["Monthly", "Annual", "Multi-year", "Mix", "Not applicable yet"],
      },
      {
        id: "mkt_competitive_pressure",
        prompt: "How would you describe your current competitive pressure?",
        options: [
          "Low — category is early or we lead",
          "Moderate — several credible alternatives",
          "High — crowded market, price or feature pressure",
          "Not sure yet",
        ],
        allowUnknown: false,
      },
      {
        id: "mkt_gtm_constraint",
        prompt: "What is the primary constraint slowing down your sales and marketing momentum?",
        options: [
          "Lead generation and pipeline",
          "Sales capacity and hiring",
          "Pricing and positioning",
          "Sales and marketing alignment",
          "Everything is well optimized",
          "Other",
        ],
      },
      {
        id: "mkt_deal_stall",
        prompt: "Where do your deals most often stall?",
        options: [
          "Before first meeting / demo",
          "After demo — no decision",
          "Late stage — legal, security, procurement",
          "Pricing or budget",
          "Not enough pipeline to tell",
        ],
      },
      {
        id: "mkt_gtm_priority",
        prompt: "What is your biggest GTM priority over the next 12 months?",
        options: [
          "Generate more pipeline",
          "Improve conversion rates",
          "Increase deal size",
          "Expand into enterprise",
          "Improve customer retention",
          "Build a repeatable GTM engine",
        ],
      },
      {
        id: "mkt_pipeline_definitions",
        prompt: "Do you have defined pipeline definitions for MQL, SQL, and SAL?",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, documented and shared — We have written criteria that the team uses.",
          "Informal / Shared understanding — We have a general idea of what these terms mean, but it's not documented or strictly enforced.",
          "Not defined yet — We don't use these definitions or are still figuring out our pipeline stages.",
        ],
      },
      {
        id: "mkt_mql_sql_visibility",
        prompt: "Do you have conversion visibility from MQL to SQL?",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, we track this regularly",
          "Rough estimate only",
          "Not tracking this currently",
        ],
      },
      {
        id: "mkt_pricing_governance",
        prompt: "Do you have pricing and discounting governance in place?",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, structured process/tool in place",
          "Informal / Manual process",
          "No specific process yet",
        ],
      },
      {
        id: "mkt_cross_functional_slas",
        prompt: "Are there defined SLAs between Marketing/SDR and AE teams?",
        group: "Advanced GTM & RevOps Audit",
        options: [
          "Yes, defined and tracked",
          "Informal / Verbal agreements",
          "No, we don't have these agreements",
        ],
      },
    ],
  },
  {
    id: "rev",
    title: "G&A",
    subtitle: "General & administrative",
    icon: "◎",
    questions: [
      {
        id: "rev_runway",
        prompt: "How long is your current runway?",
        options: [...REV_RUNWAY_OPTIONS],
      },
      {
        id: "rev_finance_management",
        prompt: "How mature is your finance operation today?",
        options: [...REV_FINANCE_MANAGEMENT_OPTIONS],
      },
      {
        id: "rev_capital_priority",
        prompt: "What is your near-term capital and reporting priority?",
        options: [...REV_CAPITAL_PRIORITY_OPTIONS],
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
        id: "rev_ops_challenge",
        prompt: "What operational area creates the biggest challenge today?",
        options: [
          "Finance & reporting",
          "Hiring & people",
          "Legal & compliance",
          "Internal operations",
          "Strategic planning",
          "Unsure",
        ],
      },
      {
        id: "rev_unit_economics",
        prompt: "How do you track your unit economics?",
        options: [
          "Real-time / Automated",
          "Monthly / Spreadsheet-based",
          "Rough manual estimates",
          "Not yet",
        ],
      },
      {
        id: "rev_forecast",
        prompt: "Do you update a forward-looking financial forecast regularly?",
        options: [
          "Yes, monthly rolling forecast",
          "Yes, static annual budget",
          "No, we track historicals only",
        ],
      },
      {
        id: "rev_due_diligence",
        prompt: "How prepared are you for investor due diligence today?",
        options: [
          "Ready today",
          "Mostly prepared",
          "Some work needed",
          "Significant work needed",
        ],
      },
      {
        id: "rev_operating_mode",
        prompt: "What is your current operating mode?",
        options: [
          "Growth-first",
          "Balanced growth and efficiency",
          "Efficiency / path to profitability",
        ],
      },
      {
        id: "rev_hiring_plans",
        prompt: "What are your hiring plans for the next 6 months?",
        options: [
          "Hiring aggressively",
          "Selective hires only",
          "Hiring freeze / defer",
          "Not sure yet",
        ],
      },
      {
        id: "rev_board_reporting",
        prompt: "What is your Board and investor reporting cadence?",
        options: [
          "Monthly updates",
          "Quarterly board / investor reporting",
          "Ad hoc only",
          "No investors or board yet",
        ],
      },
      {
        id: "rev_segment_economics",
        prompt: "Do you know your revenue or cost by customer segment?",
        options: [
          "Yes — tracked by segment",
          "Partially — some segments only",
          "Not yet — single blended view",
          "Not applicable — pre-revenue",
        ],
      },
      {
        id: "rev_raise_needs",
        prompt: "What do you need most for your capital raise?",
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
  (s): s is DetailSection & { id: ScorecardCategory } =>
    s.id === "dev" || s.id === "mkt" || s.id === "rev",
);

export function extraDetailQuestionIds(): string[] {
  const unlock = new Set<string>([
    ...MANDATORY_PROFILE_QUESTION_IDS,
    ...ONBOARDING_MODULE_FIELDS.dev,
    ...ONBOARDING_MODULE_FIELDS.gtm,
    ...ONBOARDING_MODULE_FIELDS.rev,
  ]);
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const s of DETAIL_SECTIONS) {
    for (const q of s.questions) {
      if (unlock.has(q.id) || seen.has(q.id)) continue;
      seen.add(q.id);
      ids.push(q.id);
    }
  }
  return ids;
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

/** Keep cleared answers as "" so save payload still includes the question id. */
export function applyDetailAnswerUpdate(
  answers: Record<string, string>,
  questionId: string,
  value: string,
): Record<string, string> {
  return {
    ...answers,
    [questionId]: value.trim() ? value : "",
  };
}

/** Track sections only (R&D, GTM, G&A) — excludes profile. */
export function countTrackApplicableQuestions(answers: DetailAnswers): number {
  return TRACK_DETAIL_SECTIONS.reduce(
    (n, section) => n + getVisibleQuestions(section, answers).length,
    0,
  );
}

export function countTrackDetailAnswers(answers: DetailAnswers): number {
  return TRACK_DETAIL_SECTIONS.flatMap(s => getVisibleQuestions(s, answers))
    .filter(q => answers[q.id]?.trim())
    .length;
}

export function mapOnboardingToDetailAnswers(
  track: Partial<OnboardingTrackAnswers>,
  profile?: { productDescription?: string },
): DetailAnswers {
  const out: DetailAnswers = {};
  const put = (id: string, value?: string) => {
    if (value?.trim()) out[id] = value.trim();
  };

  ONBOARDING_TRACK_FIELDS.forEach(key => put(key, track[key]));

  put("profile_product_description", profile?.productDescription);

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

/** Human-readable answer for Overview UI (maps `__unknown__` → "I don't know / NA"). */
export function formatDetailAnswerDisplay(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  return parseMultiSelectAnswer(value)
    .map((part) => formatOnboardAnswerDisplay(part) ?? part)
    .join(DETAIL_MULTI_DELIMITER);
}

function multiPartMatchesOption(part: string, option: string): boolean {
  if (isOtherSpecifyOption(option)) {
    return part === option || part.startsWith(`${option}:`);
  }
  return part === option;
}

export function toggleMultiSelectAnswer(current: string | undefined, option: string): string {
  const selected = parseMultiSelectAnswer(current);
  const has = selected.some((part) => multiPartMatchesOption(part, option));
  const next = has
    ? selected.filter((part) => !multiPartMatchesOption(part, option))
    : [...selected, option];
  return next.join(DETAIL_MULTI_DELIMITER);
}

export function isMultiSelectSelected(value: string | undefined, option: string): boolean {
  return parseMultiSelectAnswer(value).some((part) => multiPartMatchesOption(part, option));
}

/** Replace or clear the Other entry in a multi-select answer while keeping peers. */
export function setMultiSelectOtherText(
  current: string | undefined,
  otherOpt: string,
  text: string,
): string {
  const withoutOther = parseMultiSelectAnswer(current).filter(
    (part) => !multiPartMatchesOption(part, otherOpt),
  );
  return [...withoutOther, formatOtherSpecifyAnswer(otherOpt, text)].join(DETAIL_MULTI_DELIMITER);
}

export const DETAIL_QUESTION_BY_ID: Record<string, DetailQuestion> = Object.fromEntries(
  DETAIL_SECTIONS.flatMap(s => s.questions.map(q => [q.id, q])),
);

export const DETAIL_QUESTION_LABEL: Partial<Record<string, string>> = {
  profile_company: "Company",
  profile_product_description: "Product description",
  profile_industry: "Industry",
  profile_founded: "Founded",
  profile_city: "City",
  profile_state: "State / region",
  profile_country: "Country",
  profile_website: "Website",
  profile_linkedin: "LinkedIn",
  profile_headcount: "Headcount",
  profile_funding_rounds: "Funding rounds",
  profile_additional_context: "Additional context",
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
  dev_ai_role: "AI role",
  dev_compliance: "Compliance",
  dev_prioritization: "Prioritization",
  dev_feature_debt_split: "Feature vs debt split",
  dev_eng_bottleneck: "Engineering bottleneck",
  dev_six_month_impact: "Six-month impact",
  mkt_sales_motion: "GTM motion",
  mkt_funnel_gap: "Growth bottleneck",
  mkt_icp_clarity: "ICP clarity",
  mkt_revenue_tracking: "Revenue tracking",
  mkt_deal_size: "Deal size",
  mkt_pricing_model: "Pricing model",
  mkt_demand_source: "Demand source",
  mkt_sales_team: "Sales team",
  mkt_marketing_capacity: "Marketing capacity",
  mkt_cac_payback: "Marketing success metrics",
  mkt_contract_length: "Contract length",
  mkt_competitive_pressure: "Competitive pressure",
  mkt_gtm_constraint: "GTM constraint",
  mkt_deal_stall: "Deal stall point",
  mkt_gtm_priority: "GTM priority",
  mkt_pipeline_definitions: "Pipeline definitions",
  mkt_mql_sql_visibility: "MQL→SQL visibility",
  mkt_pricing_governance: "Pricing governance",
  mkt_cross_functional_slas: "Cross-functional SLAs",
  rev_runway: "Runway",
  rev_finance_management: "Finance management",
  rev_capital_priority: "Capital priority",
  rev_twelve_month_goal: "12-month goal",
  rev_ops_challenge: "Ops challenge",
  rev_unit_economics: "Unit economics",
  rev_forecast: "Forecast",
  rev_due_diligence: "Due diligence readiness",
  rev_operating_mode: "Operating mode",
  rev_hiring_plans: "Hiring plans",
  rev_board_reporting: "Board reporting",
  rev_segment_economics: "Segment economics",
  rev_raise_needs: "Raise needs",
};

/** Serializable question dictionary for Bedrock overview INPUT (no showWhen fns). */
export type DetailQuestionCatalogEntry = {
  id: string;
  prompt: string;
  label: string;
  category_id: DetailSectionId;
  kind: "choice" | "text";
  multi: boolean;
  allow_unknown: boolean;
  options?: string[];
  subtitle?: string;
};

/**
 * Full detail-question catalog for overview generation.
 * Bedrock uses this to resolve INPUT.answers keys to human prompts/options.
 */
export function buildDetailQuestionCatalogForModel(): DetailQuestionCatalogEntry[] {
  const seen = new Set<string>();
  return DETAIL_SECTIONS.flatMap((section) =>
    section.questions.flatMap((q) => {
      if (seen.has(q.id)) return [];
      seen.add(q.id);
      const kind = q.kind === "text" ? "text" : "choice";
      const entry: DetailQuestionCatalogEntry = {
        id: q.id,
        prompt: q.prompt,
        label: DETAIL_QUESTION_LABEL[q.id] ?? q.prompt,
        category_id: section.id === "context" || section.id === "profile" ? "profile" : section.id,
        kind,
        multi: q.multi === true,
        allow_unknown: kind === "choice" ? q.allowUnknown !== false : false,
      };
      if (q.options && q.options.length > 0) entry.options = [...q.options];
      if (q.subtitle) entry.subtitle = q.subtitle;
      return [entry];
    }),
  );
}
