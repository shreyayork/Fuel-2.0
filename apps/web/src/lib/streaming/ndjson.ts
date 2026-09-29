import "server-only";

/**
 * NDJSON streaming helper, shared by `/api/agent/runs` and `/api/onboard/profile`.
 *
 * Each event from the iterator is serialized as a single line (`JSON.stringify`
 * + `\n`) and pushed to the response body. A blank line is emitted every
 * `heartbeatMs` so CloudFront's 60s origin-response idle timeout never trips
 * during slow LLM turn-taking or paid scraper waits.
 *
 * Iterator errors are surfaced as one final `{type:"error",message}` line and
 * the stream is closed cleanly.
 */
export interface NdjsonStreamOptions {
  /** Emit a blank `\n` line at this cadence to keep the byte stream alive. */
  heartbeatMs?: number;
  /** Map an iterator-thrown error into the event sent to the client. */
  onError?: (e: unknown) => Record<string, unknown>;
}

const encoder = new TextEncoder();
const HEARTBEAT = encoder.encode("\n");

function serialize(event: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export function buildNdjsonStream<T>(
  iter: AsyncIterable<T>,
  opts: NdjsonStreamOptions = {},
): ReadableStream<Uint8Array> {
  const heartbeatMs = opts.heartbeatMs ?? 10_000;
  const onError =
    opts.onError ??
    ((e: unknown) => ({ type: "error", message: (e as Error)?.message ?? "unknown error" }));

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(HEARTBEAT);
        } catch {
          // controller already closed
        }
      }, heartbeatMs);
      try {
        for await (const event of iter) {
          controller.enqueue(serialize(event));
        }
      } catch (e) {
        try {
          controller.enqueue(serialize(onError(e)));
        } catch {
          // already closed
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });
}

/** Standard NDJSON response headers (Content-Type + no-cache + nginx-friendly). */
export const NDJSON_HEADERS = {
  "content-type": "application/x-ndjson; charset=utf-8",
  "cache-control": "no-store",
  "x-accel-buffering": "no",
} as const;
