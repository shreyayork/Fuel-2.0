import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHANGE_PASSWORD_COPY,
  fieldErrorsForReason,
  isSameAsPreviousPasswordMessage,
  performPasswordChange,
  type ChangePasswordDeps,
} from "./change-password";

const CURRENT = "Y0rkIe#2026_old";
const NEXT = "Y0rkIe#2026_new";

function deps(overrides: Partial<ChangePasswordDeps> = {}): ChangePasswordDeps {
  return {
    resolveEmail: async () => "user@york.ie",
    signIn: async () => ({ ok: true, tokens: { AccessToken: "at-123" } }),
    changePassword: async () => ({ ok: true }),
    ...overrides,
  };
}

const validInput = {
  currentPassword: CURRENT,
  newPassword: NEXT,
  confirmPassword: NEXT,
};

describe("performPasswordChange", () => {
  it("changes the password for an authenticated user", async () => {
    const seen: Record<string, unknown> = {};
    const res = await performPasswordChange(
      validInput,
      deps({
        signIn: async (opts) => {
          seen.signInEmail = opts.email;
          seen.signInPassword = opts.password;
          return { ok: true, tokens: { AccessToken: "at-123" } };
        },
        changePassword: async (opts) => {
          seen.accessToken = opts.accessToken;
          seen.previous = opts.previousPassword;
          seen.proposed = opts.proposedPassword;
          return { ok: true };
        },
      }),
    );
    assert.deepEqual(res, { ok: true });
    // Identity comes from the session, not the client payload.
    assert.equal(seen.signInEmail, "user@york.ie");
    assert.equal(seen.signInPassword, CURRENT);
    assert.equal(seen.accessToken, "at-123");
    assert.equal(seen.previous, CURRENT);
    assert.equal(seen.proposed, NEXT);
  });

  it("reports session_expired only when identity cannot be resolved", async () => {
    const res = await performPasswordChange(
      validInput,
      deps({ resolveEmail: async () => null }),
    );
    assert.deepEqual(res, { ok: false, reason: "session_expired" });
  });

  it("maps a wrong current password to invalid_credentials", async () => {
    for (const reason of [
      "invalid_credentials",
      "user_not_found",
      "user_not_confirmed",
    ] as const) {
      const res = await performPasswordChange(
        validInput,
        deps({ signIn: async () => ({ ok: false, reason }) }),
      );
      assert.deepEqual(res, { ok: false, reason: "invalid_credentials" });
    }
  });

  it("does not mask Cognito failures as session_expired", async () => {
    const rateLimited = await performPasswordChange(
      validInput,
      deps({ signIn: async () => ({ ok: false, reason: "rate_limited" }) }),
    );
    assert.deepEqual(rateLimited, { ok: false, reason: "rate_limited" });

    const broken = await performPasswordChange(
      validInput,
      deps({
        signIn: async () => ({
          ok: false,
          reason: "unknown",
          message: "boom",
        }),
      }),
    );
    assert.equal(broken.ok, false);
    assert.equal(broken.ok === false && broken.reason, "unknown");

    const unconfigured = await performPasswordChange(
      validInput,
      deps({
        signIn: async () => ({
          ok: false,
          reason: "unknown",
          message: "COGNITO_USER_POOL_CLIENT_ID not configured",
        }),
      }),
    );
    assert.equal(unconfigured.ok === false && unconfigured.reason, "unavailable");
  });

  it("surfaces Cognito policy rejection of the new password", async () => {
    const res = await performPasswordChange(
      validInput,
      deps({
        changePassword: async () => ({
          ok: false,
          reason: "invalid_password",
          message: "policy",
        }),
      }),
    );
    assert.equal(res.ok === false && res.reason, "invalid_password");
  });

  it("rejects mismatched confirmation before touching Cognito", async () => {
    let called = false;
    const res = await performPasswordChange(
      { ...validInput, confirmPassword: "Y0rkIe#2026_other" },
      deps({
        signIn: async () => {
          called = true;
          return { ok: true, tokens: { AccessToken: "at-123" } };
        },
      }),
    );
    assert.deepEqual(res, { ok: false, reason: "mismatch" });
    assert.equal(called, false);
  });

  it("rejects weak new passwords before Cognito", async () => {
    const weak = await performPasswordChange(
      { currentPassword: CURRENT, newPassword: "weakpass", confirmPassword: "weakpass" },
      deps(),
    );
    assert.deepEqual(weak, { ok: false, reason: "weak_password" });

    const noSymbol = "Abcdefghij123";
    const policy = await performPasswordChange(
      { currentPassword: CURRENT, newPassword: noSymbol, confirmPassword: noSymbol },
      deps(),
    );
    assert.deepEqual(policy, { ok: false, reason: "weak_password" });
  });

  it("maps Cognito same-as-previous rejection to reused_password", async () => {
    const res = await performPasswordChange(
      { currentPassword: CURRENT, newPassword: CURRENT, confirmPassword: CURRENT },
      deps({
        changePassword: async () => ({
          ok: false,
          reason: "invalid_password",
          message: "Proposed password cannot be the same as previous password.",
        }),
      }),
    );
    assert.deepEqual(res, { ok: false, reason: "reused_password" });
  });

  it("detects Cognito same-password messages", () => {
    assert.equal(
      isSameAsPreviousPasswordMessage(
        "Proposed password cannot be the same as previous password.",
      ),
      true,
    );
    assert.equal(isSameAsPreviousPasswordMessage("Password does not conform"), false);
  });

  it("rejects empty required fields", async () => {
    const emptyCurrent = await performPasswordChange(
      { currentPassword: "", newPassword: NEXT, confirmPassword: NEXT },
      deps(),
    );
    assert.deepEqual(emptyCurrent, { ok: false, reason: "invalid_input" });

    const emptyNew = await performPasswordChange(
      { currentPassword: CURRENT, newPassword: "", confirmPassword: NEXT },
      deps(),
    );
    assert.equal(emptyNew.ok === false && emptyNew.reason, "weak_password");

    const emptyConfirm = await performPasswordChange(
      { currentPassword: CURRENT, newPassword: NEXT, confirmPassword: "" },
      deps(),
    );
    assert.deepEqual(emptyConfirm, { ok: false, reason: "invalid_input" });
  });

  it("rejects malformed payloads", async () => {
    const res = await performPasswordChange({ currentPassword: "" }, deps());
    assert.deepEqual(res, { ok: false, reason: "invalid_input" });
  });

  it("maps field-specific reasons to inline copy", () => {
    assert.deepEqual(fieldErrorsForReason("invalid_credentials"), {
      current: CHANGE_PASSWORD_COPY.currentIncorrect,
    });
    assert.deepEqual(fieldErrorsForReason("mismatch"), {
      confirm: CHANGE_PASSWORD_COPY.mismatch,
    });
    assert.deepEqual(fieldErrorsForReason("reused_password"), {
      new: CHANGE_PASSWORD_COPY.reused,
    });
    assert.equal(fieldErrorsForReason("session_expired"), null);
    assert.equal(fieldErrorsForReason("unknown"), null);
  });

  it("fails cleanly when Cognito returns no access token", async () => {
    const res = await performPasswordChange(
      validInput,
      deps({ signIn: async () => ({ ok: true, tokens: {} }) }),
    );
    assert.deepEqual(res, { ok: false, reason: "unknown" });
  });
});
