import {
  LIGHT,
  escapeHtml,
  lightFullWidthButton,
  wrapLightEmail,
  type RenderedEmail,
} from "./light-layout";
import { iconFlag, iconTrendingUp, iconUser } from "./email-icons";
import { overviewBenchmarkUrl } from "./links";

export interface QuarterlyUpdateSpec {
  firstName: string;
  companyUuid: string;
  /** e.g. "Q3" — completed quarter label */
  completedQuarterLabel: string;
  /** e.g. "Q4" — upcoming quarter for sign-off */
  nextQuarterLabel: string;
}

export function renderQuarterlyUpdateEmail(spec: QuarterlyUpdateSpec): RenderedEmail {
  const greeting = `Hi ${spec.firstName},`;
  const href = overviewBenchmarkUrl(spec.companyUuid);
  const headlinePlain = `${spec.completedQuarterLabel} is done. Update your Fuel profile.`;
  const headlineHtml = `${escapeHtml(spec.completedQuarterLabel)} is done. <span style="color:${LIGHT.accent};">Update your Fuel profile.</span>`;

  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:32px;font-weight:700;line-height:38px;color:${LIGHT.ink};">${headlineHtml}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:15px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(greeting)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              Five minutes keeps your operational benchmarks sharp and automatically unlocks the next series of recommended business initiatives.
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">What to update</td></tr>
            ${updateItem("Company benchmarks across R&D, GTM, and G&A operations", iconTrendingUp())}
            ${updateItem("Initiatives completed or newly prioritized", iconFlag())}
            ${updateItem("Profile details (funding, head count, workspace permissions)", iconUser())}
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
            <tr><td>${lightFullWidthButton("Update My Fuel Profile", href)}</td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:${LIGHT.accentSoft};border:1px solid ${LIGHT.accentBorder};border-radius:12px;">
            <tr><td style="padding:20px;">
              <div style="font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">Credits stay active with fresh data</div>
              <p style="margin:8px 0 0;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
                Please note that stale profiles momentarily pause automated benchmarks. Once updated, recommendations flow again instantly.
              </p>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;color:${LIGHT.inkSoft};">Here's to a strong ${escapeHtml(spec.nextQuarterLabel)},</td></tr>
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;font-weight:700;color:${LIGHT.ink};padding-top:4px;">The Fuel team at York IE</td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: headlinePlain,
    preheader: "Update your Fuel profile for the new quarter.",
    headerRight: `<span style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">END OF QUARTER</span>`,
    bodyRows,
    footerNote: "You're receiving this because it is time for your quarterly Fuel update.",
  });

  const text = [
    headlinePlain,
    "",
    greeting,
    "",
    "Five minutes keeps your operational benchmarks sharp and automatically unlocks the next series of recommended business initiatives.",
    "",
    "Update My Fuel Profile:",
    href,
    "",
    `Here's to a strong ${spec.nextQuarterLabel},`,
    "The Fuel team at York IE",
  ].join("\n");

  return { html, text };
}

function updateItem(label: string, iconHtml: string): string {
  return `<tr><td style="padding-top:12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;">
      <tr>
        <td style="width:36px;vertical-align:middle;padding:16px 0 16px 16px;">${iconHtml}</td>
        <td style="padding:16px 16px 16px 0;font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(label)}</td>
      </tr>
    </table>
  </td></tr>`;
}

/** Calendar quarter labels from a Date whose Y/M reflect the wall calendar. */
export function quarterLabelsForDate(now: Date): {
  completedQuarterLabel: string;
  nextQuarterLabel: string;
  periodKey: string;
} {
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const q = Math.floor(month / 3) + 1;
  const completedQ = q === 1 ? 4 : q - 1;
  const completedYear = q === 1 ? year - 1 : year;
  return {
    completedQuarterLabel: `Q${completedQ}`,
    nextQuarterLabel: `Q${q}`,
    periodKey: `${completedYear}-Q${completedQ}`,
  };
}

/** NY-local calendar parts for `now` (America/New_York). */
export function newYorkYmd(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

/** First calendar day of Jan/Apr/Jul/Oct in America/New_York. */
export function isQuarterStartInNewYork(now: Date): boolean {
  const { month, day } = newYorkYmd(now);
  return day === 1 && (month === 1 || month === 4 || month === 7 || month === 10);
}
