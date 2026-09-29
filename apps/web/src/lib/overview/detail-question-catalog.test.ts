import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDetailAnswerUpdate,
  buildDetailQuestionCatalogForModel,
  completedOnboardingModules,
  DETAIL_MULTI_DELIMITER,
  DETAIL_QUESTION_BY_ID,
  DETAIL_QUESTION_LABEL,
  DETAIL_SECTIONS,
  filterCountInput,
  formatOtherSpecifyAnswer,
  isChoiceAnswerComplete,
  isMultiSelectSelected,
  isOtherSpecifyOption,
  isOtherSpecifySelected,
  parseOtherSpecifyText,
  parseProfileFundingRounds,
  resolveTextInputType,
  serializeProfileFundingRounds,
  setMultiSelectOtherText,
  toggleMultiSelectAnswer,
} from "./detail-question-catalog";
import { scoreForAnswer } from "./answer-scores";

describe("R&D onboarding credit eligibility", () => {
  it("requires every R&D unlock answer before completing the module", () => {
    assert.deepEqual(
      completedOnboardingModules({
        dev_product_stage: "GA",
        dev_product_type: "SaaS Platform",
      }),
      [],
    );

    assert.deepEqual(
      completedOnboardingModules({
        dev_product_stage: "GA",
        dev_product_type: "SaaS Platform",
        dev_delivery_constraint: "Capacity and hiring",
      }),
      ["dev"],
    );
  });
});

describe("applyDetailAnswerUpdate", () => {
  it("retains cleared question id as empty string for save payload", () => {
    const prev = { profile_product_description: "dfsg", dev_product_stage: "Beta" };
    const next = applyDetailAnswerUpdate(prev, "profile_product_description", "");

    assert.equal(next.profile_product_description, "");
    assert.ok("profile_product_description" in next);
    assert.equal(next.dev_product_stage, "Beta");
  });

  it("stores trimmed non-empty values", () => {
    const next = applyDetailAnswerUpdate({}, "dev_product_stage", "  GA  ");
    assert.equal(next.dev_product_stage, "  GA  ");
  });

  it("clears whitespace-only input to empty string", () => {
    const prev = { dev_product_stage: "Beta" };
    const next = applyDetailAnswerUpdate(prev, "dev_product_stage", "   ");

    assert.equal(next.dev_product_stage, "");
    assert.ok("dev_product_stage" in next);
  });
});

describe("detail question allowUnknown / multi flags", () => {
  const noUnknownIds = [
    "dev_product_type",
    "dev_launch_timeline",
    "mkt_pricing_model",
    "mkt_demand_source",
    "mkt_sales_team",
    "mkt_competitive_pressure",
  ] as const;

  it("drops I don't know / NA on the six named choice questions", () => {
    for (const id of noUnknownIds) {
      const q = DETAIL_QUESTION_BY_ID[id];
      assert.ok(q, id);
      assert.equal(q.allowUnknown, false, id);
    }
  });

  it("keeps I don't know / NA on a sample of other track choice questions", () => {
    for (const id of ["dev_product_stage", "mkt_sales_motion", "rev_runway"] as const) {
      const q = DETAIL_QUESTION_BY_ID[id];
      assert.ok(q, id);
      assert.notEqual(q.allowUnknown, false, id);
    }
  });

  it("marks R&D six-month impact as multi-select with Select all that apply", () => {
    const q = DETAIL_QUESTION_BY_ID.dev_six_month_impact;
    assert.ok(q);
    assert.equal(q.multi, true);
    assert.equal(q.subtitle, "Select all that apply");
    assert.deepEqual(q.options, [
      "Ship product faster",
      "Improve product quality",
      "Reduce engineering costs",
      "Hire engineering talent",
      "Implement AI",
      "Improve product strategy",
      "Modernize architecture",
      "Prepare for enterprise customers",
    ]);
  });

  it("scores multi-select six-month impact as the worst selected option", () => {
    const multi = ["Ship product faster", "Prepare for enterprise customers"].join(
      DETAIL_MULTI_DELIMITER,
    );
    // Prepare for enterprise = 78, Ship product faster = 70 → min 70
    assert.equal(scoreForAnswer("dev_six_month_impact", multi), 70);
    assert.equal(scoreForAnswer("dev_six_month_impact", "Prepare for enterprise customers"), 78);
  });
});

describe("company form text input types", () => {
  it("uses Design input types instead of defaulting every field to textarea", () => {
    const expected: Record<string, string> = {
      profile_company: "short",
      profile_product_description: "textarea",
      profile_industry: "short",
      profile_founded: "year",
      profile_city: "short",
      profile_state: "short",
      profile_country: "short",
      profile_website: "url",
      profile_linkedin: "url",
      profile_headcount: "count",
      profile_funding_rounds: "funding_rounds",
      profile_additional_context: "textarea",
      profile_top_priorities: "textarea",
      profile_public_data_wrong: "textarea",
      profile_biggest_risk: "textarea",
    };
    for (const [id, inputType] of Object.entries(expected)) {
      const q = DETAIL_QUESTION_BY_ID[id];
      assert.ok(q, id);
      assert.equal(resolveTextInputType(q), inputType, id);
    }
  });

  it("round-trips funding rounds JSON", () => {
    const rounds = [
      { id: "fr-1", type: "Seed", amount: "$1.2M", date: "2022-04-01", investors: "York" },
    ];
    const serialized = serializeProfileFundingRounds(rounds);
    assert.deepEqual(parseProfileFundingRounds(serialized), rounds);
    assert.equal(serializeProfileFundingRounds([]), "");
    assert.deepEqual(parseProfileFundingRounds("not-json"), []);
  });

  it("strips non-digits from headcount input", () => {
    assert.equal(filterCountInput("18"), "18");
    assert.equal(filterCountInput("18 FTE"), "18");
    assert.equal(filterCountInput("1,200"), "1200");
    assert.equal(filterCountInput("abc"), "");
    assert.equal(filterCountInput("12.5"), "125");
    assert.equal(filterCountInput("123456789"), "12345678");
  });
});

describe("buildDetailQuestionCatalogForModel", () => {
  it("exports every catalog question with prompt and label for Bedrock INPUT", () => {
    const catalog = buildDetailQuestionCatalogForModel();
    const uniqueIds = new Set(DETAIL_SECTIONS.flatMap((s) => s.questions.map((q) => q.id)));
    assert.equal(catalog.length, uniqueIds.size);

    const byId = Object.fromEntries(catalog.map((e) => [e.id, e]));
    for (const section of DETAIL_SECTIONS) {
      for (const q of section.questions) {
        const entry = byId[q.id];
        assert.ok(entry, q.id);
        assert.equal(entry.label, DETAIL_QUESTION_LABEL[q.id] ?? q.prompt);
        const expectedCat =
          section.id === "context" || section.id === "profile" ? "profile" : section.id;
        if (q.id !== "profile_product_description") {
          assert.equal(entry.category_id, expectedCat);
          assert.equal(entry.prompt, q.prompt);
        }
        assert.equal(entry.multi, q.multi === true);
        assert.equal(entry.kind, q.kind === "text" ? "text" : "choice");
        if (q.options?.length) {
          assert.deepEqual(entry.options, [...q.options]);
        }
      }
    }
  });

  it("marks allow_unknown false for gated choice questions and true for typical choice", () => {
    const catalog = buildDetailQuestionCatalogForModel();
    const byId = Object.fromEntries(catalog.map((e) => [e.id, e]));
    assert.equal(byId.dev_product_type?.allow_unknown, false);
    assert.equal(byId.dev_product_stage?.allow_unknown, true);
    assert.equal(byId.profile_product_description?.allow_unknown, false);
    assert.equal(byId.dev_six_month_impact?.multi, true);
    assert.equal(byId.dev_six_month_impact?.subtitle, "Select all that apply");
  });
});

describe("Other specify helpers", () => {
  it("matches plain Other and Other (please specify)", () => {
    assert.equal(isOtherSpecifyOption("Other"), true);
    assert.equal(isOtherSpecifyOption("Other (Please specify)"), true);
    assert.equal(isOtherSpecifyOption("Other (please specify)"), true);
    assert.equal(isOtherSpecifyOption("Another"), false);
  });

  it("formats, parses, and clears Other free text", () => {
    assert.equal(formatOtherSpecifyAnswer("Other", "  custom  "), "Other: custom");
    assert.equal(parseOtherSpecifyText("Other: custom", "Other"), "custom");
    assert.equal(parseOtherSpecifyText("Other", "Other"), "");
    assert.equal(isOtherSpecifySelected("Other: custom", "Other"), true);
    assert.equal(isChoiceAnswerComplete("Other", ["Other"]), false);
    assert.equal(isChoiceAnswerComplete("Other: custom", ["Other"]), true);
  });

  it("requires Other text inside multi-select answers (F20A-252 BUG-07)", () => {
    const incomplete = `FinTech${DETAIL_MULTI_DELIMITER}Other`;
    const complete = `FinTech${DETAIL_MULTI_DELIMITER}Other: Climate`;
    assert.equal(isChoiceAnswerComplete(incomplete, ["FinTech", "Other"]), false);
    assert.equal(isChoiceAnswerComplete(complete, ["FinTech", "Other"]), true);
    assert.equal(
      isChoiceAnswerComplete(
        `PLG${DETAIL_MULTI_DELIMITER}Other (Please specify)`,
        ["PLG", "Other (Please specify)"],
      ),
      false,
    );
  });

  it("toggles multi-select Other with custom text", () => {
    const withOther = toggleMultiSelectAnswer("FinTech", "Other");
    assert.equal(withOther, `FinTech${DETAIL_MULTI_DELIMITER}Other`);
    assert.equal(isMultiSelectSelected(withOther, "Other"), true);

    const withText = setMultiSelectOtherText(withOther, "Other", "Climate");
    assert.equal(withText, `FinTech${DETAIL_MULTI_DELIMITER}Other: Climate`);
    assert.equal(isMultiSelectSelected(withText, "Other"), true);

    const cleared = toggleMultiSelectAnswer(withText, "Other");
    assert.equal(cleared, "FinTech");
  });

  it("scores Other with custom suffix using the Other table entry", () => {
    assert.equal(scoreForAnswer("dev_product_type", "Other: Climate tech"), 62);
    assert.equal(
      scoreForAnswer("mkt_sales_motion", "Other: Hybrid"),
      40,
    );
    assert.equal(
      scoreForAnswer("mkt_sales_motion", "Other (Please specify): Hybrid"),
      40,
    );
  });

  it("blocks onboarding module credit until Other text is filled", () => {
    assert.deepEqual(
      completedOnboardingModules({
        profile_company: "Acme",
        profile_product_description: "Widgets",
        profile_industry: "SaaS",
        dev_product_stage: "In active development",
        dev_product_type: "Other",
        dev_delivery_constraint: "Capacity and hiring",
      }),
      ["company"],
    );

    assert.deepEqual(
      completedOnboardingModules({
        profile_company: "Acme",
        profile_product_description: "Widgets",
        profile_industry: "SaaS",
        dev_product_stage: "In active development",
        dev_product_type: "Other: Climate",
        dev_delivery_constraint: "Capacity and hiring",
      }),
      ["company", "dev"],
    );
  });
});
