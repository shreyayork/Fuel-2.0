import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORGOT_PASSWORD_COPY,
  performForgotPassword,
  type ForgotPasswordDeps,
} from "./forgot-password";

function deps(overrides: Partial<ForgotPasswordDeps> = {}): ForgotPasswordDeps {
  return {
    userExists: async () => ({ ok: true, exists: true }),
    forgotPassword: async () => ({
      ok: true,
      codeDeliveryDestination: "u***@example.com",
    }),
    ...overrides,
  };
}

describe("performForgotPassword", () => {
  it("rejects invalid email input", async () => {
    const res = await performForgotPassword({ email: "not-an-email" }, deps());
    assert.deepEqual(res, { ok: false, reason: "invalid_input" });
  });

  it("rejects unregistered emails before calling Cognito forgot-password", async () => {
    let forgotCalled = false;
    const res = await performForgotPassword(
      { email: "ghost@example.com" },
      deps({
        userExists: async (email) => {
          assert.equal(email, "ghost@example.com");
          return { ok: true, exists: false };
        },
        forgotPassword: async () => {
          forgotCalled = true;
          return { ok: true };
        },
      }),
    );
    assert.deepEqual(res, { ok: false, reason: "user_not_found" });
    assert.equal(forgotCalled, false);
  });

  it("sends a reset code for registered emails", async () => {
    const res = await performForgotPassword(
      { email: "User@Example.com" },
      deps({
        userExists: async (email) => {
          assert.equal(email, "user@example.com");
          return { ok: true, exists: true };
        },
        forgotPassword: async (email) => {
          assert.equal(email, "user@example.com");
          return { ok: true, codeDeliveryDestination: "u***@example.com" };
        },
      }),
    );
    assert.deepEqual(res, {
      ok: true,
      codeDeliveryDestination: "u***@example.com",
    });
  });

  it("skips existence check when the user pool is not configured", async () => {
    let forgotCalled = false;
    const res = await performForgotPassword(
      { email: "user@example.com" },
      deps({
        userExists: async () => ({ ok: false, reason: "unconfigured" }),
        forgotPassword: async () => {
          forgotCalled = true;
          return { ok: true };
        },
      }),
    );
    assert.equal(res.ok, true);
    assert.equal(forgotCalled, true);
  });

  it("maps Cognito rate limits without soft-success masking", async () => {
    const res = await performForgotPassword(
      { email: "user@example.com" },
      deps({
        forgotPassword: async () => ({ ok: false, reason: "rate_limited" }),
      }),
    );
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "rate_limited");
  });

  it("surfaces user-not-found copy for the UI", () => {
    assert.match(FORGOT_PASSWORD_COPY.userNotFound, /don't have an account/i);
  });
});
