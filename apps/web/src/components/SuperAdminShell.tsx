"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { THEMES, type Theme, type ThemeMode } from "@/lib/theme";
import { TOUCH_TARGET_MIN, useMobileNav } from "@/lib/responsive";
import { ThemeContext } from "./ThemeContext";
import { ToastProvider } from "./toast/ToastProvider";
import { FuelMark } from "./FuelMark";
import { ADMIN_NAV_GROUPS, resolveAdminLocation, type AdminNavItem } from "./views/adminNav";
import { AdminNavIcon } from "./views/AdminChrome";
import { adminTableCssVars } from "./views/adminStyles";
import { useAdminTableMobileAccordion } from "./views/useAdminTableMobileAccordion";

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

function IconMenu({ open }: { open: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M4.5 4.5 13.5 13.5" />
          <path d="M13.5 4.5 4.5 13.5" />
        </>
      ) : (
        <>
          <path d="M3 5h12" />
          <path d="M3 9h12" />
          <path d="M3 13h12" />
        </>
      )}
    </svg>
  );
}

/** Sun when dark (switch to light); moon when light (switch to dark). */
function ThemeGlyph({ mode }: { mode: ThemeMode }) {
  if (mode === "signal") {
    return (
      <svg
        width={18}
        height={18}
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.55}
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx={9} cy={9} r={3.1} />
        <path d="M9 2.2v1.6M9 14.2v1.6M2.2 9h1.6M14.2 9h1.6M4.15 4.15l1.15 1.15M12.7 12.7l1.15 1.15M12.7 5.3l1.15-1.15M4.15 13.85l1.15-1.15" />
      </svg>
    );
  }
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.55}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15.2 10.35A6.1 6.1 0 0 1 7.65 2.8 6.35 6.35 0 1 0 15.2 10.35Z" />
    </svg>
  );
}

function iconBtnStyle(t: Theme, onCommandInk: boolean): CSSProperties {
  return {
    alignItems: "center",
    background: onCommandInk ? `${t.panel}14` : t.panelAlt,
    border: `1px solid ${onCommandInk ? `${t.panel}33` : t.borderSubtle}`,
    borderRadius: 10,
    boxSizing: "border-box",
    color: onCommandInk ? t.panel : t.inkSoft,
    cursor: "pointer",
    // display comes from `.fuel-admin-shell__icon-btn` / `__menu-btn` CSS so
    // the hamburger can hide at desktop without fighting an inline style.
    flexShrink: 0,
    height: TOUCH_TARGET_MIN,
    justifyContent: "center",
    padding: 0,
    transition: "background-color 140ms ease, border-color 140ms ease, color 140ms ease",
    width: TOUCH_TARGET_MIN,
  };
}

function BackToFuelLink({
  t,
  className,
  onNavigate,
  withBorder,
  onCommandInk,
}: {
  t: Theme;
  className?: string;
  onNavigate?: () => void;
  withBorder?: boolean;
  onCommandInk?: boolean;
}) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={className}
      style={{
        alignItems: "center",
        borderRadius: 8,
        borderTop: withBorder ? `1px solid ${t.rule}` : undefined,
        color: onCommandInk ? `${t.panel}99` : t.muted,
        display: "inline-flex",
        fontFamily: t.sans,
        fontSize: 12.5,
        fontWeight: 550,
        gap: 6,
        marginTop: withBorder ? 8 : undefined,
        minHeight: withBorder ? TOUCH_TARGET_MIN : 36,
        padding: withBorder ? "12px 12px 4px" : "0 8px",
        textDecoration: "none",
        transition: "color 140ms ease, background-color 140ms ease",
      }}
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M8.5 3 4.5 7l4 4" />
      </svg>
      Back to Fuel
    </Link>
  );
}

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/super-admin";
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = usePersistentTheme();
  const t: Theme = { ...THEMES[mode], mode };
  // Used only for scroll-lock / closing drawer when crossing the nav breakpoint.
  // Layout (hamburger, overlay aside) is CSS-driven so a stale hook state cannot
  // leave a 208px sidebar crushing main content on phones.
  const mobileNav = useMobileNav();
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** Optimistic destination so the rail reacts on the first click, not after RSC. */
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  useAdminTableMobileAccordion();

  useEffect(() => {
    setDrawerOpen(false);
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) setDrawerOpen(false);
  }, [mobileNav]);

  useEffect(() => {
    // Class is inert on desktop via CSS; only matters under the nav breakpoint.
    document.body.classList.toggle("fuel-mobile-nav-open", drawerOpen);
    return () => document.body.classList.remove("fuel-mobile-nav-open");
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const location = resolveAdminLocation(pendingHref ?? pathname);
  const onCommandInk = mode === "editorial";
  const headerFg = onCommandInk ? t.panel : t.ink;
  const headerMuted = onCommandInk ? `${t.panel}99` : t.muted;
  const markDeep = onCommandInk ? t.panel : t.ink;
  const activePath = pendingHref ?? pathname;

  const navLink = (item: AdminNavItem) => {
    const active =
      item.href === "/super-admin"
        ? activePath === "/super-admin"
        : activePath.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch
        onClick={(e) => {
          setDrawerOpen(false);
          if (pathname === item.href) return;
          e.preventDefault();
          if (pendingHref === item.href) return;
          // Force a single, optimistic transition — Link soft-nav alone can feel
          // like a missed click while force-dynamic RSC is in flight.
          setPendingHref(item.href);
          window.dispatchEvent(new Event("fuel:nav-start"));
          startTransition(() => {
            router.push(item.href);
          });
        }}
        className={`fuel-admin-shell__nav-link${active ? " is-active" : ""}`}
        style={{
          alignItems: "center",
          background: active ? t.accentTint : "transparent",
          borderRadius: 9,
          boxShadow: active ? `inset 0 0 0 1px ${t.accent}55` : undefined,
          color: active ? t.ink : t.inkSoft,
          display: "flex",
          fontFamily: t.sans,
          fontSize: 13.5,
          fontWeight: active ? 650 : 550,
          gap: 10,
          letterSpacing: active ? "-0.015em" : "-0.005em",
          minHeight: TOUCH_TARGET_MIN,
          padding: "11px 12px",
          textDecoration: "none",
          transition: "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
        }}
      >
        <span
          aria-hidden
          style={{
            color: active ? t.accent : t.muted,
            display: "inline-flex",
            flexShrink: 0,
          }}
        >
          <AdminNavIcon path={item.icon} />
        </span>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <ThemeContext.Provider value={t}>
      <ToastProvider>
        <div
          className="fuel-admin-shell"
          style={{
            ...adminTableCssVars(t),
            background: t.bg,
            color: t.ink,
            display: "flex",
            flexDirection: "column",
            fontFamily: t.sans,
            height: "100dvh",
            maxWidth: "none",
            overflow: "hidden",
            width: "100%",
            ["--admin-nav-hover" as string]: t.borderFaint,
            ["--admin-nav-shadow" as string]: t.borderSubtle,
            ["--admin-overlay" as string]: t.overlay,
            ["--admin-header-fg" as string]: headerFg,
            ["--admin-header-muted" as string]: headerMuted,
          }}
        >
          <header
            className="fuel-admin-shell__header"
            style={{
              alignItems: "center",
              /* Editorial: York ink navy. Signal: panelInner — deeper than page ground so the band reads as tower chrome. */
              background: onCommandInk ? t.ink : t.panelInner,
              borderBottom: `2px solid ${t.accent}`,
              boxShadow: `0 8px 24px ${onCommandInk ? t.borderSubtle : t.borderFaint}`,
              display: "flex",
              flexShrink: 0,
              gap: 12,
              padding:
                "0 max(16px, var(--fuel-safe-right, 0px)) 0 max(16px, var(--fuel-safe-left, 0px))",
              paddingTop: "var(--fuel-safe-top, 0px)",
              position: "relative",
              zIndex: 40,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                flex: 1,
                gap: 12,
                minHeight: 56,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                className="fuel-admin-shell__menu-btn fuel-admin-shell__icon-btn"
                aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={drawerOpen}
                aria-controls="fuel-admin-shell-nav"
                onClick={() => setDrawerOpen((v) => !v)}
                style={iconBtnStyle(t, onCommandInk)}
              >
                <IconMenu open={drawerOpen} />
              </button>

              <div
                className="fuel-admin-shell__brand"
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    alignItems: "center",
                    background: t.accentTint,
                    border: `1px solid ${t.accent}66`,
                    borderRadius: 10,
                    display: "inline-flex",
                    flexShrink: 0,
                    height: 36,
                    justifyContent: "center",
                    width: 36,
                  }}
                >
                  <FuelMark size={18} accent={t.accent} warm={t.warn} deep={markDeep} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="fuel-admin-shell__title"
                    style={{
                      color: headerFg,
                      fontFamily: t.sans,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {location.title}
                  </div>
                  <div
                    style={{
                      color: headerMuted,
                      fontFamily: t.sans,
                      fontSize: 11,
                      fontWeight: 550,
                      letterSpacing: "0.01em",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {location.group ? `Super Admin · ${location.group}` : "Super Admin"}
                  </div>
                </div>
              </div>

              <div
                aria-hidden
                className="fuel-admin-shell__desktop-only"
                style={{
                  background: onCommandInk ? `${t.panel}33` : t.rule,
                  flexShrink: 0,
                  height: 22,
                  width: 1,
                }}
              />
              <BackToFuelLink
                t={t}
                className="fuel-admin-shell__back fuel-admin-shell__desktop-only"
                onCommandInk={onCommandInk}
              />
              <div className="fuel-admin-shell__desktop-only" style={{ flex: 1 }} />
              <div className="fuel-admin-shell__mobile-spacer" />

              <button
                type="button"
                className="fuel-admin-shell__icon-btn"
                onClick={() => setMode(mode === "signal" ? "editorial" : "signal")}
                title={mode === "signal" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={mode === "signal" ? "Switch to light mode" : "Switch to dark mode"}
                style={iconBtnStyle(t, onCommandInk)}
              >
                <ThemeGlyph mode={mode} />
              </button>
            </div>
          </header>

          <div
            className="fuel-admin-shell__body"
            style={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              overflow: "hidden",
              position: "relative",
              width: "100%",
            }}
          >
            <button
              type="button"
              className={`fuel-admin-shell__backdrop${drawerOpen ? " is-open" : ""}`}
              aria-label="Close navigation"
              tabIndex={drawerOpen ? 0 : -1}
              onClick={() => setDrawerOpen(false)}
            />

            <aside
              id="fuel-admin-shell-nav"
              className={`fuel-admin-shell__nav${drawerOpen ? " is-open" : ""}`}
              aria-hidden={mobileNav ? !drawerOpen : undefined}
              style={{
                background: t.panelAlt,
                borderRight: `1px solid ${t.rule}`,
                display: "flex",
                flexDirection: "row",
                flexShrink: 0,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                className="fuel-admin-shell__mast"
                style={{
                  background: t.accent,
                  flexShrink: 0,
                  width: 3,
                }}
              />
              <div
                className="fuel-admin-shell__nav-scroll"
                style={{
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  gap: 8,
                  minWidth: 0,
                  overflowY: "auto",
                  padding: "14px 10px",
                  paddingBottom: "max(16px, var(--fuel-safe-bottom, 0px))",
                }}
              >
                <div
                  className="fuel-admin-shell__nav-rail"
                  style={{ display: "flex", flex: 1, flexDirection: "column", gap: 4 }}
                >
                  {ADMIN_NAV_GROUPS.map((group, groupIndex) => (
                    <div
                      key={group.label}
                      className="fuel-admin-shell__nav-group"
                      style={{
                        borderTop: groupIndex > 0 ? `1px solid ${t.rule}` : undefined,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginTop: groupIndex > 0 ? 8 : 0,
                        paddingTop: groupIndex > 0 ? 14 : 0,
                      }}
                    >
                      <div
                        className="fuel-admin-shell__nav-group-label"
                        style={{
                          color: t.muted,
                          fontFamily: t.mono,
                          fontSize: 10.5,
                          fontWeight: 650,
                          letterSpacing: "0.14em",
                          lineHeight: 1.2,
                          padding: "2px 12px 8px",
                          textTransform: "uppercase",
                          userSelect: "none",
                        }}
                      >
                        {group.label}
                      </div>
                      <nav
                        aria-label={group.label}
                        style={{ display: "flex", flexDirection: "column", gap: 2 }}
                      >
                        {group.items.map(navLink)}
                      </nav>
                    </div>
                  ))}
                </div>

                <BackToFuelLink
                  t={t}
                  className="fuel-admin-shell__back fuel-admin-shell__mobile-only"
                  onNavigate={() => setDrawerOpen(false)}
                  withBorder
                />
              </div>
            </aside>

            <main
              className="fuel-admin-shell__main"
              style={{
                flex: "1 1 auto",
                maxWidth: "none",
                minWidth: 0,
                overflowY: "auto",
                padding:
                  "20px max(12px, var(--fuel-safe-right, 0px)) max(24px, var(--fuel-safe-bottom, 0px)) max(12px, var(--fuel-safe-left, 0px))",
                width: "100%",
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
