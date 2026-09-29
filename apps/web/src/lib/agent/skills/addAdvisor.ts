import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { createAdvisor } from "@/lib/advisors";

const input = z.object({
  name: z.string().min(1),
  fuelDataPersonId: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  photoUrl: z.string().url().optional(),
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  focusIndustries: z.array(z.string()).optional(),
  location: z.string().optional(),
  publicCard: z.boolean().default(false),
  privateNotes: z.string().optional(),
});

export const addAdvisorSkill: Skill<z.infer<typeof input>> = {
  name: "addAdvisor",
  title: "Add an advisor to the account",
  description:
    "Create an advisor scoped to the caller's account. Supply fuelDataPersonId when the advisor was picked from a fuel-data people search.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute(args, ctx) {
    const { name, ...patch } = args;
    const row = await createAdvisor({
      accountId: ctx.accountId,
      curatedByEmail: ctx.userEmail,
      name,
      patch,
    });
    return { advisor: row };
  },
};
