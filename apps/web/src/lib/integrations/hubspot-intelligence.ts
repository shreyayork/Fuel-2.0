/**
 * HubSpot-facing re-exports + wrappers over the shared context intelligence
 * pipeline. Prefer importing from context-intelligence for new call sites.
 */
export {
  hasCompanyIntelligenceForContextItem,
  processContextItemIntelligence,
  processGranolaMeetingIntelligence,
  processHubspotActivityIntelligence,
  contextIntelligenceGenerationAction,
  contextSourceContentChanged,
  shouldProcessContextIntelligenceAfterUpsert,
  shouldProcessHubspotIntelligenceAfterUpsert,
} from "./context-intelligence";
