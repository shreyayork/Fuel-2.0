import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOnboardProfileStream } from "./stream-client";

describe("parseOnboardProfileStream", () => {
  it("delivers queued job events without ending the stream", async () => {
    const jobs: string[] = [];
    const steps: string[] = [];
    const response = new Response(
      [
        JSON.stringify({
          type: "job",
          runId: "4d4db74a-1052-45bb-9b60-a4d28f3018bd",
          status: "queued",
        }),
        JSON.stringify({
          type: "step",
          id: "website",
          status: "done",
          label: "Website",
        }),
        JSON.stringify({ type: "done" }),
        "",
      ].join("\n"),
      { status: 200 },
    );

    await parseOnboardProfileStream(response, {
      onJob: (event) => jobs.push(event.runId),
      onStep: (event) => steps.push(event.id),
    });

    assert.deepEqual(jobs, ["4d4db74a-1052-45bb-9b60-a4d28f3018bd"]);
    assert.deepEqual(steps, ["website"]);
  });
});
