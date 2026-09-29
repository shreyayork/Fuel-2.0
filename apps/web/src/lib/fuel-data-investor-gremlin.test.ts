import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BACKED_COMPANIES_TRAVERSAL,
  buildGetInvestorGremlin,
  buildSearchInvestorsGremlin,
  investorSearchAttempts,
  INVESTOR_ORG_LABEL,
} from "./fuel-data-investor-gremlin";

describe("buildSearchInvestorsGremlin", () => {
  it("uses organization label + exact domain (not investor / textContainsFuzzy)", () => {
    const g = buildSearchInvestorsGremlin({ domain: "100x.vc", limit: 5 });
    assert.equal(INVESTOR_ORG_LABEL, "organization");
    assert.match(g, /hasLabel\('organization'\)/);
    assert.match(g, /has\('domain','100x\.vc'\)/);
    assert.doesNotMatch(g, /hasLabel\('investor'\)/);
    assert.doesNotMatch(g, /textContainsFuzzy/);
    assert.match(g, /\.limit\(5\)/);
  });

  it("strips www and lowercases domain", () => {
    const g = buildSearchInvestorsGremlin({
      domain: "WWW.100x.vc",
      limit: 3,
    });
    assert.match(g, /has\('domain','100x\.vc'\)/);
  });

  it("falls back to exact name match when no domain", () => {
    const g = buildSearchInvestorsGremlin({ name: "100X.VC", limit: 10 });
    assert.match(g, /hasLabel\('organization'\)/);
    assert.match(g, /has\('name','100X\.VC'\)/);
    assert.doesNotMatch(g, /textContainsFuzzy/);
    assert.doesNotMatch(g, /has\('domain'/);
  });

  it("escapes quotes in name", () => {
    const g = buildSearchInvestorsGremlin({ name: "O'Brien Ventures", limit: 2 });
    assert.match(g, /has\('name','O\\'Brien Ventures'\)/);
  });

  it("clamps limit to 1..50", () => {
    assert.match(buildSearchInvestorsGremlin({ domain: "a.co", limit: 0 }), /\.limit\(1\)/);
    assert.match(
      buildSearchInvestorsGremlin({ domain: "a.co", limit: 999 }),
      /\.limit\(50\)/,
    );
  });
});

describe("investorSearchAttempts", () => {
  it("falls back to exact name when a domain is present", () => {
    assert.deepEqual(
      investorSearchAttempts({ domain: "100x.vc", name: "100x" }),
      ["domain", "name"],
    );
  });

  it("name only when there is no domain", () => {
    assert.deepEqual(investorSearchAttempts({ domain: null, name: "100X.VC" }), [
      "name",
    ]);
  });

  it("skips a name shorter than 2 characters", () => {
    assert.deepEqual(investorSearchAttempts({ domain: "100x.vc", name: "x" }), [
      "domain",
    ]);
  });
});

describe("buildGetInvestorGremlin", () => {
  it("loads organization vertex + backedCompanies via invested_in→funding", () => {
    const id = "9215ac6a-da30-495c-8a34-ec1e77b777b7";
    const g = buildGetInvestorGremlin(id);
    assert.match(g, new RegExp(`g\\.V\\('${id}'\\)\\.hasLabel\\('organization'\\)`));
    assert.doesNotMatch(g, /hasLabel\('investor'\)/);
    assert.doesNotMatch(g, /textContainsFuzzy/);
    assert.match(g, /out\('invested_in'\)/);
    assert.match(g, /in\('has_investor'\)/);
    assert.match(g, /in\('has_funding'\)/);
    // Neptune rejects bare `id` inside coalesce — must be id()
    assert.match(g, /coalesce\(values\('uuid'\), id\(\)\)/);
    assert.doesNotMatch(g, /coalesce\(values\('uuid'\), id\)/);
    assert.ok(g.includes(BACKED_COMPANIES_TRAVERSAL));
  });
});
