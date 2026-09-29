import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companiesToAdd,
  emptyShellPlan,
  shouldWarnAutoBuild,
  skipPopulatedAutoLists,
} from "./auto-build-plan";

const emptyShell = { id: "wl-empty", companyCount: 0 };
const populated = { id: "wl-full", companyCount: 12 };

describe("skipPopulatedAutoLists", () => {
  it("skips when keyed lists already have companies", () => {
    const plan = skipPopulatedAutoLists({
      force: false,
      keyedLists: [populated],
    });
    assert.equal(plan.skip, true);
    if (plan.skip) {
      assert.equal(plan.holdingCount, 12);
      assert.deepEqual(plan.portfolioIds, ["wl-full"]);
    }
  });

  it("does not skip a new account with no lists", () => {
    assert.equal(
      skipPopulatedAutoLists({ force: false, keyedLists: [] }).skip,
      false,
    );
  });

  it("does not skip empty shells", () => {
    const plan = skipPopulatedAutoLists({
      force: false,
      keyedLists: [emptyShell],
    });
    assert.equal(plan.skip, false);
  });
});

describe("emptyShellPlan", () => {
  it("fills a list that exists with 0 companies when holdings exist", () => {
    const plan = emptyShellPlan({
      keyedLists: [emptyShell],
      mergedCount: 171,
    });
    assert.equal(plan.action, "fill");
    if (plan.action === "fill") {
      assert.deepEqual(plan.deleteIds, ["wl-empty"]);
    }
  });

  it("keeps empty shells when Neptune returned no holdings", () => {
    const plan = emptyShellPlan({
      keyedLists: [emptyShell],
      mergedCount: 0,
    });
    assert.equal(plan.action, "keep");
  });

  it("never deletes a list that already has companies", () => {
    const plan = emptyShellPlan({
      keyedLists: [populated, emptyShell],
      mergedCount: 171,
    });
    assert.equal(plan.action, "fill");
    if (plan.action === "fill") {
      assert.deepEqual(plan.deleteIds, ["wl-empty"]);
    }
  });
});

describe("companiesToAdd", () => {
  it("race loser that reuses the winner empty list still seeds it", () => {
    const holdings = [{ companyUuid: "a" }, { companyUuid: "b" }];
    const seeded = companiesToAdd(holdings, true);
    assert.equal(seeded.length, 2);
    assert.equal(companiesToAdd(holdings, false).length, 2);
  });
});

describe("shouldWarnAutoBuild", () => {
  it("warns when nothing was persisted", () => {
    assert.equal(
      shouldWarnAutoBuild({
        invested_in_edges: 191,
        backed_count: 171,
        merged_count: 171,
        persisted_count: 0,
        reason: "ok",
      }),
      true,
    );
  });

  it("does not warn when a populated build was skipped", () => {
    assert.equal(
      shouldWarnAutoBuild({
        invested_in_edges: null,
        backed_count: 0,
        merged_count: 0,
        persisted_count: 171,
        reason: "already_built",
      }),
      false,
    );
  });
});
