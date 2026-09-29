import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COGNITO_CODE_EXPIRY_HOURS,
  PASSWORD_RESET_EMAIL_HTML,
  resolveCognitoCustomMessage,
  VERIFICATION_EMAIL_HTML,
} from "../lib/cognito-email-templates";
import { EMAIL_ASSET_PATHS, EMAIL_LOGO_ALT } from "../lib/email-asset-urls";

function assertHostedLogoBranding(html: string): void {
  assert.doesNotMatch(html, /background:\s*#009E6D[^>]*border-radius:\s*4px/);
  assert.match(html, /src="https:\/\/[^"]+\/email\/york-mark-22\.png"/);
  assert.match(html, /src="https:\/\/[^"]+\/email\/york-mark-16\.png"/);
  assert.match(html, new RegExp(`alt="${EMAIL_LOGO_ALT}"`));
  assert.ok(html.includes(EMAIL_ASSET_PATHS.logoMarkLg));
  assert.doesNotMatch(html, /data:image\//);
  assert.doesNotMatch(html, /src="\/email\//);
}

describe("resolveCognitoCustomMessage", () => {
  it("keeps sign-up verification copy for CustomMessage_SignUp", () => {
    const content = resolveCognitoCustomMessage({
      triggerSource: "CustomMessage_SignUp",
      codeParameter: "{####}",
    });
    assert.ok(content);
    assert.match(content!.emailMessage, /Verify your Fuel account/);
    assert.match(content!.emailMessage, /Welcome aboard/);
    assert.match(content!.emailMessage, /sign-up screen/);
    assert.match(content!.emailMessage, /{####}/);
    assert.match(content!.emailMessage, /Secure Verification Code/);
    assert.match(content!.emailMessage, /user-select:all/);
    assert.match(content!.emailMessage, /00E5A0|#00E5A0/i);
    assert.doesNotMatch(content!.emailMessage, /password reset/i);
    assert.equal(content!.emailMessage, VERIFICATION_EMAIL_HTML);
    assertHostedLogoBranding(content!.emailMessage);
  });

  it("personalizes greeting with givenName when provided", () => {
    const content = resolveCognitoCustomMessage({
      triggerSource: "CustomMessage_SignUp",
      codeParameter: "{####}",
      givenName: "James",
    });
    assert.ok(content);
    assert.match(content!.emailMessage, /Hi James,/);
    assert.doesNotMatch(content!.emailMessage, /Hi there,/);
    assertHostedLogoBranding(content!.emailMessage);
  });

  it("keeps sign-up verification copy for CustomMessage_ResendCode", () => {
    const content = resolveCognitoCustomMessage({
      triggerSource: "CustomMessage_ResendCode",
      codeParameter: "{####}",
    });
    assert.ok(content);
    assert.equal(content!.emailMessage, VERIFICATION_EMAIL_HTML);
    assertHostedLogoBranding(content!.emailMessage);
  });

  it("uses password-reset copy for CustomMessage_ForgotPassword", () => {
    const content = resolveCognitoCustomMessage({
      triggerSource: "CustomMessage_ForgotPassword",
      codeParameter: "{####}",
    });
    assert.ok(content);
    assert.match(content!.emailMessage, /Reset your Fuel password/);
    assert.match(
      content!.emailMessage,
      /Copy the OTP mentioned below/,
    );
    assert.match(content!.emailMessage, /{####}/);
    assert.match(content!.emailMessage, /user-select:all/);
    assert.doesNotMatch(content!.emailMessage, /sign-up screen/i);
    assert.equal(content!.emailMessage, PASSWORD_RESET_EMAIL_HTML);
    assertHostedLogoBranding(content!.emailMessage);
  });

  it("includes configured expiry hours in both templates", () => {
    const signUp = resolveCognitoCustomMessage({
      triggerSource: "CustomMessage_SignUp",
      codeParameter: "{####}",
    });
    const reset = resolveCognitoCustomMessage({
      triggerSource: "CustomMessage_ForgotPassword",
      codeParameter: "{####}",
    });
    const expiry = `This code expires in ${COGNITO_CODE_EXPIRY_HOURS} hours`;
    assert.match(signUp!.emailMessage, new RegExp(expiry.replace(".", "\\.")));
    assert.match(
      reset!.emailMessage,
      new RegExp(
        `This secure code expires in ${COGNITO_CODE_EXPIRY_HOURS} hours`.replace(
          ".",
          "\\.",
        ),
      ),
    );
  });

  it("returns null for unsupported triggers such as MFA", () => {
    const content = resolveCognitoCustomMessage({
      triggerSource: "CustomMessage_Authentication",
      codeParameter: "{####}",
    });
    assert.equal(content, null);
  });
});
