import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  autoFundKey,
  autoRoundKey,
  combinedFundName,
  isAutoBuiltFundName,
  isDeletableEmptyAutoShell,
  isKeyedAutoBuiltFirmList,
  manualCohortDescription,
  matchesAutoBuiltFirmList,
  parseManualCohort,
  roundListName,
} from "./auto-build-ids";

describe("auto-build-ids", () => {
  it("names combined fund with Portfolio suffix when missing", () => {
    assert.equal(combinedFundName("York IE"), "York IE Portfolio");
    assert.equal(combinedFundName("York Portfolio"), "York Portfolio");
  });

  it("names round lists", () => {
    assert.equal(roundListName("York IE", "Series A"), "York IE · Series A");
  });

  it("marks auto fundNames for idempotent detection", () => {
    const fund = autoFundKey("York IE");
    const round = autoRoundKey("York IE", "Seed");
    assert.ok(fund.startsWith("auto:fund:"));
    assert.ok(round.startsWith("auto:round:"));
    assert.equal(isAutoBuiltFundName(fund), true);
    assert.equal(isAutoBuiltFundName(round), true);
    assert.equal(isAutoBuiltFundName("manual"), false);
    assert.equal(isAutoBuiltFundName(null), false);
  });

  it("round-trips manual cohort description", () => {
    assert.equal(manualCohortDescription("Growth"), "cohort:Growth");
    assert.equal(parseManualCohort("cohort:Growth"), "Growth");
    assert.equal(parseManualCohort("other"), null);
  });

  it("matches auto lists by fundName or display name (claim/ensure race)", () => {
    assert.equal(
      matchesAutoBuiltFirmList("100x", {
        name: "other",
        fundName: autoFundKey("100x"),
      }),
      true,
    );
    assert.equal(
      matchesAutoBuiltFirmList("100x", {
        name: "100x Portfolio",
        fundName: null,
      }),
      true,
    );
    assert.equal(
      matchesAutoBuiltFirmList("100x", {
        name: "Manual list",
        fundName: null,
      }),
      false,
    );
  });

  it("keyed auto lists require auto:fund: / auto:round: for this firm", () => {
    assert.equal(
      isKeyedAutoBuiltFirmList("100x", { fundName: autoFundKey("100x") }),
      true,
    );
    assert.equal(
      isKeyedAutoBuiltFirmList("100x", {
        fundName: autoRoundKey("100x", "Seed"),
      }),
      true,
    );
    // Same display name but no auto fundName → manual / never keyed
    assert.equal(
      isKeyedAutoBuiltFirmList("100x", { fundName: null }),
      false,
    );
    assert.equal(
      isKeyedAutoBuiltFirmList("100x", { fundName: "manual-fund" }),
      false,
    );
    // Other firm's auto key
    assert.equal(
      isKeyedAutoBuiltFirmList("100x", { fundName: autoFundKey("other") }),
      false,
    );
  });

  it("deletable empty shells: only keyed auto + zero companies", () => {
    // Safe to delete: empty auto-built shell
    assert.equal(
      isDeletableEmptyAutoShell("100x", {
        fundName: autoFundKey("100x"),
        companyCount: 0,
      }),
      true,
    );
    // Must NOT delete: user-created empty list with same display name
    assert.equal(
      isDeletableEmptyAutoShell("100x", {
        fundName: null,
        companyCount: 0,
      }),
      false,
    );
    // Must NOT delete: auto list that already has companies
    assert.equal(
      isDeletableEmptyAutoShell("100x", {
        fundName: autoFundKey("100x"),
        companyCount: 5,
      }),
      false,
    );
    // Must NOT delete: shares/members are irrelevant — companyCount > 0 blocks
    assert.equal(
      isDeletableEmptyAutoShell("100x", {
        fundName: autoRoundKey("100x", "Seed"),
        companyCount: 1,
      }),
      false,
    );
  });
});
