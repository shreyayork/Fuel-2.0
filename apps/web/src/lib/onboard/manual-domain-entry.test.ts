import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hostnameFromDomainOrUrl,
  normalizeManualCompanyDomain,
} from "./company-domain";
import {
  ONBOARD_CANT_FIND_COMPANY_LABEL,
  parseManualDomainSubmission,
} from "./manual-domain-entry";
import { onboardOptionFromManualDomain } from "./map-company-hit";

describe("normalizeManualCompanyDomain", () => {
  it("accepts bare domains", () => {
    assert.equal(normalizeManualCompanyDomain("example.com"), "example.com");
  });

  it("strips https and trailing slash/path", () => {
    assert.equal(
      normalizeManualCompanyDomain("https://example.com/"),
      "example.com",
    );
    assert.equal(
      normalizeManualCompanyDomain("https://www.example.com/about"),
      "example.com",
    );
  });

  it("strips www", () => {
    assert.equal(
      normalizeManualCompanyDomain("www.example.com"),
      "example.com",
    );
  });

  it("trims whitespace", () => {
    assert.equal(
      normalizeManualCompanyDomain("  https://acme.io  "),
      "acme.io",
    );
  });

  it("rejects empty and invalid", () => {
    assert.equal(normalizeManualCompanyDomain(""), null);
    assert.equal(normalizeManualCompanyDomain("   "), null);
    assert.equal(normalizeManualCompanyDomain("not a domain"), null);
    assert.equal(normalizeManualCompanyDomain("localhost"), null);
  });
});

describe("hostnameFromDomainOrUrl parity", () => {
  it("matches normalizeManualCompanyDomain", () => {
    const samples = [
      "example.com",
      "www.example.com",
      "https://example.com",
      "https://www.example.com/",
    ];
    for (const s of samples) {
      assert.equal(hostnameFromDomainOrUrl(s), normalizeManualCompanyDomain(s));
    }
  });
});

describe("parseManualDomainSubmission", () => {
  it("rejects empty", () => {
    const r = parseManualDomainSubmission("", normalizeManualCompanyDomain);
    assert.equal(r.ok, false);
  });

  it("accepts valid and returns normalized domain", () => {
    const r = parseManualDomainSubmission(
      "https://www.york.ie/team",
      normalizeManualCompanyDomain,
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.domain, "york.ie");
  });
});

describe("onboardOptionFromManualDomain", () => {
  it("builds synthetic option with empty id for stream-by-domain", () => {
    const opt = onboardOptionFromManualDomain("https://www.acme.io/x");
    assert.ok(opt);
    assert.equal(opt?.id, "");
    assert.equal(opt?.domain, "acme.io");
    assert.equal(opt?.name, "Acme");
  });

  it("returns null for invalid", () => {
    assert.equal(onboardOptionFromManualDomain("nope"), null);
  });
});

describe("manual domain UX copy", () => {
  it("exposes Can't find your company? label", () => {
    assert.equal(ONBOARD_CANT_FIND_COMPANY_LABEL, "Can't find your company?");
  });
});
