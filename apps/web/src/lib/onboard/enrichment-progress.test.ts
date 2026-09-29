import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyEnrichmentStepStatus,
  crunchbaseScrapeBannerKind,
  crunchbaseScrapeBannerMessage,
  CRUNCHBASE_SCRAPE_COMPLETE_MESSAGE,
  CRUNCHBASE_SCRAPE_IN_PROGRESS_MESSAGE,
  initialEnrichmentProgress,
  isEnrichmentSettled,
  settleInterruptedCrunchbase,
} from "./enrichment-progress";

describe("enrichment-progress", () => {
  it("starts all sources pending", () => {
    const p = initialEnrichmentProgress();
    assert.equal(p.website, "pending");
    assert.equal(p.crunchbase, "pending");
    assert.equal(isEnrichmentSettled(p), false);
  });

  it("applies known step ids and ignores unknown", () => {
    let p = initialEnrichmentProgress();
    p = applyEnrichmentStepStatus(p, "website", "running");
    p = applyEnrichmentStepStatus(p, "not-a-source", "done");
    assert.equal(p.website, "running");
    assert.equal(p.techstack, "pending");
  });

  it("settles when every source is done or error", () => {
    let p = initialEnrichmentProgress();
    for (const id of [
      "website",
      "techstack",
      "crunchbase",
      "linkedin",
      "extract",
    ] as const) {
      p = applyEnrichmentStepStatus(p, id, id === "linkedin" ? "error" : "done");
    }
    assert.equal(isEnrichmentSettled(p), true);
  });

  it("maps crunchbase status to banner without timers", () => {
    assert.equal(CRUNCHBASE_SCRAPE_IN_PROGRESS_MESSAGE.includes("—"), false);
    assert.equal(crunchbaseScrapeBannerKind("pending", false), null);
    assert.equal(crunchbaseScrapeBannerKind("pending", true), "in_progress");
    assert.equal(crunchbaseScrapeBannerKind("running", true), "in_progress");
    assert.equal(crunchbaseScrapeBannerKind("done", true), "complete");
    assert.equal(crunchbaseScrapeBannerKind("error", true), null);
    assert.equal(
      crunchbaseScrapeBannerMessage("in_progress"),
      CRUNCHBASE_SCRAPE_IN_PROGRESS_MESSAGE,
    );
    assert.equal(
      crunchbaseScrapeBannerMessage("complete"),
      CRUNCHBASE_SCRAPE_COMPLETE_MESSAGE,
    );
  });

  it("settles interrupted crunchbase as error", () => {
    let p = applyEnrichmentStepStatus(
      initialEnrichmentProgress(),
      "crunchbase",
      "running",
    );
    p = settleInterruptedCrunchbase(p);
    assert.equal(p.crunchbase, "error");
    assert.equal(crunchbaseScrapeBannerKind(p.crunchbase, true), null);
  });
});
