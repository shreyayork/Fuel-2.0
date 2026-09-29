import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeManualCompanyDomain,
  resolveCatalogCompanyDomain,
  resolveDisplayCompanyDomain,
} from "./company-domain";

describe("normalizeManualCompanyDomain", () => {
  it("normalizes common URL shapes", () => {
    assert.equal(normalizeManualCompanyDomain("example.com"), "example.com");
    assert.equal(
      normalizeManualCompanyDomain("www.example.com"),
      "example.com",
    );
    assert.equal(
      normalizeManualCompanyDomain("https://example.com"),
      "example.com",
    );
    assert.equal(
      normalizeManualCompanyDomain("https://www.example.com/"),
      "example.com",
    );
  });
});

describe("resolveCatalogCompanyDomain", () => {
  it("prefers company website hostname over claiming user email domain", () => {
    assert.equal(
      resolveCatalogCompanyDomain({
        website: "https://sedarplus.ca",
        companyName: "sedarplus.ca",
        verifiedEmailDomain: "york.ie",
      }),
      "sedarplus.ca",
    );
  });

  it("strips www and path from website URLs", () => {
    assert.equal(
      resolveCatalogCompanyDomain({
        website: "https://www.acme.com/about",
        verifiedEmailDomain: "york.ie",
      }),
      "acme.com",
    );
  });

  it("uses company name when it looks like a hostname and website is missing", () => {
    assert.equal(
      resolveCatalogCompanyDomain({
        website: null,
        companyName: "sedarplus.ca",
        verifiedEmailDomain: "york.ie",
      }),
      "sedarplus.ca",
    );
  });

  it("does not treat legal company names as domains", () => {
    assert.equal(
      resolveCatalogCompanyDomain({
        website: null,
        companyName: "Acme Robotics Inc.",
        verifiedEmailDomain: "york.ie",
      }),
      "york.ie",
    );
  });

  it("falls back to verified email domain when no company website/name domain", () => {
    assert.equal(
      resolveCatalogCompanyDomain({
        website: null,
        companyName: "Acme",
        verifiedEmailDomain: "acme.io",
      }),
      "acme.io",
    );
  });
});

describe("resolveDisplayCompanyDomain", () => {
  it("prefers website hostname when stored domain was stamped from email", () => {
    assert.equal(
      resolveDisplayCompanyDomain({
        website: "https://sedarplus.ca",
        domain: "york.ie",
      }),
      "sedarplus.ca",
    );
  });

  it("keeps stored domain when website is absent", () => {
    assert.equal(
      resolveDisplayCompanyDomain({
        website: null,
        domain: "acme.io",
      }),
      "acme.io",
    );
  });
});
