"use client";

import Link from "next/link";
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import type { Theme, ThemeMode } from "@/lib/theme";
import type { FuelDataset } from "@/lib/types";
import { useBreadcrumbTrail } from "./BreadcrumbContext";
import { useAgentDrawer } from "./AgentDrawer";
import { FuelMark } from "./FuelMark";
import { Avatar, Logo } from "./atoms";
import { CompanySearch } from "./CompanySearch";
import { useSidebarCounts } from "./SidebarCountsProvider";
import { CreditBlockBanner } from "./credits/CreditBlockBanner";
import { CreditCancelBanner } from "./credits/CreditCancelBanner";
import { switchActiveAccountAction } from "@/app/(app)/account/switch/actions";
import { useWorkspaceTourOptional } from "./workspace-tour/WorkspaceTourContext";
import { TourHeaderControl } from "./workspace-tour/TourHeaderCoachmark";
import { CreditIndicator } from "./credits/CreditIndicator";
import { YorkPartnerStyleSheet } from "./york-partner/YorkPartnerStyleSheet";
import { SidebarYorkPartnerSlot } from "./york-partner/SidebarYorkPartnerSlot";
import { BrandMark } from "./marketing/BrandMark";
import { TOUCH_TARGET_MIN, useMobileNav } from "@/lib/responsive";

/** Flip to `true` to restore pin/hover collapse UI. */
const SIDEBAR_COLLAPSE_ENABLED = false;

/** Flip to `true` to restore Initiatives in the left sidebar (F20A-188). */
const INITIATIVES_NAV_ENABLED = false;

type NavItem = { key: string; label: string; count?: number; flag?: string };
type NavGroup = { label?: string; items: NavItem[] };

// Line-icon glyphs for collapsed-sidebar mode. Size-agnostic (16px viewbox
// scaled via props) and inherit currentColor.
const NAV_ICONS: Record<string, ReactElement> = {
  watchlists: icon("M4 5h12M4 9h12M4 13h8"),
  pipeline: icon("M3 5h4v10H3zM9 5h4v10H9zM15 5h4v10h-4z"),
  portfolio: icon("M3 7h14v8H3zM7 7V5h6v2"),
  engage: icon("M5 11l3-3 3 3 5-5M14 6h3v3"),
  benchmarks: icon("M3 16V9M8 16V5M13 16v-6M18 16v-3"),
  playbooks: icon("M4 3h9l3 3v11H4z M4 7h9"),
  advisors: icon("M10 9a3 3 0 100-6 3 3 0 000 6zM4 17c0-3 3-5 6-5s6 2 6 5"),
  providers: icon("M4 8h12l-1.5 8h-9zM8 8V5h4v3"),
  investors: icon("M3 15l4-6 3 4 4-7 3 5"),
  profile: icon(
    "M10 11a4 4 0 100-8 4 4 0 000 8zM3 18c0-3.5 3.1-6 7-6s7 2.5 7 6",
  ),
  account: icon("M10 3l8 4v5c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z"),
  "co-home": icon("M3 9l7-6 7 6v8H3z M8 17v-5h4v5"),
  "co-benchmarks": icon("M3 16V9M8 16V5M13 16v-6M18 16v-3"),
  "co-assessment": icon("M5 3h10l2 2v12H5zM8 8h6M8 12h6"),
  "co-actions": icon("M4 5l2 2 4-4 M4 11l2 2 4-4 M13 7h4 M13 13h4"),
  "co-playbooks": icon("M4 3h9l3 3v11H4z M4 7h9"),
  "co-dataroom": icon("M3 6h6l2 2h6v8H3z"),
  "co-team": icon(
    "M7 9a3 3 0 100-6 3 3 0 000 6zM13 10a2 2 0 100-4 2 2 0 000 4zM1 17c0-2.8 2.6-5 6-5s6 2.2 6 5M14 17v-1c0-1.5 1-3 3-3",
  ),
};

function icon(path: string): ReactElement {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export interface SidebarUser {
  email: string;
  name?: string;
  initials: string;
}

export interface SidebarCounts {
  advisors?: number;
  serviceProviders?: number;
  investors?: number;
}

export interface AccountOption {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  memberCount: number;
}

export const SUPER_ADMIN_GROUP_NAME = "super-admin";

export function Shell({
  t,
  mode,
  setMode,
  page,
  setPage,
  children,
  eyebrow,
  data,
  onOpenCo,
  recentCompanies = [],
  onOpenRecent,
  currentUser,
  counts = {},
  groups: sessionGroups = [],
  accountList = [],
  activeAccountId = null,
  activeAccountName = null,
  portfolioManagerEnabled = false,
  navPending = false,
}: {
  t: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  page: string;
  setPage: (p: string) => void;
  children: ReactNode;
  eyebrow?: string;
  data: FuelDataset;
  onOpenCo: (co: FuelDataset["companies"][number]) => void;
  recentCompanies?: Array<{
    uuid: string;
    name: string;
    domain?: string;
    logoUrl?: string;
  }>;
  onOpenRecent?: (uuid: string) => void;
  currentUser?: SidebarUser | null;
  counts?: SidebarCounts;
  /** Cognito groups the current user belongs to — controls the Super Admin nav. */
  groups?: string[];
  /** All accounts this user is a member of — drives the account switcher. */
  accountList?: AccountOption[];
  activeAccountId?: string | null;
  activeAccountName?: string | null;
  /** Account-wide setting — gates Pipeline + Portfolio nav items. */
  portfolioManagerEnabled?: boolean;
  /** True while AppShell is transitioning to a new route. */
  navPending?: boolean;
}) {
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const router = useRouter();
  const tour = useWorkspaceTourOptional();
  const integrationsTourActive = tour?.activeTarget === "integrations";
  const sidebarCounts = useSidebarCounts();
  const networkCounts =
    counts.advisors != null ||
    counts.investors != null ||
    counts.serviceProviders != null
      ? counts
      : sidebarCounts;

  // Pipeline + Portfolio are gated on the account's portfolio_manager_enabled
  // flag (toggled in /account/settings). All other nav items are universal.
  const researchItems: NavItem[] = [{ key: "watchlists", label: "Watchlists" }];
  if (portfolioManagerEnabled) {
    researchItems.push({
      key: "pipeline",
      label: "Pipeline",
      count: data.companies.filter((c) => c.list === "pipeline").length,
    });
  }
  const groups: NavGroup[] = [
    { label: "Research", items: researchItems },
    ...(portfolioManagerEnabled
      ? [
          {
            label: "Portfolio",
            items: [{ key: "portfolio", label: "Portfolios" }],
          } satisfies NavGroup,
        ]
      : []),
    {
      label: "Value creation",
      items: [
        // TEMP: Initiatives nav hidden pending product planning (F20A-188).
        // Route `/initiatives` and company Initiatives tab stay available.
        ...(INITIATIVES_NAV_ENABLED && portfolioManagerEnabled
          ? [
              {
                key: "engage",
                label: "Initiatives",
                count: data.initiatives.length,
              },
            ]
          : []),
        { key: "benchmarks", label: "Benchmarks" },
        { key: "playbooks", label: "Playbooks" },
      ],
    },
    {
      label: "Network",
      items: [
        {
          key: "advisors",
          label: "Advisors",
          count: networkCounts.advisors ?? 0,
        },
        {
          key: "providers",
          label: "Service providers",
          count: networkCounts.serviceProviders ?? 0,
        },
        {
          key: "investors",
          label: "Investors",
          count: networkCounts.investors ?? 0,
        },
      ],
    },
  ];
  const isSuperAdmin = sessionGroups.includes(SUPER_ADMIN_GROUP_NAME);

  const [sidebarHover, setSidebarHover] = useState(false);
  // Default pinned; user can explicitly unpin by setting the storage key to "0".
  // TEMP: collapse UI disabled via SIDEBAR_COLLAPSE_ENABLED — force expanded.
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const mobileNav = useMobileNav();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!SIDEBAR_COLLAPSE_ENABLED) return;
    const stored = window.localStorage.getItem("fuel:sidebarPinned");
    if (stored === "0") setSidebarPinned(false);
  }, []);

  // Close overlay nav on route change / when resizing up to desktop.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) setMobileNavOpen(false);
  }, [mobileNav]);

  useEffect(() => {
    document.body.classList.toggle("fuel-mobile-nav-open", mobileNavOpen);
    return () => document.body.classList.remove("fuel-mobile-nav-open");
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const togglePinned = () => {
    setSidebarPinned((v) => {
      const next = !v;
      window.localStorage.setItem("fuel:sidebarPinned", next ? "1" : "0");
      return next;
    });
  };
  // Mobile overlay always shows labels; desktop respects collapse flag.
  const sidebarExpanded = mobileNav
    ? true
    : SIDEBAR_COLLAPSE_ENABLED
      ? sidebarPinned || sidebarHover
      : true;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuWrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [userMenuStyle, setUserMenuStyle] = useState<CSSProperties | null>(null);

  const updateUserMenuPosition = useCallback(() => {
    const anchor = userMenuWrapRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    // Match design: sit above trigger, slightly wider than foot (`+ 8`), min 220.
    const minWidth = 220;
    setUserMenuStyle({
      position: "fixed",
      left: rect.left,
      top: rect.top - 8,
      width: Math.max(rect.width + 8, minWidth),
      transform: "translateY(-100%)",
      // Below guided-tour overlay (140) while spotlighting Integrations so the
      // clip-path hole reveals the menu — same idea as AiActionsMenu.
      zIndex: integrationsTourActive ? 130 : 2050,
    });
  }, [integrationsTourActive]);

  const menuOpen = userMenuOpen || integrationsTourActive;
  const wasIntegrationsTourRef = useRef(false);

  useEffect(() => {
    if (integrationsTourActive) {
      wasIntegrationsTourRef.current = true;
      setUserMenuOpen(true);
      return;
    }
    if (wasIntegrationsTourRef.current) {
      wasIntegrationsTourRef.current = false;
      setUserMenuOpen(false);
    }
  }, [integrationsTourActive]);

  useEffect(() => {
    if (!menuOpen) {
      setUserMenuStyle(null);
      return;
    }
    updateUserMenuPosition();
    window.addEventListener("resize", updateUserMenuPosition);
    window.addEventListener("scroll", updateUserMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateUserMenuPosition);
      window.removeEventListener("scroll", updateUserMenuPosition, true);
    };
  }, [menuOpen, updateUserMenuPosition]);

  useEffect(() => {
    if (!menuOpen) return;
    if (integrationsTourActive) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuWrapRef.current?.contains(target)) return;
      if (userMenuRef.current?.contains(target)) return;
      setUserMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, integrationsTourActive]);

  // Publish width to CSS var so the outer grid tracks it.
  // Mobile overlay nav does not reserve a column — drawer sits above content.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      mobileNav ? "0px" : sidebarExpanded ? "220px" : "60px",
    );
  }, [sidebarExpanded, mobileNav]);

  // App-wide gradient backdrop. Same recipe the marketing landing +
  // onboarding use so the journey feels visually continuous from
  // /sign-in → /onboard → /company/[uuid]. Only applied in the dark
  // (`signal`) palette; the light palette stays flat.
  const appBackground =
    mode === "signal"
      ? "radial-gradient(ellipse at top, #142535 0%, #0F1A24 45%, #0B141C 100%)"
      : t.bg;

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: appBackground,
        color: t.ink,
        display: "grid",
        // `minmax(0, 1fr)` — a bare `1fr` is shorthand for `minmax(auto, 1fr)`,
        // which means the column refuses to shrink below its content's
        // intrinsic min-content width. If any descendant of <main> has a
        // wide intrinsic min (a long unbroken URL, a pre-formatted block,
        // a wide flex row without min-width:0) the 1fr track grows past
        // the viewport, pushing the breadcrumb + buttons off-screen and
        // leaving a gap along the right edge. `minmax(0, …)` lets the
        // column shrink freely so <main>'s own maxWidth + inner overflow
        // scroll actually contain things.
        gridTemplateColumns: mobileNav
          ? "minmax(0, 1fr)"
          : "var(--sidebar-width, 60px) minmax(0, 1fr)",
        fontFamily: t.sans,
        paddingRight: "var(--drawer-width, 0px)",
        paddingLeft: "var(--fuel-safe-left, 0px)",
        transition:
          "padding-right 260ms cubic-bezier(0.22, 0.61, 0.36, 1), grid-template-columns 180ms cubic-bezier(0.22, 0.61, 0.36, 1)",
      }}
    >
      <YorkPartnerStyleSheet t={t} />
      {mobileNav && mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileNav}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1190,
            border: "none",
            padding: 0,
            margin: 0,
            background: t.overlay,
            cursor: "pointer",
          }}
        />
      ) : null}
      <aside
        id="fuel-app-nav"
        aria-hidden={mobileNav ? !mobileNavOpen : undefined}
        onMouseEnter={() => {
          if (SIDEBAR_COLLAPSE_ENABLED && !mobileNav) setSidebarHover(true);
        }}
        onMouseLeave={() => {
          if (SIDEBAR_COLLAPSE_ENABLED && !mobileNav) setSidebarHover(false);
        }}
        style={{
          background: t.panel,
          borderRight: `1px solid ${t.rule}`,
          display: "flex",
          flexDirection: "column",
          position: mobileNav ? "fixed" : "sticky",
          top: 0,
          left: 0,
          height: "100dvh",
          maxHeight: "100dvh",
          width: mobileNav ? "min(300px, calc(100vw - 48px))" : undefined,
          paddingTop: "var(--fuel-safe-top, 0px)",
          paddingBottom: "var(--fuel-safe-bottom, 0px)",
          paddingLeft: mobileNav ? "var(--fuel-safe-left, 0px)" : undefined,
          overflow: "hidden",
          zIndex: mobileNav ? 1200 : undefined,
          transform: mobileNav
            ? mobileNavOpen
              ? "translateX(0)"
              : "translateX(-105%)"
            : undefined,
          visibility: mobileNav && !mobileNavOpen ? "hidden" : undefined,
          pointerEvents: mobileNav && !mobileNavOpen ? "none" : undefined,
          transition: mobileNav
            ? "transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)"
            : "width 180ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          boxShadow:
            mobileNav && mobileNavOpen
              ? "8px 0 32px rgba(0,0,0,0.28)"
              : undefined,
        }}
      >
        <div
          style={{
            padding: "18px 16px 16px",
            borderBottom: `1px solid ${t.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          <BrandMark
            size={28}
            color={t.accent}
            ink={t.ink}
            muted={t.muted}
            fontFamily={t.sans}
          />
          {mobileNav ? (
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMobileNav}
              style={{
                marginLeft: "auto",
                width: TOUCH_TARGET_MIN,
                height: TOUCH_TARGET_MIN,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${t.rule}`,
                borderRadius: 8,
                background: "transparent",
                color: t.ink,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          ) : null}
        </div>

        {activeAccountName && accountList.length > 0 ? (
          <div
            style={{
              padding: "10px 10px 8px",
              borderBottom: `1px solid ${t.rule}`,
              position: "relative",
            }}
          >
            <button
              onClick={() => {
                // One-account users: clicking the button takes them to
                // their workspace home — for CM-mode founders that's the
                // FounderOverview at /company/[uuid]; for PM-mode that's
                // the dashboard. Either way `/` does the right routing.
                // Multi-account users: open the switcher dropdown.
                if (accountList.length > 1) {
                  setAccountPickerOpen((v) => !v);
                } else {
                  router.push("/");
                }
              }}
              title={sidebarExpanded ? activeAccountName : activeAccountName}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 10px",
                background: accountPickerOpen ? t.panelAlt : "transparent",
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: t.sans,
                color: t.ink,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  width: 18,
                  height: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  background: t.accent,
                  color: t.bg,
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {activeAccountName.slice(0, 1).toUpperCase()}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  opacity: sidebarExpanded ? 1 : 0,
                  transition: "opacity 140ms ease",
                }}
              >
                {activeAccountName}
              </span>
              {accountList.length > 1 && sidebarExpanded ? (
                <span style={{ color: t.muted, flexShrink: 0 }}>
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 4l3 3 3-3" />
                  </svg>
                </span>
              ) : null}
            </button>
            {accountPickerOpen && accountList.length > 1 ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% - 4px)",
                  left: 10,
                  right: 10,
                  background: t.panel,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 6,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
                  zIndex: 50,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {accountList.map((a) => {
                  const isActive = a.id === activeAccountId;
                  return (
                    // NOTE: don't attach onClick to the form — it synchronously
                    // unmounts the form (via setState) before the browser
                    // dispatches the submit event, which silently kills the
                    // server action. The action's redirect("/") naturally
                    // closes the picker by remounting the shell.
                    <form key={a.id} action={switchActiveAccountAction}>
                      <input type="hidden" name="accountId" value={a.id} />
                      <button
                        type="submit"
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          background: isActive ? t.accentSoft : "transparent",
                          border: "none",
                          borderBottom: `1px solid ${t.ruleSoft}`,
                          cursor: isActive ? "default" : "pointer",
                          fontFamily: t.sans,
                        }}
                        disabled={isActive}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: isActive ? t.accent : t.ink,
                          }}
                        >
                          {a.name}
                        </div>
                        <div
                          style={{ fontSize: 10, color: t.muted, marginTop: 2 }}
                        >
                          {a.role} · {a.memberCount} member
                          {a.memberCount === 1 ? "" : "s"}
                        </div>
                      </button>
                    </form>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ padding: "14px 10px", flex: 1, overflowY: "auto" }}>
          {groups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 14 }}>
              {g.label ? (
                <div
                  style={{
                    fontFamily: t.sans,
                    fontSize: 11,
                    fontWeight: 500,
                    color: t.muted,
                    padding: "8px 10px 6px",
                    opacity: sidebarExpanded ? 1 : 0,
                    transition: "opacity 140ms ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {g.label}
                </div>
              ) : null}
              {g.items.map((n) => {
                const isActive = page === n.key;
                const ic = NAV_ICONS[n.key];
                return (
                  <button
                    key={n.key}
                    onClick={() => {
                      setPage(n.key);
                      if (mobileNav) closeMobileNav();
                    }}
                    title={sidebarExpanded ? undefined : n.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? t.panelAlt : "transparent",
                      padding: mobileNav ? "12px 10px" : "7px 10px",
                      minHeight: mobileNav ? TOUCH_TARGET_MIN : undefined,
                      borderRadius: 6,
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? t.ink : t.inkSoft,
                      letterSpacing: "-0.005em",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        width: 16,
                        height: 16,
                        color: isActive ? t.accent : t.muted,
                      }}
                    >
                      {ic}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        opacity: sidebarExpanded ? 1 : 0,
                        transition: "opacity 140ms ease",
                      }}
                    >
                      {n.label}
                    </span>
                    {sidebarExpanded && n.count != null ? (
                      <span
                        style={{
                          fontFamily: t.mono,
                          fontSize: 11,
                          color: t.muted,
                          fontWeight: 400,
                          flexShrink: 0,
                        }}
                      >
                        {n.count}
                      </span>
                    ) : sidebarExpanded && n.flag ? (
                      <span
                        style={{
                          fontSize: 11,
                          color: t.warn,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {n.flag}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}

          {recentCompanies.length > 0 && sidebarExpanded ? (
            <div>
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  color: t.muted,
                  padding: "8px 10px 6px",
                  opacity: sidebarExpanded ? 1 : 0,
                  transition: "opacity 140ms ease",
                  whiteSpace: "nowrap",
                }}
              >
                Recently viewed
              </div>
              {recentCompanies.slice(0, 8).map((c) => {
                const initials =
                  c.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? "")
                    .join("") || "·";
                return (
                  <div
                    key={c.uuid}
                    onClick={() => {
                      onOpenRecent?.(c.uuid);
                      if (mobileNav) closeMobileNav();
                    }}
                    title={c.domain ?? c.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: mobileNav ? "10px 10px" : "5px 10px",
                      minHeight: mobileNav ? TOUCH_TARGET_MIN : undefined,
                      cursor: "pointer",
                      fontSize: 12.5,
                      color: t.inkSoft,
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        t.panelAlt;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "transparent";
                    }}
                  >
                    <Logo
                      t={t}
                      co={{
                        logo: initials,
                        name: c.name,
                        uuid: c.uuid,
                        logoUrl: c.logoUrl,
                      }}
                      size={20}
                    />
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: sidebarExpanded ? 1 : 0,
                        transition: "opacity 140ms ease",
                      }}
                    >
                      {c.name}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: 10,
            borderTop: `1px solid ${t.rule}`,
            position: "relative",
          }}
        >
          <SidebarYorkPartnerSlot
            expanded={sidebarExpanded}
            firstName={currentUser?.name?.split(/\s+/)[0]}
          />
          <CreditIndicator />
          <div ref={userMenuWrapRef} style={{ position: "relative", width: "100%" }}>
            {menuOpen && userMenuStyle && typeof document !== "undefined"
              ? createPortal(
                  <div
                    ref={userMenuRef}
                    role="menu"
                    aria-label="User menu"
                    style={{
                      ...userMenuStyle,
                      background: t.panel,
                      border: `1px solid ${t.rule}`,
                      borderRadius: 12,
                      overflow: "hidden",
                      padding: "6px 0",
                      boxShadow: `0 12px 32px ${t.overlay}`,
                      display: "flex",
                      flexDirection: "column",
                      fontFamily: t.sans,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        padding: "10px 14px 12px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: t.ink,
                          lineHeight: 1.25,
                        }}
                      >
                        {currentUser?.name ??
                          currentUser?.email ??
                          data.people[0]?.name ??
                          "Account"}
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {currentUser?.email ?? activeAccountName ?? ""}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 6px" }}>
                      <UserMenuItem
                        t={t}
                        onClick={() => {
                          if (integrationsTourActive) return;
                          setUserMenuOpen(false);
                          setPage("profile");
                        }}
                      >
                        <UserMenuIcon t={t}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
                            <path
                              d="M5.6 9.9a2.5 2.5 0 0 1 4.8 0M8 7.4a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7Z"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </UserMenuIcon>
                        <span style={{ flex: 1, minWidth: 0 }}>Account settings</span>
                      </UserMenuItem>

                      <UserMenuItem
                        t={t}
                        onClick={() =>
                          setMode(mode === "signal" ? "editorial" : "signal")
                        }
                      >
                        <UserMenuIcon t={t}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M8 2.75v10.5A5.25 5.25 0 0 0 8 2.75Z" fill="currentColor" />
                          </svg>
                        </UserMenuIcon>
                        <span style={{ flex: 1, minWidth: 0 }}>Appearance</span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 12,
                            fontWeight: 500,
                            color: t.muted,
                          }}
                        >
                          {mode === "signal" ? "Dark" : "Light"}
                        </span>
                      </UserMenuItem>

                      <div
                        data-tour-target="integrations"
                        className={
                          integrationsTourActive ? "fuel-tour-highlight" : undefined
                        }
                      >
                        <UserMenuItem
                          t={t}
                          href="/account/integrations"
                          onClick={() => {
                            if (integrationsTourActive) return;
                            setUserMenuOpen(false);
                          }}
                        >
                          <UserMenuIcon t={t}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M6.5 3.5 4.2 5.8a2.3 2.3 0 0 0 3.25 3.25L9.5 7"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M9.5 12.5 11.8 10.2a2.3 2.3 0 0 0-3.25-3.25L6.5 9"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </UserMenuIcon>
                          <span style={{ flex: 1, minWidth: 0 }}>Integrations</span>
                        </UserMenuItem>
                      </div>
                    </div>

                    <div
                      role="separator"
                      style={{
                        height: 1,
                        width: "100%",
                        background: t.rule,
                        margin: "6px 0",
                      }}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 6px" }}>
                      <UserMenuItem
                        t={t}
                        href="/help"
                        onClick={() => {
                          if (integrationsTourActive) return;
                          setUserMenuOpen(false);
                        }}
                      >
                        <UserMenuIcon t={t}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle
                              cx="8"
                              cy="8"
                              r="5.25"
                              stroke="currentColor"
                              strokeWidth="1.4"
                            />
                            <path
                              d="M6.6 6.4a1.5 1.5 0 1 1 2.2 1.3c-.5.3-.8.6-.8 1.2M8 11.1h.01"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </UserMenuIcon>
                        <span style={{ flex: 1, minWidth: 0 }}>Help / FAQ</span>
                      </UserMenuItem>
                    </div>

                    <div
                      role="separator"
                      style={{
                        height: 1,
                        width: "100%",
                        background: t.rule,
                        margin: "6px 0",
                      }}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 6px 6px" }}>
                      <UserMenuItem
                        t={t}
                        href="/sign-out"
                        onClick={() => {
                          if (integrationsTourActive) return;
                          setUserMenuOpen(false);
                        }}
                      >
                        <UserMenuIcon t={t}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                            <path
                              d="M10.5 5.5 13 8l-2.5 2.5M6.5 8H13"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </UserMenuIcon>
                        <span style={{ flex: 1, minWidth: 0 }}>Log out</span>
                      </UserMenuItem>
                    </div>
                  </div>,
                  document.body,
                )
              : null}

            <button
              type="button"
              aria-label="Open user menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => {
                if (integrationsTourActive) return;
                setUserMenuOpen((open) => !open);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                cursor: "pointer",
                padding: "8px 4px",
                borderRadius: 8,
                border: `1px solid ${menuOpen ? t.rule : "transparent"}`,
                background: menuOpen ? t.panelInner : "transparent",
                fontFamily: t.sans,
                textAlign: "left",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {currentUser ? (
                <Avatar
                  t={t}
                  person={{
                    name: currentUser.name ?? currentUser.email,
                    avatar: currentUser.initials,
                  }}
                  size={28}
                />
              ) : data.people[0] ? (
                <Avatar t={t} person={data.people[0]} size={28} />
              ) : null}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  opacity: sidebarExpanded ? 1 : 0,
                  transition: "opacity 140ms ease",
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: t.ink,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentUser?.name ??
                    currentUser?.email ??
                    data.people[0]?.name ??
                    ""}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: t.muted,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentUser?.email ?? activeAccountName ?? ""}
                </div>
              </div>
              {isSuperAdmin ? (
                <a
                  href="/super-admin"
                  title="Super admin"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: t.muted,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    opacity: sidebarExpanded ? 1 : 0,
                    transition: "opacity 140ms ease",
                    textDecoration: "none",
                  }}
                >
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Proper cog — outer notched ring + inner circle. Distinct from
                        the sun icon used by the theme toggle (which has straight
                        radial spokes, no square notches). */}
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                    <circle cx={12} cy={12} r={3} />
                  </svg>
                </a>
              ) : null}
            </button>
          </div>
          {SIDEBAR_COLLAPSE_ENABLED ? (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 6,
                alignItems: "center",
                justifyContent: "flex-end",
                opacity: sidebarExpanded ? 1 : 0,
                transition: "opacity 140ms ease",
                pointerEvents: sidebarExpanded ? "auto" : "none",
              }}
            >
              <IconToggle
                t={t}
                title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}
                active={sidebarPinned}
                onClick={togglePinned}
              >
                {/* Two-column rail: "pinned" when left bar is thick/filled */}
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x={3}
                    y={4}
                    width={4}
                    height={12}
                    rx={1}
                    fill={sidebarPinned ? "currentColor" : "none"}
                  />
                  <rect x={10} y={4} width={7} height={12} rx={1} />
                </svg>
              </IconToggle>
            </div>
          ) : null}
        </div>
      </aside>

      <main
        style={{
          padding: mobileNav
            ? `calc(16px + var(--fuel-safe-top, 0px)) 16px calc(40px + var(--fuel-safe-bottom, 0px))`
            : "28px 40px 64px",
          maxWidth: "100%",
          width: "100%",
          // Flex items default to min-width: auto, which means "don't shrink
          // below my content's intrinsic size." For wide content (like the
          // horizontally-scrolling pipeline kanban), that causes the main
          // column to push past the viewport and force the whole page to
          // scroll horizontally. Setting min-width: 0 lets inner
          // overflow-x: auto actually contain the overflow.
          minWidth: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflowX: "clip",
          opacity: navPending ? 0.55 : 1,
          transition: "opacity 120ms ease",
          pointerEvents: navPending ? "none" : "auto",
        }}
      >
        <CreditCancelBanner />
        <CreditBlockBanner />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: mobileNav ? 12 : 14,
            marginBottom: mobileNav ? 18 : 28,
            paddingBottom: 16,
            borderBottom: `1px solid ${t.rule}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flex: mobileNav ? "1 1 auto" : undefined,
            }}
          >
            {mobileNav ? (
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={mobileNavOpen}
                aria-controls="fuel-app-nav"
                onClick={() => setMobileNavOpen(true)}
                style={{
                  width: TOUCH_TARGET_MIN,
                  height: TOUCH_TARGET_MIN,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${t.rule}`,
                  borderRadius: 8,
                  background: t.panel,
                  color: t.ink,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                >
                  <path d="M3 5h14M3 10h14M3 15h14" />
                </svg>
              </button>
            ) : null}
            <BreadcrumbTrail t={t} fallback={eyebrow ?? page} compact={mobileNav} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: mobileNav ? 8 : 14,
              minWidth: 0,
              flex: mobileNav ? "1 1 100%" : undefined,
              justifyContent: mobileNav ? "stretch" : undefined,
            }}
          >
            <div style={{ flex: mobileNav ? 1 : undefined, minWidth: 0 }}>
              <CompanySearch t={t} fluid={mobileNav} />
            </div>
            <TourHeaderButton />
            <AskAiButton t={t} compact={mobileNav} />
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            width: "100%",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

function BreadcrumbTrail({
  t,
  fallback,
  compact = false,
}: {
  t: Theme;
  fallback: string;
  compact?: boolean;
}) {
  const trail = useBreadcrumbTrail();
  const segments = trail.length > 0 ? trail : [{ label: fallback }];
  const visible = compact && segments.length > 1 ? segments.slice(-1) : segments;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: t.sans,
        fontSize: 13,
        color: t.muted,
        flexWrap: "nowrap",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {!compact ? <span>Fuel</span> : null}
      {visible.map((seg, i) => {
        const isLast = i === visible.length - 1;
        const fullIndex = compact ? segments.length - 1 : i;
        return (
          <Fragment key={`${seg.label}-${fullIndex}`}>
            {!compact || i > 0 ? (
              <span style={{ color: t.mutedSoft }}>/</span>
            ) : compact ? (
              <span style={{ color: t.mutedSoft }}>Fuel /</span>
            ) : null}
            {seg.href && !isLast ? (
              <Link
                href={seg.href}
                style={{
                  color: t.muted,
                  fontWeight: 500,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {seg.label}
              </Link>
            ) : (
              <span
                style={{
                  color: isLast ? t.ink : t.muted,
                  fontWeight: isLast ? 500 : undefined,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {seg.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function TourHeaderButton() {
  const pathname = usePathname();
  const tour = useWorkspaceTourOptional();
  if (!(pathname ?? "").startsWith("/company/")) return null;
  if (!tour) return null;
  if (!tour.showTourButton) return null;

  return (
    <TourHeaderControl
      pointed={tour.showTourCoachmark}
      coachmark={tour.showTourCoachmark}
      onStartTour={() => tour.startTour()}
      onDismissCoachmark={tour.dismissTourCoachmark}
    />
  );
}

function AskAiButton({ t, compact = false }: { t: Theme; compact?: boolean }) {
  const { openDrawer, busy } = useAgentDrawer();
  const tour = useWorkspaceTourOptional();
  const tourHighlight = tour?.activeTarget === "ask-fuel-ai";
  return (
    <button
      onClick={openDrawer}
      title="Ask Fuel AI (⌘J)"
      aria-label="Ask Fuel AI"
      data-tour-target="ask-fuel-ai"
      className={tourHighlight ? "fuel-tour-highlight" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: compact ? "0 12px" : "6px 10px 6px 8px",
        minWidth: compact ? TOUCH_TARGET_MIN : undefined,
        minHeight: TOUCH_TARGET_MIN,
        borderRadius: 8,
        fontFamily: t.sans,
        fontSize: 12,
        fontWeight: 600,
        color: "#0B1116",
        border: "none",
        cursor: "pointer",
        background: "linear-gradient(135deg, #00B48A 0%, #ECD67F 100%)",
        boxShadow: busy ? "0 0 0 2px rgba(0,180,138,0.35)" : "none",
        transition: "box-shadow 220ms ease, transform 120ms ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(0)";
      }}
    >
      <FuelMark size={16} busy={busy} />
      {compact ? null : "Ask Fuel AI"}
    </button>
  );
}

const UserMenuItemHoverCtx = createContext(false);

function UserMenuItem({
  t,
  children,
  onClick,
  href,
}: {
  t: Theme;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const style: CSSProperties = {
    alignItems: "center",
    background: hovered ? t.panelInner : "transparent",
    border: 0,
    borderRadius: 8,
    color: t.ink,
    cursor: "pointer",
    display: "flex",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 500,
    gap: 10,
    padding: "9px 10px",
    textAlign: "left",
    textDecoration: "none",
    transition: "background 0.12s",
    width: "100%",
  };

  const content = (
    <UserMenuItemHoverCtx.Provider value={hovered}>{children}</UserMenuItemHoverCtx.Provider>
  );

  if (href) {
    return (
      <a
        href={href}
        role="menuitem"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
      {content}
    </button>
  );
}

function UserMenuIcon({ t, children }: { t: Theme; children: ReactNode }) {
  const hovered = useContext(UserMenuItemHoverCtx);
  return (
    <span
      aria-hidden="true"
      style={{
        width: 16,
        height: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: hovered ? t.ink : t.inkSoft,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function IconToggle({
  t,
  title,
  active,
  onClick,
  children,
}: {
  t: Theme;
  title: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        width: 26,
        height: 26,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${active ? t.accent : t.rule}`,
        background: active ? `${t.accent}1a` : "transparent",
        color: active ? t.accent : t.muted,
        borderRadius: 6,
        cursor: "pointer",
        padding: 0,
        transition:
          "background 120ms ease, color 120ms ease, border-color 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = t.ink;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = t.muted;
        }
      }}
    >
      {children}
    </button>
  );
}
