import type { BenchmarkHints } from "@/lib/agent/skills/extractBenchmarkHints";
import type { ExtractCompanyProfileResult } from "@/lib/agent/skills/extractCompanyProfile";
import type { BusinessModel } from "@/lib/business-model";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";
import type {
  FieldConfidence,
  ProfilePrefillFieldKey,
} from "@/lib/onboard/build-profile-prefill";
import type { CohortFilter } from "@/lib/benchmarks-shared";
import type { OnboardBenchmarkInputs } from "@/lib/onboard/benchmark-fields";
import type { CompanyHintSource } from "@/lib/onboard/company-hint-types";
import type { OnboardCohortListEntry } from "@/lib/onboard/cohort-client";
import type { OnboardBenchmarkRow } from "@/lib/onboard/profile-types";

export type { OnboardBenchmarkInputs };
export type { CompanyHintSource };

export type OnboardingStep =
  | "greeting"
  | "company-confirm"
  | "company-name"
  | "domain-confirm"
  | "crunchbase-fetching"
  | "crunchbase-confirm"
  | "benchmark"
  | "fuel-value"
  | "york-services"
  | "york-link"
  | "platform-overview"
  | "claiming"
  | "done";

export type ChatCardType =
  | "crunchbase"
  | "domain-confirm"
  | "profile-form"
  | "benchmark"
  | "value-prop"
  | "york-services"
  | "york-projects"
  | "york-cta";

export interface ChatChip {
  label: string;
  value: string;
  icon?: string;
}

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  chips?: ChatChip[];
  cardType?: ChatCardType;
  disabled?: boolean;
}

export interface CrunchbaseProfile {
  name: string;
  description: string;
  stage: string;
  employees: string;
  founded: string;
  location: string;
  totalFunding: string;
  category: string;
  website: string;
}

export interface FundingRound {
  id: string;
  type: string;
  amount: string;
  date: string;
  investors: string;
}

export interface ProfileFormResult {
  companyName: string;
  description: string;
  businessModel: BusinessModel;
  industry: string;
  founded: string;
  city: string;
  region: string;
  country: string;
  website: string;
  linkedin: string;
  crunchbase: string;
  twitter: string;
  fundingRounds: FundingRound[];
  notes: string;
  domain: string;
  /** Prefer OpenSearch logo from enrichment sources when present. */
  logoUrl?: string | null;
}

export interface OnboardingUserData {
  email: string;
  isYorkClient: boolean;
  companyName: string;
  companyHintSource?: CompanyHintSource;
  teamSize: string;
  domain: string;
  verifiedDomain: string;
  businessModel: BusinessModel | null;
  profileNotes: string;
  linkedinUrl: string;
  fundingRounds: FundingRound[];
  locationCity: string;
  locationState: string;
  locationCountry: string;
  crunchbaseData: CrunchbaseProfile | null;
  enrichment: EnrichmentPayload | null;
  extracted: ExtractCompanyProfileResult | null;
  fieldSources: Partial<Record<ProfilePrefillFieldKey, string>>;
  fieldConfidence: Partial<Record<ProfilePrefillFieldKey, FieldConfidence>>;
  benchmarkHints: BenchmarkHints | null;
  confirmedProfile: ProfileFormResult | null;
  benchmarkInputs: OnboardBenchmarkInputs | null;
  cohortKey: string | null;
  cohortSampleSize: number | null;
  cohortBenchmarkRows: OnboardBenchmarkRow[];
  cohortInferred: CohortFilter | null;
  allCohorts: OnboardCohortListEntry[];
}

export type OnboardCta = "benchmark" | "pitch-deck" | "explore";
