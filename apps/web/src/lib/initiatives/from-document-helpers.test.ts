import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  contextItemAlreadyProcessed,
  documentVersionAlreadyProcessed,
  matchIntelligenceLink,
  matchIntelligenceLinks,
  resolveTaggedIntelligenceLinks,
  taggedGeneratedIntelligenceIds,
  taggedTypesFromInitiative,
  MAX_DOCUMENT_INITIATIVES,
  type DocIntel,
} from "./from-document-helpers";

describe("document initiative helpers (F20A-200)", () => {
  it("caps document initiatives at 1-3", () => {
    assert.equal(MAX_DOCUMENT_INITIATIVES, 3);
  });

  it("is idempotent by documentVersionId", () => {
    const existing = [
      [{ id: "d1", documentVersionId: "drv_1", title: "Deck" }],
      [{ id: "d2", documentVersionId: "drv_2", title: "Plan" }],
    ];
    assert.equal(documentVersionAlreadyProcessed(existing, "drv_2"), true);
    assert.equal(documentVersionAlreadyProcessed(existing, "drv_9"), false);
  });

  it("treats a new document version as unprocessed", () => {
    const existing = [
      [{ id: "d1", documentVersionId: "drv_1", title: "Deck v1" }],
    ];
    assert.equal(documentVersionAlreadyProcessed(existing, "drv_1b"), false);
  });

  it("tolerates missing / empty sourceDocuments", () => {
    assert.equal(documentVersionAlreadyProcessed([null, undefined, []], "x"), false);
  });

  it("is idempotent by context item id for HubSpot sources", () => {
    const existing = [
      [
        {
          id: "ctx_hs_1",
          documentVersionId: null,
          title: "HubSpot note",
          typeLabel: "HubSpot note",
        },
      ],
      [{ id: "drv_1", documentVersionId: "drv_1", title: "Deck" }],
    ];
    assert.equal(contextItemAlreadyProcessed(existing, "ctx_hs_1"), true);
    assert.equal(contextItemAlreadyProcessed(existing, "ctx_hs_9"), false);
  });

  const intel: DocIntel[] = [
    {
      id: "ci_1",
      type: "runway",
      headline: "Runway",
      category: "finance",
      highlight: "8 months",
    },
    {
      id: "ci_2",
      type: "arr_usd",
      headline: "ARR",
      category: "growth",
      highlight: "$1.2M",
    },
  ];

  it("links a tagged intelligence type to its document insight", () => {
    const links = matchIntelligenceLink("runway", intel);
    assert.equal(links.length, 1);
    assert.equal(links[0]?.intelligenceId, "ci_1");
    assert.equal(links[0]?.role, "baseline");
  });

  it("matches by category when type differs", () => {
    const links = matchIntelligenceLink("growth", intel);
    assert.equal(links[0]?.intelligenceId, "ci_2");
  });

  it("returns no link when tag is null or unmatched", () => {
    assert.equal(matchIntelligenceLink(null, intel).length, 0);
    assert.equal(matchIntelligenceLink("nonexistent_signal", intel).length, 0);
  });

  it("links every unique related intelligence item", () => {
    const links = matchIntelligenceLinks(["runway", "arr_usd"], intel);
    assert.equal(links.length, 2);
    assert.deepEqual(
      links.map((l) => l.intelligenceId).sort(),
      ["ci_1", "ci_2"],
    );
  });

  it("de-dupes when multiple tags hit the same item", () => {
    const links = matchIntelligenceLinks(["runway", "finance", "Runway"], intel);
    assert.equal(links.length, 1);
    assert.equal(links[0]?.intelligenceId, "ci_1");
  });

  it("drops generated intelligence that no initiative tagged", () => {
    const tagged = matchIntelligenceLinks("runway", intel);
    const persistIds = taggedGeneratedIntelligenceIds(
      ["ci_1", "ci_2", "ci_3"],
      [tagged, []],
    );
    assert.equal(persistIds.has("ci_1"), true);
    assert.equal(persistIds.has("ci_2"), false);
    assert.equal(persistIds.has("ci_3"), false);
  });

  it("prefers tagged_intelligence_types over the singular field", () => {
    assert.deepEqual(
      taggedTypesFromInitiative({
        tagged_intelligence_types: ["runway", "arr_usd"],
        tagged_intelligence_type: "growth",
      }),
      ["runway", "arr_usd"],
    );
    assert.equal(
      taggedTypesFromInitiative({ tagged_intelligence_type: "runway" }),
      "runway",
    );
  });

  it("resolves taggedLinks per initiative and omits untagged generated intel", () => {
    const resolved = resolveTaggedIntelligenceLinks({
      initiatives: [
        { tagged_intelligence_types: ["runway"] },
        { tagged_intelligence_type: null, tagged_intelligence_types: [] },
      ],
      matchPool: intel,
      generatedIds: ["ci_1", "ci_2"],
    });
    assert.equal(resolved.linksByInitiative[0]?.length, 1);
    assert.equal(resolved.linksByInitiative[0]?.[0]?.intelligenceId, "ci_1");
    assert.equal(resolved.linksByInitiative[1]?.length, 0);
    assert.equal(resolved.persistIds.has("ci_1"), true);
    assert.equal(resolved.persistIds.has("ci_2"), false);
  });
});
