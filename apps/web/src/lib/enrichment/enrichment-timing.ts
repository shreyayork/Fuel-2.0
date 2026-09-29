/** Per-provider timing for a single enrichment pipeline run. */
export type EnrichmentRequestTiming = {
  source: string;
  url?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  ok: boolean;
  cached?: boolean;
  error?: string | null;
};

/** Overall + per-request timing for enrichment diagnostics. */
export type EnrichmentRunTiming = {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  requests: EnrichmentRequestTiming[];
  unavailable: string[];
};

export function scrubProviderError(message: string | null | undefined): string {
  if (!message) return "provider error";
  return message
    .slice(0, 500)
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"'\s]+/gi, "apiKey=[redacted]");
}

export function classifyProviderFailure(
  error: string | null,
): "empty" | "timeout" | "failed" {
  if (error === "empty response") return "empty";
  if (error && /(timed out|timeout|abort)/i.test(error)) return "timeout";
  return "failed";
}
