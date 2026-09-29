import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listContextForCompany } from "@/lib/context";

const input = z.object({
  companyUuid: z.string().describe("fuel-data organization UUID"),
  limit: z.number().int().min(1).max(500).default(100),
});

export const listContextItemsSkill: Skill<z.infer<typeof input>> = {
  name: "listContextItems",
  title: "List context items for a company",
  description:
    "Return notes, emails, meeting transcripts, HubSpot activity, funding events, etc. captured on the account for this company, newest first.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ companyUuid, limit }, ctx) {
    const items = await listContextForCompany({
      accountId: ctx.accountId,
      companyUuid,
      limit,
    });
    return { items };
  },
};
