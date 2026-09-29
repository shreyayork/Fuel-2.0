import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAdvisorRecommendedActions } from "./build-recommended-actions";

describe("buildAdvisorRecommendedActions", () => {
  it("shows partial benchmark progress like the design", () => {
    const actions = buildAdvisorRecommendedActions({
      benchFilled: 3,
      benchTotal: 9,
      benchQuarterStale: false,
      hasUserSources: false,
      docCount: 0,
      userIntelCount: 0,
      detailTotal: 38,
      detailAnswered: 11,
      onboardingSeeded: 11,
      detailsQuarterStale: false,
    });

    assert.equal(actions.length, 3);
    assert.equal(actions[0]?.action_type, "benchmark");
    assert.equal(actions[0]?.title, "Complete Benchmark");
    assert.match(actions[0]?.sub ?? "", /3 of 9 metrics/);
    assert.equal(actions[1]?.action_type, "sources");
    assert.equal(actions[1]?.title, "Add Intelligence Sources");
    assert.equal(actions[2]?.action_type, "details");
    assert.match(actions[2]?.sub ?? "", /11 from onboarding/);
    assert.match(actions[2]?.sub ?? "", /27 more across tracks/);
  });

  it("marks completed tracks as done when benchmark, sources, and details are complete", () => {
    const actions = buildAdvisorRecommendedActions({
      benchFilled: 9,
      benchTotal: 9,
      benchQuarterStale: false,
      hasUserSources: true,
      docCount: 2,
      userIntelCount: 4,
      detailTotal: 30,
      detailAnswered: 30,
      onboardingSeeded: 8,
      detailsQuarterStale: false,
    });

    assert.equal(actions[0]?.done, true);
    assert.equal(actions[0]?.title, "Update Benchmark");
    assert.equal(actions[1]?.done, true);
    assert.equal(actions[2]?.done, true);
    assert.equal(actions[2]?.title, "Review Company Details");
  });
});
