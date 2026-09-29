import type { BusinessModel } from "@/lib/business-model";
import { normalizeBusinessModel } from "@/lib/business-model";
import { buildClaimProfile, parseUsdAmount } from "@/lib/onboard/claim-profile";
import type { OnboardingAnswers, InvestorAnswers } from "@/lib/onboard/onboarding-answers";
import { isInvestorUiBusinessModel } from "@/lib/onboard/resolve-ui-business-model";
import type { OnboardingFlowCompletePayload } from "./OnboardingFlow";
import type {
  OnboardingFlowType,
  OnboardingProfileFormSnapshot,
  RawBenchmarkInputs,
} from "@/lib/onboard/onboarding-answers";
import { isUnknownAnswer } from "@/lib/onboard/unknown-answer";
import { parseOnboardBenchmarkValue } from "@/lib/onboard/map-benchmark-insights";

function parsePct(s: string): number | null {
  if (isUnknownAnswer(s)) return null;
  const t = s.trim().replace(/%/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parseCount(s: string): number | null {
  if (isUnknownAnswer(s)) return null;
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseNumberField(s: string): number | null {
  if (isUnknownAnswer(s)) return null;
  return parseOnboardBenchmarkValue(s);
}

export function mapFlowPayloadToClaimProfile(
  payload: OnboardingFlowCompletePayload,
  domain: string,
) {
  const { profileForm, fundingRounds } = payload;
  const model = normalizeBusinessModel(profileForm.businessModel);
  return buildClaimProfile(domain, {
    companyName: profileForm.company,
    confirmedProfile: {
      companyName: profileForm.company,
      description: profileForm.whatTheyDo,
      businessModel: (model ?? "other") as BusinessModel,
      industry: profileForm.industry,
      founded: profileForm.founded,
      city: profileForm.city,
      region: profileForm.stateRegion,
      country: profileForm.country,
      website: profileForm.website,
      linkedin: profileForm.linkedin,
      crunchbase: "",
      twitter: "",
      fundingRounds: fundingRounds.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        date: r.date,
        investors: r.investors,
      })),
      notes: profileForm.additionalContext,
      logoUrl: profileForm.logoUrl ?? null,
    },
    rawEnrichment: null,
    benchmark: hasRawBenchmark(payload) ? mapFlowRawBenchmarkInputs(payload) : null,
  });
}

function hasRawBenchmark(payload: OnboardingFlowCompletePayload): boolean {
  return Object.values(mapFlowRawBenchmarkInputs(payload)).some((v) => v.trim());
}

export function mapFlowAnswersToOnboardingAnswers(
  payload: OnboardingFlowCompletePayload,
): OnboardingAnswers {
  const { answers } = payload;
  return {
    productStage: answers.productStage,
    productType: answers.productType,
    productChallenge: answers.productChallenge,
    salesMotion: answers.salesMotion,
    funnelBreakdown: answers.funnelBreakdown,
    icpClarity: answers.icpClarity,
    revenueTracking: answers.revenueTracking,
    runway: answers.runway,
    financeManagement: answers.financeManagement,
    capitalPriority: answers.capitalPriority,
  };
}

export function mapFlowInvestorAnswers(
  payload: OnboardingFlowCompletePayload,
): InvestorAnswers {
  return {
    stages: payload.investStages,
    sectors: payload.investSectors,
    checkSize: payload.answers.investCheckSize,
    geography: payload.answers.investGeography,
    pipeline: payload.answers.investPipeline,
  };
}

export function mapFlowBenchmarkMetrics(payload: OnboardingFlowCompletePayload) {
  const { answers } = payload;
  const metrics = {
    arrUsd: isUnknownAnswer(answers.arr)
      ? null
      : (parseUsdAmount(answers.arr) ?? null),
    arrGrowthYoyPct: parsePct(answers.arrGrowth),
    nrrPct: parsePct(answers.nrr),
    logoRetentionPct: parsePct(answers.logoRetention),
    grossMarginPct: parsePct(answers.grossMargin),
    cacPaybackMonths: parseNumberField(answers.cacPayback),
    burnMultiple: parseNumberField(answers.burnMultiple),
    ruleOf40Pct: parseNumberField(answers.ruleOf40),
    monthlyBurnUsd: isUnknownAnswer(answers.monthlyBurn)
      ? null
      : (parseUsdAmount(answers.monthlyBurn) ?? null),
    cashOnHandUsd: isUnknownAnswer(answers.cashOnHand)
      ? null
      : (parseUsdAmount(answers.cashOnHand) ?? null),
    fteCount: parseCount(answers.headcount),
    paidCustomerCount: parseCount(answers.payingCustomers),
    notableCustomers: null as string | null,
    challenges: null as string | null,
  };
  const hasAny = Object.values(metrics).some((v) => v != null);
  return hasAny ? metrics : null;
}

export function isInvestorFlowPayload(payload: OnboardingFlowCompletePayload): boolean {
  return isInvestorUiBusinessModel(payload.profileForm.businessModel);
}

export function mapFlowType(payload: OnboardingFlowCompletePayload): OnboardingFlowType {
  return isInvestorFlowPayload(payload) ? "investor" : "operating";
}

export function mapFlowProfileFormSnapshot(
  payload: OnboardingFlowCompletePayload,
): OnboardingProfileFormSnapshot {
  return { ...payload.profileForm };
}

export function mapFlowFundingRounds(payload: OnboardingFlowCompletePayload) {
  return payload.fundingRounds.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    date: r.date,
    investors: r.investors,
  }));
}

export function mapFlowRawBenchmarkInputs(
  payload: OnboardingFlowCompletePayload,
): RawBenchmarkInputs {
  const { answers } = payload;
  const raw = (v: string) => (isUnknownAnswer(v) ? "" : v);
  return {
    arr: raw(answers.arr),
    arrGrowth: raw(answers.arrGrowth),
    nrr: raw(answers.nrr),
    logoRetention: raw(answers.logoRetention),
    grossMargin: raw(answers.grossMargin),
    cacPayback: raw(answers.cacPayback),
    burnMultiple: raw(answers.burnMultiple),
    ruleOf40: raw(answers.ruleOf40),
    monthlyBurn: raw(answers.monthlyBurn),
    cashOnHand: raw(answers.cashOnHand),
    headcount: raw(answers.headcount),
    payingCustomers: raw(answers.payingCustomers),
  };
}
