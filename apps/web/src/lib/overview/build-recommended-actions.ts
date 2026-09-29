import { currentQuarterLabel } from "./constants";
import { RecommendedActionSchema } from "./types";
import type { z } from "zod";

export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export interface RecommendedActionsContext {
  benchFilled: number;
  benchTotal: number;
  benchQuarterStale: boolean;
  hasUserSources: boolean;
  docCount: number;
  userIntelCount: number;
  detailTotal: number;
  detailAnswered: number;
  onboardingSeeded: number;
  detailsQuarterStale: boolean;
}

/**
 * Deterministic recommended actions — ported from Design/src/app/ScorecardV2.tsx
 * `buildAdvisorRecommendedActions`. Titles/CTAs follow product rules; subs reflect
 * live benchmark, sources, and detail-answer state (not hardcoded in the UI).
 */
export function buildAdvisorRecommendedActions(
  ctx: RecommendedActionsContext,
): RecommendedAction[] {
  const benchTotal = ctx.benchTotal;
  const benchFilled = ctx.benchFilled;
  const benchMissing = benchFilled === 0;
  const benchPartial = benchFilled > 0 && benchFilled < benchTotal;
  const benchComplete = benchFilled >= benchTotal;

  const detailTotal = ctx.detailTotal;
  const detailAnswered = ctx.detailAnswered;
  const detailComplete = detailTotal > 0 && detailAnswered >= detailTotal;
  const detailRemaining = Math.max(0, detailTotal - detailAnswered);
  const onboardingSeeded = ctx.onboardingSeeded;
  const drawerAdded = Math.max(0, detailAnswered - onboardingSeeded);

  const sourcesNeedAction = !ctx.hasUserSources;
  const detailsNeedAction = !detailComplete || ctx.detailsQuarterStale;

  let benchmarkAction: RecommendedAction;
  if (benchMissing) {
    benchmarkAction = {
      title: "Complete Benchmark",
      sub: "Add cohort metrics to unlock comparisons.",
      cta: "Edit Benchmark",
      done: false,
      action_type: "benchmark",
    };
  } else if (benchPartial) {
    benchmarkAction = {
      title: "Complete Benchmark",
      sub: `${benchFilled} of ${benchTotal} metrics entered.`,
      cta: "Edit Benchmark",
      done: false,
      action_type: "benchmark",
    };
  } else if (ctx.benchQuarterStale) {
    benchmarkAction = {
      title: "Add New Quarter Benchmark",
      sub: `${currentQuarterLabel()} numbers — refresh your cohort snapshot.`,
      cta: "Add Benchmark",
      done: false,
      action_type: "benchmark",
    };
  } else if (benchComplete && !sourcesNeedAction && !detailsNeedAction) {
    benchmarkAction = {
      title: "Update Benchmark",
      sub: "Refresh numbers if anything shifted this quarter.",
      cta: "Update Benchmark",
      done: true,
      action_type: "benchmark",
    };
  } else {
    benchmarkAction = {
      title: "Review Benchmark",
      sub: `${benchFilled} of ${benchTotal} cohort metrics on file.`,
      cta: "Review Benchmark",
      done: true,
      action_type: "benchmark",
    };
  }

  let sourcesAction: RecommendedAction;
  if (ctx.hasUserSources) {
    const sourceBits = [
      ctx.docCount > 0 ? `${ctx.docCount} in data room` : null,
      ctx.userIntelCount > 0
        ? `${ctx.userIntelCount} intelligence signal${ctx.userIntelCount === 1 ? "" : "s"}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    sourcesAction = {
      title: "Review Intelligence Sources",
      sub: sourceBits
        ? `${sourceBits} — add meetings, decks, or news.`
        : "Keep sources current for fresh intelligence.",
      cta: "Review Sources",
      done: true,
      action_type: "sources",
    };
  } else {
    sourcesAction = {
      title: "Add Intelligence Sources",
      sub: "Meetings, decks, news — fuel intelligence, initiatives & playbooks.",
      cta: "+ Add Sources",
      done: false,
      action_type: "sources",
    };
  }

  let detailsAction: RecommendedAction;
  if (ctx.detailsQuarterStale && detailComplete) {
    detailsAction = {
      title: "Update Company Details",
      sub: "New quarter — refresh product, go-to-market, and finance context.",
      cta: "Update Details",
      done: false,
      action_type: "details",
    };
  } else if (detailComplete) {
    detailsAction = {
      title: "Review Company Details",
      sub: `All ${detailTotal} answered — keep details current each quarter.`,
      cta: "Review Details",
      done: true,
      action_type: "details",
    };
  } else if (onboardingSeeded > 0 && drawerAdded === 0) {
    detailsAction = {
      title: "Complete Missing Details",
      sub: `${onboardingSeeded} from onboarding · ${detailRemaining} more across tracks.`,
      cta: "+ Add Details",
      done: false,
      action_type: "details",
    };
  } else if (detailAnswered >= Math.ceil(detailTotal / 2)) {
    detailsAction = {
      title: "Complete Missing Details",
      sub: `${detailAnswered} of ${detailTotal} · ${detailRemaining} left to sharpen tracks.`,
      cta: "+ Add Details",
      done: false,
      action_type: "details",
    };
  } else {
    detailsAction = {
      title: "Complete Missing Details",
      sub:
        onboardingSeeded > 0
          ? `${onboardingSeeded} from onboarding · ${detailRemaining} remaining.`
          : `${detailAnswered} of ${detailTotal} details added.`,
      cta: "+ Add Details",
      done: false,
      action_type: "details",
    };
  }

  return [benchmarkAction, sourcesAction, detailsAction];
}
