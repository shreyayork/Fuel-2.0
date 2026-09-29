import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTrackInsightLists } from "./track-insights";
import type { ScoreContributor } from "./types";

function contrib(
  partial: Partial<ScoreContributor> & Pick<ScoreContributor, "id" | "label" | "source" | "display" | "score">,
): ScoreContributor {
  return {
    weight: 10,
    contribution: 1,
    impact: "",
    ...partial,
  };
}

describe("buildTrackInsightLists", () => {
  it("maps strong and weak benchmarks to the right lists with founder labels", () => {
    const contributors: ScoreContributor[] = [
      contrib({
        id: "fte_count",
        label: "FTE headcount",
        source: "benchmark",
        display: "42",
        score: 90,
      }),
      contrib({
        id: "gross_margin_pct",
        label: "Gross margin",
        source: "benchmark",
        display: "35%",
        score: 12,
      }),
      contrib({
        id: "profile_completion",
        label: "Company profile completeness",
        source: "profile",
        display: "70% complete",
        score: 70,
      }),
    ];

    const { strengths, weaknesses } = buildTrackInsightLists("dev", contributors);

    assert.equal(strengths.some((s) => s.label === "Team size"), true);
    assert.equal(strengths.some((s) => s.label === "Company profile"), true);
    assert.equal(weaknesses.some((w) => w.label === "Gross margin"), true);
    assert.equal(weaknesses[0]?.detail.includes("Benchmark"), true);
  });

  it("flags unanswered detail questions and skips mid-range scores", () => {
    const contributors: ScoreContributor[] = [
      contrib({
        id: "dev_ship_cadence",
        label: "Ship cadence",
        source: "detail",
        display: "Not answered",
        score: 30,
      }),
      contrib({
        id: "dev_ai_role",
        label: "AI role",
        source: "detail",
        display: "Exploring",
        score: 58,
      }),
      contrib({
        id: "dev_build_model",
        label: "Build model",
        source: "detail",
        display: "In-house engineering team",
        score: 86,
      }),
    ];

    const { strengths, weaknesses } = buildTrackInsightLists("dev", contributors);

    assert.equal(weaknesses.some((w) => w.label === "Ship cadence"), true);
    assert.equal(strengths.some((s) => s.label === "Build model"), true);
    assert.equal(
      strengths.some((s) => s.label === "AI role") ||
        weaknesses.some((w) => w.label === "AI role"),
      false,
    );
  });

  it("keeps GTM motion chip label and maps I don't know to Not answered yet", () => {
    const contributors: ScoreContributor[] = [
      contrib({
        id: "mkt_sales_motion",
        label: "GTM motion",
        source: "detail",
        display: "I don't know / NA",
        score: 30,
      }),
    ];

    const { weaknesses } = buildTrackInsightLists("mkt", contributors);
    const chip = weaknesses.find((w) => w.id === "detail-mkt_sales_motion");
    assert.ok(chip);
    assert.equal(chip.label, "GTM motion");
    assert.match(chip.detail, /^Not answered yet/);
  });

  it("dedupes topics across sources", () => {
    const contributors: ScoreContributor[] = [
      contrib({
        id: "fte_count",
        label: "FTE headcount",
        source: "benchmark",
        display: "20",
        score: 90,
      }),
    ];
    const intel = [
      {
        id: "intel-1",
        title: "Team size: growing eng org",
        text: "Strong hiring momentum",
        highlight: "Strong",
      },
    ];

    const { strengths } = buildTrackInsightLists("dev", contributors, intel);
    const teamChips = strengths.filter((s) => insightTopicMatches(s.label, "team size"));
    assert.equal(teamChips.length, 1);
  });
});

function insightTopicMatches(label: string, topic: string): boolean {
  return label.toLowerCase().includes(topic);
}
