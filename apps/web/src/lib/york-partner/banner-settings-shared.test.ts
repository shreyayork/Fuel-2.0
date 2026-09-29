import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MARKETING_BANNER_DISMISS_DAYS } from "./constants";
import {
  coerceMarketingBannerDismissDays,
  marketingBannerDismissHideMs,
  parseMarketingBannerDismissDays,
  validateMarketingBannerDismissDaysInput,
} from "./banner-settings-shared";

describe("marketing banner dismiss days", () => {
  it("defaults to 14 days when config missing or invalid", () => {
    assert.equal(DEFAULT_MARKETING_BANNER_DISMISS_DAYS, 14);
    assert.equal(coerceMarketingBannerDismissDays(undefined), 14);
    assert.equal(coerceMarketingBannerDismissDays(""), 14);
    assert.equal(coerceMarketingBannerDismissDays("0"), 14);
    assert.equal(coerceMarketingBannerDismissDays("-3"), 14);
    assert.equal(coerceMarketingBannerDismissDays("abc"), 14);
  });

  it("parses positive whole numbers", () => {
    assert.equal(parseMarketingBannerDismissDays("21"), 21);
    assert.equal(parseMarketingBannerDismissDays(7), 7);
    assert.equal(parseMarketingBannerDismissDays(" 30 "), 30);
  });

  it("rejects invalid admin input", () => {
    assert.deepEqual(validateMarketingBannerDismissDaysInput(""), {
      ok: false,
      message: "Enter a positive whole number of days.",
    });
    assert.deepEqual(validateMarketingBannerDismissDaysInput("0"), {
      ok: false,
      message: "Enter a positive whole number of days.",
    });
    assert.deepEqual(validateMarketingBannerDismissDaysInput("-5"), {
      ok: false,
      message: "Enter a positive whole number of days.",
    });
    assert.deepEqual(validateMarketingBannerDismissDaysInput("3.5"), {
      ok: false,
      message: "Enter a positive whole number of days.",
    });
  });

  it("accepts valid admin input", () => {
    assert.deepEqual(validateMarketingBannerDismissDaysInput("14"), {
      ok: true,
      days: 14,
    });
    assert.deepEqual(validateMarketingBannerDismissDaysInput(30), {
      ok: true,
      days: 30,
    });
  });

  it("computes hide duration from configured days", () => {
    assert.equal(
      marketingBannerDismissHideMs(21),
      21 * 24 * 60 * 60 * 1000,
    );
    assert.equal(
      marketingBannerDismissHideMs(),
      marketingBannerDismissHideMs(DEFAULT_MARKETING_BANNER_DISMISS_DAYS),
    );
  });
});
