import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findDuplicateDocumentTitle,
  findDuplicateDocumentType,
  normalizeDocumentTypeLabel,
  slugifyDocumentLabel,
} from "./format";

describe("normalizeDocumentTypeLabel", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    assert.equal(normalizeDocumentTypeLabel("  Pitch   Deck  "), "pitch deck");
  });
});

describe("findDuplicateDocumentType", () => {
  it("flags case/whitespace variants of predefined types", () => {
    const hit = findDuplicateDocumentType("Pitch Deck");
    assert.ok(hit);
    assert.equal(hit?.typeId, "pitch_deck");
    assert.equal(hit?.typeLabel, "Pitch deck");
  });

  it("flags slug collisions with predefined ids", () => {
    const hit = findDuplicateDocumentType("due-diligence");
    assert.ok(hit);
    assert.equal(hit?.typeId, "due_diligence");
  });

  it("allows a unique custom label", () => {
    assert.equal(findDuplicateDocumentType("Legal opinion"), null);
  });

  it("allows re-upload to the same custom slot", () => {
    const slots = [
      { typeId: "custom:legal-opinion", typeLabel: "Legal opinion" },
    ];
    assert.equal(findDuplicateDocumentType("Legal Opinion", slots), null);
    assert.equal(
      `custom:${slugifyDocumentLabel("Legal Opinion")}`,
      "custom:legal-opinion",
    );
  });

  it("flags a custom label that matches a different on-file slot", () => {
    const slots = [
      { typeId: "custom:legacy-side", typeLabel: "Side letter" },
    ];
    const hit = findDuplicateDocumentType("  side   letter ", slots);
    assert.ok(hit);
    assert.equal(hit?.typeId, "custom:legacy-side");
  });
});

describe("findDuplicateDocumentTitle", () => {
  it("flags case/whitespace variants of on-file document names", () => {
    const slots = [
      {
        typeId: "pitch_deck",
        typeLabel: "Pitch deck",
        current: {
          id: "drv_1",
          name: "Q3 enterprise pipeline risk",
          typeId: "pitch_deck",
          typeLabel: "Pitch deck",
          format: "PDF",
          uploadedAt: "now",
          uploadedAtMs: 1,
          source: "data_room",
          intelligenceCount: 0,
          contextItemId: null,
          observationIds: [],
          downloadPath: "/x",
        },
        history: [],
      },
    ];
    assert.equal(
      findDuplicateDocumentTitle("  q3   ENTERPRISE pipeline risk ", slots),
      "Q3 enterprise pipeline risk",
    );
    assert.equal(findDuplicateDocumentTitle("Brand new title", slots), null);
  });
});
