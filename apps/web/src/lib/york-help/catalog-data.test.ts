import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  YORK_HELP_CTA_LABEL,
  YORK_HELP_CTA_URL,
  YORK_HELP_MAX_SERVICES,
  YORK_HELP_SECTION_TITLE,
  yorkHelpDisplayTitle,
} from "./constants";
import {
  catalogFallbackYorkHelp,
  coerceYorkHelpFromRaw,
  formatYorkHelpCatalogForPrompt,
  mergeYorkHelpServiceCatalog,
  parseYorkHelpCatalogContent,
  serializeYorkHelpCatalog,
  serializeYorkHelpForClient,
  stripYorkHelpPromptAppendix,
  yorkHelpPromptAppendix,
  yorkHelpPromptRules,
  YORK_HELP_SERVICE_CATALOG,
} from "./catalog-data";

describe("coerceYorkHelpFromRaw", () => {
  it("keeps 1–2 in-category services and copies approved outcomes exactly", () => {
    const outcome =
      "ICP and segmentation grounded in customer and pipeline data";
    const coerced = coerceYorkHelpFromRaw(
      {
        bullets: [
          {
            primary_service: "Marketing Strategy",
            help: outcome,
            track: "gtm",
          },
          {
            primary_service: "Revenue Operations",
            help: "Streamlined processes, clear reporting, and optimized technology across the revenue team",
            track: "gtm",
          },
          {
            primary_service: "Paid Media & Demand Generation",
            help: "Paid channels, landing pages, and attribution infrastructure so pipeline is predictable and CAC is controlled",
            track: "gtm",
          },
        ],
      },
      "mkt",
    );
    assert.ok(coerced);
    assert.equal(coerced.section_title, YORK_HELP_SECTION_TITLE);
    assert.equal(coerced.cta_label, YORK_HELP_CTA_LABEL);
    assert.equal(YORK_HELP_CTA_LABEL.includes("york.ie"), false);
    assert.match(YORK_HELP_CTA_URL, /york\.ie\/services-request/);
    assert.equal(coerced.bullets.length, YORK_HELP_MAX_SERVICES);
    assert.equal(coerced.bullets[0]?.primary_service, "Marketing Strategy");
    assert.equal(coerced.bullets[0]?.help, outcome);
    assert.equal(coerced.bullets[0]?.milestone, "Marketing Strategy");
    assert.equal(coerced.bullets[0]?.title, "Marketing Strategy");
    assert.equal(coerced.bullets[0]?.track, "gtm");
    assert.equal(coerced.bullets[1]?.primary_service, "Revenue Operations");
  });

  it("drops services from the wrong track and keeps refined help on a valid service", () => {
    const coerced = coerceYorkHelpFromRaw(
      {
        bullets: [
          {
            title: "Prioritize the agentic AI roadmap",
            primary_service: "Product Strategy",
            help: "Roadmap planning tailored to your observability agent so the team stops building unused features",
            track: "rd",
          },
          {
            primary_service: "Marketing Strategy",
            help: "invented GTM copy",
            track: "gtm",
          },
        ],
      },
      "dev",
    );
    assert.ok(coerced);
    assert.equal(coerced.bullets.length, 1);
    assert.equal(coerced.bullets[0]?.primary_service, "Product Strategy");
    assert.equal(coerced.bullets[0]?.title, "Prioritize the agentic AI roadmap");
    assert.match(coerced.bullets[0]?.help ?? "", /observability agent/);
  });

  it("includes Technical Assessment as an R&D service", () => {
    const outcome =
      "Fast, rigorous evaluations of software architecture, code quality, security posture, and engineering processes";
    const coerced = coerceYorkHelpFromRaw(
      {
        bullets: [
          {
            primary_service: "Technical Assessment",
            help: outcome,
            track: "rd",
          },
        ],
      },
      "dev",
    );
    assert.ok(coerced);
    assert.equal(coerced.bullets[0]?.primary_service, "Technical Assessment");
    assert.equal(coerced.bullets[0]?.help, outcome);
  });

  it("returns null when no catalog service matches", () => {
    const coerced = coerceYorkHelpFromRaw(
      {
        bullets: [{ primary_service: "Not A Real Service", help: "nope" }],
      },
      "rev",
    );
    assert.equal(coerced, null);
  });

  it("does not treat track codes as service names", () => {
    const coerced = coerceYorkHelpFromRaw(
      {
        bullets: [
          { primary_service: "rd", help: "invented copy", track: "rd" },
          { primary_service: "gtm", help: "also invented", track: "gtm" },
        ],
      },
      "dev",
    );
    assert.equal(coerced, null);
  });

  it("recovers the catalog service when primary_service is a track code but help matches", () => {
    const outcome =
      "Roadmap planning, architecture guidance, and product-market alignment";
    const coerced = coerceYorkHelpFromRaw(
      {
        bullets: [{ primary_service: "rd", help: outcome, track: "rd" }],
      },
      "dev",
    );
    assert.ok(coerced);
    assert.equal(coerced.bullets[0]?.primary_service, "Product Strategy");
    assert.equal(coerced.bullets[0]?.help, outcome);
  });
});

describe("serializeYorkHelpForClient", () => {
  it("maps legacy track-code titles to R&D / GTM / G&A", () => {
    const serialized = serializeYorkHelpForClient({
      section_title: "How York IE can help",
      bullets: [
        {
          primary_service: "rd",
          help: "Validate product-market fit for agentic AI",
          track: "rd",
        },
        {
          primary_service: "rd",
          help: "Accelerate development through architecture review",
          track: "rd",
        },
        {
          primary_service: "gtm",
          help: "Design go-to-market strategy for new capabilities",
          track: "gtm",
        },
      ],
      cta_label: "Talk to the York IE team",
    });
    assert.ok(serialized);
    assert.equal(serialized.bullets.length, 3);
    assert.equal(serialized.bullets[0]?.primaryService, "R&D");
    assert.equal(serialized.bullets[1]?.primaryService, "R&D");
    assert.equal(serialized.bullets[2]?.primaryService, "GTM");
    assert.equal(serialized.bullets[0]?.title, "R&D");
    assert.equal(serialized.bullets[2]?.title, "GTM");
    assert.equal(serialized.bullets[0]?.track, "rd");
    assert.equal(serialized.bullets[2]?.track, "gtm");
  });

  it("keeps catalog service names and reads camelCase stored JSON", () => {
    const serialized = serializeYorkHelpForClient({
      sectionTitle: "How York IE can help",
      bullets: [
        {
          primaryService: "Product Strategy",
          help: "Clear prioritization frameworks that reduce unnecessary development work",
          track: "rd",
        },
      ],
      ctaLabel: "Talk to the York IE team",
    });
    assert.ok(serialized);
    assert.equal(serialized.bullets[0]?.primaryService, "Product Strategy");
    assert.equal(serialized.sectionTitle, YORK_HELP_SECTION_TITLE);
  });

  it("uses a personalized title as the heading when stored", () => {
    const serialized = serializeYorkHelpForClient({
      bullets: [
        {
          title: "Validate agentic AI positioning in observability",
          primary_service: "Product Strategy",
          help: "Roadmap planning tailored to your ITSM agent so the next quarter of build is sequenced against real buyer proof",
          track: "rd",
        },
      ],
    });
    assert.ok(serialized);
    assert.equal(
      serialized.bullets[0]?.title,
      "Validate agentic AI positioning in observability",
    );
    assert.equal(serialized.bullets[0]?.primaryService, "Product Strategy");
  });

  it("recovers the service name when help matches a catalog outcome", () => {
    const serialized = serializeYorkHelpForClient({
      bullets: [
        {
          primary_service: "rd",
          help: "Roadmap planning, architecture guidance, and product-market alignment",
          track: "rd",
        },
      ],
    });
    assert.ok(serialized);
    assert.equal(serialized.bullets[0]?.primaryService, "Product Strategy");
  });
});

describe("yorkHelpDisplayTitle", () => {
  it("never surfaces raw track codes", () => {
    assert.equal(yorkHelpDisplayTitle("rd", "rd"), "R&D");
    assert.equal(yorkHelpDisplayTitle("gtm"), "GTM");
    assert.equal(yorkHelpDisplayTitle("ga", "ga"), "G&A");
    assert.equal(yorkHelpDisplayTitle("", "gtm"), "GTM");
    assert.equal(yorkHelpDisplayTitle("Product Strategy", "rd"), "Product Strategy");
    assert.equal(
      yorkHelpDisplayTitle("Product Strategy", "rd", "Validate agentic AI positioning"),
      "Validate agentic AI positioning",
    );
  });
});

describe("york help Bedrock prompt", () => {
  it("tells the model primary_service is the visible catalog name, not rd/gtm/ga", () => {
    const rules = yorkHelpPromptRules();
    assert.match(rules, /VISIBLE HEADING/);
    assert.match(rules, /NEVER use track codes \(rd, gtm, ga\)/);
    assert.match(rules, /track is metadata only/);
    assert.match(rules, /refine it into a personalised response/);
  });

  it("lists catalog rows as primary_service / help, not bare track codes", () => {
    const formatted = formatYorkHelpCatalogForPrompt("dev");
    assert.match(formatted, /primary_service: "Product Strategy"/);
    assert.match(formatted, /approved outcome: "/);
    assert.match(formatted, /Never set title or primary_service to rd, gtm, ga/);
    assert.doesNotMatch(formatted, /^- rd \(/m);
  });
});

describe("stripYorkHelpPromptAppendix", () => {
  it("removes baked-in HOW YORK IE CAN HELP blocks and keeps the next section", () => {
    const appendix = yorkHelpPromptAppendix();
    const template = `Lead copy.\n${appendix}\n- suggested_playbooks: 3-6 items.\n`;
    const stripped = stripYorkHelpPromptAppendix(template);
    assert.equal(stripped.includes("HOW YORK IE CAN HELP"), false);
    assert.match(stripped, /suggested_playbooks: 3-6 items/);
    assert.match(stripped, /Lead copy/);
  });

  it("strips multiple copies", () => {
    const appendix = yorkHelpPromptAppendix();
    const template = `${appendix}\n${appendix}\nINITIATIVE RULES:\nstay`;
    const stripped = stripYorkHelpPromptAppendix(template);
    assert.equal((stripped.match(/HOW YORK IE CAN HELP/g) ?? []).length, 0);
    assert.match(stripped, /INITIATIVE RULES:/);
  });

  it("keeps the document-initiative tool instruction after a baked-in catalog", () => {
    const appendix = yorkHelpPromptAppendix();
    const template = `Lead.\n${appendix}\nCall the record_document_initiatives tool exactly once.`;
    const stripped = stripYorkHelpPromptAppendix(template);
    assert.equal(stripped.includes("HOW YORK IE CAN HELP"), false);
    assert.match(stripped, /Call the record_document_initiatives/);
    assert.match(stripped, /Lead/);
  });
});

describe("catalogFallbackYorkHelp", () => {
  it("returns 1–2 approved outcomes and never invents copy", () => {
    const fallback = catalogFallbackYorkHelp("rev", 0);
    assert.ok(fallback.bullets.length >= 1);
    assert.ok(fallback.bullets.length <= YORK_HELP_MAX_SERVICES);
    const byName = new Map(
      YORK_HELP_SERVICE_CATALOG.rev.map((s) => [s.name, s]),
    );
    for (const bullet of fallback.bullets) {
      const service = byName.get(bullet.primary_service);
      assert.ok(service);
      assert.ok(service.outcomes.includes(bullet.help));
      assert.equal(bullet.track, "ga");
    }
    assert.equal(fallback.cta_label, YORK_HELP_CTA_LABEL);
  });
});

describe("mergeYorkHelpServiceCatalog", () => {
  it("returns the static catalog when the database has no rows", () => {
    const merged = mergeYorkHelpServiceCatalog([]);
    assert.equal(merged.dev.length, YORK_HELP_SERVICE_CATALOG.dev.length);
    assert.equal(merged.mkt.length, YORK_HELP_SERVICE_CATALOG.mkt.length);
    assert.equal(merged.rev.length, YORK_HELP_SERVICE_CATALOG.rev.length);
  });

  it("uses DB rows for a category and falls back to static for missing categories", () => {
    const merged = mergeYorkHelpServiceCatalog([
      {
        category: "dev",
        name: "Custom R&D Service",
        outcomes: ["Approved custom outcome"],
        sortOrder: 0,
      },
    ]);
    assert.equal(merged.dev.length, 1);
    assert.equal(merged.dev[0]?.name, "Custom R&D Service");
    assert.equal(merged.dev[0]?.outcomes[0], "Approved custom outcome");
    assert.equal(merged.mkt.length, YORK_HELP_SERVICE_CATALOG.mkt.length);
    assert.equal(merged.rev.length, YORK_HELP_SERVICE_CATALOG.rev.length);
  });

  it("ignores invalid categories and empty outcomes", () => {
    const merged = mergeYorkHelpServiceCatalog([
      { category: "nope", name: "Bad", outcomes: ["x"], sortOrder: 0 },
      { category: "mkt", name: "Empty", outcomes: [], sortOrder: 0 },
      {
        category: "mkt",
        name: "Marketing Strategy",
        outcomes: ["ICP and segmentation grounded in customer and pipeline data"],
        sortOrder: 1,
      },
    ]);
    assert.equal(merged.mkt.length, 1);
    assert.equal(merged.mkt[0]?.name, "Marketing Strategy");
  });
});

describe("serialize/parseYorkHelpCatalogContent", () => {
  it("round-trips the static catalog", () => {
    const parsed = parseYorkHelpCatalogContent(serializeYorkHelpCatalog());
    assert.ok(parsed);
    assert.equal(parsed.dev.length, YORK_HELP_SERVICE_CATALOG.dev.length);
    assert.equal(parsed.mkt.length, YORK_HELP_SERVICE_CATALOG.mkt.length);
    assert.equal(parsed.rev.length, YORK_HELP_SERVICE_CATALOG.rev.length);
    assert.equal(parsed.dev[0]?.name, YORK_HELP_SERVICE_CATALOG.dev[0]?.name);
    assert.equal(
      parsed.dev[0]?.outcomes[0],
      YORK_HELP_SERVICE_CATALOG.dev[0]?.outcomes[0],
    );
  });

  it("accepts a markdown JSON fence and falls back missing categories", () => {
    const parsed = parseYorkHelpCatalogContent(`\`\`\`json
{
  "dev": [{ "name": "Custom R&D Service", "outcomes": ["Approved custom outcome"] }]
}
\`\`\``);
    assert.ok(parsed);
    assert.equal(parsed.dev.length, 1);
    assert.equal(parsed.dev[0]?.name, "Custom R&D Service");
    assert.equal(parsed.mkt.length, YORK_HELP_SERVICE_CATALOG.mkt.length);
  });

  it("returns null for invalid JSON", () => {
    assert.equal(parseYorkHelpCatalogContent("not json"), null);
    assert.equal(parseYorkHelpCatalogContent("{}"), null);
  });
});
