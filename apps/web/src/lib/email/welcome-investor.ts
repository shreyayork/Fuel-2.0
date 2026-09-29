import {
  LIGHT,
  escapeHtml,
  escapeAttr,
  lightBadge,
  wrapLightEmail,
  type RenderedEmail,
} from "./light-layout";
import { iconBriefcase, iconRadio, iconUsers } from "./email-icons";
import { integrationsUrl, portfolioUrl } from "./links";

export interface InvestorWelcomeSpec {
  firstName: string;
}

export function renderInvestorWelcomeEmail(spec: InvestorWelcomeSpec): RenderedEmail {
  const greeting = `Hi ${spec.firstName},`;
  const hubspot = integrationsUrl();
  const portfolio = portfolioUrl();

  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:32px;font-weight:700;line-height:38px;color:${LIGHT.ink};">
              Get started on Fuel.
            </td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:15px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(greeting)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              Connect your HubSpot to bring in your pipeline, then build your portfolio so we can benchmark your companies and research their statuses and workflows.
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">Next Steps</td></tr>
            <tr><td style="padding-top:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${stepTile(iconBriefcase(18), "Link HubSpot", hubspot)}
                  <td width="12"></td>
                  ${stepTile(iconUsers(18), "Build portfolio", portfolio)}
                  <td width="12"></td>
                  ${stepTile(iconRadio(18), "Run benchmarks", portfolio)}
                </tr>
              </table>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">Connect Your Pipeline</td></tr>
            <tr><td style="padding-top:4px;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
              Link your HubSpot account to automatically pull in your deal pipeline. Fuel maps your companies, contacts, and deal stages so everything is in one place — no manual entry required.
            </td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">Portfolio Benchmarking &amp; Research</td></tr>
            <tr><td style="padding-top:4px;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
              Once your portfolio is built, Fuel researches each company to surface their current statuses, workflows, and operational health — giving you a clear picture before your next board cycle.
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;color:${LIGHT.inkSoft};">Best regards,</td></tr>
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;font-weight:700;color:${LIGHT.ink};padding-top:4px;">The Fuel team at York IE</td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: "Get started on Fuel.",
    preheader: "Connect HubSpot and build your portfolio on Fuel.",
    headerRight: lightBadge("PORTFOLIO MGMT", "portfolio"),
    bodyRows,
    footerNote: "You're receiving this because your Fuel workspace is being set up.",
  });

  const text = [
    "Get started on Fuel.",
    "",
    greeting,
    "",
    "Connect your HubSpot to bring in your pipeline, then build your portfolio so we can benchmark your companies and research their statuses and workflows.",
    "",
    `Link HubSpot: ${hubspot}`,
    `Build portfolio: ${portfolio}`,
    `Run benchmarks: ${portfolio}`,
    "",
    "Best regards,",
    "The Fuel team at York IE",
  ].join("\n");

  return { html, text };
}

function stepTile(iconHtml: string, label: string, href: string): string {
  return `<td style="width:33%;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;padding:14px;vertical-align:middle;">
    <a href="${escapeAttr(href)}" style="font-family:${LIGHT.sans};font-size:13px;font-weight:600;color:${LIGHT.ink};text-decoration:none;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:10px;">${iconHtml}</td>
        <td style="vertical-align:middle;font-family:${LIGHT.sans};font-size:13px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(label)}</td>
      </tr></table>
    </a>
  </td>`;
}
