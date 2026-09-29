import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_MARKETING_BANNER_DISMISS_DAYS,
  YORK_COMPANY_WIDE_OFFER_ID,
} from "./constants";
import { marketingBannerDismissHideMs } from "./banner-settings-shared";
import {
  applyYorkOfferDismiss,
  coerceYorkDismissMap,
  isYorkOfferDismissed,
  mergeLegacyYorkDismissMap,
  parseYorkDismissMap,
  pruneExpiredYorkDismissMap,
  serializeYorkDismissMap,
  yorkDismissEntryForMode,
} from "./dismiss";

describe("york-partner dismiss map", () => {
  it("parses empty / invalid input", () => {
    assert.deepEqual(parseYorkDismissMap(null), {});
    assert.deepEqual(parseYorkDismissMap(""), {});
    assert.deepEqual(parseYorkDismissMap("not-json"), {});
    assert.deepEqual(parseYorkDismissMap("[]"), {});
  });

  it("keeps known offer ids and drops unknown keys", () => {
    const map = coerceYorkDismissMap({
      [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "hide", until: 1788433573504 },
      "not-an-offer": { mode: "forever" },
    });
    assert.deepEqual(map, {
      [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "hide", until: 1788433573504 },
    });
  });

  it("treats forever and hide-until as dismissed", () => {
    const now = 1_000;
    assert.equal(
      isYorkOfferDismissed(
        YORK_COMPANY_WIDE_OFFER_ID,
        { [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "forever", until: null } },
        now,
      ),
      true,
    );
    assert.equal(
      isYorkOfferDismissed(
        YORK_COMPANY_WIDE_OFFER_ID,
        { [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "hide", until: now + 1 } },
        now,
      ),
      true,
    );
    assert.equal(
      isYorkOfferDismissed(
        YORK_COMPANY_WIDE_OFFER_ID,
        { [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "hide", until: now } },
        now,
      ),
      false,
    );
  });

  it("prunes expired hide entries", () => {
    const now = 5_000;
    const pruned = pruneExpiredYorkDismissMap(
      {
        [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "hide", until: now },
        "york-detail-rd": { mode: "forever", until: null },
      },
      now,
    );
    assert.deepEqual(pruned, {
      "york-detail-rd": { mode: "forever", until: null },
    });
  });

  it("applies hide for configured days from now", () => {
    const now = 10_000;
    const hideDays = 21;
    assert.deepEqual(yorkDismissEntryForMode("hide", now, hideDays), {
      mode: "hide",
      until: now + marketingBannerDismissHideMs(hideDays),
    });
    assert.deepEqual(
      yorkDismissEntryForMode("hide", now, DEFAULT_MARKETING_BANNER_DISMISS_DAYS),
      {
        mode: "hide",
        until: now + marketingBannerDismissHideMs(DEFAULT_MARKETING_BANNER_DISMISS_DAYS),
      },
    );
    const next = applyYorkOfferDismiss({}, YORK_COMPANY_WIDE_OFFER_ID, "forever", now);
    assert.deepEqual(next[YORK_COMPANY_WIDE_OFFER_ID], {
      mode: "forever",
      until: null,
    });
  });

  it("keeps forever dismiss permanent regardless of hide duration config", () => {
    const now = 10_000;
    const entry = yorkDismissEntryForMode("forever", now, 7);
    assert.deepEqual(entry, { mode: "forever", until: null });
    assert.equal(
      isYorkOfferDismissed(
        YORK_COMPANY_WIDE_OFFER_ID,
        { [YORK_COMPANY_WIDE_OFFER_ID]: entry },
        now + 999_999_999,
      ),
      true,
    );
  });

  it("respects existing dismissal timestamps without rewriting them", () => {
    const now = 1_000;
    const existingUntil = now + 123_456;
    const map = {
      [YORK_COMPANY_WIDE_OFFER_ID]: {
        mode: "hide" as const,
        until: existingUntil,
      },
    };
    assert.equal(
      isYorkOfferDismissed(YORK_COMPANY_WIDE_OFFER_ID, map, now),
      true,
    );
    assert.deepEqual(
      applyYorkOfferDismiss(map, "york-detail-rd", "hide", now, 30),
      {
        [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "hide", until: existingUntil },
        "york-detail-rd": {
          mode: "hide",
          until: now + marketingBannerDismissHideMs(30),
        },
      },
    );
  });

  it("legacy merge fills missing server keys only", () => {
    const now = 1_000;
    const server = {
      [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "forever" as const, until: null },
    };
    const legacy = {
      [YORK_COMPANY_WIDE_OFFER_ID]: {
        mode: "hide" as const,
        until: now + 50,
      },
      "york-detail-rd": { mode: "hide" as const, until: now + 50 },
    };
    assert.deepEqual(mergeLegacyYorkDismissMap(server, legacy, now), {
      [YORK_COMPANY_WIDE_OFFER_ID]: { mode: "forever", until: null },
      "york-detail-rd": { mode: "hide", until: now + 50 },
    });
  });

  it("round-trips serialize", () => {
    const map = {
      [YORK_COMPANY_WIDE_OFFER_ID]: {
        mode: "hide" as const,
        until: Date.now() + 60_000,
      },
    };
    assert.deepEqual(parseYorkDismissMap(serializeYorkDismissMap(map)), map);
  });
});
