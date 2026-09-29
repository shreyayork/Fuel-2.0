import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import {
  intelligenceLinkSignalGroupKey,
  orderIntelligenceLinkOptions,
} from "./link-options-order";

function row(
  partial: Partial<CompanyIntelligenceRow> &
    Pick<CompanyIntelligenceRow, "id" | "headline" | "createdAt">,
): CompanyIntelligenceRow {
  return {
    companyUuid: "co_1",
    category: "finance",
    keyDetail: null,
    summary: "",
    confidence: 1,
    source: "document",
    generationPath: null,
    period: "2026-q1",
    contextItemId: null,
    documentVersionId: null,
    documentLabel: null,
    rawSnippet: null,
    isBenchmark: false,
    authorEmail: null,
    ...partial,
  };
}

describe("intelligenceLinkSignalGroupKey", () => {
  it("prefers signalId over headline", () => {
    assert.equal(
      intelligenceLinkSignalGroupKey(
        row({
          id: "a",
          headline: "ARR",
          signalId: "arr_usd",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
      "sid:arr_usd",
    );
  });

  it("falls back to normalized headline label", () => {
    assert.equal(
      intelligenceLinkSignalGroupKey(
        row({
          id: "a",
          headline: "Net revenue retention: 112%",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
      "lbl:net revenue retention",
    );
  });
});

describe("orderIntelligenceLinkOptions", () => {
  it("groups same-signal entries and sorts latest to oldest within each group", () => {
    const ordered = orderIntelligenceLinkOptions([
      row({
        id: "arr_old",
        headline: "ARR",
        signalId: "arr_usd",
        keyDetail: "$1M",
        createdAt: "2026-03-01T00:00:00.000Z",
      }),
      row({
        id: "nrr",
        headline: "NRR",
        signalId: "nrr_pct",
        keyDetail: "110%",
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
      row({
        id: "arr_new",
        headline: "ARR",
        signalId: "arr_usd",
        keyDetail: "$1.2M",
        createdAt: "2026-09-01T00:00:00.000Z",
      }),
      row({
        id: "arr_mid",
        headline: "ARR",
        signalId: "arr_usd",
        keyDetail: "$1.1M",
        createdAt: "2026-06-01T00:00:00.000Z",
      }),
    ]);

    assert.deepEqual(
      ordered.map((r) => r.id),
      ["arr_new", "arr_mid", "arr_old", "nrr"],
    );
    assert.deepEqual(
      ordered.map((r) => r.isLatest),
      [true, false, false, false],
    );
  });

  it("does not mark latest when a signal has only one entry", () => {
    const ordered = orderIntelligenceLinkOptions([
      row({
        id: "only",
        headline: "ARR",
        signalId: "arr_usd",
        createdAt: "2026-09-01T00:00:00.000Z",
      }),
    ]);
    assert.equal(ordered.length, 1);
    assert.equal(ordered[0]?.isLatest, false);
  });

  it("tie-breaks identical timestamps by id descending", () => {
    const ordered = orderIntelligenceLinkOptions([
      row({
        id: "a",
        headline: "ARR",
        signalId: "arr_usd",
        createdAt: "2026-09-01T00:00:00.000Z",
      }),
      row({
        id: "b",
        headline: "ARR",
        signalId: "arr_usd",
        createdAt: "2026-09-01T00:00:00.000Z",
      }),
    ]);
    assert.deepEqual(
      ordered.map((r) => r.id),
      ["b", "a"],
    );
    assert.equal(ordered[0]?.isLatest, true);
    assert.equal(ordered[1]?.isLatest, false);
  });
});
