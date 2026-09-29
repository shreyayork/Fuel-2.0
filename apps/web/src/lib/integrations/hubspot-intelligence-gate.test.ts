import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldProcessHubspotIntelligenceAfterUpsert } from "./hubspot-intelligence-gate";

describe("shouldProcessHubspotIntelligenceAfterUpsert", () => {
  it("runs pipeline on insert even if intelligence somehow already exists", () => {
    assert.equal(
      shouldProcessHubspotIntelligenceAfterUpsert({
        inserted: true,
        hasExistingIntelligence: false,
      }),
      true,
    );
    assert.equal(
      shouldProcessHubspotIntelligenceAfterUpsert({
        inserted: true,
        hasExistingIntelligence: true,
      }),
      true,
    );
  });

  it("runs pipeline on update when intelligence is missing", () => {
    assert.equal(
      shouldProcessHubspotIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: false,
      }),
      true,
    );
  });

  it("skips pipeline on update when intelligence already exists and content unchanged", () => {
    assert.equal(
      shouldProcessHubspotIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: true,
        contentChanged: false,
      }),
      false,
    );
  });

  it("runs pipeline on update when content changed", () => {
    assert.equal(
      shouldProcessHubspotIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: true,
        contentChanged: true,
      }),
      true,
    );
  });
});
