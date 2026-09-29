import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { loadDataset } from "@/db/queries";

const input = z.object({
  id: z.number().int(),
});

export const getPersonWorkloadSkill: Skill<z.infer<typeof input>> = {
  name: "getPersonWorkload",
  title: "Get a person's active initiative count",
  description:
    "Return the count of initiatives a person owns or is on the team for, plus the initiative rows themselves.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ id }) {
    const data = await loadDataset();
    const person = data.people.find((p) => p.id === id) ?? null;
    if (!person) return { person: null, count: 0, initiatives: [] };
    const initiatives = data.initiatives.filter(
      (i) => i.ownerId === id || (i.team && i.team.includes(id)),
    );
    return { person, count: initiatives.length, initiatives };
  },
};
