import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { benchmarks } from "@/db/schema";
import type { Skill } from "../types";

const input = z.object({
  metric: z.string().describe("Benchmark metric name (e.g. 'ARR', 'Growth', 'NRR')"),
  value: z.string().describe("The company's value to compare (stringly-typed to match fixture format)"),
});

export const compareToBenchmarkSkill: Skill<z.infer<typeof input>, {
  metric: string;
  bench: { p25: string; p50: string; p75: string } | null;
  interpretation: string;
}> = {
  name: "compareToBenchmark",
  title: "Compare a metric value against the York IE benchmark cohort",
  description:
    "Return the percentile band for a company's metric value. Currently backed by the fixture benchmarks table — will source from fuel-data when the benchmarks pipeline is wired.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ metric, value }) {
    const db = await getDb();
    const [row] = await db.select().from(benchmarks).where(eq(benchmarks.metric, metric));
    if (!row) {
      return {
        metric,
        bench: null,
        interpretation: `No benchmark on file for "${metric}".`,
      };
    }
    return {
      metric,
      bench: { p25: row.p25, p50: row.p50, p75: row.p75 },
      interpretation: `Cohort: p25=${row.p25} · p50=${row.p50} · p75=${row.p75}. Your value: ${value}. (Placement logic TBD once benchmarks are numeric.)`,
    };
  },
};
