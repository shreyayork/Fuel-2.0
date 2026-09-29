/**
 * Shared light (Figma Finalized-One) email chrome for F20A-167 product mail.
 * Dark `template.ts` stays for invite + legacy branded callers.
 *
 * Email-safe: table layout, inline styles only, system fonts, no JS.
 */

import {
  EMAIL_ASSET_PATHS,
  EMAIL_LOGO_ALT,
  EMAIL_LOGO_DISPLAY,
  emailImg,
} from "./email-assets";

export const LIGHT = {
  pageBg: "#F1F5F9",
  cardBg: "#FFFFFF",
  topBar: "#00E5A0",
  accent: "#009E6D",
  accentSoft: "#F0FDF4",
  accentBorder: "#00E5A0",
  ink: "#0F172A",
  inkSoft: "#475569",
  muted: "#64748B",
  rule: "#E2E8F0",
  tileBg: "#F8FAFC",
  priority: "#EA580C",
  priorityBg: "#FFF7ED",
  working: "#009E6D",
  workingBg: "rgba(0,229,160,0.08)",
  portfolioBadgeBg: "rgba(79,70,229,0.06)",
  portfolioBadgeInk: "#4F46E5",
  sans: "-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif",
  mono: "'SF Mono',Menlo,Consolas,'Courier New',ui-monospace,monospace",
} as const;

export interface RenderedEmail {
  html: string;
  text: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/**
 * Green OTP pill — prominent mono code. `user-select:all` aids manual copy in
 * clients that honor it; email clients do not support JS clipboard APIs.
 */
export function lightOtpPill(code: string): string {
  return `<span style="display:inline-block;background:${LIGHT.accent};border-radius:8px;padding:14px 24px;font-family:${LIGHT.mono};font-size:28px;font-weight:600;letter-spacing:8px;color:#FFFFFF;line-height:1.2;user-select:all;-webkit-user-select:all;-moz-user-select:all;">${escapeHtml(code)}</span>`;
}

/** Sign-up verification OTP card — Figma 456:7 green-bordered highlight + pill. */
export function lightOtpVerificationCard(opts: {
  code: string;
  expiryHours: number;
}): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background:${LIGHT.accentSoft};border:1px solid ${LIGHT.accentBorder};border-radius:12px;">
            <tr><td style="padding:24px;text-align:center;">
              <div style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;color:${LIGHT.accent};text-transform:uppercase;">Secure Verification Code</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" style="padding-top:16px;">${lightOtpPill(opts.code)}</td></tr></table>
              <div style="margin-top:16px;font-family:${LIGHT.sans};font-size:13px;color:${LIGHT.muted};">This code expires in ${opts.expiryHours} hours</div>
            </td></tr>
          </table>`;
}

/** Password-reset OTP — centered green pill (no outer card). */
export function lightOtpResetBlock(opts: { code: string; expiryHours: number }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;">
            <tr><td align="center">${lightOtpPill(opts.code)}</td></tr>
            <tr><td align="center" style="padding-top:16px;font-family:${LIGHT.sans};font-size:13px;color:${LIGHT.muted};">
              This secure code expires in ${opts.expiryHours} hours
            </td></tr>
          </table>`;
}

/** YORK IE mark + wordmark — 2× PNG mark displayed at lg/sm size via absolute HTTPS URL. */
export function lightBrandMark(opts?: { size?: "lg" | "sm" }): string {
  const lg = (opts?.size ?? "lg") === "lg";
  const mark = lg ? EMAIL_LOGO_DISPLAY.lg : EMAIL_LOGO_DISPLAY.sm;
  const title = lg ? 13 : 11;
  const sub = lg ? 9 : 8;
  const markPath = lg ? EMAIL_ASSET_PATHS.logoMarkLg : EMAIL_ASSET_PATHS.logoMarkSm;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;padding-right:10px;">
      ${emailImg(markPath, { width: mark, height: mark, alt: EMAIL_LOGO_ALT })}
    </td>
    <td style="vertical-align:middle;font-family:${LIGHT.sans};line-height:1.15;">
      <div style="color:${LIGHT.ink};font-size:${title}px;font-weight:700;letter-spacing:0.4px;">YORK IE</div>
      <div style="color:${LIGHT.muted};font-size:${sub}px;font-weight:600;letter-spacing:1.1px;margin-top:2px;">FUEL PLATFORM</div>
    </td>
  </tr></table>`;
}

export function lightBadge(label: string, tone: "welcome" | "portfolio" | "neutral" = "neutral"): string {
  const bg =
    tone === "welcome"
      ? LIGHT.workingBg
      : tone === "portfolio"
        ? LIGHT.portfolioBadgeBg
        : LIGHT.tileBg;
  const color =
    tone === "welcome"
      ? LIGHT.accent
      : tone === "portfolio"
        ? LIGHT.portfolioBadgeInk
        : LIGHT.muted;
  return `<span style="display:inline-block;background:${bg};color:${color};font-family:${LIGHT.sans};font-size:10px;font-weight:700;letter-spacing:0.4px;padding:4px 10px;border-radius:4px;text-transform:uppercase;">${escapeHtml(label)}</span>`;
}

export function lightPrimaryButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background:${LIGHT.accent};">
    <a href="${escapeAttr(href)}" style="display:inline-block;padding:12px 20px;color:#FFFFFF;font-family:${LIGHT.sans};font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export function lightSecondaryButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-radius:8px;border:1px solid ${LIGHT.accent};text-align:center;">
    <a href="${escapeAttr(href)}" style="display:block;padding:10px 16px;color:${LIGHT.accent};font-family:${LIGHT.sans};font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export function lightFullWidthButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-radius:8px;background:${LIGHT.accent};text-align:center;">
    <a href="${escapeAttr(href)}" style="display:block;padding:14px 20px;color:#FFFFFF;font-family:${LIGHT.sans};font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export function wrapLightEmail(opts: {
  preheader?: string;
  headerRight?: string;
  bodyRows: string;
  footerNote: string;
  title: string;
}): string {
  const preheader = opts.preheader
    ? `<div style="display:none;font-size:1px;color:${LIGHT.pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : "";

  const headerRight = opts.headerRight
    ? `<td align="right" style="vertical-align:middle;">${opts.headerRight}</td>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${LIGHT.pageBg};">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${LIGHT.pageBg};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:680px;max-width:100%;background:${LIGHT.cardBg};border-radius:16px;overflow:hidden;border:1px solid ${LIGHT.rule};">
        <tr><td style="height:4px;background:${LIGHT.topBar};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:middle;">${lightBrandMark({ size: "lg" })}</td>
              ${headerRight}
            </tr>
          </table>
          ${opts.bodyRows}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;border-top:1px solid ${LIGHT.rule};">
            <tr><td style="padding-top:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">${lightBrandMark({ size: "sm" })}</td>
                  <td align="right" style="vertical-align:middle;font-family:${LIGHT.sans};font-size:13px;color:${LIGHT.muted};">
                    <a href="https://york.ie" style="color:${LIGHT.muted};text-decoration:none;">York IE · york.ie</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-family:${LIGHT.sans};font-size:11px;line-height:18px;color:${LIGHT.muted};">${escapeHtml(opts.footerNote)}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function firstNameFrom(opts: {
  givenName?: string | null;
  fullName?: string | null;
  email?: string | null;
}): string {
  const given = opts.givenName?.trim();
  if (given) return given.split(/\s+/)[0] ?? given;
  const full = opts.fullName?.trim();
  if (full) return full.split(/\s+/)[0] ?? full;
  const local = opts.email?.split("@")[0]?.trim();
  if (local) {
    const token = local.split(/[._+-]/)[0] ?? local;
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
  return "there";
}

export function appBaseUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
