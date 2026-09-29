import "server-only";
import * as Sentry from "@sentry/nextjs";
import { persistProfileEarn } from "@/lib/credits/queries";
import {
  buildBenchmarkReward,
  buildModuleReward,
  type ProfileCreditReward,
  type ProfileModuleId,
} from "@/lib/credits/profile-modules";
import { completedOnboardingModules } from "@/lib/overview/detail-question-catalog";

export async function awardEligibleProfileCredits(opts: {
  accountId: string;
  answers: Record<string, string | null | undefined>;
  benchmarkComplete?: boolean;
  replaceModules?: boolean;
  setupIncomplete?: boolean;
}): Promise<ProfileCreditReward[]> {
  try {
    const modules = completedOnboardingModules(opts.answers);
    const {
      snapshot,
      newlyEarnedModules,
      benchmarkNewlyEarned,
    } = await persistProfileEarn(opts.accountId, {
      modules,
      replaceModules: opts.replaceModules,
      benchmark: opts.benchmarkComplete ? true : undefined,
      setupIncomplete: opts.setupIncomplete,
    });
    const rewards: ProfileCreditReward[] = [];
    const earned: { modules: ProfileModuleId[]; benchmark: boolean } = {
      modules: snapshot.profileModules,
      benchmark: snapshot.benchmarkEarned,
    };
    for (const id of newlyEarnedModules) {
      rewards.push(buildModuleReward(id, earned, snapshot.planMonthlyLimit));
    }
    if (benchmarkNewlyEarned) {
      rewards.push(buildBenchmarkReward(earned, snapshot.planMonthlyLimit));
    }
    return rewards;
  } catch (error) {
    Sentry.setTag("integration", "credits");
    Sentry.captureException(error);
    throw error;
  }
}
