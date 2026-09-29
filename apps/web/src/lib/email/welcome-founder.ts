import {
  LIGHT,
  escapeHtml,
  lightBadge,
  lightPrimaryButton,
  lightSecondaryButton,
  wrapLightEmail,
  type RenderedEmail,
} from "./light-layout";
import { iconActivity, iconCheckCircle, iconCpu } from "./email-icons";
import { overviewBenchmarkUrl, SERVICES_REQUEST_URL } from "./links";

export interface FounderWelcomeSpec {
  firstName: string;
  companyUuid: string;
}

export function renderFounderWelcomeEmail(spec: FounderWelcomeSpec): RenderedEmail {
  const greeting = `Hi ${spec.firstName},`;
  const benchmarkHref = overviewBenchmarkUrl(spec.companyUuid);

  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:32px;font-weight:700;line-height:38px;color:${LIGHT.ink};">
              You're in. <span style="color:${LIGHT.accent};">Let's get to work.</span>
            </td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:15px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(greeting)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              Fuel is your startup intelligence layer — benchmarks, market signals, and what to focus on next. No equity required.
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">Ready Now</td></tr>
            <tr><td style="padding-top:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${statusTile(iconCheckCircle(20), "Workspace live")}
                  <td width="12"></td>
                  ${statusTile(iconActivity(20), "Intelligence running")}
                  <td width="12"></td>
                  ${statusTile(iconCpu(20), "Fuel AI ready")}
                </tr>
              </table>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;background:${LIGHT.accentSoft};border:1px solid ${LIGHT.accentBorder};border-radius:12px;">
            <tr><td style="padding:24px;">
              <div style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;color:${LIGHT.accent};text-transform:uppercase;">DO THIS NEXT · ~4 MIN</div>
              <div style="font-family:${LIGHT.sans};font-size:18px;font-weight:700;color:${LIGHT.ink};margin-top:4px;">Complete your initial business benchmark</div>
              <p style="margin:16px 0 0;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
                Answer 15 key questions about your current business metrics. Fuel will immediately build your first operational readiness score.
              </p>
              <div style="margin-top:16px;">${lightPrimaryButton("Complete Your Benchmark", benchmarkHref)}</div>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">More context → more credits</td></tr>
            <tr><td style="padding-top:4px;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
              Upload your deck, connect HubSpot, or log a signal. Every single input sharpens the precision of your Fuel recommendations.
            </td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">York IE is one message away</td></tr>
            <tr><td style="padding-top:4px;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
              When a signal needs a qualified human perspective, our dedicated market experts already have your story loaded.
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
            <tr><td>${lightSecondaryButton("Ask the team a question", SERVICES_REQUEST_URL)}</td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;color:${LIGHT.inkSoft};">Welcome aboard —</td></tr>
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;font-weight:700;color:${LIGHT.ink};padding-top:4px;">The Fuel team at York IE</td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: "You're in. Let's get to work.",
    preheader: "Complete your initial business benchmark on Fuel.",
    headerRight: lightBadge("WELCOME", "welcome"),
    bodyRows,
    footerNote:
      "You are receiving this welcome email because your workspace was created on the Fuel Platform.",
  });

  const text = [
    "You're in. Let's get to work.",
    "",
    greeting,
    "",
    "Fuel is your startup intelligence layer — benchmarks, market signals, and what to focus on next. No equity required.",
    "",
    "Complete Your Benchmark:",
    benchmarkHref,
    "",
    "Ask the team a question:",
    SERVICES_REQUEST_URL,
    "",
    "Welcome aboard —",
    "The Fuel team at York IE",
  ].join("\n");

  return { html, text };
}

function statusTile(iconHtml: string, label: string): string {
  return `<td style="width:33%;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;padding:16px;vertical-align:top;">
    <div style="line-height:0;">${iconHtml}</div>
    <div style="font-family:${LIGHT.sans};font-size:13px;font-weight:600;color:${LIGHT.ink};margin-top:8px;">${escapeHtml(label)}</div>
  </td>`;
}
