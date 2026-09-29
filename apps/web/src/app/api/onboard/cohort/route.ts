import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { resolveOnboardCohort } from "@/lib/onboard/resolve-onboard-cohort";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z
  .object({
    industry: z.string().trim().max(200).nullish(),
    locationCountry: z.string().trim().max(120).nullish(),
    lastFundingType: z.string().trim().max(80).nullish(),
    fundingRoundTypes: z.array(z.string().trim().max(80)).max(20).optional(),
    cohortKeyOverride: z.string().trim().max(120).nullish(),
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

  const result = await resolveOnboardCohort({
    industry: parsed.industry,
    locationCountry: parsed.locationCountry,
    lastFundingType: parsed.lastFundingType,
    fundingRoundTypes: parsed.fundingRoundTypes,
    cohortKeyOverride: parsed.cohortKeyOverride,
  });

  return NextResponse.json(result);
}
