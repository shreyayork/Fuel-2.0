import {
  LIGHT,
  escapeHtml,
  firstNameFrom,
  lightBadge,
  lightFullWidthButton,
  wrapLightEmail,
  type RenderedEmail,
} from "./light-layout";
import { iconCheckCircle, iconClock } from "./email-icons";

function formatUsd(amount: number): string {
  if (Number.isInteger(amount)) return `$${amount}`;
  return `$${amount.toFixed(2)}`;
}

/**
 * Coupon / loyalty promo email — Figma Internal-Products node 987:7 (light).
 * Dark companion in Figma is not shipped (product mail uses light chrome).
 */
export interface CouponPromoEmailSpec {
  firstName?: string | null;
  email?: string | null;
  promotionCode: string;
  /** e.g. "50% off" or "$40 off" */
  benefitLabel: string;
  benefitType: "percent_off" | "amount_off";
  percentOff?: number | null;
  amountOffCents?: number | null;
  /** Human expiry, e.g. "November 30, 2025". Null = omit expiry line. */
  expiresAtLabel?: string | null;
  ctaHref: string;
  /**
   * Catalog annual Pro price in USD (for "normally $X / now $Y" when percent_off).
   * Omit when unknown — body falls back to benefit-only copy.
   */
  annualPriceUsd?: number | null;
}

const BENEFITS = [
  {
    title: "Your Company Score",
    body: "See your company score across R&D (Research & Development), Go to Market, and G&A (General & Administrative), with the top actions to take this week.",
  },
  {
    title: "Real Peer Benchmarks",
    body: "Compare your metrics to companies at your stage, model, and region on a real percentile curve.",
  },
  {
    title: "AI Playbooks",
    body: "Run operator-grade assessments on fundraising readiness, growth economics, competitive landscape, and more.",
  },
] as const;

function offerAccentPhrase(spec: CouponPromoEmailSpec): string {
  if (spec.benefitType === "percent_off" && spec.percentOff != null) {
    return `Claim your ${spec.percentOff}% loyalty offer`;
  }
  return "Claim your loyalty offer";
}

function ctaLabel(spec: CouponPromoEmailSpec): string {
  if (spec.benefitType === "percent_off" && spec.percentOff != null) {
    return `Claim ${spec.percentOff}% Off Now`;
  }
  return "Claim Your Offer";
}

function heroBody(spec: CouponPromoEmailSpec): string {
  const base =
    "We rebuilt Fuel from scratch for founders like you. Fuel 2.0 gives you a clear company score, real peer benchmarks, and an AI advisor that knows your data. ";
  if (
    spec.benefitType === "percent_off" &&
    spec.percentOff != null &&
    spec.annualPriceUsd != null &&
    spec.annualPriceUsd > 0
  ) {
    const discounted = Math.round(
      (spec.annualPriceUsd * (100 - spec.percentOff)) / 100,
    );
    return (
      base +
      `Lock in ${spec.percentOff}% off your annual plan: normally ${formatUsd(spec.annualPriceUsd)}/year, now just ${formatUsd(discounted)}/year. This offer won't last.`
    );
  }
  if (spec.benefitType === "amount_off" && spec.amountOffCents != null) {
    return (
      base +
      `Lock in ${formatUsd(spec.amountOffCents / 100)} off your Pro plan with code ${spec.promotionCode}. This offer won't last.`
    );
  }
  return (
    base +
    `Lock in ${spec.benefitLabel} on your Pro plan. This offer won't last.`
  );
}

function benefitRowsHtml(): string {
  return BENEFITS.map((item, i) => {
    const isLast = i === BENEFITS.length - 1;
    const isFirst = i === 0;
    // Figma: 1px #E2E8F0 rule + 16px gap under each block except last.
    const cellPad = [
      isFirst ? "" : "padding-top:16px;",
      isLast
        ? ""
        : `padding-bottom:16px;border-bottom:1px solid ${LIGHT.rule};`,
    ].join("");
    return `<tr><td style="${cellPad}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="28" valign="top" style="vertical-align:top;width:28px;padding-right:12px;">
            <div style="width:20px;height:20px;line-height:20px;text-align:center;">${iconCheckCircle(16)}</div>
          </td>
          <td valign="top" style="vertical-align:top;">
            <div style="font-family:${LIGHT.sans};font-size:14px;font-weight:600;line-height:20px;color:${LIGHT.ink};">${escapeHtml(item.title)}</div>
            <div style="margin-top:4px;font-family:${LIGHT.sans};font-size:13px;line-height:20px;color:${LIGHT.inkSoft};">${escapeHtml(item.body)}</div>
          </td>
        </tr>
      </table>
    </td></tr>`;
  }).join("");
}

/** Code pill — shrink letter-spacing for long promotion codes. */
function codePill(code: string): string {
  const long = code.length > 12;
  const size = long ? 20 : 28;
  const tracking = long ? "1px" : "2px";
  return `<span style="display:inline-block;background:${LIGHT.accent};border-radius:8px;padding:14px 32px;font-family:${LIGHT.sans};font-size:${size}px;font-weight:700;letter-spacing:${tracking};color:#FFFFFF;line-height:1.2;word-break:break-all;user-select:all;-webkit-user-select:all;">${escapeHtml(code)}</span>`;
}

export function renderCouponPromoEmail(
  spec: CouponPromoEmailSpec,
): RenderedEmail {
  const firstName = firstNameFrom({
    givenName: spec.firstName,
    email: spec.email,
  });
  const greeting = `Hi ${firstName},`;
  const accent = offerAccentPhrase(spec);
  const body = heroBody(spec);
  const cta = ctaLabel(spec);
  const expiry = spec.expiresAtLabel?.trim() || null;

  const couponCard = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;background:${LIGHT.accentSoft};border:1px solid ${LIGHT.accentBorder};border-radius:12px;">
            <tr><td style="padding:24px;text-align:center;">
              <div style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;color:${LIGHT.accent};text-transform:uppercase;">EXCLUSIVE UPGRADE PROMO</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" style="padding-top:16px;">${codePill(spec.promotionCode)}</td></tr></table>
              ${
                expiry
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;"><tr>
                <td style="vertical-align:middle;line-height:0;padding-right:6px;">${iconClock(16)}</td>
                <td style="vertical-align:middle;font-family:${LIGHT.sans};font-size:13px;color:${LIGHT.muted};">Expires ${escapeHtml(expiry)}</td>
              </tr></table>`
                  : ""
              }
            </td></tr>
          </table>`;

  const bodyRows = `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:32px;font-weight:700;line-height:38px;color:${LIGHT.ink};">
              Fuel 2.0 is live. <span style="color:${LIGHT.accent};">${escapeHtml(accent)}</span> before it expires.
            </td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:15px;font-weight:600;color:${LIGHT.ink};">${escapeHtml(greeting)}</td></tr>
            <tr><td style="padding-top:16px;font-family:${LIGHT.sans};font-size:14px;line-height:22px;color:${LIGHT.inkSoft};">${escapeHtml(body)}</td></tr>
          </table>

          ${couponCard}

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td style="font-family:${LIGHT.sans};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${LIGHT.muted};">WHAT YOU'LL GET IN FUEL 2.0</td></tr>
            <tr><td style="padding-top:16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${benefitRowsHtml()}
              </table>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td>${lightFullWidthButton(cta, spec.ctaHref)}</td></tr>
          </table>`;

  const html = wrapLightEmail({
    title: `Fuel 2.0 is live — ${accent}`,
    preheader: `Use code ${spec.promotionCode} for ${spec.benefitLabel} on Fuel Pro.`,
    headerRight: lightBadge("PLATFORM 2.0", "welcome"),
    bodyRows,
    footerNote:
      "You are receiving this re-engagement offer because you are an active Fuel platform customer.",
  });

  const text = [
    "Fuel 2.0 is live.",
    accent + " before it expires.",
    "",
    greeting,
    "",
    body,
    "",
    `Code: ${spec.promotionCode}`,
    expiry ? `Expires: ${expiry}` : null,
    "",
    "WHAT YOU'LL GET IN FUEL 2.0",
    ...BENEFITS.map((b) => `- ${b.title}: ${b.body}`),
    "",
    cta,
    spec.ctaHref,
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  return { html, text };
}
