import {
  CATEGORY_IDS,
  CATEGORY_META,
  type OverviewCategoryId,
} from "./constants";
import { SignalTagSchema } from "./types";
import type { z } from "zod";

export type SignalTag = z.infer<typeof SignalTagSchema>;

export function urgencyFromScore(score: number): SignalTag["urgency"] {
  // Align with overviewScoreTierColor / scorecard tiers.
  if (score >= 65) return "stable";
  if (score >= 35) return "watch";
  return "urgent";
}

/**
 * Deterministic focus-track chips for the advisor panel.
 * AI `signal_tags` are often omitted; derive one tag per track from live scores.
 */
export function buildAdvisorSignalTags(
  categories: Array<{
    categoryId: OverviewCategoryId;
    score: number;
    intelligenceCount?: number;
    weaknessCount?: number;
  }>,
): SignalTag[] {
  const byId = new Map(categories.map((c) => [c.categoryId, c]));
  return CATEGORY_IDS.map((id) => {
    const cat = byId.get(id);
    const score = cat?.score ?? 0;
    const urgency = urgencyFromScore(score);
    const riskCount =
      urgency === "urgent"
        ? Math.max(cat?.weaknessCount ?? 0, cat?.intelligenceCount ?? 0)
        : 0;
    let suffix = "Stable";
    if (urgency === "watch") suffix = "Watch";
    else if (urgency === "urgent") {
      suffix =
        riskCount > 0
          ? `${riskCount} new risk${riskCount === 1 ? "" : "s"}`
          : "Needs attention";
    }
    return {
      category_id: id,
      label: CATEGORY_META[id].label,
      urgency,
      suffix,
      risk_count: riskCount,
    };
  });
}
