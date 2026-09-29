import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listForCompany } from "@/lib/portfolio-updates";

const input = z.object({
  companyUuid: z.string().describe("fuel-data organization UUID"),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listPortfolioUpdatesSkill: Skill<z.infer<typeof input>> = {
  name: "listPortfolioUpdates",
  title: "List quarterly portfolio updates for a company",
  description: "Return portfolio update entries for this company, newest period first.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ companyUuid, limit }, ctx) {
    const updates = await listForCompany({
      accountId: ctx.accountId,
      companyUuid,
      limit,
    });
    return { updates };
  },
};
