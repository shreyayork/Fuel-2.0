import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { neptuneFailureKind } from "@/lib/sentry/capture";

describe("neptuneFailureKind", () => {
  it("tags connection timeouts and fetch failures", () => {
    assert.equal(
      neptuneFailureKind({
        name: "TypeError",
        message: "fetch failed",
        cause: { code: "UND_ERR_CONNECT_TIMEOUT", message: "Connect Timeout" },
      }),
      "neptune_connection_failure",
    );
    assert.equal(
      neptuneFailureKind({ name: "AbortError", message: "Neptune timeout after 8000ms" }),
      "neptune_connection_failure",
    );
    assert.equal(
      neptuneFailureKind({ message: "connect ECONNREFUSED", cause: { code: "ECONNREFUSED" } }),
      "neptune_connection_failure",
    );
  });

  it("tags other errors as query failures", () => {
    assert.equal(
      neptuneFailureKind({ message: "Neptune 500: Internal Server Error" }),
      "neptune_query_failure",
    );
    assert.equal(
      neptuneFailureKind(new Error("Gremlin evaluation exceeded")),
      "neptune_query_failure",
    );
  });
});
