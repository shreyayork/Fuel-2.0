import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodePlusAddressedQueryParam, normalizeUsageUserFilter } from "./usage-user-filter";

describe("decodePlusAddressedQueryParam", () => {
  it("restores plus after space decode and percent-decode", () => {
    assert.equal(
      decodePlusAddressedQueryParam("harmish.s c@york.ie"),
      "harmish.s+c@york.ie",
    );
    assert.equal(
      decodePlusAddressedQueryParam("harmish.s%2Bc%40york.ie"),
      "harmish.s+c@york.ie",
    );
  });
});

describe("normalizeUsageUserFilter", () => {
  it("maps empty / all to all", () => {
    assert.equal(normalizeUsageUserFilter(null), "all");
    assert.equal(normalizeUsageUserFilter(undefined), "all");
    assert.equal(normalizeUsageUserFilter(""), "all");
    assert.equal(normalizeUsageUserFilter("all"), "all");
    assert.equal(normalizeUsageUserFilter("  all  "), "all");
  });

  it("restores plus-addressing after form-urlencoded + → space decode", () => {
    assert.equal(
      normalizeUsageUserFilter("harmish.s c@york.ie"),
      "harmish.s+c@york.ie",
    );
  });

  it("preserves an intact plus-addressed email and lowercases", () => {
    assert.equal(
      normalizeUsageUserFilter("Harmish.S+C@York.IE"),
      "harmish.s+c@york.ie",
    );
  });

  it("decodes a percent-encoded email (double-encode client path)", () => {
    assert.equal(
      normalizeUsageUserFilter("harmish.s%2Bc%40york.ie"),
      "harmish.s+c@york.ie",
    );
  });

  it("leaves ordinary emails unchanged aside from case", () => {
    assert.equal(
      normalizeUsageUserFilter("Soumya.M@york.ie"),
      "soumya.m@york.ie",
    );
  });
});
