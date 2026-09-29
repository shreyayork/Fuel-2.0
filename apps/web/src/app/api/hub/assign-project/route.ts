import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountNotFoundError, assignProjectsToAccount } from "@/lib/hub/assign-projects";
import { requireHubAuth } from "@/lib/hub/require-hub-auth";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AssignProjectBody = z.object({
  account_id: z.string().trim().min(1).max(128),
  project_ids: z.array(z.string().trim().min(1).max(256)),
});

/**
 * Hub integration: assign/sync York IE projects for a Fuel account.
 *
 * Auth: Client ID + Client Secret via Basic auth or X-Client-Id / X-Client-Secret.
 * Env: HUB_API_CLIENT_ID, HUB_API_CLIENT_SECRET
 *
 * POST /api/hub/assign-project
 */
export async function POST(req: Request) {
  const authError = requireHubAuth(req);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_input", message: "request body must be JSON" },
      { status: 400 },
    );
  }

  const parsed = AssignProjectBody.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: "invalid_input",
        message: issue?.message ?? "invalid request body",
      },
      { status: 400 },
    );
  }

  try {
    const projectIds = await assignProjectsToAccount(
      parsed.data.account_id,
      parsed.data.project_ids,
    );
    return NextResponse.json({
      success: true,
      message: "Projects assigned successfully.",
      account_id: parsed.data.account_id,
      project_ids: projectIds,
    });
  } catch (e) {
    if (e instanceof AccountNotFoundError) {
      return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    }
    console.error("[hub/assign-project] failed", e);
    captureIntegrationException(e, { integration: "hub", operation: "assign_project" });
    return NextResponse.json({ error: "assign_failed" }, { status: 502 });
  }
}
