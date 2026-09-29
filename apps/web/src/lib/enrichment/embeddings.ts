import "server-only";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { captureIntegrationException } from "@/lib/sentry/capture";

const MODEL_ID = process.env.BEDROCK_EMBED_MODEL_ID ?? "amazon.titan-embed-text-v2:0";
const EMBED_DIM = 1024; // context_items.embedding column is vector(1024)

const client = new BedrockRuntimeClient({});

/**
 * Embed a single piece of text via Amazon Titan Text Embeddings v2 (1024-dim).
 * Returns null on any error — callers should treat a failed embed as
 * "embedding not yet computed" rather than surfacing an error, since the
 * context item is still useful without it.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const clean = text.trim().slice(0, 50_000); // Titan v2 token limit is ~8k; char-truncate well below.
  if (!clean) return null;
  try {
    const res = await client.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputText: clean,
          dimensions: EMBED_DIM,
          normalize: true,
        }),
      }),
    );
    if (!res.body) return null;
    const parsed = JSON.parse(new TextDecoder().decode(res.body)) as {
      embedding?: number[];
    };
    if (!parsed.embedding || parsed.embedding.length !== EMBED_DIM) return null;
    return parsed.embedding;
  } catch (e) {
    captureIntegrationException(e, {
      integration: "bedrock",
      operation: "embed",
      level: "warning",
      context: { textLength: clean.length },
    });
    console.warn("[embeddings] titan embed failed", (e as Error).message);
    return null;
  }
}
