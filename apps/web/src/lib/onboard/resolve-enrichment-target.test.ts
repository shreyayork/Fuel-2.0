import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeManualCompanyDomain } from "./company-domain";

/**
 * Pure mirror of resolve-enrichment-target manual-domain branch.
 * Full OpenSearch lookups stay in the server module; this locks precedence.
 */
function resolveDomainTargetShape(opts: {
  fuelDataHit: { uuid: string; name: string } | null;
  companyDomain: string | null;
}): {
  domain: string;
  companyId: string | null;
  companyName: string | null;
  source: "selected_company" | "manual_domain";
} | null {
  const raw = opts.companyDomain?.trim();
  if (!raw) return null;
  const domain = normalizeManualCompanyDomain(raw);
  if (!domain) return null;
  if (opts.fuelDataHit) {
    return {
      domain,
      companyId: opts.fuelDataHit.uuid,
      companyName: opts.fuelDataHit.name,
      source: "selected_company",
    };
  }
  return {
    domain,
    companyId: null,
    companyName: null,
    source: "manual_domain",
  };
}

describe("manual domain enrichment target precedence", () => {
  it("reuses fuel-data company when domain already exists", () => {
    const t = resolveDomainTargetShape({
      companyDomain: "https://www.acme.com/about",
      fuelDataHit: { uuid: "u1", name: "Acme" },
    });
    assert.deepEqual(t, {
      domain: "acme.com",
      companyId: "u1",
      companyName: "Acme",
      source: "selected_company",
    });
  });

  it("falls back to manual_domain when not in fuel-data", () => {
    const t = resolveDomainTargetShape({
      companyDomain: "brand-new.example",
      fuelDataHit: null,
    });
    assert.deepEqual(t, {
      domain: "brand-new.example",
      companyId: null,
      companyName: null,
      source: "manual_domain",
    });
  });

  it("rejects invalid domain", () => {
    assert.equal(
      resolveDomainTargetShape({
        companyDomain: "not a domain",
        fuelDataHit: null,
      }),
      null,
    );
  });
});
