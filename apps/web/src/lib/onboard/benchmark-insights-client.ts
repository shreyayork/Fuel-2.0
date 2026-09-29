"use client";

import type {
  OnboardBenchmarkInsightCard,
  OnboardBenchmarkInsightsResponse,
} from "@/lib/onboard/benchmark-insights-types";

export type FetchOnboardBenchmarkInsightsInput = {
  companyName: string;
  cohortKey: string | null;
  cohortLabel: string;
  industry?: string | null;
  businessModel?: string | null;
  locationCountry?: string | null;
  fundingRoundTypes?: string[];
  answers: Record<string, string>;
};

export function mergeInsightCards<T extends { signalId: string; cat: string; id: string }>(
  llmCards: T[],
  templateCards: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const card of templateCards) {
    byKey.set(`${card.signalId}:${card.cat}`, card);
  }
  for (const card of llmCards) {
    byKey.set(`${card.signalId}:${card.cat}`, card);
  }
  const order = ["Intelligence", "Initiative", "Playbook"] as const;
  return [...byKey.values()].sort((a, b) => {
    const catOrder = order.indexOf(a.cat as (typeof order)[number]) - order.indexOf(b.cat as (typeof order)[number]);
    if (catOrder !== 0) return catOrder;
    return a.signalId.localeCompare(b.signalId);
  });
}

const BENCHMARK_INSIGHTS_TIMEOUT_MS = 55_000;

export async function fetchOnboardBenchmarkInsights(
  input: FetchOnboardBenchmarkInsightsInput,
  options?: { signal?: AbortSignal },
): Promise<OnboardBenchmarkInsightsResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BENCHMARK_INSIGHTS_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  if (options?.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeout);
      return { cards: [], fallback: true };
    }
    options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const res = await fetch("/api/onboard/benchmark-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { cards: [], fallback: true };
    return (await res.json()) as OnboardBenchmarkInsightsResponse;
  } catch (e) {
    if ((e as Error).name === "AbortError" && options?.signal?.aborted) throw e;
    return { cards: [], fallback: true };
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", onExternalAbort);
  }
}

export function toMotionInsightCards(
  cards: OnboardBenchmarkInsightCard[],
): Array<{
  id: string;
  cat: "Intelligence" | "Initiative" | "Playbook";
  color: string;
  icon: string;
  title: string;
  body: string;
  metricLabel: string;
  displayVal: string;
  signalCategory: string;
  signalId: string;
  signalLabel: string;
  linkedIntelligenceId?: string;
  linkedIntelligenceTitle?: string;
}> {
  const colors = { Intelligence: "#2BB8A0", Initiative: "#00B48A", Playbook: "#D4924A" };
  const icons = { Intelligence: "◎", Initiative: "↗", Playbook: "▤" };
  return cards.map((c) => ({
    id: c.id,
    cat: c.cat,
    color: colors[c.cat],
    icon: icons[c.cat],
    title: c.title,
    body: c.body,
    metricLabel: c.metricLabel,
    displayVal: c.displayVal,
    signalCategory: c.signalCategory,
    signalId: c.signalId,
    signalLabel: c.signalLabel,
    linkedIntelligenceId: c.linkedIntelligenceId ?? undefined,
    linkedIntelligenceTitle: c.linkedIntelligenceTitle ?? undefined,
  }));
}
