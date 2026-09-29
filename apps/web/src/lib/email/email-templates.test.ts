import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderVerifyAccountEmail, renderPasswordResetEmail } from "./auth-codes";
import { firstNameFrom } from "./light-layout";
import { renderCouponPromoEmail } from "./coupon-promo";
import { renderPaymentReceiptEmail } from "./payment-receipt";
import {
  isQuarterStartInNewYork,
  newYorkYmd,
  quarterLabelsForDate,
  renderQuarterlyUpdateEmail,
} from "./quarterly-update";
import {
  digestBadgeForScore,
  notesFromTrackInsights,
  renderWeeklyDigestEmail,
} from "./weekly-digest";
import { renderFounderWelcomeEmail } from "./welcome-founder";
import { renderInvestorWelcomeEmail } from "./welcome-investor";
import {
  appHomeUrl,
  integrationsUrl,
  overviewBenchmarkUrl,
  portfolioUrl,
  SERVICES_REQUEST_URL,
} from "./links";
import { EMAIL_ASSET_PATHS, assertLightEmailLogoBranding } from "./email-assets";

const HTTPS_IMG = /src="https:\/\/[^"]+\/email\/[^"]+\.png"/g;

function assertNoBrokenAssetUrls(html: string): void {
  assert.doesNotMatch(html, /data:image\//);
  assert.doesNotMatch(html, /src="\/email\//);
  assert.doesNotMatch(html, /src="http:\/\/localhost/);
}

describe("firstNameFrom", () => {
  it("prefers given name token", () => {
    assert.equal(firstNameFrom({ givenName: "James Bond", email: "x@y.com" }), "James");
  });
  it("falls back to email local part", () => {
    assert.equal(firstNameFrom({ email: "sarah.k@york.ie" }), "Sarah");
  });
});

describe("F20A-167 light email branding", () => {
  it("uses hosted YORK IE logo in every product email template", () => {
    const samples = [
      renderFounderWelcomeEmail({ firstName: "James", companyUuid: "co_test" }).html,
      renderInvestorWelcomeEmail({ firstName: "Sarah" }).html,
      renderWeeklyDigestEmail({
        companyUuid: "co_test",
        weekOfLabel: "WEEK OF JULY 28",
        scorecard: [],
        intelligence: [],
        initiatives: [],
      }).html,
      renderQuarterlyUpdateEmail({
        firstName: "James",
        companyUuid: "co_test",
        completedQuarterLabel: "Q3",
        nextQuarterLabel: "Q4",
      }).html,
      renderVerifyAccountEmail({ firstName: "James", code: "{####}", expiryHours: 24 }).html,
      renderPasswordResetEmail({ firstName: "James", code: "{####}", expiryHours: 24 }).html,
      renderPaymentReceiptEmail({
        kind: "subscription",
        firstName: "James",
        invoiceNumber: "INV-100",
        amountLabel: "$49.00",
      }).html,
      renderCouponPromoEmail({
        firstName: "James",
        promotionCode: "FUEL50",
        benefitLabel: "50% off",
        benefitType: "percent_off",
        percentOff: 50,
        expiresAtLabel: "November 30, 2025",
        ctaHref: "https://v2.fuel.york.ie/account/billing",
        annualPriceUsd: 360,
      }).html,
    ];
    for (const html of samples) {
      assertLightEmailLogoBranding(html);
    }
  });
});

describe("coupon promo email", () => {
  it("renders Figma loyalty layout with dynamic code and expiry", () => {
    const { html, text } = renderCouponPromoEmail({
      firstName: "James",
      promotionCode: "FUEL50",
      benefitLabel: "50% off",
      benefitType: "percent_off",
      percentOff: 50,
      expiresAtLabel: "November 30, 2025",
      ctaHref: "https://v2.fuel.york.ie/account/billing",
      annualPriceUsd: 360,
    });
    assert.match(html, /Fuel 2\.0 is live\./);
    assert.match(html, /Claim your 50% loyalty offer/);
    assert.match(html, /before it expires\./);
    assert.match(
      html,
      /We rebuilt Fuel from scratch for founders like you\. Fuel 2\.0 gives you a clear company score, real peer benchmarks, and an AI advisor that knows your data\. Lock in 50% off your annual plan: normally \$360\/year, now just \$180\/year\. This offer won&#39;t last\./,
    );
    assert.match(
      text,
      /We rebuilt Fuel from scratch for founders like you\. Fuel 2\.0 gives you a clear company score, real peer benchmarks, and an AI advisor that knows your data\. Lock in 50% off your annual plan: normally \$360\/year, now just \$180\/year\. This offer won't last\./,
    );
    assert.match(html, /EXCLUSIVE UPGRADE PROMO/);
    assert.match(html, /FUEL50/);
    assert.match(html, /Expires November 30, 2025/);
    assert.match(html, /PLATFORM 2\.0/);
    assert.match(html, /WHAT YOU'LL GET IN FUEL 2\.0/);
    // Two inter-benefit dividers (not after last block).
    assert.equal(
      (html.match(/border-bottom:1px solid #E2E8F0/g) ?? []).length,
      2,
    );
    assert.match(html, /Your Company Score/);
    assert.match(
      html,
      /See your company score across R&amp;D \(Research &amp; Development\), Go to Market, and G&amp;A \(General &amp; Administrative\), with the top actions to take this week\./,
    );
    assert.match(html, /Real Peer Benchmarks/);
    assert.match(
      html,
      /Compare your metrics to companies at your stage, model, and region on a real percentile curve\./,
    );
    assert.match(html, /AI Playbooks/);
    assert.match(
      html,
      /Run operator-grade assessments on fundraising readiness, growth economics, competitive landscape, and more\./,
    );
    assert.match(html, /Claim 50% Off Now/);
    assert.match(
      html,
      /You are receiving this re-engagement offer because you are an active Fuel platform customer\./,
    );
    assert.match(html, new RegExp(EMAIL_ASSET_PATHS.iconClock16.replace(/\//g, "\\/")));
    assert.match(text, /Code: FUEL50/);
    assert.match(text, /WHAT YOU'LL GET IN FUEL 2\.0/);
    assertNoBrokenAssetUrls(html);
    assertLightEmailLogoBranding(html);
  });
});

describe("founder welcome email", () => {
  it("includes benchmark + services CTAs and greeting", () => {
    const { html, text } = renderFounderWelcomeEmail({
      firstName: "James",
      companyUuid: "co_test",
    });
    assert.match(html, /Hi James,/);
    assert.match(html, /Complete Your Benchmark/);
    assert.match(html, /Ask the team a question/);
    assert.match(html, /\/company\/co_test\?/);
    assert.match(html, /benchmark=1/);
    assert.match(html, /york\.ie\/services-request/);
    assert.match(text, /Complete Your Benchmark/);
    assert.ok(text.includes(overviewBenchmarkUrl("co_test")));
    assert.ok(text.includes(SERVICES_REQUEST_URL));
  });

  it("uses absolute HTTPS PNG icons in Ready Now cards", () => {
    const { html } = renderFounderWelcomeEmail({
      firstName: "James",
      companyUuid: "co_test",
    });
    assert.match(html, /Workspace live/);
    assert.match(html, /Intelligence running/);
    assert.match(html, /Fuel AI ready/);
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconCheckCircle20));
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconActivity20));
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconCpu20));
    assert.equal((html.match(HTTPS_IMG) ?? []).length >= 3, true);
    assertNoBrokenAssetUrls(html);
  });

  it("uses absolute HTTPS YORK IE logo mark", () => {
    const { html } = renderFounderWelcomeEmail({
      firstName: "James",
      companyUuid: "co_test",
    });
    assert.match(html, /alt="York IE Fuel Platform"/);
    assert.ok(html.includes(EMAIL_ASSET_PATHS.logoMarkLg));
    assert.ok(html.includes(EMAIL_ASSET_PATHS.logoMarkSm));
    assertNoBrokenAssetUrls(html);
  });
});

describe("investor welcome email", () => {
  it("links HubSpot + portfolio CTAs", () => {
    const { html } = renderInvestorWelcomeEmail({ firstName: "Sarah" });
    assert.match(html, /Hi Sarah,/);
    assert.match(html, /Get started on Fuel/);
    assert.match(html, new RegExp(integrationsUrl().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp(portfolioUrl().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("uses absolute HTTPS PNG icons beside each CTA label", () => {
    const { html } = renderInvestorWelcomeEmail({ firstName: "Sarah" });
    assert.match(html, /Link HubSpot/);
    assert.match(html, /Build portfolio/);
    assert.match(html, /Run benchmarks/);
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconBriefcase18));
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconUsers18));
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconRadio18));
    assert.equal((html.match(HTTPS_IMG) ?? []).length >= 3, true);
    assertNoBrokenAssetUrls(html);
  });
});

describe("weekly digest email", () => {
  it("marks score <=50 as PRIORITY and renders Working / Needs improvement bullets", () => {
    assert.equal(digestBadgeForScore(50), "PRIORITY");
    assert.equal(digestBadgeForScore(51), "WORKING");
    const { html, text } = renderWeeklyDigestEmail({
      companyUuid: "co_test",
      weekOfLabel: "WEEK OF JULY 28",
      scorecard: [
        {
          label: "G&A",
          score: 50,
          badge: "PRIORITY",
          workingNote: "Close process tightened",
          needsNote: "Forecast loop still manual",
        },
      ],
      intelligence: [{ line: "GTM | Pipeline - Coverage holding" }],
      initiatives: [{ name: "ICP playbook", progressPct: 40 }],
    });
    assert.match(html, /PRIORITY/);
    assert.match(html, /Working — Close process tightened/);
    assert.match(html, /Needs improvement — Forecast loop still manual/);
    assert.match(html, /Talk to York IE/);
    assert.match(html, new RegExp(SERVICES_REQUEST_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(text, /G&A: 50 \[PRIORITY\].*Working — Close process tightened/);
    assert.match(text, /Needs improvement — Forecast loop still manual/);
  });

  it("keeps score boxes but omits badge cards when notes are absent", () => {
    const { html } = renderWeeklyDigestEmail({
      companyUuid: "co_test",
      weekOfLabel: "WEEK OF JULY 28",
      scorecard: [
        { label: "R&D", score: 72, badge: "WORKING" },
        { label: "GTM", score: 40, badge: "PRIORITY" },
        { label: "G&A", score: 55, badge: "WORKING" },
      ],
      intelligence: [],
      initiatives: [],
    });
    assert.match(html, />72</);
    assert.match(html, />40</);
    assert.match(html, />55</);
    assert.match(html, /R&amp;D/);
    assert.match(html, /GTM/);
    assert.match(html, /G&amp;A/);
    assert.doesNotMatch(html, /WORKING<\/span>/);
    assert.doesNotMatch(html, /PRIORITY<\/span>/);
    assert.doesNotMatch(html, /Working —/);
    assert.doesNotMatch(html, /Needs improvement —/);
  });

  it("maps track insights into digest notes", () => {
    const notes = notesFromTrackInsights({
      strengths: [{ label: "Team size", detail: "Above median · Benchmark" }],
      weaknesses: [{ label: "Gross margin", detail: "Below median · Benchmark" }],
    });
    assert.equal(notes.workingNote, "Team size: Above median · Benchmark");
    assert.equal(notes.needsNote, "Gross margin: Below median · Benchmark");
    assert.equal(
      notesFromTrackInsights({ strengths: [], weaknesses: [] }).workingNote,
      null,
    );
  });

  it("renders without scorecard when empty", () => {
    const { html } = renderWeeklyDigestEmail({
      companyUuid: "co_test",
      weekOfLabel: "WEEK OF JULY 28",
      scorecard: [],
      intelligence: [],
      initiatives: [],
    });
    assert.match(html, /Weekly Digest/);
    assert.doesNotMatch(html, /Initiatives In Motion/);
  });
});

describe("quarterly update email", () => {
  it("includes profile CTA and quarter labels", () => {
    const { html } = renderQuarterlyUpdateEmail({
      firstName: "James",
      companyUuid: "co_test",
      completedQuarterLabel: "Q3",
      nextQuarterLabel: "Q4",
    });
    assert.match(html, /Q3 is done/);
    assert.match(html, /Update your Fuel profile/);
    assert.match(html, /Update My Fuel Profile/);
    assert.match(html, /Here(?:'|&#39;)s to a strong Q4/);
    assert.match(html, /\/company\/co_test\?/);
    assert.match(html, /benchmark=1/);
  });

  it("renders What to update icons and green credits highlight", () => {
    const { html } = renderQuarterlyUpdateEmail({
      firstName: "James",
      companyUuid: "co_test",
      completedQuarterLabel: "Q3",
      nextQuarterLabel: "Q4",
    });
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconTrendingUp20));
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconFlag20));
    assert.ok(html.includes(EMAIL_ASSET_PATHS.iconUser20));
    assert.match(html, /Credits stay active with fresh data/);
    assert.match(html, /background:#F0FDF4/);
    assert.match(html, /border:1px solid #00E5A0/);
    assertNoBrokenAssetUrls(html);
  });

  it("computes completed vs next quarter on quarter start", () => {
    const jan = quarterLabelsForDate(new Date(Date.UTC(2026, 0, 1)));
    assert.equal(jan.completedQuarterLabel, "Q4");
    assert.equal(jan.nextQuarterLabel, "Q1");
    assert.equal(jan.periodKey, "2025-Q4");
  });
});

describe("auth code emails", () => {
  it("verify account keeps Cognito placeholder-friendly code slot in green OTP card", () => {
    const { html } = renderVerifyAccountEmail({
      firstName: "James",
      code: "{####}",
      expiryHours: 24,
    });
    assert.match(html, /Hi James,/);
    assert.match(html, /{####}/);
    assert.match(html, /expires in 24 hours/);
    assert.match(html, /Secure Verification Code/);
    assert.match(html, /background:#F0FDF4/);
    assert.match(html, /background:#009E6D/);
    assert.match(html, /user-select:all/);
  });

  it("password reset shows green OTP pill with select-friendly styling", () => {
    const { html } = renderPasswordResetEmail({
      firstName: "James",
      code: "{####}",
      expiryHours: 24,
    });
    assert.match(html, /Reset your Fuel password/);
    assert.match(html, /{####}/);
    assert.match(html, /background:#009E6D/);
    assert.match(html, /user-select:all/);
  });
});

describe("payment receipt email", () => {
  it("matches Figma 468:5 light copy and summary rows", () => {
    const sub = renderPaymentReceiptEmail({
      kind: "subscription",
      firstName: "James",
      invoiceNumber: "LKY775MK-0042",
      amountLabel: "$2,500.00",
      planLabel: "Growth",
      paidAtLabel: "August 14, 2026",
    });
    assert.match(sub.html, /Payment confirmed\./);
    assert.match(sub.html, /Your Fuel receipt — Invoice LKY775MK-0042/);
    assert.match(sub.html, /Hi James,/);
    assert.match(sub.html, /Here's a quick summary:/);
    assert.match(sub.html, />Plan</);
    assert.match(sub.html, /Growth/);
    assert.match(sub.html, /Amount paid/);
    assert.match(sub.html, /\$2,500\.00/);
    assert.match(sub.html, /August 14, 2026/);
    assert.match(sub.html, /Open Fuel →/);
    assert.match(sub.html, /fuel@york\.ie/);
    assert.match(sub.html, />Billing</);
    assert.match(sub.html, /active Fuel subscription/);
    assert.match(sub.text, /Open Fuel:/);
    assert.ok(sub.html.includes(appHomeUrl()) || sub.text.includes(appHomeUrl()));
  });

  it("omits optional Plan/Amount/Date rows without breaking layout", () => {
    const sparse = renderPaymentReceiptEmail({
      kind: "topup",
      firstName: "James",
      invoiceNumber: "INV-101",
    });
    assert.match(sparse.html, /Payment confirmed\./);
    assert.match(sparse.html, /Invoice/);
    assert.match(sparse.html, /INV-101/);
    assert.doesNotMatch(sparse.html, />Plan</);
    assert.doesNotMatch(sparse.html, /Amount paid/);
    assert.match(sparse.html, /payment was completed on Fuel/);
  });

  it("renders plan name when planLabel is supplied from Stripe line item", () => {
    const sub = renderPaymentReceiptEmail({
      kind: "subscription",
      firstName: "James",
      invoiceNumber: "INV-200",
      planLabel: "Fuel Pro",
      amountLabel: "$49.00",
    });
    assert.match(sub.html, />Plan</);
    assert.match(sub.html, /Fuel Pro/);
  });
});

describe("quarterly schedule helpers", () => {
  it("detects NY quarter start days", () => {
    // 2026-01-01 12:00 UTC is still Jan 1 in New York.
    assert.equal(isQuarterStartInNewYork(new Date("2026-01-01T12:00:00Z")), true);
    assert.equal(isQuarterStartInNewYork(new Date("2026-01-02T12:00:00Z")), false);
    const ymd = newYorkYmd(new Date("2026-04-01T12:00:00Z"));
    assert.equal(ymd.month, 4);
    assert.equal(ymd.day, 1);
  });
});
