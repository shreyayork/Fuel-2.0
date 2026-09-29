"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { THEMES, type Theme, type ThemeMode } from "@/lib/theme";
import { ThemeContext } from "./ThemeContext";
import { ToastProvider } from "./toast/ToastProvider";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function usePersistentTheme(): [ThemeMode, (v: ThemeMode) => void] {
  const [value, setValue] = useState<ThemeMode>("signal");
  useIsoLayoutEffect(() => {
    const stored = window.localStorage.getItem("fuel:theme");
    if (stored === "editorial" || stored === "signal") setValue(stored);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("fuel:theme", value);
  }, [value]);
  return [value, setValue];
}

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: "/super-admin", label: "Overview" },
  { href: "/super-admin/users", label: "Users" },
  { href: "/super-admin/signals", label: "Signals" },
  { href: "/super-admin/cohorts", label: "Cohorts" },
  { href: "/super-admin/playbooks", label: "Playbooks" },
  { href: "/super-admin/credits", label: "Credits" },
  { href: "/super-admin/coupons", label: "Coupons" },
  { href: "/super-admin/service-providers", label: "Service providers" },
  { href: "/super-admin/advisors", label: "Advisors" },
  { href: "/super-admin/chips", label: "Chips management" },
  { href: "/super-admin/faq", label: "Help & FAQ" },
];

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/super-admin";
  const [mode, setMode] = usePersistentTheme();
  const t: Theme = { ...THEMES[mode], mode };

  return (
    <ThemeContext.Provider value={t}>
      <ToastProvider>
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: t.bg,
          color: t.ink,
          fontFamily: t.sans,
        }}
      >
        <header
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 20px",
            borderBottom: `1px solid ${t.rule}`,
            background: t.panel,
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: t.muted,
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
            Back to Fuel
          </Link>
          <div style={{ width: 1, height: 18, background: t.rule }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: t.ink, letterSpacing: 0.3 }}>
            Super Admin
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setMode(mode === "signal" ? "editorial" : "signal")}
            title={mode === "signal" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "transparent",
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 11,
              color: t.muted,
              cursor: "pointer",
              fontFamily: t.sans,
            }}
          >
            {mode === "signal" ? "Light" : "Dark"}
          </button>
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
          }}
        >
          <aside
            style={{
              flexShrink: 0,
              width: 200,
              borderRight: `1px solid ${t.rule}`,
              padding: "14px 10px",
              background: t.panelAlt,
              overflowY: "auto",
            }}
          >
            {NAV.map((item) => {
              const active =
                item.href === "/super-admin"
                  ? pathname === "/super-admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "block",
                    padding: "7px 10px",
                    fontSize: 12,
                    color: active ? t.ink : t.muted,
                    background: active ? t.panel : "transparent",
                    borderRadius: 4,
                    textDecoration: "none",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </aside>
          <main
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
              padding: "24px 32px",
            }}
          >
            {children}
          </main>
        </div>
      </div>
      </ToastProvider>
    </ThemeContext.Provider>
  );
}
