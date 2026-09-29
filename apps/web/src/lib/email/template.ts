import "server-only";

/**
 * Branded transactional email template. Used by every runtime-rendered
 * email Fuel sends (invites, future digests, notifications). The Cognito-
 * generated verification emails are visually paired via a parallel
 * template constant in packages/infrastructure/lib/cognito-email-templates.ts
 * since CDK can't easily import from apps/web.
 *
 * Aesthetic mirrors the product's `signal` (dark) palette so the email
 * feels continuous with the in-app experience.
 *
 * Email-client compatibility notes:
 *   - Table-based layout for old Outlook + dark-mode Gmail
 *   - Inline styles only (`<style>` blocks are stripped by Gmail)
 *   - System font stack — no external font loads
 *   - Hidden preheader text so the inbox preview reads as intended
 *   - SVG is avoided; brand mark is a styled HTML wordmark
 */
export interface EmailRenderSpec {
  /** Hidden preview text Gmail / Apple Mail show next to the subject. */
  preheader?: string;
  heading: string;
  /** First paragraph after the heading. */
  intro?: string;
  /** Centered code block (e.g. a 6-digit verification code). */
  code?: string;
  /** Optional CTA button below the intro/code. */
  cta?: { label: string; href: string };
  /** Additional paragraph(s) below the CTA. */
  body?: string;
  /** Small fine-print at the bottom of the card. */
  footnote?: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

const BG = "#0F1A24";
const PANEL = "#172632";
const PANEL_INNER = "#0B141C";
const ACCENT = "#00B48A";
const RULE = "#263947";
const INK = "#F4F6F8";
const INK_SOFT = "#CBD3DB";
const MUTED = "#8A99A6";
const MUTED_SOFT = "#596876";

export function renderEmail(spec: EmailRenderSpec): RenderedEmail {
  const codeBlock = spec.code
    ? `
              <tr><td style="padding:0 32px 8px;">
                <div style="background:${PANEL_INNER};border:1px solid ${RULE};border-radius:10px;padding:24px;text-align:center;">
                  <div style="font-family:'JetBrains Mono','SF Mono','Menlo','Consolas','Courier New',ui-monospace,monospace;font-size:32px;letter-spacing:10px;color:${ACCENT};font-weight:600;line-height:1.2;">${escapeHtml(
                    spec.code,
                  )}</div>
                </div>
              </td></tr>`
    : "";

  const ctaBlock = spec.cta
    ? `
              <tr><td style="padding:24px 32px 0;">
                <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="border-radius:10px;background:${ACCENT};">
                  <a href="${escapeAttr(
                    spec.cta.href,
                  )}" style="display:inline-block;padding:13px 22px;color:${BG};font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14.5px;font-weight:600;text-decoration:none;letter-spacing:0.1px;border-radius:10px;">
                    ${escapeHtml(spec.cta.label)}
                  </a>
                </td></tr></table>
              </td></tr>`
    : "";

  const bodyBlock = spec.body
    ? `
              <tr><td style="padding:20px 32px 0;">
                <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(
                  spec.body,
                )}</p>
              </td></tr>`
    : "";

  const footnoteBlock = spec.footnote
    ? `
              <tr><td style="padding:24px 32px 4px;">
                <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.55;color:${MUTED};">${escapeHtml(
                  spec.footnote,
                )}</p>
              </td></tr>`
    : "";

  const introBlock = spec.intro
    ? `
              <tr><td style="padding:14px 32px 0;">
                <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(
                  spec.intro,
                )}</p>
              </td></tr>`
    : "";

  // Hidden preheader (invisible in the body, visible in the preview).
  const preheader = spec.preheader
    ? `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(
        spec.preheader,
      )}</div>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${escapeHtml(spec.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background:${PANEL};border:1px solid ${RULE};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:22px 28px;border-bottom:1px solid ${RULE};">
          ${brandHeader()}
        </td></tr>
        <tr><td style="padding:32px 32px 4px;">
          <h1 style="margin:0;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:600;letter-spacing:-0.3px;color:${INK};line-height:1.25;">
            ${escapeHtml(spec.heading)}
          </h1>
        </td></tr>
        ${introBlock}
        ${codeBlock}
        ${ctaBlock}
        ${bodyBlock}
        ${footnoteBlock}
        <tr><td style="padding:28px 32px 24px;"></td></tr>
        <tr><td style="padding:18px 32px 22px;border-top:1px solid ${RULE};background:${BG};">
          <p style="margin:0;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11.5px;color:${MUTED_SOFT};letter-spacing:0.3px;">
            Fuel · by <a href="https://york.ie" style="color:${MUTED};text-decoration:none;">York IE</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = renderTextFallback(spec);

  return { html, text };
}

function brandHeader(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;">
      <span style="display:inline-block;width:10px;height:10px;background:${ACCENT};border-radius:2px;"></span>
    </td>
    <td style="padding-left:10px;vertical-align:middle;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;color:${INK};font-size:17px;font-weight:700;letter-spacing:0.3px;">
      Fuel
      <span style="color:${MUTED};font-weight:400;font-size:11px;margin-left:8px;letter-spacing:1.2px;">BY YORK IE</span>
    </td>
  </tr></table>`;
}

function renderTextFallback(spec: EmailRenderSpec): string {
  const lines: string[] = [];
  lines.push(spec.heading);
  lines.push("");
  if (spec.intro) {
    lines.push(spec.intro);
    lines.push("");
  }
  if (spec.code) {
    lines.push(`Code: ${spec.code}`);
    lines.push("");
  }
  if (spec.cta) {
    lines.push(spec.cta.label);
    lines.push(spec.cta.href);
    lines.push("");
  }
  if (spec.body) {
    lines.push(spec.body);
    lines.push("");
  }
  if (spec.footnote) {
    lines.push(spec.footnote);
    lines.push("");
  }
  lines.push("—");
  lines.push("Fuel · by York IE · https://york.ie");
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
