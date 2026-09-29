import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { loadDataset } from "@/db/queries";

const input = z.object({
  companyId: z.number().int(),
});

export const getCompanySignalsSkill: Skill<z.infer<typeof input>> = {
  name: "getCompanySignals",
  title: "Get signal feed for a company",
  description:
    "Return the live signal feed (meeting notes, HubSpot events, slack pings, emails) for a company by fixture id.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ companyId }) {
    const data = await loadDataset();
    return { signals: data.signalsByCompany[companyId] ?? [] };
  },
};
