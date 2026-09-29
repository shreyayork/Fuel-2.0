import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksLikePitchDeckClarification,
  pitchDeckIdsFromSnapshot,
  buildExtractDeckPromptBlock,
} from "./pitch-deck-evaluation";
import type { DataRoomSnapshot } from "@/lib/data-room/types";

describe("pitch-deck-evaluation helpers", () => {
  it("extracts pitch deck contextItemId from snapshot", () => {
    const snapshot = {
      slots: [
        {
          typeId: "pitch_deck",
          typeLabel: "Pitch deck",
          current: {
            id: "drv_1",
            name: "deck.pdf",
            typeId: "pitch_deck",
            typeLabel: "Pitch deck",
            format: "PDF",
            uploadedAt: "today",
            uploadedAtMs: 1,
            source: "data_room",
            intelligenceCount: 0,
            contextItemId: "ctx_abc",
            observationIds: [],
            downloadPath: "/x",
          },
          history: [],
        },
      ],
      activeCount: 1,
      sourcesTotal: 1,
      feedAttachments: [],
    } satisfies DataRoomSnapshot;

    assert.deepEqual(pitchDeckIdsFromSnapshot(snapshot), {
      contextItemId: "ctx_abc",
    });
  });

  it("returns null when pitch deck slot is empty", () => {
    const snapshot = {
      slots: [
        {
          typeId: "pitch_deck",
          typeLabel: "Pitch deck",
          current: null,
          history: [],
        },
      ],
      activeCount: 0,
      sourcesTotal: 0,
      feedAttachments: [],
    } satisfies DataRoomSnapshot;
    assert.equal(pitchDeckIdsFromSnapshot(snapshot), null);
  });

  it("builds extractPdfText prompt block", () => {
    const withAttachment = buildExtractDeckPromptBlock({
      contextItemId: "ctx_1",
      attachmentId: "att_1",
    });
    assert.match(withAttachment, /contextItemId: "ctx_1"/);
    assert.match(withAttachment, /attachmentId: "att_1"/);

    const without = buildExtractDeckPromptBlock({ contextItemId: "ctx_2" });
    assert.match(without, /contextItemId: "ctx_2"/);
    assert.doesNotMatch(without, /attachmentId/);
  });

  it("detects clarification-style missing-deck replies", () => {
    assert.equal(
      looksLikePitchDeckClarification(
        "I don't have a contextItemId or attachmentId to extract the pitch deck from — those are required and weren't included with this run request.",
      ),
      true,
    );
    assert.equal(
      looksLikePitchDeckClarification(
        "# Pitch Deck Evaluation\n\n## Scorecard\n| Section | Score |\n",
      ),
      false,
    );
  });
});
