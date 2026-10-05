"use client";

import { useEffect } from "react";

const ENHANCED = "data-admin-acc";
const OPEN = "is-admin-acc-open";

function headerLabels(table: HTMLTableElement): string[] {
  const ths = table.tHead?.rows[0]
    ? Array.from(table.tHead.rows[0].cells)
    : Array.from(table.querySelectorAll("thead th"));
  return ths.map((th) => (th.textContent ?? "").replace(/\s+/g, " ").trim());
}

function isControlHeavy(td: HTMLTableCellElement): boolean {
  const text = (td.textContent ?? "").replace(/\s+/g, " ").trim();
  const controls = td.querySelectorAll("button, a, input, select, textarea, [role='button']");
  if (controls.length === 0) return false;
  if (!text) return true;
  return controls.length >= 1 && text.length < 48 && !td.querySelector("strong, b");
}

function pickSummaryTd(tr: HTMLTableRowElement): HTMLTableCellElement | null {
  const cells = Array.from(tr.cells);
  if (cells.length === 0) return null;
  for (const td of cells) {
    if (isControlHeavy(td)) continue;
    const text = (td.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    return td;
  }
  return cells[0] ?? null;
}

function enhanceTable(table: HTMLTableElement) {
  if (!table.tBodies.length) return;
  const labels = headerLabels(table);
  table.setAttribute(ENHANCED, "1");
  table.classList.add("fuel-admin-table--acc");

  for (const body of Array.from(table.tBodies)) {
    for (const tr of Array.from(body.rows)) {
      const cells = Array.from(tr.cells);
      cells.forEach((td, i) => {
        const label = labels[i] ?? "";
        if (label) td.setAttribute("data-label", label);
        else td.removeAttribute("data-label");

        td.removeAttribute("data-admin-acc-summary");
        td.removeAttribute("data-admin-acc-actions");

        if (isControlHeavy(td) || (cells.length > 1 && i === cells.length - 1)) {
          td.setAttribute("data-admin-acc-actions", "1");
        }
      });
      const summary = pickSummaryTd(tr);
      if (summary) {
        summary.setAttribute("data-admin-acc-summary", "1");
        summary.removeAttribute("data-admin-acc-actions");
      }
      if (!tr.hasAttribute("data-admin-acc-row")) {
        tr.setAttribute("data-admin-acc-row", "1");
      }
      tr.setAttribute("aria-expanded", tr.classList.contains(OPEN) ? "true" : "false");
    }
  }
}

function enhanceRoot(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>("table.fuel-admin-table").forEach(enhanceTable);
}

function isPhone(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Turns Super Admin HTML tables into expand/collapse accordion rows on phone
 * widths. Desktop layout is unchanged (CSS media query). Sets data attributes
 * only — no nodes injected into React-owned cells.
 */
export function useAdminTableMobileAccordion(rootSelector = ".fuel-admin-shell__main") {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    enhanceRoot(root);

    const mo = new MutationObserver((mutations) => {
      let needs = false;
      for (const m of mutations) {
        if (m.type === "childList" && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
          needs = true;
          break;
        }
      }
      if (needs) enhanceRoot(root);
    });
    mo.observe(root, { childList: true, subtree: true });

    const onClick = (event: Event) => {
      if (!isPhone()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Let real controls work without toggling the row.
      if (target.closest("button, a, input, select, textarea, label, [role='button']")) return;
      const tr = target.closest("tr[data-admin-acc-row]");
      if (!tr || !root.contains(tr)) return;
      if (!tr.closest("table.fuel-admin-table")) return;
      const open = tr.classList.toggle(OPEN);
      tr.setAttribute("aria-expanded", open ? "true" : "false");
    };

    root.addEventListener("click", onClick);
    const onResize = () => enhanceRoot(root);
    window.addEventListener("resize", onResize);

    return () => {
      mo.disconnect();
      root.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
    };
  }, [rootSelector]);
}
