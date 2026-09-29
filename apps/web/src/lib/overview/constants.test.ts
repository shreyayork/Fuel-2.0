import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_DOCUMENT_INITIATIVE_GENERATION_RULES,
  DEFAULT_OVERVIEW_GENERATION_PROMPT,
} from "@/lib/system-playbooks/defaults";
import {
  isOverviewGenerationStale,
  OVERVIEW_GENERATION_STALE_MS,
} from "./constants";
import {
  stripYorkHelpPromptAppendix,
  yorkHelpPromptAppendix,
} from "@/lib/york-help/catalog-data";

describe("isOverviewGenerationStale", () => {
  it("is false for recent startedAt", () => {
    const now = new Date("2026-09-19T00:00:00.000Z");
    assert.equal(isOverviewGenerationStale(now, now), false);
  });

  it("is true once the stale window has elapsed", () => {
    const now = new Date("2026-09-19T00:03:00.000Z");
    const started = new Date(now.getTime() - OVERVIEW_GENERATION_STALE_MS);
    assert.equal(isOverviewGenerationStale(started, now), true);
  });

  it("is false when startedAt is missing", () => {
    assert.equal(isOverviewGenerationStale(null), false);
  });
});

describe("overview prompt york help", () => {
  it("does not bake the catalog into the default playbook templates", () => {
    assert.equal(DEFAULT_OVERVIEW_GENERATION_PROMPT.includes("HOW YORK IE CAN HELP"), false);
    assert.equal(
      DEFAULT_DOCUMENT_INITIATIVE_GENERATION_RULES.includes("HOW YORK IE CAN HELP"),
      false,
    );
  });

  it("keeps a single catalog after stripping a baked-in copy then appending runtime rules", () => {
    const template = `You are Fuel.\n${yorkHelpPromptAppendix()}\n- suggested_playbooks: 3-6 items.`;
    const hydrated = `${stripYorkHelpPromptAppendix(template)}\n${yorkHelpPromptAppendix()}`;
    assert.equal((hydrated.match(/HOW YORK IE CAN HELP/g) ?? []).length, 1);
  });
});
