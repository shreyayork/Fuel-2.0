import "server-only";
import { captureIntegrationException, captureIntegrationMessage } from "@/lib/sentry/capture";
import { DEFAULT_YORK_HELP_CATALOG_CONTENT } from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { YORK_HELP_CATALOG_SLUG } from "@/lib/system-playbooks/slugs";
import {
  parseYorkHelpCatalogContent,
  YORK_HELP_SERVICE_CATALOG,
  type YorkHelpServiceCatalog,
} from "./catalog-data";

/**
 * Load the York help service catalog from the `york-help-catalog` system
 * playbook. Invalid or missing content falls back to the static catalog.
 */
export async function loadYorkHelpServiceCatalog(): Promise<YorkHelpServiceCatalog> {
  try {
    const { template } = await loadSystemPlaybookTemplate(
      YORK_HELP_CATALOG_SLUG,
      DEFAULT_YORK_HELP_CATALOG_CONTENT,
    );
    const parsed = parseYorkHelpCatalogContent(template);
    if (parsed) return parsed;
    captureIntegrationMessage("york-help catalog playbook is not valid JSON", {
      integration: "postgres",
      operation: "york_help_catalog_parse",
    });
    return YORK_HELP_SERVICE_CATALOG;
  } catch (error) {
    captureIntegrationException(error, {
      integration: "postgres",
      operation: "york_help_catalog_load",
    });
    return YORK_HELP_SERVICE_CATALOG;
  }
}
