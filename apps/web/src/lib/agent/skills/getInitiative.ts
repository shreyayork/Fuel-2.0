import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { loadDataset } from "@/db/queries";

const input = z.object({
  id: z.number().int(),
});

export const getInitiativeSkill: Skill<z.infer<typeof input>> = {
  name: "getInitiative",
  title: "Get an initiative by id",
  description: "Return a single initiative row with its team member ids.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ id }) {
    const data = await loadDataset();
    const initiative = data.initiatives.find((i) => i.id === id) ?? null;
    return { initiative };
  },
};
