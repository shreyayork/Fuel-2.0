import "server-only";
import {
  dispatchOverviewJob,
  enqueueOverviewJob,
} from "@/lib/overview/run-overview-job";
import { loadOverviewCohortContext } from "@/lib/overview/cohort";
import { loadOverviewApiResponse } from "@/lib/overview/queries";
import type { OverviewApiResponse } from "@/lib/overview/types";

/** Kick off background AI regen without waiting for a full overview reload. */
export async function enqueueOverviewRegen(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  regenerate: boolean;
}): Promise<{ regenerating: boolean }> {
  if (!opts.regenerate) return { regenerating: false };
  const runId = await enqueueOverviewJob({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    userEmail: opts.userEmail,
  });
  void dispatchOverviewJob(runId);
  return { regenerating: true };
}

/** Enqueue background AI regen and return the fast post-mutation overview payload. */
export async function enqueueOverviewRegenAndLoad(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  regenerate: boolean;
}): Promise<{ regenerating: boolean; overview: OverviewApiResponse }> {
  const { regenerating } = await enqueueOverviewRegen(opts);

  const { cohortKey, benchmarkRows, allCohorts } = await loadOverviewCohortContext(opts.companyUuid);
  const overview = await loadOverviewApiResponse({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    cohortKey,
    benchmarkRows,
    allCohorts,
  });

  return { regenerating, overview };
}
