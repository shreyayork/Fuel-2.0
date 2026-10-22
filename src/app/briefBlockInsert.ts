import type { BriefPrivateTemplateId } from "./briefDocStorage";

export type BriefBlockId =
  | "ai-note"
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "bullet"
  | "numbered"
  | "todo"
  | "quote"
  | "table";

export type BriefBlockItem = {
  id: BriefBlockId;
  group: "Suggested" | "Basic blocks";
  label: string;
  hint: string;
  badge?: string;
  keywords: string;
};

export type BriefPrivateTemplateMenuItem = {
  kind: "template";
  id: BriefPrivateTemplateId;
  group: "Templates";
  label: string;
  hint: string;
  keywords: string;
};

export type BriefMenuItem =
  | { kind: "block"; block: BriefBlockItem }
  | BriefPrivateTemplateMenuItem;

export const BRIEF_PRIVATE_TEMPLATES: BriefPrivateTemplateMenuItem[] = [
  { kind: "template", id: "benchmark", group: "Templates", label: "Benchmark", hint: "Private brief", keywords: "benchmark snapshot metrics grid" },
  { kind: "template", id: "cohort-understanding", group: "Templates", label: "Cohort understanding", hint: "Private brief", keywords: "cohort position peer median stand" },
  { kind: "template", id: "company-profile", group: "Templates", label: "Company profile", hint: "Private brief", keywords: "about company profile facts" },
  { kind: "template", id: "initiatives", group: "Templates", label: "Initiatives", hint: "Private brief", keywords: "initiatives roadmap pillars" },
];

export const BRIEF_BLOCKS: BriefBlockItem[] = [
  { id: "ai-note", group: "Suggested", label: "AI note", hint: "", keywords: "ai note prompt" },
  { id: "text", group: "Basic blocks", label: "Text", hint: "", keywords: "text paragraph" },
  { id: "h1", group: "Basic blocks", label: "Heading 1", hint: "#", keywords: "heading h1 title" },
  { id: "h2", group: "Basic blocks", label: "Heading 2", hint: "##", keywords: "heading h2" },
  { id: "h3", group: "Basic blocks", label: "Heading 3", hint: "###", keywords: "heading h3" },
  { id: "h4", group: "Basic blocks", label: "Heading 4", hint: "####", keywords: "heading h4" },
  { id: "bullet", group: "Basic blocks", label: "Bulleted list", hint: "-", keywords: "bullet list ul" },
  { id: "numbered", group: "Basic blocks", label: "Numbered list", hint: "1.", keywords: "numbered list ol" },
  { id: "todo", group: "Basic blocks", label: "To-do list", hint: "[]", keywords: "todo to-do checkbox task" },
  { id: "quote", group: "Basic blocks", label: "Quote", hint: "\"", keywords: "quote blockquote" },
  { id: "table", group: "Basic blocks", label: "Table", hint: "", keywords: "table grid" },
];

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "about", "what",
  "should", "note", "please", "show", "write", "explain", "add", "how", "our",
  "their", "your", "they", "was", "are", "you", "can", "all", "any",
]);

const BROAD_WORDS = new Set(["summary", "summarize", "overview", "everything", "profile", "company", "brief"]);

const BROAD_SECTIONS = new Set([
  "About",
  "Company details",
  "Snapshot",
  "Capital and runway",
  "Funding rounds",
  "Links",
  "Cohort position",
]);

type BriefField = {
  section: string;
  label: string;
  value: string;
  kind: "fact" | "note";
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function promptWords(prompt: string): string[] {
  return prompt.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

export function filterBriefBlocks(query: string): BriefBlockItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return BRIEF_BLOCKS;
  return BRIEF_BLOCKS.filter(item => words.every(word => `${item.label} ${item.keywords} ${item.group}`.toLowerCase().includes(word)));
}

function matchesMenuQuery(query: string, label: string, keywords: string, group: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = `${label} ${keywords} ${group}`.toLowerCase();
  return words.every(word => haystack.includes(word));
}

export function listBriefMenuItems(query: string, includeTemplates: boolean): BriefMenuItem[] {
  const blocks = filterBriefBlocks(query).map(block => ({ kind: "block" as const, block }));
  const suggested = blocks.filter(item => item.block.group === "Suggested");
  const basic = blocks.filter(item => item.block.group === "Basic blocks");
  const templates = includeTemplates
    ? BRIEF_PRIVATE_TEMPLATES.filter(item => matchesMenuQuery(query, item.label, item.keywords, item.group))
    : [];
  return [...suggested, ...templates, ...basic];
}

export function briefMenuGroups(includeTemplates: boolean): Array<"Suggested" | "Templates" | "Basic blocks"> {
  return includeTemplates ? ["Suggested", "Templates", "Basic blocks"] : ["Suggested", "Basic blocks"];
}

export function manualBlockHtml(id: Exclude<BriefBlockId, "ai-note">): string {
  if (id === "text") return "<p><br></p>";
  if (id === "h1") return "<h1>Heading</h1>";
  if (id === "h2") return "<h2>Heading</h2>";
  if (id === "h3") return "<h3>Heading</h3>";
  if (id === "h4") return "<h4>Heading</h4>";
  if (id === "bullet") return "<ul><li><br></li></ul>";
  if (id === "numbered") return "<ol><li><br></li></ol>";
  if (id === "todo") return `<ul class="brief-paper-todo"><li><span class="brief-paper-check" contenteditable="false"></span><br></li></ul>`;
  if (id === "quote") return `<blockquote class="brief-paper-quote"><p>Quote</p></blockquote>`;
  return `<table class="brief-paper-grid brief-paper-table"><thead><tr><th>Column</th><th>Column</th><th>Column</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr></tbody></table>`;
}

export function extractBriefFields(html: string): BriefField[] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  const fields: BriefField[] = [];
  root?.querySelectorAll("section").forEach(section => {
    const sectionTitle = section.querySelector("h2")?.textContent?.trim() || "Section";
    section.querySelectorAll("tr").forEach(row => {
      if (row.parentElement?.tagName === "THEAD") return;
      const cells = [...row.children];
      if (cells.length < 2) return;
      const label = cells[0].textContent?.replace(/\s+/g, " ").trim() || "";
      const value = cells[1].textContent?.replace(/\s+/g, " ").trim() || "";
      if (!label || !value) return;
      fields.push({ section: sectionTitle, label, value, kind: "fact" });
    });
    section.querySelectorAll(":scope > p").forEach(paragraph => {
      const value = paragraph.textContent?.replace(/\s+/g, " ").trim() || "";
      if (value.length < 24 || value.length > 420) return;
      fields.push({ section: sectionTitle, label: sectionTitle, value, kind: "note" });
    });
  });
  return fields;
}

function fieldMatches(field: BriefField, words: string[]): boolean {
  const haystack = `${field.section} ${field.label} ${field.value}`.toLowerCase();
  return words.some(word => haystack.includes(word));
}

export function buildAiNoteHtml(prompt: string, sourceHtml: string): string {
  const clean = prompt.trim();
  if (!clean) return "";
  const words = promptWords(clean);
  const fields = extractBriefFields(sourceHtml);
  const specific = fields.filter(field => fieldMatches(field, words));
  const specificFacts = specific.filter(field => field.kind === "fact");
  const broad = words.some(word => BROAD_WORDS.has(word));
  const chosen = (specificFacts.length
    ? specificFacts
    : specific.length
      ? specific.filter(field => field.kind === "note").slice(0, 2)
      : broad
        ? fields.filter(field => field.kind === "fact" && BROAD_SECTIONS.has(field.section))
        : []).slice(0, 12);
  const title = clean.split(/\n/)[0].trim().slice(0, 80);
  const rest = clean.length > title.length ? clean : "";
  const facts = chosen.filter(field => field.kind === "fact");
  const notes = chosen.filter(field => field.kind === "note");
  const factTable = facts.length
    ? `<table class="brief-paper-facts"><tbody>${facts.map(field => `<tr><th>${esc(field.label)}</th><td>${esc(field.value)}</td></tr>`).join("")}</tbody></table>`
    : "";
  const noteCopy = notes.map(field => `<p>${esc(field.value)}</p>`).join("");
  const empty = chosen.length ? "" : `<p class="brief-paper-note">No field in this brief matched that prompt.</p>`;
  const promptCopy = rest ? `<p>${esc(rest)}</p>` : "";
  const fromBrief = chosen.length ? `<h3>From this brief</h3>${noteCopy}${factTable}` : empty;
  return `<section class="brief-paper-block brief-paper-tone-quiet brief-paper-ai-note"><p class="brief-paper-kicker">AI note</p><h2>${esc(title)}</h2>${promptCopy}${fromBrief}</section>`;
}
