"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useThemeOrSignal } from "@/components/ThemeContext";
import { onAccentText, panelCardSurface } from "@/lib/theme";

/**
 * Right-rail "agent worklog" panel. The pattern: main column carries the
 * action (form, decision, content); side panel transparently shows what
 * the AI did to assemble it — sources called, fields extracted, cost.
 *
 *   <MagicSidePanel title="What the agent did">
 *     <MagicSidePanelStep status="done" label="Scanned homepage" detail="11,800 chars" />
 *     <MagicSidePanelStep status="done" label="LinkedIn" detail="44 employees" />
 *     <MagicSidePanelStep status="running" label="Reading details into a profile" />
 *   </MagicSidePanel>
 */
export function MagicSidePanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useThemeOrSignal();
  const surface = panelCardSurface(t);

  return (
    <aside
      className="magic-side-panel"
      style={{
        background: surface.background,
        border: surface.border,
        borderRadius: 14,
        padding: 22,
      }}
    >
      <style>{`
        .magic-side-panel { position: sticky; top: 24px; }
        @media (max-width: 1180px) {
          .magic-side-panel { position: static; }
        }
      `}</style>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: t.accent,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: t.muted,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      ) : (
        <div style={{ height: 12 }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </aside>
  );
}

export interface MagicSidePanelStepProps {
  status: "pending" | "running" | "done" | "error";
  label: string;
  /** Small attribution / count under the label, e.g. "44 employees". */
  detail?: string;
  /** Optional sub-source chip like "Bright Data". */
  source?: string;
}

export function MagicSidePanelStep({
  status,
  label,
  detail,
}: MagicSidePanelStepProps) {
  const t = useThemeOrSignal();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <StepIcon status={status} />
      <div>
        <div
          style={{
            fontSize: 13,
            color:
              status === "done" || status === "running"
                ? t.ink
                : status === "error"
                  ? t.negative
                  : t.muted,
            fontWeight: status === "running" ? 500 : 400,
            lineHeight: 1.35,
          }}
        >
          {label}
        </div>
        {detail ? (
          <div
            style={{
              marginTop: 3,
              fontSize: 11.5,
              color: t.muted,
              fontFamily: t.mono,
              lineHeight: 1.4,
            }}
          >
            {detail}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function StepIcon({ status }: { status: MagicSidePanelStepProps["status"] }) {
  const t = useThemeOrSignal();

  if (status === "done") {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: t.accent,
          color: onAccentText(t),
          fontSize: 11,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        ✓
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          border: `2px solid ${t.accent}`,
          borderTopColor: "transparent",
          display: "inline-block",
          marginTop: 3,
          animation: "fuel-spin 0.9s linear infinite",
        }}
      >
        <style>{`@keyframes fuel-spin { to { transform: rotate(360deg); } }`}</style>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: `${t.negative}2E`,
          color: t.negative,
          fontSize: 12,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
          border: `1px solid ${t.negative}80`,
        }}
      >
        !
      </span>
    );
  }
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 999,
        border: `1px dashed ${t.mutedSoft}`,
        display: "inline-block",
        flexShrink: 0,
        marginTop: 1,
      }}
    />
  );
}
