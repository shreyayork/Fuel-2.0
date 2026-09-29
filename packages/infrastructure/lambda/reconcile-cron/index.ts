/**
 * Cron target that POSTs to the web app's reconcile endpoint once a day.
 * Keeping the Lambda thin means all sync logic lives next to the rest of the
 * app code (apps/web/src/lib/pipelines.ts) and doesn't need to be duplicated.
 */
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient({});
let cachedToken: string | undefined;

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const arn = process.env.INTERNAL_CRON_TOKEN_SECRET_ARN;
  if (!arn) throw new Error("INTERNAL_CRON_TOKEN_SECRET_ARN missing");
  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) throw new Error("cron token secret has no value");
  try {
    const parsed = JSON.parse(res.SecretString) as { token?: string };
    cachedToken = parsed.token ?? res.SecretString;
  } catch {
    cachedToken = res.SecretString;
  }
  return cachedToken!;
}

export async function handler(
  event: { backfill?: boolean; chainDepth?: number } = {},
): Promise<{ ok: boolean; status: number; body: string }> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL missing");
  const path = process.env.ENDPOINT_PATH ?? "/api/cron/reconcile-hubspot";
  const token = await getToken();
  // Forward chainDepth so the web handler can decide whether this is a
  // freshly-scheduled run (depth 0) or a backlog continuation. The web
  // side caps the chain to prevent runaway.
  const params = new URLSearchParams();
  if (event.backfill) params.set("backfill", "1");
  if (typeof event.chainDepth === "number") {
    params.set("chainDepth", String(event.chainDepth));
  }
  const qs = params.toString();
  const url = `${appUrl}${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error("reconcile failed", res.status, body);
    throw new Error(`reconcile failed: ${res.status}`);
  }
  console.log("reconcile ok", body);
  return { ok: true, status: res.status, body };
}
