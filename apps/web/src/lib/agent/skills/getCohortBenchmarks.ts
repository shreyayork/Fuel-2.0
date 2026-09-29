import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import {
  getCohortBenchmarks,
  listCohorts,
  resolveCohort,
  type CohortFilter,
} from "@/lib/benchmarks";

const input = z.object({
  cohortKey: z
    .string()
    .optional()
    .describe(
      "Exact cohort key like 'b2b_saas:seed:us'. Provide this when you already know the cohort; otherwise pass dimensions and we'll resolve.",
    ),
  businessModel: z.string().optional(),
  stage: z.string().optional(),
  vertical: z.string().optional(),
  geo: z.string().optional().default("us"),
  period: z.string().optional().describe("e.g. '2026-q1'. Defaults to latest available."),
});

export const getCohortBenchmarksSkill: Skill<
  z.infer<typeof input>,
  {
    cohortKey: string | null;
    rows: Array<{
      metric: string;
      p25: number | null;
      p50: number | null;
      p75: number | null;
      p90: number | null;
      unit: string | null;
      invertedGood: boolean;
      period: string;
      sampleSize: number | null;
    }>;
    availableCohorts: Array<{
      cohortKey: string;
      dimensions: CohortFilter;
      sampleSize: number | null;
    }>;
  }
> = {
  name: "getCohortBenchmarks",
  title: "Fetch percentile benchmarks for a cohort",
  description:
    "Return p25/p50/p75/p90 values for every metric in a peer cohort. If you don't know the exact cohortKey, pass businessModel/stage/vertical/geo and the skill will resolve to the best-fit cohort. Use this after getPortfolioCompanies to compare a portfolio's distribution against cohort norms.",
  inputSchema: input,
  readOnly: true,
  costTokens: 500,
  async execute({ cohortKey, businessModel, stage, vertical, geo, period }) {
    let resolved = cohortKey ?? null;
    if (!resolved) {
      const filter: CohortFilter = {
        businessModel: businessModel ?? null,
        stage: stage ?? null,
        vertical: vertical ?? null,
        geo: geo ?? null,
      };
      resolved = await resolveCohort(filter);
    }
    const rows = resolved ? await getCohortBenchmarks({ cohortKey: resolved, period }) : [];
    const allCohorts = await listCohorts();
    return {
      cohortKey: resolved,
      rows: rows.map((r) => ({
        metric: r.metric,
        p25: r.p25,
        p50: r.p50,
        p75: r.p75,
        p90: r.p90,
        unit: r.unit,
        invertedGood: r.invertedGood,
        period: r.period,
        sampleSize: r.sampleSize,
      })),
      availableCohorts: allCohorts.map((c) => ({
        cohortKey: c.cohortKey,
        dimensions: c.dimensions,
        sampleSize: c.sampleSize,
      })),
    };
  },
};
