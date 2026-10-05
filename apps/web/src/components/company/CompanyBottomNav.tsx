"use client";

import type { Theme } from "@/lib/theme";
import type { CompanyPublicNavTabItem, CompanyTabKey } from "@/lib/company-tabs";

function TabIcon({ name, active }: { name: CompanyTabKey; active: boolean }) {
  const stroke = "currentColor";
  const w = active ? 1.9 : 1.6;
  if (name === "overview") {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
          stroke={stroke}
          strokeWidth={w}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "intelligence") {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx={12} cy={12} r={7} stroke={stroke} strokeWidth={w} />
        <circle cx={12} cy={12} r={2.4} stroke={stroke} strokeWidth={w} />
        <path d="M12 5v2.2M12 16.8V19M5 12h2.2M16.8 12H19" stroke={stroke} strokeWidth={w} strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "dataroom") {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 8.5 12 4l9 4.5v3c0 5.2-3.8 8.7-9 10-5.2-1.3-9-4.8-9-10v-3z"
          stroke={stroke}
          strokeWidth={w}
          strokeLinejoin="round"
        />
        <path d="M9 12.2l2 2 4.2-4.4" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "initiatives") {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M8 6h12M8 12h12M8 18h8" stroke={stroke} strokeWidth={w} strokeLinecap="round" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9z" stroke={stroke} strokeWidth={w} />
      <path d="M14 3v6h6" stroke={stroke} strokeWidth={w} />
      <path d="M9 13h6M9 17h4" stroke={stroke} strokeWidth={w} strokeLinecap="round" />
    </svg>
  );
}

export function CompanyBottomNav({
  t,
  items,
  active,
  onChange,
  tourHighlightKey,
  onTourAnchorElChange,
}: {
  t: Theme;
  items: CompanyPublicNavTabItem[];
  active: CompanyTabKey;
  onChange: (key: CompanyTabKey) => void;
  tourHighlightKey?: string | null;
  onTourAnchorElChange?: (el: HTMLButtonElement | null) => void;
}) {
  const selected = active === "profile" ? "overview" : active;
  return (
    <nav
      className="fuel-company-bottom-nav"
      aria-label="Company sections"
      style={{
        background: t.panel,
        borderTop: `1px solid ${t.rule}`,
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}
    >
      {items.map((it) => {
        const isActive = selected === it.key;
        return (
          <button
            key={it.key}
            type="button"
            data-tour-target={it.key}
            aria-current={isActive ? "page" : undefined}
            aria-label={it.count != null ? `${it.label} ${it.count}` : it.label}
            onClick={() => onChange(it.key)}
            ref={tourHighlightKey === it.key ? onTourAnchorElChange : undefined}
            className={tourHighlightKey === it.key ? "fuel-tour-highlight" : undefined}
            style={{
              background: "transparent",
              border: "none",
              color: isActive ? t.ink : t.muted,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              fontFamily: t.sans,
              fontSize: 10,
              fontWeight: isActive ? 700 : 550,
              justifyContent: "center",
              letterSpacing: "-0.01em",
              minWidth: 0,
              padding: "6px 2px 4px",
              position: "relative",
            }}
          >
            <TabIcon name={it.key} active={isActive} />
            <span
              style={{
                display: "block",
                lineHeight: 1.2,
                maxWidth: "100%",
                overflowWrap: "break-word",
                textAlign: "center",
              }}
            >
              {it.label}
            </span>
            {it.count != null && it.count > 0 ? (
              <span
                style={{
                  background: isActive ? t.ink : t.mutedSoft,
                  borderRadius: 99,
                  color: t.panel,
                  fontFamily: t.mono,
                  fontSize: 8,
                  fontWeight: 700,
                  lineHeight: "12px",
                  minWidth: 12,
                  padding: "0 3px",
                  position: "absolute",
                  right: "calc(50% - 18px)",
                  top: 4,
                }}
              >
                {it.count > 99 ? "99+" : it.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
