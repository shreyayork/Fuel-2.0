import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { loadDataset } from "@/db/queries";

const input = z.object({
  team: z.enum(["investment", "operating", "external"]).optional(),
});

export const listPeopleSkill: Skill<z.infer<typeof input>> = {
  name: "listPeople",
  title: "List people on the York team",
  description: "Return people (investment / operating / external), optionally filtered by team.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ team }) {
    const data = await loadDataset();
    const people = team ? data.people.filter((p) => p.team === team) : data.people;
    return { people };
  },
};
