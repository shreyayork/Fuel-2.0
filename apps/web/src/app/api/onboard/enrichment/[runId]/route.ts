import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOwnedOnboardEnrichmentRun } from "@/lib/onboard/enrichment-runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const session = await getSession();
  const cognitoSub =
    session?.sub ??
    (process.env.COGNITO_USER_POOL_ID ? null : "local-development");
  if (!cognitoSub) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  const { runId } = await params;
  const run = await getOwnedOnboardEnrichmentRun(runId, cognitoSub);
  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    runId: run.id,
    status: run.status,
    steps: run.steps,
    error: run.errorMessage,
    payload:
      run.status === "completed"
        ? {
            enrichment: run.enrichmentPayload,
            extracted: run.extractedPayload,
            benchmarkHints: run.benchmarkHints,
          }
        : null,
  });
}
