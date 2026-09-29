import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMilestoneDueDateOnOrAfter } from "@/lib/initiative-milestone-dates";
import { normalizeOverviewAiResponse, normalizeTaggedIntelligenceTypes } from "./normalize-ai-response";
import { OverviewAiResponseSchema } from "./types";
import { YORK_HELP_CTA_LABEL } from "@/lib/york-help/constants";

const SAMPLE_SIGNAL_CATALOG = [
  {
    id: "logo_retention_pct",
    label: "Logo retention",
    category: "retention",
    kind: "quantitative" as const,
    unit: "pct",
  },
  {
    id: "arr_usd",
    label: "ARR",
    category: "finance",
    kind: "quantitative" as const,
    unit: "usd",
  },
  {
    id: "gtm_motion",
    label: "GTM motion",
    category: "gtm",
    kind: "qualitative" as const,
    unit: null,
  },
  {
    id: "breakeven_achieved_flag",
    label: "EBITDA-breakeven reached",
    category: "board_reporting",
    kind: "boolean" as const,
    unit: null,
  },
];

describe("normalizeOverviewAiResponse", () => {
  it("maps legacy category ids and fills missing strengths metadata", () => {
    const normalized = normalizeOverviewAiResponse(
      {
        advisor: {
          summary: "Hello founder",
          signal_tags: [{ category_id: "gtm", label: "GTM", urgency: "high", suffix: "risk", risk_count: 1 }],
          recommended_actions: [
            { title: "Log benchmarks", sub: "Add ARR", cta: "Open", done: false, action_type: "benchmarks" },
          ],
        },
        categories: [
          {
            id: "rd",
            label: "R&D",
            full_label: "Research and Development",
            strengths: [{ label: "Fast shipping", detail: "Weekly releases" }],
            weaknesses: [{ label: "Tech debt", detail: "Needs refactor" }],
          },
          { id: "mkt", label: "GTM", full_label: "Go to Market" },
          { id: "ga", label: "G&A", full_label: "General & Administration" },
        ],
        intelligence: [
          {
            signal_id: "logo_retention_pct",
            type: "GTM",
            title: "Retention watch",
            text: "Logo retention below median",
            value_numeric: 72,
            category_id: "gtm",
          },
        ],
        suggested_initiatives: [
          {
            title: "Fix onboarding",
            description: "Improve activation",
            category: "gtm",
            cadence: "recurring",
            milestones: [{ title: "Audit funnel" }],
          },
        ],
        suggested_playbooks: [{ slug: "initial-deal-screen", reason: "Useful" }],
        journey_stage: { stage: "seed", name: "Seed stage" },
      },
      { signalCatalog: SAMPLE_SIGNAL_CATALOG },
    );

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    assert.equal(parsed.data.categories.length, 3);
    assert.equal(parsed.data.categories[0]?.id, "dev");
    assert.equal(parsed.data.categories[0]?.strengths[0]?.id, "dev_strength_0");
    assert.equal(parsed.data.intelligence[0]?.category_id, "mkt");
    assert.equal(parsed.data.intelligence[0]?.signal_id, "logo_retention_pct");
    assert.equal(parsed.data.intelligence[0]?.title, "Logo retention");
    assert.equal(parsed.data.suggested_initiatives[0]?.title, "Fix onboarding");
    assert.equal(parsed.data.suggested_initiatives[0]?.milestones.length, 1);
    assert.equal(parsed.data.suggested_initiatives[0]?.milestones[0]?.title, "Audit funnel");
  });

  it("grounds intelligence titles from catalog and drops unknown or missing signal_id", () => {
    const normalized = normalizeOverviewAiResponse(
      {
        advisor: { summary: "Summary" },
        categories: [
          { id: "dev", label: "R&D", full_label: "Research and Development" },
          { id: "mkt", label: "GTM", full_label: "Go to Market" },
          { id: "rev", label: "G&A", full_label: "General & Administration" },
        ],
        intelligence: [
          {
            signal_id: "arr_usd",
            title: "Freeform ARR title",
            text: "ARR is growing",
            value_numeric: 1_200_000,
            category_id: "rev",
          },
          {
            signal_id: "not_a_real_signal",
            text: "Should drop",
            value_numeric: 1,
            category_id: "mkt",
          },
          {
            title: "Missing signal id",
            text: "Should drop",
            category_id: "dev",
          },
          {
            signal_id: "arr_usd",
            text: "Duplicate signal — keep first only",
            value_numeric: 2_000_000,
            category_id: "rev",
          },
        ],
      },
      { signalCatalog: SAMPLE_SIGNAL_CATALOG },
    );

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    assert.equal(parsed.data.intelligence.length, 1);
    assert.equal(parsed.data.intelligence[0]?.signal_id, "arr_usd");
    assert.equal(parsed.data.intelligence[0]?.title, "ARR");
    assert.equal(parsed.data.intelligence[0]?.type, "finance");
    assert.equal(parsed.data.intelligence[0]?.signal_category, "finance");
    assert.equal(parsed.data.intelligence[0]?.value_numeric, 1_200_000);
    assert.equal(parsed.data.intelligence[0]?.highlight, "$1.2M");
  });

  it("omits intelligence when typed value is missing or wrong kind", () => {
    const normalized = normalizeOverviewAiResponse(
      {
        advisor: { summary: "Summary" },
        categories: [
          { id: "dev", label: "R&D", full_label: "Research and Development" },
          { id: "mkt", label: "GTM", full_label: "Go to Market" },
          { id: "rev", label: "G&A", full_label: "General & Administration" },
        ],
        intelligence: [
          {
            signal_id: "arr_usd",
            text: "Free-text highlight only — drop",
            highlight: "approximately $1.2M",
            category_id: "rev",
          },
          {
            signal_id: "breakeven_achieved_flag",
            text: "String bool — drop",
            value_bool: "true",
            category_id: "rev",
          },
          {
            signal_id: "gtm_motion",
            text: "Valid qualitative",
            value_text: "Sales-led",
            category_id: "mkt",
          },
          {
            signal_id: "breakeven_achieved_flag",
            text: "Valid boolean",
            value_bool: true,
            category_id: "rev",
          },
        ],
      },
      { signalCatalog: SAMPLE_SIGNAL_CATALOG },
    );

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    assert.equal(parsed.data.intelligence.length, 2);
    assert.equal(parsed.data.intelligence[0]?.signal_id, "gtm_motion");
    assert.equal(parsed.data.intelligence[0]?.highlight, "Sales-led");
    assert.equal(parsed.data.intelligence[0]?.value_text, "Sales-led");
    assert.equal(parsed.data.intelligence[1]?.signal_id, "breakeven_achieved_flag");
    assert.equal(parsed.data.intelligence[1]?.highlight, "Yes");
    assert.equal(parsed.data.intelligence[1]?.value_bool, true);
  });

  it("passes through evidence_source on intelligence items", () => {
    const normalized = normalizeOverviewAiResponse(
      {
        advisor: { summary: "Summary" },
        categories: [
          { id: "dev", label: "R&D", full_label: "Research and Development" },
          { id: "mkt", label: "GTM", full_label: "Go to Market" },
          { id: "rev", label: "G&A", full_label: "General & Administration" },
        ],
        intelligence: [
          {
            signal_id: "logo_retention_pct",
            text: "Retention from profile",
            value_numeric: 88,
            category_id: "mkt",
            evidence_source: "profile",
          },
        ],
      },
      { signalCatalog: SAMPLE_SIGNAL_CATALOG },
    );

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    assert.equal(parsed.data.intelligence[0]?.evidence_source, "profile");
  });

  it("keeps string milestones and fills empty milestone arrays", () => {
    const normalized = normalizeOverviewAiResponse({
      advisor: { summary: "Summary" },
      categories: [
        { id: "dev", label: "R&D", full_label: "Research and Development" },
        { id: "mkt", label: "GTM", full_label: "Go to Market" },
        { id: "rev", label: "G&A", full_label: "General & Administration" },
      ],
      suggested_initiatives: [
        {
          title: "Tighten ICP qualification",
          description: "Rewrite ICP disqualify criteria before next outbound sprint.",
          category_id: "mkt",
          cadence: "one-time",
          milestones: ["Map disqualify rules", { label: "Pilot on 25 accounts" }],
        },
        {
          title: "Cut cloud burn",
          description: "Rightsize idle staging clusters this quarter.",
          category_id: "rev",
          cadence: "recurring",
          milestones: [],
        },
      ],
    });

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    const first = parsed.data.suggested_initiatives[0];
    const second = parsed.data.suggested_initiatives[1];
    assert.equal(first?.milestones.length, 2);
    assert.equal(first?.milestones[0]?.title, "Map disqualify rules");
    assert.equal(first?.milestones[1]?.title, "Pilot on 25 accounts");
    assert.ok((second?.milestones.length ?? 0) >= 2);
    assert.notEqual(second?.milestones[0]?.title, "");
  });

  it("maps initiative benefit from the model payload", () => {
    const normalized = normalizeOverviewAiResponse({
      advisor: { summary: "Summary" },
      categories: [
        { id: "dev", label: "R&D", full_label: "Research and Development" },
        { id: "mkt", label: "GTM", full_label: "Go to Market" },
        { id: "rev", label: "G&A", full_label: "General & Administration" },
      ],
      suggested_initiatives: [
        {
          title: "Tighten ICP qualification",
          description: "Rewrite ICP disqualify criteria before next outbound sprint.",
          benefit: "Clearer ICP raises win rate and shortens the sales cycle.",
          category_id: "mkt",
          cadence: "one-time",
          milestones: [{ title: "Map disqualify rules" }],
        },
      ],
    });

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    assert.equal(
      parsed.data.suggested_initiatives[0]?.benefit,
      "Clearer ICP raises win rate and shortens the sales cycle.",
    );
  });

  it("derives initiative titles when the model omits title", () => {
    const normalized = normalizeOverviewAiResponse({
      advisor: { summary: "Summary" },
      categories: [
        { id: "dev", label: "R&D", full_label: "Research and Development" },
        { id: "mkt", label: "GTM", full_label: "Go to Market" },
        { id: "rev", label: "G&A", full_label: "General & Administration" },
      ],
      suggested_initiatives: [
        {
          category_id: "mkt",
          cadence: "one-time",
          description: "Tighten ICP qualification before next outbound sprint.",
        },
        {
          category_id: "dev",
          cadence: "recurring",
          title: "Initiative",
          milestones: [{ title: "Ship weekly release cadence" }],
        },
        {
          category_id: "rev",
          cadence: "recurring",
        },
      ],
    });

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    assert.equal(
      parsed.data.suggested_initiatives[0]?.title,
      "Tighten ICP qualification before next outbound sprint",
    );
    assert.equal(parsed.data.suggested_initiatives[1]?.title, "Ship weekly release cadence");
    assert.equal(parsed.data.suggested_initiatives[2]?.title, "G&A operating initiative");
    assert.notEqual(parsed.data.suggested_initiatives[2]?.description, "");
  });

  it("clamps past milestone due dates to progressive future dates", () => {
    const normalized = normalizeOverviewAiResponse({
      advisor: { summary: "Summary" },
      categories: [
        { id: "dev", label: "R&D", full_label: "Research and Development" },
        { id: "mkt", label: "GTM", full_label: "Go to Market" },
        { id: "rev", label: "G&A", full_label: "General & Administration" },
      ],
      suggested_initiatives: [
        {
          title: "Build Series A narrative",
          description: "Prepare fundraising materials.",
          category_id: "rev",
          cadence: "one-time",
          milestones: [
            { title: "Define narrative", due_date: "01-15-2025" },
            { title: "Build deck", due_date: "12-31-2099" },
            { title: "Launch outreach" },
          ],
        },
      ],
    });

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    const milestones = parsed.data.suggested_initiatives[0]?.milestones ?? [];
    assert.equal(milestones.length, 3);
    assert.notEqual(milestones[0]?.due_date, "01-15-2025");
    assert.equal(isMilestoneDueDateOnOrAfter(milestones[0]?.due_date ?? ""), true);
    assert.equal(milestones[1]?.due_date, "12-31-2099");
    assert.equal(isMilestoneDueDateOnOrAfter(milestones[2]?.due_date ?? ""), true);
  });

  it("coerces york_help to 1–2 catalog services with approved outcomes", () => {
    const normalized = normalizeOverviewAiResponse({
      advisor: { summary: "Summary" },
      categories: [
        { id: "dev", label: "R&D", full_label: "Research and Development" },
        { id: "mkt", label: "GTM", full_label: "Go to Market" },
        { id: "rev", label: "G&A", full_label: "General & Administration" },
      ],
      suggested_initiatives: [
        {
          title: "Tighten ICP qualification",
          description: "Rewrite ICP disqualify criteria before next outbound sprint.",
          category_id: "mkt",
          cadence: "one-time",
          milestones: [{ title: "Map disqualify rules" }],
          york_help: {
            section_title: "How York IE can help",
            bullets: [
              {
                primary_service: "Marketing Strategy",
                help: "ICP and segmentation grounded in customer and pipeline data",
                track: "gtm",
              },
              {
                primary_service: "Product Strategy",
                help: "invented R&D copy on a GTM initiative",
                track: "rd",
              },
              {
                primary_service: "Content Strategy & SEO",
                help: "paraphrased SEO help",
                track: "gtm",
              },
            ],
            cta_label: "Talk to York IE",
          },
        },
      ],
    });

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    const help = parsed.data.suggested_initiatives[0]?.york_help;
    assert.ok(help);
    assert.equal(help.bullets.length, 2);
    assert.equal(help.bullets[0]?.primary_service, "Marketing Strategy");
    assert.equal(
      help.bullets[0]?.help,
      "ICP and segmentation grounded in customer and pipeline data",
    );
    assert.equal(help.bullets[1]?.primary_service, "Content Strategy & SEO");
    assert.equal(help.bullets[1]?.help, "paraphrased SEO help");
    assert.equal(help.cta_label, YORK_HELP_CTA_LABEL);
  });

  it("fills york_help from the catalog when the model omits it", () => {
    const normalized = normalizeOverviewAiResponse({
      advisor: { summary: "Summary" },
      categories: [
        { id: "dev", label: "R&D", full_label: "Research and Development" },
        { id: "mkt", label: "GTM", full_label: "Go to Market" },
        { id: "rev", label: "G&A", full_label: "General & Administration" },
      ],
      suggested_initiatives: [
        {
          title: "Close the books on time",
          description: "Stand up a reliable month-end close.",
          category_id: "rev",
          cadence: "recurring",
          milestones: [{ title: "Document close checklist" }],
        },
      ],
    });

    const parsed = OverviewAiResponseSchema.safeParse(normalized);
    assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
    if (!parsed.success) return;
    const help = parsed.data.suggested_initiatives[0]?.york_help;
    assert.ok(help);
    assert.ok(help.bullets.length >= 1 && help.bullets.length <= 2);
    assert.equal(help.bullets[0]?.track, "ga");
  });

  it("coerces singular, array, and comma-separated intelligence tags", () => {
    const categories = [
      { id: "dev", label: "R&D", full_label: "Research and Development" },
      { id: "mkt", label: "GTM", full_label: "Go to Market" },
      { id: "rev", label: "G&A", full_label: "General & Administration" },
    ];
    const base = {
      advisor: { summary: "Summary" },
      categories,
    };

    const fromSingular = normalizeOverviewAiResponse({
      ...base,
      suggested_initiatives: [
        {
          title: "Tighten ICP qualification",
          description: "Rewrite ICP disqualify criteria.",
          category_id: "mkt",
          tagged_intelligence_type: "Growth",
          milestones: [{ title: "Map disqualify rules" }],
        },
      ],
    });
    const singularParsed = OverviewAiResponseSchema.safeParse(fromSingular);
    assert.equal(singularParsed.success, true);
    assert.deepEqual(singularParsed.data?.suggested_initiatives[0]?.tagged_intelligence_types, [
      "Growth",
    ]);
    assert.equal(singularParsed.data?.suggested_initiatives[0]?.tagged_intelligence_type, "Growth");

    const fromArray = normalizeOverviewAiResponse({
      ...base,
      suggested_initiatives: [
        {
          title: "Tighten ICP qualification",
          description: "Rewrite ICP disqualify criteria.",
          category_id: "mkt",
          tagged_intelligence_types: ["Growth", "runway", "Growth"],
          tagged_intelligence_type: "Retention",
          milestones: [{ title: "Map disqualify rules" }],
        },
      ],
    });
    const arrayParsed = OverviewAiResponseSchema.safeParse(fromArray);
    assert.equal(arrayParsed.success, true);
    assert.deepEqual(arrayParsed.data?.suggested_initiatives[0]?.tagged_intelligence_types, [
      "Growth",
      "runway",
      "Retention",
    ]);

    const fromEmpty = normalizeOverviewAiResponse({
      ...base,
      suggested_initiatives: [
        {
          title: "Tighten ICP qualification",
          description: "Rewrite ICP disqualify criteria.",
          category_id: "mkt",
          tagged_intelligence_types: [],
          tagged_intelligence_type: null,
          milestones: [{ title: "Map disqualify rules" }],
        },
      ],
    });
    const emptyParsed = OverviewAiResponseSchema.safeParse(fromEmpty);
    assert.equal(emptyParsed.success, true);
    assert.deepEqual(emptyParsed.data?.suggested_initiatives[0]?.tagged_intelligence_types, []);
    assert.equal(emptyParsed.data?.suggested_initiatives[0]?.tagged_intelligence_type, null);
  });
});

describe("normalizeTaggedIntelligenceTypes", () => {
  it("splits comma-separated tags and de-dupes case-insensitively", () => {
    assert.deepEqual(
      normalizeTaggedIntelligenceTypes({
        tagged_intelligence_type: "Growth, runway, growth",
      }),
      ["Growth", "runway"],
    );
  });

  it("returns empty when no tags are present", () => {
    assert.deepEqual(normalizeTaggedIntelligenceTypes({}), []);
    assert.deepEqual(
      normalizeTaggedIntelligenceTypes({
        tagged_intelligence_type: null,
        tagged_intelligence_types: [],
      }),
      [],
    );
  });
});
