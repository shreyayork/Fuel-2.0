import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { searchCompanies } from "@/lib/fuel-data";

const input = z.object({
  query: z.string().min(1).describe("Full-text query against company name, domain, and description"),
  limit: z.number().int().min(1).max(25).optional().default(10),
});

export const searchCompaniesSkill: Skill<z.infer<typeof input>, {
  companies: Array<{
    uuid: string;
    name: string;
    domain?: string;
    shortDescription?: string;
    locationCity?: string;
    locationCountry?: string;
    totalFundingUsd?: number;
    employeeCount?: string;
  }>;
}> = {
  name: "searchCompanies",
  title: "Search companies",
  description:
    "Search the fuel-data company graph by name, domain, or keyword. Returns up to `limit` matches with basic metadata.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ query, limit }) {
    const results = await searchCompanies(query, limit);
    return { companies: results };
  },
};
