import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ONBOARD_UNKNOWN_ANSWER,
  partitionAnswersForModel,
} from "./unknown-answer";

describe("partitionAnswersForModel", () => {
  it("keeps known answers and lists explicit unknown ids", () => {
    const { known, unknownIds } = partitionAnswersForModel({
      mkt_sales_motion: "Sales-led",
      dev_engineering_size: ONBOARD_UNKNOWN_ANSWER,
      rev_runway: "Over 18 months",
      dev_ai_role: `  ${ONBOARD_UNKNOWN_ANSWER}  `,
      empty: "",
      missing: null,
    });

    assert.deepEqual(known, {
      mkt_sales_motion: "Sales-led",
      rev_runway: "Over 18 months",
    });
    assert.deepEqual(unknownIds, ["dev_ai_role", "dev_engineering_size"]);
  });

  it("returns empty collections when nothing is known or unknown", () => {
    const { known, unknownIds } = partitionAnswersForModel({
      a: "",
      b: null,
      c: undefined,
    });
    assert.deepEqual(known, {});
    assert.deepEqual(unknownIds, []);
  });
});
