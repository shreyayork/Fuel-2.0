/** Client-safe York help constants (no server-only imports). */

export const YORK_HELP_CTA_URL = "https://york.ie/services-request/";
export const YORK_HELP_SECTION_TITLE = "How York IE can help";
export const YORK_HELP_CTA_LABEL = "Talk to the York IE team";
export const YORK_HELP_MAX_SERVICES = 2;

/** Internal track codes the model stores on bullets — never show these as titles. */
export const YORK_HELP_TRACK_LABELS = {
  rd: "R&D",
  gtm: "GTM",
  ga: "G&A",
} as const;

export type YorkHelpTrackCode = keyof typeof YORK_HELP_TRACK_LABELS;

export function isYorkHelpTrackCode(value: string): value is YorkHelpTrackCode {
  return value === "rd" || value === "gtm" || value === "ga";
}

/** Heading for a help bullet: personalized title, else catalog name, else R&D / GTM / G&A. */
export function yorkHelpDisplayTitle(
  primaryService: string,
  track?: string,
  title?: string,
): string {
  const heading = (title ?? "").trim();
  if (heading && !isYorkHelpTrackCode(heading)) return heading;
  const name = primaryService.trim();
  if (isYorkHelpTrackCode(name)) return YORK_HELP_TRACK_LABELS[name];
  if (name) return name;
  const code = (track ?? "").trim();
  if (isYorkHelpTrackCode(code)) return YORK_HELP_TRACK_LABELS[code];
  return name;
}
