import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickOverviewCohortKey } from "./cohort-pick";

describe("pickOverviewCohortKey", () => {
  const valid = ["b2b_saas:seed:us", "b2b_saas:series_a:us", "fintech:seed:us"];

  it("prefers a valid override over saved and inferred", () => {
    assert.equal(
      pickOverviewCohortKey({
        override: "fintech:seed:us",
        saved: "b2b_saas:seed:us",
        inferred: "b2b_saas:series_a:us",
        validKeys: valid,
      }),
      "fintech:seed:us",
    );
  });

  it("uses saved when override missing or invalid", () => {
    assert.equal(
      pickOverviewCohortKey({
        override: "deleted:cohort",
        saved: "b2b_saas:seed:us",
        inferred: "b2b_saas:series_a:us",
        validKeys: valid,
      }),
      "b2b_saas:seed:us",
    );
    assert.equal(
      pickOverviewCohortKey({
        override: null,
        saved: "b2b_saas:seed:us",
        inferred: "b2b_saas:series_a:us",
        validKeys: valid,
      }),
      "b2b_saas:seed:us",
    );
  });

  it("falls back to inferred when override and saved are invalid", () => {
    assert.equal(
      pickOverviewCohortKey({
        override: "gone",
        saved: "also-gone",
        inferred: "b2b_saas:series_a:us",
        validKeys: valid,
      }),
      "b2b_saas:series_a:us",
    );
  });

  it("trims keys before matching", () => {
    assert.equal(
      pickOverviewCohortKey({
        override: "  fintech:seed:us  ",
        saved: null,
        inferred: "b2b_saas:seed:us",
        validKeys: valid,
      }),
      "fintech:seed:us",
    );
  });
});
