import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireOverviewAccess } from "@/lib/overview/access";
import { loadOverviewCohortContext } from "@/lib/overview/cohort";
import { beginOverviewPerfLog } from "@/lib/overview/perf-log";
import { loadOverviewApiResponse } from "@/lib/overview/queries";
import { runOverviewGeneration } from "@/lib/overview/run-overview-job";

/** Shared POST body for `/overview/generate` and `/overview/regenerate`. */
export async function postOverviewGeneration(
  ctx: { params: Promise<{ uuid: string }> },
  failedError: "generation_failed" | "regeneration_failed",
): Promise<Response> {
  const { uuid } = await ctx.params;
  const access = await requireOverviewAccess(uuid);
  if (!access.ok) return access.response;

  const source =
    failedError === "regeneration_failed"
      ? "POST /overview/regenerate"
      : "POST /overview/generate";

  const apiWallStart = performance.now();
  const perf = beginOverviewPerfLog({
    runId: "pending",
    companyUuid: uuid,
    accountId: access.ctx.accountId,
    source,
  });

  try {
    const result = await runOverviewGeneration({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      userEmail: access.ctx.email,
      source,
      perf,
    });
    perf.setRunId(result.runId);

    if (!result.snapshotId) {
      perf.add("Total API Time", performance.now() - apiWallStart);
      perf.finish({
        status: "error",
        error: result.error ?? failedError,
      });
      return NextResponse.json(
        { error: result.error ?? failedError },
        { status: 502 },
      );
    }

    const { cohortKey, benchmarkRows, allCohorts } = await loadOverviewCohortContext(uuid);
    const data = await loadOverviewApiResponse({
      accountId: access.ctx.accountId,
      companyUuid: uuid,
      cohortKey,
      benchmarkRows,
      allCohorts,
    });

    // Response assembly DB reads are included in Total API Time only.
    perf.add("Total API Time", performance.now() - apiWallStart);
    perf.finish({ status: "ok" });

    return NextResponse.json(data);
  } catch (error) {
    perf.add("Total API Time", performance.now() - apiWallStart);
    perf.finish({
      status: "error",
      error: error instanceof Error ? error.message : "internal_error",
    });
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
