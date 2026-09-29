import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  investorCtaLabel,
  resolveInvestorSteps,
  showHubSpotPipelineHint,
} from "./investor-steps";

describe("resolveInvestorSteps", () => {
  it("keeps base steps without HubSpot", () => {
    assert.deepEqual(resolveInvestorSteps("Spreadsheet"), [
      "profile",
      "investment",
    ]);
    assert.deepEqual(resolveInvestorSteps("Not yet"), ["profile", "investment"]);
    assert.deepEqual(resolveInvestorSteps(""), ["profile", "investment"]);
  });

  it("appends hubspot when pipeline is HubSpot", () => {
    assert.deepEqual(resolveInvestorSteps("HubSpot"), [
      "profile",
      "investment",
      "hubspot",
    ]);
  });
});

describe("investorCtaLabel", () => {
  it("preserves Start my journey on final step", () => {
    assert.equal(investorCtaLabel({ isLastVisibleStep: false }), "Continue");
    assert.equal(
      investorCtaLabel({ isLastVisibleStep: true }),
      "Start my journey",
    );
  });
});

describe("showHubSpotPipelineHint", () => {
  it("only when HubSpot selected", () => {
    assert.equal(showHubSpotPipelineHint("HubSpot"), true);
    assert.equal(showHubSpotPipelineHint("Another CRM"), false);
  });
});
