import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import {
  mergeIntelligenceLinkOptions,
  observationToIntelligenceLinkRow,
} from "./link-options-merge";
import type { ObservationWithSignal } from "@/lib/observations";

function observation(
  partial: Partial<ObservationWithSignal> &
    Pick<ObservationWithSignal, "id" | "period" | "createdAt">,
): ObservationWithSignal {
  return {
    accountId: "acct_1",
    companyUuid: "co_1",
    signalId: "revenue_growth_yoy",
    asOf: null,
    valueNumeric: 15,
    valueText: null,
    valueBool: null,
    sentiment: null,
    source: "manual:test@york.ie",
    contextItemId: null,
    agentRunId: null,
    confidence: 1,
    rawSnippet: null,
    metadata: null,
    supersededAt: null,
    supersededById: null,
    authorEmail: "test@york.ie",
    signal: {
      id: "revenue_growth_yoy",
      label: "Revenue Growth",
      category: "finance",
      kind: "quantitative",
      unit: "pct",
      invertedGood: false,
    },
    ...partial,
  };
}

function intelRow(
  partial: Partial<CompanyIntelligenceRow> & Pick<CompanyIntelligenceRow, "id" | "createdAt">,
): CompanyIntelligenceRow {
  return {
    companyUuid: "co_1",
    category: "finance",
    headline: "Document insight",
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

describe("mergeIntelligenceLinkOptions", () => {
  it("keeps every observation for the same signal with different values/periods", () => {
    const rows = mergeIntelligenceLinkOptions(
      [],
      [
        observation({
          id: "obs_q1",
          period: "2026-q1",
          valueNumeric: 15,
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
        }),
        observation({
          id: "obs_q2",
          period: "2026-q2",
          valueNumeric: 22,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
        }),
        observation({
          id: "obs_q3",
          period: "2026-q3",
          valueNumeric: 28,
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
        }),
      ],
    );
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.id),
      ["obs_q3", "obs_q2", "obs_q1"],
    );
    assert.equal(rows.find((row) => row.id === "obs_q1")?.keyDetail, "15%");
    assert.equal(rows.find((row) => row.id === "obs_q2")?.keyDetail, "22%");
    assert.equal(rows.find((row) => row.id === "obs_q3")?.keyDetail, "28%");
  });

  it("merges intelligence rows and observations without signal dedupe", () => {
    const rows = mergeIntelligenceLinkOptions(
      [
        intelRow({
          id: "intel_1",
          headline: "Revenue Growth",
          signalId: "revenue_growth_yoy",
          createdAt: "2026-03-15T00:00:00.000Z",
        }),
      ],
      [
        observation({
          id: "obs_q2",
          period: "2026-q2",
          valueNumeric: 22,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
        }),
      ],
    );
    assert.equal(rows.length, 2);
    // Same signal → grouped latest-first (obs_q2 newer than intel_1)
    assert.equal(rows[0]?.id, "obs_q2");
    assert.equal(rows[1]?.id, "intel_1");
  });

  it("groups mixed signals with latest-first order within each group", () => {
    const rows = mergeIntelligenceLinkOptions(
      [],
      [
        observation({
          id: "arr_old",
          signalId: "arr_usd",
          period: "2026-q1",
          valueNumeric: 100,
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          signal: {
            id: "arr_usd",
            label: "ARR",
            category: "finance",
            kind: "quantitative",
            unit: "usd",
            invertedGood: false,
          },
        }),
        observation({
          id: "nrr",
          signalId: "nrr_pct",
          period: "2026-q3",
          valueNumeric: 110,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          signal: {
            id: "nrr_pct",
            label: "NRR",
            category: "retention",
            kind: "quantitative",
            unit: "pct",
            invertedGood: false,
          },
        }),
        observation({
          id: "arr_new",
          signalId: "arr_usd",
          period: "2026-q3",
          valueNumeric: 120,
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
          signal: {
            id: "arr_usd",
            label: "ARR",
            category: "finance",
            kind: "quantitative",
            unit: "usd",
            invertedGood: false,
          },
        }),
      ],
    );
    assert.deepEqual(
      rows.map((r) => r.id),
      ["arr_new", "arr_old", "nrr"],
    );
  });
});

describe("observationToIntelligenceLinkRow", () => {
  it("maps catalog label and formatted value for picker display", () => {
    const row = observationToIntelligenceLinkRow(
      observation({
        id: "obs_1",
        period: "2026-q2",
        valueNumeric: 25,
        rawSnippet: "Revenue increased due to new customers",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
    );
    assert.equal(row.headline, "Revenue Growth");
    assert.equal(row.keyDetail, "25%");
    assert.equal(row.rawSnippet, "Revenue increased due to new customers");
    assert.equal(row.id, "obs_1");
  });
});
