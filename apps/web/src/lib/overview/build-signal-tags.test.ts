import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAdvisorSignalTags, urgencyFromScore } from "./build-signal-tags";

describe("buildAdvisorSignalTags", () => {
  it("maps score tiers to urgency and suffixes", () => {
    const tags = buildAdvisorSignalTags([
      { categoryId: "dev", score: 72, intelligenceCount: 0, weaknessCount: 0 },
      { categoryId: "mkt", score: 48, intelligenceCount: 2, weaknessCount: 1 },
      { categoryId: "rev", score: 20, intelligenceCount: 3, weaknessCount: 2 },
    ]);
    assert.equal(tags.length, 3);
    assert.deepEqual(tags[0], {
      category_id: "dev",
      label: "R&D",
      urgency: "stable",
      suffix: "Stable",
      risk_count: 0,
    });
    assert.deepEqual(tags[1], {
      category_id: "mkt",
      label: "GTM",
      urgency: "watch",
      suffix: "Watch",
      risk_count: 0,
    });
    assert.deepEqual(tags[2], {
      category_id: "rev",
      label: "G&A",
      urgency: "urgent",
      suffix: "3 new risks",
      risk_count: 3,
    });
  });

  it("urgencyFromScore matches overview score tiers", () => {
    assert.equal(urgencyFromScore(65), "stable");
    assert.equal(urgencyFromScore(35), "watch");
    assert.equal(urgencyFromScore(34), "urgent");
  });
});
