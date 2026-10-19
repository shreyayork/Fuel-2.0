/** Provenance rows attached to a suggested / review initiative (before it becomes Active). */
export type InitiativeSourceKind =
  | "intelligence"
  | "document"
  | "benchmark"
  | "form_dev"
  | "form_mkt"
  | "form_rev"
  | "source";

export type InitiativeSourceRef = {
  id: string;
  kind: InitiativeSourceKind;
  /** Signal or field name — e.g. Target round size */
  label: string;
  /** Display value — e.g. $5.0M */
  detail?: string;
  /** For documents — e.g. Pitch deck */
  documentType?: string;
};

export type InitiativeSourceGroup = {
  kind: InitiativeSourceKind;
  title: string;
  count: number;
  items: InitiativeSourceRef[];
};

const GROUP_TITLES: Record<InitiativeSourceKind, string> = {
  intelligence: "Intelligence",
  document: "Data room",
  benchmark: "Overview benchmark",
  form_dev: "R&D form",
  form_mkt: "GTM form",
  form_rev: "G&A form",
  source: "Added source",
};

const GROUP_SHORT_LABELS: Record<InitiativeSourceKind, { one: string; many: string }> = {
  intelligence: { one: "intelligence", many: "intelligence" },
  document: { one: "data room file", many: "data room files" },
  benchmark: { one: "overview benchmark", many: "overview benchmarks" },
  form_dev: { one: "R&D form", many: "R&D form fields" },
  form_mkt: { one: "GTM form", many: "GTM form fields" },
  form_rev: { one: "G&A form", many: "G&A form fields" },
  source: { one: "added source", many: "added sources" },
};

export function initiativeSourceGroupTitle(kind: InitiativeSourceKind): string {
  return GROUP_TITLES[kind];
}

/** Accordion subtitle — e.g. "7 signals", "2 overview benchmarks". */
export function initiativeSourceGroupCountCaption(
  kind: InitiativeSourceKind,
  count: number,
): string {
  if (kind === "intelligence") {
    return count === 1 ? "1 signal" : `${count} signals`;
  }
  const labels = GROUP_SHORT_LABELS[kind];
  return count === 1 ? `1 ${labels.one}` : `${count} ${labels.many}`;
}

/** Collapse long source lists into category rows (intelligence × N, one row per doc, etc.). */
export function groupInitiativeSources(sources: InitiativeSourceRef[]): InitiativeSourceGroup[] {
  const order: InitiativeSourceKind[] = [
    "intelligence",
    "benchmark",
    "document",
    "form_dev",
    "form_mkt",
    "form_rev",
    "source",
  ];
  const buckets = new Map<InitiativeSourceKind, InitiativeSourceRef[]>();
  for (const ref of sources) {
    const list = buckets.get(ref.kind) ?? [];
    list.push(ref);
    buckets.set(ref.kind, list);
  }
  return order
    .filter(kind => (buckets.get(kind)?.length ?? 0) > 0)
    .map(kind => ({
      kind,
      title: GROUP_TITLES[kind],
      count: buckets.get(kind)!.length,
      items: buckets.get(kind)!,
    }));
}

export function formatInitiativeSourceRow(ref: InitiativeSourceRef): string {
  const parts = [ref.label];
  if (ref.detail?.trim()) parts.push(ref.detail.trim());
  if (ref.documentType?.trim()) parts.push(ref.documentType.trim());
  return parts.join(" · ");
}

/** Compact group label for suggested cards — e.g. "7 intelligence", "GTM form". */
export function initiativeSourceGroupCompactLabel(group: InitiativeSourceGroup): string {
  const labels = GROUP_SHORT_LABELS[group.kind];
  if (group.count === 1) {
    if (group.kind === "intelligence" || group.kind.startsWith("form_")) {
      return formatInitiativeSourceRow(group.items[0]);
    }
    return labels.one;
  }
  return `${group.count} ${labels.many}`;
}

/** Suggested-card “From …” line — grouped, never one row per intelligence signal. */
export function formatInitiativeFromPreview(sources: InitiativeSourceRef[]): string {
  const groups = groupInitiativeSources(sources);
  if (!groups.length) return "";
  const parts = groups.map(initiativeSourceGroupCompactLabel);
  return `From · ${parts.join(" · ")}`;
}

/** Suggested drawer card — short provenance teaser (prod: “From · Target round size · Pitch deck”). */
export function formatInitiativeFromCardLine(
  sources: InitiativeSourceRef[],
  maxLabels = 3,
): string {
  if (!sources.length) return "";
  const labels = sources.slice(0, maxLabels).map(ref => {
    if (ref.kind === "document") return ref.documentType?.trim() || ref.label;
    return ref.label;
  });
  return `From · ${labels.join(" · ")}`;
}

/** Workspace tab to open when user clicks View N on a source group. */
export type InitiativeSourceViewTarget =
  | "intelligence"
  | "data-room"
  | "overview"
  | "scorecard";

export function initiativeSourceViewTarget(kind: InitiativeSourceKind): InitiativeSourceViewTarget {
  switch (kind) {
    case "document":
      return "data-room";
    case "benchmark":
      return "overview";
    case "form_dev":
    case "form_mkt":
    case "form_rev":
      return "scorecard";
    case "intelligence":
    case "source":
    default:
      return "intelligence";
  }
}

/** CTA on expanded source group — matches workspace navigation targets. */
/** Minimal shape for intelligence signal provenance rows (PatriotPayJourney). */
export type IntelligenceProvenanceSourceInput = {
  id: string;
  title: string;
  description: string;
  system: string;
  sourceType: string;
  meta: string;
  date: string;
  ref?: string;
};

const DATA_ROOM_SOURCE_TYPES = new Set([
  "pitch_deck",
  "investor_notes",
  "investment_memo",
  "board_deck",
  "financial_model",
  "cap_table",
  "product_roadmap",
  "customer_contract",
  "due_diligence",
]);

function intelligenceProvenanceKind(source: IntelligenceProvenanceSourceInput): InitiativeSourceKind {
  if (source.sourceType === "private_benchmark" || source.system === "benchmark") {
    return "benchmark";
  }
  if (source.sourceType === "form_field") {
    if (source.system === "R&D") return "form_dev";
    if (source.system === "GTM") return "form_mkt";
    if (source.system === "G&A") return "form_rev";
    const fieldRef = source.ref?.replace(/^form:/, "") ?? "";
    if (fieldRef.startsWith("dev_")) return "form_dev";
    if (fieldRef.startsWith("mkt_")) return "form_mkt";
    if (fieldRef.startsWith("rev_")) return "form_rev";
    return "source";
  }
  if (
    source.meta.includes("Data Room")
    || DATA_ROOM_SOURCE_TYPES.has(source.sourceType)
    || (source.ref?.startsWith("private:") && source.sourceType !== "private_benchmark")
  ) {
    return "document";
  }
  return "source";
}

function documentTypeLabel(source: IntelligenceProvenanceSourceInput): string | undefined {
  if (DATA_ROOM_SOURCE_TYPES.has(source.sourceType)) {
    return source.sourceType.replace(/_/g, " ");
  }
  const fromMeta = source.meta.replace(/^Private ·\s*/i, "").trim();
  if (fromMeta && fromMeta !== "Data Room") return fromMeta;
  if (source.system && source.system !== source.title) return source.system.replace(/_/g, " ");
  return undefined;
}

/** Group intelligence provenance like initiative review Sources accordions. */
export function mapIntelligenceSourcesToInitiativeRefs(
  sources: IntelligenceProvenanceSourceInput[],
): InitiativeSourceRef[] {
  return sources.map(source => {
    const kind = intelligenceProvenanceKind(source);
    if (kind === "form_dev" || kind === "form_mkt" || kind === "form_rev") {
      return {
        id: source.id,
        kind,
        label: source.title,
        detail: source.description.trim() || undefined,
      };
    }
    if (kind === "benchmark") {
      return {
        id: source.id,
        kind,
        label: source.title,
        detail: source.meta.trim() || source.date.trim() || undefined,
      };
    }
    if (kind === "document") {
      return {
        id: source.id,
        kind,
        label: source.title,
        documentType: documentTypeLabel(source),
        detail: source.date.trim() || undefined,
      };
    }
    return {
      id: source.id,
      kind,
      label: source.title,
      detail: source.meta.trim() || source.description.trim() || source.date.trim() || undefined,
    };
  });
}

export function formatInitiativeSourceViewLabel(kind: InitiativeSourceKind, count: number): string {
  const n = count.toLocaleString();
  switch (kind) {
    case "intelligence":
      return count === 1 ? "View in timeline" : `View ${n} in timeline`;
    case "document":
      return count === 1 ? "View in data room" : `View ${n} in data room`;
    case "benchmark":
      return count === 1 ? "View on overview" : `View ${n} on overview`;
    case "form_dev":
    case "form_mkt":
    case "form_rev":
      return count === 1 ? "View on scorecard" : `View ${n} on scorecard`;
    case "source":
    default:
      return count === 1 ? "View source" : `View ${n} sources`;
  }
}
