import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listAdvisors, listCompanyAdvisors } from "@/lib/advisors";

const input = z.object({
  companyUuid: z.string().optional().describe("If set, return only advisors linked to this company."),
  status: z.enum(["active", "archived"]).default("active"),
});

export const listAdvisorsSkill: Skill<z.infer<typeof input>> = {
  name: "listAdvisors",
  title: "List advisors curated by the account",
  description:
    "Return the caller account's advisor roster. Optionally filter to advisors linked to a specific company (fuel-data or cat_-prefixed UUID).",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ companyUuid, status }, ctx) {
    if (companyUuid) {
      const linked = await listCompanyAdvisors({ accountId: ctx.accountId, companyUuid });
      return {
        advisors: linked.map((l) => ({
          ...l.advisor,
          linkRole: l.role,
          linkedAt: l.addedAt,
        })),
      };
    }
    const items = await listAdvisors({ accountId: ctx.accountId, status });
    return { advisors: items };
  },
};
