import type { OnboardingAnswers } from "@/lib/onboard/onboarding-answers";
import type { CatalogOnboardingSnapshot } from "@/lib/onboard/claim-profile";
import {
  mapOnboardingToDetailAnswers,
  serializeProfileFundingRounds,
} from "./detail-question-catalog";

function foundedYear(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const iso = /^(\d{4})/.exec(raw.trim());
  return iso?.[1] ?? raw.trim();
}

export type QuestionOrigin = "onboarding" | "overview_only" | "profile";

export interface MappedAnswer {
  questionId: string;
  answer: string | null;
  source: QuestionOrigin | "profile";
}

const PRODUCT_TYPE_MAP: Record<string, string> = {
  "B2B SaaS": "SaaS Platform",
  B2C: "SaaS Platform",
  "SaaS / web app": "SaaS Platform",
  "SaaS Platform": "SaaS Platform",
  "AI Application": "AI Application",
  "AI Infrastructure": "AI Infrastructure",
  Marketplace: "Marketplace",
  "API or developer platform": "Developer Platform / API",
  "Developer Platform / API": "Developer Platform / API",
  "Mobile App": "Mobile App",
  "Hardware / IoT": "Hardware / IoT",
  Hardware: "Hardware / IoT",
  Services: "Other",
  Other: "Other",
};

const PRODUCT_STAGE_MAP: Record<string, string> = {
  "Idea — not yet in development": "Idea — not yet in development",
  "In active development": "In active development",
  "Built — not yet launched": "Built — not yet launched",
  "Launched — early users or customers": "Launched — early users or customers",
  "Launched — scaling usage or revenue": "Launched — scaling usage or revenue",
  "Pre-launch — still building": "In active development",
  "Scaling — product is proven, growing fast": "Launched — scaling usage or revenue",
};

const PRODUCT_CHALLENGE_MAP: Record<string, string> = {
  "Planning and prioritization": "Planning and prioritization",
  "Capacity and hiring": "Capacity and hiring",
  "Quality and reliability": "Quality and reliability",
  "Technical debt / Architecture": "Technical debt / Architecture",
  "Finding product-market fit": "Planning and prioritization",
  "Engineering capacity": "Capacity and hiring",
  "Technical debt": "Technical debt / Architecture",
  Hiring: "Capacity and hiring",
  "Go-to-market readiness": "Quality and reliability",
  "Speed of execution": "Capacity and hiring",
  "Roadmap clarity": "Planning and prioritization",
  "Not enough engineers": "Capacity and hiring",
  Other: "Planning and prioritization",
};

const SALES_MOTION_MAP: Record<string, string> = {
  "Product-led": "Product-led",
  "Sales-led": "Sales-led",
  "Founder-led": "Founder-led",
  "Channel/partner-led": "Sales-led",
  "Not yet": "Not yet defined",
  "Not yet defined": "Not yet defined",
  "Other (Please specify)": "Other",
  Other: "Other",
};

const FUNNEL_MAP: Record<string, string> = {
  "Not enough awareness": "Not enough awareness",
  "Not enough qualified pipeline": "Not enough qualified pipeline",
  "Too few opportunities convert": "Too few opportunities convert",
  "Customers aren't expanding or renewing": "Customers aren't expanding or renewing",
  Unsure: "Unsure",
  Awareness: "Not enough awareness",
  "Awareness / top of funnel": "Not enough awareness",
  Conversion: "Too few opportunities convert",
  "Conversion to trial": "Too few opportunities convert",
  Activation: "Too few opportunities convert",
  Expansion: "Customers aren't expanding or renewing",
  Retention: "Customers aren't expanding or renewing",
  "None — funnel is healthy": "Unsure",
};

const FINANCE_MAP: Record<string, string> = {
  "Dedicated finance leader": "Dedicated finance leader",
  "Outsourced finance/accounting": "Outsourced finance/accounting",
  "Founder manages finances": "Founder manages finances",
  "Minimal financial processes": "Minimal financial processes",
  "Accounting software with regular close": "Dedicated finance leader",
  "Spreadsheet + accountant or bookkeeper": "Outsourced finance/accounting",
  "Founder-managed / informal": "Founder manages finances",
  "Not set up yet": "Minimal financial processes",
};

const CAPITAL_MAP: Record<string, string> = {
  "Actively fundraising": "Actively fundraising",
  "Open to investor introductions": "Open to investor introductions",
  "Focused on extending runway / reaching profitability":
    "Focused on extending runway / reaching profitability",
  "Not focused on capital right now": "Not focused on capital right now",
  Yes: "Open to investor introductions",
  "Not right now": "Not focused on capital right now",
  No: "Not focused on capital right now",
};

const RUNWAY_MAP: Record<string, string> = {
  "Over 18 months": "Over 18 months",
  "12–18 months": "12–18 months",
  "6–12 months": "6–12 months",
  "Under 6 months": "Under 6 months",
  Unknown: "6–12 months",
};

function mapRevenueTracking(operating: OnboardingAnswers): string | undefined {
  if (operating.revenueTracking?.trim()) return operating.revenueTracking.trim();

  const tool = operating.pipelineTool;
  const process = operating.salesProcess;
  if (tool === "HubSpot" || tool === "Salesforce" || tool === "Pipedrive" || tool === "CRM") {
    return process === "Documented and repeatable" || process === "Documented"
      ? "CRM with a defined sales process"
      : "CRM but informal process";
  }
  if (tool === "Spreadsheet") return "Spreadsheet or lightweight tracking";
  if (tool === "None" || tool === "Nothing yet" || process === "Not started" || process === "Not yet") {
    return "No systematic pipeline yet";
  }
  return undefined;
}

function mapOperatingToTrack(operating: OnboardingAnswers): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (id: string, value?: string) => {
    if (value?.trim()) out[id] = value.trim();
  };

  const stage = operating.productStage || operating.aiCore;
  if (stage) {
    put("dev_product_stage", PRODUCT_STAGE_MAP[stage] ?? stage);
  }
  if (operating.productType) {
    put("dev_product_type", PRODUCT_TYPE_MAP[operating.productType] ?? operating.productType);
  }
  if (operating.productChallenge) {
    put(
      "dev_delivery_constraint",
      PRODUCT_CHALLENGE_MAP[operating.productChallenge] ?? operating.productChallenge,
    );
  }
  if (operating.salesMotion) {
    put("mkt_sales_motion", SALES_MOTION_MAP[operating.salesMotion] ?? operating.salesMotion);
  }
  if (operating.funnelBreakdown) {
    put("mkt_funnel_gap", FUNNEL_MAP[operating.funnelBreakdown] ?? operating.funnelBreakdown);
  }
  if (operating.icpClarity) {
    put("mkt_icp_clarity", operating.icpClarity);
  }
  const revenue = mapRevenueTracking(operating);
  if (revenue) put("mkt_revenue_tracking", revenue);

  const capital = operating.capitalPriority || operating.investorIntros;
  if (capital) {
    put("rev_capital_priority", CAPITAL_MAP[capital] ?? capital);
  }
  if (operating.financeManagement) {
    put(
      "rev_finance_management",
      FINANCE_MAP[operating.financeManagement] ?? operating.financeManagement,
    );
  }
  if (operating.runway) {
    put("rev_runway", RUNWAY_MAP[operating.runway] ?? operating.runway);
  }

  return out;
}

/** Map catalog `sources.onboarding` snapshot into canonical question IDs. */
export function mapOnboardingToAnswers(
  onboarding: CatalogOnboardingSnapshot | null | undefined,
): MappedAnswer[] {
  if (!onboarding) return [];

  const profile = onboarding.profileForm;
  const operating = onboarding.operating;
  const detail = mapOnboardingToDetailAnswers(mapOperatingToTrack(operating ?? ({} as OnboardingAnswers)), {
    productDescription: profile?.whatTheyDo,
  });

  if (profile?.whatTheyDo?.trim()) {
    detail.profile_product_description = profile.whatTheyDo.trim();
  }
  if (profile?.company?.trim()) {
    detail.profile_company = profile.company.trim();
  }
  if (profile?.industry?.trim()) {
    detail.profile_industry = profile.industry.trim();
  }
  if (profile?.additionalContext?.trim()) {
    detail.profile_additional_context = profile.additionalContext.trim();
  }
  const founded = foundedYear(profile?.founded);
  if (founded) detail.profile_founded = founded;
  if (profile?.city?.trim()) detail.profile_city = profile.city.trim();
  if (profile?.stateRegion?.trim()) detail.profile_state = profile.stateRegion.trim();
  if (profile?.country?.trim()) detail.profile_country = profile.country.trim();
  if (profile?.website?.trim()) detail.profile_website = profile.website.trim();
  if (profile?.linkedin?.trim()) detail.profile_linkedin = profile.linkedin.trim();

  const rounds = onboarding.fundingRounds?.filter((round) =>
    Boolean(round.type?.trim() || round.amount?.trim() || round.date?.trim() || round.investors?.trim()),
  );
  if (rounds && rounds.length > 0) {
    detail.profile_funding_rounds = serializeProfileFundingRounds(rounds);
  }

  const headcount =
    (typeof onboarding.benchmark === "object" && onboarding.benchmark && "headcount" in onboarding.benchmark
      ? onboarding.benchmark.headcount
      : undefined) ?? undefined;
  if (typeof headcount === "string" && headcount.trim()) {
    detail.profile_headcount = headcount.trim();
  }

  return Object.entries(detail)
    .filter(([, answer]) => Boolean(answer?.trim()))
    .map(([questionId, answer]) => ({
      questionId,
      answer: answer!.trim(),
      source: questionId.startsWith("profile_") ? ("profile" as const) : ("onboarding" as const),
    }));
}

const REVERSE_PROFILE: Record<string, keyof NonNullable<CatalogOnboardingSnapshot["profileForm"]>> = {
  profile_product_description: "whatTheyDo",
  profile_company: "company",
  profile_industry: "industry",
  profile_additional_context: "additionalContext",
  profile_founded: "founded",
  profile_city: "city",
  profile_state: "stateRegion",
  profile_country: "country",
  profile_website: "website",
  profile_linkedin: "linkedin",
};

/** Catalog columns used as fallback when `company_detail_answers` is empty. */
export type CatalogProfileColumns = {
  name?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  industry?: string | null;
  foundedOn?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  employeeCount?: string | null;
};

export function mapCatalogCompanyToProfileAnswers(
  catalog: CatalogProfileColumns | null | undefined,
): Record<string, string> {
  if (!catalog) return {};
  const out: Record<string, string> = {};
  const put = (id: string, value?: string | null) => {
    if (value?.trim()) out[id] = value.trim();
  };
  put("profile_company", catalog.name);
  put("profile_product_description", catalog.shortDescription || catalog.longDescription);
  put("profile_industry", catalog.industry);
  put("profile_founded", foundedYear(catalog.foundedOn));
  put("profile_city", catalog.locationCity);
  put("profile_state", catalog.locationState);
  put("profile_country", catalog.locationCountry);
  put("profile_website", catalog.website);
  put("profile_linkedin", catalog.linkedinUrl);
  put("profile_headcount", catalog.employeeCount);
  return out;
}

/** Later layers fill only keys that are still empty. Stored answers always win. */
export function overlayMissingAnswers(
  base: Record<string, string | null | undefined>,
  ...layers: Array<Record<string, string | null | undefined>>
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [id, value] of Object.entries(base)) {
    out[id] = value?.trim() ? value : value ?? null;
  }
  for (const layer of layers) {
    for (const [id, value] of Object.entries(layer)) {
      if (out[id]?.trim()) continue;
      if (value?.trim()) out[id] = value.trim();
    }
  }
  return out;
}

const REVERSE_OPERATING: Record<string, keyof OnboardingAnswers> = {
  dev_product_stage: "productStage",
  dev_product_type: "productType",
  dev_delivery_constraint: "productChallenge",
  mkt_sales_motion: "salesMotion",
  mkt_funnel_gap: "funnelBreakdown",
  mkt_icp_clarity: "icpClarity",
  mkt_revenue_tracking: "revenueTracking",
  rev_capital_priority: "capitalPriority",
  rev_finance_management: "financeManagement",
  rev_runway: "runway",
};

/** Reverse map: questionId → onboarding path for sync back to catalog. */
export function reverseMapToOnboarding(
  questionId: string,
  _answer: string,
): {
  profileField?: keyof NonNullable<CatalogOnboardingSnapshot["profileForm"]>;
  operatingField?: keyof NonNullable<CatalogOnboardingSnapshot["operating"]>;
} | null {
  const profileField = REVERSE_PROFILE[questionId];
  if (profileField) return { profileField };

  const operatingField = REVERSE_OPERATING[questionId];
  if (operatingField) return { operatingField };

  return null;
}
