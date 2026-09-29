/**
 * Generates documents/prompt-inventory.xlsx from the in-repo inventory module.
 * Run: npm run prompt-inventory --workspace=apps/web
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { PROMPT_INVENTORY, inventorySummary } from "../src/lib/system-playbooks/inventory";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const outPath = path.join(repoRoot, "documents/prompt-inventory.xlsx");

const headers = [
  "Prompt Name",
  "Feature / Functional Area",
  "Purpose",
  "Source File",
  "Source Location",
  "Prompt Type",
  "Static / Dynamic",
  "Migration Recommended",
  "Migration Status",
  "System Playbook Name",
  "System Playbook Key",
  "Runtime Variables",
  "Current Consumer",
  "Notes / Migration Considerations",
] as const;

const rows = PROMPT_INVENTORY.map((r) => [
  r.promptName,
  r.featureArea,
  r.purpose,
  r.sourceFile,
  r.sourceLocation,
  r.promptType,
  r.staticOrDynamic,
  r.migrationRecommended,
  r.migrationStatus,
  r.systemPlaybookName,
  r.systemPlaybookKey,
  r.runtimeVariables,
  r.currentConsumer,
  r.notes,
]);

const summary = inventorySummary();
const summaryRows = [
  [],
  ["SUMMARY"],
  ["Total prompts discovered", summary.totalDiscovered],
  ["System playbook slugs", summary.systemPlaybookSlugs],
  ["Static system prompts migrated", summary.staticSystemPromptsMigrated],
  ["Rows marked migrated", summary.migrated],
  ["Intentionally not migrated", summary.intentionallyNotMigrated],
];

const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows, ...summaryRows]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "Prompt Inventory");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
XLSX.writeFile(workbook, outPath);

console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(summary, null, 2));
