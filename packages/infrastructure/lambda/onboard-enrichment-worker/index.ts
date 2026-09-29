import {
  InvokeCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

const lambda = new LambdaClient({});
const secrets = new SecretsManagerClient({});
let cachedToken: string | undefined;

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const arn = process.env.INTERNAL_CRON_TOKEN_SECRET_ARN;
  if (!arn) throw new Error("INTERNAL_CRON_TOKEN_SECRET_ARN missing");
  const result = await secrets.send(
    new GetSecretValueCommand({ SecretId: arn }),
  );
  if (!result.SecretString) throw new Error("internal token secret is empty");
  try {
    cachedToken =
      (JSON.parse(result.SecretString) as { token?: string }).token ??
      result.SecretString;
  } catch {
    cachedToken = result.SecretString;
  }
  return cachedToken;
}

function buildWebEvent(runId: string, token: string): Record<string, unknown> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL missing");
  const now = new Date().toISOString();
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/api/internal/onboard-enrichment",
    rawQueryString: "",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      host: new URL(appUrl).host,
    },
    requestContext: {
      http: {
        method: "POST",
        path: "/api/internal/onboard-enrichment",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "onboard-enrichment-worker",
      },
      requestId: `onboard-enrichment-${runId}`,
      stage: "$default",
      time: now,
      timeEpoch: Date.now(),
      routeKey: "$default",
      accountId: "internal",
    },
    body: JSON.stringify({ runId }),
    isBase64Encoded: false,
  };
}

async function processRun(runId: string): Promise<void> {
  const functionName = process.env.WEB_FUNCTION_NAME;
  if (!functionName) throw new Error("WEB_FUNCTION_NAME missing");
  const token = await getToken();
  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(
        JSON.stringify(buildWebEvent(runId, token)),
      ),
    }),
  );
  if (response.FunctionError) {
    throw new Error(`web enrichment invocation failed: ${response.FunctionError}`);
  }
  const payload = response.Payload
    ? JSON.parse(new TextDecoder().decode(response.Payload)) as {
        statusCode?: number;
        body?: string;
      }
    : null;
  if (!payload || (payload.statusCode ?? 500) >= 300) {
    throw new Error(
      `web enrichment returned ${payload?.statusCode ?? "empty response"}`,
    );
  }
}

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];
  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body) as { runId?: string };
      if (!body.runId) throw new Error("queue message missing runId");
      await processRun(body.runId);
    } catch (error) {
      console.error("onboard enrichment worker failed", error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}
