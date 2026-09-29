import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getInvestor } from "@/lib/fuel-data";

const input = z.object({
  id: z.string().describe("Neptune investor vertex id"),
});

export const getInvestorSkill: Skill<z.infer<typeof input>> = {
  name: "getInvestor",
  title: "Get investor profile with backed companies",
  description:
    "Fetch a single investor vertex plus the reverse traversal to companies they have backed (up to 200). Useful for quick due-diligence dossiers.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ id }) {
    const profile = await getInvestor(id);
    return { profile };
  },
};
