import "server-only";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const client = new LambdaClient({});

export interface TechStackDetected {
  name: string;
  category: string;
  evidence: string[];
}

export interface TechStackResult {
  url: string;
  finalUrl: string;
  status: number;
  detected: TechStackDetected[];
  fetchedAt: string;
  error?: string;
}

/**
 * Invoke the self-hosted tech-stack Lambda to detect technologies used on a
 * given URL. Fast (~2-5s for most sites), no external API cost.
 */
export async function detectTechStack(opts: {
  url: string;
  timeoutSeconds?: number;
}): Promise<TechStackResult> {
  const fnName = process.env.TECH_STACK_FN_NAME;
  if (!fnName) throw new Error("TECH_STACK_FN_NAME missing");
  const timeoutSignal = AbortSignal.timeout((opts.timeoutSeconds ?? 10) * 1000);
  const res = await client.send(
    new InvokeCommand({
      FunctionName: fnName,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(JSON.stringify(opts)),
    }),
    { abortSignal: timeoutSignal },
  );
  if (!res.Payload) throw new Error("tech-stack: empty response");
  const body = new TextDecoder().decode(res.Payload);
  if (res.FunctionError) {
    throw new Error(`tech-stack error: ${body.slice(0, 300)}`);
  }
  return JSON.parse(body) as TechStackResult;
}
