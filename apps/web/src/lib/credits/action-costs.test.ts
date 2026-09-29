import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { billableActionCosts } from "./constants";

describe("billableActionCosts", () => {
  it("excludes actions with cost exactly 0", () => {
    const rows = [
      { action: "aiChat", label: "AI chat", cost: 3 },
      { action: "hubspotSync", label: "HubSpot sync", cost: 0 },
      { action: "granolaSync", label: "Granola sync", cost: 0 },
      { action: "playbookRun", label: "Playbook", cost: 40 },
    ];
    assert.deepEqual(billableActionCosts(rows), [
      { action: "aiChat", label: "AI chat", cost: 3 },
      { action: "playbookRun", label: "Playbook", cost: 40 },
    ]);
  });

  it("keeps positive costs and drops zeros dynamically", () => {
    assert.deepEqual(
      billableActionCosts([{ action: "slackSync", label: "Slack sync", cost: 5 }]),
      [{ action: "slackSync", label: "Slack sync", cost: 5 }],
    );
    assert.deepEqual(
      billableActionCosts([{ action: "slackSync", label: "Slack sync", cost: 0 }]),
      [],
    );
  });
});
