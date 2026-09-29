import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidEmail } from "./is-valid-email";

describe("isValidEmail", () => {
  it("accepts syntactically valid emails", () => {
    assert.equal(isValidEmail("john@example.com"), true);
    assert.equal(isValidEmail("jane.doe@company.co.uk"), true);
    assert.equal(isValidEmail("  mike@york.ie  "), true);
  });

  it("rejects free text and malformed addresses", () => {
    assert.equal(isValidEmail("john"), false);
    assert.equal(isValidEmail("testing"), false);
    assert.equal(isValidEmail("hello world"), false);
    assert.equal(isValidEmail("abc@"), false);
    assert.equal(isValidEmail("@gmail.com"), false);
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("   "), false);
  });
});
