import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeExternalHref, providerInitials } from "./service-provider-links";

describe("normalizeExternalHref", () => {
  it("returns null for empty or relative paths", () => {
    assert.equal(normalizeExternalHref(""), null);
    assert.equal(normalizeExternalHref("   "), null);
    assert.equal(normalizeExternalHref("/linkedin.com/company/acme"), null);
    assert.equal(normalizeExternalHref("/service-providers"), null);
  });

  it("prepends https for bare domains and linkedin paths", () => {
    assert.equal(normalizeExternalHref("example.com"), "https://example.com/");
    assert.equal(
      normalizeExternalHref("linkedin.com/company/acme"),
      "https://linkedin.com/company/acme",
    );
    assert.equal(
      normalizeExternalHref("www.example.com/about"),
      "https://www.example.com/about",
    );
  });

  it("preserves explicit http(s) URLs", () => {
    assert.equal(
      normalizeExternalHref("https://example.com"),
      "https://example.com/",
    );
    assert.equal(
      normalizeExternalHref("http://example.com/path"),
      "http://example.com/path",
    );
  });

  it("rejects non-http schemes", () => {
    assert.equal(normalizeExternalHref("mailto:hello@example.com"), null);
    assert.equal(normalizeExternalHref("javascript:alert(1)"), null);
  });
});

describe("providerInitials", () => {
  it("uses first two letters uppercased", () => {
    assert.equal(providerInitials("H Service provider"), "H ");
    assert.equal(providerInitials("Acme Legal"), "AC");
  });
});
