import type { YorkPartnerCategoryId } from "./constants";

export type YorkPartnerSurface = "sidebar" | "overview" | "detail";

export type YorkPartnerCopy = {
  lead: string;
  headline: string;
};

export type YorkChipHeadlineRow = {
  category: YorkPartnerCategoryId;
  chipLabel: string;
  headline: string;
};

export type ChipAdminRow = {
  category: YorkPartnerCategoryId;
  chipLabel: string;
  headline: string;
  isOverride: boolean;
};

/** category → normalized chip label → headline */
export type YorkChipHeadlineMap = Record<
  YorkPartnerCategoryId,
  Record<string, string>
>;
