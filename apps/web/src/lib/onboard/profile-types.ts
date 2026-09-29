import type { BenchmarkHints } from "@/lib/agent/skills/extractBenchmarkHints";
import type { ExtractCompanyProfileResult } from "@/lib/agent/skills/extractCompanyProfile";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";

export type OnboardBenchmarkRow = {
  metric: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  unit: string | null;
  invertedGood: boolean | null;
  sampleSize: number | null;
};

/** Composite payload sent once enrichment + extraction settle. */
export interface OnboardProfilePayload {
  enrichment: EnrichmentPayload;
  /** Skill output — present unless the extractor errored. */
  extracted: ExtractCompanyProfileResult | null;
  /** LLM-extracted + structurally-computed benchmark hints for the BenchmarkCard pre-fill. */
  benchmarkHints: BenchmarkHints | null;
}

export type OnboardStepId =
  | "website"
  | "techstack"
  | "crunchbase"
  | "linkedin"
  | "extract"
  | "cohort";

export interface OnboardStepEvent {
  type: "step";
  id: OnboardStepId;
  status: "running" | "done" | "error";
  label: string;
  error?: string;
}

export interface OnboardProfileEvent {
  type: "profile";
  payload: OnboardProfilePayload;
  /** True while LinkedIn / extract still running. */
  partial?: boolean;
  /**
   * Client may show review while slower provider work continues.
   */
  unlockReview?: boolean;
}

export interface OnboardDoneEvent {
  type: "done";
}

export interface OnboardJobEvent {
  type: "job";
  runId: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
}

export interface OnboardErrorEvent {
  type: "error";
  code: "blocked_provider" | "already_has_account" | "unknown";
  message: string;
}

export type OnboardStreamEvent =
  | OnboardStepEvent
  | OnboardProfileEvent
  | OnboardJobEvent
  | OnboardDoneEvent
  | OnboardErrorEvent;

export const ONBOARD_STEP_LABELS: Record<OnboardStepId, string> = {
  website: "Scanning your homepage",
  techstack: "Detecting your tech stack",
  crunchbase: "Looking up Crunchbase profile",
  linkedin: "Looking up LinkedIn profile",
  extract: "Reading the details into a profile",
  cohort: "Identifying your peer cohort",
};
