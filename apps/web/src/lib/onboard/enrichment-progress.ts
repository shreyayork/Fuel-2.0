/**
 * Lightweight per-source enrichment progress for onboard profile UI.
 * Status values mirror NDJSON step events from `/api/onboard/profile`.
 */

export type EnrichmentSourceId =
  | "website"
  | "techstack"
  | "crunchbase"
  | "linkedin"
  | "extract";

export type EnrichmentSourceStatus = "pending" | "running" | "done" | "error";

export type EnrichmentProgress = Record<
  EnrichmentSourceId,
  EnrichmentSourceStatus
>;

const SOURCES: EnrichmentSourceId[] = [
  "website",
  "techstack",
  "crunchbase",
  "linkedin",
  "extract",
];

export function initialEnrichmentProgress(): EnrichmentProgress {
  return {
    website: "pending",
    techstack: "pending",
    crunchbase: "pending",
    linkedin: "pending",
    extract: "pending",
  };
}

export function applyEnrichmentStepStatus(
  prev: EnrichmentProgress,
  id: string,
  status: EnrichmentSourceStatus,
): EnrichmentProgress {
  if (!SOURCES.includes(id as EnrichmentSourceId)) return prev;
  const key = id as EnrichmentSourceId;
  if (prev[key] === status) return prev;
  return { ...prev, [key]: status };
}

/** True when scrape/extract steps are no longer running/pending. */
export function isEnrichmentSettled(progress: EnrichmentProgress): boolean {
  return SOURCES.every(
    (id) => progress[id] === "done" || progress[id] === "error",
  );
}

/** If stream ends while Crunchbase still open, treat as failed (no fake success). */
export function settleInterruptedCrunchbase(
  progress: EnrichmentProgress,
): EnrichmentProgress {
  if (progress.crunchbase === "pending" || progress.crunchbase === "running") {
    return applyEnrichmentStepStatus(progress, "crunchbase", "error");
  }
  return progress;
}

export const ENRICHMENT_SOURCE_LABELS: Record<EnrichmentSourceId, string> = {
  website: "Website",
  techstack: "Tech stack",
  crunchbase: "Crunchbase / funding",
  linkedin: "LinkedIn",
  extract: "Profile details",
};

/** User-facing copy while Crunchbase scrape is pending/running. */
export const CRUNCHBASE_SCRAPE_IN_PROGRESS_MESSAGE =
  "Your profile is ready to review. We're verifying funding and company details in the background, so you can keep going.";

/** User-facing copy after Crunchbase scrape succeeds. */
export const CRUNCHBASE_SCRAPE_COMPLETE_MESSAGE =
  "Your profile has been generated.";

export type CrunchbaseScrapeBannerKind = "in_progress" | "complete";

/**
 * Map Crunchbase step status → banner kind.
 * `error` → null (no success; do not block). Idle before enrichment start → null.
 */
export function crunchbaseScrapeBannerKind(
  status: EnrichmentSourceStatus,
  enrichmentActive: boolean,
): CrunchbaseScrapeBannerKind | null {
  if (!enrichmentActive) return null;
  if (status === "running" || status === "pending") return "in_progress";
  if (status === "done") return "complete";
  return null;
}

export function crunchbaseScrapeBannerMessage(
  kind: CrunchbaseScrapeBannerKind | null,
): string | null {
  if (kind === "in_progress") return CRUNCHBASE_SCRAPE_IN_PROGRESS_MESSAGE;
  if (kind === "complete") return CRUNCHBASE_SCRAPE_COMPLETE_MESSAGE;
  return null;
}
