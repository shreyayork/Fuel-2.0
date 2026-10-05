"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRef, useState } from "react";
import { useAgentDrawer } from "../AgentDrawer";
import { Chip, SectionHead } from "../atoms";
import { FuelMark } from "../FuelMark";
import { useTheme } from "../ThemeContext";
import { THEMES } from "@/lib/theme";
import { BenchmarkEditDrawer } from "@/components/company/overview/BenchmarkEditDrawer";
import { OverviewStyleSheet } from "@/components/company/overview/OverviewStyleSheet";
import {
  type PlaybookPickerEntry,
  runPlaybookAgainstSubject,
} from "@/components/views/PlaybookPickerButton";
import { withSuggestedInitiativesFormat } from "@/lib/playbooks/suggested-initiatives-format";
import {
  BENCHMARK_REFRESH_PARAM,
  markBenchmarkRefreshError,
  markBenchmarkRefreshPending,
  markBenchmarkRefreshSaved,
} from "@/lib/overview/client";

export function PlaybookDetail({
  playbook,
  primaryCompany,
}: {
  playbook: {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    category: string;
    subcategory: string | null;
    visibility: string;
    tags: string[] | null;
    targetKind: string | null;
    /** Execution mode — "guided" surfaces the benchmark sidebar CTA for kpi-benchmark. */
    mode?: "chat" | "guided";
    authorEmail: string | null;
    updatedAt: string;
  };
  /** Account primary company — tags Research artifacts + KPI benchmark target. */
  primaryCompany: { uuid: string; name: string } | null;
}) {
  const t = useTheme();
  const router = useRouter();
  const agentDrawer = useAgentDrawer();
  const { open: agentOpen, openDrawer, run } = agentDrawer;
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);
  const agentWasOpenRef = useRef(false);
  const isBenchmarkPlaybook = playbook.slug === "kpi-benchmark";
  const benchmarkCompany = primaryCompany;

  const openBenchmark = () => {
    agentWasOpenRef.current = agentOpen;
    setBenchmarkOpen(true);
  };

  const closeBenchmark = () => {
    setBenchmarkOpen(false);
    if (agentWasOpenRef.current) {
      agentWasOpenRef.current = false;
      openDrawer();
    }
  };

  const runWithAi = () => {
    if (playbook.slug === "kpi-benchmark" && benchmarkCompany) {
      const entry: PlaybookPickerEntry = {
        id: playbook.id,
        slug: playbook.slug,
        title: playbook.title,
        description: playbook.description,
        category: playbook.category,
        subcategory: playbook.subcategory,
        targetKind: playbook.targetKind === "company" || playbook.targetKind === "deal" || playbook.targetKind === "pipeline"
          ? playbook.targetKind
          : null,
        content: playbook.content,
      };
      void runPlaybookAgainstSubject(
        agentDrawer,
        {
          kind: "company",
          uuid: benchmarkCompany.uuid,
          name: benchmarkCompany.name,
        },
        entry,
      );
      return;
    }
    // When primary company is known, wire subject so Research can list the run.
    if (primaryCompany && playbook.targetKind === "company") {
      const entry: PlaybookPickerEntry = {
        id: playbook.id,
        slug: playbook.slug,
        title: playbook.title,
        description: playbook.description,
        category: playbook.category,
        subcategory: playbook.subcategory,
        targetKind: "company",
        content: playbook.content,
      };
      void runPlaybookAgainstSubject(
        agentDrawer,
        {
          kind: "company",
          uuid: primaryCompany.uuid,
          name: primaryCompany.name,
        },
        entry,
      );
      return;
    }
    const subjectHint = primaryCompany
      ? `Use ${primaryCompany.name} (uuid: ${primaryCompany.uuid}) as the subject unless the user names a different company — call getCompany + getCompanyContext before executing.`
      : playbook.targetKind === "company"
        ? "Ask the user which company this run is for if they haven't specified one, then use getCompany + getCompanyContext to pull the relevant data before executing the playbook."
        : "Ask the user what subject / context this run is for, then proceed.";
    const prompt = withSuggestedInitiativesFormat(`Run the "${playbook.title}" playbook. Use its structure verbatim where it prescribes outputs. The playbook content is:

---
${playbook.content}
---

${subjectHint}`);
    const displayPrompt = primaryCompany
      ? `Run the [${playbook.title}](/playbooks/${playbook.slug}) playbook against [${primaryCompany.name}](/company/${primaryCompany.uuid}).`
      : `Run the [${playbook.title}](/playbooks/${playbook.slug}) playbook.`;
    run({
      prompt,
      displayPrompt,
      kind: "playbook_run",
      artifactKind: "playbook_run",
      playbookTitle: playbook.title,
      subjectCompanyUuid: primaryCompany?.uuid,
      subjectCompanyName: primaryCompany?.name,
      companyNameByUuid: primaryCompany
        ? { [primaryCompany.uuid]: primaryCompany.name }
        : undefined,
    });
  };

  return (
    <div>
      {isBenchmarkPlaybook ? <OverviewStyleSheet /> : null}
      {isBenchmarkPlaybook && benchmarkCompany ? (
        <BenchmarkEditDrawer
          open={benchmarkOpen}
          companyUuid={benchmarkCompany.uuid}
          companyName={benchmarkCompany.name}
          includeOverview={false}
          onClose={closeBenchmark}
          onSaveStart={() => {
            // Leave immediately — save + AI regen continue in background.
            markBenchmarkRefreshPending(benchmarkCompany.uuid);
            router.push(
              `/company/${benchmarkCompany.uuid}?tab=intelligence&${BENCHMARK_REFRESH_PARAM}=1`,
            );
          }}
          onSaved={() => {
            markBenchmarkRefreshSaved(benchmarkCompany.uuid);
          }}
          onSaveError={() => {
            markBenchmarkRefreshError(benchmarkCompany.uuid);
          }}
        />
      ) : null}
      <div style={{ marginBottom: 14, fontFamily: t.sans, fontSize: 12.5 }}>
        <Link href="/playbooks" style={{ color: t.muted, textDecoration: "none" }}>
          ← Playbooks
        </Link>
        <span style={{ color: t.mutedSoft, margin: "0 6px" }}>/</span>
        <span style={{ color: t.muted }}>{playbook.category}</span>
        {playbook.subcategory ? (
          <>
            <span style={{ color: t.mutedSoft, margin: "0 6px" }}>/</span>
            <span style={{ color: t.muted }}>{playbook.subcategory}</span>
          </>
        ) : null}
      </div>

      <SectionHead
        t={t}
        title={playbook.title}
        subtitle={playbook.description}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {playbook.visibility === "global" ? (
              <Chip t={t} tone="ghost">global</Chip>
            ) : (
              <Chip t={t} tone="accent">{playbook.visibility}</Chip>
            )}
            {isBenchmarkPlaybook ? (
              <>
                <button
                  type="button"
                  onClick={openBenchmark}
                  disabled={!benchmarkCompany}
                  title={
                    benchmarkCompany
                      ? `Edit benchmark for ${benchmarkCompany.name}`
                      : "Set a primary company before entering benchmark numbers."
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    fontFamily: t.sans,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: THEMES.editorial.ink,
                    background: `linear-gradient(135deg, ${t.accent} 0%, ${THEMES.signal.warn} 100%)`,
                    cursor: benchmarkCompany ? "pointer" : "not-allowed",
                    opacity: benchmarkCompany ? 1 : 0.55,
                  }}
                >
                  <FuelMark
                    size={16}
                    solid
                    accent={THEMES.editorial.ink}
                    warm={THEMES.editorial.ink}
                    deep={THEMES.editorial.ink}
                  />
                  Fill in the numbers
                </button>
                <button
                  onClick={runWithAi}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1px solid ${t.rule}`,
                    fontFamily: t.sans,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: t.ink,
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  title="Open chat for follow-up Q&A — does not submit data."
                >
                  Talk to the agent
                </button>
              </>
            ) : (
              <button
                onClick={runWithAi}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  fontFamily: t.sans,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: THEMES.editorial.ink,
                  background: `linear-gradient(135deg, ${t.accent} 0%, ${THEMES.signal.warn} 100%)`,
                  cursor: "pointer",
                  transition: "transform 120ms ease, filter 200ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLButtonElement).style.filter = "saturate(1.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.filter = "saturate(1)";
                }}
              >
                <FuelMark
                  size={16}
                  solid
                  accent={THEMES.editorial.ink}
                  warm={THEMES.editorial.ink}
                  deep={THEMES.editorial.ink}
                />
                Run with Fuel AI
              </button>
            )}
          </div>
        }
      />

      {playbook.tags && playbook.tags.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {playbook.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: t.mono,
                fontSize: 11,
                color: t.muted,
                padding: "3px 8px",
                background: t.panelAlt,
                borderRadius: 4,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 8, padding: "22px 28px" }}>
        <MarkdownBody content={playbook.content} t={t} />
      </div>

      <div
        style={{
          marginTop: 14,
          fontFamily: t.sans,
          fontSize: 11.5,
          color: t.muted,
          display: "flex",
          gap: 12,
        }}
      >
        {playbook.authorEmail ? <span>by {playbook.authorEmail}</span> : <span>York IE</span>}
        <span>·</span>
        <span>updated {new Date(playbook.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <span>·</span>
        <span style={{ fontFamily: t.mono }}>{playbook.slug}</span>
      </div>
    </div>
  );
}

function MarkdownBody({ content, t }: { content: string; t: ReturnType<typeof useTheme> }) {
  return (
    <>
      <style jsx>{`
        .pb-md { font-family: ${t.sans}; font-size: 14px; line-height: 1.6; color: ${t.ink}; }
        .pb-md :global(*:first-child) { margin-top: 0; }
        .pb-md :global(h1), .pb-md :global(h2), .pb-md :global(h3), .pb-md :global(h4) {
          font-family: ${t.sans};
          letter-spacing: -0.01em;
          font-weight: 600;
          margin: 18px 0 8px;
          color: ${t.ink};
        }
        .pb-md :global(h1) { font-size: 20px; }
        .pb-md :global(h2) { font-size: 17px; }
        .pb-md :global(h3) { font-size: 13px; color: ${t.accent}; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
        .pb-md :global(p) { margin: 0 0 12px; }
        .pb-md :global(ul), .pb-md :global(ol) { margin: 0 0 12px; padding-left: 22px; }
        .pb-md :global(li) { margin: 3px 0; }
        .pb-md :global(strong) { font-weight: 600; }
        .pb-md :global(code) { font-family: ${t.mono}; font-size: 12.5px; background: ${t.panelAlt}; padding: 1px 5px; border-radius: 3px; }
        .pb-md :global(pre) { background: ${t.panelAlt}; border: 1px solid ${t.rule}; border-radius: 6px; padding: 12px 14px; overflow-x: auto; font-family: ${t.mono}; font-size: 12.5px; }
        .pb-md :global(blockquote) { margin: 12px 0; padding: 4px 14px; border-left: 3px solid ${t.accent}; color: ${t.inkSoft}; font-style: italic; }
        .pb-md :global(hr) { border: none; border-top: 1px solid ${t.ruleSoft}; margin: 18px 0; }
      `}</style>
      <div className="pb-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </>
  );
}
