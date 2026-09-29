import {
  YORK_CATEGORY_LABELS,
  YORK_COMMON_HEADLINE,
  YORK_MAINTAIN_HEADLINES,
  type YorkPartnerCategoryId,
} from "./constants";
import { lookupChipHeadline } from "./catalog";
import type { YorkChipHeadlineMap, YorkPartnerCopy } from "./types";

function withName(firstName: string | undefined, body: string): string {
  const name = firstName?.trim();
  if (name) return `${name}, ${body}`;
  return body.charAt(0).toUpperCase() + body.slice(1);
}

/** Sidebar — fixed invite; never names gaps. */
export function yorkSidebarCopy(firstName?: string): YorkPartnerCopy {
  return {
    lead: withName(firstName, "turn Fuel gaps into a plan you can ship"),
    headline: YORK_COMMON_HEADLINE,
  };
}

/**
 * Overview — gap-aware lead from categories that have Needs improvement;
 * headline always the all-three line.
 */
export function yorkOverviewCopy(opts: {
  firstName?: string;
  /** Ordered R&D → GTM → G&A labels that have Needs improvement. */
  categoriesWithGaps: string[];
}): YorkPartnerCopy {
  const name = opts.firstName?.trim();
  const tracks = opts.categoriesWithGaps.filter(Boolean).slice(0, 3);
  const headline = YORK_COMMON_HEADLINE;

  if (tracks.length >= 3) {
    return {
      lead: withName(
        name,
        `Fuel sees gaps across ${tracks[0]}, ${tracks[1]}, and ${tracks[2]}`,
      ),
      headline,
    };
  }
  if (tracks.length === 2) {
    return {
      lead: withName(
        name,
        `Fuel sees gaps on ${tracks[0]} and ${tracks[1]}`,
      ),
      headline,
    };
  }
  if (tracks.length === 1) {
    return {
      lead: withName(
        name,
        `Fuel flagged work on ${tracks[0]} — York IE helps across R&D, GTM, and finance`,
      ),
      headline,
    };
  }
  return yorkSidebarCopy(name);
}

/** Detail — first Needs improvement chip drives lead + catalog headline. */
export function yorkDetailCopy(opts: {
  firstName?: string;
  categoryId: YorkPartnerCategoryId;
  /** Needs improvement labels in display order (most urgent first). */
  needsImprovementLabels: string[];
  headlines: YorkChipHeadlineMap;
}): YorkPartnerCopy {
  const track = YORK_CATEGORY_LABELS[opts.categoryId];
  const first = opts.needsImprovementLabels
    .map((l) => l.replace(/\s+/g, " ").trim())
    .find(Boolean);

  if (first) {
    return {
      lead: withName(opts.firstName, `Fuel flagged “${first}” on ${track}`),
      headline: lookupChipHeadline(opts.headlines, opts.categoryId, first),
    };
  }

  return {
    lead: withName(
      opts.firstName,
      `York IE helps you maintain and enhance what’s working on ${track}`,
    ),
    headline: YORK_MAINTAIN_HEADLINES[opts.categoryId],
  };
}
