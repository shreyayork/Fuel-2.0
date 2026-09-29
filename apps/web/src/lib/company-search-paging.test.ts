import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampSearchLimit, clampSearchOffset } from "./company-search-paging";

describe("clampSearchLimit", () => {
  it("defaults to 10", () => {
    assert.equal(clampSearchLimit(undefined), 10);
  });

  it("clamps to 1–50", () => {
    assert.equal(clampSearchLimit(0), 1);
    assert.equal(clampSearchLimit(-5), 1);
    assert.equal(clampSearchLimit(1), 1);
    assert.equal(clampSearchLimit(50), 50);
    assert.equal(clampSearchLimit(51), 50);
    assert.equal(clampSearchLimit(999), 50);
  });
});

describe("clampSearchOffset", () => {
  it("defaults to 0", () => {
    assert.equal(clampSearchOffset(undefined), 0);
  });

  it("rejects negative and non-finite values", () => {
    assert.equal(clampSearchOffset(-1), 0);
    assert.equal(clampSearchOffset(Number.NaN), 0);
    assert.equal(clampSearchOffset(Number.POSITIVE_INFINITY), 0);
    assert.equal(clampSearchOffset(Number.NEGATIVE_INFINITY), 0);
  });

  it("passes through offsets beyond the old 1000 cap", () => {
    assert.equal(clampSearchOffset(0), 0);
    assert.equal(clampSearchOffset(50), 50);
    assert.equal(clampSearchOffset(1000), 1000);
    assert.equal(clampSearchOffset(1050), 1050);
    assert.equal(clampSearchOffset(2000), 2000);
    assert.equal(clampSearchOffset(9950), 9950);
  });

  it("truncates fractional offsets", () => {
    assert.equal(clampSearchOffset(1050.9), 1050);
  });
});
