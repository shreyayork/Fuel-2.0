"use client";

import { useId, useState } from "react";
import type { FaqEntry } from "@/db/schema";
import { FUEL_SUPPORT_EMAIL } from "@/lib/faq-constants";
import type { Theme } from "@/lib/theme";
import { FaqRichText, faqHelpLinkStyle } from "@/components/help/FaqRichText";
import { useTheme } from "../ThemeContext";

export function HelpFaqView({
  rows,
  companyId = null,
}: {
  rows: FaqEntry[];
  /** For `{{company_id}}` FAQ links — recent or primary company UUID. */
  companyId?: string | null;
}) {
  const t = useTheme();
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? null);

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        margin: "0 auto",
        maxWidth: 760,
        padding: "8px 0 40px",
        width: "100%",
        fontFamily: t.sans,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <span
          style={{
            color: t.muted,
            display: "block",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Support
        </span>
        <h1
          id={`${baseId}-title`}
          style={{
            color: t.ink,
            fontSize: 24,
            fontWeight: 750,
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          Help &amp; FAQ
        </h1>
        <p
          style={{
            color: t.inkSoft,
            fontSize: 14,
            lineHeight: 1.55,
            margin: "8px 0 0",
            maxWidth: 520,
          }}
        >
          Quick answers about Fuel’s workspace, AI, benchmarks, and account tools.
        </p>
      </header>

      {rows.length === 0 ? (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 12,
            padding: "28px 20px",
            color: t.muted,
            fontSize: 14,
            lineHeight: 1.55,
            textAlign: "center",
          }}
        >
          No FAQ articles yet. Check back soon, or email <SupportEmailLink t={t} />.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="list">
          {rows.map((item) => {
            const expanded = openId === item.id;
            const panelId = `${baseId}-panel-${item.id}`;
            const buttonId = `${baseId}-btn-${item.id}`;
            return (
              <div
                key={item.id}
                role="listitem"
                style={{
                  background: t.panel,
                  border: `1px solid ${expanded ? `${t.accent}47` : t.rule}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpenId(expanded ? null : item.id)}
                  style={{
                    alignItems: "center",
                    background: "transparent",
                    border: 0,
                    color: t.ink,
                    cursor: "pointer",
                    display: "flex",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                    gap: 12,
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{item.question}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      color: t.muted,
                      flexShrink: 0,
                      transform: expanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.16s ease",
                    }}
                  />
                </button>
                {expanded ? (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    style={{
                      borderTop: `1px solid ${t.rule}`,
                      color: t.inkSoft,
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      padding: "12px 16px 16px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <FaqRichText
                      t={t}
                      value={item.answer}
                      companyId={companyId}
                      as="p"
                      style={{ margin: 0, whiteSpace: "pre-wrap" }}
                    />
                    {item.points?.length ? (
                      <ul
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 9,
                          listStyle: "none",
                          margin: "12px 0 0",
                          padding: 0,
                        }}
                      >
                        {item.points.map((point, index) => (
                          <li
                            key={`${item.id}-${index}`}
                            style={{ paddingLeft: 15, position: "relative" }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                background: t.accent,
                                borderRadius: "50%",
                                height: 5,
                                left: 1,
                                opacity: 0.8,
                                position: "absolute",
                                top: 7,
                                width: 5,
                              }}
                            />
                            <span style={{ color: t.ink, fontWeight: 650 }}>
                              <FaqRichText t={t} value={point.label} companyId={companyId} />
                            </span>
                            {point.body ? (
                              <>
                                {" — "}
                                <FaqRichText t={t} value={point.body} companyId={companyId} />
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.footnote ? (
                      <FaqRichText
                        t={t}
                        value={item.footnote}
                        companyId={companyId}
                        as="p"
                        style={{ color: t.muted, margin: "12px 0 0", whiteSpace: "pre-wrap" }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <footer style={{ color: t.muted, fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>
        Still stuck? Email the team at <SupportEmailLink t={t} />.
      </footer>
    </section>
  );
}

function SupportEmailLink({ t }: { t: Theme }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={`mailto:${FUEL_SUPPORT_EMAIL}`}
      style={faqHelpLinkStyle(t, hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {FUEL_SUPPORT_EMAIL}
    </a>
  );
}

function ChevronDown({
  size,
  style,
}: {
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={style}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
