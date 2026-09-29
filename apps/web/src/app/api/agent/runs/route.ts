import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { runAgentStream } from "@/lib/agent/runtime";
import { loadAgentDefaultSystemPrompt } from "@/lib/agent/default-system-prompt";
import { checkRunAllowed } from "@/lib/usage";
import { buildNdjsonStream, NDJSON_HEADERS } from "@/lib/streaming/ndjson";
import { CreditGateError, requireCreditAction } from "@/lib/credits/server";
import { loadTrackFormQaPromptBlock } from "@/lib/playbooks/track-form-qa";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) redirect("/sign-in");
  }
  const email = (await getSession())?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 400 });

  const body = (await req.json()) as {
    prompt: string;
    kind?: string;
    subjectCompanyUuid?: string;
    subjectCompanyName?: string;
    subjectPortfolioName?: string;
    subjectPortfolioId?: string;
    playbookTitle?: string;
    systemPrompt?: string;
    artifactKind?: string;
    history?: Array<{ role: "user" | "assistant"; text: string }>;
  };
  if (!body.prompt) return NextResponse.json({ error: "missing_prompt" }, { status: 400 });

  // Mint run id before charging so the debit (and any later refund) share a
  // stable referenceId for idempotency + Usage exclusion (F20A-231).
  const runId = randomUUID();
  const creditAction = body.kind === "playbook_run" ? "playbookRun" : "aiChat";
  try {
    await requireCreditAction(account.id, creditAction, {
      userEmail: email,
      referenceId: runId,
    });
  } catch (e) {
    if (e instanceof CreditGateError) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          reason: e.reason,
          snapshot: e.snapshot,
        },
        { status: 402 },
      );
    }
    throw e;
  }

  // Soft-limit: log when over quota but don't block yet. When we flip on
  // hard enforcement later, swap the console.warn for a 429 response.
  const limitCheck = await checkRunAllowed({ accountId: account.id });
  if (!limitCheck.allowed) {
    console.warn("[usage] account over limit (soft)", {
      accountId: account.id,
      used: limitCheck.used,
      limit: limitCheck.limit,
    });
  }

  const systemPrompt =
    body.systemPrompt ??
    (await loadAgentDefaultSystemPrompt({ kind: body.kind }));

  let userPrompt = body.prompt;
  if (body.kind === "playbook_run" && body.subjectCompanyUuid) {
    try {
      const trackBlock = await loadTrackFormQaPromptBlock({
        accountId: account.id,
        companyUuid: body.subjectCompanyUuid,
      });
      if (trackBlock) userPrompt = `${body.prompt}\n\n${trackBlock}`;
    } catch (error) {
      captureIntegrationException(error, {
        integration: "playbook_run",
        operation: "load_track_form_qa",
        tags: { account_id: account.id },
      });
    }
  }

  const generator = runAgentStream({
    runId,
    userEmail: email,
    accountId: account.id,
    kind: body.kind ?? "chat",
    subjectCompanyUuid: body.subjectCompanyUuid,
    subjectCompanyName: body.subjectCompanyName,
    subjectPortfolioName: body.subjectPortfolioName,
    subjectPortfolioId: body.subjectPortfolioId,
    playbookTitle: body.playbookTitle,
    artifactKind: body.artifactKind,
    systemPrompt,
    userPrompt,
    history: body.history,
  });

  // CloudFront's 60s origin-response idle timeout is what the 10s heartbeat
  // is defending against — portfolio playbook runs can sit silent that long
  // between Bedrock turns.
  const stream = buildNdjsonStream(generator);

  return new Response(stream, { headers: NDJSON_HEADERS });
}
