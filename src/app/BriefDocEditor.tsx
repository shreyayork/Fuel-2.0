import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildAiNoteHtml,
  filterBriefBlocks,
  manualBlockHtml,
  type BriefBlockId,
} from "./briefBlockInsert";
import {
  type BriefAudience,
  type BriefDocRecord,
  type BriefPublishRecord,
  briefDocsEqual,
  briefShareUrl,
  clearBriefDraft,
  cloneBriefRecord,
  htmlField,
  loadBriefDraft,
  loadPublishedBrief,
  loadSavedBriefDoc,
  publishBriefShare,
  saveBriefDoc,
  saveBriefDraft,
  unpublishBriefShare,
  withPatriotPublicStory,
} from "./briefDocStorage";
import { buildPatriotPublicPaperHtml, isPatriotPayName } from "./patriotPublicStory";
import "./briefDocEditor.css";

const AUDIENCES: { id: BriefAudience; label: string }[] = [
  { id: "investor", label: "Investor" },
  { id: "public", label: "Public profile" },
];

type Appearance = "dark" | "light";

type ContextMenuState = {
  x: number;
  y: number;
  sectionTitle: string | null;
};

type BlockMenuState = {
  x: number;
  y: number;
  query: string;
  activeIndex: number;
  mode: "blocks" | "ai-prompt";
  openedAt: number;
  anchor: { kind: "caret"; range: Range } | { kind: "before"; index: number };
};

function menuPosition(left: number, top: number) {
  return {
    x: Math.max(8, Math.min(left, window.innerWidth - 308)),
    y: Math.max(8, Math.min(top, window.innerHeight - 520)),
  };
}

function formatEdited(iso: string | null): string {
  if (!iso) return "Not saved yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not saved yet";
  return `Last edited ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function readFuelTheme(): Appearance {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "light" || current === "dark") return current;
  try {
    const stored = localStorage.getItem("fuel-ui-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyFuelTheme(theme: Appearance) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("fuel-ui-theme", theme);
  } catch {
    /* ignore */
  }
}

function sectionTitleFrom(target: EventTarget | null): string | null {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return element?.closest("section")?.querySelector("h2")?.textContent?.trim() || null;
}

type BlockSeam = {
  index: number;
  x: number;
  y: number;
  lineX: number;
  lineY: number;
  lineW: number;
  sectionTitle: string | null;
};

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 2.25v9.5M2.25 7h9.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {[3, 7, 11].map(cy => [4.5, 9.5].map(cx => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.15" fill="currentColor" />
      )))}
    </svg>
  );
}

function BlockMark({ id }: { id: string }) {
  if (id === "ai-note") return <>Ai</>;
  if (id === "text") return <>T</>;
  if (id === "h1" || id === "h2" || id === "h3" || id === "h4") return <>{id.toUpperCase()}</>;
  if (id === "bullet") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="3" cy="4" r="1.2" fill="currentColor" />
        <circle cx="3" cy="8" r="1.2" fill="currentColor" />
        <circle cx="3" cy="12" r="1.2" fill="currentColor" />
        <path d="M6 4h8M6 8h8M6 12h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "numbered") return <>1.</>;
  if (id === "todo") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.5" y="1.5" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 6h3M12 9h3M12 12h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "quote") return <>“</>;
  if (id === "table") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="2.5" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 6.5h12M2 10h12M6.5 2.5v11M10 2.5v11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return null;
}

const PLACEHOLDER_TEXT = new Set(["Heading", "Quote", "Column", "Cell", "Text"]);

function tableCellFrom(node: Node | null, paper: HTMLElement): HTMLTableCellElement | null {
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  const cell = element?.closest("td, th");
  if (!(cell instanceof HTMLTableCellElement) || !paper.contains(cell)) return null;
  return cell;
}

function cellsInTable(cell: HTMLTableCellElement): HTMLTableCellElement[] {
  const table = cell.closest("table");
  if (!(table instanceof HTMLTableElement)) return [];
  return [...table.querySelectorAll("th, td")].filter(
    (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement && node.closest("table") === table,
  );
}

function focusTableCell(cell: HTMLTableCellElement, paper: HTMLElement) {
  if (!cell.childNodes.length) cell.appendChild(document.createElement("br"));
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  keepScroll(paper, cell, () => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

function listItemFrom(node: Node | null, paper: HTMLElement): HTMLLIElement | null {
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  const item = element?.closest("li");
  if (!(item instanceof HTMLLIElement) || !paper.contains(item)) return null;
  const list = item.parentElement;
  if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return null;
  return item;
}

function listItemIsEmpty(item: HTMLElement) {
  return [...item.childNodes].every(node => {
    if (node instanceof HTMLElement && node.classList.contains("brief-paper-check")) return true;
    if (node instanceof HTMLBRElement) return true;
    return !(node.textContent || "").replace(/[\u00a0\u200B]/g, "").trim();
  });
}

function placeCollapsedCaret(range: Range, target: HTMLElement, atEnd: boolean) {
  const check = [...target.childNodes].find(
    child => child instanceof HTMLElement && child.classList.contains("brief-paper-check"),
  );
  if (check instanceof HTMLElement) {
    let text = check.nextSibling;
    if (!(text instanceof Text)) {
      text = document.createTextNode("\u200B");
      check.after(text);
    } else if (!text.data) {
      text.data = "\u200B";
    }
    if (atEnd) range.setStart(text, text.data.length);
    else if (text.data.startsWith("\u200B")) range.setStart(text, 1);
    else range.setStart(text, 0);
    range.collapse(true);
    return;
  }
  const text = [...target.childNodes].find(
    child => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
  );
  if (atEnd && text) {
    range.selectNodeContents(text);
    range.collapse(false);
    return;
  }
  range.selectNodeContents(target);
  range.collapse(!atEnd);
}

function keepScroll(paper: HTMLElement, target: HTMLElement, place: () => void) {
  const canvas = paper.closest(".brief-doc-canvas");
  const scrollTop = canvas instanceof HTMLElement ? canvas.scrollTop : 0;
  paper.focus({ preventScroll: true });
  place();
  const settle = () => {
    if (!(canvas instanceof HTMLElement)) return;
    let rect = target.getBoundingClientRect();
    let view = canvas.getBoundingClientRect();
    const visible = rect.bottom > view.top + 12 && rect.top < view.bottom - 12;
    if (!visible && canvas.scrollTop + 24 < scrollTop) canvas.scrollTop = scrollTop;
    rect = target.getBoundingClientRect();
    view = canvas.getBoundingClientRect();
    if (rect.bottom > view.bottom - 12 || rect.top < view.top + 12) {
      target.scrollIntoView({ block: "nearest" });
    }
  };
  settle();
  requestAnimationFrame(settle);
}

function selectInserted(target: HTMLElement, paper: HTMLElement) {
  const range = document.createRange();
  const check = [...target.childNodes].find(
    child => child instanceof HTMLElement && child.classList.contains("brief-paper-check"),
  );
  const text = [...target.childNodes].find(
    child => child.nodeType === Node.TEXT_NODE && child.textContent?.replace(/\u200B/g, "").trim(),
  );
  if (check instanceof HTMLElement) placeCollapsedCaret(range, target, false);
  else if (text instanceof Text && PLACEHOLDER_TEXT.has(text.textContent.trim())) range.selectNodeContents(text);
  else if (text) {
    range.selectNodeContents(text);
    range.collapse(false);
  } else placeCollapsedCaret(range, target, false);
  keepScroll(paper, target, () => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

function placeCaretAtStart(target: HTMLElement, paper: HTMLElement) {
  const range = document.createRange();
  placeCollapsedCaret(range, target, false);
  keepScroll(paper, target, () => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

function blankListItem(list: HTMLElement) {
  const item = document.createElement("li");
  if (list.classList.contains("brief-paper-todo")) {
    const box = document.createElement("span");
    box.className = "brief-paper-check";
    box.setAttribute("contenteditable", "false");
    item.appendChild(box);
  }
  return item;
}

function ensureItemPlaceholder(item: HTMLElement) {
  if (!listItemIsEmpty(item) || item.querySelector("br")) return;
  const br = document.createElement("br");
  const box = [...item.childNodes].find(
    child => child instanceof HTMLElement && child.classList.contains("brief-paper-check"),
  );
  if (box) box.after(br);
  else item.appendChild(br);
}

function continueList(item: HTMLLIElement) {
  const list = item.parentElement;
  if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return null;
  const next = blankListItem(list);
  item.after(next);
  const selection = window.getSelection();
  if (selection?.rangeCount) {
    const range = selection.getRangeAt(0);
    const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const insideCheck = Boolean(host?.closest(".brief-paper-check"));
    const insideItem = item.contains(range.commonAncestorContainer) || range.commonAncestorContainer === item;
    if (insideItem && !insideCheck) {
      if (!range.collapsed) range.deleteContents();
      const after = range.cloneRange();
      after.selectNodeContents(item);
      try {
        after.setStart(range.endContainer, range.endOffset);
        const fragment = after.extractContents();
        fragment.querySelectorAll(".brief-paper-check").forEach(node => {
          item.insertBefore(node, item.firstChild);
        });
        const anchor = [...next.childNodes].find(
          child => child instanceof HTMLElement && child.classList.contains("brief-paper-check"),
        );
        if (anchor) anchor.after(fragment);
        else next.appendChild(fragment);
      } catch {
        // The caret was in a node the browser already removed. A new empty item is enough.
      }
    }
  }
  ensureItemPlaceholder(item);
  ensureItemPlaceholder(next);
  return next;
}

function exitList(item: HTMLLIElement) {
  const list = item.parentElement;
  if (!(list instanceof HTMLElement)) return null;
  const following = [...list.children].slice([...list.children].indexOf(item) + 1);
  item.remove();
  const paragraph = document.createElement("p");
  paragraph.appendChild(document.createElement("br"));
  if (list.isConnected) list.after(paragraph);
  if (following.length) {
    const rest = document.createElement(list.tagName.toLowerCase());
    rest.className = list.className;
    if (rest instanceof HTMLOListElement) {
      const start = list.querySelectorAll(":scope > li").length + 1;
      if (start > 1) rest.start = start;
    }
    following.forEach(node => rest.appendChild(node));
    paragraph.after(rest);
  }
  if (!list.querySelector("li")) list.remove();
  return paragraph;
}

const PaperMount = React.memo(function PaperMount({
  onMount,
}: {
  onMount: (node: HTMLDivElement) => void;
}) {
  return (
    <div
      ref={node => {
        if (node) onMount(node);
      }}
      className="brief-paper"
      role="textbox"
      aria-multiline="true"
      aria-label="Company brief"
      spellCheck
    />
  );
}, () => true);

export function BriefDocEditor({
  companyName,
  seed,
  onClose,
}: {
  companyName: string;
  seed: BriefDocRecord;
  onClose: () => void;
}) {
  const saved = useMemo(() => loadSavedBriefDoc(companyName) ?? seed, [companyName, seed]);
  const draftRef = useRef<BriefDocRecord>(withPatriotPublicStory(companyName, loadBriefDraft(companyName) ?? saved));
  const savedRef = useRef(saved);
  const [audience, setAudience] = useState<BriefAudience>("investor");
  const [editing, setEditing] = useState(true);
  const [dirty, setDirty] = useState(() => !briefDocsEqual(draftRef.current, saved));
  const [editedLabel, setEditedLabel] = useState(() => formatEdited(draftRef.current.updatedAt));
  const paperRef = useRef<HTMLDivElement | null>(null);
  const audienceRef = useRef<BriefAudience>("investor");
  const seedRef = useRef(seed);
  const editingRef = useRef(editing);
  const [theme, setTheme] = useState<Appearance>(() => readFuelTheme());
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [blockMenu, setBlockMenu] = useState<BlockMenuState | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [hovered, setHovered] = useState<BlockSeam | null>(null);
  const [dropSeam, setDropSeam] = useState<BlockSeam | null>(null);
  const [reordering, setReordering] = useState(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    from: number;
    active: boolean;
    startY: number;
    lastY: number;
    frame: number;
    dropIndex: number | null;
  } | null>(null);
  const dragListenerRef = useRef<{ onMove: (event: PointerEvent) => void; onUp: () => void } | null>(null);
  const blockSearchRef = useRef<HTMLInputElement>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishTick, setPublishTick] = useState(0);
  const published = useMemo(
    () => loadPublishedBrief(companyName, audience),
    [audience, companyName, publishTick],
  );
  audienceRef.current = audience;
  seedRef.current = seed;
  editingRef.current = editing;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const writePaper = (html: string, editable: boolean) => {
    const paper = paperRef.current;
    if (!paper) return;
    paper.innerHTML = html;
    paper.contentEditable = editable ? "true" : "false";
  };

  const markDirty = () => {
    const nextDirty = !briefDocsEqual(draftRef.current, savedRef.current);
    setDirty(current => (current === nextDirty ? current : nextDirty));
  };

  useEffect(() => {
    if (!isPatriotPayName(companyName)) return;
    let html = draftRef.current.publicHtml;
    if (!html.includes("brief-paper-public-essay-v2")) {
      html = buildPatriotPublicPaperHtml();
      draftRef.current = { ...draftRef.current, publicHtml: html };
      saveBriefDraft(companyName, draftRef.current);
      markDirty();
    }
    const paper = paperRef.current;
    if (audienceRef.current === "public" && paper && !paper.innerHTML.includes("brief-paper-public-essay-v2")) {
      paper.innerHTML = html;
    }
  });

  const readPaper = () => {
    const html = (paperRef.current?.innerHTML ?? "").replace(/\u200B/g, "");
    draftRef.current = { ...draftRef.current, [htmlField(audienceRef.current)]: html };
    saveBriefDraft(companyName, draftRef.current);
    markDirty();
  };

  const mountPaper = (node: HTMLDivElement) => {
    if (paperRef.current === node) return;
    paperRef.current = node;
    node.innerHTML = draftRef.current.investorHtml;
    node.contentEditable = "true";
    node.addEventListener("input", readPaper);
    node.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const check = target.closest(".brief-paper-check");
      if (check) {
        event.preventDefault();
        check.classList.toggle("brief-paper-checked");
        readPaper();
        return;
      }
      const toggle = target.closest(".brief-paper-toggle-mark");
      if (toggle) {
        event.preventDefault();
        toggle.closest(".brief-paper-toggle")?.classList.toggle("brief-paper-open");
        readPaper();
      }
    });
    node.addEventListener("contextmenu", event => {
      event.preventDefault();
      const menuWidth = 250;
      const menuHeight = 42;
      setMenu({
        x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth)),
        y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight)),
        sectionTitle: sectionTitleFrom(event.target),
      });
    });
    node.focus();
    document.execCommand("defaultParagraphSeparator", false, "p");
  };

  const switchAudience = (next: BriefAudience) => {
    if (next === audience) return;
    readPaper();
    audienceRef.current = next;
    setAudience(next);
    setShareOpen(false);
    setCopied(false);
    setBlockMenu(null);
    writePaper(draftRef.current[htmlField(next)], editing);
  };

  const persist = () => {
    readPaper();
    const next = { ...cloneBriefRecord(draftRef.current), updatedAt: new Date().toISOString() };
    saveBriefDoc(companyName, next);
    draftRef.current = next;
    savedRef.current = next;
    setDirty(false);
    setEditedLabel(formatEdited(next.updatedAt));
    return next;
  };

  const save = () => {
    persist();
    setEditing(false);
    if (paperRef.current) paperRef.current.contentEditable = "false";
  };

  const publishCurrent = () => {
    const next = persist();
    const record = publishBriefShare(companyName, audienceRef.current, next[htmlField(audienceRef.current)]);
    if (!record) return;
    setPublishTick(tick => tick + 1);
    setCopied(false);
    setShareOpen(true);
  };

  const unpublishCurrent = () => {
    unpublishBriefShare(companyName, audienceRef.current);
    setPublishTick(tick => tick + 1);
    setCopied(false);
  };

  const copyShareLink = async (record: BriefPublishRecord) => {
    const url = briefShareUrl(record.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      return;
    } catch {
      /* fall through to a selection copy */
    }
    const input = document.querySelector<HTMLInputElement>(".brief-doc-publish-link");
    if (!input) {
      setCopied(false);
      return;
    }
    input.focus();
    input.select();
    try {
      setCopied(document.execCommand("copy"));
    } catch {
      setCopied(false);
    }
  };

  const cancel = () => {
    const restored = cloneBriefRecord(savedRef.current);
    clearBriefDraft(companyName);
    saveBriefDraft(companyName, restored);
    draftRef.current = restored;
    setDirty(false);
    setEditing(false);
    writePaper(restored[htmlField(audienceRef.current)], false);
  };

  const restoreSection = (title: string | null) => {
    const paper = paperRef.current;
    const html = seedRef.current[htmlField(audienceRef.current)];
    if (!paper) return;
    if (title) {
      const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
      const source = [...parsed.querySelectorAll("section")].find(section => section.querySelector("h2")?.textContent?.trim() === title);
      const current = [...paper.querySelectorAll("section")].find(section => section.querySelector("h2")?.textContent?.trim() === title);
      if (source && current) {
        current.innerHTML = source.innerHTML;
        readPaper();
        setMenu(null);
        return;
      }
    }
    draftRef.current = { ...draftRef.current, [htmlField(audienceRef.current)]: html };
    saveBriefDraft(companyName, draftRef.current);
    markDirty();
    writePaper(html, editingRef.current);
    setMenu(null);
  };

  const undoEdit = () => {
    paperRef.current?.focus();
    document.execCommand("undo");
    readPaper();
    setMenu(null);
  };

  const redoEdit = () => {
    paperRef.current?.focus();
    document.execCommand("redo");
    readPaper();
    setMenu(null);
  };

  const copySelection = async () => {
    const paper = paperRef.current;
    const selected = window.getSelection()?.toString().trim() ?? "";
    const section = menu?.sectionTitle
      ? [...(paper?.querySelectorAll("section") ?? [])].find(item => item.querySelector("h2")?.textContent?.trim() === menu.sectionTitle)
      : null;
    const text = selected || section?.innerText || paper?.innerText || "";
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore clipboard denial */
    }
    setMenu(null);
  };

  const chooseTheme = (next: Appearance) => {
    setTheme(next);
    applyFuelTheme(next);
  };

  const setEditingMode = (next: boolean) => {
    setEditing(next);
    editingRef.current = next;
    if (!next) {
      setBlockMenu(null);
      setHovered(null);
      finishReorder(false);
    }
    if (paperRef.current) paperRef.current.contentEditable = next ? "true" : "false";
  };

  const seamAt = (clientY: number, loose = false): BlockSeam | null => {
    const paper = paperRef.current;
    if (!paper || !editingRef.current) return null;
    const children = [...paper.children] as HTMLElement[];
    if (!children.length) return null;
    const paperRect = paper.getBoundingClientRect();
    const style = getComputedStyle(paper);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padRight = parseFloat(style.paddingRight) || 0;
    const bounds = children.map(child => child.getBoundingClientRect());
    const lines = [bounds[0].top - 8];
    for (let index = 1; index < bounds.length; index += 1) {
      lines.push((bounds[index - 1].bottom + bounds[index].top) / 2);
    }
    lines.push(bounds[bounds.length - 1].bottom + 8);
    let nearest = 0;
    let nearestDistance = Math.abs(clientY - lines[0]);
    for (let index = 1; index < lines.length; index += 1) {
      const distance = Math.abs(clientY - lines[index]);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    }
    if (!loose && nearestDistance > 18) return null;
    const lineY = lines[nearest];
    const belowTitle = children[nearest]?.querySelector("h2")?.textContent?.trim();
    const aboveTitle = children[nearest - 1]?.querySelector("h2")?.textContent?.trim();
    return {
      index: nearest,
      x: paperRect.left + Math.max(6, padLeft - 68),
      y: lineY - 16,
      lineX: paperRect.left + padLeft,
      lineY,
      lineW: Math.max(40, paperRect.width - padLeft - padRight),
      sectionTitle: belowTitle || aboveTitle || null,
    };
  };

  const syncTailEmpty = () => {
    const tail = tailRef.current;
    if (!tail) return;
    tail.dataset.empty = (tail.textContent || "").trim() ? "false" : "true";
  };

  const openSlashAtEnd = () => {
    const paper = paperRef.current;
    const tail = tailRef.current;
    if (!paper || !tail) return;
    tail.textContent = "";
    syncTailEmpty();
    const rect = tail.getBoundingClientRect();
    openBlockMenu({ kind: "before", index: paper.children.length }, rect.left, rect.bottom + 8);
  };

  const commitTailText = () => {
    const paper = paperRef.current;
    const tail = tailRef.current;
    if (!paper || !tail) return;
    const text = (tail.textContent || "").replace(/\u00a0/g, " ");
    if (!text.trim()) {
      syncTailEmpty();
      return;
    }
    if (text.trim() === "/") {
      openSlashAtEnd();
      return;
    }
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    paper.appendChild(paragraph);
    tail.textContent = "";
    syncTailEmpty();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    readPaper();
  };

  const openBlockMenu = (anchor: BlockMenuState["anchor"], left: number, top: number) => {
    const position = menuPosition(left, top);
    setAiPrompt("");
    setHovered(null);
    setMenu(null);
    setBlockMenu({
      ...position,
      query: "",
      activeIndex: 0,
      mode: "blocks",
      openedAt: Date.now(),
      anchor,
    });
  };

  const insertHtml = (html: string) => {
    const paper = paperRef.current;
    if (!paper || !html || !blockMenu) return;
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const node = template.content.firstElementChild;
    if (!(node instanceof HTMLElement)) return;
    if (blockMenu.anchor.kind === "before") {
      const ref = [...paper.children][blockMenu.anchor.index];
      if (ref) paper.insertBefore(node, ref);
      else paper.appendChild(node);
    } else {
      const range = blockMenu.anchor.range;
      const container = range.startContainer;
      const parent = container instanceof Element ? container : container.parentElement;
      let top = parent;
      while (top && top.parentElement && top.parentElement !== paper) top = top.parentElement;
      if (top && top.parentElement === paper) top.after(node);
      else paper.appendChild(node);
    }
    const caretTarget = node.matches("p, h1, h2, h3, h4, li, td, th")
      ? node
      : node.querySelector("h1, h2, h3, h4, p, li, td, th");
    if (caretTarget instanceof HTMLElement) selectInserted(caretTarget, paper);
    setBlockMenu(null);
    setAiPrompt("");
    readPaper();
  };

  const chooseBlock = (id: BriefBlockId) => {
    if (id === "ai-note") {
      setAiPrompt("");
      setBlockMenu(current => current ? { ...current, mode: "ai-prompt" } : current);
      return;
    }
    insertHtml(manualBlockHtml(id));
  };

  const writeAiNote = () => {
    insertHtml(buildAiNoteHtml(aiPrompt, paperRef.current?.innerHTML ?? ""));
  };

  const clearDragClass = () => {
    paperRef.current?.querySelectorAll(".brief-paper-dragging").forEach(node => node.classList.remove("brief-paper-dragging"));
  };

  const stopDragListeners = () => {
    const listeners = dragListenerRef.current;
    if (!listeners) return;
    document.removeEventListener("pointermove", listeners.onMove);
    document.removeEventListener("pointerup", listeners.onUp);
    dragListenerRef.current = null;
  };

  const movePaperBlock = (from: number, toSeam: number) => {
    const paper = paperRef.current;
    if (!paper) return;
    const children = [...paper.children];
    const node = children[from];
    if (!(node instanceof HTMLElement)) return;
    if (toSeam === from || toSeam === from + 1) return;
    paper.insertBefore(node, children[toSeam] ?? null);
    readPaper();
  };

  const finishReorder = (commit: boolean) => {
    const drag = dragRef.current;
    if (!drag) return;
    cancelAnimationFrame(drag.frame);
    stopDragListeners();
    const shouldMove = commit && drag.active && drag.dropIndex != null;
    const from = drag.from;
    const toSeam = drag.dropIndex;
    dragRef.current = null;
    clearDragClass();
    setReordering(false);
    setDropSeam(null);
    setDragPoint(null);
    if (shouldMove && toSeam != null) movePaperBlock(from, toSeam);
  };

  const tickDrag = () => {
    const drag = dragRef.current;
    const paper = paperRef.current;
    if (!drag?.active || !paper) return;
    const canvas = paper.closest(".brief-doc-canvas");
    if (canvas instanceof HTMLElement) {
      const rect = canvas.getBoundingClientRect();
      if (drag.lastY < rect.top + 56) canvas.scrollTop -= 14;
      else if (drag.lastY > rect.bottom - 56) canvas.scrollTop += 14;
    }
    const seam = seamAt(drag.lastY, true);
    if (dragRef.current !== drag) return;
    drag.dropIndex = seam?.index ?? null;
    setDropSeam(current => {
      if (!seam) return current ? null : current;
      if (current && current.index === seam.index && Math.abs(current.lineY - seam.lineY) < 1) return current;
      return seam;
    });
    drag.frame = requestAnimationFrame(tickDrag);
  };

  const startReorder = (event: React.PointerEvent, from: number) => {
    if (event.button !== 0 || from < 0) return;
    event.preventDefault();
    event.stopPropagation();
    finishReorder(false);
    dragRef.current = {
      from,
      active: false,
      startY: event.clientY,
      lastY: event.clientY,
      frame: 0,
      dropIndex: null,
    };
    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.lastY = moveEvent.clientY;
      if (drag.active) {
        setDragPoint({ x: moveEvent.clientX, y: moveEvent.clientY });
        return;
      }
      if (Math.abs(moveEvent.clientY - drag.startY) < 4) return;
      drag.active = true;
      paperRef.current?.children[drag.from]?.classList.add("brief-paper-dragging");
      setDragPoint({ x: moveEvent.clientX, y: moveEvent.clientY });
      setReordering(true);
      drag.frame = requestAnimationFrame(tickDrag);
    };
    const onUp = () => finishReorder(true);
    dragListenerRef.current = { onMove, onUp };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const trackInsertGap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editingRef.current || dragRef.current) return;
    if (event.target instanceof Element && event.target.closest("[data-seam]")) return;
    const next = seamAt(event.clientY);
    setHovered(current => {
      if (!next) return current ? null : current;
      if (current && current.index === next.index && Math.abs(current.lineY - next.lineY) < 1) return current;
      return next;
    });
  };

  useEffect(() => {
    if (!blockMenu) return;
    if (blockMenu.mode === "blocks") blockSearchRef.current?.focus();
    else aiPromptRef.current?.focus();
  }, [blockMenu?.mode, blockMenu?.openedAt]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finishReorder(false);
        setMenu(null);
        setShareOpen(false);
        setBlockMenu(null);
      }
      const paper = paperRef.current;
      const tail = tailRef.current;
      const inPaper = paper && event.target instanceof Node && paper.contains(event.target);
      const inTail = tail && event.target instanceof Node && tail.contains(event.target);
      if (
        event.key === "Tab"
        && !event.metaKey
        && !event.ctrlKey
        && !event.altKey
        && !event.isComposing
        && inPaper
        && paper
        && editingRef.current
      ) {
        const cell = tableCellFrom(window.getSelection()?.anchorNode ?? null, paper);
        if (cell) {
          event.preventDefault();
          const cells = cellsInTable(cell);
          const index = cells.indexOf(cell);
          const next = cells[index + (event.shiftKey ? -1 : 1)];
          if (next) focusTableCell(next, paper);
          return;
        }
      }
      if (
        event.key === "Enter"
        && !event.shiftKey
        && !event.metaKey
        && !event.ctrlKey
        && !event.altKey
        && !event.isComposing
        && inPaper
        && paper
        && editingRef.current
      ) {
        const item = listItemFrom(window.getSelection()?.anchorNode ?? null, paper);
        if (item) {
          event.preventDefault();
          if (listItemIsEmpty(item)) {
            const paragraph = exitList(item);
            if (paragraph) placeCaretAtStart(paragraph, paper);
          } else {
            const next = continueList(item);
            if (next) placeCaretAtStart(next, paper);
          }
          readPaper();
          return;
        }
      }
      if (event.key === "/" && inTail && editingRef.current && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        openSlashAtEnd();
        return;
      }
      if (event.key === "/" && inPaper && editingRef.current && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        event.preventDefault();
        const range = selection.getRangeAt(0).cloneRange();
        const rect = range.getBoundingClientRect();
        const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
        const fallback = host?.getBoundingClientRect();
        openBlockMenu(
          { kind: "caret", range },
          rect.width || rect.height ? rect.left : fallback?.left ?? 80,
          (rect.width || rect.height ? rect.bottom : fallback?.bottom ?? 120) + 8,
        );
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!briefDocsEqual(draftRef.current, savedRef.current)) save();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 2) return;
      const target = event.target;
      if (target instanceof Element && target.closest(".brief-doc-menu, .brief-doc-publish, .brief-block-menu, .brief-block-gutter, .brief-block-plus")) return;
      setMenu(null);
      setShareOpen(false);
      setBlockMenu(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  });

  useEffect(() => () => {
    cancelAnimationFrame(dragRef.current?.frame ?? 0);
    const listeners = dragListenerRef.current;
    if (!listeners) return;
    document.removeEventListener("pointermove", listeners.onMove);
    document.removeEventListener("pointerup", listeners.onUp);
  }, []);

  const line = reordering ? dropSeam : hovered;

  const screen = (
    <div className="brief-doc-screen" role="dialog" aria-modal="true" aria-label={`Edit ${companyName} brief`}>
      <header className="brief-doc-bar">
        <div className="brief-doc-identity">
          <button type="button" className="brief-doc-back" onClick={onClose}>Brief</button>
          <div>
            <strong>{companyName}</strong>
            <p>
              {audience === "investor" ? "Investor version" : "Public profile version"}
              {" · "}
              {editedLabel}
              {" · "}
              {published ? "Published" : "Not published"}
            </p>
          </div>
        </div>
        <div className="brief-doc-controls">
          <div className="brief-doc-theme" role="group" aria-label="Appearance">
            <button type="button" aria-pressed={theme === "dark"} className={theme === "dark" ? "is-active" : undefined} onClick={() => chooseTheme("dark")}>Dark</button>
            <button type="button" aria-pressed={theme === "light"} className={theme === "light" ? "is-active" : undefined} onClick={() => chooseTheme("light")}>Light</button>
          </div>
          <div className="brief-doc-tabs" role="tablist" aria-label="Brief version">
            {AUDIENCES.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={audience === item.id}
                className={audience === item.id ? "is-active" : undefined}
                onClick={() => switchAudience(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="brief-doc-publish">
            <button
              type="button"
              className={`brief-doc-share${published ? " is-on" : ""}`}
              aria-expanded={shareOpen}
              aria-label={published
                ? `Share link for the ${audience === "investor" ? "investor brief" : "public profile"}`
                : `Publish the ${audience === "investor" ? "investor brief" : "public profile"}`}
              onClick={() => {
                setCopied(false);
                setShareOpen(open => !open);
              }}
            >
              {published ? "Share link" : "Publish"}
            </button>
            {shareOpen ? (
              <div className="brief-doc-publish-panel" role="region" aria-label={audience === "investor" ? "Publish investor brief" : "Publish public profile"}>
                <strong>{audience === "investor" ? "Investor brief" : "Public profile"}</strong>
                <p>
                  {audience === "investor"
                    ? "Anyone with this link can read the investor brief, including private numbers."
                    : "Anyone with this link can read the public profile. Private numbers stay off it."}
                </p>
                {published ? (
                  <>
                    <input className="brief-doc-publish-link" readOnly value={briefShareUrl(published.token)} aria-label="Shareable link" />
                    {dirty ? <p>Edits on this page are not on the link until you update it.</p> : null}
                    <div className="brief-doc-publish-actions">
                      <button type="button" className="brief-doc-publish-primary" onClick={() => { void copyShareLink(published); }}>
                        {copied ? "Copied" : "Copy link"}
                      </button>
                      <button type="button" className="brief-doc-publish-secondary" onClick={publishCurrent}>Update link</button>
                      <button type="button" className="brief-doc-publish-secondary" onClick={unpublishCurrent}>Unpublish</button>
                    </div>
                  </>
                ) : (
                  <div className="brief-doc-publish-actions">
                    <button type="button" className="brief-doc-publish-primary" onClick={publishCurrent}>Publish</button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className={`brief-doc-editing${editing ? " is-on" : ""}`}
            aria-pressed={editing}
            onClick={() => setEditingMode(!editing)}
          >
            Editing
          </button>
          <button type="button" className="brief-doc-cancel" onClick={cancel} disabled={!dirty && !editing}>
            Cancel
          </button>
          <button type="button" className="brief-doc-save" onClick={save} disabled={!dirty}>
            Save changes
          </button>
        </div>
      </header>

      <div
        className={`brief-doc-canvas${reordering ? " is-reordering" : ""}`}
        onScroll={() => {
          if (dragRef.current?.active) return;
          setMenu(null);
          setBlockMenu(null);
          setHovered(null);
        }}
        onPointerMove={trackInsertGap}
        onPointerLeave={() => {
          if (dragRef.current) return;
          setHovered(null);
        }}
      >
        <PaperMount onMount={mountPaper} />
        {editing ? (
          <div
            ref={tailRef}
            className="brief-paper-tail"
            contentEditable
            role="textbox"
            aria-label="Type / to add a block"
            data-empty="true"
            spellCheck
            onInput={commitTailText}
          />
        ) : null}
        {hovered ? (
          <>
            <div
              className="brief-block-gutter"
              data-seam={hovered.index}
              style={{
                left: reordering && dragPoint ? dragPoint.x - 48 : hovered.x,
                top: reordering && dragPoint ? dragPoint.y - 16 : hovered.y,
              }}
            >
              <button
                type="button"
                className="brief-block-plus"
                data-seam={hovered.index}
                aria-label="Add a block"
                onClick={() => openBlockMenu({ kind: "before", index: hovered.index }, hovered.lineX, hovered.y)}
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                className="brief-block-grip"
                data-seam={hovered.index}
                aria-label="Drag to reorder"
                onPointerDown={event => {
                  const count = paperRef.current?.children.length ?? 0;
                  if (!count) return;
                  startReorder(event, Math.min(hovered.index, count - 1));
                }}
              >
                <GripIcon />
              </button>
            </div>
          </>
        ) : null}
        {line ? (
          <div
            className="brief-block-line"
            style={{ left: line.lineX, top: line.lineY - 1, width: line.lineW }}
          />
        ) : null}
      </div>
      {blockMenu ? (
        <div
          className="brief-block-menu"
          role="dialog"
          aria-label={blockMenu.mode === "ai-prompt" ? "AI note" : "Add a block"}
          style={{ left: blockMenu.x, top: blockMenu.y }}
        >
          {blockMenu.mode === "ai-prompt" ? (
            <form
              className="brief-block-prompt"
              onSubmit={event => {
                event.preventDefault();
                writeAiNote();
              }}
            >
              <strong>AI note</strong>
              <p>Write the prompt. Fuel pulls matching fields from this brief and leaves out numbers that are not already here.</p>
              <textarea
                ref={aiPromptRef}
                value={aiPrompt}
                onChange={event => setAiPrompt(event.target.value)}
                placeholder="Explain runway for the board"
                aria-label="AI note prompt"
              />
              <div className="brief-block-prompt-actions">
                <button type="submit" className="brief-doc-publish-primary" disabled={!aiPrompt.trim()}>Write note</button>
                <button type="button" className="brief-doc-publish-secondary" onClick={() => setBlockMenu(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <div className="brief-block-options">
                {(["Suggested", "Basic blocks"] as const).map(group => {
                  const items = filterBriefBlocks(blockMenu.query).filter(item => item.group === group);
                  if (!items.length) return null;
                  const visible = filterBriefBlocks(blockMenu.query);
                  return (
                    <div key={group}>
                      <p className="brief-block-group">{group}</p>
                      {items.map(item => {
                        const index = visible.indexOf(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`brief-block-item${index === Math.min(blockMenu.activeIndex, visible.length - 1) ? " is-active" : ""}`}
                            onMouseDown={event => event.preventDefault()}
                            onMouseEnter={() => setBlockMenu(current => current ? { ...current, activeIndex: index } : current)}
                            onClick={() => chooseBlock(item.id)}
                          >
                            <span className="brief-block-mark" aria-hidden="true"><BlockMark id={item.id} /></span>
                            <span>{item.label}</span>
                            {item.badge ? <span className="brief-block-badge">{item.badge}</span> : null}
                            {item.hint ? <span className="brief-block-hint">{item.hint}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                {filterBriefBlocks(blockMenu.query).length ? null : <p className="brief-block-empty">No blocks</p>}
              </div>
              <button type="button" className="brief-block-item brief-block-close" onMouseDown={event => event.preventDefault()} onClick={() => setBlockMenu(null)}>
                <span>Close menu</span>
                <span className="brief-block-hint">esc</span>
              </button>
              <input
                ref={blockSearchRef}
                className="brief-block-search"
                value={blockMenu.query}
                placeholder="Type to search"
                aria-label="Type to search"
                onChange={event => setBlockMenu(current => current ? { ...current, query: event.target.value, activeIndex: 0 } : current)}
                onKeyDown={event => {
                  const visible = filterBriefBlocks(blockMenu.query);
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setBlockMenu(current => current ? { ...current, activeIndex: Math.min(current.activeIndex + 1, Math.max(visible.length - 1, 0)) } : current);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setBlockMenu(current => current ? { ...current, activeIndex: Math.max(current.activeIndex - 1, 0) } : current);
                  } else if (event.key === "Enter" && visible[blockMenu.activeIndex]) {
                    event.preventDefault();
                    chooseBlock(visible[blockMenu.activeIndex].id);
                  }
                }}
              />
            </>
          )}
        </div>
      ) : null}
      {menu ? (
        <div className="brief-doc-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
          <button type="button" role="menuitem" onMouseDown={event => event.preventDefault()} onClick={() => restoreSection(menu.sectionTitle)} disabled={!editing}>Restore</button>
          <button type="button" role="menuitem" onMouseDown={event => event.preventDefault()} onClick={undoEdit} disabled={!editing}>Undo</button>
          <button type="button" role="menuitem" onMouseDown={event => event.preventDefault()} onClick={redoEdit} disabled={!editing}>Redo</button>
          <button type="button" role="menuitem" onMouseDown={event => event.preventDefault()} onClick={() => { void copySelection(); }}>Copy</button>
        </div>
      ) : null}
    </div>
  );

  return createPortal(screen, document.body);
}
