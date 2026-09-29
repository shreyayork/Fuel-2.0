import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { linkAdvisorToCompany } from "@/lib/advisors";

const input = z.object({
  advisorId: z.string(),
  companyUuid: z.string().describe("fuel-data or cat_-prefixed UUID"),
  role: z.string().optional(),
});

export const linkAdvisorToCompanySkill: Skill<z.infer<typeof input>> = {
  name: "linkAdvisorToCompany",
  title: "Link an advisor to a company",
  description:
    "Attach a previously-curated advisor (account-owned or platform instance-level) to the account's claimed company profile only. Visibility is enforced by the underlying helper.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ advisorId, companyUuid, role }, ctx) {
    await linkAdvisorToCompany({
      accountId: ctx.accountId,
      advisorId,
      companyUuid,
      role,
      addedByEmail: ctx.userEmail,
    });
    return { ok: true };
  },
};
