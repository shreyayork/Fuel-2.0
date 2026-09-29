import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { InitiativeIntelligenceLink } from "@/lib/company-initiatives";
import {
  buildProgressIntelligenceLinkDisplay,
  canPersistProgressIntelligenceLinks,
  formatIntelligenceLinkOptionMeta,
  formatIntelligenceLinkOptionTitle,
  formatProgressLinkMeta,
  parseProgressIntelligenceLinks,
  progressIntelRowFromLoggedObservation,
  progressLinkHighlight,
  progressLinkTitle,
  progressSignalKey,
  upsertProgressIntelligenceLink,
  withUpdatedIntelligenceLinks,
} from "./progress-intelligence-links";

function link(
  partial: Partial<InitiativeIntelligenceLink> &
    Pick<InitiativeIntelligenceLink, "id" | "role" | "intelligenceId" | "title">,
): InitiativeIntelligenceLink {
  return {
    highlight: "",
    type: "financial",
    date: "2026-08-01",
    ...partial,
  };
}

describe("progress link display (F20A-212 Log pattern)", () => {
  it("formats title as Signal: Value", () => {
    assert.equal(
      progressLinkTitle("ARR growth (YoY)", "34% YoY ARR growth"),
      "ARR growth (YoY): 34% YoY ARR growth",
    );
  });

  it("keeps an existing Signal: Value headline", () => {
    assert.equal(
      progressLinkTitle("Revenue Growth: 25%", "25%"),
      "Revenue Growth: 25%",
    );
  });

  it("skips value when missing or identical to headline", () => {
    assert.equal(progressLinkTitle("ARR growth (YoY)", ""), "ARR growth (YoY)");
    assert.equal(progressLinkTitle("Software sector", "Software sector"), "Software sector");
  });

  it("puts only the note in highlight", () => {
    assert.equal(progressLinkHighlight("test"), "test");
    assert.equal(progressLinkHighlight("  note  "), "note");
    assert.equal(progressLinkHighlight(""), "");
    assert.equal(progressLinkHighlight(undefined), "");
  });
});

describe("logged observation progress row (F20A-215)", () => {
  it("stores catalog label and value on the observation row for feed linking", () => {
    const row = progressIntelRowFromLoggedObservation({
      observationId: "obs_abc",
      companyUuid: "co_1",
      category: "strategic",
      signalLabel: "Competitive moat",
      displayValue: "Shreya",
      period: "2026-q3",
      note: "test note",
    });
    assert.equal(row.headline, "Competitive moat");
    assert.equal(row.id, "obs_abc");
    assert.equal(row.keyDetail, "Shreya");
    assert.equal(row.rawSnippet, "test note");
  });

  it("formats initiative display as Signal: Value with note in highlight", () => {
    const row = progressIntelRowFromLoggedObservation({
      observationId: "obs_abc",
      companyUuid: "co_1",
      category: "finance",
      signalLabel: "Revenue Growth",
      displayValue: "25%",
      period: "2026-q2",
      note: "Revenue increased due to new customers",
    });
    const display = buildProgressIntelligenceLinkDisplay(row);
    assert.equal(display.title, "Revenue Growth: 25%");
    assert.equal(display.highlight, "Revenue increased due to new customers");
    assert.equal(
      formatProgressLinkMeta({
        type: row.category,
        date: row.period,
        highlight: display.highlight,
      }),
      "Finance ◦ Q2 2026 ◦ Revenue increased due to new customers",
    );
  });
});

describe("formatIntelligenceLinkOption labels", () => {
  it("renders duplicate signal options with distinct value and quarter metadata", () => {
    const q1 = {
      category: "finance" as const,
      headline: "Revenue Growth",
      keyDetail: "15%",
      period: "2026-q1",
      rawSnippet: null,
      summary: "15%",
    };
    const q2 = {
      category: "finance" as const,
      headline: "Revenue Growth",
      keyDetail: "22%",
      period: "2026-q2",
      rawSnippet: "New customers",
      summary: "New customers",
    };
    assert.equal(formatIntelligenceLinkOptionTitle(q1), "Revenue Growth: 15%");
    assert.equal(formatIntelligenceLinkOptionMeta(q1), "Finance ◦ Q1 2026");
    assert.equal(formatIntelligenceLinkOptionTitle(q2), "Revenue Growth: 22%");
    assert.equal(
      formatIntelligenceLinkOptionMeta(q2),
      "Finance ◦ Q2 2026 ◦ New customers",
    );
  });
});

describe("formatProgressLinkMeta", () => {
  it("omits missing quarter and commentary segments", () => {
    assert.equal(
      formatProgressLinkMeta({ type: "finance", date: "2026-q2", highlight: "" }),
      "Finance ◦ Q2 2026",
    );
    assert.equal(
      formatProgressLinkMeta({
        type: "growth",
        date: null,
        highlight: "Pipeline expanded",
      }),
      "Growth ◦ Pipeline expanded",
    );
    assert.equal(formatProgressLinkMeta({ type: "", date: "", highlight: "" }), "");
  });
});

describe("buildProgressIntelligenceLinkDisplay", () => {
  it("keeps linked intelligence Signal: Value and uses link note only in highlight", () => {
    const display = buildProgressIntelligenceLinkDisplay(
      {
        headline: "Revenue Growth",
        keyDetail: "25%",
        rawSnippet: null,
        summary: "ignored",
      },
      "Revenue increased due to new customers",
    );
    assert.equal(display.title, "Revenue Growth: 25%");
    assert.equal(display.highlight, "Revenue increased due to new customers");
  });

  it("preserves an existing Signal: Value headline for linked intelligence", () => {
    const display = buildProgressIntelligenceLinkDisplay(
      {
        headline: "Revenue Growth: 25%",
        keyDetail: null,
        rawSnippet: null,
        summary: "",
      },
      "",
    );
    assert.equal(display.title, "Revenue Growth: 25%");
    assert.equal(display.highlight, "");
  });
});

describe("progress intelligence links (F20A-206)", () => {
  it("keys logged headlines by catalog label before the colon", () => {
    assert.equal(progressSignalKey("Net revenue retention: 112%"), "net revenue retention");
    assert.equal(progressSignalKey("ARR growth (YoY)"), "arr growth (yoy)");
  });

  it("adds a different signal in the same column", () => {
    const baselineNrr = link({
      id: "a",
      role: "baseline",
      intelligenceId: "i1",
      title: "Net revenue retention: 112%",
    });
    const baselineArr = link({
      id: "b",
      role: "baseline",
      intelligenceId: "i2",
      title: "ARR growth (YoY): 40%",
    });
    const next = upsertProgressIntelligenceLink([baselineNrr], baselineArr);
    assert.equal(next.length, 2);
    assert.deepEqual(
      next.map((l) => l.intelligenceId),
      ["i1", "i2"],
    );
  });

  it("replaces the same signal in that column only", () => {
    const baselineNrr = link({
      id: "a",
      role: "baseline",
      intelligenceId: "i1",
      title: "Net revenue retention: 112%",
    });
    const currentArr = link({
      id: "c",
      role: "current",
      intelligenceId: "i3",
      title: "ARR growth (YoY): 38%",
    });
    const baselineNrr2 = link({
      id: "d",
      role: "baseline",
      intelligenceId: "i4",
      title: "Net revenue retention: 118%",
    });
    const next = upsertProgressIntelligenceLink([baselineNrr, currentArr], baselineNrr2);
    assert.equal(next.length, 2);
    assert.equal(next[0]?.intelligenceId, "i4");
    assert.equal(next[1]?.intelligenceId, "i3");
  });

  it("does not overwrite the other column when logging the same signal", () => {
    const baseline = link({
      id: "a",
      role: "baseline",
      intelligenceId: "i1",
      title: "Net revenue retention: 112%",
    });
    const current = link({
      id: "b",
      role: "current",
      intelligenceId: "i2",
      title: "Net revenue retention: 115%",
    });
    const next = upsertProgressIntelligenceLink(
      [baseline, current],
      link({
        id: "c",
        role: "current",
        intelligenceId: "i3",
        title: "Net revenue retention: 120%",
      }),
    );
    assert.equal(next.find((l) => l.role === "baseline")?.intelligenceId, "i1");
    assert.equal(next.find((l) => l.role === "current")?.intelligenceId, "i3");
  });

  it("replaces when linking the same intelligence id", () => {
    const existing = link({
      id: "a",
      role: "baseline",
      intelligenceId: "i1",
      title: "Net revenue retention",
      highlight: "old",
    });
    const next = upsertProgressIntelligenceLink(
      [existing],
      link({
        id: "b",
        role: "baseline",
        intelligenceId: "i1",
        title: "Net revenue retention",
        highlight: "new",
      }),
    );
    assert.equal(next.length, 1);
    assert.equal(next[0]?.highlight, "new");
  });
});

describe("progress intelligence persist payload", () => {
  it("parses a logged link and keeps it for write", () => {
    const raw = [
      {
        id: "ilink_1",
        role: "baseline",
        intelligenceId: "intel_1",
        title: "Net revenue retention: 112%",
        highlight: "112%",
        type: "financial",
        date: "2026-q2",
      },
    ];
    const parsed = parseProgressIntelligenceLinks(raw);
    assert.equal(canPersistProgressIntelligenceLinks(parsed, raw.length), true);
    assert.equal(parsed?.[0]?.intelligenceId, "intel_1");
  });

  it("does not persist a wipe when every entry is invalid", () => {
    const raw = [{ role: "baseline", title: "NRR" }];
    const parsed = parseProgressIntelligenceLinks(raw);
    assert.equal(canPersistProgressIntelligenceLinks(parsed, raw.length), false);
  });

  it("patches the matching initiative in the list after save", () => {
    const items = [
      { id: "a", intelligenceLinks: [] as InitiativeIntelligenceLink[] },
      { id: "b", intelligenceLinks: [] as InitiativeIntelligenceLink[] },
    ];
    const saved = [
      link({
        id: "ilink_1",
        role: "baseline",
        intelligenceId: "intel_1",
        title: "ARR growth (YoY): 40%",
      }),
    ];
    const next = withUpdatedIntelligenceLinks(items, "a", saved);
    assert.equal(next[0]?.intelligenceLinks.length, 1);
    assert.equal(next[1]?.intelligenceLinks.length, 0);
  });
});
