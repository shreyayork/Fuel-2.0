import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isInvestorFlowPayload,
  mapFlowType,
} from "@/components/onboard/v2/map-onboarding-flow-claim";
import type { OnboardingFlowCompletePayload } from "@/components/onboard/v2/OnboardingFlow";
import {
  ensureVisibleUiBusinessModel,
  isInvestorUiBusinessModel,
  normalizeUiBusinessModel,
  onboardPathKind,
  prefillModelToUiLabel,
  resolveUiBusinessModel,
} from "./resolve-ui-business-model";

function claimPayload(
  businessModel: string,
): OnboardingFlowCompletePayload {
  return {
    profileForm: { businessModel },
  } as OnboardingFlowCompletePayload;
}

describe("prefillModelToUiLabel", () => {
  it("maps operating_services to Product", () => {
    assert.equal(prefillModelToUiLabel("operating_services"), "Product");
  });

  it("maps investor extract models to Investment", () => {
    assert.equal(prefillModelToUiLabel("investment_firm"), "Investment");
    assert.equal(
      prefillModelToUiLabel("operating_and_investment"),
      "Investment",
    );
  });

  it("maps saas and other to Product", () => {
    assert.equal(prefillModelToUiLabel("saas"), "Product");
    assert.equal(prefillModelToUiLabel("other"), "Product");
  });
});

describe("resolveUiBusinessModel", () => {
  it("maps Services scrape to Product when no investor signal", () => {
    assert.equal(
      resolveUiBusinessModel({ prefillModel: "operating_services" }),
      "Product",
    );
  });

  it("maps Services scrape to Investment when catalog record is investor", () => {
    assert.equal(
      resolveUiBusinessModel({
        prefillModel: "operating_services",
        recordLabel: "Venture / PE fund",
      }),
      "Investment",
    );
  });

  it("keeps empty when scrape and catalog are empty", () => {
    assert.equal(resolveUiBusinessModel({}), "");
    assert.equal(
      resolveUiBusinessModel({ prefillModel: null, recordLabel: "  " }),
      "",
    );
  });

  it("prefers extract Investment over Services-like catalog label", () => {
    assert.equal(
      resolveUiBusinessModel({
        prefillModel: "investment_firm",
        recordLabel: "Services / Consultancy",
      }),
      "Investment",
    );
  });
});

describe("normalizeUiBusinessModel / saved-user load", () => {
  it("remaps saved Services labels to Product", () => {
    assert.equal(
      normalizeUiBusinessModel("Services or Agency"),
      "Product",
    );
    assert.equal(
      normalizeUiBusinessModel("Services / Consultancy"),
      "Product",
    );
    assert.equal(normalizeUiBusinessModel("Agency"), "Product");
  });

  it("keeps Product and Investment", () => {
    assert.equal(normalizeUiBusinessModel("Product"), "Product");
    assert.equal(normalizeUiBusinessModel("Investment"), "Investment");
  });

  it("falls unknown non-empty values back to Product", () => {
    assert.equal(ensureVisibleUiBusinessModel("Legacy Corp Type"), "Product");
    assert.equal(normalizeUiBusinessModel("totally-unknown"), "Product");
  });

  it("keeps empty as no preselection", () => {
    assert.equal(ensureVisibleUiBusinessModel(""), "");
    assert.equal(normalizeUiBusinessModel("   "), "");
  });
});

describe("path routing after remap", () => {
  it("routes Product to operating path", () => {
    assert.equal(onboardPathKind("Product"), "operating");
    assert.equal(isInvestorUiBusinessModel("Product"), false);
  });

  it("routes Investment to short investor path", () => {
    assert.equal(onboardPathKind("Investment"), "short");
    assert.equal(isInvestorUiBusinessModel("Investment"), true);
  });

  it("does not treat Services as investor path", () => {
    assert.equal(onboardPathKind("Services or Agency"), "operating");
    assert.equal(isInvestorUiBusinessModel("Services or Agency"), false);
  });
});

describe("claim type after remap", () => {
  it("maps Product payload to operating claim", () => {
    const payload = claimPayload("Product");
    assert.equal(isInvestorFlowPayload(payload), false);
    assert.equal(mapFlowType(payload), "operating");
  });

  it("maps Investment payload to investor claim", () => {
    const payload = claimPayload("Investment");
    assert.equal(isInvestorFlowPayload(payload), true);
    assert.equal(mapFlowType(payload), "investor");
  });

  it("does not treat legacy Services label as investor claim", () => {
    const payload = claimPayload("Services or Agency");
    assert.equal(isInvestorFlowPayload(payload), false);
    assert.equal(mapFlowType(payload), "operating");
  });
});
