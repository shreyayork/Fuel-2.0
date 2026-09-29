/**
 * FAQ inline rich text — markdown links `[label](href)` inside answer / points /
 * footnote strings. Plain text (no brackets) stays valid forever.
 */

export type FaqInlineSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Authoring token for company-scoped in-app paths.
 * Example: `/company/{{company_id}}?tab=intelligence`
 * Substituted at render time — never stored with a real UUID.
 */
export const FAQ_COMPANY_ID_TOKEN = "{{company_id}}";

/** Reserved pseudo-href — opens Ask Fuel drawer (not a navigable URL). */
export const FAQ_ASK_FUEL_HREF = "action:ask-fuel";

export type FaqActionType = "ask-fuel";

export function getFaqActionType(href: string): FaqActionType | null {
  const trimmed = href.trim().toLowerCase();
  if (trimmed === FAQ_ASK_FUEL_HREF) return "ask-fuel";
  return null;
}

export function isFaqActionLink(href: string): boolean {
  return getFaqActionType(href) != null;
}

/** Sentinel only used while validating templated paths (never stored). */
const COMPANY_ID_SANITIZE_SENTINEL = "__faq_company_id__";

export function hasFaqCompanyIdToken(href: string): boolean {
  return href.includes(FAQ_COMPANY_ID_TOKEN);
}

function sanitizeInternalPath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.toLowerCase().includes("javascript:")) return null;
  return path;
}

/**
 * Allow http(s), mailto, in-app absolute paths, `{{company_id}}` paths,
 * and reserved action hrefs (`action:ask-fuel`).
 */
export function sanitizeFaqHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const action = getFaqActionType(trimmed);
  if (action === "ask-fuel") return FAQ_ASK_FUEL_HREF;

  if (trimmed.includes(FAQ_COMPANY_ID_TOKEN) || /[{}]/.test(trimmed)) {
    const forCheck = trimmed.split(FAQ_COMPANY_ID_TOKEN).join(COMPANY_ID_SANITIZE_SENTINEL);
    // Reject typos / unknown placeholders like `{{companyid}}` or `{company_id}`.
    if (/[{}]/.test(forCheck)) return null;
    if (!sanitizeInternalPath(forCheck)) return null;
    return trimmed;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return sanitizeInternalPath(trimmed);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // Bare domain → https
    try {
      url = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol === "http:" || protocol === "https:") {
    return url.toString();
  }
  if (protocol === "mailto:") {
    const addr = url.pathname || url.href.replace(/^mailto:/i, "");
    if (!addr || addr.includes("@") === false) return null;
    return `mailto:${addr}`;
  }
  return null;
}

export type ResolveFaqLinkHrefResult =
  | { ok: true; href: string }
  | { ok: false; reason: "invalid" | "unresolved_company" };

/**
 * Render-time href resolution. Replaces every `{{company_id}}` with the
 * encoded company UUID. Never returns a href still containing the token.
 */
export function resolveFaqLinkHref(
  rawHref: string,
  companyId: string | null | undefined,
): ResolveFaqLinkHrefResult {
  const sanitized = sanitizeFaqHref(rawHref);
  if (!sanitized) return { ok: false, reason: "invalid" };
  // Action links are not navigable URLs — callers handle separately.
  if (isFaqActionLink(sanitized)) {
    return { ok: true, href: sanitized };
  }
  if (!hasFaqCompanyIdToken(sanitized)) {
    return { ok: true, href: sanitized };
  }
  const id = companyId?.trim();
  if (!id) return { ok: false, reason: "unresolved_company" };
  const href = sanitized.split(FAQ_COMPANY_ID_TOKEN).join(encodeURIComponent(id));
  if (hasFaqCompanyIdToken(href) || /[{}]/.test(href)) {
    return { ok: false, reason: "invalid" };
  }
  // Re-validate after substitution (token gone → normal path rules).
  const finalHref = sanitizeFaqHref(href);
  if (!finalHref) return { ok: false, reason: "invalid" };
  return { ok: true, href: finalHref };
}

export function parseFaqInline(raw: string | null | undefined): FaqInlineSegment[] {
  if (!raw) return [];
  const segments: FaqInlineSegment[] = [];
  let last = 0;
  LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(raw)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", text: raw.slice(last, match.index) });
    }
    const label = match[1] ?? "";
    const href = sanitizeFaqHref(match[2] ?? "");
    if (href && label.trim()) {
      segments.push({ type: "link", text: label, href });
    } else {
      // Malformed / unsafe — keep raw markdown as text so nothing disappears.
      segments.push({ type: "text", text: match[0] });
    }
    last = match.index + match[0].length;
  }
  if (last < raw.length) {
    segments.push({ type: "text", text: raw.slice(last) });
  }
  return segments;
}

export function serializeFaqInline(segments: FaqInlineSegment[]): string {
  return segments
    .map((s) => {
      if (s.type === "text") return s.text;
      return `[${s.text}](${s.href})`;
    })
    .join("");
}

/** Build markdown link; returns error message or null + markdown. */
export function buildFaqMarkdownLink(
  label: string,
  hrefRaw: string,
): { ok: true; markdown: string } | { ok: false; error: string } {
  const text = label.trim();
  if (!text) return { ok: false, error: "Link text is required." };
  const href = sanitizeFaqHref(hrefRaw);
  if (!href) {
    return {
      ok: false,
      error: "Enter a valid URL (https://…), mailto:, in-app path (/…), or /company/{{company_id}}?tab=….",
    };
  }
  return { ok: true, markdown: `[${text}](${href})` };
}

/** Strip / rewrite unsafe links in stored content before persist. */
export function normalizeFaqRichText(raw: string): string {
  return serializeFaqInline(parseFaqInline(raw));
}

/** TipTap JSON (doc → paragraph → text | hardBreak) — links only via marks. */
export type TipTapLinkMark = { type: "link"; attrs: { href: string } };
export type TipTapTextNode = {
  type: "text";
  text: string;
  marks?: TipTapLinkMark[];
};
export type TipTapHardBreak = { type: "hardBreak" };
export type TipTapInlineNode = TipTapTextNode | TipTapHardBreak;
export type TipTapParagraphNode = {
  type: "paragraph";
  content?: TipTapInlineNode[];
};
export type TipTapDoc = {
  type: "doc";
  content: TipTapParagraphNode[];
};

function segmentsToInlineNodes(segments: FaqInlineSegment[]): TipTapInlineNode[] {
  const nodes: TipTapInlineNode[] = [];
  for (const seg of segments) {
    if (seg.type === "link") {
      if (!seg.text) continue;
      nodes.push({
        type: "text",
        text: seg.text,
        marks: [{ type: "link", attrs: { href: seg.href } }],
      });
      continue;
    }
    const parts = seg.text.split("\n");
    parts.forEach((part, i) => {
      if (part) nodes.push({ type: "text", text: part });
      if (i < parts.length - 1) nodes.push({ type: "hardBreak" });
    });
  }
  return nodes;
}

/** Markdown → TipTap JSON (single paragraph; `\n` → hardBreak). */
export function markdownToTipTapDoc(raw: string | null | undefined): TipTapDoc {
  const segments = parseFaqInline(raw ?? "");
  const inline = segmentsToInlineNodes(segments);
  return {
    type: "doc",
    content: [{ type: "paragraph", ...(inline.length ? { content: inline } : {}) }],
  };
}

function inlineNodesToMarkdown(nodes: TipTapInlineNode[] | undefined): string {
  if (!nodes?.length) return "";
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      parts.push("\n");
      continue;
    }
    const linkMark = node.marks?.find((m) => m.type === "link");
    const href = linkMark ? sanitizeFaqHref(linkMark.attrs.href) : null;
    if (href && node.text) {
      parts.push(`[${node.text.replace(/[\[\]]/g, "")}](${href})`);
    } else {
      parts.push(node.text);
    }
  }
  return parts.join("");
}

/** TipTap JSON → markdown `[text](url)`. Paragraphs joined by `\n`. */
export function tipTapDocToMarkdown(doc: TipTapDoc | null | undefined): string {
  if (!doc?.content?.length) return "";
  return doc.content
    .map((p) => (p.type === "paragraph" ? inlineNodesToMarkdown(p.content) : ""))
    .join("\n")
    .replace(/\n+$/, "");
}

/** Markdown → editor HTML (links only). Newlines → <br>. Legacy helper. */
export function markdownToEditorHtml(raw: string): string {
  const segments = parseFaqInline(raw);
  if (segments.length === 0) return "";
  return segments
    .map((s) => {
      if (s.type === "text") return escapeHtml(s.text).replace(/\n/g, "<br>");
      const href = escapeAttr(s.href);
      const label = escapeHtml(s.text);
      return `<a href="${href}" data-faq-link="1">${label}</a>`;
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/**
 * Walk editor DOM → markdown. Keeps text + `<a href>` only; strips other tags.
 * `<br>` / block breaks become newlines. Legacy helper for contentEditable era.
 */
export function editorDomToMarkdown(root: HTMLElement): string {
  const parts: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") {
      parts.push("\n");
      return;
    }
    if (tag === "a") {
      const href = sanitizeFaqHref(el.getAttribute("href") ?? "");
      const label = (el.textContent ?? "").trim() || (el.textContent ?? "");
      if (href && label) {
        parts.push(`[${label.replace(/[\[\]]/g, "")}](${href})`);
      } else {
        parts.push(el.textContent ?? "");
      }
      return;
    }
    if (tag === "div" || tag === "p" || tag === "li") {
      if (parts.length > 0 && !parts[parts.length - 1]!.endsWith("\n")) {
        parts.push("\n");
      }
    }
    for (const child of Array.from(el.childNodes)) walk(child);
    if (tag === "div" || tag === "p") {
      if (!parts[parts.length - 1]?.endsWith("\n")) parts.push("\n");
    }
  };

  for (const child of Array.from(root.childNodes)) walk(child);
  return parts.join("").replace(/\n+$/, "");
}
