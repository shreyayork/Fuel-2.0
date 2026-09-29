import { z } from "zod";

export const YorkHelpBulletSchema = z.object({
  title: z.string().min(1).optional(),
  milestone: z.string().min(1),
  help: z.string().min(1),
  primary_service: z.string().min(1),
  track: z.enum(["rd", "gtm", "ga"]),
});

export const YorkHelpSchema = z.object({
  section_title: z.literal("How York IE can help").or(z.string().min(1)),
  bullets: z.array(YorkHelpBulletSchema).min(1).max(2),
  cta_label: z.string().min(1),
});

export type YorkHelpBullet = z.infer<typeof YorkHelpBulletSchema>;
export type YorkHelp = z.infer<typeof YorkHelpSchema>;

export type YorkHelpStatus = "idle" | "generating" | "ready" | "failed";

export type YorkHelpDismiss =
  | { mode: "none" }
  | { mode: "hide"; until: string }
  | { mode: "forever" };
