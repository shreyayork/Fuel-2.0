import type { ParsedClaimBody } from "@/lib/onboard/claim-body-schema";
import type { BusinessModel } from "@/lib/business-model";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";
import type { OnboardingBenchmarkBlob } from "@/lib/onboard/benchmark-hints";
import type {
  InvestorAnswers,
  OnboardingAnswers,
  OnboardingProfileFormSnapshot,
  RawBenchmarkInputs,
} from "@/lib/onboard/onboarding-answers";

export interface ClaimFundingRound {
  id: string;
  type: string;
  amount: string;
  date: string;
  investors: string;
}

export interface ClaimProfileFormResult {
  companyName: string;
  description: string;
  businessModel: BusinessModel | string;
  industry: string;
  founded: string;
  city: string;
  region: string;
  country: string;
  website: string;
  linkedin: string;
  crunchbase: string;
  twitter: string;
  fundingRounds: ClaimFundingRound[];
  notes: string;
  /** Prefer OpenSearch / selected-hit logo when present. */
  logoUrl?: string | null;
}

export interface ClaimProfileSnapshot {
  description?: string;
  category?: string;
  founded?: string;
  employees?: string;
  stage?: string;
}

export interface BuildClaimProfileInput {
  companyName: string;
  confirmedProfile: ClaimProfileFormResult | null;
  rawEnrichment: EnrichmentPayload | null;
  benchmark: OnboardingBenchmarkBlob | Record<string, string> | null;
  snapshot?: ClaimProfileSnapshot | null;
}

/** Persisted under `catalog_companies.sources.onboarding` at claim time. */
export type CatalogOnboardingSnapshot = {
  wizardVersion?: string;
  flowType?: "operating" | "investor";
  cohortKey?: string | null;
  businessModelLabel?: string | null;
  stage?: string | null;
  notes?: string | null;
  profileForm?: OnboardingProfileFormSnapshot | null;
  fundingRounds?: ClaimFundingRound[] | null;
  /** Dev / GTM / RevOps wizard answers. */
  operating?: OnboardingAnswers | null;
  /** Investor thesis wizard answers. */
  investor?: InvestorAnswers | null;
  /** Raw benchmark strings as entered in the wizard. */
  benchmark?: OnboardingBenchmarkBlob | Record<string, string> | null;
  submittedAt?: string;
};

export type ClaimProfilePayload = ReturnType<typeof buildClaimProfile>;

export type WizardPersistPayload = {
  flowType?: "operating" | "investor" | null;
  cohortKey?: string | null;
  answers?: OnboardingAnswers | null;
  investorAnswers?: InvestorAnswers | null;
  profileForm?: OnboardingProfileFormSnapshot | null;
  fundingRounds?: ClaimFundingRound[] | null;
  rawBenchmarkInputs?: RawBenchmarkInputs | null;
};

/** Merge v2 wizard answers into the catalog company profile before insert. */
export function enrichClaimProfileWithWizard(
  profile: ParsedClaimBody["profile"],
  wizard: WizardPersistPayload,
): ParsedClaimBody["profile"] {
  const prev = profile.sources ?? {};
  const prevOnboarding = (prev.onboarding ?? {}) as CatalogOnboardingSnapshot;

  const hasBenchmark =
    wizard.rawBenchmarkInputs &&
    Object.values(wizard.rawBenchmarkInputs).some((v) => v.trim());
  const benchmark = hasBenchmark
    ? wizard.rawBenchmarkInputs
    : prevOnboarding.benchmark ?? null;

  const fundingRounds =
    wizard.fundingRounds && wizard.fundingRounds.length > 0
      ? wizard.fundingRounds
      : prevOnboarding.fundingRounds ?? null;

  const onboarding: CatalogOnboardingSnapshot = {
    ...prevOnboarding,
    wizardVersion: "v2",
    flowType: wizard.flowType ?? prevOnboarding.flowType ?? "operating",
    cohortKey: wizard.cohortKey?.trim() || prevOnboarding.cohortKey || null,
    businessModelLabel:
      wizard.profileForm?.businessModel ??
      prevOnboarding.businessModelLabel ??
      null,
    profileForm: wizard.profileForm ?? prevOnboarding.profileForm ?? null,
    fundingRounds,
    notes:
      wizard.profileForm?.additionalContext?.trim() ||
      prevOnboarding.notes ||
      null,
    operating: wizard.answers ?? prevOnboarding.operating ?? null,
    investor: wizard.investorAnswers ?? prevOnboarding.investor ?? null,
    benchmark,
    submittedAt: new Date().toISOString(),
  };

  return {
    ...profile,
    logoUrl:
      profile.logoUrl ??
      safeUrl(wizard.profileForm?.logoUrl) ??
      logoUrlFromEnrichmentSources(prev) ??
      null,
    sources: {
      ...prev,
      onboarding,
    },
  };
}

export function parseUsdAmount(s: string): number | null {
  if (!s) return null;
  const clean = s.replace(/[$,\s]/g, "").toUpperCase();
  const m = /^([\d.]+)([KMB])?$/.exec(clean);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  const mult =
    m[2] === "K"
      ? 1_000
      : m[2] === "M"
        ? 1_000_000
        : m[2] === "B"
          ? 1_000_000_000
          : 1;
  return Math.round(n * mult);
}

/** Return the string only if it's a valid absolute URL, otherwise null. */
export function safeUrl(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? s : null;
  } catch {
    return null;
  }
}

/** Logo from enrichment `sources.logoUrl` (OpenSearch preferred, else LinkedIn). */
export function logoUrlFromEnrichmentSources(
  sources: Record<string, unknown> | null | undefined,
): string | null {
  if (!sources) return null;
  const value = sources.logoUrl;
  return typeof value === "string" ? safeUrl(value) : null;
}

export function buildClaimProfile(
  domain: string,
  input: BuildClaimProfileInput,
): {
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  logoUrl: string | null;
  industry: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  employeeCount: string | null;
  foundedOn: string | null;
  website: string | null;
  totalFundingUsd: number | null;
  numFundingRounds: number | null;
  linkedinUrl: string | null;
  crunchbaseUrl: string | null;
  twitterUrl: string | null;
  businessModel: string | null;
  sources: Record<string, unknown>;
} {
  const p = input.confirmedProfile;
  const raw = input.rawEnrichment;
  const snap = input.snapshot;

  const userRounds = (p?.fundingRounds ?? []).filter(
    (r) => r.type || r.amount || r.date || r.investors,
  );
  const derivedTotal =
    userRounds.length > 0
      ? userRounds.reduce((sum, r) => sum + (parseUsdAmount(r.amount) ?? 0), 0) ||
        null
      : null;

  return {
    name: ((p?.companyName ?? input.companyName) || domain).trim().slice(0, 200),
    shortDescription:
      (p?.description?.trim() || snap?.description?.trim() || null)?.slice(
        0,
        2_000,
      ) ?? null,
    longDescription: (raw?.longDescription ?? null)?.slice(0, 20_000) ?? null,
    logoUrl:
      safeUrl(p?.logoUrl) ?? logoUrlFromEnrichmentSources(raw?.sources) ?? null,
    industry:
      (
        p?.industry?.trim() ||
        (typeof snap?.category === "string" ? snap.category.trim() : "") ||
        null
      )?.slice(0, 120) ?? null,
    locationCity: p?.city?.trim().slice(0, 120) || null,
    locationState: p?.region?.trim().slice(0, 120) || null,
    locationCountry: p?.country?.trim().slice(0, 120) || null,
    employeeCount:
      (raw?.employeeCount || snap?.employees || null)?.slice(0, 60) ?? null,
    foundedOn:
      (p?.founded?.trim() || snap?.founded?.trim() || null)?.slice(0, 40) ??
      null,
    website: safeUrl(p?.website) ?? safeUrl(raw?.websiteUrl) ?? null,
    totalFundingUsd: derivedTotal ?? raw?.totalFundingUsd ?? null,
    numFundingRounds:
      userRounds.length > 0 ? userRounds.length : (raw?.numFundingRounds ?? null),
    linkedinUrl: safeUrl(p?.linkedin) ?? safeUrl(raw?.linkedinUrl) ?? null,
    crunchbaseUrl: safeUrl(p?.crunchbase) ?? safeUrl(raw?.crunchbaseUrl) ?? null,
    twitterUrl: safeUrl(p?.twitter) ?? safeUrl(raw?.twitterUrl) ?? null,
    businessModel: (p?.businessModel || null) as string | null,
    sources: {
      ...(raw?.sources ?? {}),
      onboarding: {
        stage: snap?.stage ?? null,
        notes: p?.notes ?? null,
        benchmark: input.benchmark || null,
        fundingRounds: userRounds.length > 0 ? userRounds : null,
      },
    },
  };
}
