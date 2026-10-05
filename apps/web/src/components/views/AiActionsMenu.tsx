"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAgentDrawer } from "../AgentDrawer";
import { useTheme } from "../ThemeContext";
import {
  accentChipBg,
  accentChipBorder,
  accentChipFg,
  type Theme,
} from "@/lib/theme";
import {
  type PlaybookPickerEntry,
  type PlaybookSubject,
  filterPlaybooksForSubject,
  runPlaybookAgainstSubject,
  PlaybookPickerPanel,
} from "./PlaybookPickerButton";

/**
 * Company header AI actions — ✦ trigger with Playbooks submenu + Generate brief.
 * Playbook list reuses `PlaybookPickerPanel` from PlaybookPickerButton.
 */
export function AiActionsMenu({
  companyUuid,
  companyName,
  playbooks,
  tourActive = false,
  tourHighlightItem,
}: {
  companyUuid: string;
  companyName: string;
  playbooks: PlaybookPickerEntry[];
  /** Force-open the ✦ menu while the guided tour highlights Playbooks / Generate brief. */
  tourActive?: boolean;
  tourHighlightItem?: "playbooks" | "brief";
}) {
  const t = useTheme();
  const drawer = useAgentDrawer();
  const { run } = drawer;
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [hoveredItem, setHoveredItem] = useState<"playbooks" | "brief" | null>(null);
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const showPickerRef = useRef(showPicker);
  showPickerRef.current = showPicker;

  const subject: PlaybookSubject = {
    kind: "company",
    uuid: companyUuid,
    name: companyName,
  };

  const cancelClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    if (tourActive) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      if (!showPickerRef.current) setOpen(false);
    }, 220);
  };

  const closeAll = () => {
    setOpen(false);
    setShowPicker(false);
    setQuery("");
    setHoveredItem(null);
  };

  useEffect(() => {
    return () => cancelClose();
  }, []);

  useEffect(() => {
    if (tourActive) {
      cancelClose();
      setOpen(true);
      setShowPicker(false);
      setQuery("");
      return;
    }
    setOpen(false);
    setShowPicker(false);
  }, [tourActive]);

  useEffect(() => {
    if (!open && !showPicker) return;
    if (tourActive) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      // Sheet portals to document.body — treat it as inside the menu.
      if (
        target instanceof Element &&
        target.closest(".fuel-playbook-sheet")
      ) {
        return;
      }
      closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPickerRef.current) {
          setShowPicker(false);
          setQuery("");
          return;
        }
        closeAll();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, showPicker, tourActive]);

  const { filtered, byCategory, categories, kindFiltered } = filterPlaybooksForSubject(
    playbooks,
    subject,
    query,
  );

  const runPlaybook = (pb: PlaybookPickerEntry) => {
    void runPlaybookAgainstSubject(drawer, subject, pb);
    closeAll();
  };

  const generateBrief = () => {
    run(buildIntelligenceBriefArgs(companyUuid, companyName));
    closeAll();
  };

  const menuOpen = open || tourActive;
  const highlightPlaybooks = tourHighlightItem === "playbooks";
  const highlightBrief = tourHighlightItem === "brief";

  return (
    <div
      ref={wrapRef}
      className="company-page-chrome__icon-cta"
      style={{ zIndex: tourActive ? 130 : undefined }}
      onMouseEnter={() => {
        // Touch devices: open via tap only (Responsive Skill — no hover-only).
        if (window.matchMedia("(hover: none)").matches) return;
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: none)").matches) return;
        if (!showPickerRef.current) scheduleClose();
      }}
    >
      <button
        type="button"
        title="AI Actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => {
          if (tourActive) return;
          setOpen((v) => !v);
        }}
        style={triggerStyle(t)}
      >
        ✦
      </button>

      {menuOpen && !showPicker ? (
        <div role="menu" style={dropdownStyle(t)}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={showPicker}
            data-tour-target="ai-actions-playbooks"
            className={highlightPlaybooks ? "fuel-tour-highlight" : undefined}
            onClick={() => setShowPicker(true)}
            onMouseEnter={() => setHoveredItem("playbooks")}
            onMouseLeave={() => setHoveredItem(null)}
            style={itemStyle(t, {
              hovered: hoveredItem === "playbooks" || highlightPlaybooks,
            })}
          >
            <span>▤ Playbooks</span>
            <span style={{ color: t.mutedSoft, fontSize: 11 }} aria-hidden>
              ▸
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            data-tour-target="ai-actions-brief"
            className={highlightBrief ? "fuel-tour-highlight" : undefined}
            onClick={generateBrief}
            onMouseEnter={() => setHoveredItem("brief")}
            onMouseLeave={() => setHoveredItem(null)}
            style={itemStyle(t, {
              hovered: hoveredItem === "brief" || highlightBrief,
            })}
          >
            ≡ Generate brief
          </button>
        </div>
      ) : null}

      {showPicker ? (
        <PlaybookPickerPanel
          t={t}
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          byCategory={byCategory}
          categories={categories}
          runPlaybook={runPlaybook}
          subject={subject}
          totalCount={kindFiltered.length}
          onClose={() => {
            setShowPicker(false);
            setQuery("");
          }}
        />
      ) : null}
    </div>
  );
}

function buildIntelligenceBriefArgs(uuid: string, name: string) {
  return {
    prompt: `Generate a signal-driven intelligence brief for ${name} (fuel-data UUID: ${uuid}).

Data to pull:
  1. getCompany(uuid) — public profile
  2. getCompanyObservations(companyUuid: "${uuid}") — structured signals grouped by category (growth, retention, efficiency, finance, team, gtm, product, fundraising, strategic). Treat this as the primary source of truth for what we know.
  3. getCompanyContext(companyUuid: "${uuid}", limit: 20) — recent private notes / HubSpot / Granola for narrative context and attribution
  4. compareToBenchmark — only when a quantitative signal has a cohort to compare against

Structure the output exactly as:
  ## State of the business
    2-3 sentences, lead with the observations that moved most recently.
  ## Traction
    Growth + retention signals with values. Cite period.
  ## Efficiency & Finance
    Efficiency, finance, and runway signals. Call out burn multiple, runway, rule of 40 if present.
  ## Fundraising
    Only when actively_fundraising is true or fundraise_timing is set. Call out round stage, type, target size, pre/post, lead, close date if known.
  ## Risks
    Qualitative risk signals + anything on the inverted-good quant metrics that's drifting.
  ## Opportunities
    Qualitative opportunity signals + gaps worth addressing.
  ## Suggested initiatives
    3-5 concrete initiatives the operating team should run, ranked by impact.
    Use this exact field layout for each item (Overview / Data Room parity):

    1. **Specific actionable title**
       description: 1–3 sentences on what to do and why (tied to a specific signal).
       benefit: Value of completing this — 2–4 short bullets, one per benefit: line.
       kind: continuous|onetime
       area: gtm|product|finance|people|ops|other
       milestone: Short actionable step | MM-DD-YYYY
       milestone: Another step | MM-DD-YYYY
       source: Signal: <name> (<period>) — or Cohort / document citation. Omit if no evidence.

    Include 2–4 milestone: lines (dates on or after today, MM-DD-YYYY). Cite real signals/benchmarks in source: lines — never invent.

Keep each section tight. When you use a private signal, attribute the category (e.g. "[signal: fundraising]"). If a section has no data, write "No signals captured yet." rather than padding.`,
    displayPrompt: `Generate a signal-driven briefing for [${name}](/company/${uuid}).`,
    kind: "intelligence_brief" as const,
    subjectCompanyUuid: uuid,
    subjectCompanyName: name,
    artifactKind: "intelligence_brief" as const,
  };
}

function triggerStyle(t: Theme): CSSProperties {
  return {
    border: `1px solid ${accentChipBorder(t)}`,
    background: accentChipBg(t),
    color: accentChipFg(t),
    fontFamily: t.sans,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 0,
    lineHeight: 1,
  };
}

function dropdownStyle(t: Theme): CSSProperties {
  return {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
    padding: 4,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 200,
    maxWidth: "min(280px, calc(100vw - 24px))",
    zIndex: 200,
    boxShadow: `0 10px 28px ${t.overlay}`,
  };
}

function itemStyle(
  t: Theme,
  opts: { hovered?: boolean },
): CSSProperties {
  const highlight = Boolean(opts.hovered);
  return {
    background: highlight ? t.panelAlt : "transparent",
    border: "none",
    color: highlight ? t.ink : t.inkSoft,
    padding: "12px 14px",
    borderRadius: 8,
    fontFamily: t.sans,
    fontSize: 14,
    fontWeight: 550,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
}
