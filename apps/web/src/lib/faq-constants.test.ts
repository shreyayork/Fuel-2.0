import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatFaqPointsText, parseFaqPointsText } from "./faq-constants";

describe("parseFaqPointsText", () => {
  it("parses em-dash and hyphen separators", () => {
    assert.deepEqual(parseFaqPointsText("Overview — scorecard\nFix it - tracked work"), [
      { label: "Overview", body: "scorecard" },
      { label: "Fix it", body: "tracked work" },
    ]);
  });

  it("keeps label-only lines", () => {
    assert.deepEqual(parseFaqPointsText("Solo label"), [{ label: "Solo label", body: "" }]);
  });

  it("skips blank lines", () => {
    assert.deepEqual(parseFaqPointsText("A — b\n\n\nC — d"), [
      { label: "A", body: "b" },
      { label: "C", body: "d" },
    ]);
  });
});

describe("formatFaqPointsText", () => {
  it("round-trips with em dash", () => {
    const points = [
      { label: "Overview", body: "scorecard" },
      { label: "Solo", body: "" },
    ];
    assert.equal(formatFaqPointsText(points), "Overview — scorecard\nSolo");
    assert.deepEqual(parseFaqPointsText(formatFaqPointsText(points)), points);
  });
});
