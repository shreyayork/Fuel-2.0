import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listCompanyInitiatives } from "@/lib/company-initiatives";

const input = z.object({
  companyUuid: z
    .string()
    .describe("fuel-data organization UUID or cat_-prefixed catalog UUID"),
});

interface InitiativeOut {
  id: string;
  kind: "continuous" | "onetime";
  name: string;
  area: string;
  description: string | null;
  status: string;
  ownerEmail: string;
  due: string | null;
  createdAt: string;
  updatedAt: string;
  advisors: Array<{
    advisorId: string;
    name: string;
    role: string | null;
  }>;
}

export const getCompanyInitiativesSkill: Skill<
  z.infer<typeof input>,
  { initiatives: InitiativeOut[] }
> = {
  name: "getCompanyInitiatives",
  title: "Get initiatives for a company (v2 — real UUIDs, not fixture)",
  description:
    "Return account-scoped `company_initiatives` rows for a fuel-data or catalog company UUID. Includes continuous + one-time initiatives, each with area, description, status, owner, due date, and linked advisors. Use this alongside getCompanyObservations to tell the story of 'what we're doing about each signal' on a given company.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ companyUuid }, ctx) {
    const rows = await listCompanyInitiatives({
      accountId: ctx.accountId,
      companyUuid,
    });
    return {
      initiatives: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        name: r.name,
        area: r.area,
        description: r.description,
        status: r.status,
        ownerEmail: r.ownerEmail,
        due: r.due,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        advisors: r.advisors.map((a) => ({
          advisorId: a.advisorId,
          name: a.name,
          role: a.role,
        })),
      })),
    };
  },
};
