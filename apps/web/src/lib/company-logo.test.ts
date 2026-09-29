import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companyLogoUrl,
  isCatalogCompanyUuid,
  resolveCompanyLogoUrl,
} from "./company-logo";

describe("resolveCompanyLogoUrl", () => {
  it("prefers explicit logoUrl", () => {
    assert.equal(
      resolveCompanyLogoUrl("u1", "https://cdn.example.com/a.png"),
      "https://cdn.example.com/a.png",
    );
  });

  it("uses fuel-data CDN for non-catalog ids", () => {
    assert.equal(
      resolveCompanyLogoUrl("fuel-uuid"),
      "https://static.york.ie/images/companies/fuel-uuid/logo",
    );
  });

  it("skips CDN for catalog cat_ ids", () => {
    assert.equal(resolveCompanyLogoUrl("cat_abc"), undefined);
    assert.equal(resolveCompanyLogoUrl("cat_abc", "  "), undefined);
  });
});

describe("isCatalogCompanyUuid", () => {
  it("detects cat_ prefix", () => {
    assert.equal(isCatalogCompanyUuid("cat_x"), true);
    assert.equal(isCatalogCompanyUuid("abc"), false);
  });
});

describe("companyLogoUrl", () => {
  it("always returns a string for public search", () => {
    assert.equal(
      companyLogoUrl("cat_x"),
      "https://static.york.ie/images/companies/cat_x/logo",
    );
  });
});
