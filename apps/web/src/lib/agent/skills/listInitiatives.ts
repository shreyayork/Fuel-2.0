import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { loadDataset } from "@/db/queries";

const input = z.object({
  kind: z.enum(["continuous", "onetime"]).optional(),
  companyId: z.number().int().optional().describe("Filter to a single company's initiatives"),
});

export const listInitiativesSkill: Skill<z.infer<typeof input>> = {
  name: "listInitiatives",
  title: "List value-creation initiatives",
  description:
    "Return continuous services + one-time projects from the initiatives table, optionally filtered by kind or company.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ kind, companyId }) {
    const data = await loadDataset();
    let rows = data.initiatives;
    if (kind) rows = rows.filter((r) => r.kind === kind);
    if (companyId != null) rows = rows.filter((r) => r.companyId === companyId);
    return { initiatives: rows };
  },
};
