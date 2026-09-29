import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isProfileOrBenchmarkProvenance,
  isUnresolvedOverviewSourceTitle,
  overviewIntelPrefersBenchmark,
  overviewIntelligenceSourceTitle,
  parseOverviewEvidenceSource,
  resolveFeedSourceKindLabel,
  resolveIntelligenceProvenanceLabel,
  resolveObservationProvenanceLabel,
  resolveSourceListChipLabel,
} from "./source-label";

describe("resolveIntelligenceProvenanceLabel", () => {
  it("labels overview from track form when category is present", () => {
    assert.equal(
      resolveIntelligenceProvenanceLabel({
        source: "overview_generation",
        overviewCategory: "dev",
      }),
      "R&D Form",
    );
  });

  it("labels overview as Benchmark when preferBenchmark", () => {
    assert.equal(
      resolveIntelligenceProvenanceLabel({
        source: "overview_generation",
        overviewCategory: "mkt",
        preferBenchmark: true,
      }),
      "Benchmark",
    );
  });

  it("labels overview as Profile update when evidenceSource is profile", () => {
    assert.equal(
      resolveIntelligenceProvenanceLabel({
        source: "overview_generation",
        overviewCategory: "rev",
        evidenceSource: "profile",
      }),
      "Profile update",
    );
  });

  it("returns null for overview without category (never Overview)", () => {
    assert.equal(
      resolveIntelligenceProvenanceLabel({ source: "overview_generation" }),
      null,
    );
  });

  it("labels manual and portfolio_update sources", () => {
    assert.equal(
      resolveIntelligenceProvenanceLabel({ source: "manual:a@b.com" }),
      "User input",
    );
    assert.equal(
      resolveIntelligenceProvenanceLabel({
        source: "portfolio_update:pu_1",
      }),
      "Benchmark",
    );
  });

  it("labels HubSpot, Granola, notes, and documents", () => {
    assert.equal(
      resolveIntelligenceProvenanceLabel({ source: "hubspot" }),
      "HubSpot",
    );
    assert.equal(
      resolveIntelligenceProvenanceLabel({ source: "granola" }),
      "Granola",
    );
    assert.equal(
      resolveIntelligenceProvenanceLabel({ source: "source_notes" }),
      "Notes",
    );
    assert.equal(
      resolveIntelligenceProvenanceLabel({ source: "document:data_room" }),
      "Data room",
    );
  });

  it("returns null for empty or unknown source", () => {
    assert.equal(resolveIntelligenceProvenanceLabel({ source: "" }), null);
    assert.equal(
      resolveIntelligenceProvenanceLabel({ source: "weird_custom_tag" }),
      null,
    );
  });
});

describe("overviewIntelligenceSourceTitle", () => {
  it("maps track forms and profile / benchmark", () => {
    assert.equal(
      overviewIntelligenceSourceTitle({ categoryId: "dev" }),
      "R&D Form",
    );
    assert.equal(
      overviewIntelligenceSourceTitle({ categoryId: "mkt" }),
      "GTM Form",
    );
    assert.equal(
      overviewIntelligenceSourceTitle({ categoryId: "rev" }),
      "G&A Form",
    );
    assert.equal(
      overviewIntelligenceSourceTitle({
        categoryId: "dev",
        evidenceSource: "profile",
      }),
      "Profile update",
    );
    assert.equal(
      overviewIntelligenceSourceTitle({
        categoryId: "dev",
        preferBenchmark: true,
        evidenceSource: "profile",
      }),
      "Benchmark",
    );
    assert.equal(
      overviewIntelligenceSourceTitle({
        categoryId: "dev",
        evidenceSource: "document",
      }),
      "R&D Form",
    );
  });

  it("treats Overview as unresolved", () => {
    assert.equal(isUnresolvedOverviewSourceTitle("Overview"), true);
    assert.equal(isUnresolvedOverviewSourceTitle("overview"), true);
    assert.equal(isUnresolvedOverviewSourceTitle(""), true);
    assert.equal(isUnresolvedOverviewSourceTitle(null), true);
    assert.equal(isUnresolvedOverviewSourceTitle("R&D Form"), false);
    assert.equal(isUnresolvedOverviewSourceTitle("Benchmark"), false);
  });
});

describe("parseOverviewEvidenceSource", () => {
  it("accepts profile form document only", () => {
    assert.equal(parseOverviewEvidenceSource("profile"), "profile");
    assert.equal(parseOverviewEvidenceSource("Form"), "form");
    assert.equal(parseOverviewEvidenceSource("document"), "document");
    assert.equal(parseOverviewEvidenceSource("benchmark"), null);
    assert.equal(parseOverviewEvidenceSource(""), null);
  });
});

describe("isProfileOrBenchmarkProvenance", () => {
  it("true for overview, portfolio update, and benchmark flag", () => {
    assert.equal(
      isProfileOrBenchmarkProvenance({ source: "overview_generation" }),
      true,
    );
    assert.equal(
      isProfileOrBenchmarkProvenance({ generationPath: "overview" }),
      true,
    );
    assert.equal(
      isProfileOrBenchmarkProvenance({ source: "portfolio_update:pu_1" }),
      true,
    );
    assert.equal(isProfileOrBenchmarkProvenance({ isBenchmark: true }), true);
  });

  it("false for unknown or document sources", () => {
    assert.equal(isProfileOrBenchmarkProvenance({ source: "" }), false);
    assert.equal(
      isProfileOrBenchmarkProvenance({ source: "document:data_room" }),
      false,
    );
    assert.equal(
      isProfileOrBenchmarkProvenance({ source: "weird_custom_tag" }),
      false,
    );
  });
});

describe("resolveObservationProvenanceLabel", () => {
  it("labels manual and benchmark observations", () => {
    assert.equal(
      resolveObservationProvenanceLabel("manual:ops@york.ie"),
      "User input",
    );
    assert.equal(
      resolveObservationProvenanceLabel("portfolio_update:abc"),
      "Benchmark",
    );
  });

  it("labels HubSpot and Granola observation sources", () => {
    assert.equal(resolveObservationProvenanceLabel("hubspot:note:1"), "HubSpot");
    assert.equal(resolveObservationProvenanceLabel("granola"), "Granola");
  });

  it("returns null when source missing", () => {
    assert.equal(resolveObservationProvenanceLabel(null), null);
    assert.equal(resolveObservationProvenanceLabel(""), null);
  });
});

describe("resolveSourceListChipLabel", () => {
  it("maps docs and integration notes", () => {
    assert.equal(resolveSourceListChipLabel({ kind: "doc" }), "Doc");
    assert.equal(
      resolveSourceListChipLabel({ kind: "note", source: "hubspot:note:9" }),
      "HubSpot",
    );
    assert.equal(
      resolveSourceListChipLabel({ kind: "note", source: "granola:meeting:1" }),
      "Granola",
    );
    assert.equal(resolveSourceListChipLabel({ kind: "note" }), "Note");
  });
});

describe("resolveFeedSourceKindLabel", () => {
  it("never surfaces raw context; maps integrations and documents", () => {
    assert.equal(
      resolveFeedSourceKindLabel({ kind: "document" }),
      "Document",
    );
    assert.equal(
      resolveFeedSourceKindLabel({
        kind: "context",
        provenanceSource: "hubspot",
      }),
      "HubSpot",
    );
    assert.equal(
      resolveFeedSourceKindLabel({
        kind: "context",
        provenanceSource: "granola:x",
      }),
      "Granola",
    );
    assert.equal(
      resolveFeedSourceKindLabel({ kind: "context" }),
      "Document",
    );
    assert.equal(resolveFeedSourceKindLabel({ kind: "provenance" }), "");
  });
});

describe("overviewIntelPrefersBenchmark", () => {
  it("true only when signal has finite logged value", () => {
    assert.equal(
      overviewIntelPrefersBenchmark({
        signalId: "arr",
        benchmarkValues: { arr: 100 },
      }),
      true,
    );
    assert.equal(
      overviewIntelPrefersBenchmark({
        signalId: "arr",
        benchmarkValues: { arr: null },
      }),
      false,
    );
    assert.equal(
      overviewIntelPrefersBenchmark({
        signalId: "arr",
        benchmarkValues: {},
      }),
      false,
    );
  });
});
