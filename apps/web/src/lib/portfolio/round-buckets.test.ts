import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupByLatestRoundBucket,
  pickLatestRoundBucket,
  toRoundBucket,
} from "./round-buckets";

describe("toRoundBucket", () => {
  it("maps common aliases", () => {
    assert.equal(toRoundBucket("pre_seed"), "Pre-seed");
    assert.equal(toRoundBucket("Seed+"), "Seed");
    assert.equal(toRoundBucket("Series A-1"), "Series A");
    assert.equal(toRoundBucket("series_b"), "Series B");
    assert.equal(toRoundBucket("Series C+"), "Growth");
    assert.equal(toRoundBucket("series_d"), "Growth");
    assert.equal(toRoundBucket("growth equity"), "Growth");
    assert.equal(toRoundBucket("IPO"), "Growth");
  });

  it("returns null for unknown / empty", () => {
    assert.equal(toRoundBucket(""), null);
    assert.equal(toRoundBucket(null), null);
    assert.equal(toRoundBucket("convertible note"), null);
  });
});

describe("pickLatestRoundBucket", () => {
  it("picks newest announced round with a usable type", () => {
    const bucket = pickLatestRoundBucket([
      { type: "Seed", announcedOn: "2020-01-01" },
      { type: "Series B", announcedOn: "2023-06-01" },
      { type: "Series A", announcedOn: "2021-03-01" },
    ]);
    assert.equal(bucket, "Series B");
  });

  it("skips unknown types when choosing latest", () => {
    const bucket = pickLatestRoundBucket([
      { type: "debt", announcedOn: "2024-01-01" },
      { type: "Seed", announcedOn: "2022-01-01" },
    ]);
    assert.equal(bucket, "Seed");
  });

  it("returns null when no usable rounds", () => {
    assert.equal(pickLatestRoundBucket([]), null);
    assert.equal(
      pickLatestRoundBucket([{ type: "grant", announcedOn: "2024-01-01" }]),
      null,
    );
  });
});

describe("groupByLatestRoundBucket", () => {
  it("omits empty buckets and parks unknown separately", () => {
    const { byBucket, unbucketed } = groupByLatestRoundBucket([
      { id: "1", latestRound: "Seed" as const },
      { id: "2", latestRound: "Seed" as const },
      { id: "3", latestRound: "Series A" as const },
      { id: "4", latestRound: null },
    ]);
    assert.equal(byBucket.get("Seed")?.length, 2);
    assert.equal(byBucket.get("Series A")?.length, 1);
    assert.equal(byBucket.has("Series B"), false);
    assert.equal(unbucketed.length, 1);
  });
});
