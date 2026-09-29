import { z } from "zod";
import { BUSINESS_MODELS } from "@/lib/business-model";

export const ProfileBody = z
  .object({
    name: z.string().trim().min(1).max(200),
    shortDescription: z.string().trim().max(2_000).nullish(),
    longDescription: z.string().trim().max(20_000).nullish(),
    logoUrl: z.string().url().max(2_000).nullish(),
    industry: z.string().trim().max(120).nullish(),
    categories: z.array(z.string().trim().min(1).max(80)).max(20).nullish(),
    locationCity: z.string().trim().max(120).nullish(),
    locationState: z.string().trim().max(120).nullish(),
    locationCountry: z.string().trim().max(120).nullish(),
    employeeCount: z.string().trim().max(60).nullish(),
    foundedOn: z.string().trim().max(40).nullish(),
    totalFundingUsd: z.number().nonnegative().nullish(),
    numFundingRounds: z.number().int().nonnegative().nullish(),
    linkedinUrl: z.string().url().max(500).nullish(),
    crunchbaseUrl: z.string().url().max(500).nullish(),
    twitterUrl: z.string().url().max(500).nullish(),
    website: z.string().url().max(500).nullish(),
    businessModel: z.enum(BUSINESS_MODELS).nullish(),
    sources: z.record(z.string(), z.unknown()).nullish(),
  })
  .strict();

export const MetricsBody = z
  .object({
    arrUsd: z.number().nonnegative().nullish(),
    arrGrowthYoyPct: z.number().nullish(),
    nrrPct: z.number().nullish(),
    logoRetentionPct: z.number().nullish(),
    monthlyBurnUsd: z.number().nonnegative().nullish(),
    cashOnHandUsd: z.number().nonnegative().nullish(),
    grossMarginPct: z.number().nullish(),
    cacPaybackMonths: z.number().nonnegative().nullish(),
    burnMultiple: z.number().nonnegative().nullish(),
    ruleOf40Pct: z.number().nullish(),
    fteCount: z.number().int().nonnegative().nullish(),
    paidCustomerCount: z.number().int().nonnegative().nullish(),
    notableCustomers: z.string().trim().max(5_000).nullish(),
    challenges: z.string().trim().max(5_000).nullish(),
  })
  .strict();

export const OnboardingAnswersBody = z
  .object({
    productStage: z.string().trim().max(500),
    productType: z.string().trim().max(500),
    productChallenge: z.string().trim().max(2_000),
    salesMotion: z.string().trim().max(500),
    funnelBreakdown: z.string().trim().max(2_000),
    icpClarity: z.string().trim().max(2_000),
    revenueTracking: z.string().trim().max(2_000),
    runway: z.string().trim().max(500),
    financeManagement: z.string().trim().max(500),
    capitalPriority: z.string().trim().max(500),
    // Legacy fields from older clients / snapshots
    aiCore: z.string().trim().max(500).optional(),
    investorIntros: z.string().trim().max(500).optional(),
    pipelineTool: z.string().trim().max(500).optional(),
    salesProcess: z.string().trim().max(2_000).optional(),
  })
  .strict();

export const InvestorAnswersBody = z
  .object({
    stages: z.array(z.string().trim().min(1).max(120)).max(30),
    sectors: z.array(z.string().trim().min(1).max(120)).max(30),
    checkSize: z.string().trim().max(500),
    geography: z.string().trim().max(500),
    pipeline: z.string().trim().max(2_000),
  })
  .strict();

export const FundingRoundBody = z
  .object({
    id: z.string().trim().max(80),
    type: z.string().trim().max(120),
    amount: z.string().trim().max(120),
    date: z.string().trim().max(40),
    investors: z.string().trim().max(2_000),
  })
  .strict();

export const ProfileFormSnapshotBody = z
  .object({
    company: z.string().trim().max(200),
    whatTheyDo: z.string().trim().max(2_000),
    businessModel: z.string().trim().max(120),
    industry: z.string().trim().max(120),
    founded: z.string().trim().max(40),
    city: z.string().trim().max(120),
    stateRegion: z.string().trim().max(120),
    country: z.string().trim().max(120),
    website: z.string().trim().max(500),
    linkedin: z.string().trim().max(500),
    additionalContext: z.string().trim().max(5_000),
    /** OpenSearch logo from selected company — optional wizard snapshot field. */
    logoUrl: z.string().url().max(2_000).nullish(),
  })
  .strict();

export const RawBenchmarkInputsBody = z
  .object({
    arr: z.string().trim().max(120),
    arrGrowth: z.string().trim().max(120),
    nrr: z.string().trim().max(120),
    logoRetention: z.string().trim().max(120),
    grossMargin: z.string().trim().max(120),
    cacPayback: z.string().trim().max(120).default(""),
    burnMultiple: z.string().trim().max(120).default(""),
    ruleOf40: z.string().trim().max(120).default(""),
    monthlyBurn: z.string().trim().max(120),
    cashOnHand: z.string().trim().max(120),
    headcount: z.string().trim().max(120),
    payingCustomers: z.string().trim().max(120),
  })
  .strict();

export const ClaimBody = z
  .object({
    profile: ProfileBody,
    enrichmentRunId: z.string().uuid().nullish(),
    cta: z.enum(["benchmark", "pitch-deck", "explore"]).default("benchmark"),
    metrics: MetricsBody.nullish(),
    cohortKey: z.string().trim().max(120).nullish(),
    flowType: z.enum(["operating", "investor"]).nullish(),
    answers: OnboardingAnswersBody.nullish(),
    investorAnswers: InvestorAnswersBody.nullish(),
    profileForm: ProfileFormSnapshotBody.nullish(),
    // Enrichment (Crunchbase / Fuel) can return 20+ rounds for mature
    // companies. Cap is a request-size safeguard only — rounds store in jsonb.
    fundingRounds: z.array(FundingRoundBody).max(100).nullish(),
    rawBenchmarkInputs: RawBenchmarkInputsBody.nullish(),
    setupIncomplete: z.boolean().optional(),
  })
  .strict();

export type ParsedClaimBody = z.infer<typeof ClaimBody>;
