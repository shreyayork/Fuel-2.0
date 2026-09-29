"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { AdvisorWithLinkedCount } from "@/lib/advisors";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import { createAdvisorAction } from "@/app/(app)/advisors/actions";

function button(t: Theme, variant: "primary" | "ghost" = "ghost"): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: variant === "primary" ? t.ink : "transparent",
    color: variant === "primary" ? t.bg : t.inkSoft,
    border: `1px solid ${variant === "primary" ? t.ink : t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function input(t: Theme): React.CSSProperties {
  return {
    padding: "8px 10px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 13,
    width: "100%",
  };
}

export function AdvisorsView({
  advisors,
  userEmail,
}: {
  advisors: AdvisorWithLinkedCount[];
  userEmail: string;
}) {
  const t = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [enhanceState, setEnhanceState] = useState<
    | { kind: "idle" }
    | { kind: "running"; processed: number; total: number; errors: number }
    | { kind: "done"; processed: number; errors: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const runEnhanceAll = async () => {
    if (enhanceState.kind === "running") return;
    setEnhanceState({ kind: "running", processed: 0, total: 0, errors: 0 });
    let processed = 0;
    let errors = 0;
    let total = 0;
    let firstResp = true;
    // Loop until the route reports 0 remaining. Bright Data is rate-limited;
    // we wait briefly between calls so a giant list doesn't 429.
    try {
      while (true) {
        const res = await fetch("/advisors/enhance-all", { method: "POST" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const body = (await res.json()) as {
          processed: number;
          enhanced: unknown[];
          errors: unknown[];
          remaining: number;
        };
        if (firstResp) {
          total = processed + body.remaining + body.processed;
          firstResp = false;
        }
        processed += body.processed;
        errors += body.errors.length;
        setEnhanceState({ kind: "running", processed, total: Math.max(total, processed), errors });
        if (body.remaining === 0) break;
        // Polite spacing between Bright Data calls.
        await new Promise((r) => setTimeout(r, 250));
      }
      setEnhanceState({ kind: "done", processed, errors });
      // Soft refresh so cards show the new photos/titles/etc.
      window.location.reload();
    } catch (e) {
      setEnhanceState({ kind: "error", message: (e as Error).message?.slice(0, 200) ?? "failed" });
    }
  };

  const enhanceLabel = (() => {
    switch (enhanceState.kind) {
      case "idle":
        return "Enhance all (LinkedIn)";
      case "running":
        return `Enhancing… ${enhanceState.processed}/${enhanceState.total}${enhanceState.errors > 0 ? ` · ${enhanceState.errors} errors` : ""}`;
      case "done":
        return `Done · ${enhanceState.processed} enhanced${enhanceState.errors > 0 ? ` · ${enhanceState.errors} errors` : ""}`;
      case "error":
        return `Failed: ${enhanceState.message}`;
    }
  })();

  return (
    <div>
      <SectionHead
        t={t}
        title="Advisors"
        subtitle={`${advisors.length} active`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={runEnhanceAll}
              disabled={enhanceState.kind === "running"}
              style={{
                ...button(t, "ghost"),
                opacity: enhanceState.kind === "running" ? 0.7 : 1,
                cursor: enhanceState.kind === "running" ? "default" : "pointer",
              }}
            >
              {enhanceLabel}
            </button>
            <button onClick={() => setModalOpen(true)} style={button(t, "primary")}>
              + Add advisor
            </button>
          </div>
        }
      />

      {advisors.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            background: t.panel,
            border: `1px solid ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
          }}
        >
          No advisors yet. Click <strong>+ Add advisor</strong> to curate one.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 12,
          }}
        >
          {advisors.map((a) => (
            <AdvisorCard key={a.id} t={t} advisor={a} />
          ))}
        </div>
      )}

      {modalOpen ? <AddAdvisorModal t={t} onClose={() => setModalOpen(false)} /> : null}
    </div>
  );
}

function AdvisorCard({ t, advisor }: { t: Theme; advisor: AdvisorWithLinkedCount }) {
  const initials = advisor.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <Link
      href={`/advisors/${advisor.id}`}
      style={{
        display: "block",
        background: t.panel,
        border: `1px solid ${t.rule}`,
        padding: 16,
        textDecoration: "none",
        color: "inherit",
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {advisor.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={advisor.photoUrl}
            alt={advisor.name}
            referrerPolicy="no-referrer"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              objectFit: "cover",
              background: t.panelAlt,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: t.panelAlt,
              border: `1px solid ${t.rule}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: t.sans,
              fontSize: 14,
              fontWeight: 700,
              color: t.muted,
              flexShrink: 0,
            }}
          >
            {initials || "·"}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 14,
                fontWeight: 600,
                color: t.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {advisor.name}
            </div>
            {advisor.accountId == null ? (
              <Chip t={t} tone="accent">
                Platform
              </Chip>
            ) : null}
          </div>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {advisor.title ?? "—"}
            {advisor.company ? ` · ${advisor.company}` : ""}
          </div>
        </div>
      </div>
      {advisor.expertise && advisor.expertise.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {advisor.expertise.slice(0, 4).map((tag) => (
            <Chip key={tag} t={t} tone="ghost">
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: t.sans,
          fontSize: 11,
          color: t.muted,
        }}
      >
        <span>
          {advisor.linkedCompanyCount} linked {advisor.linkedCompanyCount === 1 ? "company" : "companies"}
        </span>
        {advisor.publicCard ? <Chip t={t} tone="accent">Public card</Chip> : null}
      </div>
    </Link>
  );
}

function AddAdvisorModal({ t, onClose }: { t: Theme; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: 24,
          width: "min(620px, 92vw)",
          maxHeight: "85vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ fontFamily: t.sans, fontSize: 17, fontWeight: 600, color: t.ink }}>Add advisor</div>
          <button onClick={onClose} style={button(t, "ghost")}>
            Close
          </button>
        </div>

        <AdvisorForm
          t={t}
          isPending={isPending}
          onSubmit={(fd) => startTransition(() => createAdvisorAction(fd))}
        />
      </div>
    </div>
  );
}

function AdvisorForm({
  t,
  isPending,
  onSubmit,
}: {
  t: Theme;
  isPending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form action={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
      <Row t={t} label="Name *">
        <input name="name" required style={input(t)} />
      </Row>
      <Row t={t} label="Title">
        <input name="title" style={input(t)} />
      </Row>
      <Row t={t} label="Company">
        <input name="company" style={input(t)} />
      </Row>
      <Row t={t} label="Email">
        <input name="email" type="email" style={input(t)} />
      </Row>
      <Row t={t} label="LinkedIn URL">
        <input name="linkedinUrl" style={input(t)} />
      </Row>
      <Row t={t} label="Photo URL">
        <input name="photoUrl" style={input(t)} />
      </Row>
      <Row t={t} label="Expertise (comma-separated)">
        <input name="expertise" placeholder="GTM, RevOps, Pricing" style={input(t)} />
      </Row>
      <Row t={t} label="Focus industries (comma-separated)">
        <input name="focusIndustries" placeholder="Fintech, Data Infra" style={input(t)} />
      </Row>
      <Row t={t} label="Public card">
        <label style={{ fontFamily: t.sans, fontSize: 13, color: t.inkSoft, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" name="publicCard" /> Allow anonymous viewers at /advisor/&lt;id&gt;/card
        </label>
      </Row>
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={isPending} style={button(t, "primary")}>
          {isPending ? "Saving…" : "Save advisor"}
        </button>
      </div>
    </form>
  );
}

function Row({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "start" }}>
      <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, paddingTop: 8, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
