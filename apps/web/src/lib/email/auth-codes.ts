import {
  LIGHT,
  escapeHtml,
  lightOtpResetBlock,
  lightOtpVerificationCard,
  wrapLightEmail,
  type RenderedEmail,
} from "./light-layout";

/** Cognito signup OTP — mirrors Figma email-verify-account (light). */
export interface VerifyAccountEmailSpec {
  firstName: string;
  /** Cognito substitutes {####}; pass literally for Cognito HTML, or real code for previews. */
  code: string;
  expiryHours: number;
}

export function renderVerifyAccountEmail(spec: VerifyAccountEmailSpec): RenderedEmail {
  const greeting = `Hi ${spec.firstName},`;
  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:32px;font-weight:700;line-height:38px;color:${LIGHT.ink};">Verify your Fuel account.</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:15px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(greeting)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              Welcome aboard. Enter this code on the Fuel sign-up screen to finish creating your workspace.
            </td></tr>
          </table>

          ${lightOtpVerificationCard({ code: spec.code, expiryHours: spec.expiryHours })}

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;">
            <tr><td style="padding:20px;">
              <div style="font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">Didn't request this?</div>
              <p style="margin:8px 0 0;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
                If you did not initiate this request, you can safely ignore this email. No workspace will be created.
              </p>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;color:${LIGHT.inkSoft};">Welcome aboard —</td></tr>
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;font-weight:700;color:${LIGHT.ink};padding-top:4px;">The Fuel team at York IE</td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: "Verify your Fuel account.",
    preheader: "Use this code to finish creating your Fuel workspace.",
    headerRight: `<span style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;color:${LIGHT.muted};">Email Verification</span>`,
    bodyRows,
    footerNote: "You're receiving this because a Fuel account verification was requested.",
  });

  const text = [
    "Verify your Fuel account.",
    "",
    greeting,
    "",
    "Welcome aboard. Enter this code on the Fuel sign-up screen to finish creating your workspace.",
    "",
    `Code: ${spec.code}`,
    `This code expires in ${spec.expiryHours} hours.`,
    "",
    "If you did not initiate this request, you can safely ignore this email.",
  ].join("\n");

  return { html, text };
}

export interface PasswordResetEmailSpec {
  firstName: string;
  code: string;
  expiryHours: number;
}

export function renderPasswordResetEmail(spec: PasswordResetEmailSpec): RenderedEmail {
  const greeting = `Hi ${spec.firstName},`;
  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;text-align:center;">
            <tr><td style="font-family:${LIGHT.sans};font-size:28px;font-weight:700;line-height:34px;color:${LIGHT.ink};">Reset your Fuel password</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:15px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(greeting)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              We received a request to reset your password for your account on York IE's Fuel Platform. Copy the OTP mentioned below:
            </td></tr>
          </table>

          ${lightOtpResetBlock({ code: spec.code, expiryHours: spec.expiryHours })}

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;">
            <tr><td style="padding:20px;">
              <div style="font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">Didn't request this?</div>
              <p style="margin:8px 0 0;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
                If you did not initiate this request, you can safely ignore this email. Your current password will remain exactly the same.
              </p>
            </td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: "Reset your Fuel password",
    preheader: "Use this code to continue resetting your Fuel password.",
    bodyRows,
    footerNote:
      "You're receiving this because a password reset was requested for your Fuel account.",
  });

  const text = [
    "Reset your Fuel password",
    "",
    greeting,
    "",
    "We received a request to reset your password for your account on York IE's Fuel Platform.",
    "",
    `Code: ${spec.code}`,
    `This secure code expires in ${spec.expiryHours} hours.`,
    "",
    "If you did not initiate this request, you can safely ignore this email.",
  ].join("\n");

  return { html, text };
}
