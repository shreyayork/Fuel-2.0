import {
  CATEGORY_IDS,
  CATEGORY_META,
  type OverviewCategoryId,
} from "./constants";
import { normalizeMilestoneDueDate, ensureFutureMilestoneDueDates } from "@/lib/initiative-milestone-dates";
import { parseOverviewEvidenceSource } from "@/lib/intelligence/source-label";
import { resolveInsightValue } from "@/lib/intelligence/insight-value";
import type { SignalCatalogItem } from "@/lib/signals/group-catalog";
import {
  catalogFallbackYorkHelp,
  coerceYorkHelpFromRaw,
  isYorkHelpCategoryId,
  type YorkHelpServiceCatalog,
} from "@/lib/york-help/catalog-data";

const CATEGORY_ALIASES: Record<string, OverviewCategoryId> = {
  dev: "dev",
  rd: "dev",
  rnd: "dev",
  "r&d": "dev",
  research: "dev",
  product: "dev",
  mkt: "mkt",
  gtm: "mkt",
  marketing: "mkt",
  sales: "mkt",
  rev: "rev",
  ga: "rev",
  "g&a": "rev",
  finance: "rev",
  ops: "rev",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Coerce singular string, comma-separated, or array tags into unique types. */
export function normalizeTaggedIntelligenceTypes(row: Record<string, unknown>): string[] {
  const raw: unknown[] = [];
  const types = row.tagged_intelligence_types ?? row.taggedIntelligenceTypes;
  if (Array.isArray(types)) raw.push(...types);
  else if (types != null && types !== "") raw.push(types);

  const singular = row.tagged_intelligence_type ?? row.taggedIntelligenceType;
  if (singular != null && singular !== "") raw.push(singular);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const text = asString(item, "");
    if (!text) continue;
    for (const part of text.split(",")) {
      const value = part.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function mapCategoryId(value: unknown): OverviewCategoryId | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CATEGORY_ALIASES[key] ?? (CATEGORY_IDS.includes(key as OverviewCategoryId) ? (key as OverviewCategoryId) : null);
}

function normalizeStrengthWeakness(
  items: unknown,
  prefix: string,
): Array<{ id: string; label: string; detail: string; source: string }> {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const row = asRecord(item) ?? {};
    const label = asString(row.label ?? row.title ?? row.name, "Insight");
    const detail = asString(row.detail ?? row.description ?? row.text ?? row.summary, label);
    return {
      id: asString(row.id, `${prefix}_${index}`),
      label,
      detail,
      source: asString(row.source, "ai"),
    };
  });
}

function normalizeCategories(raw: unknown): Array<Record<string, unknown>> {
  const byId = new Map<OverviewCategoryId, Record<string, unknown>>();

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const row = asRecord(item);
      if (!row) continue;
      const id = mapCategoryId(row.id ?? row.category_id ?? row.categoryId);
      if (!id) continue;
      byId.set(id, row);
    }
  }

  return CATEGORY_IDS.map((id) => {
    const meta = CATEGORY_META[id];
    const row = byId.get(id);
    if (!row) {
      return {
        id,
        label: meta.label,
        full_label: meta.fullLabel,
        focus_narrative: "",
        insight: "",
        strengths: [],
        weaknesses: [],
        benchmark_chips: [],
        stats: [],
      };
    }

    return {
      id,
      label: asString(row.label, meta.label),
      full_label: asString(row.full_label ?? row.fullLabel, meta.fullLabel),
      ...(row.score != null ? { score: asNumber(row.score) } : {}),
      ...(row.status_label != null || row.statusLabel != null
        ? { status_label: asString(row.status_label ?? row.statusLabel) }
        : {}),
      ...(row.status_tone != null || row.statusTone != null
        ? { status_tone: asString(row.status_tone ?? row.statusTone) }
        : {}),
      ...(row.confidence_level != null || row.confidenceLevel != null
        ? { confidence_level: asString(row.confidence_level ?? row.confidenceLevel) }
        : {}),
      focus_narrative: asString(row.focus_narrative ?? row.focusNarrative, ""),
      insight: asString(row.insight, ""),
      strengths: normalizeStrengthWeakness(row.strengths, `${id}_strength`),
      weaknesses: normalizeStrengthWeakness(row.weaknesses, `${id}_weakness`),
      benchmark_chips: (() => {
        const chips = row.benchmark_chips ?? row.benchmarkChips;
        return Array.isArray(chips) ? chips.map((chip) => asString(chip)) : [];
      })(),
      stats: Array.isArray(row.stats)
        ? row.stats
            .map((stat) => {
              const s = asRecord(stat);
              if (!s) return null;
              return { label: asString(s.label), value: asString(s.value) };
            })
            .filter((s): s is { label: string; value: string } => s != null)
        : [],
      score_contributors: row.score_contributors ?? row.scoreContributors,
    };
  });
}

function normalizeSignalTags(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const categoryId = mapCategoryId(row.category_id ?? row.categoryId);
      if (!categoryId) return null;
      const urgencyRaw = asString(row.urgency, "watch").toLowerCase();
      const urgency =
        urgencyRaw === "urgent" || urgencyRaw === "high"
          ? "urgent"
          : urgencyRaw === "stable" || urgencyRaw === "low"
            ? "stable"
            : "watch";
      return {
        category_id: categoryId,
        label: asString(row.label, CATEGORY_META[categoryId].label),
        urgency,
        suffix: asString(row.suffix, ""),
        risk_count: asNumber(row.risk_count ?? row.riskCount, 0),
      };
    })
    .filter((row) => row != null) as Array<Record<string, unknown>>;
}

function normalizeRecommendedActions(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = asRecord(item) ?? {};
    const actionRaw = asString(row.action_type ?? row.actionType, "details").toLowerCase();
    const action_type = actionRaw.includes("benchmark")
      ? "benchmark"
      : actionRaw.includes("source")
        ? "sources"
        : "details";
    return {
      title: asString(row.title, "Recommended action"),
      sub: asString(row.sub ?? row.subtitle ?? row.description, ""),
      cta: asString(row.cta ?? row.action, "Open"),
      done: asBool(row.done, false),
      action_type,
    };
  });
}

function normalizeIntelligence(
  raw: unknown,
  catalogById?: Map<
    string,
    Pick<SignalCatalogItem, "id" | "label" | "category" | "kind" | "unit">
  >,
): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const categoryId = mapCategoryId(row.category_id ?? row.categoryId);
      if (!categoryId) return null;

      const signalId = asString(row.signal_id ?? row.signalId, "");
      if (!signalId) return null;

      const evidenceSource = parseOverviewEvidenceSource(
        row.evidence_source ?? row.evidenceSource,
      );

      if (catalogById && catalogById.size > 0) {
        const def = catalogById.get(signalId);
        if (!def) return null;
        if (seen.has(signalId)) return null;

        // Match Data Room: require a correctly typed value; omit malformed rows.
        const resolved = resolveInsightValue(def, row);
        if (!resolved) return null;
        seen.add(signalId);

        return {
          signal_id: def.id,
          type: def.category,
          title: def.label,
          text: asString(row.text ?? row.summary ?? row.body, ""),
          highlight: resolved.keyDetail,
          value_numeric: resolved.valueNumeric,
          value_text: resolved.valueText,
          value_bool: resolved.valueBool,
          category_id: categoryId,
          source: asString(row.source, "overview_generation"),
          signal_category: def.category,
          ...(evidenceSource ? { evidence_source: evidenceSource } : {}),
        };
      }

      if (seen.has(signalId)) return null;
      seen.add(signalId);
      return {
        signal_id: signalId,
        type: asString(row.type, "Strategic"),
        title: asString(row.title ?? row.headline, "Insight"),
        text: asString(row.text ?? row.summary ?? row.body, ""),
        highlight:
          asString(row.highlight ?? row.key_detail ?? row.keyDetail, "") || undefined,
        value_numeric:
          typeof (row.value_numeric ?? row.valueNumeric) === "number"
            ? (row.value_numeric ?? row.valueNumeric)
            : undefined,
        value_text:
          asString(row.value_text ?? row.valueText, "") || undefined,
        value_bool:
          typeof (row.value_bool ?? row.valueBool) === "boolean"
            ? (row.value_bool ?? row.valueBool)
            : undefined,
        category_id: categoryId,
        source: asString(row.source, "overview_generation"),
        signal_category:
          asString(row.signal_category ?? row.signalCategory, "") || undefined,
        ...(evidenceSource ? { evidence_source: evidenceSource } : {}),
      };
    })
    .filter((row) => row != null) as Array<Record<string, unknown>>;
}

type NormalizedMilestone = {
  title: string;
  due_date?: string;
  checked: boolean;
};

/** Accept object milestones, string milestones, and common alt keys. */
function normalizeMilestoneList(raw: unknown): NormalizedMilestone[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedMilestone[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const title = item.trim();
      if (title) out.push({ title: title.slice(0, 160), checked: false });
      continue;
    }
    const ms = asRecord(item);
    if (!ms) continue;
    const title = asString(
      ms.title ?? ms.label ?? ms.name ?? ms.text ?? ms.description,
      "",
    );
    if (!title || title.toLowerCase() === "milestone") continue;
    const dueDate = normalizeMilestoneDueDate(
      asString(ms.due_date ?? ms.dueDate, ""),
    );
    out.push({
      title: title.slice(0, 160),
      due_date: dueDate ?? undefined,
      checked: asBool(ms.checked ?? ms.done, false),
    });
  }
  return out.slice(0, 6);
}

/** Models often return `"milestones": []` — invent 2 concrete steps so persist never no-ops. */
function ensureInitiativeMilestones(
  initiativeTitle: string,
  description: string,
  milestones: NormalizedMilestone[],
): NormalizedMilestone[] {
  if (milestones.length > 0) return milestones;
  const label = initiativeTitle.trim() || "this initiative";
  const short = label.length > 72 ? `${label.slice(0, 69)}…` : label;
  const firstClause =
    description
      .split(/[.!\n]/)
      .map((s) => s.trim())
      .find((s) => s.length >= 12) ?? null;
  return [
    {
      title: firstClause
        ? firstClause.slice(0, 160)
        : `Define success criteria for ${short}`,
      checked: false,
    },
    {
      title: `Ship first measurable outcome for ${short}`,
      checked: false,
    },
  ];
}

export function normalizeInitiatives(
  raw: unknown,
  yorkHelpCatalog?: YorkHelpServiceCatalog,
): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const categoryId = mapCategoryId(row.category_id ?? row.categoryId ?? row.category);
      if (!categoryId) return null;
      const cadenceRaw = asString(row.cadence, "one-time").toLowerCase();
      const cadence = cadenceRaw.includes("recurr") ? "recurring" : "one-time";
      const description = asString(
        row.description ?? row.summary ?? row.body ?? row.text,
        "",
      );
      const parsedMilestones = normalizeMilestoneList(row.milestones);
      const title = resolveInitiativeTitle(
        row,
        categoryId,
        description,
        parsedMilestones,
      );
      const milestones = ensureFutureMilestoneDueDates(
        ensureInitiativeMilestones(title, description, parsedMilestones),
      );
      const yorkHelp = isYorkHelpCategoryId(categoryId)
        ? (coerceYorkHelpFromRaw(
            row.york_help ?? row.yorkHelp,
            categoryId,
            yorkHelpCatalog,
          ) ?? catalogFallbackYorkHelp(categoryId, 0, yorkHelpCatalog))
        : undefined;
      const sourceDocsRaw = Array.isArray(row.source_documents)
        ? row.source_documents
        : Array.isArray(row.sourceDocuments)
          ? row.sourceDocuments
          : [];
      const source_documents = sourceDocsRaw
        .map((doc) => {
          const d = asRecord(doc);
          if (!d) return null;
          const docTitle = asString(d.title ?? d.name ?? d.type_label ?? d.typeLabel, "").trim();
          if (!docTitle) return null;
          const id = asString(d.id ?? d.document_version_id ?? d.documentVersionId, "").trim();
          const typeLabel = asString(d.type_label ?? d.typeLabel, "").trim();
          return {
            ...(id ? { id } : {}),
            title: docTitle,
            ...(typeLabel ? { type_label: typeLabel } : {}),
          };
        })
        .filter(
          (d): d is { id?: string; title: string; type_label?: string } => d != null,
        );
      const priorityRaw = asString(row.priority, "").toLowerCase();
      const priority =
        priorityRaw === "high" || priorityRaw === "medium" || priorityRaw === "low"
          ? priorityRaw
          : undefined;
      const taggedTypes = normalizeTaggedIntelligenceTypes(row);
      return {
        title,
        description:
          description ||
          `Improve ${CATEGORY_META[categoryId].label} operating performance this quarter.`,
        category: asString(row.category, CATEGORY_META[categoryId].initiativeArea),
        category_id: categoryId,
        due_date: asString(row.due_date ?? row.dueDate, "") || undefined,
        cadence,
        status: "draft" as const,
        tagged_intelligence_type: taggedTypes[0] ?? null,
        tagged_intelligence_types: taggedTypes,
        source_rationale:
          asString(row.source_rationale ?? row.sourceRationale, "") || undefined,
        benefit: asString(row.benefit, "") || undefined,
        priority,
        baseline_metric:
          asString(row.baseline_metric ?? row.baselineMetric, "") || undefined,
        target_metric:
          asString(row.target_metric ?? row.targetMetric, "") || undefined,
        benchmark_cohort:
          asString(row.benchmark_cohort ?? row.benchmarkCohort, "") || undefined,
        ...(source_documents.length > 0 ? { source_documents } : {}),
        milestones,
        ...(yorkHelp ? { york_help: yorkHelp } : {}),
      };
    })
    .filter((row) => row != null) as Array<Record<string, unknown>>;
}

/** Prefer explicit title fields; never persist the bare placeholder "Initiative". */
function resolveInitiativeTitle(
  row: Record<string, unknown>,
  categoryId: OverviewCategoryId,
  description: string,
  milestones: Array<{ title: string }>,
): string {
  const candidates = [
    row.title,
    row.name,
    row.headline,
    row.label,
    row.initiative_title,
    row.initiativeTitle,
    row.initiative_name,
    row.initiativeName,
  ];
  for (const candidate of candidates) {
    const title = asString(candidate, "");
    if (title && !isPlaceholderInitiativeTitle(title)) return title.slice(0, 120);
  }

  if (description) {
    const firstLine = description.split(/[.!\n]/)[0]?.trim() ?? description;
    if (firstLine.length >= 8 && !isPlaceholderInitiativeTitle(firstLine)) {
      return firstLine.slice(0, 120);
    }
  }

  const milestoneTitle = milestones.find(
    (m) => m.title && !isPlaceholderInitiativeTitle(m.title) && m.title !== "Milestone",
  )?.title;
  if (milestoneTitle) return milestoneTitle.slice(0, 120);

  return `${CATEGORY_META[categoryId].label} operating initiative`;
}

function isPlaceholderInitiativeTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "initiative" ||
    normalized === "untitled" ||
    normalized === "n/a" ||
    normalized === "tbd"
  );
}

function normalizePlaybooks(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const slug = asString(row.playbook_slug ?? row.slug ?? row.playbookSlug, "");
      if (!slug) return null;
      const categoryId = mapCategoryId(row.category_id ?? row.categoryId);
      return {
        playbook_slug: slug,
        reason: asString(row.reason ?? row.rationale, ""),
        category_id: categoryId ?? undefined,
      };
    })
    .filter((row) => row != null) as Array<Record<string, unknown>>;
}

function normalizeJourneyStage(raw: unknown): Record<string, string> | undefined {
  const row = asRecord(raw);
  if (!row) return undefined;
  const current = asString(row.current ?? row.stage, "");
  const label = asString(row.label ?? row.name, current);
  if (!current && !label) return undefined;
  return { current: current || label, label: label || current };
}

/** Coerce common Bedrock tool-output drift before strict Zod validation. */
export function normalizeOverviewAiResponse(
  raw: unknown,
  opts?: {
    signalCatalog?: Array<
      Pick<SignalCatalogItem, "id" | "label" | "category" | "kind" | "unit">
    >;
    yorkHelpCatalog?: YorkHelpServiceCatalog;
  },
): unknown {
  const root = asRecord(raw);
  if (!root) return raw;

  const advisor = asRecord(root.advisor) ?? {};
  const summary = asString(
    advisor.summary ?? root.summary ?? root.advisor_summary,
    "Your operating overview is being prepared.",
  );

  const catalogById =
    opts?.signalCatalog && opts.signalCatalog.length > 0
      ? new Map(opts.signalCatalog.map((s) => [s.id, s]))
      : undefined;

  return {
    advisor: {
      summary,
      signal_tags: normalizeSignalTags(advisor.signal_tags ?? advisor.signalTags),
      recommended_actions: normalizeRecommendedActions(
        advisor.recommended_actions ?? advisor.recommendedActions,
      ),
    },
    categories: normalizeCategories(root.categories),
    intelligence: normalizeIntelligence(root.intelligence, catalogById),
    suggested_initiatives: normalizeInitiatives(
      root.suggested_initiatives ?? root.suggestedInitiatives,
      opts?.yorkHelpCatalog,
    ),
    suggested_playbooks: normalizePlaybooks(
      root.suggested_playbooks ?? root.suggestedPlaybooks,
    ),
    journey_stage: normalizeJourneyStage(root.journey_stage ?? root.journeyStage),
  };
}
