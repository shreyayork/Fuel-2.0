import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampTooltipAnchorPct,
  cohortValueForBucket,
  resolveTrackHoverTooltip,
  trackHoverBody,
  trackHoverBucket,
  trackHoverTitle,
} from "./benchmark-track-tooltip";

const COHORT = { p25: 10, p50: 20, p75: 30, p90: 40 };

describe("trackHoverBucket", () => {
  it("snaps to nearest of 25/50/75/90", () => {
    assert.deepEqual(trackHoverBucket(10), { bucket: "p25", anchorPct: 25 });
    assert.deepEqual(trackHoverBucket(30), { bucket: "p25", anchorPct: 25 });
    assert.deepEqual(trackHoverBucket(40), { bucket: "p50", anchorPct: 50 });
    assert.deepEqual(trackHoverBucket(60), { bucket: "p50", anchorPct: 50 });
    assert.deepEqual(trackHoverBucket(70), { bucket: "p75", anchorPct: 75 });
    assert.deepEqual(trackHoverBucket(85), { bucket: "p90", anchorPct: 90 });
  });

  it("prefers higher bucket on exact midpoints", () => {
    // Midpoint 25↔50
    assert.deepEqual(trackHoverBucket(37.5), { bucket: "p50", anchorPct: 50 });
    // Midpoint 50↔75
    assert.deepEqual(trackHoverBucket(62.5), { bucket: "p75", anchorPct: 75 });
    // Midpoint 75↔90
    assert.deepEqual(trackHoverBucket(82.5), { bucket: "p90", anchorPct: 90 });
  });

  it("uses Above p90 when raw ≥ 96 and anchors at raw", () => {
    assert.deepEqual(trackHoverBucket(96), { bucket: "above", anchorPct: 96 });
    assert.deepEqual(trackHoverBucket(99), { bucket: "above", anchorPct: 99 });
    assert.deepEqual(trackHoverBucket(100), {
      bucket: "above",
      anchorPct: 100,
    });
  });

  it("clamps raw into 0–100 before snap", () => {
    assert.deepEqual(trackHoverBucket(-5), { bucket: "p25", anchorPct: 25 });
    assert.deepEqual(trackHoverBucket(200), {
      bucket: "above",
      anchorPct: 100,
    });
  });
});

describe("clampTooltipAnchorPct", () => {
  it("clamps to 12–88", () => {
    assert.equal(clampTooltipAnchorPct(0), 12);
    assert.equal(clampTooltipAnchorPct(12), 12);
    assert.equal(clampTooltipAnchorPct(50), 50);
    assert.equal(clampTooltipAnchorPct(88), 88);
    assert.equal(clampTooltipAnchorPct(100), 88);
  });
});

describe("cohortValueForBucket", () => {
  it("maps buckets to cohort values; above uses p90", () => {
    assert.equal(cohortValueForBucket("p25", COHORT), 10);
    assert.equal(cohortValueForBucket("p50", COHORT), 20);
    assert.equal(cohortValueForBucket("p75", COHORT), 30);
    assert.equal(cohortValueForBucket("p90", COHORT), 40);
    assert.equal(cohortValueForBucket("above", COHORT), 40);
  });

  it("returns null for non-finite cohort values", () => {
    assert.equal(
      cohortValueForBucket("p50", { ...COHORT, p50: Number.NaN }),
      null,
    );
  });
});

describe("trackHover copy", () => {
  it("uses ticket titles", () => {
    assert.equal(trackHoverTitle("p25"), "p25");
    assert.equal(trackHoverTitle("p50"), "p50 · median");
    assert.equal(trackHoverTitle("p75"), "p75");
    assert.equal(trackHoverTitle("p90"), "p90");
    assert.equal(trackHoverTitle("above"), "Above p90");
  });

  it("branches body on lowerIsBetter", () => {
    const higher = trackHoverBody("p90", "$40", false);
    const lower = trackHoverBody("p90", "$40", true);
    assert.match(higher, /strongest 10%/);
    assert.match(lower, /heaviest 10%/);
    assert.match(higher, /^\$40 —/);
    assert.match(lower, /^\$40 —/);
  });

  it("uses above-p90 body templates with p90 value", () => {
    assert.match(
      trackHoverBody("above", "$40", false),
      /sits past the top of this peer set — stronger/,
    );
    assert.match(
      trackHoverBody("above", "$40", true),
      /lower is better — almost every peer is lighter/,
    );
  });
});

describe("resolveTrackHoverTooltip", () => {
  it("returns null when cohort value missing", () => {
    const tip = resolveTrackHoverTooltip({
      rawPct: 50,
      cohort: { ...COHORT, p50: Number.NaN },
      lowerIsBetter: false,
      formatValue: (v) => `$${v}`,
    });
    assert.equal(tip, null);
  });

  it("builds full tooltip with clamp for edges", () => {
    const tip = resolveTrackHoverTooltip({
      rawPct: 5,
      cohort: COHORT,
      lowerIsBetter: false,
      formatValue: (v) => `$${v}`,
    });
    assert.ok(tip);
    assert.equal(tip!.bucket, "p25");
    assert.equal(tip!.title, "p25");
    assert.equal(tip!.indicatorPct, 25);
    assert.equal(tip!.tooltipLeftPct, 25);
    assert.match(tip!.body, /^\$10 —/);
  });

  it("anchors above-p90 at raw and clamps tooltip left", () => {
    const tip = resolveTrackHoverTooltip({
      rawPct: 99,
      cohort: COHORT,
      lowerIsBetter: true,
      formatValue: (v) => `$${v}`,
    });
    assert.ok(tip);
    assert.equal(tip!.bucket, "above");
    assert.equal(tip!.indicatorPct, 99);
    assert.equal(tip!.tooltipLeftPct, 88);
    assert.match(tip!.body, /^\$40 /);
    assert.match(tip!.body, /lighter/);
  });
});
