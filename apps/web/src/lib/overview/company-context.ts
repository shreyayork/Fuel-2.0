import type { CatalogOnboardingSnapshot, ClaimFundingRound } from "@/lib/onboard/claim-profile";
import { parseProfileFundingRounds } from "./detail-question-catalog";
import { buildHeadquarters } from "./full-summary-assemble";

export type OverviewCatalogProfile = {
  name?: string | null;
  domain?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  industry?: string | null;
  businessModel?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  foundedOn?: string | null;
  employeeCount?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
};

export type OverviewLatestUpdate = {
  notableCustomers?: string | null;
  notableHires?: string | null;
  challenges?: string | null;
  otherUpdates?: string | null;
} | null | undefined;

export type OverviewCompanyFundingRound = {
  type?: string;
  amount?: string;
  date?: string;
  investors?: string;
};

export type OverviewCompanyContext = {
  name?: string;
  domain?: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  businessModel?: string;
  stage?: string;
  founded?: string;
  employees?: string;
  headquarters?: string;
  productDescription?: string;
  additionalContext?: string;
  notes?: string;
  topPriorities?: string;
  biggestRisk?: string;
  publicDataCorrections?: string;
  fundingRounds?: OverviewCompanyFundingRound[];
};

export type OverviewFounderNarrative = {
  notableCustomers?: string;
  notableHires?: string;
  biggestChallenges?: string;
  otherUpdates?: string;
};

function trim(value?: string | null): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function first(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const next = trim(value);
    if (next) return next;
  }
  return undefined;
}

function foundedYear(raw?: string | null): string | undefined {
  const value = trim(raw);
  if (!value) return undefined;
  const iso = /^(\d{4})/.exec(value);
  return iso?.[1] ?? value;
}

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}

function compactRound(
  round: ClaimFundingRound | OverviewCompanyFundingRound,
): OverviewCompanyFundingRound | null {
  const next = compact({
    type: trim(round.type),
    amount: trim(round.amount),
    date: trim(round.date),
    investors: trim(round.investors),
  });
  return Object.keys(next).length > 0 ? next : null;
}

function fundingRoundsFromAnswers(
  answers: Record<string, string | null | undefined>,
  onboarding: CatalogOnboardingSnapshot | null | undefined,
): OverviewCompanyFundingRound[] | undefined {
  const fromAnswers = parseProfileFundingRounds(answers.profile_funding_rounds)
    .map(compactRound)
    .filter((row): row is OverviewCompanyFundingRound => row != null);
  if (fromAnswers.length > 0) return fromAnswers;

  const fromOnboarding = (onboarding?.fundingRounds ?? [])
    .map(compactRound)
    .filter((row): row is OverviewCompanyFundingRound => row != null);
  return fromOnboarding.length > 0 ? fromOnboarding : undefined;
}

function onboardingHeadcount(onboarding: CatalogOnboardingSnapshot | null | undefined): string | undefined {
  const benchmark = onboarding?.benchmark;
  if (!benchmark || typeof benchmark !== "object" || Array.isArray(benchmark)) return undefined;
  const headcount = "headcount" in benchmark ? (benchmark as { headcount?: unknown }).headcount : undefined;
  return typeof headcount === "string" ? trim(headcount) : undefined;
}

export function buildOverviewFounderNarrative(
  latestUpdate: OverviewLatestUpdate,
): OverviewFounderNarrative | undefined {
  const narrative = compact({
    notableCustomers: trim(latestUpdate?.notableCustomers),
    notableHires: trim(latestUpdate?.notableHires),
    biggestChallenges: trim(latestUpdate?.challenges),
    otherUpdates: trim(latestUpdate?.otherUpdates),
  });
  return Object.keys(narrative).length > 0 ? narrative : undefined;
}

/**
 * Structured company identity for Overview Bedrock INPUT.
 * Precedence: stored profile_* answers > onboarding snapshot > catalog columns.
 */
export function buildOverviewCompanyContext(opts: {
  catalog?: OverviewCatalogProfile | null;
  onboarding?: CatalogOnboardingSnapshot | null;
  answers?: Record<string, string | null | undefined>;
}): OverviewCompanyContext | undefined {
  const catalog = opts.catalog ?? null;
  const onboarding = opts.onboarding ?? null;
  const answers = opts.answers ?? {};
  const profile = onboarding?.profileForm;

  const headquarters = buildHeadquarters({
    locationCity: first(answers.profile_city, profile?.city, catalog?.locationCity),
    locationState: first(answers.profile_state, profile?.stateRegion, catalog?.locationState),
    locationCountry: first(answers.profile_country, profile?.country, catalog?.locationCountry),
  });

  const company = compact({
    name: first(answers.profile_company, profile?.company, catalog?.name),
    domain: first(catalog?.domain),
    website: first(answers.profile_website, profile?.website, catalog?.website),
    linkedin: first(answers.profile_linkedin, profile?.linkedin, catalog?.linkedinUrl),
    industry: first(answers.profile_industry, profile?.industry, catalog?.industry),
    businessModel: first(
      profile?.businessModel,
      onboarding?.businessModelLabel,
      catalog?.businessModel,
    ),
    stage: first(onboarding?.stage),
    founded: first(
      answers.profile_founded,
      foundedYear(profile?.founded),
      foundedYear(catalog?.foundedOn),
    ),
    employees: first(answers.profile_headcount, onboardingHeadcount(onboarding), catalog?.employeeCount),
    headquarters: headquarters ?? undefined,
    productDescription: first(
      answers.profile_product_description,
      profile?.whatTheyDo,
      catalog?.shortDescription,
      catalog?.longDescription,
    ),
    additionalContext: first(answers.profile_additional_context, profile?.additionalContext),
    notes: first(onboarding?.notes),
    topPriorities: first(answers.profile_top_priorities),
    biggestRisk: first(answers.profile_biggest_risk),
    publicDataCorrections: first(answers.profile_public_data_wrong),
    fundingRounds: fundingRoundsFromAnswers(answers, onboarding),
  });

  return Object.keys(company).length > 0 ? company : undefined;
}
