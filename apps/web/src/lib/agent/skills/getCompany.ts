import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { getCompany } from "@/lib/fuel-data";

const input = z.object({
  uuid: z.string().describe("fuel-data organization UUID"),
});

export const getCompanySkill: Skill<z.infer<typeof input>, { company: unknown | null }> = {
  name: "getCompany",
  title: "Get company details",
  description: "Load a company's public profile from fuel-data OpenSearch by UUID.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ uuid }) {
    const company = await getCompany(uuid);
    return { company };
  },
};
