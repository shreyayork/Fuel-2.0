import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listObservationsForCompanyWithSignal } from "@/lib/observations";

const input = z.object({
  companyUuid: z
    .string()
    .describe("fuel-data organization UUID or cat_-prefixed catalog UUID"),
  limit: z.number().int().min(1).max(500).optional().default(200),
});

interface ObservationOut {
  id: string;
  signalId: string;
  signalLabel: string;
  signalCategory: string;
  signalKind: "quantitative" | "qualitative" | "boolean";
  signalUnit: string | null;
  period: string;
  value: string | number | boolean | null;
  confidence: number | null;
  snippet: string | null;
  contextItemId: string | null;
  createdAt: string;
}

export const getCompanyObservationsSkill: Skill<z.infer<typeof input>, {
  observations: ObservationOut[];
  byCategory: Record<string, ObservationOut[]>;
}> = {
  name: "getCompanyObservations",
  title: "Get extracted signal observations for a company",
  description:
    "Return the latest (non-superseded) signal_observations extracted from the account's context feed for a company. Already joined with signal definitions so you can see label, category, kind, unit, and value without further lookups. Use this for structured insights (ARR, burn, fundraise plans, churn risks) instead of parsing raw notes.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_500,
  async execute({ companyUuid, limit }, ctx) {
    const rows = await listObservationsForCompanyWithSignal({
      accountId: ctx.accountId,
      companyUuid,
      limit,
    });
    // Keep only the latest observation per signal id — the DB query already
    // filters supersededAt IS NULL but can still return multiple periods
    // (e.g. 2026-q1 AND 2026-q2 for the same metric). The agent usually
    // wants the most recent value; if it needs history it can call
    // getPortfolioUpdate / listPortfolioUpdates.
    const latestBySignal = new Map<string, typeof rows[number]>();
    for (const r of rows) {
      const existing = latestBySignal.get(r.signalId);
      if (!existing || r.createdAt > existing.createdAt) latestBySignal.set(r.signalId, r);
    }
    const serialized: ObservationOut[] = Array.from(latestBySignal.values()).map((o) => ({
      id: o.id,
      signalId: o.signalId,
      signalLabel: o.signal.label,
      signalCategory: o.signal.category,
      signalKind: o.signal.kind,
      signalUnit: o.signal.unit,
      period: o.period,
      value:
        o.signal.kind === "quantitative"
          ? o.valueNumeric
          : o.signal.kind === "boolean"
          ? o.valueBool
          : o.valueText,
      confidence: o.confidence,
      snippet: o.rawSnippet,
      contextItemId: o.contextItemId,
      createdAt: o.createdAt.toISOString(),
    }));
    const byCategory: Record<string, ObservationOut[]> = {};
    for (const s of serialized) {
      const k = s.signalCategory || "other";
      (byCategory[k] ??= []).push(s);
    }
    return { observations: serialized, byCategory };
  },
};
