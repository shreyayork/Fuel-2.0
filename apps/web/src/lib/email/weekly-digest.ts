import {
  LIGHT,
  escapeHtml,
  escapeAttr,
  lightPrimaryButton,
  wrapLightEmail,
  type RenderedEmail,
} from "./light-layout";
import {
  intelligenceUrl,
  initiativesUrl,
  SERVICES_REQUEST_URL,
} from "./links";

export interface DigestScorecardRow {
  label: string; // R&D | GTM | G&A
  score: number;
  /** WORKING when score > 50; PRIORITY when score <= 50 (Jira). */
  badge: "WORKING" | "PRIORITY";
  workingNote?: string | null;
  needsNote?: string | null;
}

export interface DigestIntelligenceItem {
  /** Rendered as "[category] | [sub category] - [Note]" when parts present. */
  line: string;
}

export interface DigestInitiativeItem {
  name: string;
  /** 0–100 when known; omit bar when null. */
  progressPct: number | null;
}

export interface WeeklyDigestSpec {
  companyUuid: string;
  weekOfLabel: string; // e.g. "WEEK OF JULY 28"
  scorecard: DigestScorecardRow[];
  intelligence: DigestIntelligenceItem[];
  initiatives: DigestInitiativeItem[];
}

export function renderWeeklyDigestEmail(spec: WeeklyDigestSpec): RenderedEmail {
  const intelHref = intelligenceUrl(spec.companyUuid);
  const initHref = initiativesUrl(spec.companyUuid);

  const scoreBoxes =
    spec.scorecard.length > 0
      ? `<tr><td style="padding-top:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                ${spec.scorecard
                  .map(
                    (row, i) =>
                      `${i > 0 ? '<td width="12"></td>' : ""}${scoreBox(row)}`,
                  )
                  .join("")}
              </tr></table>
            </td></tr>`
      : "";

  const functionRowHtml = spec.scorecard
    .map(functionRow)
    .filter((html) => html.length > 0)
    .join("");
  const functionRows = functionRowHtml
    ? `<tr><td style="padding-top:16px;">
              ${functionRowHtml}
            </td></tr>`
    : "";

  const intelSection =
    spec.intelligence.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">Intelligence Highlights</td></tr>
            <tr><td style="padding-top:12px;">
              ${spec.intelligence
                .map(
                  (item) =>
                    `<div style="font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.ink};padding:4px 0;">• ${escapeHtml(item.line)}</div>`,
                )
                .join("")}
            </td></tr>
            <tr><td style="padding-top:12px;">
              <a href="${escapeAttr(intelHref)}" style="font-family:${LIGHT.sans};font-size:13px;font-weight:600;color:${LIGHT.accent};text-decoration:none;">View all intelligence →</a>
            </td></tr>
          </table>`
      : "";

  const initSection =
    spec.initiatives.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">Initiatives In Motion</td></tr>
            <tr><td style="padding-top:12px;">
              ${spec.initiatives.map(initiativeRow).join("")}
            </td></tr>
            <tr><td style="padding-top:12px;">
              <a href="${escapeAttr(initHref)}" style="font-family:${LIGHT.sans};font-size:13px;font-weight:600;color:${LIGHT.accent};text-decoration:none;">View initiatives →</a>
            </td></tr>
          </table>`
      : "";

  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:32px;font-weight:700;line-height:38px;color:${LIGHT.ink};">Weekly Digest</td></tr>
            <tr><td style="padding-top:12px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              What moved this week across your operational metrics — and the one action that matters most.
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">Scorecard</td></tr>
            ${scoreBoxes}
            ${functionRows}
          </table>

          ${intelSection}
          ${initSection}

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;">
            <tr><td style="padding:20px;">
              <div style="font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">Want a human read?</div>
              <p style="margin:12px 0 0;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">
                York IE already has the direct context. Our general partners are synchronized with your weekly scorecard.
              </p>
              <div style="margin-top:16px;">${lightPrimaryButton("Talk to York IE", SERVICES_REQUEST_URL)}</div>
            </td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: "Weekly Digest",
    preheader: "Your weekly Fuel scorecard and intelligence highlights.",
    headerRight: `<span style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">${escapeHtml(spec.weekOfLabel)}</span>`,
    bodyRows,
    footerNote: "You are receiving this because you are an active Fuel member.",
  });

  const textLines = [
    "Weekly Digest",
    spec.weekOfLabel,
    "",
    ...spec.scorecard.map(
      (r) =>
        `${r.label}: ${r.score} [${r.badge}]${r.workingNote ? ` Working — ${r.workingNote}` : ""}${r.needsNote ? ` Needs improvement — ${r.needsNote}` : ""}`,
    ),
    "",
    ...spec.intelligence.map((i) => `• ${i.line}`),
    "",
    ...spec.initiatives.map(
      (i) =>
        `→ ${i.name}${i.progressPct != null ? ` (${i.progressPct}%)` : ""}`,
    ),
    "",
    `Talk to York IE: ${SERVICES_REQUEST_URL}`,
  ];

  return { html, text: textLines.join("\n") };
}

function scoreBox(row: DigestScorecardRow): string {
  return `<td style="width:33%;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;padding:14px;text-align:center;vertical-align:middle;">
    <div style="font-family:${LIGHT.sans};font-size:28px;font-weight:700;color:${LIGHT.ink};line-height:1;">${escapeHtml(String(row.score))}</div>
    <div style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.5px;color:${LIGHT.muted};margin-top:6px;">${escapeHtml(row.label)}</div>
  </td>`;
}

function functionRow(row: DigestScorecardRow): string {
  const isPriority = row.badge === "PRIORITY";
  const badgeBg = isPriority ? LIGHT.priorityBg : LIGHT.workingBg;
  const badgeColor = isPriority ? LIGHT.priority : LIGHT.working;
  const needsLabel = "Needs improvement";
  const bullets: string[] = [];
  if (row.workingNote) {
    bullets.push(`· Working — ${row.workingNote}`);
  }
  if (row.needsNote) {
    bullets.push(`· ${needsLabel} — ${row.needsNote}`);
  }
  // Empty category cards (badge with no supporting bullets) are omitted.
  if (bullets.length === 0) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;">
    <tr><td style="padding:16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:${LIGHT.sans};font-size:14px;font-weight:700;color:${LIGHT.ink};">${escapeHtml(row.label)}</td>
          <td align="right"><span style="display:inline-block;background:${badgeBg};color:${badgeColor};font-family:${LIGHT.sans};font-size:10px;font-weight:700;letter-spacing:0.4px;padding:2px 8px;border-radius:4px;">${escapeHtml(row.badge)}</span></td>
        </tr>
      </table>
      ${bullets
        .map(
          (b) =>
            `<div style="font-family:${LIGHT.sans};font-size:13px;line-height:18px;color:${LIGHT.inkSoft};margin-top:8px;">${escapeHtml(b)}</div>`,
        )
        .join("")}
    </td></tr>
  </table>`;
}

function initiativeRow(item: DigestInitiativeItem): string {
  const pct = item.progressPct;
  const bar =
    pct == null
      ? ""
      : `<div style="margin-top:8px;height:6px;background:${LIGHT.rule};border-radius:3px;overflow:hidden;">
          <div style="height:6px;width:${Math.max(0, Math.min(100, pct))}%;background:${LIGHT.accent};border-radius:3px;"></div>
        </div>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
    <tr>
      <td style="font-family:${LIGHT.sans};font-size:13px;color:${LIGHT.ink};vertical-align:top;width:55%;">→ ${escapeHtml(item.name)}</td>
      <td style="vertical-align:top;width:45%;">${bar}${pct != null ? `<div style="font-family:${LIGHT.sans};font-size:11px;color:${LIGHT.muted};margin-top:4px;">${escapeHtml(String(pct))}%</div>` : ""}</td>
    </tr>
  </table>`;
}

export function digestBadgeForScore(score: number): "WORKING" | "PRIORITY" {
  return score <= 50 ? "PRIORITY" : "WORKING";
}

/** First insight chip → digest bullet text (label + optional detail). */
export function insightText(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const first = items[0] as { label?: unknown; detail?: unknown };
  const label = typeof first?.label === "string" ? first.label.trim() : "";
  const detail = typeof first?.detail === "string" ? first.detail.trim() : "";
  if (label && detail) return `${label}: ${detail}`;
  if (label) return label;
  if (detail) return detail;
  return null;
}

/** Map live track insights into digest Working / Needs improvement notes. */
export function notesFromTrackInsights(insights: {
  strengths: Array<{ label: string; detail: string }>;
  weaknesses: Array<{ label: string; detail: string }>;
}): { workingNote: string | null; needsNote: string | null } {
  return {
    workingNote: insightText(insights.strengths),
    needsNote: insightText(insights.weaknesses),
  };
}
