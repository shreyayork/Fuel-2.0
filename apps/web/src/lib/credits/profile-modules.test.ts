import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeEarnedCredits,
  creditsPerBlock,
  earnableBlockCredits,
  freeSpendableMonthlyLimit,
  isQualifiedForRefill,
  mergeEarnedModules,
  remainingEarnableCredits,
  shouldResetFreeMonthlyUsage,
  DEFAULT_FREE_MONTHLY_LIMIT,
  spendableFreeMonthlyLimit,
  type ProfileModuleId,
} from "./profile-modules";

const empty = { modules: [] as ProfileModuleId[], benchmark: false };
const one = { modules: ["company" as const], benchmark: false };
const four = {
  modules: ["company" as const, "dev" as const, "gtm" as const, "rev" as const],
  benchmark: false,
};
const five = { ...four, benchmark: true };

describe("profile module credits", () => {
  it("splits the Free monthly limit equally across 5 blocks", () => {
    assert.equal(creditsPerBlock(250), 50);
    assert.equal(creditsPerBlock(300), 60);
    assert.equal(creditsPerBlock(301), 60);
    assert.equal(earnableBlockCredits(301), 300);
  });

  it("starts at 0 earned and the full block pool remaining", () => {
    assert.equal(computeEarnedCredits(empty, 250), 0);
    assert.equal(remainingEarnableCredits(empty, 250), DEFAULT_FREE_MONTHLY_LIMIT);
    assert.equal(isQualifiedForRefill(empty), false);
    assert.equal(freeSpendableMonthlyLimit(250, empty), 0);
  });

  it("awards one block per module without extras changing the total", () => {
    assert.equal(computeEarnedCredits(one, 250), 50);
    assert.equal(freeSpendableMonthlyLimit(250, one), 50);
    assert.equal(computeEarnedCredits(one, 300), 60);
    assert.equal(freeSpendableMonthlyLimit(300, one), 60);
  });

  it("does not add a module reward more than once", () => {
    assert.deepEqual(mergeEarnedModules(["dev"], ["dev"]), ["dev"]);
    assert.equal(computeEarnedCredits({ modules: ["dev"], benchmark: false }, 250), 50);
  });

  it("qualifies only when all five modules including benchmark are earned", () => {
    assert.equal(isQualifiedForRefill(four), false);
    assert.equal(isQualifiedForRefill(five), true);
    assert.equal(computeEarnedCredits(five, 250), 250);
    assert.equal(freeSpendableMonthlyLimit(250, five), 250);
  });

  it("uses 60 per block when the Free monthly limit is 300", () => {
    assert.equal(remainingEarnableCredits(empty, 300), 300);
    assert.equal(computeEarnedCredits(five, 300), 300);
    assert.equal(freeSpendableMonthlyLimit(300, five), 300);
  });

  it("keeps floor remainder off the earn ladder until all five modules are done", () => {
    assert.equal(computeEarnedCredits(five, 301), 300);
    assert.equal(remainingEarnableCredits(five, 301), 0);
    assert.equal(isQualifiedForRefill(five), true);
    assert.equal(freeSpendableMonthlyLimit(301, five), 301);
    assert.equal(isQualifiedForRefill(four), false);
    assert.equal(freeSpendableMonthlyLimit(301, four), 240);
  });

  it("gives investors the full catalog Free monthly limit without founder fields", () => {
    const empty = { modules: [] as ProfileModuleId[], benchmark: false };
    assert.equal(
      spendableFreeMonthlyLimit({
        flow: "investor",
        planMonthlyLimit: 1000,
        state: empty,
      }),
      1000,
    );
    assert.equal(
      spendableFreeMonthlyLimit({
        flow: "founder",
        planMonthlyLimit: 250,
        state: empty,
      }),
      0,
    );
    assert.equal(
      spendableFreeMonthlyLimit({
        flow: "founder",
        planMonthlyLimit: DEFAULT_FREE_MONTHLY_LIMIT,
        state: { modules: ["company"], benchmark: false },
      }),
      creditsPerBlock(DEFAULT_FREE_MONTHLY_LIMIT),
    );
  });

  it("resets Free monthly usage only when qualified and the month rolled", () => {
    assert.equal(
      shouldResetFreeMonthlyUsage({
        planSlug: "free",
        monthAnchorStale: true,
        qualified: false,
      }),
      false,
    );
    assert.equal(
      shouldResetFreeMonthlyUsage({
        planSlug: "free",
        monthAnchorStale: true,
        qualified: true,
      }),
      true,
    );
    assert.equal(
      shouldResetFreeMonthlyUsage({
        planSlug: "pro",
        monthAnchorStale: true,
        qualified: true,
      }),
      false,
    );
  });
});
