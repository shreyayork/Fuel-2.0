import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isKpiBenchmarkComplete,
  KPI_CHAT_FIELD_KEYS,
  KPI_LOGICAL_FIELD_KEYS,
  kpiBenchmarkGateMessage,
  looksLikeKpiClarification,
  MISSING_KPI_BENCHMARK_MESSAGE,
  missingKpiBenchmarkFieldKeys,
} from "./kpi-benchmark";
import { emptyBenchmarkDrawerValues } from "@/lib/overview/benchmark-drawer-fields";

describe("kpi-benchmark helpers", () => {
  it("excludes derived fields from chat form keys", () => {
    assert.ok(KPI_LOGICAL_FIELD_KEYS.includes("ruleOf40"));
    assert.ok(KPI_LOGICAL_FIELD_KEYS.includes("burnMultiple"));
    assert.equal(KPI_CHAT_FIELD_KEYS.includes("ruleOf40"), false);
    assert.equal(KPI_CHAT_FIELD_KEYS.includes("arr"), true);
  });

  it("treats empty drawer values as incomplete", () => {
    const values = emptyBenchmarkDrawerValues();
    assert.equal(isKpiBenchmarkComplete(values), false);
    assert.equal(missingKpiBenchmarkFieldKeys(values).length, KPI_CHAT_FIELD_KEYS.length);
  });

  it("treats a partially filled benchmark as incomplete", () => {
    const values = emptyBenchmarkDrawerValues();
    values.arr = "1200000";
    assert.equal(isKpiBenchmarkComplete(values), false);
    assert.equal(missingKpiBenchmarkFieldKeys(values).includes("arr"), false);
  });

  it("is complete once every founder-entered metric is filled", () => {
    const values = emptyBenchmarkDrawerValues();
    for (const key of KPI_CHAT_FIELD_KEYS) values[key] = "1";
    assert.equal(isKpiBenchmarkComplete(values), true);
  });

  it("ignores derived-only values when judging completeness", () => {
    const values = emptyBenchmarkDrawerValues();
    for (const key of KPI_CHAT_FIELD_KEYS) values[key] = "1";
    values.ruleOf40 = "";
    values.burnMultiple = "";
    assert.equal(isKpiBenchmarkComplete(values), true);
  });

  it("switches gate copy between empty and partial benchmarks", () => {
    const empty = emptyBenchmarkDrawerValues();
    assert.equal(kpiBenchmarkGateMessage(empty), MISSING_KPI_BENCHMARK_MESSAGE);
    assert.equal(kpiBenchmarkGateMessage(undefined), MISSING_KPI_BENCHMARK_MESSAGE);

    const partial = emptyBenchmarkDrawerValues();
    partial.arr = "1200000";
    const message = kpiBenchmarkGateMessage(partial);
    assert.match(message, new RegExp(`1 of ${KPI_CHAT_FIELD_KEYS.length} benchmark numbers`));
  });

  it("detects clarification-style KPI replies", () => {
    assert.equal(
      looksLikeKpiClarification(
        "I don't have your ARR or other KPIs. Please share your benchmark numbers.",
      ),
      true,
    );
    assert.equal(
      looksLikeKpiClarification(
        "I need your ARR and burn figures before I can run the KPI benchmark.",
      ),
      true,
    );
    assert.equal(
      looksLikeKpiClarification(
        "Please provide your ARR and monthly burn so I can complete the benchmark.",
      ),
      true,
    );
  });

  it("does not treat finished reports as clarifications (F20A false-positive fix)", () => {
    // Known-good escape: exact ## Snapshot (run 90d68151-style).
    assert.equal(
      looksLikeKpiClarification("# KPI Benchmark\n\n## Snapshot\n| Metric | You |\n| ARR | $1M |\n"),
      false,
    );

    // Confirmed FP pattern (c3ed9426): Finance Assessment with ## Cash & Efficiency
    // Snapshot + incidental "cloud provider" — must NOT skip Research persist.
    const financeAssessmentFp = `I'll run this playbook against York IE.

# Burn & Efficiency Review — York IE
**Period:** 2026-Q3 · Cohort: B2B SaaS / Seed

## Diagnosis

York IE is in a dual-signal efficiency bind: the burn multiple of 5.0x is elevated
against ARR growth and benchmark norms.

## Cash & Efficiency Snapshot

| Metric | You | Cohort |
| --- | --- | --- |
| ARR | $2.1M | — |
| Burn multiple | 5.0x | ~1.5x |

## Vendor / tooling notes

Note: no cloud provider, CRM, or tooling stack was reported in the 2026-Q3 update —
filling in vendor spend would sharpen the consolidation analysis.
`;
    assert.equal(looksLikeKpiClarification(financeAssessmentFp), false);

    // Confirmed FP pattern (11d15742): "provider" in tooling prose + ARR/KPI/benchmark.
    const toolingProviderFp = `## Diagnosis

ARR and KPI benchmark gaps point to operational risk.

## Next steps

Map every service provider (accounting partner, legal counsel, D&O insurance provider,
cloud provider, CRM). These are signals that underpin operational risk.
`;
    assert.equal(looksLikeKpiClarification(toolingProviderFp), false);

    // Incidental "provider" with no ask phrasing.
    assert.equal(
      looksLikeKpiClarification(
        "Cloud provider spend is high relative to ARR. Review the vendor list.",
      ),
      false,
    );
  });

  it("prefers report signals when mixed with a soft ask", () => {
    // Real content exists → do not skip persistence.
    assert.equal(
      looksLikeKpiClarification(`## Diagnosis

ARR is below cohort.

## Snapshot

| Metric | You |
| --- | --- |
| ARR | $1M |

Please provide your burn figure for next quarter if you have it.
`),
      false,
    );
  });

  it("still flags short clarification-only replies", () => {
    assert.equal(
      looksLikeKpiClarification(
        "I need the numbers before continuing — please provide your ARR and burn.",
      ),
      true,
    );
    assert.equal(
      looksLikeKpiClarification(
        "I don't have the KPI inputs. Share your numbers when ready.",
      ),
      true,
    );
  });
});
