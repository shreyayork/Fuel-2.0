import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeRecipientEmails,
  parseEmailList,
  parseRecipientIdList,
  shouldSendScopedBatchOnly,
} from "@/lib/credits/coupon-emails";

describe("coupon recipient email helpers", () => {
  it("dedupes and lowercases emails", () => {
    assert.deepEqual(
      normalizeRecipientEmails([
        "Ada@York.ie",
        " ada@york.ie ",
        "bob@york.ie",
        "not-an-email",
        "",
      ]),
      ["ada@york.ie", "bob@york.ie"],
    );
  });

  it("parses mixed separators", () => {
    assert.deepEqual(
      parseEmailList("a@x.com, b@y.com;\nc@z.com  d@w.com"),
      ["a@x.com", "b@y.com", "c@z.com", "d@w.com"],
    );
  });

  it("parses recipient id lists", () => {
    assert.deepEqual(parseRecipientIdList(" cr_1 ,cr_2,, cr_3 "), [
      "cr_1",
      "cr_2",
      "cr_3",
    ]);
    assert.deepEqual(parseRecipientIdList(""), []);
  });

  it("scoped batch send never widens to campaign-wide on empty ids", () => {
    assert.equal(shouldSendScopedBatchOnly(undefined), false);
    assert.equal(shouldSendScopedBatchOnly([]), false);
    assert.equal(shouldSendScopedBatchOnly(["cr_1"]), true);
  });
});
