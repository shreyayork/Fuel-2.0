/**
 * Repo-wide LLM prompt inventory for migration tracking and Excel export.
 * No secrets or runtime user data — metadata only.
 */
import { SYSTEM_PLAYBOOK_SEED_META } from "./defaults";
import { SYSTEM_PLAYBOOK_SLUGS } from "./slugs";

export type PromptInventoryRow = {
  promptName: string;
  featureArea: string;
  purpose: string;
  sourceFile: string;
  sourceLocation: string;
  promptType: "system" | "user" | "dynamic-fragment" | "orchestration" | "tool-schema" | "ui-display";
  staticOrDynamic: "static" | "dynamic" | "hybrid";
  migrationRecommended: "yes" | "no" | "already-migrated";
  migrationStatus: "migrated" | "not-migrated" | "partial" | "n/a";
  systemPlaybookName: string;
  systemPlaybookKey: string;
  runtimeVariables: string;
  currentConsumer: string;
  notes: string;
};

const MIGRATED_SYSTEM_ROWS: PromptInventoryRow[] = SYSTEM_PLAYBOOK_SEED_META.map(
  (meta) => ({
    promptName: meta.title,
    featureArea: meta.subcategory,
    purpose: meta.description,
    sourceFile: "apps/web/src/lib/system-playbooks/defaults.ts",
    sourceLocation: `SYSTEM_PLAYBOOK_DEFAULT_CONTENT["${meta.slug}"]`,
    promptType: "system" as const,
    staticOrDynamic:
      meta.slug === "intelligence-generation" ||
      meta.slug === "context-signal-extraction" ||
      meta.slug === "document-initiative-generation"
        ? ("hybrid" as const)
        : ("static" as const),
    migrationRecommended: "already-migrated" as const,
    migrationStatus: "migrated" as const,
    systemPlaybookName: meta.title,
    systemPlaybookKey: meta.slug,
    runtimeVariables:
      meta.slug === "intelligence-generation"
        ? "companyName, documentType, categoryHints, signal catalog; {{SAFETY_MAX_ITEMS}}"
        : meta.slug === "context-signal-extraction"
          ? "subjectCompanyName, signal catalog"
          : meta.slug === "document-initiative-generation"
            ? "companyName, documentLabel, intel list, sourceKind; {{MAX_INITIATIVES}}, {{AS_OF_ISO}}"
            : meta.slug === "overview-generation"
              ? "INPUT JSON via hydratePrompt; playbook/intelligence/unknown/initiative rules appended in code"
              : meta.slug === "york-help-catalog"
                ? "JSON {dev,mkt,rev}[{name,outcomes}] parsed at generation time"
                : meta.slug === "agent-default-system"
                  ? "playbook_run extras appended when kind=playbook_run"
                  : "varies by consumer — see source file",
    currentConsumer: consumerForSlug(meta.slug),
    notes:
      "Loaded via loadSystemPlaybookTemplate(); DB fallback to defaults.ts. Editable in Super Admin → Playbooks (System category).",
  }),
);

function consumerForSlug(slug: string): string {
  const map: Record<string, string> = {
    "overview-generation":
      "lib/overview/prompt.ts → lib/overview/generate.ts",
    "intelligence-generation": "lib/intelligence/generate.ts",
    "context-signal-extraction": "lib/context/extract.ts",
    "document-initiative-generation": "lib/initiatives/from-document.ts",
    "overview-brief-analysis": "lib/overview/brief-analysis.ts",
    "york-help-generation": "lib/york-help/generate.ts",
    "york-help-catalog": "lib/york-help/load-catalog.ts",
    "onboard-benchmark-insights":
      "lib/agent/skills/generateOnboardBenchmarkInsights.ts",
    "extract-company-profile": "lib/agent/skills/extractCompanyProfile.ts",
    "extract-benchmark-hints": "lib/agent/skills/extractBenchmarkHints.ts",
    "estimate-company-kpis": "lib/agent/skills/estimateCompanyKpis.ts",
    "agent-default-system": "lib/agent/default-system-prompt.ts → api/agent/runs/route.ts",
  };
  return map[slug] ?? "unknown";
}

/** Dynamic runtime fragments intentionally kept in application code. */
const RUNTIME_FRAGMENT_ROWS: PromptInventoryRow[] = [
  {
    promptName: "Overview hydrate — playbook rules",
    featureArea: "Overview",
    purpose: "Conditional playbook suggestion rules when catalog non-empty",
    sourceFile: "apps/web/src/lib/overview/prompt.ts",
    sourceLocation: "hydratePrompt() — playbookRules",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "playbook_catalog length",
    currentConsumer: "lib/overview/generate.ts",
    notes: "Conditional on INPUT; mirrors overview reference pattern — runtime rules stay in code.",
  },
  {
    promptName: "Overview hydrate — intelligence rules",
    featureArea: "Overview",
    purpose: "Conditional intelligence grounding when signal catalog present",
    sourceFile: "apps/web/src/lib/overview/prompt.ts",
    sourceLocation: "hydratePrompt() — intelligenceRules",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "signal_catalog length",
    currentConsumer: "lib/overview/generate.ts",
    notes: "Implementation-specific conditional block.",
  },
  {
    promptName: "Overview hydrate — unknown answer rules",
    featureArea: "Overview",
    purpose: "Rules when founder marked answers as unknown",
    sourceFile: "apps/web/src/lib/overview/prompt.ts",
    sourceLocation: "hydratePrompt() — unknownRules",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "unknown_question_ids",
    currentConsumer: "lib/overview/generate.ts",
    notes: "Conditional on runtime unknown ids count.",
  },
  {
    promptName: "Overview hydrate — detail question catalog rules",
    featureArea: "Overview",
    purpose: "Ground INPUT.answers interpretation in detail_question_catalog",
    sourceFile: "apps/web/src/lib/overview/prompt.ts",
    sourceLocation: "hydratePrompt() — detailQuestionRules",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "detail_question_catalog length",
    currentConsumer: "lib/overview/generate.ts",
    notes: "Conditional when detail_question_catalog is present in model INPUT.",
  },
  {
    promptName: "Overview hydrate — initiative rules",
    featureArea: "Overview",
    purpose: "Milestone dates plus How York IE can help (1–2 catalog services + approved outcomes)",
    sourceFile: "apps/web/src/lib/overview/prompt.ts",
    sourceLocation: "hydratePrompt() — initiativeRules",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "as_of_date, as_of_iso",
    currentConsumer: "lib/overview/generate.ts",
    notes: "Date-sensitive; appended every generation.",
  },
  {
    promptName: "Intelligence extraction — source intro",
    featureArea: "Intelligence",
    purpose: "HubSpot vs document source framing",
    sourceFile: "apps/web/src/lib/intelligence/generate.ts",
    sourceLocation: "buildSystemPrompt() — intro",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "partial",
    systemPlaybookName: "Intelligence Extraction Rules",
    systemPlaybookKey: "intelligence-generation",
    runtimeVariables: "companyName, documentType, categoryHints",
    currentConsumer: "lib/intelligence/generate.ts",
    notes: "Source-specific intro stays in code; rules migrated to system playbook.",
  },
  {
    promptName: "Context extraction — scope rule",
    featureArea: "Context / Signals",
    purpose: "Subject company scoping for observations",
    sourceFile: "apps/web/src/lib/context/extract.ts",
    sourceLocation: "buildSystemPrompt() — scope paragraph",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "partial",
    systemPlaybookName: "Context Signal Extraction",
    systemPlaybookKey: "context-signal-extraction",
    runtimeVariables: "subjectCompanyName",
    currentConsumer: "lib/context/extract.ts",
    notes: "Company name injected at runtime.",
  },
  {
    promptName: "Document initiative — source intro",
    featureArea: "Initiatives",
    purpose: "Document vs HubSpot framing header",
    sourceFile: "apps/web/src/lib/initiatives/from-document.ts",
    sourceLocation: "buildSystemPrompt() — intro lines",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "partial",
    systemPlaybookName: "Document Initiative Generation",
    systemPlaybookKey: "document-initiative-generation",
    runtimeVariables: "companyName, documentLabel, sourceKind, intel[]",
    currentConsumer: "lib/initiatives/from-document.ts",
    notes: "Rules migrated; intro and intel list remain dynamic.",
  },
  {
    promptName: "Agent playbook-run extras",
    featureArea: "Agent",
    purpose: "Structured playbook execution discipline",
    sourceFile: "apps/web/src/lib/agent/default-system-prompt.ts",
    sourceLocation: "PLAYBOOK_RUN_EXTRAS",
    promptType: "dynamic-fragment",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "Agent Default System Prompt",
    systemPlaybookKey: "agent-default-system",
    runtimeVariables: "kind === playbook_run",
    currentConsumer: "lib/agent/default-system-prompt.ts",
    notes: "Appended when run kind is playbook_run; not suitable for static-only playbook row.",
  },
];

const NOT_LLM_OR_CATALOG_ROWS: PromptInventoryRow[] = [
  {
    promptName: "Overview generation user trigger",
    featureArea: "Overview",
    purpose: "Minimal user message to invoke record_overview tool",
    sourceFile: "apps/web/src/lib/overview/generate.ts",
    sourceLocation: "USER_PROMPT constant",
    promptType: "user",
    staticOrDynamic: "static",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "none",
    currentConsumer: "lib/overview/generate.ts",
    notes: "Trivial tool invocation string — not a configurable template.",
  },
  {
    promptName: "Brief analysis user message",
    featureArea: "Overview / Full Summary",
    purpose: "Wraps benchmark JSON for cohort analysis",
    sourceFile: "apps/web/src/lib/overview/brief-analysis.ts",
    sourceLocation: "userPrompt()",
    promptType: "user",
    staticOrDynamic: "hybrid",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "period, inputJson",
    currentConsumer: "lib/overview/brief-analysis.ts",
    notes: "User message template with runtime JSON — system prompt migrated.",
  },
  {
    promptName: "York help user payload",
    featureArea: "Initiatives / York Help",
    purpose: "Initiative JSON + allowed services and approved outcomes for york_help generation",
    sourceFile: "apps/web/src/lib/york-help/generate.ts",
    sourceLocation: "callBedrockOnce() userText",
    promptType: "user",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "initiative fields, allowedServices with approved outcomes",
    currentConsumer: "lib/york-help/generate.ts",
    notes: "Runtime initiative payload — system prompt migrated.",
  },
  {
    promptName: "Agent drawer custom systemPrompt",
    featureArea: "Agent",
    purpose: "Optional per-run system override from client",
    sourceFile: "apps/web/src/app/api/agent/runs/route.ts",
    sourceLocation: "body.systemPrompt",
    promptType: "orchestration",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "client-provided",
    currentConsumer: "AgentDrawer / playbook runs",
    notes: "Intentional override path — not a static catalog prompt.",
  },
  {
    promptName: "Playbook run display prompt",
    featureArea: "Playbooks UI",
    purpose: "Markdown link for agent to run a catalog playbook",
    sourceFile: "apps/web/src/components/views/PlaybookPickerButton.tsx",
    sourceLocation: "displayPrompt",
    promptType: "ui-display",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "playbook title, slug, company link",
    currentConsumer: "PlaybookPickerButton, FounderFirstRun, CompanyOverviewPage",
    notes: "UI orchestration string, not an LLM system template.",
  },
  {
    promptName: "Founder first-run pitch deck instruction",
    featureArea: "Onboarding / Agent",
    purpose: "Tells agent to call extractPdfText on uploaded deck",
    sourceFile: "apps/web/src/components/founder/FounderFirstRun.tsx",
    sourceLocation: "displayPrompt append",
    promptType: "orchestration",
    staticOrDynamic: "dynamic",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "contextItemId, attachmentId",
    currentConsumer: "FounderFirstRun agent run",
    notes: "One-shot orchestration with IDs — not admin-configurable.",
  },
  {
    promptName: "PDF prompt-injection mitigation note",
    featureArea: "Agent / Security",
    purpose: "Documents untrusted deck text handling",
    sourceFile: "apps/web/src/lib/agent/skills/extractPdfText.ts",
    sourceLocation: "skill JSDoc + seed pitch-deck playbook",
    promptType: "orchestration",
    staticOrDynamic: "static",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "none",
    currentConsumer: "extractPdfText skill; pitch-deck playbook content in seed",
    notes: "Security guidance — lives in skill docs and user-facing playbook markdown, not system prompt table.",
  },
  {
    promptName: "Bedrock tool schemas (record_*)",
    featureArea: "Multiple",
    purpose: "JSON Schema tool definitions for structured LLM output",
    sourceFile: "apps/web/src/lib/**",
    sourceLocation: "toolSpec.inputSchema in ConverseCommand callers",
    promptType: "tool-schema",
    staticOrDynamic: "static",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "",
    systemPlaybookKey: "",
    runtimeVariables: "none",
    currentConsumer: "Bedrock ConverseCommand toolConfig",
    notes: "JSON Schema for tools — not natural-language prompts; System Playbooks architecture does not cover tool schemas.",
  },
  {
    promptName: "User-facing playbook markdown (catalog)",
    featureArea: "Playbooks",
    purpose: "Investor/founder guidance content in catalog",
    sourceFile: "apps/web/src/db/seed-playbooks.ts",
    sourceLocation: "PLAYBOOK_SEEDS (non-system entries)",
    promptType: "system",
    staticOrDynamic: "static",
    migrationRecommended: "no",
    migrationStatus: "n/a",
    systemPlaybookName: "N/A — catalog playbooks",
    systemPlaybookKey: "per-slug in playbooks table",
    runtimeVariables: "none",
    currentConsumer: "getPlaybook / searchPlaybooks / agent getPlaybook skill",
    notes: "Already in playbooks table as visible catalog entries — distinct from is_system generation prompts.",
  },
];

export const PROMPT_INVENTORY: PromptInventoryRow[] = [
  ...MIGRATED_SYSTEM_ROWS,
  ...RUNTIME_FRAGMENT_ROWS,
  ...NOT_LLM_OR_CATALOG_ROWS,
];

export function inventorySummary() {
  const staticMigratable = MIGRATED_SYSTEM_ROWS.length;
  const total = PROMPT_INVENTORY.length;
  const migrated = PROMPT_INVENTORY.filter((r) => r.migrationStatus === "migrated").length;
  const notMigrated = PROMPT_INVENTORY.filter(
    (r) => r.migrationStatus === "not-migrated",
  ).length;
  return {
    totalDiscovered: total,
    systemPlaybookSlugs: SYSTEM_PLAYBOOK_SLUGS.length,
    staticSystemPromptsMigrated: staticMigratable,
    migrated,
    notMigrated,
    intentionallyNotMigrated: PROMPT_INVENTORY.filter(
      (r) => r.migrationRecommended === "no",
    ).length,
  };
}
