import "server-only";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { captureIntegrationException } from "@/lib/sentry/capture";

const client = new LambdaClient({});

export type LegacyWatchlistMigrationSyncResult =
  | {
      ok: true;
      mode: "sync";
      result: Record<string, unknown>;
    }
  | { ok: false; error: string; detail?: string };

/**
 * Fire-and-forget Fuel 1.0 → 2.0 watchlist migration for an onboarding claim.
 * Does not await migration work (InvocationType Event). Soft no-op when the
 * function name env is unset (local/dev). Never throws to the caller.
 */
export function startLegacyWatchlistMigration(opts: {
  creatorEmail: string;
  targetAccountId: string;
}): void {
  const fnName = process.env.WATCHLIST_MIGRATION_FN_NAME;
  if (!fnName) {
    return;
  }

  const email = opts.creatorEmail.trim().toLowerCase();
  const payload = {
    creatorEmail: email,
    targetAccountId: opts.targetAccountId,
  };

  void client
    .send(
      new InvokeCommand({
        FunctionName: fnName,
        InvocationType: "Event",
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      }),
    )
    .catch((error: unknown) => {
      captureIntegrationException(error, {
        integration: "watchlist_migration",
        operation: "async_invoke",
        context: { targetAccountId: opts.targetAccountId },
      });
    });
}

/**
 * Synchronous invoke for manual / test sync. Returns Lambda payload JSON.
 * Requires `WATCHLIST_MIGRATION_FN_NAME` and AWS credentials that can invoke it.
 * Writes to the Lambda's Postgres (stage/prod), not local Docker DB.
 */
export async function runLegacyWatchlistMigrationSync(opts: {
  creatorEmail: string;
  targetAccountId: string;
  force?: boolean;
}): Promise<LegacyWatchlistMigrationSyncResult> {
  const fnName = process.env.WATCHLIST_MIGRATION_FN_NAME;
  if (!fnName) {
    return {
      ok: false,
      error: "not_configured",
      detail:
        "WATCHLIST_MIGRATION_FN_NAME is unset. Local Docker cannot run this — set the stage/prod Lambda name and AWS credentials, or deploy CDK.",
    };
  }

  const payload = {
    creatorEmail: opts.creatorEmail.trim().toLowerCase(),
    targetAccountId: opts.targetAccountId,
    force: opts.force === true,
  };

  try {
    const res = await client.send(
      new InvokeCommand({
        FunctionName: fnName,
        InvocationType: "RequestResponse",
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      }),
    );
    const body = res.Payload ? new TextDecoder().decode(res.Payload) : "";
    if (res.FunctionError) {
      captureIntegrationException(new Error(body.slice(0, 300)), {
        integration: "watchlist_migration",
        operation: "sync_invoke",
        context: { targetAccountId: opts.targetAccountId },
      });
      return { ok: false, error: "lambda_error", detail: body.slice(0, 500) };
    }
    let parsed: Record<string, unknown> = {};
    try {
      parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    } catch {
      parsed = { raw: body.slice(0, 500) };
    }
    return { ok: true, mode: "sync", result: parsed };
  } catch (error: unknown) {
    captureIntegrationException(error, {
      integration: "watchlist_migration",
      operation: "sync_invoke",
      context: { targetAccountId: opts.targetAccountId },
    });
    return {
      ok: false,
      error: "invoke_failed",
      detail: error instanceof Error ? error.message : "unknown",
    };
  }
}
