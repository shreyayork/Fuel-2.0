import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkPasswordRequirements,
  isPasswordStrong,
  PASSWORD_MIN_LENGTH,
  passwordsMatch,
  passwordStrength,
} from "./password-policy";

describe("password-policy", () => {
  it("requires min length, mixed case, digit, and symbol", () => {
    const weak = checkPasswordRequirements("short");
    assert.equal(weak.length, false);
    assert.equal(weak.case, false);
    assert.equal(weak.digitSymbol, false);
    assert.equal(isPasswordStrong("short"), false);

    const almost = checkPasswordRequirements("AlmostThere1");
    assert.equal(almost.length, true);
    assert.equal(almost.case, true);
    assert.equal(almost.digitSymbol, false);

    const strong = "Y0rkIe#2026_new";
    assert.equal(isPasswordStrong(strong), true);
    const ok = checkPasswordRequirements(strong);
    assert.equal(ok.length, true);
    assert.equal(ok.case, true);
    assert.equal(ok.digitSymbol, true);
  });

  it("rejects passwords shorter than Cognito min length", () => {
    const pwd = "Ab1!" + "x".repeat(Math.max(0, PASSWORD_MIN_LENGTH - 5));
    assert.equal(pwd.length < PASSWORD_MIN_LENGTH, true);
    assert.equal(checkPasswordRequirements(pwd).length, false);
    assert.equal(isPasswordStrong(pwd), false);
  });

  it("maps strength level to met requirement groups", () => {
    assert.deepEqual(passwordStrength(""), { level: 0, label: "" });
    assert.equal(passwordStrength("aaaa").level, 1);
    assert.equal(passwordStrength("aaaaaaaaaaaa").level, 1); // length only
    assert.equal(passwordStrength("AaaAaaaaaaaA").level, 2); // length + case
    assert.equal(passwordStrength("Y0rkIe#2026_new").level, 3);
    assert.equal(passwordStrength("Y0rkIe#2026_new").label, "Strong & secure");
  });

  it("detects password mismatch", () => {
    assert.equal(passwordsMatch("", ""), false);
    assert.equal(passwordsMatch("abc", "abd"), false);
    assert.equal(passwordsMatch("Y0rkIe#2026_new", "Y0rkIe#2026_new"), true);
  });
});
