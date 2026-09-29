import { ONBOARD_UNKNOWN_ANSWER, ONBOARD_UNKNOWN_LABEL } from "@/lib/onboard/unknown-answer";
import { OVERVIEW_BENCHMARK_METRIC_KEYS } from "./constants";

const BENCHMARK_SIGNAL_IDS = new Set<string>(OVERVIEW_BENCHMARK_METRIC_KEYS);

/** Highlights the model invents when a metric/answer was never logged. */
const PLACEHOLDER_HIGHLIGHTS = new Set(
  [
    "unknown",
    "n/a",
    "na",
    "none",
    "not logged",
    "not provided",
    "not available",
    "tbd",
    "—",
    "-",
    ONBOARD_UNKNOWN_ANSWER,
    ONBOARD_UNKNOWN_LABEL,
    "i don't know / na",
    "i don't know",
  ].map((s) => s.toLowerCase()),
);

export type OverviewIntelligenceCandidate = {
  signal_id: string;
  highlight?: string | null;
  text?: string;
  title?: string;
};

export function isPlaceholderIntelligenceHighlight(
  highlight: string | null | undefined,
): boolean {
  const trimmed = (highlight ?? "").trim();
  if (!trimmed) return false;
  return PLACEHOLDER_HIGHLIGHTS.has(trimmed.toLowerCase());
}

function hasLoggedBenchmarkValue(
  signalId: string,
  benchmarkValues: Record<string, number | null | undefined>,
): boolean {
  const v = benchmarkValues[signalId];
  return v != null && Number.isFinite(v);
}

/**
 * Drop overview-generated intelligence that is not backed by real evidence.
 * Used after onboard claim when the benchmark form is empty or only partially filled —
 * the model otherwise invents catalog rows with "Unknown" highlights.
 */
export function filterOverviewIntelligence<T extends OverviewIntelligenceCandidate>(
  items: T[],
  opts: {
    benchmarkValues: Record<string, number | null | undefined>;
  },
): T[] {
  return items.filter((item) => {
    if (isPlaceholderIntelligenceHighlight(item.highlight)) return false;

    if (BENCHMARK_SIGNAL_IDS.has(item.signal_id)) {
      return hasLoggedBenchmarkValue(item.signal_id, opts.benchmarkValues);
    }

    // Qualitative / non-benchmark catalog signals need a concrete highlight or body.
    const highlight = (item.highlight ?? "").trim();
    const text = (item.text ?? "").trim();
    return Boolean(highlight || text);
  });
}
