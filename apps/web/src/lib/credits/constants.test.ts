import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAnnualSavingsLabel } from "./constants";

describe("formatAnnualSavingsLabel", () => {
  it("formats exact 2 months free for default catalog ($30 / $300)", () => {
    assert.equal(formatAnnualSavingsLabel(30, 300), "2 months free");
  });

  it("formats exact 1 month free", () => {
    assert.equal(formatAnnualSavingsLabel(30, 330), "1 month free");
  });

  it("formats fractional months with one decimal", () => {
    assert.equal(formatAnnualSavingsLabel(30, 315), "1.5 months free");
  });

  it("returns null when savings are zero", () => {
    assert.equal(formatAnnualSavingsLabel(30, 360), null);
  });

  it("returns null when savings are negative", () => {
    assert.equal(formatAnnualSavingsLabel(30, 400), null);
  });

  it("returns null when monthly price is 0", () => {
    assert.equal(formatAnnualSavingsLabel(0, 300), null);
  });
});
