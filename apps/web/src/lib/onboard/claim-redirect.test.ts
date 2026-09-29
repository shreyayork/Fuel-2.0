import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveOnboardClaimRedirect } from "./claim-redirect";

describe("resolveOnboardClaimRedirect", () => {
  it("routes investor signup to portfolio with tour prompt", () => {
    const url = resolveOnboardClaimRedirect({
      flowType: "investor",
      cta: "explore",
      companyUuid: "cat_abc",
    });
    assert.equal(url, "/portfolio?first=1&tour=prompt");
  });

  it("preserves cohort on investor portfolio redirect", () => {
    const url = resolveOnboardClaimRedirect({
      flowType: "investor",
      cta: "benchmark",
      companyUuid: "cat_abc",
      cohortKey: "seed",
    });
    assert.equal(url, "/portfolio?first=1&tour=prompt&cohort=seed");
  });

  it("routes operating signup to company overview by default", () => {
    const url = resolveOnboardClaimRedirect({
      flowType: "operating",
      cta: "explore",
      companyUuid: "cat_abc",
    });
    assert.equal(
      url,
      "/company/cat_abc?tab=overview&cta=explore&first=1&tour=prompt",
    );
  });

  it("routes operating benchmark CTA to intelligence tab", () => {
    const url = resolveOnboardClaimRedirect({
      flowType: "operating",
      cta: "benchmark",
      companyUuid: "cat_abc",
    });
    assert.equal(
      url,
      "/company/cat_abc?tab=intelligence&first=1&tour=prompt",
    );
  });

  it("adds incomplete-setup prompt on operating overview", () => {
    const url = resolveOnboardClaimRedirect({
      flowType: "operating",
      cta: "explore",
      companyUuid: "cat_abc",
      setupIncomplete: true,
    });
    assert.equal(
      url,
      "/company/cat_abc?tab=overview&cta=explore&first=1&tour=prompt&profilePrompt=1",
    );
  });

  it("does not add profile query params on investor or benchmark CTAs", () => {
    const investor = resolveOnboardClaimRedirect({
      flowType: "investor",
      cta: "explore",
      companyUuid: "cat_abc",
      setupIncomplete: true,
    });
    assert.equal(investor, "/portfolio?first=1&tour=prompt");

    const benchmark = resolveOnboardClaimRedirect({
      flowType: "operating",
      cta: "benchmark",
      companyUuid: "cat_abc",
      setupIncomplete: true,
    });
    assert.equal(
      benchmark,
      "/company/cat_abc?tab=intelligence&first=1&tour=prompt",
    );
  });
});
