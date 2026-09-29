import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  briefSuggestionKey,
  briefSuggestionPersistKey,
  briefSuggestionToReviewItem,
  parseSuggestionLine,
  reduceBriefSuggestionState,
  splitBriefSuggestions,
  type BriefSuggestionActionState,
} from "./split-suggestions";

describe("splitBriefSuggestions", () => {
  it("returns full content as body when no suggested section", () => {
    const content = "## Summary\n\nHello world.";
    assert.deepEqual(splitBriefSuggestions(content), {
      body: content,
      suggestions: [],
    });
  });

  it("splits body and parses legacy bullet suggestions", () => {
    const content = [
      "## Findings",
      "Body text.",
      "",
      "## Suggested initiatives",
      "- **Ship weekly releases** — tighten cadence. kind: continuous, area: product",
      "- **Cut CAC** by focusing paid. kind: one-time, area: gtm",
      "",
      "## Next steps",
      "Done.",
    ].join("\n");

    const result = splitBriefSuggestions(content);
    assert.equal(result.body.includes("Body text."), true);
    assert.equal(result.body.includes("Suggested initiatives"), false);
    assert.equal(result.suggestions.length, 2);
    assert.equal(result.suggestions[0]?.title, "Ship weekly releases");
    assert.equal(result.suggestions[0]?.kind, "continuous");
    assert.equal(result.suggestions[0]?.area, "product");
    assert.equal(result.suggestions[1]?.title, "Cut CAC");
    assert.equal(result.suggestions[1]?.kind, "onetime");
    assert.equal(result.suggestions[1]?.area, "gtm");
  });

  it("parses playbook Recommended next steps as suggestions", () => {
    const content = [
      "## Snapshot",
      "Body.",
      "",
      "#### Recommended next steps",
      "- **Burn Multiple Reduction Sprint** — audit GTM spend.",
      "- **NRR Expansion Program** — push NRR above 108%.",
      "",
      "## Rules",
      "Cite sources.",
    ].join("\n");

    const result = splitBriefSuggestions(content);
    assert.equal(result.body.includes("Body."), true);
    assert.equal(result.suggestions.length, 2);
    assert.equal(result.suggestions[0]?.title, "Burn Multiple Reduction Sprint");
    assert.equal(result.suggestions[1]?.title, "NRR Expansion Program");
  });

  it("parses Recommended initiatives heading", () => {
    const content = [
      "## Diagnosis",
      "Leak at conversion.",
      "",
      "## Recommended initiatives",
      "1. **Pipeline coverage rebuild** — raise coverage to 3x. kind: onetime, area: gtm",
    ].join("\n");

    const result = splitBriefSuggestions(content);
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0]?.title, "Pipeline coverage rebuild");
    assert.equal(result.suggestions[0]?.kind, "onetime");
  });

  it("parses rich Overview-parity field blocks", () => {
    const content = [
      "## Suggested initiatives",
      "1. **Burn Multiple Reduction Sprint**",
      "   description: Audit GTM and headcount spend against cohort burn multiple.",
      "   benefit: Extend runway by cutting inefficient spend",
      "   benefit: Move burn multiple toward cohort median",
      "   kind: onetime",
      "   area: finance",
      "   milestone: Scope spend audit | 04-15-2026",
      "   milestone: Approve reallocation | 05-30-2026",
      "   source: Signal: burn multiple (2026-q1)",
      "   source: Cohort p50 burn multiple",
      "",
      "2. **NRR Expansion Program**",
      "   description: Upsell motion to push NRR above 108%.",
      "   benefit: Higher expansion revenue from existing logos",
      "   kind: continuous",
      "   area: gtm",
      "   milestone: Define expansion playbook | 04-01-2026",
      "   source: Signal: nrr",
    ].join("\n");

    const result = splitBriefSuggestions(content);
    assert.equal(result.suggestions.length, 2);
    const first = result.suggestions[0]!;
    assert.equal(first.title, "Burn Multiple Reduction Sprint");
    assert.match(first.description, /Audit GTM/);
    assert.equal(first.kind, "onetime");
    assert.equal(first.area, "finance");
    assert.ok(first.benefit?.includes("Extend runway"));
    assert.ok(first.benefit?.includes("\n"));
    assert.equal(first.milestones.length, 2);
    assert.equal(first.milestones[0]?.title, "Scope spend audit");
    assert.equal(first.milestones[0]?.dueDate, "04-15-2026");
    assert.equal(first.sources.length, 2);
    assert.equal(first.sources[0]?.typeLabel, "Signal");
    assert.match(first.sources[0]?.title ?? "", /burn multiple/);
  });
});

describe("parseSuggestionLine", () => {
  it("falls back to first sentence when no bold title", () => {
    const parsed = parseSuggestionLine("Improve onboarding funnel for SMB. kind: continuous");
    assert.equal(parsed?.title, "Improve onboarding funnel for SMB");
    assert.equal(parsed?.kind, "continuous");
    assert.equal(parsed?.milestones.length, 0);
    assert.equal(parsed?.benefit, null);
  });
});

describe("briefSuggestionPersistKey", () => {
  it("normalizes title for durable matching", () => {
    assert.equal(
      briefSuggestionPersistKey({ title: "  Burn Multiple Reduction Sprint  " }),
      "burn multiple reduction sprint",
    );
  });
});

describe("briefSuggestionKey", () => {
  it("includes index to avoid title collisions", () => {
    assert.equal(briefSuggestionKey({ title: "Same" }, 0), "0:Same");
    assert.equal(briefSuggestionKey({ title: "Same" }, 1), "1:Same");
  });
});

describe("briefSuggestionToReviewItem", () => {
  it("maps rich fields into Overview drawer shape", () => {
    const item = briefSuggestionToReviewItem({
      title: "Ship weekly releases",
      description: "Tighten cadence for the cohort.",
      rationale: "Tighten cadence for the cohort.",
      kind: "onetime",
      area: "product",
      benefit: "Faster learning loops\nHigher release confidence",
      milestones: [
        { title: "Define release train", dueDate: "04-15-2026" },
        { title: "Ship first weekly", dueDate: "05-01-2026" },
      ],
      sources: [{ title: "Deploy cadence observation", typeLabel: "Signal" }],
    });
    assert.equal(item.name, "Ship weekly releases");
    assert.equal(item.description, "Tighten cadence for the cohort.");
    assert.equal(item.kind, "onetime");
    assert.equal(item.overviewCategoryId, "dev");
    assert.equal(item.milestones.length, 2);
    assert.equal(item.milestones[0]?.label, "Define release train");
    assert.equal(item.milestones[0]?.dueDate, "04-15-2026");
    assert.equal(item.benefit, "Faster learning loops\nHigher release confidence");
    assert.equal(item.sourceDocuments.length, 1);
    assert.equal(item.sourceDocuments[0]?.title, "Deploy cadence observation");
    assert.equal(item.ownerEmail, "Unassigned");
  });
});

describe("reduceBriefSuggestionState", () => {
  const steps: Array<{
    from: BriefSuggestionActionState;
    action: Parameters<typeof reduceBriefSuggestionState>[1];
    to: BriefSuggestionActionState;
  }> = [
    { from: "default", action: { type: "review" }, to: "reviewing" },
    { from: "default", action: { type: "create" }, to: "creating" },
    { from: "default", action: { type: "dismiss" }, to: "dismissed" },
    { from: "reviewing", action: { type: "create" }, to: "creating" },
    { from: "creating", action: { type: "submit" }, to: "submitting" },
    { from: "submitting", action: { type: "created" }, to: "created" },
    { from: "submitting", action: { type: "createFailed" }, to: "creating" },
    { from: "submitting", action: { type: "cancel" }, to: "default" },
    { from: "created", action: { type: "create" }, to: "created" },
    { from: "created", action: { type: "dismiss" }, to: "created" },
    { from: "dismissed", action: { type: "review" }, to: "dismissed" },
    { from: "creating", action: { type: "cancel" }, to: "default" },
  ];

  for (const step of steps) {
    it(`${step.from} + ${step.action.type} → ${step.to}`, () => {
      assert.equal(reduceBriefSuggestionState(step.from, step.action), step.to);
    });
  }

  it("blocks duplicate submit while already submitting", () => {
    assert.equal(
      reduceBriefSuggestionState("submitting", { type: "submit" }),
      "submitting",
    );
  });
});
