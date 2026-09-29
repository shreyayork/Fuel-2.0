import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  portfolioBuildPlayedKey,
  shouldPlayPortfolioBuild,
} from "./portfolio-build-session";

describe("portfolio build session key", () => {
  const key100x = portfolioBuildPlayedKey("acct_100x", "100X.VC");
  const key3one4 = portfolioBuildPlayedKey("acct_3one4", "3one4 Capital");

  it("scopes the played flag by account and firm", () => {
    assert.notEqual(key100x, key3one4);
    assert.match(key100x, /^fuel:portfolio-build-played:acct_100x:100x-vc$/);
    assert.notEqual(key100x, "fuel:portfolio-build-played");
  });

  it("second claim in the same browser replays; same firm revisit does not", () => {
    const played = new Set<string>();

    function land(accountId: string, firmName: string, first: boolean) {
      const key = portfolioBuildPlayedKey(accountId, firmName);
      const play = shouldPlayPortfolioBuild({
        kind: "portfolio",
        firstLanding: first,
        stored: played.has(key) ? "1" : null,
      });
      if (play) played.add(key);
      return play;
    }

    assert.equal(land("acct_100x", "100X.VC", true), true);
    assert.equal(land("acct_100x", "100X.VC", true), false);
    assert.equal(land("acct_100x", "100X.VC", false), false);
    assert.equal(land("acct_3one4", "3one4 Capital", true), true);
    assert.equal(land("acct_3one4", "3one4 Capital", true), false);
  });
});
