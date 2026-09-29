/**
 * Resolve a human-readable provenance label for intelligence / observation
 * rows that lack a linked context item or document version.
 *
 * Used by the feed Sources chip when `documentLabel` / `contextItemId` /
 * `documentVersionId` are absent (overview, manual log, portfolio updates).
 */

export const OVERVIEW_EVIDENCE_SOURCES = ["profile", "form", "document"] as const;
export type OverviewEvidenceSource = (typeof OVERVIEW_EVIDENCE_SOURCES)[number];

const TRACK_FORM_TITLE: Record<string, string> = {
  dev: "R&D Form",
  mkt: "GTM Form",
  rev: "G&A Form",
};

export type IntelligenceProvenanceInput = {
  source: string;
  generationPath?: string | null;
  /** When true (or overview intel keyed to a logged benchmark), prefer Benchmark. */
  preferBenchmark?: boolean;
  /** Overview track (`dev` | `mkt` | `rev`) from metadata.overviewCategory. */
  overviewCategory?: string | null;
  /** Optional model hint: profile | form | document. */
  evidenceSource?: string | null;
};

/**
 * Legacy persist wrote metadata.title = "Overview". Treat missing/Overview as
 * unresolved so read-time can map to a track form / profile / benchmark label.
 */
export function isUnresolvedOverviewSourceTitle(
  title: string | null | undefined,
): boolean {
  const trimmed = (title ?? "").trim();
  return !trimmed || trimmed.toLowerCase() === "overview";
}

export function parseOverviewEvidenceSource(
  raw: unknown,
): OverviewEvidenceSource | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  if (key === "profile" || key === "form" || key === "document") return key;
  return null;
}

/**
 * Founder-facing Sources chip for overview-generated intelligence.
 * Server is source of truth for Benchmark; never returns "Overview".
 */
export function overviewIntelligenceSourceTitle(opts: {
  categoryId?: string | null;
  preferBenchmark?: boolean;
  evidenceSource?: OverviewEvidenceSource | string | null;
}): string | null {
  if (opts.preferBenchmark) return "Benchmark";
  const evidence = parseOverviewEvidenceSource(opts.evidenceSource);
  if (evidence === "profile") return "Profile update";
  const cat = (opts.categoryId ?? "").trim().toLowerCase();
  return TRACK_FORM_TITLE[cat] ?? null;
}

/**
 * Map persisted `company_intelligence.source` → Sources chip title.
 * Returns null when no friendly label applies (UI keeps empty / graceful copy).
 */
export function resolveIntelligenceProvenanceLabel(
  input: IntelligenceProvenanceInput,
): string | null {
  const raw = (input.source ?? "").trim();
  if (!raw) return null;

  if (raw === "overview_generation" || input.generationPath === "overview") {
    return overviewIntelligenceSourceTitle({
      categoryId: input.overviewCategory,
      preferBenchmark: input.preferBenchmark,
      evidenceSource: input.evidenceSource,
    });
  }
  if (raw.startsWith("manual:")) return "User input";
  if (raw.startsWith("portfolio_update:")) return "Benchmark";
  if (raw === "hubspot" || raw.startsWith("hubspot")) return "HubSpot";
  if (raw === "granola" || raw.startsWith("granola")) return "Granola";
  if (raw === "source_notes") return "Notes";
  if (raw.startsWith("document:")) {
    return raw === "document:data_room" ? "Data room" : "Document";
  }
  // Unknown tags: do not invent a chip — leave empty for historical junk.
  return null;
}

/**
 * Map `signal_observations.source` → Sources chip title when no context link.
 */
export function resolveObservationProvenanceLabel(
  source: string | null | undefined,
): string | null {
  const raw = (source ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("manual:")) return "User input";
  if (raw.startsWith("portfolio_update:")) return "Benchmark";
  if (raw.startsWith("hubspot")) return "HubSpot";
  if (raw.startsWith("granola")) return "Granola";
  return null;
}

/** Integration / origin for Sources list chips (NOTE/DOC → HubSpot/Doc/…). */
export function resolveSourceListChipLabel(opts: {
  kind: "note" | "doc";
  /** context_items.source when known (e.g. hubspot:note:123). */
  source?: string | null;
}): string {
  if (opts.kind === "doc") return "Doc";
  const raw = (opts.source ?? "").trim().toLowerCase();
  if (raw.startsWith("hubspot") || raw.includes(":hubspot")) return "HubSpot";
  if (raw.startsWith("granola") || raw.includes("granola")) return "Granola";
  if (raw.startsWith("slack") || raw.includes("slack")) return "Slack";
  return "Note";
}

/**
 * Human label for Signal detail source.kind (never surface raw "context").
 * Empty string → UI hides the kind line (provenance titles already carry the label).
 */
export function resolveFeedSourceKindLabel(opts: {
  kind: string;
  /** company_intelligence.source / observation.source when linked via context. */
  provenanceSource?: string | null;
}): string {
  const kind = (opts.kind ?? "").trim().toLowerCase();
  if (kind === "document") return "Document";
  if (kind === "provenance") return "";
  if (kind === "context") {
    const raw = (opts.provenanceSource ?? "").trim().toLowerCase();
    if (raw === "hubspot" || raw.startsWith("hubspot")) return "HubSpot";
    if (raw.startsWith("granola") || raw.includes("granola")) return "Granola";
    if (raw.startsWith("slack") || raw.includes("slack")) return "Slack";
    // Linked context without a known integration — match doc-style clarity.
    return "Document";
  }
  if (kind === "hubspot") return "HubSpot";
  if (kind === "granola") return "Granola";
  if (kind === "note") return "Note";
  // Already display-cased kinds from newer builders.
  if (opts.kind === "HubSpot" || opts.kind === "Granola" || opts.kind === "Document") {
    return opts.kind;
  }
  return opts.kind.trim();
}

/**
 * Whether overview-generated intel should show "Benchmark" vs a form/profile label.
 * Prefer Benchmark when the signal has a logged numeric benchmark value.
 */
export function overviewIntelPrefersBenchmark(opts: {
  signalId: string;
  benchmarkValues: Record<string, number | null | undefined>;
}): boolean {
  const v = opts.benchmarkValues[opts.signalId];
  return v != null && Number.isFinite(v);
}

/** Empty-sources drawer copy: profile/benchmark/overview origin vs unknown. */
export function isProfileOrBenchmarkProvenance(opts: {
  source?: string | null;
  generationPath?: string | null;
  isBenchmark?: boolean;
}): boolean {
  if (opts.isBenchmark) return true;
  const raw = (opts.source ?? "").trim();
  if (raw === "overview_generation" || opts.generationPath === "overview") {
    return true;
  }
  if (raw.startsWith("portfolio_update:")) return true;
  return false;
}
