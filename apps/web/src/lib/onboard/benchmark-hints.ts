import type { BenchmarkHints } from "@/lib/agent/skills/extractBenchmarkHints";
import type { OnboardBenchmarkInputs } from "@/lib/onboard/benchmark-fields";
import {
  benchmarkInputsToFormStrings,
  normalizeCountFormString,
  normalizeUsdFormString,
} from "@/lib/onboard/benchmark-fields";

export type { BenchmarkHints };

/** V2 onboarding benchmark blob stored in profile.sources.onboarding.benchmark */
export type OnboardingBenchmarkBlob = {
  arr?: string;
  arrGrowth?: string;
  nrr?: string;
  logoRetention?: string;
  monthlyBurn?: string;
  cashOnHand?: string;
  grossMargin?: string;
  cacPayback?: string;
  burnMultiple?: string;
  ruleOf40?: string;
  headcount?: string;
  payingCustomers?: string;
  notableCustomers?: string;
  currentChallenges?: string;
};

/** Map API benchmark hints into form string state (OnboardBenchmarkInputs keys). */
export function hintsToFormStrings(
  hints: BenchmarkHints | null | undefined,
): Record<keyof OnboardBenchmarkInputs, string> {
  const base = benchmarkInputsToFormStrings(null);
  if (!hints) return base;

  const set = (key: keyof OnboardBenchmarkInputs, val: string | null | undefined) => {
    if (val?.trim()) base[key] = val.trim();
  };

  const setUsd = (key: keyof OnboardBenchmarkInputs, val: string | null | undefined) => {
    const normalized = normalizeUsdFormString(val);
    if (normalized) base[key] = normalized;
  };

  setUsd("arrUsd", hints.arr);
  set("fteCount", normalizeCountFormString(hints.headcount) || undefined);
  setUsd("cashOnHandUsd", hints.cashOnHand);
  setUsd("monthlyBurnUsd", hints.monthlyBurn);
  set(
    "paidCustomerCount",
    normalizeCountFormString(hints.payingCustomers) || undefined,
  );
  set("notableCustomers", hints.notableCustomers);
  set("challenges", hints.currentChallenges);

  return base;
}

export function inputsToOnboardingBenchmark(
  inputs: OnboardBenchmarkInputs | null | undefined,
): OnboardingBenchmarkBlob | null {
  if (!inputs) return null;

  const str = (v: number | string | null | undefined): string | undefined => {
    if (v == null || v === "") return undefined;
    return String(v);
  };

  const blob: OnboardingBenchmarkBlob = {
    arr: str(inputs.arrUsd),
    arrGrowth: str(inputs.arrGrowthYoyPct),
    nrr: str(inputs.nrrPct),
    logoRetention: str(inputs.logoRetentionPct),
    monthlyBurn: str(inputs.monthlyBurnUsd),
    cashOnHand: str(inputs.cashOnHandUsd),
    grossMargin: str(inputs.grossMarginPct),
    headcount: str(inputs.fteCount),
    payingCustomers: str(inputs.paidCustomerCount),
    notableCustomers: inputs.notableCustomers ?? undefined,
    currentChallenges: inputs.challenges ?? undefined,
  };

  const hasValue = Object.values(blob).some((v) => v != null && v !== "");
  return hasValue ? blob : null;
}

/** Map typed inputs to V2 string-key benchmark record for claim profile. */
export function inputsToBenchmarkRecord(
  inputs: OnboardBenchmarkInputs | null | undefined,
): Record<string, string> | null {
  const blob = inputsToOnboardingBenchmark(inputs);
  if (!blob) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(blob)) {
    if (v != null && v !== "") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}
