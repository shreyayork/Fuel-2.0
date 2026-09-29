/**
 * Re-export shared gate under the historical HubSpot name so existing
 * imports keep working. Prefer context-intelligence-gate for new code.
 */
export {
  contextIntelligenceGenerationAction,
  contextSourceContentChanged,
  shouldProcessContextIntelligenceAfterUpsert,
  shouldProcessHubspotIntelligenceAfterUpsert,
} from "./context-intelligence-gate";