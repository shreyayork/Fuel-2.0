"use client";

import { useState } from "react";
import { ctaPrimaryStyle, type Theme } from "@/lib/theme";
import type { InitiativeYorkHelpSummary } from "@/components/views/CompanyPublicView";
import { useMarketingBannerDismissDays } from "@/components/york-partner/YorkPartnerNudge";
import {
  YORK_HELP_CTA_LABEL,
  YORK_HELP_CTA_URL,
  YORK_HELP_SECTION_TITLE,
  yorkHelpDisplayTitle,
} from "@/lib/york-help/constants";
import {
  drawerSectionCardStyle,
  drawerSectionHeadStyle,
  drawerSectionLabelStyle,
  secondaryBtnStyle,
} from "./styles";

export function YorkHelpPanel({
  t,
  companyUuid,
  initiativeId,
  yorkHelp,
  yorkHelpStatus,
  dismissed,
  onStart,
}: {
  t: Theme;
  companyUuid: string;
  initiativeId: string;
  yorkHelp: InitiativeYorkHelpSummary | null;
  yorkHelpStatus: "idle" | "generating" | "ready" | "failed";
  dismissed: boolean;
  onStart: (fn: () => void | Promise<void>) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dismissHideDays = useMarketingBannerDismissDays();
  if (dismissed) return null;

  const generating = yorkHelpStatus === "generating";
  if (!yorkHelp && !generating) return null;

  const isLight = t.mode === "editorial";

  const dismiss = (mode: "hide" | "forever") => {
    setMenuOpen(false);
    const fd = new FormData();
    fd.set("id", initiativeId);
    fd.set("companyUuid", companyUuid);
    fd.set("mode", mode);
    onStart(async () => {
      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
      await mod.dismissYorkHelpAction(fd);
    });
  };

  return (
    <section style={drawerSectionCardStyle(t)}>
      <div style={drawerSectionHeadStyle(t)}>
        <span style={{ ...drawerSectionLabelStyle(t), color: t.accent }}>
          {yorkHelp?.sectionTitle ?? YORK_HELP_SECTION_TITLE}
        </span>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            aria-label="Dismiss How York IE can help"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((x) => !x)}
            style={{
              ...secondaryBtnStyle(t),
              letterSpacing: "0.12em",
              padding: "2px 8px",
            }}
          >
            ···
          </button>
          {menuOpen ? (
            <div
              style={{
                background: isLight ? t.panel : t.panelAlt,
                border: `1px solid ${t.rule}`,
                borderRadius: 8,
                boxShadow: isLight ? "0 8px 24px rgba(0,0,0,0.08)" : "0 8px 24px rgba(0,0,0,0.35)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: 6,
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                width: 180,
                zIndex: 5,
              }}
            >
              <button
                type="button"
                onClick={() => dismiss("hide")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  color: t.ink,
                  cursor: "pointer",
                  fontFamily: t.sans,
                  fontSize: 12,
                  padding: "8px 10px",
                  textAlign: "left",
                }}
              >
                Hide for {dismissHideDays} day{dismissHideDays === 1 ? "" : "s"}
              </button>
              <button
                type="button"
                onClick={() => dismiss("forever")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  color: t.ink,
                  cursor: "pointer",
                  fontFamily: t.sans,
                  fontSize: 12,
                  padding: "8px 10px",
                  textAlign: "left",
                }}
              >
                Don&apos;t show again
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {generating && !yorkHelp ? (
        <p style={{ color: t.muted, fontSize: 12, margin: 0 }}>
          Generating how York IE can help…
        </p>
      ) : null}

      {yorkHelp ? (
        <>
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {yorkHelp.bullets.map((bullet, index) => (
              <li
                key={`${index}:${bullet.help}`}
                style={{ display: "flex", gap: 10 }}
              >
                <span
                  aria-hidden
                  style={{
                    background: t.accent,
                    borderRadius: 999,
                    flexShrink: 0,
                    height: 7,
                    marginTop: 6,
                    width: 7,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: t.ink, fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
                    {yorkHelpDisplayTitle(bullet.primaryService, bullet.track, bullet.title)}
                  </div>
                  <p
                    style={{
                      color: t.muted,
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      margin: "4px 0 0",
                    }}
                  >
                    {bullet.help}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <a
            href={YORK_HELP_CTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              alignItems: "center",
              ...ctaPrimaryStyle(t),
              borderRadius: 8,
              display: "inline-flex",
              fontFamily: t.sans,
              fontSize: 12.5,
              fontWeight: 700,
              marginTop: 4,
              padding: "9px 14px",
              textDecoration: "none",
              width: "fit-content",
            }}
          >
            {YORK_HELP_CTA_LABEL}
          </a>
        </>
      ) : null}
    </section>
  );
}
