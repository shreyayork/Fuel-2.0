import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companyHitToOnboardOption } from "./map-company-hit";

describe("companyHitToOnboardOption", () => {
  it("preserves funding when provided", () => {
    const option = companyHitToOnboardOption(
      {
        uuid: "u1",
        name: "Swiggy",
        domain: "swiggy.com",
        shortDescription: "Food delivery",
        categories: ["Delivery"],
        foundedOn: "2014",
        locationCity: "Bangalore",
        locationState: "KA",
        locationCountry: "India",
      },
      [
        {
          type: "Series A",
          amount: "$8M",
          date: "2015-01-01",
          investors: "Accel",
        },
      ],
    );
    assert.equal(option.funding.length, 1);
    assert.equal(option.funding[0]?.type, "Series A");
    assert.equal(option.funding[0]?.investors, "Accel");
  });

  it("defaults funding to empty array", () => {
    const option = companyHitToOnboardOption({
      uuid: "u1",
      name: "Acme",
      domain: "acme.com",
    });
    assert.deepEqual(option.funding, []);
  });

  it("maps OpenSearch logoUrl when present", () => {
    const option = companyHitToOnboardOption({
      uuid: "u1",
      name: "Ramp",
      domain: "ramp.com",
      logoUrl: "https://cdn.example.com/ramp.png",
    });
    assert.equal(option.logoUrl, "https://cdn.example.com/ramp.png");
  });

  it("falls back to fuel-data CDN when OpenSearch logoUrl missing", () => {
    const missing = companyHitToOnboardOption({
      uuid: "u1",
      name: "Acme",
      domain: "acme.com",
    });
    assert.equal(
      missing.logoUrl,
      "https://static.york.ie/images/companies/u1/logo",
    );

    const blank = companyHitToOnboardOption({
      uuid: "u2",
      name: "Blank",
      domain: "blank.com",
      logoUrl: "   ",
    });
    assert.equal(
      blank.logoUrl,
      "https://static.york.ie/images/companies/u2/logo",
    );
  });
});
