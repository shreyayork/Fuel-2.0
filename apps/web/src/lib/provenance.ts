import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  contextItems,
  signalObservations,
  signals,
  type ContextItem,
  type Signal,
  type SignalObservation,
} from "@/db/schema";

/** Structured view of the `source` field on signal_observations. */
export type SourceKind =
  | "slack"
  | "granola"
  | "hubspot"
  | "email"
  | "manual"
  | "note"
  | "portfolio_update"
  | "other";

export interface ParsedSource {
  kind: SourceKind;
  /** Raw source string (unchanged). */
  raw: string;
  /** Human-readable label, e.g. "Slack #deals", "Granola meeting". */
  label: string;
  /** Anything after the kind prefix, for diagnostics. */
  ref: string | null;
}

export function parseSource(raw: string | null | undefined): ParsedSource {
  const s = raw ?? "";
  const [head, ...rest] = s.split(":");
  const ref = rest.length > 0 ? rest.join(":") : null;
  switch (head) {
    case "slack":
      return { kind: "slack", raw: s, label: "Slack", ref };
    case "granola":
      return { kind: "granola", raw: s, label: "Granola meeting", ref };
    case "hubspot":
      return { kind: "hubspot", raw: s, label: "HubSpot", ref };
    case "email":
      return { kind: "email", raw: s, label: "Email", ref };
    case "manual":
      return { kind: "manual", raw: s, label: "Manual entry", ref };
    case "note":
      return { kind: "note", raw: s, label: "Private note", ref };
    case "portfolio_update":
      return { kind: "portfolio_update", raw: s, label: "Quarterly submission", ref };
    default:
      return { kind: "other", raw: s, label: head || "Unknown", ref };
  }
}

/** Client-facing observation fields — omits internal agent-run / account metadata. */
export type ProvenanceObservation = Pick<
  SignalObservation,
  | "id"
  | "signalId"
  | "period"
  | "valueNumeric"
  | "valueText"
  | "valueBool"
  | "confidence"
  | "rawSnippet"
  | "source"
  | "authorEmail"
  | "createdAt"
  | "supersededAt"
  | "supersededById"
  | "contextItemId"
>;

export interface ObservationProvenance {
  observation: ProvenanceObservation;
  signal: Pick<Signal, "id" | "label" | "kind" | "unit" | "category" | "invertedGood"> | null;
  contextItem: ContextItem | null;
  parsedSource: ParsedSource;
  /** Every observation ever recorded for the same (company, signal, period),
   *  newest first. Includes the target row. */
  history: Array<
    Pick<
      SignalObservation,
      | "id"
      | "valueNumeric"
      | "valueText"
      | "valueBool"
      | "confidence"
      | "source"
      | "authorEmail"
      | "createdAt"
      | "supersededAt"
      | "supersededById"
    >
  >;
}

/**
 * Returns the full provenance bundle for an observation. All fetches are
 * scoped to the caller's accountId so a successful return proves
 * authorization.
 */
export async function getObservationProvenance(opts: {
  accountId: string;
  observationId: string;
}): Promise<ObservationProvenance | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      obs: signalObservations,
      signal: {
        id: signals.id,
        label: signals.label,
        kind: signals.kind,
        unit: signals.unit,
        category: signals.category,
        invertedGood: signals.invertedGood,
      },
      contextItem: contextItems,
    })
    .from(signalObservations)
    .leftJoin(signals, eq(signals.id, signalObservations.signalId))
    .leftJoin(contextItems, eq(contextItems.id, signalObservations.contextItemId))
    .where(
      and(
        eq(signalObservations.id, opts.observationId),
        eq(signalObservations.accountId, opts.accountId),
      ),
    )
    .limit(1);

  if (!row) return null;

  const history = await db
    .select({
      id: signalObservations.id,
      valueNumeric: signalObservations.valueNumeric,
      valueText: signalObservations.valueText,
      valueBool: signalObservations.valueBool,
      confidence: signalObservations.confidence,
      source: signalObservations.source,
      authorEmail: signalObservations.authorEmail,
      createdAt: signalObservations.createdAt,
      supersededAt: signalObservations.supersededAt,
      supersededById: signalObservations.supersededById,
    })
    .from(signalObservations)
    .where(
      and(
        eq(signalObservations.accountId, opts.accountId),
        eq(signalObservations.companyUuid, row.obs.companyUuid),
        eq(signalObservations.signalId, row.obs.signalId),
        eq(signalObservations.period, row.obs.period),
      ),
    )
    .orderBy(desc(signalObservations.createdAt));

  const obs = row.obs;
  return {
    observation: {
      id: obs.id,
      signalId: obs.signalId,
      period: obs.period,
      valueNumeric: obs.valueNumeric,
      valueText: obs.valueText,
      valueBool: obs.valueBool,
      confidence: obs.confidence,
      rawSnippet: obs.rawSnippet,
      source: obs.source,
      authorEmail: obs.authorEmail,
      createdAt: obs.createdAt,
      supersededAt: obs.supersededAt,
      supersededById: obs.supersededById,
      contextItemId: obs.contextItemId,
    },
    signal: row.signal,
    contextItem: row.contextItem,
    parsedSource: parseSource(obs.source),
    history,
  };
}
