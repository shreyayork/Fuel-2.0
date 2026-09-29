/**
 * Canonical York IE service catalog + approved outcome statements.
 * No "server-only" — defaults.ts / seed-playbooks (Lambda) import this.
 */
import {
  YORK_HELP_CTA_LABEL,
  YORK_HELP_MAX_SERVICES,
  YORK_HELP_SECTION_TITLE,
  YORK_HELP_TRACK_LABELS,
  isYorkHelpTrackCode,
} from "./constants";

export type YorkHelpCategoryId = "dev" | "mkt" | "rev";
export type YorkHelpTrack = "rd" | "gtm" | "ga";

export type YorkHelpServiceEntry = {
  name: string;
  outcomes: readonly string[];
};

export type YorkHelpServiceCatalog = Record<
  YorkHelpCategoryId,
  readonly YorkHelpServiceEntry[]
>;

export const YORK_HELP_SERVICE_CATALOG: YorkHelpServiceCatalog = {
  dev: [
    {
      name: "Product Strategy",
      outcomes: [
        "Clear prioritization frameworks that reduce unnecessary development work",
        "Roadmap planning, architecture guidance, and product-market alignment",
      ],
    },
    {
      name: "AI Transformation",
      outcomes: [
        "End-to-end AI strategy, adoption, and implementation embedded into your product and workflows",
        "AI features built into your product that differentiate it and drive customer retention",
      ],
    },
    {
      name: "AI, ML & Data Science",
      outcomes: [
        "Custom ML models, LLMs, RAG pipelines, NLP, and Generative AI features built for production",
      ],
    },
    {
      name: "Full Lifecycle Software Development",
      outcomes: [
        "MVP builds, feature delivery, modernization, and integrations with full-stack engineering support",
        "Accelerate roadmap execution and deliver MVPs and new features faster to capture revenue sooner",
      ],
    },
    {
      name: "QA Engineering & Automation",
      outcomes: [
        "Automated test suites, release process design, and quality frameworks that reduce bugs and downtime",
      ],
    },
    {
      name: "DevOps",
      outcomes: [
        "CI/CD pipelines, cloud infrastructure, serverless architecture, and infrastructure-as-code",
      ],
    },
    {
      name: "UX Design",
      outcomes: [
        "Research, wireframing, prototyping, and high-fidelity design across web, mobile, and hybrid environments",
      ],
    },
    {
      name: "BI & Data Engineering",
      outcomes: [
        "Data lakes, ETL pipelines, analytics dashboards, and business intelligence infrastructure",
      ],
    },
    {
      name: "Technical Assessment",
      outcomes: [
        "Fast, rigorous evaluations of software architecture, code quality, security posture, and engineering processes",
      ],
    },
    {
      name: "Tech Due Diligence",
      outcomes: [
        "Pre-acquisition technical assessment, architecture review, code quality analysis, and risk reporting",
      ],
    },
    {
      name: "Mobile Apps",
      outcomes: [
        "Native and hybrid iOS and Android applications, React Native, and cross-platform development",
      ],
    },
  ],
  mkt: [
    {
      name: "Marketing Strategy",
      outcomes: [
        "ICP and segmentation grounded in customer and pipeline data",
        "Integrated channel strategy with clear priorities and ownership",
        "Marketing investments aligned to pipeline and revenue goals",
      ],
    },
    {
      name: "Sales & RevOps Strategy",
      outcomes: [
        "GTM motion mapped to your business stage — product-led, sales-led, or hybrid",
      ],
    },
    {
      name: "Revenue Operations",
      outcomes: [
        "Aligned sales, marketing, and customer success teams optimizing revenue generation",
        "Streamlined processes, clear reporting, and optimized technology across the revenue team",
      ],
    },
    {
      name: "CRM Architecture & Administration",
      outcomes: [
        "CRM configured for how your sales motion actually works, with clean data and accurate forecasting",
      ],
    },
    {
      name: "Content Strategy & SEO",
      outcomes: [
        "Organic growth engine built on keyword strategy, pillar content, and a production workflow that runs consistently",
      ],
    },
    {
      name: "Paid Media & Demand Generation",
      outcomes: [
        "Paid channels, landing pages, and attribution infrastructure so pipeline is predictable and CAC is controlled",
      ],
    },
    {
      name: "Website Development & Optimization",
      outcomes: [
        "B2B SaaS websites built for conversion — turning visits into qualified pipeline",
      ],
    },
    {
      name: "Email & Marketing Automation",
      outcomes: [
        "Automated nurture sequences and lifecycle campaigns that convert without manual effort",
      ],
    },
    {
      name: "GTM Automation & AI",
      outcomes: [
        "AI agents deployed across GTM workflows to compound output without adding headcount",
      ],
    },
    {
      name: "GTM Systems Assessments",
      outcomes: [
        "Structured audit of current GTM strategy, tools, and integrations with a prioritized action plan",
      ],
    },
  ],
  rev: [
    {
      name: "Accounting & Bookkeeping",
      outcomes: [
        "Reliable month-end closes delivered on schedule with accurate, audit-ready financials",
        "Clean books, documented processes, and reliable controls ready for fundraising and diligence",
      ],
    },
    {
      name: "Financial Reporting",
      outcomes: [
        "Consistent, trusted view of financial performance for leadership and investors every month",
      ],
    },
    {
      name: "FP&A and Strategic Finance",
      outcomes: [
        "Rolling forecast and financial model that turns raw numbers into decisions",
        "Investor-grade financial models, dashboards, and materials for capital raises and board reporting",
      ],
    },
    {
      name: "Operational Finance Support",
      outcomes: [
        "Foundational accounting and financial planning with strategic insights for confident decision-making",
      ],
    },
    {
      name: "Fundraising Prep",
      outcomes: [
        "Investor-ready financial model, data room, and narrative aligned for diligence and capital raises",
      ],
    },
    {
      name: "Corporate Strategy",
      outcomes: [
        "Annual operating plan tied to real books, with OKRs connected to business outcomes",
      ],
    },
  ],
};

export type YorkHelpBullet = {
  title: string;
  milestone: string;
  help: string;
  primary_service: string;
  track: YorkHelpTrack;
};

export type YorkHelpPayload = {
  section_title: string;
  bullets: YorkHelpBullet[];
  cta_label: string;
};

export function isYorkHelpCategoryId(
  value: string | null | undefined,
): value is YorkHelpCategoryId {
  return value === "dev" || value === "mkt" || value === "rev";
}

export function trackForCategoryId(categoryId: YorkHelpCategoryId): YorkHelpTrack {
  if (categoryId === "dev") return "rd";
  if (categoryId === "mkt") return "gtm";
  return "ga";
}

function categoryIdForTrack(track: YorkHelpTrack): YorkHelpCategoryId {
  if (track === "rd") return "dev";
  if (track === "gtm") return "mkt";
  return "rev";
}

function parseTrack(value: unknown): YorkHelpTrack | null {
  const code = asString(value).toLowerCase();
  return isYorkHelpTrackCode(code) ? code : null;
}

function findCatalogService(
  name: string,
  catalog: YorkHelpServiceCatalog,
): YorkHelpServiceEntry | undefined {
  if (!name) return undefined;
  for (const category of YORK_HELP_CATEGORIES) {
    const hit = catalog[category].find((service) => service.name === name);
    if (hit) return hit;
  }
  return undefined;
}

function findServiceByOutcome(
  help: string,
  catalog: YorkHelpServiceCatalog,
  categoryId?: YorkHelpCategoryId,
): YorkHelpServiceEntry | undefined {
  if (!help) return undefined;
  const categories = categoryId ? [categoryId] : YORK_HELP_CATEGORIES;
  for (const category of categories) {
    const hit = catalog[category].find((service) => service.outcomes.includes(help));
    if (hit) return hit;
  }
  return undefined;
}

export function allowedServicesForCategory(
  categoryId: YorkHelpCategoryId,
  catalog: YorkHelpServiceCatalog = YORK_HELP_SERVICE_CATALOG,
): readonly string[] {
  return catalog[categoryId].map((service) => service.name);
}

export function resolveYorkHelpCategoryId(
  overviewCategoryId: string | null | undefined,
  area?: string | null,
): YorkHelpCategoryId {
  if (isYorkHelpCategoryId(overviewCategoryId)) return overviewCategoryId;
  const a = (area ?? "").toLowerCase();
  if (a === "product" || a === "ops") return "dev";
  if (a === "gtm") return "mkt";
  if (a === "finance" || a === "people") return "rev";
  return "mkt";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function refinedHelp(service: YorkHelpServiceEntry, help: string): string {
  const trimmed = help.trim();
  if (!trimmed || isYorkHelpTrackCode(trimmed)) {
    return service.outcomes[0] ?? service.name;
  }
  return trimmed;
}

function personalizedTitle(raw: string, serviceName: string): string {
  const trimmed = raw.trim();
  if (!trimmed || isYorkHelpTrackCode(trimmed)) return serviceName;
  return trimmed;
}

function parseOutcomes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Merge override rows into the static catalog. Categories with no valid
 * rows fall back to {@link YORK_HELP_SERVICE_CATALOG}. Empty input → full static catalog.
 */
export function mergeYorkHelpServiceCatalog(
  rows: Array<{
    category: string;
    name: string;
    outcomes: unknown;
    sortOrder?: number | null;
  }>,
): YorkHelpServiceCatalog {
  const grouped: Record<YorkHelpCategoryId, YorkHelpServiceEntry[]> = {
    dev: [],
    mkt: [],
    rev: [],
  };
  const sorted = [...rows].sort((a, b) => {
    const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (order !== 0) return order;
    return a.name.localeCompare(b.name);
  });
  for (const row of sorted) {
    if (!isYorkHelpCategoryId(row.category)) continue;
    const name = row.name.trim();
    const outcomes = parseOutcomes(row.outcomes);
    if (!name || outcomes.length === 0) continue;
    grouped[row.category].push({ name, outcomes });
  }
  return {
    dev: grouped.dev.length > 0 ? grouped.dev : YORK_HELP_SERVICE_CATALOG.dev,
    mkt: grouped.mkt.length > 0 ? grouped.mkt : YORK_HELP_SERVICE_CATALOG.mkt,
    rev: grouped.rev.length > 0 ? grouped.rev : YORK_HELP_SERVICE_CATALOG.rev,
  };
}

const YORK_HELP_CATEGORIES: YorkHelpCategoryId[] = ["dev", "mkt", "rev"];

/** Pretty-printed JSON stored in the `york-help-catalog` system playbook. */
export function serializeYorkHelpCatalog(
  catalog: YorkHelpServiceCatalog = YORK_HELP_SERVICE_CATALOG,
): string {
  const payload: Record<
    YorkHelpCategoryId,
    Array<{ name: string; outcomes: string[] }>
  > = {
    dev: catalog.dev.map((service) => ({
      name: service.name,
      outcomes: [...service.outcomes],
    })),
    mkt: catalog.mkt.map((service) => ({
      name: service.name,
      outcomes: [...service.outcomes],
    })),
    rev: catalog.rev.map((service) => ({
      name: service.name,
      outcomes: [...service.outcomes],
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

/**
 * Parse Super Admin playbook content into a catalog.
 * Invalid JSON or an empty object → null (caller uses the static fallback).
 * Missing categories fall back to the static list via {@link mergeYorkHelpServiceCatalog}.
 */
export function parseYorkHelpCatalogContent(
  raw: string,
): YorkHelpServiceCatalog | null {
  try {
    const parsed: unknown = JSON.parse(stripJsonFence(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const obj = parsed as Record<string, unknown>;
    const rows: Array<{
      category: string;
      name: string;
      outcomes: unknown;
      sortOrder: number;
    }> = [];
    for (const category of YORK_HELP_CATEGORIES) {
      const list = obj[category];
      if (!Array.isArray(list)) continue;
      list.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return;
        const rec = item as Record<string, unknown>;
        const name = typeof rec.name === "string" ? rec.name : "";
        rows.push({
          category,
          name,
          outcomes: rec.outcomes,
          sortOrder: index,
        });
      });
    }
    if (rows.length === 0) return null;
    return mergeYorkHelpServiceCatalog(rows);
  } catch {
    return null;
  }
}

/** Coerce model JSON to 1–2 catalog services with a personalized title and refined help. */
export function coerceYorkHelpFromRaw(
  raw: unknown,
  categoryId: YorkHelpCategoryId,
  catalog: YorkHelpServiceCatalog = YORK_HELP_SERVICE_CATALOG,
): YorkHelpPayload | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const bulletsRaw = Array.isArray(row.bullets) ? row.bullets : [];
  const track = trackForCategoryId(categoryId);
  const byName = new Map(
    catalog[categoryId].map((service) => [service.name, service]),
  );
  const seen = new Set<string>();
  const bullets: YorkHelpBullet[] = [];

  for (const item of bulletsRaw) {
    if (bullets.length >= YORK_HELP_MAX_SERVICES) break;
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    const b = item as Record<string, unknown>;
    const primaryRaw = asString(b.primary_service ?? b.primaryService);
    const primary = isYorkHelpTrackCode(primaryRaw) ? "" : primaryRaw;
    const helpRaw = asString(b.help ?? b.text ?? b.description);
    const service =
      (primary ? byName.get(primary) : undefined) ??
      (helpRaw
        ? catalog[categoryId].find((entry) => entry.outcomes.includes(helpRaw))
        : undefined);
    if (!service || seen.has(service.name)) continue;
    const help = refinedHelp(service, helpRaw);
    if (!help) continue;
    const title = personalizedTitle(
      asString(b.title ?? b.heading),
      service.name,
    );
    seen.add(service.name);
    bullets.push({
      title,
      milestone: title,
      help,
      primary_service: service.name,
      track,
    });
  }

  if (bullets.length === 0) return null;
  return {
    section_title: YORK_HELP_SECTION_TITLE,
    bullets,
    cta_label: YORK_HELP_CTA_LABEL,
  };
}

export type YorkHelpClientSummary = {
  sectionTitle: string;
  bullets: Array<{
    title: string;
    milestone: string;
    help: string;
    primaryService: string;
    track: YorkHelpTrack;
  }>;
  ctaLabel: string;
};

function bulletDisplayTitle(
  primaryRaw: string,
  milestoneRaw: string,
  help: string,
  track: YorkHelpTrack,
  catalog: YorkHelpServiceCatalog,
): string {
  const named =
    (!isYorkHelpTrackCode(primaryRaw)
      ? findCatalogService(primaryRaw, catalog)
      : undefined) ??
    (!isYorkHelpTrackCode(milestoneRaw)
      ? findCatalogService(milestoneRaw, catalog)
      : undefined) ??
    findServiceByOutcome(help, catalog, categoryIdForTrack(track)) ??
    findServiceByOutcome(help, catalog);
  if (named) return named.name;
  if (primaryRaw && !isYorkHelpTrackCode(primaryRaw)) return primaryRaw;
  if (milestoneRaw && !isYorkHelpTrackCode(milestoneRaw)) return milestoneRaw;
  return YORK_HELP_TRACK_LABELS[track];
}

/**
 * Map stored york_help JSON (snake_case, camelCase, or legacy track-as-title)
 * to the client shape. Never surfaces raw rd/gtm/ga as the heading.
 */
export function serializeYorkHelpForClient(
  raw: unknown,
  catalog: YorkHelpServiceCatalog = YORK_HELP_SERVICE_CATALOG,
): YorkHelpClientSummary | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const bulletsRaw = Array.isArray(row.bullets) ? row.bullets : [];
  const bullets: YorkHelpClientSummary["bullets"] = [];

  for (const item of bulletsRaw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    const b = item as Record<string, unknown>;
    const help = asString(b.help ?? b.text ?? b.description);
    if (!help) continue;
    const primaryRaw = asString(b.primary_service ?? b.primaryService);
    const milestoneRaw = asString(b.milestone);
    const titleRaw = asString(b.title ?? b.heading);
    const track =
      parseTrack(b.track) ??
      parseTrack(primaryRaw) ??
      parseTrack(milestoneRaw) ??
      parseTrack(titleRaw) ??
      "gtm";
    const catalogName = bulletDisplayTitle(
      primaryRaw,
      milestoneRaw,
      help,
      track,
      catalog,
    );
    const title = personalizedTitle(titleRaw || milestoneRaw, catalogName);
    bullets.push({
      title,
      milestone: milestoneRaw || title,
      help,
      primaryService: catalogName,
      track,
    });
  }

  if (bullets.length === 0) return null;
  return {
    sectionTitle:
      asString(row.section_title ?? row.sectionTitle) || YORK_HELP_SECTION_TITLE,
    bullets,
    ctaLabel: asString(row.cta_label ?? row.ctaLabel) || YORK_HELP_CTA_LABEL,
  };
}

/** Deterministic 1–2 services from the catalog when the model fails. */
export function catalogFallbackYorkHelp(
  categoryId: YorkHelpCategoryId,
  seed = 0,
  catalog: YorkHelpServiceCatalog = YORK_HELP_SERVICE_CATALOG,
): YorkHelpPayload {
  const services = catalog[categoryId];
  const track = trackForCategoryId(categoryId);
  const n = services.length;
  const start = n > 0 ? Math.abs(seed) % n : 0;
  const picked =
    n === 0
      ? []
      : n === 1
        ? [services[0]!]
        : [services[start]!, services[(start + 1) % n]!];
  return {
    section_title: YORK_HELP_SECTION_TITLE,
    bullets: picked.map((service) => ({
      title: service.name,
      milestone: service.name,
      help: service.outcomes[0] ?? service.name,
      primary_service: service.name,
      track,
    })),
    cta_label: YORK_HELP_CTA_LABEL,
  };
}

/** Bedrock tool-schema fragment for one york_help bullet. */
export const YORK_HELP_BULLET_TOOL_PROPERTIES = {
  title: {
    type: "string",
    description:
      'Visible heading: a short founder-facing title for how York IE can help with THIS initiative (grounded in the initiative title and milestones). Never rd, gtm, ga, R&D, GTM, G&A, or a category id. Do not use the raw catalog service name unless it is also a natural title.',
  },
  primary_service: {
    type: "string",
    description:
      'Exact catalog service name this bullet is grounded in (e.g. "Product Strategy"). Not the visible heading. Never rd, gtm, ga, R&D, GTM, G&A, dev, mkt, or rev.',
  },
  help: {
    type: "string",
    description:
      "Body: take one approved outcome for that primary_service and refine it into a personalised response to this initiative and its milestones. Stay faithful to the approved outcome — do not invent a different service, metrics, customers, funding, or timelines.",
  },
  track: {
    type: "string",
    enum: ["rd", "gtm", "ga"],
    description:
      "Metadata only — not the title. rd if category_id is dev, gtm if mkt, ga if rev.",
  },
};

export function yorkHelpPromptRules(): string {
  return `HOW YORK IE CAN HELP (required on every initiative; authoritative — ignore any earlier one-bullet-per-milestone instructions):
- Include york_help nested on that initiative (not a separate top-level list): { section_title: "${YORK_HELP_SECTION_TITLE}", bullets: [{ title, primary_service, help, track }], cta_label: "${YORK_HELP_CTA_LABEL}" }.
- Suggest 1–2 services maximum. Never more.
- Only reference services from the York IE catalog below. Do not invent, paraphrase, or suggest services not on the list.
- Match services to initiative category_id: R&D (dev) → R&D services only; GTM (mkt) → GTM services only; G&A (rev) → G&A services only.
- primary_service = exact catalog service name (e.g. "Product Strategy"). NEVER use track codes (rd, gtm, ga), category ids (dev, mkt, rev), or labels (R&D, GTM, G&A) as primary_service. This is grounding metadata, not the heading.
- title is the VISIBLE HEADING: a short founder-facing title for how York IE can help with THIS initiative, grounded in the initiative title and milestones. Never rd, gtm, ga, R&D, GTM, or G&A.
- help is the body: take one approved outcome for that primary_service from the catalog and refine it into a personalised response to this initiative and its milestones. Stay faithful to the approved outcome — do not invent a different service, metrics, customers, funding, pricing, equity, or timelines.
- track is metadata only (not shown as the title): rd if category_id is dev, gtm if mkt, ga if rev. Do not put track in title or primary_service.
- Ground the service choice in the initiative title, description, milestones, and category.
- Do not mention AI, prompts, or Fuel internals in title or help text.
- cta_label always "${YORK_HELP_CTA_LABEL}". Do not put the URL in help text.`;
}

export function formatYorkHelpCatalogForPrompt(
  categoryId?: YorkHelpCategoryId,
  catalog: YorkHelpServiceCatalog = YORK_HELP_SERVICE_CATALOG,
): string {
  const cats: Array<[YorkHelpCategoryId, string, string]> = categoryId
    ? [
        [
          categoryId,
          categoryId === "dev" ? "R&D" : categoryId === "mkt" ? "GTM" : "G&A",
          trackForCategoryId(categoryId),
        ],
      ]
    : [
        ["dev", "R&D", "rd"],
        ["mkt", "GTM", "gtm"],
        ["rev", "G&A", "ga"],
      ];
  const lines = [
    'York IE services + approved outcomes. Copy primary_service from the name in quotes. For help, start from a help: line and refine it to this initiative and its milestones. Never set title or primary_service to rd, gtm, ga, R&D, GTM, or G&A.',
  ];
  for (const [id, label, track] of cats) {
    lines.push(`- ${label} (category_id=${id}, track=${track}):`);
    for (const service of catalog[id]) {
      lines.push(`  primary_service: "${service.name}"`);
      for (const outcome of service.outcomes) {
        lines.push(`    approved outcome: "${outcome}"`);
      }
    }
  }
  return lines.join("\n");
}

export const YORK_HELP_PROMPT_HEADER = "HOW YORK IE CAN HELP";

const YORK_HELP_APPENDIX_NEXT_SECTION =
  /\n(?:- suggested_playbooks:|PLAYBOOK RULES:|INTELLIGENCE RULES:|DETAIL QUESTION RULES:|UNKNOWN ANSWER RULES:|COMPANY PROFILE RULES:|INITIATIVE RULES:|INPUT:|Call the record_)/;

/**
 * Drop baked-in York Help catalog copies from a playbook template so runtime
 * can append exactly one live catalog via yorkHelpPromptAppendix().
 */
export function stripYorkHelpPromptAppendix(text: string): string {
  let out = text;
  for (let i = 0; i < 8; i++) {
    const start = out.indexOf(YORK_HELP_PROMPT_HEADER);
    if (start < 0) break;
    const rest = out.slice(start);
    const next = rest.search(YORK_HELP_APPENDIX_NEXT_SECTION);
    const end = next >= 0 ? start + next : out.length;
    out = `${out.slice(0, start).trimEnd()}\n${out.slice(end).replace(/^\n+/, "")}`;
  }
  return out.trim();
}

export function yorkHelpPromptAppendix(
  categoryId?: YorkHelpCategoryId,
  catalog: YorkHelpServiceCatalog = YORK_HELP_SERVICE_CATALOG,
): string {
  return `${yorkHelpPromptRules()}\n${formatYorkHelpCatalogForPrompt(categoryId, catalog)}`;
}
