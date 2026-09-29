import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listCatalogCompanies } from "@/lib/catalog";

const input = z.object({
  limit: z.number().int().min(1).max(500).default(100),
});

export const listCatalogCompaniesSkill: Skill<z.infer<typeof input>> = {
  name: "listCatalogCompanies",
  title: "List catalog companies for the account",
  description:
    "Return the account's Fuel-native catalog companies (not from Crunchbase/fuel-data), newest activity first.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ limit }, ctx) {
    const rows = await listCatalogCompanies({ accountId: ctx.accountId, limit });
    return { catalog: rows };
  },
};
