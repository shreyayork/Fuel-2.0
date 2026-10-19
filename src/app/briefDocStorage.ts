import { buildPatriotPublicPaperHtml, isPatriotPayName } from "./patriotPublicStory";

export type BriefAudience = "investor" | "public";

export type BriefDocRecord = {
  investorHtml: string;
  publicHtml: string;
  updatedAt: string | null;
};

export type BriefFact = { label: string; value: string };
export type BriefFundingRound = { round: string; amount: string; investors: string };
export type BriefBandTone = "good" | "watch" | "bad";
export type BriefStatusTone = "active" | "done" | "paused" | "suggested";
export type BriefPillarId = "dev" | "mkt" | "rev";

export type BriefDocumentInput = {
  companyName: string;
  reportDate: string;
  productDescription: string;
  topPriorities: string;
  biggestRisk: string;
  publicDataCorrections: string;
  facts: BriefFact[];
  cohortLabel: string;
  snapshotRows: {
    label: string;
    you: string;
    p25: string;
    p50: string;
    p75: string;
    p90: string;
    band: string;
    bandTone?: BriefBandTone;
  }[];
  standCopy: string[];
  focusAreas: { title: string; text: string }[];
  capital: BriefFact[];
  operatingGroups: { label: string; rows: BriefFact[] }[];
  pillars: {
    id?: BriefPillarId;
    label: string;
    shortLabel?: string;
    description?: string;
    initiatives: {
      title: string;
      description: string;
      due: string;
      dueContext?: string;
      status: string;
      statusTone?: BriefStatusTone;
      owner: string;
    }[];
  }[];
  documents: { typeLabel: string; name: string }[];
  sources: { label: string; detail: string }[];
  publicAbout: string;
  publicDetails: BriefFact[];
  fundingRounds: BriefFundingRound[];
  publicLinks: BriefFact[];
  publicSources: BriefFact[];
};

const SAVED_PREFIX = "fuel-brief-doc:v7:";
const DRAFT_PREFIX = "fuel-brief-doc-draft:v7:";

const ALLOWED_TAGS = new Set([
  "H1", "H2", "H3", "H4", "P", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
  "STRONG", "EM", "B", "I", "U", "BR", "SECTION", "HEADER", "DIV", "SPAN", "BLOCKQUOTE", "A",
]);

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(value: string): string {
  const lines = value.split(/\n+/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return "<p><br></p>";
  return lines.map(line => `<p>${esc(line)}</p>`).join("");
}

function factTable(rows: BriefFact[]): string {
  if (!rows.length) return "";
  const body = rows.map(row => `<tr><th>${esc(row.label)}</th><td>${esc(row.value)}</td></tr>`).join("");
  return `<table class="brief-paper-facts"><tbody>${body}</tbody></table>`;
}

function filled(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return "";
  return trimmed;
}

function bandMarkup(label: string, tone: BriefBandTone | undefined): string {
  const safeTone = tone === "good" || tone === "watch" || tone === "bad" ? tone : "watch";
  return `<span class="brief-paper-band brief-paper-band-${safeTone}">${esc(label)}</span>`;
}

function statusMarkup(label: string, tone: BriefStatusTone | undefined): string {
  const safeTone = tone === "active" || tone === "done" || tone === "paused" || tone === "suggested" ? tone : "active";
  return `<span class="brief-paper-status brief-paper-status-${safeTone}">${esc(label)}</span>`;
}

function pillarMarkup(id: BriefPillarId | undefined, label: string): string {
  const safeId = id === "dev" || id === "mkt" || id === "rev" ? id : "dev";
  return `<span class="brief-paper-pillar brief-paper-pillar-${safeId}">${esc(label)}</span>`;
}

function snapshotTable(input: BriefDocumentInput): string {
  if (!input.snapshotRows.length) return "<p>No metrics logged for this period.</p>";
  const body = input.snapshotRows.map(row => (
    `<tr><td>${esc(row.label)}</td><td><strong>${esc(row.you)}</strong></td><td>${esc(row.p50)}</td><td>${esc(row.p25)}</td><td>${esc(row.p75)}</td><td>${esc(row.p90)}</td><td>${bandMarkup(row.band, row.bandTone)}</td></tr>`
  )).join("");
  const cohort = input.cohortLabel.trim()
    ? `<p class="brief-paper-note">Peer cohort: ${esc(input.cohortLabel)}. These figures come from the latest private benchmark submission and stay on the investor version.</p>`
    : "";
  return `<table class="brief-paper-grid"><thead><tr><th>Metric</th><th>You</th><th>Cohort median</th><th>p25</th><th>p75</th><th>p90</th><th>Band</th></tr></thead><tbody>${body}</tbody></table>${cohort}`;
}

function coverageMeta(count: number): { label: string; tone: "blind" | "thin" | "healthy" } {
  if (count <= 0) return { label: "Blind spot", tone: "blind" };
  if (count === 1) return { label: "Thin coverage", tone: "thin" };
  return { label: "Healthy", tone: "healthy" };
}

function initiativeBoard(input: BriefDocumentInput): string {
  if (!input.pillars.length) return "<p><br></p>";
  const legend = [
    ["blind", "Blind spot"],
    ["thin", "Thin coverage"],
    ["healthy", "Healthy"],
  ].map(([tone, label]) => `<span class="brief-paper-legend brief-paper-legend-${tone}">${label}</span>`).join("");
  const columns = input.pillars.map(pillar => {
    const id = pillar.id === "dev" || pillar.id === "mkt" || pillar.id === "rev" ? pillar.id : "dev";
    const coverage = coverageMeta(pillar.initiatives.length);
    const chip = pillarMarkup(pillar.id, pillar.shortLabel || pillar.label);
    const blurb = pillar.description?.trim() ? `<p>${esc(pillar.description.trim())}</p>` : "";
    const cards = pillar.initiatives.length
      ? pillar.initiatives.map(item => {
        const tone = item.statusTone === "active" || item.statusTone === "done" || item.statusTone === "paused" || item.statusTone === "suggested" ? item.statusTone : "active";
        const undated = !item.due.trim() || item.due.trim().toLowerCase() === "no target date";
        const due = undated
          ? `<span class="brief-paper-due is-undated">${esc(item.due || "No target date")}</span>`
          : `<span class="brief-paper-due">${esc(item.due)}${item.dueContext?.trim() ? ` · ${esc(item.dueContext.trim())}` : ""}</span>`;
        const detail = item.description.trim() ? `<p>${esc(item.description.trim())}</p>` : "";
        return `<div class="brief-paper-init brief-paper-init-${tone}">${due}<strong>${esc(item.title)}</strong><span class="brief-paper-init-tags">${statusMarkup(item.status, item.statusTone)}${chip}</span>${detail}<em>${esc(item.owner)}</em></div>`;
      }).join("")
      : `<div class="brief-paper-init-empty"><strong>No initiatives</strong><span>Blind spot on this pillar.</span></div>`;
    return `<div class="brief-paper-roadmap-col brief-paper-col-${id}"><div class="brief-paper-pillar-head"><strong>${esc(pillar.label)}</strong>${blurb}<span class="brief-paper-pillar-meta"><b>${pillar.initiatives.length}</b><span class="brief-paper-coverage brief-paper-coverage-${coverage.tone}">${coverage.label}</span></span><span class="brief-paper-pillar-foot">${chip}</span></div><div class="brief-paper-roadmap-stack">${cards}</div></div>`;
  }).join("");
  return `<div class="brief-paper-roadmap"><div class="brief-paper-roadmap-legend">${legend}</div><div class="brief-paper-roadmap-cols">${columns}</div></div>`;
}

function buildInvestorHtml(input: BriefDocumentInput): string {
  const watch = input.focusAreas.length
    ? `<table class="brief-paper-grid"><thead><tr><th>Area</th><th>Why it matters</th></tr></thead><tbody>${
      input.focusAreas.map(area => `<tr><td>${esc(area.title)}</td><td>${esc(area.text)}</td></tr>`).join("")
    }</tbody></table>`
    : "<p><br></p>";
  const operating = input.operatingGroups.length
    ? input.operatingGroups.map(group => `<h3>${esc(group.label)}</h3>${factTable(group.rows)}`).join("")
    : "<p><br></p>";
  const stand = input.standCopy.length ? input.standCopy.map(paragraph => paragraphs(paragraph)).join("") : "<p><br></p>";

  const aboutBlocks = [
    filled(input.productDescription) ? paragraphs(input.productDescription) : "",
    filled(input.topPriorities) ? `<h3>Top priorities</h3>${paragraphs(input.topPriorities)}` : "",
    filled(input.biggestRisk) ? `<h3>Biggest risk</h3>${paragraphs(input.biggestRisk)}` : "",
    filled(input.publicDataCorrections) ? `<h3>Public data corrections</h3>${paragraphs(input.publicDataCorrections)}` : "",
    factTable(input.facts),
  ].filter(Boolean).join("");

  const capital = factTable(input.capital);
  return [
    `<header class="brief-paper-mast"><p class="brief-paper-kicker">Investor brief</p><h1>${esc(input.companyName)}</h1><p class="brief-paper-date">${esc(input.reportDate)}</p></header>`,
    aboutBlocks ? `<section class="brief-paper-block brief-paper-tone-good"><h2>About</h2>${aboutBlocks}</section>` : "",
    `<section class="brief-paper-block brief-paper-tone-quiet"><h2>Snapshot</h2>${snapshotTable(input)}</section>`,
    input.standCopy.length ? `<section class="brief-paper-block brief-paper-tone-callout"><h2>Cohort position</h2>${stand}</section>` : "",
    input.focusAreas.length ? `<section class="brief-paper-block brief-paper-tone-watch"><h2>Areas to watch</h2>${watch}</section>` : "",
    capital ? `<section class="brief-paper-block brief-paper-tone-good"><h2>Capital and runway</h2>${capital}</section>` : "",
    input.operatingGroups.length ? `<section class="brief-paper-block brief-paper-tone-quiet"><h2>Operating profile</h2>${operating}</section>` : "",
    input.pillars.length ? `<section class="brief-paper-block brief-paper-tone-quiet"><h2>Initiatives</h2>${initiativeBoard(input)}</section>` : "",
  ].filter(Boolean).join("");
}

function fundingTable(rounds: BriefFundingRound[]): string {
  const filledRounds = rounds.filter(round => filled(round.round) || filled(round.amount) || filled(round.investors));
  if (!filledRounds.length) return "";
  const showInvestors = filledRounds.some(round => filled(round.investors));
  const head = `<tr><th>Round</th><th>Amount</th>${showInvestors ? "<th>Investors</th>" : ""}</tr>`;
  const body = filledRounds.map(round => (
    `<tr><td>${esc(filled(round.round))}</td><td>${esc(filled(round.amount))}</td>${showInvestors ? `<td>${esc(filled(round.investors))}</td>` : ""}</tr>`
  )).join("");
  return `<table class="brief-paper-grid"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function buildPublicHtml(input: BriefDocumentInput): string {
  if (isPatriotPayName(input.companyName)) return buildPatriotPublicPaperHtml(input.reportDate);
  const about = filled(input.publicAbout);
  const details = factTable(input.publicDetails);
  const funding = fundingTable(input.fundingRounds);
  const links = factTable(input.publicLinks);
  const sources = factTable(input.publicSources);
  return [
    `<header class="brief-paper-mast"><p class="brief-paper-kicker">Public profile</p><h1>${esc(input.companyName)}</h1><p class="brief-paper-date">${esc(input.reportDate)}</p></header>`,
    about ? `<section class="brief-paper-block brief-paper-tone-good"><h2>About</h2>${paragraphs(about)}</section>` : "",
    details ? `<section class="brief-paper-block brief-paper-tone-quiet"><h2>Company details</h2>${details}</section>` : "",
    funding ? `<section class="brief-paper-block brief-paper-tone-watch"><h2>Funding rounds</h2>${funding}</section>` : "",
    links ? `<section class="brief-paper-block brief-paper-tone-quiet"><h2>Links</h2>${links}</section>` : "",
    sources ? `<section class="brief-paper-block brief-paper-tone-quiet"><h2>Data sources</h2>${sources}</section>` : "",
  ].filter(Boolean).join("");
}

export function buildBriefDocSeed(input: BriefDocumentInput): BriefDocRecord {
  return {
    investorHtml: buildInvestorHtml(input),
    publicHtml: buildPublicHtml(input),
    updatedAt: null,
  };
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as HTMLElement;
  if (!ALLOWED_TAGS.has(el.tagName)) {
    const fragment = doc.createDocumentFragment();
    el.childNodes.forEach(child => {
      const next = sanitizeNode(child, doc);
      if (next) fragment.appendChild(next);
    });
    return fragment;
  }
  const copy = doc.createElement(el.tagName.toLowerCase());
  const className = (el.getAttribute("class") || "")
    .split(/\s+/)
    .filter(token => token.startsWith("brief-paper-") && token !== "brief-paper-dragging")
    .join(" ");
  if (className) copy.setAttribute("class", className);
  if (el.tagName === "OL") {
    const start = Number(el.getAttribute("start"));
    if (Number.isInteger(start) && start > 1 && start < 1000) copy.setAttribute("start", String(start));
  }
  if (el.tagName === "A") {
    const href = el.getAttribute("href") || "";
    if (/^https:\/\/[^\s]+$/.test(href)) {
      copy.setAttribute("href", href);
      copy.setAttribute("target", "_blank");
      copy.setAttribute("rel", "noreferrer");
    }
  }
  if (
    el.getAttribute("contenteditable") === "false"
    && (className.includes("brief-paper-check") || className.includes("brief-paper-toggle-mark") || className.includes("brief-paper-page-mark"))
  ) {
    copy.setAttribute("contenteditable", "false");
  }
  el.childNodes.forEach(child => {
    const next = sanitizeNode(child, doc);
    if (next) copy.appendChild(next);
  });
  return copy;
}

export function sanitizeBriefHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    if (!root) return "";
    const clean = doc.createElement("div");
    root.childNodes.forEach(child => {
      const next = sanitizeNode(child, doc);
      if (next) clean.appendChild(next);
    });
    clean.querySelectorAll("section").forEach(section => {
      const title = section.querySelector("h2")?.textContent?.trim();
      if (title === "Sources") {
        section.remove();
        return;
      }
      if (title !== "Company details") return;
      section.classList.remove("brief-paper-tone-good");
      section.classList.add("brief-paper-block", "brief-paper-tone-quiet");
    });
    return clean.innerHTML.replace(/\u200B/g, "");
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is BriefDocRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as BriefDocRecord;
  return typeof record.investorHtml === "string"
    && typeof record.publicHtml === "string"
    && (record.updatedAt == null || typeof record.updatedAt === "string");
}

function readRecord(key: string): BriefDocRecord | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    return {
      investorHtml: sanitizeBriefHtml(parsed.investorHtml),
      publicHtml: sanitizeBriefHtml(parsed.publicHtml),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function writeRecord(key: string, record: BriefDocRecord) {
  const safe = {
    investorHtml: sanitizeBriefHtml(record.investorHtml),
    publicHtml: sanitizeBriefHtml(record.publicHtml),
    updatedAt: record.updatedAt,
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(safe));
  } catch {
    /* ignore quota */
  }
}

export function loadSavedBriefDoc(companyName: string): BriefDocRecord | null {
  return readRecord(`${SAVED_PREFIX}${companyName}`);
}

export function loadBriefDraft(companyName: string): BriefDocRecord | null {
  return readRecord(`${DRAFT_PREFIX}${companyName}`);
}

export function saveBriefDoc(companyName: string, record: BriefDocRecord) {
  writeRecord(`${SAVED_PREFIX}${companyName}`, record);
  writeRecord(`${DRAFT_PREFIX}${companyName}`, record);
}

export function saveBriefDraft(companyName: string, record: BriefDocRecord) {
  writeRecord(`${DRAFT_PREFIX}${companyName}`, record);
}

export function withPatriotPublicStory(companyName: string, record: BriefDocRecord): BriefDocRecord {
  if (!isPatriotPayName(companyName) || record.publicHtml.includes("brief-paper-public-essay-v2")) return record;
  return { ...record, publicHtml: buildPatriotPublicPaperHtml() };
}

export function clearBriefDraft(companyName: string) {
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${companyName}`);
  } catch {
    /* ignore */
  }
}

export function briefDocsEqual(a: BriefDocRecord, b: BriefDocRecord): boolean {
  return a.investorHtml === b.investorHtml && a.publicHtml === b.publicHtml;
}

export function cloneBriefRecord(record: BriefDocRecord): BriefDocRecord {
  return { investorHtml: record.investorHtml, publicHtml: record.publicHtml, updatedAt: record.updatedAt };
}

export function htmlField(audience: BriefAudience): "investorHtml" | "publicHtml" {
  return audience === "investor" ? "investorHtml" : "publicHtml";
}

export type BriefPublishRecord = {
  companyName: string;
  audience: BriefAudience;
  token: string;
  html: string;
  publishedAt: string;
};

const PUBLISH_INDEX_KEY = "fuel-brief-publish-index:v1";
const PUBLISH_ITEM_PREFIX = "fuel-brief-publish:v1:";

function publishIndexId(companyName: string, audience: BriefAudience): string {
  return `${companyName}\n${audience}`;
}

function isPublishRecord(value: unknown): value is BriefPublishRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as BriefPublishRecord;
  return typeof record.companyName === "string"
    && (record.audience === "investor" || record.audience === "public")
    && typeof record.token === "string"
    && typeof record.html === "string"
    && typeof record.publishedAt === "string";
}

function readPublishIndex(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(PUBLISH_INDEX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

function writePublishIndex(index: Record<string, string>) {
  try {
    window.localStorage.setItem(PUBLISH_INDEX_KEY, JSON.stringify(index));
  } catch {
    /* ignore quota */
  }
}

export function loadPublishedBrief(companyName: string, audience: BriefAudience): BriefPublishRecord | null {
  const token = readPublishIndex()[publishIndexId(companyName, audience)];
  if (!token) return null;
  const record = loadPublishedBriefByToken(token);
  if (!record || record.companyName !== companyName || record.audience !== audience) return null;
  return record;
}

export function loadPublishedBriefByToken(token: string): BriefPublishRecord | null {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(token)) return null;
  try {
    const raw = window.localStorage.getItem(`${PUBLISH_ITEM_PREFIX}${token}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPublishRecord(parsed) || parsed.token !== token) return null;
    return { ...parsed, html: sanitizeBriefHtml(parsed.html) };
  } catch {
    return null;
  }
}

export function publishBriefShare(companyName: string, audience: BriefAudience, html: string): BriefPublishRecord | null {
  const safeHtml = sanitizeBriefHtml(html).trim();
  if (!safeHtml) return null;
  const existing = loadPublishedBrief(companyName, audience);
  const token = existing?.token ?? (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const record: BriefPublishRecord = {
    companyName,
    audience,
    token,
    html: safeHtml,
    publishedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(`${PUBLISH_ITEM_PREFIX}${token}`, JSON.stringify(record));
  } catch {
    return null;
  }
  const index = readPublishIndex();
  index[publishIndexId(companyName, audience)] = token;
  writePublishIndex(index);
  return record;
}

export function unpublishBriefShare(companyName: string, audience: BriefAudience) {
  const existing = loadPublishedBrief(companyName, audience);
  const index = readPublishIndex();
  delete index[publishIndexId(companyName, audience)];
  writePublishIndex(index);
  if (!existing) return;
  try {
    window.localStorage.removeItem(`${PUBLISH_ITEM_PREFIX}${existing.token}`);
  } catch {
    /* ignore */
  }
}

export function briefShareUrl(token: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("brief", token);
  return url.toString();
}

export function readBriefShareTokenFromUrl(): string | null {
  try {
    return new URL(window.location.href).searchParams.get("brief");
  } catch {
    return null;
  }
}
