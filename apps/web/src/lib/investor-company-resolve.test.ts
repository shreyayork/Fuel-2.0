import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCompanyName,
  uniqueDomainToUuid,
  uniqueNormalizedNameToUuid,
} from "./investor-company-resolve";

describe("uniqueNormalizedNameToUuid", () => {
  it("maps unique normalized names to a single uuid", () => {
    const map = uniqueNormalizedNameToUuid([
      { uuid: "u-spark", name: "Spark Crowdfunding" },
      { uuid: "u-acme", name: "Acme Ventures Inc" },
    ]);
    assert.equal(map.get(normalizeCompanyName("spark crowdfunding")!), "u-spark");
    assert.equal(map.get(normalizeCompanyName("ACME VENTURES")!), "u-acme");
  });

  it("omits ambiguous duplicate normalized names", () => {
    const map = uniqueNormalizedNameToUuid([
      { uuid: "u-a", name: "Grey Matter" },
      { uuid: "u-b", name: "grey matter" },
    ]);
    assert.equal(map.has(normalizeCompanyName("Grey Matter")!), false);
  });

  it("ignores empty names", () => {
    const map = uniqueNormalizedNameToUuid([{ uuid: "u-x", name: "" }]);
    assert.equal(map.size, 0);
  });
});

describe("uniqueDomainToUuid", () => {
  const norm = (raw: string | null | undefined) => {
    if (!raw) return null;
    const d = raw.trim().toLowerCase().replace(/^www\./, "");
    return d.includes(".") ? d : null;
  };

  it("maps unique domains", () => {
    const map = uniqueDomainToUuid(
      [
        { uuid: "u-1", domain: "spark.com" },
        { uuid: "u-2", domain: "acme.vc" },
      ],
      norm,
    );
    assert.equal(map.get("spark.com"), "u-1");
    assert.equal(map.get("acme.vc"), "u-2");
  });

  it("omits domains shared by multiple orgs", () => {
    const map = uniqueDomainToUuid(
      [
        { uuid: "u-a", domain: "shared.io" },
        { uuid: "u-b", domain: "shared.io" },
      ],
      norm,
    );
    assert.equal(map.has("shared.io"), false);
  });
});
