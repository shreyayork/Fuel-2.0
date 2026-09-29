import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  contextIntelligenceGenerationAction,
  contextSourceContentChanged,
  shouldProcessContextIntelligenceAfterUpsert,
  shouldProcessHubspotIntelligenceAfterUpsert,
} from "./context-intelligence-gate";

describe("shouldProcessContextIntelligenceAfterUpsert", () => {
  it("runs pipeline on insert even if intelligence somehow already exists", () => {
    assert.equal(
      shouldProcessContextIntelligenceAfterUpsert({
        inserted: true,
        hasExistingIntelligence: false,
      }),
      true,
    );
    assert.equal(
      shouldProcessContextIntelligenceAfterUpsert({
        inserted: true,
        hasExistingIntelligence: true,
      }),
      true,
    );
  });

  it("runs pipeline on update when intelligence is missing", () => {
    assert.equal(
      shouldProcessContextIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: false,
      }),
      true,
    );
  });

  it("skips pipeline on update when intelligence already exists and content unchanged", () => {
    assert.equal(
      shouldProcessContextIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: true,
      }),
      false,
    );
    assert.equal(
      shouldProcessContextIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: true,
        contentChanged: false,
      }),
      false,
    );
  });

  it("runs pipeline on update when content changed even if intelligence exists", () => {
    assert.equal(
      shouldProcessContextIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: true,
        contentChanged: true,
      }),
      true,
    );
  });

  it("HubSpot alias matches shared gate", () => {
    assert.equal(
      shouldProcessHubspotIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: true,
        contentChanged: true,
      }),
      shouldProcessContextIntelligenceAfterUpsert({
        inserted: false,
        hasExistingIntelligence: true,
        contentChanged: true,
      }),
    );
  });
});

describe("contextSourceContentChanged", () => {
  it("returns false when title and content match after trim", () => {
    assert.equal(
      contextSourceContentChanged(
        { title: " Note ", content: " body " },
        { title: "Note", content: "body" },
      ),
      false,
    );
  });

  it("returns true when title changes", () => {
    assert.equal(
      contextSourceContentChanged(
        { title: "Old", content: "same" },
        { title: "New", content: "same" },
      ),
      true,
    );
  });

  it("returns true when content changes", () => {
    assert.equal(
      contextSourceContentChanged(
        { title: "T", content: "before" },
        { title: "T", content: "after" },
      ),
      true,
    );
  });

  it("treats null/undefined as empty", () => {
    assert.equal(
      contextSourceContentChanged(
        { title: null, content: null },
        { title: "", content: "" },
      ),
      false,
    );
    assert.equal(
      contextSourceContentChanged(
        { title: null, content: "" },
        { title: "x", content: "" },
      ),
      true,
    );
  });
});

describe("contextIntelligenceGenerationAction", () => {
  it("generates when no existing rows", () => {
    assert.equal(
      contextIntelligenceGenerationAction({
        existingCount: 0,
        replaceExisting: false,
      }),
      "generate",
    );
  });

  it("skips when existing rows and not replacing", () => {
    assert.equal(
      contextIntelligenceGenerationAction({
        existingCount: 2,
        replaceExisting: false,
      }),
      "skip",
    );
  });

  it("generates (replace path) when existing rows and replaceExisting", () => {
    assert.equal(
      contextIntelligenceGenerationAction({
        existingCount: 2,
        replaceExisting: true,
      }),
      "generate",
    );
  });
});
