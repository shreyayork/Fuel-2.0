"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAgentDrawer } from "../AgentDrawer";
import { useTheme } from "../ThemeContext";
import { dropdownScrollProps, type Theme } from "@/lib/theme";
import {
  buildExtractDeckPromptBlock,
  fetchCompanyPitchDeckIds,
  isPitchDeckEvaluationSlug,
} from "@/lib/playbooks/pitch-deck-evaluation";
import {
  fetchKpiBenchmarkValues,
  isKpiBenchmarkComplete,
  isKpiBenchmarkSlug,
} from "@/lib/playbooks/kpi-benchmark";
import { withSuggestedInitiativesFormat } from "@/lib/playbooks/suggested-initiatives-format";

export interface PlaybookPickerEntry {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  /** Hint from the playbook row. null means works on either company or
   *  portfolio (e.g. the Value Creation Report). */
  targetKind: "company" | "deal" | "pipeline" | null;
  content: string;
}

export type PlaybookSubject =
  | { kind: "company"; uuid: string; name: string }
  | {
      kind: "portfolio";
      watchlistId: string;
      name: string;
      fundName: string | null;
      companies: Array<{ uuid: string; name: string | null }>;
    };

export function filterPlaybooksForSubject(
  playbooks: PlaybookPickerEntry[],
  subject: PlaybookSubject,
  query: string,
) {
  // Filter to playbooks that either match the subject kind or are
  // kind-agnostic (targetKind === null — e.g. Value Creation Report).
  // Then apply the user's text query.
  const kindFiltered = playbooks.filter((p) => {
    if (p.targetKind == null) return true;
    if (subject.kind === "company") return p.targetKind === "company";
    if (subject.kind === "portfolio") return p.targetKind === "pipeline";
    return false;
  });
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? kindFiltered.filter(
        (p) =>
          p.title.toLowerCase().includes(normalized) ||
          p.description.toLowerCase().includes(normalized) ||
          p.category.toLowerCase().includes(normalized) ||
          (p.subcategory ?? "").toLowerCase().includes(normalized),
      )
    : kindFiltered;

  const byCategory = new Map<string, PlaybookPickerEntry[]>();
  for (const p of filtered) {
    const arr = byCategory.get(p.category) ?? [];
    arr.push(p);
    byCategory.set(p.category, arr);
  }
  const categories = Array.from(byCategory.keys()).sort();
  return { filtered, byCategory, categories, kindFiltered };
}

type AgentDrawerApi = ReturnType<typeof useAgentDrawer>;

/**
 * Launch a playbook against a subject. For Pitch Deck Evaluation, resolve an
 * existing Data Room deck (or open the inline upload gate) before any agent
 * turn so Research never gets a clarification artifact.
 */
export async function runPlaybookAgainstSubject(
  drawer: Pick<
    AgentDrawerApi,
    | "run"
    | "requestPitchDeckUpload"
    | "beginPitchDeckLookup"
    | "dismissPitchDeckLookup"
    | "requestKpiBenchmarkFill"
    | "canStartPlaybookRun"
  >,
  subject: PlaybookSubject,
  pb: PlaybookPickerEntry,
) {
  const {
    run,
    requestPitchDeckUpload,
    beginPitchDeckLookup,
    dismissPitchDeckLookup,
    requestKpiBenchmarkFill,
    canStartPlaybookRun,
  } = drawer;

  const needsPrep =
    subject.kind === "company" &&
    (isPitchDeckEvaluationSlug(pb.slug) || isKpiBenchmarkSlug(pb.slug));
  // Credit-gate the prep UI too — a blocked account should get the toast, not
  // an upload / metrics form it can't act on.
  if (needsPrep && !canStartPlaybookRun()) return;

  if (isPitchDeckEvaluationSlug(pb.slug)) {
    // Catalog marks this playbook company-only; skip agent if mis-wired.
    if (subject.kind !== "company") return;

    const playbook = { slug: pb.slug, title: pb.title, content: pb.content };
    beginPitchDeckLookup({
      companyUuid: subject.uuid,
      companyName: subject.name,
      playbook,
    });

    const ids = await fetchCompanyPitchDeckIds(subject.uuid);
    if (!ids) {
      requestPitchDeckUpload({
        companyUuid: subject.uuid,
        companyName: subject.name,
        playbook,
      });
      return;
    }

    dismissPitchDeckLookup();

    const subjectLine = subjectPreamble(subject);
    const linkLabel = subjectLinkLabel(subject);
    const prompt = withSuggestedInitiativesFormat(`${subjectLine}

Follow the playbook's prescribed skill order and output format verbatim. Do NOT ask the user which subject this is for — it is ${linkLabel.display}.

${buildExtractDeckPromptBlock(ids)}

---
${pb.content}
---`);
    const displayPrompt = `Run [${pb.title}](/playbooks/${pb.slug}) against [${linkLabel.display}](${linkLabel.href}).`;
    void run({
      prompt,
      displayPrompt,
      kind: "playbook_run",
      artifactKind: "playbook_run",
      playbookTitle: pb.title,
      subjectCompanyUuid: subject.uuid,
      subjectCompanyName: subject.name,
      companyNameByUuid: { [subject.uuid]: subject.name },
    });
    return;
  }

  if (isKpiBenchmarkSlug(pb.slug)) {
    if (subject.kind !== "company") return;

    const playbook = { slug: pb.slug, title: pb.title, content: pb.content };
    beginPitchDeckLookup({
      companyUuid: subject.uuid,
      companyName: subject.name,
      playbook,
      lookingFor: "Checking whether benchmark numbers are saved…",
    });

    const savedValues = await fetchKpiBenchmarkValues(subject.uuid);
    if (!savedValues || !isKpiBenchmarkComplete(savedValues)) {
      requestKpiBenchmarkFill({
        companyUuid: subject.uuid,
        companyName: subject.name,
        playbook,
        // Carried so the save keeps derived metrics the form doesn't show.
        savedValues: savedValues ?? undefined,
      });
      return;
    }

    dismissPitchDeckLookup();
  }

  const subjectLine = subjectPreamble(subject);
  const linkLabel = subjectLinkLabel(subject);
  const prompt = withSuggestedInitiativesFormat(`${subjectLine}

Follow the playbook's prescribed skill order and output format verbatim. Do NOT ask the user which subject this is for — it is ${linkLabel.display}.

---
${pb.content}
---`);
  const displayPrompt = `Run [${pb.title}](/playbooks/${pb.slug}) against [${linkLabel.display}](${linkLabel.href}).`;
  // Seed the drawer's name cache so every getCompanyObservations/etc. call
  // renders the company name instead of a raw UUID. Portfolio mode passes
  // the full membership; single-company mode passes the one.
  const companyNameByUuid: Record<string, string> =
    subject.kind === "company"
      ? { [subject.uuid]: subject.name }
      : Object.fromEntries(
          subject.companies
            .filter((c) => c.name)
            .map((c) => [c.uuid, c.name as string]),
        );
  void run({
    prompt,
    displayPrompt,
    kind: "playbook_run",
    artifactKind: "playbook_run",
    playbookTitle: pb.title,
    subjectCompanyUuid: subject.kind === "company" ? subject.uuid : undefined,
    subjectCompanyName: subject.kind === "company" ? subject.name : undefined,
    subjectPortfolioName: subject.kind === "portfolio" ? subject.name : undefined,
    // Portfolio runs stay portfolio-scoped (not listed on company Research).
    subjectPortfolioId: subject.kind === "portfolio" ? subject.watchlistId : undefined,
    companyNameByUuid,
  });
}

/**
 * Searchable playbook picker rendered as a small "Playbooks ▾" button
 * that opens a popover listing catalog entries filterable by the
 * subject's kind. Click a row → agent drawer runs that playbook
 * against the subject pre-wired in the prompt (no "which subject?"
 * round-trip).
 */
export function PlaybookPickerButton({
  subject,
  playbooks,
  tourHighlight,
}: {
  subject: PlaybookSubject;
  playbooks: PlaybookPickerEntry[];
  tourHighlight?: boolean;
}) {
  const t = useTheme();
  const drawer = useAgentDrawer();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const { filtered, byCategory, categories, kindFiltered } = filterPlaybooksForSubject(
    playbooks,
    subject,
    query,
  );

  const runPlaybook = (pb: PlaybookPickerEntry) => {
    setOpen(false);
    void runPlaybookAgainstSubject(drawer, subject, pb);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        data-tour-target="playbooks"
        className={tourHighlight ? "fuel-tour-highlight" : undefined}
        onClick={() => setOpen((v) => !v)}
        title="Run a playbook against this subject"
        style={{
          padding: "9px 12px",
          borderRadius: 8,
          border: `1px solid ${t.rule}`,
          background: "transparent",
          color: t.ink,
          fontFamily: t.sans,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        Playbooks <span style={{ color: t.mutedSoft, fontFamily: t.mono, fontSize: 11 }}>▾</span>
      </button>

      {open ? (
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
        />
      ) : null}
    </div>
  );
}

function subjectPreamble(subject: PlaybookSubject): string {
  if (subject.kind === "company") {
    return `Run the selected playbook against ${subject.name} (fuel-data uuid: ${subject.uuid}).`;
  }
  // Portfolio: hand the agent the full membership so it can iterate.
  const memberLines = subject.companies
    .slice(0, 200) // safety cap on prompt size
    .map((c) => `  - ${c.name ?? "(unnamed)"} · ${c.uuid}`)
    .join("\n");
  const suffix =
    subject.companies.length > 200
      ? `\n  … and ${subject.companies.length - 200} more (call listWatchlists / getWatchlist(${subject.watchlistId}) for the full set)`
      : "";
  return `Run the selected playbook against portfolio "${subject.name}"${subject.fundName ? ` (fund: ${subject.fundName})` : ""} — watchlist id ${subject.watchlistId}, ${subject.companies.length} companies in scope:
${memberLines}${suffix}`;
}

function subjectLinkLabel(subject: PlaybookSubject): { display: string; href: string } {
  if (subject.kind === "company") {
    return { display: subject.name, href: `/company/${subject.uuid}` };
  }
  return { display: subject.name, href: `/portfolio/${subject.watchlistId}` };
}

export function PlaybookPickerPanel({
  t,
  query,
  setQuery,
  filtered,
  byCategory,
  categories,
  runPlaybook,
  subject,
  totalCount,
}: {
  t: Theme;
  query: string;
  setQuery: (q: string) => void;
  filtered: PlaybookPickerEntry[];
  byCategory: Map<string, PlaybookPickerEntry[]>;
  categories: string[];
  runPlaybook: (pb: PlaybookPickerEntry) => void;
  subject: PlaybookSubject;
  totalCount: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: 420,
        maxHeight: 520,
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: 10, borderBottom: `1px solid ${t.rule}` }}>
        <input
          autoFocus
          placeholder={`Search ${totalCount} playbook${totalCount === 1 ? "" : "s"}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px",
            background: t.panelAlt,
            color: t.ink,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12.5,
          }}
        />
      </div>
      <div {...dropdownScrollProps(t, { padding: "4px 6px 6px" })}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "12px 10px",
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
            }}
          >
            No playbooks match &quot;{query}&quot;.
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat}>
              <div
                style={{
                  padding: "10px 10px 4px",
                  fontFamily: t.mono,
                  fontSize: 10,
                  color: t.mutedSoft,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {cat}
              </div>
              {byCategory.get(cat)!.map((pb) => (
                <button
                  key={pb.id}
                  type="button"
                  onClick={() => runPlaybook(pb)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: "8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = t.panelAlt)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      color: t.ink,
                    }}
                  >
                    {pb.title}
                    {pb.subcategory ? (
                      <span
                        style={{
                          color: t.mutedSoft,
                          fontWeight: 400,
                          fontSize: 11,
                          marginLeft: 6,
                        }}
                      >
                        · {pb.subcategory}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 11.5,
                      color: t.muted,
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {pb.description}
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
      <div
        style={{
          padding: "8px 10px",
          borderTop: `1px solid ${t.rule}`,
          fontFamily: t.sans,
          fontSize: 11,
          color: t.muted,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          Click to run against{" "}
          {subject.kind === "company" ? subject.name : `portfolio "${subject.name}"`}
        </span>
        <Link
          href="/playbooks"
          style={{ color: t.accent, textDecoration: "none" }}
        >
          Full catalog →
        </Link>
      </div>
    </div>
  );
}
