import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { JWTPayload } from "jose";
import {
  canChangePassword,
  isGoogleOnlyAuthSession,
} from "./federated-auth";
import type { FuelSession } from "./verify";

function session(raw: JWTPayload): FuelSession {
  return {
    sub: "sub-1",
    email: "user@example.com",
    raw,
  };
}

describe("isGoogleOnlyAuthSession", () => {
  it("returns false for null/missing session (safe default)", () => {
    assert.equal(isGoogleOnlyAuthSession(null), false);
    assert.equal(isGoogleOnlyAuthSession(undefined), false);
    assert.equal(canChangePassword(null), true);
  });

  it("returns false for native Cognito users with no identities", () => {
    assert.equal(isGoogleOnlyAuthSession(session({ email: "a@b.com" })), false);
    assert.equal(canChangePassword(session({ email: "a@b.com" })), true);
  });

  it("detects Google identities JSON string", () => {
    const s = session({
      identities: JSON.stringify([
        { userId: "123", providerName: "Google", providerType: "Google" },
      ]),
    });
    assert.equal(isGoogleOnlyAuthSession(s), true);
    assert.equal(canChangePassword(s), false);
  });

  it("detects Google identities array claim", () => {
    const s = session({
      identities: [{ providerName: "Google" }],
    });
    assert.equal(isGoogleOnlyAuthSession(s), true);
  });

  it("falls back to cognito:username Google_ prefix", () => {
    const s = session({ "cognito:username": "Google_108234" });
    assert.equal(isGoogleOnlyAuthSession(s), true);
  });

  it("keeps password UI when Google is linked with Cognito", () => {
    const s = session({
      identities: JSON.stringify([
        { providerName: "Google" },
        { providerName: "Cognito" },
      ]),
    });
    assert.equal(isGoogleOnlyAuthSession(s), false);
    assert.equal(canChangePassword(s), true);
  });

  it("returns false for unrecognized / empty identities (safe default)", () => {
    assert.equal(isGoogleOnlyAuthSession(session({ identities: "not-json" })), false);
    assert.equal(isGoogleOnlyAuthSession(session({ identities: [] })), false);
    assert.equal(
      isGoogleOnlyAuthSession(session({ identities: [{ providerName: "Facebook" }] })),
      false,
    );
  });
});
