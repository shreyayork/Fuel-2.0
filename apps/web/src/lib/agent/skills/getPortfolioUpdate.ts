import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getForPeriod, getLatestForCompany } from "@/lib/portfolio-updates";

const input = z.object({
  companyUuid: z.string().describe("fuel-data organization UUID"),
  period: z
    .string()
    .optional()
    .describe("Period identifier like '2026-q2'. Omit to get the latest update."),
});

export const getPortfolioUpdateSkill: Skill<z.infer<typeof input>> = {
  name: "getPortfolioUpdate",
  title: "Get a portfolio update",
  description:
    "Return a single portfolio update for the given company + period, or the latest if period is omitted.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ companyUuid, period }, ctx) {
    const update = period
      ? await getForPeriod({ accountId: ctx.accountId, companyUuid, period })
      : await getLatestForCompany({ accountId: ctx.accountId, companyUuid });
    return { update };
  },
};
