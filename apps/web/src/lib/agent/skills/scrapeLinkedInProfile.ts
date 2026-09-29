import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { fetchLinkedInProfile, type LinkedInProfileResult } from "@/lib/enrichment/linkedin-profile";

const input = z.object({
  linkedinUrl: z
    .string()
    .describe("LinkedIn profile URL, linkedin.com/in/<slug>, or just the slug."),
});

export const scrapeLinkedInProfileSkill: Skill<z.infer<typeof input>, LinkedInProfileResult> = {
  name: "scrapeLinkedInProfile",
  title: "Scrape a LinkedIn person profile",
  description:
    "Fetch a LinkedIn profile (roles, education, skills, current company, location) via Bright Data. Useful for researching executives, advisors, or founders. Cached 7 days.",
  inputSchema: input,
  readOnly: true,
  costTokens: 5_000,
  execute: ({ linkedinUrl }) => fetchLinkedInProfile(linkedinUrl),
};
