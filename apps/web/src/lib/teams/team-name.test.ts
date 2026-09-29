import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DUPLICATE_TEAM_NAME_MESSAGE,
  isTeamNameTaken,
  normalizeTeamName,
} from "./team-name";

describe("normalizeTeamName", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeTeamName("  H Team  "), "h team");
  });
});

describe("isTeamNameTaken", () => {
  const existing = [{ name: "H team" }, { name: "Ops" }];

  it("detects case-insensitive duplicates", () => {
    assert.equal(isTeamNameTaken("H team", existing), true);
    assert.equal(isTeamNameTaken("h TEAM", existing), true);
    assert.equal(isTeamNameTaken("  H team ", existing), true);
  });

  it("allows unused names", () => {
    assert.equal(isTeamNameTaken("Partners", existing), false);
    assert.equal(isTeamNameTaken("", existing), false);
  });

  it("ignores excluded team id when renaming", () => {
    const withIds = [
      { id: "a", name: "H team" },
      { id: "b", name: "Ops" },
    ];
    assert.equal(isTeamNameTaken("H team", withIds, "a"), false);
    assert.equal(isTeamNameTaken("H team", withIds, "b"), true);
  });
});

describe("DUPLICATE_TEAM_NAME_MESSAGE", () => {
  it("matches expected copy", () => {
    assert.equal(DUPLICATE_TEAM_NAME_MESSAGE, "A team with this name already exists.");
  });
});
