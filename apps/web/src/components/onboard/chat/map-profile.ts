import { inputsToOnboardingBenchmark } from "@/lib/onboard/benchmark-hints";
import {
  buildClaimProfile,
  type ClaimProfileSnapshot,
} from "@/lib/onboard/claim-profile";
import type { OnboardingUserData } from "./types";

/** Maps chat-collected data to the onboard claim API profile shape. */
export function buildClaimProfileFromUserData(
  data: OnboardingUserData,
  domain: string,
) {
  const profile = data.crunchbaseData;
  const snapshot: ClaimProfileSnapshot | null = profile
    ? {
        description: profile.description,
        category: profile.category,
        founded: profile.founded,
        employees: profile.employees,
        stage: profile.stage,
      }
    : null;

  return buildClaimProfile(domain, {
    companyName: data.companyName,
    confirmedProfile: data.confirmedProfile,
    rawEnrichment: data.enrichment,
    benchmark: inputsToOnboardingBenchmark(data.benchmarkInputs),
    snapshot,
  });
}
