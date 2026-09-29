import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fallbackChipHeadline,
  lookupChipHeadline,
  defaultChipHeadlineMap,
  yorkSidebarCopy,
  yorkOverviewCopy,
  yorkDetailCopy,
} from "./index";

describe("york-partner copy", () => {
  it("sidebar never names gaps", () => {
    const copy = yorkSidebarCopy("Alex");
    assert.equal(copy.lead, "Alex, turn Fuel gaps into a plan you can ship");
    assert.match(copy.headline, /R&D, GTM, and finance/);
  });

  it("overview leads by gap count", () => {
    assert.match(
      yorkOverviewCopy({ firstName: "Alex", categoriesWithGaps: ["R&D"] }).lead,
      /flagged work on R&D/,
    );
    assert.match(
      yorkOverviewCopy({
        firstName: "Alex",
        categoriesWithGaps: ["R&D", "GTM"],
      }).lead,
      /gaps on R&D and GTM/,
    );
    assert.match(
      yorkOverviewCopy({
        firstName: "Alex",
        categoriesWithGaps: ["R&D", "GTM", "G&A"],
      }).lead,
      /gaps across R&D, GTM, and G&A/,
    );
  });

  it("detail uses first needs-improvement chip for catalog headline", () => {
    const map = defaultChipHeadlineMap();
    const copy = yorkDetailCopy({
      firstName: "Alex",
      categoryId: "mkt",
      needsImprovementLabels: ["GTM motion", "Funnel gap"],
      headlines: map,
    });
    assert.match(copy.lead, /“GTM motion” on GTM/);
    assert.match(copy.headline, /go-to-market system/);
  });

  it("detail empty needs-improvement uses maintain copy", () => {
    const copy = yorkDetailCopy({
      categoryId: "dev",
      needsImprovementLabels: [],
      headlines: defaultChipHeadlineMap(),
    });
    assert.match(copy.lead, /maintain and enhance what’s working on R&D/i);
    assert.match(copy.headline, /Maintain and enhance what’s working on R&D/);
  });

  it("unknown chip falls back", () => {
    assert.equal(
      lookupChipHeadline(defaultChipHeadlineMap(), "dev", "Weird chip"),
      fallbackChipHeadline("Weird chip"),
    );
  });
});
