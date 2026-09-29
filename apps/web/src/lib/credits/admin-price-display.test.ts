import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatUsdFromCents,
  resolveStrikePrice,
  resolveStrikePriceUsd,
} from "./admin-price-display";

describe("resolveStrikePrice", () => {
  it("shows strike when list is strictly greater than final", () => {
    assert.deepEqual(resolveStrikePrice(2400, 2000), {
      showStrike: true,
      listCents: 2400,
      finalCents: 2000,
    });
  });

  it("hides strike when list is null", () => {
    assert.deepEqual(resolveStrikePrice(null, 2000), {
      showStrike: false,
      finalCents: 2000,
    });
  });

  it("hides strike when list equals final", () => {
    assert.deepEqual(resolveStrikePrice(2000, 2000), {
      showStrike: false,
      finalCents: 2000,
    });
  });

  it("hides strike when list is less than final", () => {
    assert.deepEqual(resolveStrikePrice(1500, 2000), {
      showStrike: false,
      finalCents: 2000,
    });
  });

  it("returns null final when charged amount is missing", () => {
    assert.deepEqual(resolveStrikePrice(3000, null), {
      showStrike: false,
      finalCents: null,
    });
  });

  it("works for Pro monthly/annual cents the same as top-up packs", () => {
    assert.deepEqual(resolveStrikePrice(4000, 3000), {
      showStrike: true,
      listCents: 4000,
      finalCents: 3000,
    });
    assert.deepEqual(resolveStrikePrice(36000, 30000), {
      showStrike: true,
      listCents: 36000,
      finalCents: 30000,
    });
  });
});

describe("resolveStrikePriceUsd", () => {
  it("shows strike for Pro monthly/annual list USD when greater than final", () => {
    assert.deepEqual(resolveStrikePriceUsd(50, 40), {
      showStrike: true,
      listCents: 5000,
      finalCents: 4000,
    });
    assert.deepEqual(resolveStrikePriceUsd(480, 400), {
      showStrike: true,
      listCents: 48000,
      finalCents: 40000,
    });
  });

  it("hides strike for top-up when listPrice is missing or not greater", () => {
    assert.deepEqual(resolveStrikePriceUsd(undefined, 20), {
      showStrike: false,
      finalCents: 2000,
    });
    assert.deepEqual(resolveStrikePriceUsd(20, 20), {
      showStrike: false,
      finalCents: 2000,
    });
    assert.deepEqual(resolveStrikePriceUsd(15, 20), {
      showStrike: false,
      finalCents: 2000,
    });
  });
});

describe("formatUsdFromCents", () => {
  it("formats with two decimals by default", () => {
    assert.equal(formatUsdFromCents(2000), "$20.00");
  });

  it("formats whole dollars when fractionDigits is 0", () => {
    assert.equal(formatUsdFromCents(3000, 0), "$30");
  });
});
