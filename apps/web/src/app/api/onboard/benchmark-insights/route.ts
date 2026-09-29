import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { generateOnboardBenchmarkInsightsSkill } from "@/lib/agent/skills/generateOnboardBenchmarkInsights";
import { resolveOnboardCohort } from "@/lib/onboard/resolve-onboard-cohort";
import {
  buildMetricInputsFromAnswers,
  onboardBenchmarkMetricBandsFromDrawer,
} from "@/lib/onboard/map-benchmark-insights";
import type { OnboardBenchmarkInsightsResponse } from "@/lib/onboard/benchmark-insights-types";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATIC_METRICS = onboardBenchmarkMetricBandsFromDrawer();

const Body = z
  .object({
    companyName: z.string().trim().min(1),
    cohortKey: z.string().trim().max(120).nullish(),
    cohortLabel: z.string().trim().min(1),
    industry: z.string().trim().max(200).nullish(),
    businessModel: z.string().trim().max(120).nullish(),
    locationCountry: z.string().trim().max(120).nullish(),
    fundingRoundTypes: z.array(z.string().trim().max(80)).max(20).optional(),
    answers: z.record(z.string(), z.string()),
  })
  .strict();

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    const issues = (e as { issues?: Array<{ path?: string[]; message: string }> })?.issues;
    const detail = issues
      ? issues.map((i) => `${i.path?.join(".") ?? "?"}: ${i.message}`).join("; ")
      : (e as Error).message;
    return NextResponse.json({ error: "invalid_body", detail }, { status: 400 });
  }

  try {
    const cohortResolution = await resolveOnboardCohort({
      industry: parsed.industry,
      locationCountry: parsed.locationCountry,
      fundingRoundTypes: parsed.fundingRoundTypes,
      cohortKeyOverride: parsed.cohortKey,
    });

    const cohortRows = cohortResolution.benchmarkRows;
    const metrics = buildMetricInputsFromAnswers(
      parsed.answers,
      STATIC_METRICS,
      cohortRows,
    );

    if (metrics.length === 0) {
      return NextResponse.json({ cards: [], fallback: true } satisfies OnboardBenchmarkInsightsResponse);
    }

    const result = await generateOnboardBenchmarkInsightsSkill.execute(
      {
        companyName: parsed.companyName,
        cohortKey: parsed.cohortKey ?? cohortResolution.cohortKey,
        cohortLabel: parsed.cohortLabel,
        industry: parsed.industry,
        businessModel: parsed.businessModel,
        metrics,
      },
      { userEmail: email, accountId: "onboard" },
    );

    if (!result.cards.length) {
      return NextResponse.json({
        cards: [],
        fallback: true,
      } satisfies OnboardBenchmarkInsightsResponse);
    }

    return NextResponse.json({
      cards: result.cards,
      fallback: false,
    } satisfies OnboardBenchmarkInsightsResponse);
  } catch (e) {
    captureIntegrationException(e, {
      integration: "agent",
      operation: "onboard_benchmark_insights",
    });
    return NextResponse.json({
      cards: [],
      fallback: true,
    } satisfies OnboardBenchmarkInsightsResponse);
  }
}
