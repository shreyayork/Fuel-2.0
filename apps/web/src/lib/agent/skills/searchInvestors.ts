import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { searchInvestors } from "@/lib/fuel-data";

const input = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(50).default(20),
});

export const searchInvestorsSkill: Skill<z.infer<typeof input>> = {
  name: "searchInvestors",
  title: "Search investors in fuel-data",
  description:
    "Search the fuel-data Neptune graph for investor vertices by name. Returns id, name, type, investment count, website, and LinkedIn when present.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ query, limit }) {
    const results = await searchInvestors(query, limit);
    return { results };
  },
};
