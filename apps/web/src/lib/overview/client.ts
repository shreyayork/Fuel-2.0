/**
 * Typed client helpers for Overview page fetch/mutate calls.
 * UI components should prefer these over ad-hoc `fetch` + `as` casts.
 */
import type { OverviewCategoryId } from "@/lib/overview/constants";
import type {
  OverviewApiResponse,
  OverviewBenchmarkDrawerPayload,
  ScoreContributor,
} from "@/lib/overview/types";
import type { FullSummaryPayload } from "@/lib/overview/full-summary-types";
import type {
  BenchmarkDrawerFieldKey,
  BenchmarkDrawerUnit,
  BenchmarkDrawerValues,
} from "@/lib/overview/benchmark-drawer-fields";
import { emptyBenchmarkDrawerValues } from "@/lib/overview/benchmark-drawer-fields";

export class OverviewClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OverviewClientError";
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export type ScoreBreakdownPayload = {
  contributors?: ScoreContributor[];
};

const breakdownCache = new Map<string, ScoreBreakdownPayload>();
const detailAnswersCache = new Map<string, Record<string, string>>();
const benchmarkDrawerCache = new Map<string, OverviewBenchmarkDrawerPayload>();

function benchmarkDrawerCacheKey(
  companyUuid: string,
  cohortKey?: string | null,
): string {
  const key = cohortKey?.trim();
  return key ? `${companyUuid}::${key}` : companyUuid;
}

/** Seed form caches from an Overview GET / mutation payload. */
export function seedOverviewFormCaches(
  companyUuid: string,
  data: Pick<OverviewApiResponse, "detailAnswers" | "benchmarkDrawer">,
): void {
  if (data.detailAnswers) {
    detailAnswersCache.set(companyUuid, { ...data.detailAnswers });
  }
  if (data.benchmarkDrawer) {
    setCachedBenchmarkDrawer(companyUuid, data.benchmarkDrawer);
  }
}

export function getCachedDetailAnswers(
  companyUuid: string,
): Record<string, string> | null {
  if (!detailAnswersCache.has(companyUuid)) return null;
  return { ...detailAnswersCache.get(companyUuid)! };
}

export function setCachedDetailAnswers(
  companyUuid: string,
  answers: Record<string, string>,
): void {
  detailAnswersCache.set(companyUuid, { ...answers });
}

export function getCachedBenchmarkDrawer(
  companyUuid: string,
  cohortKey?: string | null,
): OverviewBenchmarkDrawerPayload | null {
  return (
    benchmarkDrawerCache.get(benchmarkDrawerCacheKey(companyUuid, cohortKey)) ??
    null
  );
}

export function setCachedBenchmarkDrawer(
  companyUuid: string,
  payload: OverviewBenchmarkDrawerPayload,
): void {
  const withCohorts: OverviewBenchmarkDrawerPayload = {
    ...payload,
    allCohorts: payload.allCohorts ?? [],
  };
  // Default slot = current resolved cohort for the company.
  benchmarkDrawerCache.set(companyUuid, withCohorts);
  if (withCohorts.cohortKey) {
    benchmarkDrawerCache.set(
      benchmarkDrawerCacheKey(companyUuid, withCohorts.cohortKey),
      withCohorts,
    );
  }
}

export async function fetchOverview(companyUuid: string): Promise<OverviewApiResponse> {
  const res = await fetch(`/api/company/${companyUuid}/overview`, { cache: "no-store" });
  if (!res.ok) throw new OverviewClientError("fetch_failed", res.status);
  const data = await parseJson<OverviewApiResponse>(res);
  seedOverviewFormCaches(companyUuid, {
    detailAnswers: data.detailAnswers ?? {},
    benchmarkDrawer: data.benchmarkDrawer ?? null,
  });
  return data;
}

export async function fetchFullSummary(
  companyUuid: string,
  companyName?: string,
): Promise<FullSummaryPayload> {
  const qs = companyName
    ? `?name=${encodeURIComponent(companyName)}`
    : "";
  const res = await fetch(`/api/company/${companyUuid}/overview/full-summary${qs}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new OverviewClientError("full_summary_fetch_failed", res.status);
  return parseJson<FullSummaryPayload>(res);
}

export async function postOverviewGenerate(
  companyUuid: string,
  mode: "generate" | "regenerate" = "regenerate",
): Promise<OverviewApiResponse | void> {
  const res = await fetch(`/api/company/${companyUuid}/overview/${mode}`, {
    method: "POST",
  });
  if (!res.ok) throw new OverviewClientError(`${mode}_failed`, res.status);
  if (res.headers.get("content-type")?.includes("application/json")) {
    const data = await parseJson<OverviewApiResponse>(res);
    seedOverviewFormCaches(companyUuid, {
      detailAnswers: data.detailAnswers ?? {},
      benchmarkDrawer: data.benchmarkDrawer ?? null,
    });
    return data;
  }
}

export async function fetchCategoryDetail(
  companyUuid: string,
  categoryId: OverviewCategoryId,
): Promise<{
  playbooks?: Array<{ slug: string; title: string; description: string; content?: string }>;
  [key: string]: unknown;
}> {
  const res = await fetch(
    `/api/company/${companyUuid}/overview/category/${categoryId}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new OverviewClientError("category_fetch_failed", res.status);
  return parseJson(res);
}

export async function approveOverviewInitiative(
  companyUuid: string,
  initiativeId: string,
): Promise<void> {
  const res = await fetch(`/api/company/${companyUuid}/overview/approve-initiative`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initiativeId }),
  });
  if (!res.ok) throw new OverviewClientError("approve_failed", res.status);
}

export async function fetchDetailAnswers(
  companyUuid: string,
  opts?: { force?: boolean },
): Promise<Record<string, string>> {
  if (!opts?.force) {
    const cached = getCachedDetailAnswers(companyUuid);
    if (cached) return cached;
  }
  const res = await fetch(`/api/company/${companyUuid}/overview/detail-answers`, {
    cache: "no-store",
  });
  if (!res.ok) throw new OverviewClientError("detail_answers_fetch_failed", res.status);
  const j = await parseJson<{ answers?: Record<string, string | null> }>(res);
  const merged: Record<string, string> = {};
  for (const [id, value] of Object.entries(j.answers ?? {})) {
    if (value?.trim()) merged[id] = value.trim();
  }
  setCachedDetailAnswers(companyUuid, merged);
  return merged;
}

export type OverviewMutationResult = {
  ok: true;
  regenerating?: boolean;
  overview?: OverviewApiResponse;
  rewards?: import("@/lib/credits/profile-modules").ProfileCreditReward[];
};

/** Query + sessionStorage coordination for playbook → intelligence refresh UX. */
export const BENCHMARK_REFRESH_PARAM = "benchmarkRefreshing";

export function benchmarkRefreshStorageKey(companyUuid: string): string {
  return `fuel:benchmark-refresh:${companyUuid}`;
}

export function markBenchmarkRefreshPending(companyUuid: string): void {
  try {
    sessionStorage.setItem(benchmarkRefreshStorageKey(companyUuid), "pending");
  } catch {
    // private mode / blocked storage
  }
}

export function markBenchmarkRefreshSaved(companyUuid: string): void {
  try {
    sessionStorage.setItem(benchmarkRefreshStorageKey(companyUuid), "saved");
  } catch {
    // ignore
  }
}

export function markBenchmarkRefreshError(companyUuid: string): void {
  try {
    sessionStorage.setItem(benchmarkRefreshStorageKey(companyUuid), "error");
  } catch {
    // ignore
  }
}

export function clearBenchmarkRefresh(companyUuid: string): void {
  try {
    sessionStorage.removeItem(benchmarkRefreshStorageKey(companyUuid));
  } catch {
    // ignore
  }
}

export function readBenchmarkRefreshState(
  companyUuid: string,
): "pending" | "saved" | "error" | null {
  try {
    const v = sessionStorage.getItem(benchmarkRefreshStorageKey(companyUuid));
    if (v === "pending" || v === "saved" || v === "error") return v;
    return null;
  } catch {
    return null;
  }
}

export async function patchDetailAnswers(
  companyUuid: string,
  answers: Record<string, string>,
  regenerate = true,
): Promise<OverviewMutationResult> {
  const q = regenerate ? "?regenerate=true" : "";
  const res = await fetch(`/api/company/${companyUuid}/overview/detail-answers${q}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new OverviewClientError("detail_answers_save_failed", res.status);
  const result = await parseJson<OverviewMutationResult>(res);
  setCachedDetailAnswers(companyUuid, answers);
  if (result.overview) {
    seedOverviewFormCaches(companyUuid, {
      detailAnswers: result.overview.detailAnswers ?? answers,
      benchmarkDrawer: result.overview.benchmarkDrawer ?? null,
    });
  }
  return result;
}

export type BenchmarkDrawerFieldMeta = {
  key: BenchmarkDrawerFieldKey;
  label: string;
  placeholder: string;
  unit: BenchmarkDrawerUnit;
  lowerIsBetter: boolean;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

function normalizeBenchmarkPayload(
  json: OverviewBenchmarkDrawerPayload,
): {
  values: BenchmarkDrawerValues;
  fields: BenchmarkDrawerFieldMeta[];
  cohortKey: string | null;
  allCohorts: OverviewBenchmarkDrawerPayload["allCohorts"];
} {
  return {
    values: {
      ...emptyBenchmarkDrawerValues(),
      ...(json.values as Partial<BenchmarkDrawerValues>),
    },
    fields: (json.fields ?? []).map((f) => ({
      key: f.key as BenchmarkDrawerFieldKey,
      label: f.label,
      placeholder: f.placeholder,
      unit: f.unit as BenchmarkDrawerUnit,
      lowerIsBetter: f.lowerIsBetter,
      p25: f.p25,
      p50: f.p50,
      p75: f.p75,
      p90: f.p90,
    })),
    cohortKey: json.cohortKey ?? null,
    allCohorts: json.allCohorts ?? [],
  };
}

export async function fetchBenchmarkDrawer(
  companyUuid: string,
  opts?: { force?: boolean; cohortKey?: string | null },
): Promise<{
  values: BenchmarkDrawerValues;
  fields: BenchmarkDrawerFieldMeta[];
  cohortKey: string | null;
  allCohorts: OverviewBenchmarkDrawerPayload["allCohorts"];
}> {
  const cohortKey = opts?.cohortKey?.trim() || null;
  if (!opts?.force) {
    const cached = getCachedBenchmarkDrawer(companyUuid, cohortKey);
    if (cached?.fields?.length) {
      return normalizeBenchmarkPayload(cached);
    }
  }
  const qs = cohortKey ? `?cohort=${encodeURIComponent(cohortKey)}` : "";
  const res = await fetch(`/api/company/${companyUuid}/overview/benchmark${qs}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new OverviewClientError("benchmark_fetch_failed", res.status);
  const json = await parseJson<OverviewBenchmarkDrawerPayload>(res);
  setCachedBenchmarkDrawer(companyUuid, json);
  return normalizeBenchmarkPayload(json);
}

export async function patchBenchmarkDrawer(
  companyUuid: string,
  values: BenchmarkDrawerValues,
  regenerate = true,
  opts?: { includeOverview?: boolean; cohortKey?: string | null },
): Promise<OverviewMutationResult> {
  const includeOverview = opts?.includeOverview !== false;
  const cohortKey = opts?.cohortKey?.trim() || null;
  const res = await fetch(`/api/company/${companyUuid}/overview/benchmark`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      values,
      regenerate,
      includeOverview,
      ...(cohortKey ? { cohortKey } : {}),
    }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { field?: string } | null;
    if (j?.field) {
      throw new OverviewClientError(`Invalid value for ${j.field}. Check the number format.`, res.status);
    }
    throw new OverviewClientError("benchmark_save_failed", res.status);
  }
  const result = await parseJson<OverviewMutationResult>(res);
  if (result.overview?.benchmarkDrawer) {
    seedOverviewFormCaches(companyUuid, {
      detailAnswers: result.overview.detailAnswers ?? getCachedDetailAnswers(companyUuid) ?? {},
      benchmarkDrawer: result.overview.benchmarkDrawer,
    });
  } else {
    const prev = getCachedBenchmarkDrawer(companyUuid, cohortKey);
    if (prev) {
      setCachedBenchmarkDrawer(companyUuid, {
        ...prev,
        values,
        cohortKey: cohortKey ?? prev.cohortKey,
      });
    } else if (!includeOverview) {
      // Navigate-away saves skip the overview payload — drop stale cache.
      invalidateOverviewClientCache(companyUuid, { includeForms: true });
    }
  }
  return result;
}

export async function fetchScoreBreakdown(
  companyUuid: string,
  categoryId: OverviewCategoryId,
  opts?: { cache?: boolean },
): Promise<ScoreBreakdownPayload> {
  const key = `${companyUuid}:${categoryId}`;
  if (opts?.cache !== false && breakdownCache.has(key)) {
    return breakdownCache.get(key)!;
  }
  const res = await fetch(
    `/api/company/${companyUuid}/overview/score-breakdown/${categoryId}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new OverviewClientError("breakdown_fetch_failed", res.status);
  const json = await parseJson<ScoreBreakdownPayload>(res);
  breakdownCache.set(key, json);
  return json;
}

/** Fired when overview data is written from outside the overview page (e.g. Fuel AI). */
export const OVERVIEW_DATA_CHANGED_EVENT = "fuel:overview-data-changed";

/**
 * Drop cached overview payloads and tell a mounted overview page to refetch.
 * The page keeps the payload in state, so a write from another surface would
 * otherwise leave its drawers showing pre-save values.
 */
export function notifyOverviewDataChanged(companyUuid: string): void {
  invalidateOverviewClientCache(companyUuid, { includeForms: true });
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OVERVIEW_DATA_CHANGED_EVENT, { detail: { companyUuid } }),
  );
}

export function invalidateOverviewClientCache(
  companyUuid?: string,
  opts?: { includeForms?: boolean },
): void {
  if (!companyUuid) {
    breakdownCache.clear();
    detailAnswersCache.clear();
    benchmarkDrawerCache.clear();
    return;
  }
  for (const key of breakdownCache.keys()) {
    if (key.startsWith(`${companyUuid}:`)) breakdownCache.delete(key);
  }
  if (opts?.includeForms) {
    detailAnswersCache.delete(companyUuid);
    for (const key of [...benchmarkDrawerCache.keys()]) {
      if (key === companyUuid || key.startsWith(`${companyUuid}::`)) {
        benchmarkDrawerCache.delete(key);
      }
    }
  }
}
