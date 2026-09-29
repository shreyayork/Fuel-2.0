import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DETAIL_MULTI_DELIMITER,
  DEV_PRODUCT_STAGES,
  DETAIL_QUESTION_BY_ID,
} from "@/lib/overview/detail-question-catalog";
import { ONBOARD_UNKNOWN_ANSWER, ONBOARD_UNKNOWN_DISPLAY } from "@/lib/onboard/unknown-answer";
import {
  buildTrackFormQaPayload,
  formatTrackFormQaPromptBlock,
} from "./track-form-qa";

function questionInForm(
  payload: NonNullable<ReturnType<typeof buildTrackFormQaPayload>>,
  form: string,
  id: string,
) {
  const group = payload.forms.find((f) => f.form === form);
  assert.ok(group, `missing form ${form}`);
  return group.questions.find((q) => q.id === id);
}

describe("buildTrackFormQaPayload", () => {
  it("joins prompt, options, and selected answer for a filled R&D question", () => {
    const stage = DEV_PRODUCT_STAGES[3];
    const payload = buildTrackFormQaPayload({
      dev_product_stage: stage,
    });
    assert.ok(payload);

    const q = questionInForm(payload, "R&D", "dev_product_stage");
    assert.ok(q);
    assert.equal(q.question, "Where is your product today?");
    assert.equal(q.label, "Product stage");
    assert.deepEqual(q.options, [...DEV_PRODUCT_STAGES]);
    assert.equal(q.multi, false);
    assert.equal(q.answer, stage);
    assert.deepEqual(q.selected, [stage]);
    assert.equal(q.status, "answered");
  });

  it("maps __unknown__ to status unknown and I don't know / NA", () => {
    const payload = buildTrackFormQaPayload({
      mkt_funnel_gap: ONBOARD_UNKNOWN_ANSWER,
    });
    assert.ok(payload);

    const q = questionInForm(payload, "GTM", "mkt_funnel_gap");
    assert.ok(q);
    assert.equal(q.status, "unknown");
    assert.equal(q.answer, ONBOARD_UNKNOWN_DISPLAY);
    assert.deepEqual(q.selected, []);
    assert.ok((q.options?.length ?? 0) > 0);
  });

  it("splits multi-select six-month impact into selected", () => {
    const a = "Ship product faster";
    const b = "Implement AI";
    const payload = buildTrackFormQaPayload({
      dev_six_month_impact: `${a}${DETAIL_MULTI_DELIMITER}${b}`,
    });
    assert.ok(payload);

    const q = questionInForm(payload, "R&D", "dev_six_month_impact");
    assert.ok(q);
    assert.equal(q.multi, true);
    assert.equal(q.status, "answered");
    assert.deepEqual(q.selected, [a, b]);
    assert.equal(q.answer, `${a}${DETAIL_MULTI_DELIMITER}${b}`);
    assert.deepEqual(q.options, DETAIL_QUESTION_BY_ID.dev_six_month_impact?.options);
  });

  it("hides rev_raise_needs when showWhen is false", () => {
    const payload = buildTrackFormQaPayload({
      rev_runway: "6–12 months",
      rev_raise_needs: "Introductions",
    });
    assert.ok(payload);

    const raise = questionInForm(payload, "G&A", "rev_raise_needs");
    assert.equal(raise, undefined);

    const runway = questionInForm(payload, "G&A", "rev_runway");
    assert.ok(runway);
    assert.equal(runway.status, "answered");
  });

  it("includes rev_raise_needs when fundraising showWhen is true", () => {
    const payload = buildTrackFormQaPayload({
      rev_capital_priority: "Actively fundraising",
      rev_raise_needs: "Introductions",
    });
    assert.ok(payload);

    const raise = questionInForm(payload, "G&A", "rev_raise_needs");
    assert.ok(raise);
    assert.equal(raise.status, "answered");
    assert.equal(raise.answer, "Introductions");
  });

  it("returns null when nothing is filled", () => {
    assert.equal(buildTrackFormQaPayload({}), null);
    assert.equal(buildTrackFormQaPayload({ dev_product_stage: "  " }), null);
    assert.equal(buildTrackFormQaPayload({ profile_company: "Acme" }), null);
  });

  it("still serializes unanswered peers once any track answer exists", () => {
    const payload = buildTrackFormQaPayload({
      dev_product_stage: DEV_PRODUCT_STAGES[0],
    });
    assert.ok(payload);
    const unanswered = questionInForm(payload, "R&D", "dev_product_type");
    assert.ok(unanswered);
    assert.equal(unanswered.status, "unanswered");
    assert.equal(unanswered.answer, null);
    assert.deepEqual(unanswered.selected, []);
  });
});

describe("formatTrackFormQaPromptBlock", () => {
  it("prefixes JSON with founder-form instructions", () => {
    const payload = buildTrackFormQaPayload({
      dev_product_stage: DEV_PRODUCT_STAGES[0],
    });
    assert.ok(payload);
    const block = formatTrackFormQaPromptBlock(payload);
    assert.match(block, /^FOUNDER OVERVIEW FORMS \(R&D \/ GTM \/ G&A\):/);
    assert.match(block, /do not invent values/i);
    assert.match(block, /"form": "R&D"/);
    assert.match(block, /"dev_product_stage"/);
  });
});
