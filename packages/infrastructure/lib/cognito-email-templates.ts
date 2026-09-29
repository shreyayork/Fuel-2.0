/**
 * Cognito-side email body templates (deploy-time). Visually paired with
 * apps/web/src/lib/email/auth-codes.ts light Finalized-One chrome (F20A-167).
 * CDK cannot import apps/web — keep logo asset paths in sync with
 * packages/infrastructure/lib/email-asset-urls.ts.
 *
 * Placeholders Cognito substitutes server-side:
 *   {####}     — verification code (or temp password for invitations)
 *   {username} — email/username
 *
 * Optional first-name personalization uses `given_name` from the Custom
 * Message Lambda when present; otherwise "there".
 */

import {
  emailAssetBaseUrlForStage,
  emailLogoImg,
} from "./email-asset-urls";

export const COGNITO_CODE_EXPIRY_HOURS = 24;

const PAGE_BG = "#F1F5F9";
const CARD_BG = "#FFFFFF";
const TOP_BAR = "#00E5A0";
const ACCENT = "#009E6D";
const ACCENT_SOFT = "#F0FDF4";
const ACCENT_BORDER = "#00E5A0";
const INK = "#0F172A";
const INK_SOFT = "#475569";
const MUTED = "#64748B";
const RULE = "#E2E8F0";
const TILE = "#F8FAFC";
const SANS = "-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',Menlo,Consolas,'Courier New',ui-monospace,monospace";

function resolveAssetBaseUrl(assetBaseUrl?: string): string {
  if (assetBaseUrl?.trim()) return assetBaseUrl.trim().replace(/\/$/, "");
  return emailAssetBaseUrlForStage(process.env.STAGE ?? "stage");
}

function brandMark(size: "lg" | "sm", assetBaseUrl?: string): string {
  const base = resolveAssetBaseUrl(assetBaseUrl);
  const mark = size === "lg" ? 22 : 16;
  const title = size === "lg" ? 13 : 11;
  const sub = size === "lg" ? 9 : 8;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;padding-right:10px;">
      ${emailLogoImg(base, size)}
    </td>
    <td style="vertical-align:middle;font-family:${SANS};line-height:1.15;">
      <div style="color:${INK};font-size:${title}px;font-weight:700;letter-spacing:0.4px;">YORK IE</div>
      <div style="color:${MUTED};font-size:${sub}px;font-weight:600;letter-spacing:1.1px;margin-top:2px;">FUEL PLATFORM</div>
    </td>
  </tr></table>`;
}

function wrap(opts: {
  preheader: string;
  title: string;
  headerRight?: string;
  body: string;
  footerNote: string;
  assetBaseUrl?: string;
}): string {
  const headerRight = opts.headerRight
    ? `<td align="right" style="vertical-align:middle;">${opts.headerRight}</td>`
    : "";
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <div style="display:none;font-size:1px;color:${PAGE_BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${opts.preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAGE_BG};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:680px;max-width:100%;background:${CARD_BG};border-radius:16px;overflow:hidden;border:1px solid ${RULE};">
        <tr><td style="height:4px;background:${TOP_BAR};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:middle;">${brandMark("lg", opts.assetBaseUrl)}</td>
              ${headerRight}
            </tr>
          </table>
          ${opts.body}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;border-top:1px solid ${RULE};">
            <tr><td style="padding-top:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">${brandMark("sm", opts.assetBaseUrl)}</td>
                  <td align="right" style="vertical-align:middle;font-family:${SANS};font-size:13px;color:${MUTED};">
                    <a href="https://york.ie" style="color:${MUTED};text-decoration:none;">York IE · york.ie</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-family:${SANS};font-size:11px;line-height:18px;color:${MUTED};">${opts.footerNote}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function greetingLine(firstName: string): string {
  return `Hi ${firstName},`;
}

/** Green OTP pill — keep in sync with apps/web light-layout.ts lightOtpPill. */
function otpPill(code: string): string {
  return `<span style="display:inline-block;background:${ACCENT};border-radius:8px;padding:14px 24px;font-family:${MONO};font-size:28px;font-weight:600;letter-spacing:8px;color:#FFFFFF;line-height:1.2;user-select:all;-webkit-user-select:all;-moz-user-select:all;">${code}</span>`;
}

function otpVerificationCard(code: string, expiryHours: number): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background:${ACCENT_SOFT};border:1px solid ${ACCENT_BORDER};border-radius:12px;">
            <tr><td style="padding:24px;text-align:center;">
              <div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.6px;color:${ACCENT};text-transform:uppercase;">Secure Verification Code</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" style="padding-top:16px;">${otpPill(code)}</td></tr></table>
              <div style="margin-top:16px;font-family:${SANS};font-size:13px;color:${MUTED};">This code expires in ${expiryHours} hours</div>
            </td></tr>
          </table>`;
}

function otpResetBlock(code: string, expiryHours: number): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;">
            <tr><td align="center">${otpPill(code)}</td></tr>
            <tr><td align="center" style="padding-top:16px;font-family:${SANS};font-size:13px;color:${MUTED};">
              This secure code expires in ${expiryHours} hours
            </td></tr>
          </table>`;
}

function verificationHtml(firstName: string, assetBaseUrl?: string): string {
  return wrap({
    preheader: "Use this code to finish creating your Fuel workspace.",
    title: "Verify your Fuel account.",
    headerRight: `<span style="font-family:${SANS};font-size:11px;font-weight:700;color:${MUTED};">Email Verification</span>`,
    assetBaseUrl,
    body: `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${SANS};font-size:32px;font-weight:700;line-height:38px;color:${INK};">Verify your Fuel account.</td></tr>
            <tr><td style="padding-top:16px;font-family:${SANS};font-size:15px;font-weight:600;color:${INK};">${greetingLine(firstName)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${SANS};font-size:14px;line-height:22px;color:${INK_SOFT};">
              Welcome aboard. Enter this code on the Fuel sign-up screen to finish creating your workspace.
            </td></tr>
          </table>
          ${otpVerificationCard("{####}", COGNITO_CODE_EXPIRY_HOURS)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:${TILE};border:1px solid ${RULE};border-radius:12px;">
            <tr><td style="padding:20px;">
              <div style="font-family:${SANS};font-size:14px;font-weight:600;color:${INK};">Didn't request this?</div>
              <p style="margin:8px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${INK_SOFT};">
                If you did not initiate this request, you can safely ignore this email. No workspace will be created.
              </p>
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${SANS};font-size:14px;color:${INK_SOFT};">Welcome aboard —</td></tr>
            <tr><td style="font-family:${SANS};font-size:14px;font-weight:700;color:${INK};padding-top:4px;">The Fuel team at York IE</td></tr>
          </table>`,
    footerNote:
      "You're receiving this because a Fuel account verification was requested.",
  });
}

function passwordResetHtml(firstName: string, assetBaseUrl?: string): string {
  return wrap({
    preheader: "Use this code to continue resetting your Fuel password.",
    title: "Reset your Fuel password",
    assetBaseUrl,
    body: `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;text-align:center;">
            <tr><td style="font-family:${SANS};font-size:28px;font-weight:700;line-height:34px;color:${INK};">Reset your Fuel password</td></tr>
            <tr><td style="padding-top:16px;font-family:${SANS};font-size:15px;font-weight:600;color:${INK};">${greetingLine(firstName)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${SANS};font-size:14px;line-height:22px;color:${INK_SOFT};">
              We received a request to reset your password for your account on York IE's Fuel Platform. Copy the OTP mentioned below:
            </td></tr>
          </table>
          ${otpResetBlock("{####}", COGNITO_CODE_EXPIRY_HOURS)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:${TILE};border:1px solid ${RULE};border-radius:12px;">
            <tr><td style="padding:20px;">
              <div style="font-family:${SANS};font-size:14px;font-weight:600;color:${INK};">Didn't request this?</div>
              <p style="margin:8px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${INK_SOFT};">
                If you did not initiate this request, you can safely ignore this email. Your current password will remain exactly the same.
              </p>
            </td></tr>
          </table>`,
    footerNote:
      "You're receiving this because a password reset was requested for your Fuel account.",
  });
}

/** Default pool fallback HTML (stage asset host). Prefer build*ForAppUrl in CDK. */
const DEFAULT_ASSET_BASE = "https://stage.v2.fuel.york.ie";

/** Sign-up verification — Cognito substitutes {####}. */
export const VERIFICATION_EMAIL_SUBJECT = "Your Fuel verification code";
export const VERIFICATION_EMAIL_HTML = verificationHtml("there", DEFAULT_ASSET_BASE);

/** Forgot-password — selected by Custom Message Lambda. */
export const PASSWORD_RESET_EMAIL_SUBJECT = "Your Fuel password reset code";
export const PASSWORD_RESET_EMAIL_HTML = passwordResetHtml("there", DEFAULT_ASSET_BASE);

export function buildVerificationEmailHtml(
  firstName: string,
  assetBaseUrl: string,
): string {
  return verificationHtml(firstName, assetBaseUrl);
}

export function buildInvitationEmailHtml(assetBaseUrl: string): string {
  return wrap({
    preheader: "A temporary password to access your Fuel account.",
    title: "Welcome to Fuel",
    assetBaseUrl,
    body: `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${SANS};font-size:28px;font-weight:700;line-height:34px;color:${INK};">Welcome to Fuel</td></tr>
            <tr><td style="padding-top:16px;font-family:${SANS};font-size:14px;line-height:22px;color:${INK_SOFT};">
              An administrator created a Fuel account for {username}. Use the temporary password below to sign in, then set a permanent password.
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background:${TILE};border:1px solid ${RULE};border-radius:12px;">
            <tr><td style="padding:24px;text-align:center;">
              <div style="font-family:${MONO};font-size:20px;font-weight:600;letter-spacing:2px;color:${ACCENT};word-break:break-all;">{####}</div>
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;">
            <tr><td style="font-family:${SANS};font-size:13px;line-height:20px;color:${MUTED};">
              Sign in at https://stage.v2.fuel.york.ie/sign-in. You'll be asked to change this password on first sign-in.
            </td></tr>
          </table>`,
    footerNote: "You're receiving this because a Fuel account was created for you.",
  });
}

/**
 * Admin-initiated invitation (rare Cognito AdminCreateUser path).
 * Fuel invite flow uses apps/web sendInviteEmail instead.
 */
export const INVITATION_EMAIL_SUBJECT = "You've been invited to Fuel";
export const INVITATION_EMAIL_HTML = buildInvitationEmailHtml(DEFAULT_ASSET_BASE);

const SIGN_UP_TRIGGERS = new Set([
  "CustomMessage_SignUp",
  "CustomMessage_ResendCode",
  "CustomMessage_UpdateUserAttribute",
  "CustomMessage_VerifyUserAttribute",
]);

export interface CognitoCustomMessageContent {
  emailSubject: string;
  emailMessage: string;
  smsMessage: string;
}

function resolveFirstName(givenName?: string | null): string {
  const trimmed = givenName?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/**
 * Branded Cognito email content keyed by triggerSource. Returns null for
 * triggers this module doesn't customize (e.g. MFA).
 */
export function resolveCognitoCustomMessage(input: {
  triggerSource: string;
  codeParameter: string;
  usernameParameter?: string | null;
  givenName?: string | null;
}): CognitoCustomMessageContent | null {
  const code = input.codeParameter || "{####}";
  const firstName = resolveFirstName(input.givenName);

  if (input.triggerSource === "CustomMessage_ForgotPassword") {
    return {
      emailSubject: PASSWORD_RESET_EMAIL_SUBJECT,
      emailMessage: passwordResetHtml(firstName),
      smsMessage: `Your Fuel password reset code is ${code}.`,
    };
  }

  if (input.triggerSource === "CustomMessage_AdminCreateUser") {
    const username = input.usernameParameter ?? "{username}";
    const html = buildInvitationEmailHtml(resolveAssetBaseUrl()).replaceAll(
      "{username}",
      username,
    );
    return {
      emailSubject: INVITATION_EMAIL_SUBJECT,
      emailMessage: html,
      smsMessage: `Fuel account for ${username}. Temporary password: ${code}.`,
    };
  }

  if (SIGN_UP_TRIGGERS.has(input.triggerSource)) {
    return {
      emailSubject: VERIFICATION_EMAIL_SUBJECT,
      emailMessage: verificationHtml(firstName),
      smsMessage: `Your Fuel verification code is ${code}.`,
    };
  }

  return null;
}
