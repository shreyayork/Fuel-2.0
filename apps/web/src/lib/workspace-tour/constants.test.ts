import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOverviewLandingTourTarget,
  visibleTourSteps,
  WORKSPACE_TOUR_STEPS,
} from "./constants";

describe("visibleTourSteps", () => {
  it("returns 12 core steps for a founder overview", () => {
    const steps = visibleTourSteps({
      includeAiAdvisor: true,
    });
    assert.equal(steps.length, 12);
    assert.equal(steps[0]?.target, "overview");
    assert.equal(steps[2]?.target, "recommended-actions");
    assert.equal(steps[8]?.target, "ask-fuel-ai");
    assert.equal(steps[9]?.target, "ai-actions-playbooks");
    assert.equal(steps[10]?.target, "ai-actions-brief");
    assert.equal(steps[11]?.target, "integrations");
  });

  it("omits founder-only targets off claimed-company overview", () => {
    const steps = visibleTourSteps({
      includeAiAdvisor: false,
    });
    assert.ok(!steps.some((s) => s.target === "ai-advisor"));
    assert.ok(!steps.some((s) => s.target === "recommended-actions"));
    assert.ok(!steps.some((s) => s.target === "dataroom"));
    assert.ok(steps.some((s) => s.target === "ai-actions-playbooks"));
    assert.ok(steps.some((s) => s.target === "ask-fuel-ai"));
    assert.ok(steps.some((s) => s.target === "integrations"));
    assert.ok(steps.length < WORKSPACE_TOUR_STEPS.length);
  });

  it("includes Add source / Log intelligence by default (not gated on benchmarks)", () => {
    const steps = visibleTourSteps({
      includeAiAdvisor: true,
    });
    assert.ok(steps.some((s) => s.target === "add-source"));
    assert.ok(steps.some((s) => s.target === "log-intelligence"));
  });

  it("omits Add source / Log intelligence when includeIntelligenceActions is false", () => {
    const steps = visibleTourSteps({
      includeAiAdvisor: true,
      includeIntelligenceActions: false,
    });
    assert.ok(!steps.some((s) => s.target === "add-source"));
    assert.ok(!steps.some((s) => s.target === "log-intelligence"));
    assert.ok(steps.some((s) => s.target === "intelligence"));
    assert.ok(steps.some((s) => s.target === "ai-advisor"));
    assert.equal(steps.length, WORKSPACE_TOUR_STEPS.length - 2);
  });
});

describe("isOverviewLandingTourTarget", () => {
  it("matches advisor / recommended-actions only", () => {
    assert.equal(isOverviewLandingTourTarget("ai-advisor"), true);
    assert.equal(isOverviewLandingTourTarget("recommended-actions"), true);
    assert.equal(isOverviewLandingTourTarget("overview"), false);
    assert.equal(isOverviewLandingTourTarget("ask-fuel-ai"), false);
    assert.equal(isOverviewLandingTourTarget(null), false);
  });
});
