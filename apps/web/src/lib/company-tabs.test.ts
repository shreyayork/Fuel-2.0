import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companyPublicNavItems,
  resolveCompanyTabForClaim,
} from "./company-tabs";

describe("companyPublicNavItems", () => {
  it("includes Data Room when company is claimed", () => {
    const items = companyPublicNavItems({
      isClaimedCompany: true,
      initiativeCount: 2,
      artifactCount: 1,
      dataRoomCount: 3,
    });
    assert.deepEqual(
      items.map((i) => i.key),
      ["overview", "intelligence", "dataroom", "initiatives", "research"],
    );
    assert.equal(items.find((i) => i.key === "dataroom")?.count, 3);
  });

  it("omits Data Room when company is unclaimed", () => {
    const items = companyPublicNavItems({
      isClaimedCompany: false,
      initiativeCount: 2,
      artifactCount: 1,
      dataRoomCount: 3,
    });
    assert.deepEqual(
      items.map((i) => i.key),
      ["overview", "intelligence", "initiatives", "research"],
    );
    assert.ok(!items.some((i) => i.key === "dataroom"));
  });

  it("preserves remaining tab order without Data Room", () => {
    const claimed = companyPublicNavItems({ isClaimedCompany: true }).map(
      (i) => i.key,
    );
    const unclaimed = companyPublicNavItems({ isClaimedCompany: false }).map(
      (i) => i.key,
    );
    assert.deepEqual(
      unclaimed,
      claimed.filter((key) => key !== "dataroom"),
    );
  });
});

describe("resolveCompanyTabForClaim", () => {
  it("keeps dataroom for claimed company", () => {
    assert.equal(resolveCompanyTabForClaim("dataroom", true), "dataroom");
  });

  it("falls back to overview for unclaimed dataroom deep-link", () => {
    assert.equal(resolveCompanyTabForClaim("dataroom", false), "overview");
  });

  it("leaves other tabs unchanged", () => {
    assert.equal(resolveCompanyTabForClaim("intelligence", false), "intelligence");
    assert.equal(resolveCompanyTabForClaim("overview", true), "overview");
  });
});
