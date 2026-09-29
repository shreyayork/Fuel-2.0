import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listEnabledPipelinesWithCompanies } from "@/lib/pipelines";

const input = z.object({
  stageId: z
    .string()
    .optional()
    .describe("Filter to a specific HubSpot stage id"),
});

export const listPipelineSkill: Skill<z.infer<typeof input>> = {
  name: "listPipeline",
  title: "List HubSpot pipeline deals",
  description:
    "Return synced pipeline deals grouped by pipeline config. Optionally filter to a single stage.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ stageId }, ctx) {
    const grouped = await listEnabledPipelinesWithCompanies({ accountId: ctx.accountId });
    if (!stageId) return { pipelines: grouped };
    return {
      pipelines: grouped.map((p) => ({
        ...p,
        companies: p.companies.filter((c) => c.providerPipelineStageId === stageId),
      })),
    };
  },
};
