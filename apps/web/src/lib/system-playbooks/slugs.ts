/** Kebab-case slugs for global system playbooks (`is_system=true`, hidden from catalog). */
export const OVERVIEW_GENERATION_SLUG = "overview-generation" as const;
export const INTELLIGENCE_GENERATION_SLUG = "intelligence-generation" as const;
export const CONTEXT_SIGNAL_EXTRACTION_SLUG = "context-signal-extraction" as const;
export const DOCUMENT_INITIATIVE_GENERATION_SLUG = "document-initiative-generation" as const;
export const OVERVIEW_BRIEF_ANALYSIS_SLUG = "overview-brief-analysis" as const;
export const YORK_HELP_GENERATION_SLUG = "york-help-generation" as const;
export const YORK_HELP_CATALOG_SLUG = "york-help-catalog" as const;
export const ONBOARD_BENCHMARK_INSIGHTS_SLUG = "onboard-benchmark-insights" as const;
export const EXTRACT_COMPANY_PROFILE_SLUG = "extract-company-profile" as const;
export const EXTRACT_BENCHMARK_HINTS_SLUG = "extract-benchmark-hints" as const;
export const ESTIMATE_COMPANY_KPIS_SLUG = "estimate-company-kpis" as const;
export const AGENT_DEFAULT_SYSTEM_SLUG = "agent-default-system" as const;

export const SYSTEM_PLAYBOOK_SLUGS = [
  OVERVIEW_GENERATION_SLUG,
  INTELLIGENCE_GENERATION_SLUG,
  CONTEXT_SIGNAL_EXTRACTION_SLUG,
  DOCUMENT_INITIATIVE_GENERATION_SLUG,
  OVERVIEW_BRIEF_ANALYSIS_SLUG,
  YORK_HELP_GENERATION_SLUG,
  YORK_HELP_CATALOG_SLUG,
  ONBOARD_BENCHMARK_INSIGHTS_SLUG,
  EXTRACT_COMPANY_PROFILE_SLUG,
  EXTRACT_BENCHMARK_HINTS_SLUG,
  ESTIMATE_COMPANY_KPIS_SLUG,
  AGENT_DEFAULT_SYSTEM_SLUG,
] as const;

export type SystemPlaybookSlug = (typeof SYSTEM_PLAYBOOK_SLUGS)[number];
