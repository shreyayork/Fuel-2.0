import {
  BENCHMARK_DRAWER_FIELDS,
  emptyBenchmarkDrawerValues,
  type BenchmarkDrawerFieldKey,
  type BenchmarkDrawerValues,
} from "@/lib/overview/benchmark-drawer-fields";
import { fetchBenchmarkDrawer } from "@/lib/overview/client";

export const KPI_BENCHMARK_SLUG = "kpi-benchmark";

/** Derived / computed metrics — not shown in the Fuel AI fill form. */
export const KPI_LOGICAL_FIELD_KEYS = ["burnMultiple", "ruleOf40"] as const satisfies ReadonlyArray<
  BenchmarkDrawerFieldKey
>;

/** Founder-entered metrics (same set as onboarding, minus derived fields). */
export const KPI_CHAT_FIELD_KEYS = BENCHMARK_DRAWER_FIELDS.map((f) => f.key).filter(
  (key): key is BenchmarkDrawerFieldKey =>
    !(KPI_LOGICAL_FIELD_KEYS as readonly string[]).includes(key),
);

export const MISSING_KPI_BENCHMARK_MESSAGE =
  "Benchmark numbers aren't saved for this company yet. Add them below so Fuel can compare you to the peer cohort — or run anyway with whatever we already know.";

export function isKpiBenchmarkSlug(slug: string): boolean {
  return slug === KPI_BENCHMARK_SLUG;
}

export function missingKpiBenchmarkFieldKeys(
  values: BenchmarkDrawerValues,
): BenchmarkDrawerFieldKey[] {
  return KPI_CHAT_FIELD_KEYS.filter((key) => !values[key]?.trim());
}

/** True once every founder-entered metric is saved — the gate is skipped then. */
export function isKpiBenchmarkComplete(values: BenchmarkDrawerValues): boolean {
  return missingKpiBenchmarkFieldKeys(values).length === 0;
}

export function kpiBenchmarkGateMessage(values?: BenchmarkDrawerValues): string {
  if (!values) return MISSING_KPI_BENCHMARK_MESSAGE;
  const missing = missingKpiBenchmarkFieldKeys(values).length;
  const total = KPI_CHAT_FIELD_KEYS.length;
  if (missing === total) return MISSING_KPI_BENCHMARK_MESSAGE;
  return `Fuel has ${total - missing} of ${total} benchmark numbers for this company. Fill in the ${missing} that ${missing === 1 ? "is" : "are"} still missing so the cohort comparison is sharper — or run anyway with what's saved.`;
}

/**
 * Saved metrics for the gate. Returns null when the lookup fails — the caller
 * treats that as "no numbers" and offers the fill form.
 */
export async function fetchKpiBenchmarkValues(
  companyUuid: string,
): Promise<BenchmarkDrawerValues | null> {
  try {
    const payload = await fetchBenchmarkDrawer(companyUuid, { force: true });
    return payload.values;
  } catch {
    return null;
  }
}

export function kpiChatFieldDefs() {
  return BENCHMARK_DRAWER_FIELDS.filter((f) =>
    KPI_CHAT_FIELD_KEYS.includes(f.key),
  );
}

export function buildKpiRunAnywayPromptBlock(): string {
  return `The founder chose to run this benchmark without filling numbers in this session. Use getPortfolioUpdate / getCompanyObservations if any metrics exist. Do not invent KPIs. If numbers are missing, say so in the snapshot table and still give qualitative next steps. Do not ask them to paste contextItemId or internal field names.`;
}

export function emptyChatBenchmarkValues(): BenchmarkDrawerValues {
  return emptyBenchmarkDrawerValues();
}

/**
 * Strong "this is a finished report" signals. Any hit → not a clarification.
 * Extend when new playbook heading/table shapes land in Research.
 *
 * Residual limitation: a short report whose only heading is something like
 * "## Efficiency Overview" (no "snapshot" / "diagnosis" / metric table) can
 * still look like clarification if it also uses strong ask phrasing.
 */
const KPI_REPORT_ESCAPE_PATTERNS: readonly RegExp[] = [
  /^#{1,6}\s+.*\bsnapshot\b/im,
  /^#{1,6}\s+diagnosis\b/im,
  /\|\s*metric\s*\|\s*you\s*\|/i,
  // Populated markdown comparison table (header + ≥2 data rows).
  /(?:^|\n)\|[^\n]+\|(?:\n\|[-:| ]+\|)?(?:\n\|[^\n]+\|){2,}/m,
];

/**
 * Phrases that mean the model is asking the founder for missing numbers —
 * not incidental words like "cloud provider" or "data I need in parallel".
 */
const KPI_ASKS_NUMBERS_PATTERNS: readonly RegExp[] = [
  /\bplease provide (?:your|the)\b/i,
  /\bprovide (?:your|the) (?:arr|kpi|kpis|numbers?|metrics?|benchmarks?)\b/i,
  /\bshare your (?:arr|kpi|kpis|numbers?|metrics?|benchmarks?)\b/i,
  /\bi don't have (?:your|the)\b/i,
  /\bi need your\b/i,
  /\bi need (?:the )?(?:numbers?|metrics?|kpis?|arr)\b/i,
  /\bpaste your (?:arr|kpi|kpis|numbers?|metrics?|benchmarks?)\b/i,
  /\bfill in your (?:arr|kpi|kpis|numbers?|metrics?|benchmarks?)\b/i,
];

const KPI_METRIC_CONTEXT_PATTERN = /\b(?:arr|kpi|kpis|benchmark)\b/i;

export function looksLikeKpiClarification(output: string): boolean {
  const text = output.trim();
  if (!text) return false;

  for (const pattern of KPI_REPORT_ESCAPE_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  if (!KPI_METRIC_CONTEXT_PATTERN.test(text)) return false;

  return KPI_ASKS_NUMBERS_PATTERNS.some((pattern) => pattern.test(text));
}
