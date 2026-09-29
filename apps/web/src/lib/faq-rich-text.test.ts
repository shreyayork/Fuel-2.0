import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFaqMarkdownLink,
  getFaqActionType,
  isFaqActionLink,
  markdownToEditorHtml,
  markdownToTipTapDoc,
  normalizeFaqRichText,
  parseFaqInline,
  resolveFaqLinkHref,
  sanitizeFaqHref,
  serializeFaqInline,
  tipTapDocToMarkdown,
} from "./faq-rich-text";

describe("sanitizeFaqHref", () => {
  it("allows https, mailto, and in-app paths", () => {
    assert.equal(sanitizeFaqHref("https://york.ie/x"), "https://york.ie/x");
    assert.equal(sanitizeFaqHref("mailto:support@york.ie"), "mailto:support@york.ie");
    assert.equal(sanitizeFaqHref("/account/billing"), "/account/billing");
  });

  it("allows exact {{company_id}} token in in-app paths", () => {
    assert.equal(
      sanitizeFaqHref("/company/{{company_id}}?tab=intelligence"),
      "/company/{{company_id}}?tab=intelligence",
    );
    assert.equal(
      sanitizeFaqHref("/company/{{company_id}}/extra"),
      "/company/{{company_id}}/extra",
    );
  });

  it("allows action:ask-fuel reserved href", () => {
    assert.equal(sanitizeFaqHref("action:ask-fuel"), "action:ask-fuel");
    assert.equal(sanitizeFaqHref("ACTION:ASK-FUEL"), "action:ask-fuel");
    assert.equal(getFaqActionType("action:ask-fuel"), "ask-fuel");
    assert.equal(isFaqActionLink("https://york.ie"), false);
  });

  it("rejects unknown placeholders and javascript", () => {
    assert.equal(sanitizeFaqHref("javascript:alert(1)"), null);
    assert.equal(sanitizeFaqHref(""), null);
    assert.equal(sanitizeFaqHref("   "), null);
    assert.equal(sanitizeFaqHref("/company/{{companyid}}?tab=x"), null);
    assert.equal(sanitizeFaqHref("/company/{company_id}?tab=x"), null);
    assert.equal(sanitizeFaqHref("https://evil/{{company_id}}"), null);
  });
});

describe("resolveFaqLinkHref", () => {
  it("leaves non-token hrefs unchanged", () => {
    assert.deepEqual(resolveFaqLinkHref("/account/billing", null), {
      ok: true,
      href: "/account/billing",
    });
  });

  it("substitutes company id and encodes it", () => {
    assert.deepEqual(
      resolveFaqLinkHref("/company/{{company_id}}?tab=intelligence", "abc-123"),
      { ok: true, href: "/company/abc-123?tab=intelligence" },
    );
    assert.deepEqual(
      resolveFaqLinkHref("/company/{{company_id}}?tab=overview", "a/b"),
      { ok: true, href: "/company/a%2Fb?tab=overview" },
    );
  });

  it("replaces multiple tokens", () => {
    assert.deepEqual(
      resolveFaqLinkHref("/x/{{company_id}}/y/{{company_id}}", "u1"),
      { ok: true, href: "/x/u1/y/u1" },
    );
  });

  it("fails closed when company id missing — never returns literal token", () => {
    const r = resolveFaqLinkHref("/company/{{company_id}}?tab=dataroom", null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "unresolved_company");
  });

  it("passes through Ask Fuel action href", () => {
    assert.deepEqual(resolveFaqLinkHref("action:ask-fuel", null), {
      ok: true,
      href: "action:ask-fuel",
    });
  });
});

describe("parseFaqInline", () => {
  it("keeps plain text unchanged as one segment", () => {
    assert.deepEqual(parseFaqInline("Hello world"), [{ type: "text", text: "Hello world" }]);
  });

  it("parses multiple links", () => {
    assert.deepEqual(parseFaqInline("See [Overview](/overview) and [Ask Fuel](/ask)."), [
      { type: "text", text: "See " },
      { type: "link", text: "Overview", href: "/overview" },
      { type: "text", text: " and " },
      { type: "link", text: "Ask Fuel", href: "/ask" },
      { type: "text", text: "." },
    ]);
  });

  it("leaves unsafe link markdown as text", () => {
    const raw = "Bad [x](javascript:alert(1)) here";
    const segs = parseFaqInline(raw);
    assert.ok(segs.some((s) => s.type === "text" && s.text.includes("javascript:")));
    assert.ok(!segs.some((s) => s.type === "link"));
  });
});

describe("buildFaqMarkdownLink", () => {
  it("requires text and valid href", () => {
    assert.equal(buildFaqMarkdownLink("", "https://a.com").ok, false);
    assert.equal(buildFaqMarkdownLink("A", "").ok, false);
    const ok = buildFaqMarkdownLink("Billing", "/account/billing");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.markdown, "[Billing](/account/billing)");
  });
});

describe("normalizeFaqRichText", () => {
  it("round-trips safe links", () => {
    const raw = "Open [Billing](/account/billing) now";
    assert.equal(normalizeFaqRichText(raw), raw);
    assert.equal(serializeFaqInline(parseFaqInline(raw)), raw);
  });
});

describe("markdownToEditorHtml", () => {
  it("renders links as anchors and escapes text", () => {
    const html = markdownToEditorHtml("See [A](/a) & <b>");
    assert.match(html, /<a href="\/a" data-faq-link="1">A<\/a>/);
    assert.match(html, /&amp;/);
    assert.match(html, /&lt;b&gt;/);
  });
});

describe("markdown ↔ TipTap doc", () => {
  it("round-trips plain text", () => {
    const raw = "Hello world";
    assert.equal(tipTapDocToMarkdown(markdownToTipTapDoc(raw)), raw);
  });

  it("round-trips a single link", () => {
    const raw = "Go to [Billing](/account/billing) now";
    assert.equal(tipTapDocToMarkdown(markdownToTipTapDoc(raw)), raw);
  });

  it("round-trips multiple links", () => {
    const raw = "[Portfolios](/portfolio), [Pipeline](/pipeline), and [Watchlists](/watchlists).";
    assert.equal(tipTapDocToMarkdown(markdownToTipTapDoc(raw)), raw);
  });

  it("round-trips newlines via hardBreak", () => {
    const raw = "Line one\nLine two with [x](/x)";
    assert.equal(tipTapDocToMarkdown(markdownToTipTapDoc(raw)), raw);
  });

  it("loads empty / malformed as plain", () => {
    assert.equal(tipTapDocToMarkdown(markdownToTipTapDoc("")), "");
    // Unsafe href stays literal text (not a link mark).
    const bad = "See [bad](javascript:alert(1)) ok";
    const out = tipTapDocToMarkdown(markdownToTipTapDoc(bad));
    assert.equal(out, bad);
  });

  it("builds expected tip-tap shape for a link", () => {
    const doc = markdownToTipTapDoc("[A](/a)");
    assert.equal(doc.type, "doc");
    assert.equal(doc.content[0]?.type, "paragraph");
    const node = doc.content[0]?.content?.[0];
    assert.ok(node && node.type === "text");
    if (node && node.type === "text") {
      assert.equal(node.text, "A");
      assert.equal(node.marks?.[0]?.attrs.href, "/a");
    }
  });
});
