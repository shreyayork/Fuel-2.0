import {
  LIGHT,
  escapeHtml,
  lightFullWidthButton,
  wrapLightEmail,
  type RenderedEmail,
} from "./light-layout";
import { appHomeUrl } from "./links";

/**
 * Subscription / top-up receipt (F20A-167) — Figma node 468:5 light.
 * Dark companion in Figma is not shipped (product mail uses light chrome).
 */
export interface PaymentReceiptSpec {
  kind: "subscription" | "topup" | "other";
  firstName?: string | null;
  invoiceNumber: string;
  /** Optional human amount string already formatted by caller (e.g. "$49.00"). */
  amountLabel?: string | null;
  /** Plan / product label (Stripe line description), e.g. "Fuel Pro". */
  planLabel?: string | null;
  /** Human payment date (e.g. "August 14, 2026"). */
  paidAtLabel?: string | null;
  /** Kept for callers; Figma body copy does not surface a credit count. */
  creditsAdded?: number | null;
}

export function renderPaymentReceiptEmail(spec: PaymentReceiptSpec): RenderedEmail {
  const greeting = spec.firstName?.trim()
    ? `Hi ${spec.firstName.trim()},`
    : "Hi,";
  const headline = "Payment confirmed.";
  const receiptLine = `Your Fuel receipt — Invoice ${spec.invoiceNumber}`;
  const openHref = appHomeUrl();

  const summaryRows: Array<{ label: string; value: string }> = [];
  if (spec.planLabel?.trim()) {
    summaryRows.push({ label: "Plan", value: spec.planLabel.trim() });
  }
  if (spec.amountLabel?.trim()) {
    summaryRows.push({ label: "Amount paid", value: spec.amountLabel.trim() });
  }
  if (spec.paidAtLabel?.trim()) {
    summaryRows.push({ label: "Date", value: spec.paidAtLabel.trim() });
  }
  summaryRows.push({ label: "Invoice", value: spec.invoiceNumber });

  const summaryBody = summaryRows
    .map((row, i) => {
      const border =
        i < summaryRows.length - 1
          ? `border-bottom:1px solid ${LIGHT.rule};`
          : "";
      return `<tr>
        <td style="padding:12px 0;${border}font-family:${LIGHT.sans};font-size:14px;font-weight:500;color:${LIGHT.inkSoft};">${escapeHtml(row.label)}</td>
        <td align="right" style="padding:12px 0;${border}font-family:${LIGHT.sans};font-size:14px;font-weight:700;color:${LIGHT.ink};">${escapeHtml(row.value)}</td>
      </tr>`;
    })
    .join("");

  const footerNote =
    spec.kind === "subscription"
      ? "You are receiving this because you have an active Fuel subscription."
      : "You're receiving this because a payment was completed on Fuel.";

  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:32px;font-weight:700;line-height:38px;color:${LIGHT.ink};">${escapeHtml(headline)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:18px;font-weight:700;line-height:24px;color:${LIGHT.accent};">${escapeHtml(receiptLine)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:15px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(greeting)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              Payment confirmed. Your invoice is attached to this email for your records.
            </td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;font-weight:600;color:${LIGHT.ink};">Here's a quick summary:</td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;background:${LIGHT.tileBg};border:1px solid ${LIGHT.rule};border-radius:12px;">
            <tr><td style="padding:12px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${summaryBody}
              </table>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">
              Your credits are live and ready to use. Head into Fuel to put them to work, generate intelligence, run playbooks, ask Fuel AI anything.
            </td></tr>
            <tr><td style="padding-top:24px;">${lightFullWidthButton("Open Fuel →", openHref)}</td></tr>
            <tr><td style="padding-top:24px;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.muted};">
              If you have any questions about your invoice or plan, reply to this email and we'll sort it out.
            </td></tr>
            <tr><td style="padding-top:24px;font-family:${LIGHT.sans};font-size:14px;color:${LIGHT.inkSoft};">Thanks for being on Fuel.</td></tr>
            <tr><td style="font-family:${LIGHT.sans};font-size:14px;font-weight:700;color:${LIGHT.ink};padding-top:4px;">The Fuel team at York IE</td></tr>
            <tr><td style="padding-top:4px;font-family:${LIGHT.sans};font-size:13px;">
              <a href="mailto:fuel@york.ie" style="color:${LIGHT.accent};text-decoration:none;">fuel@york.ie</a>
            </td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: headline,
    preheader: `Payment confirmed — invoice ${spec.invoiceNumber} attached.`,
    headerRight: `<span style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;color:${LIGHT.muted};">Billing</span>`,
    bodyRows,
    footerNote,
  });

  const text = [
    headline,
    receiptLine,
    "",
    greeting,
    "",
    "Payment confirmed. Your invoice is attached to this email for your records.",
    "",
    "Here's a quick summary:",
    ...summaryRows.map((r) => `${r.label}: ${r.value}`),
    "",
    "Your credits are live and ready to use. Head into Fuel to put them to work, generate intelligence, run playbooks, ask Fuel AI anything.",
    "",
    `Open Fuel: ${openHref}`,
    "",
    "If you have any questions about your invoice or plan, reply to this email and we'll sort it out.",
    "",
    "Thanks for being on Fuel.",
    "The Fuel team at York IE",
    "fuel@york.ie",
  ].join("\n");

  return { html, text };
}
