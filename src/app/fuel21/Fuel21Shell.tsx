import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  Building2,
  CircleHelp,
  Code2,
  FileText,
  Folder,
  Globe,
  Layers,
  LayoutGrid,
  ListTodo,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  ChevronLeft,
  Ellipsis,
  PenLine,
  Radio,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DOCK_ICON_META, FUEL21_DOCK_ICON_SIZE } from "./RightRailIcons.tsx";
import { FuelSidebarBrand } from "./FuelPlatformMark.tsx";
import { SIDEBAR_SECTIONS, type SidebarNavItem } from "./demoData.ts";

export type Fuel21DockId =
  | "summary"
  | "profile"
  | "rd"
  | "gtm"
  | "ga"
  | "context"
  | "intelligence"
  | "initiatives"
  | "dataroom"
  | "company"
  | "blog"
  | "help";

export type Fuel21RecentItem = {
  id: string;
  label: string;
};

const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  summary: Sparkles,
  profile: User,
  rd: Code2,
  gtm: TrendingUp,
  ga: Building2,
  intelligence: Radio,
  initiatives: ListTodo,
  playbooks: Target,
  artifacts: FileText,
  benchmarks: SlidersHorizontal,
  context: Layers,
  dataroom: Folder,
  advisors: MessageSquare,
  investors: Users,
  watchlists: Bookmark,
  "public-profile": Globe,
  blog: PenLine,
  help: CircleHelp,
};

type DockItem = {
  id: Fuel21DockId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const RIGHT_DOCK_GROUPS: { id: string; label: string; items: DockItem[] }[] = [
  {
    id: "company",
    label: "Company",
    items: [
      { id: "summary", label: "Summary", description: "Full company brief across product, go-to-market, and finance", icon: Sparkles },
      { id: "rd", label: "R&D", description: "Engineering velocity, test coverage & ship cadence", icon: Code2 },
      { id: "gtm", label: "GTM", description: "Go-to-market engine, CAC payback & deal pipeline", icon: TrendingUp },
      { id: "ga", label: "G&A", description: "General & administrative governance & cash model", icon: Building2 },
    ],
  },
  {
    id: "public",
    label: "Public",
    items: [
      { id: "company", label: "Public profile", description: "Company identity, industry & legal profile", icon: Globe },
      { id: "blog", label: "Blog", description: "Company writing and public updates", icon: PenLine },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    items: [
      { id: "profile", label: "Profile", description: "Verified founder credentials & operating team", icon: User },
      { id: "context", label: "Context", description: "Context engine, live documents & knowledge graph", icon: Layers },
      { id: "intelligence", label: "Intelligence", description: "Continuous telemetry & live ecosystem signals", icon: Radio },
      { id: "initiatives", label: "Initiatives", description: "Active execution playbooks & strategic milestones", icon: ListTodo },
      { id: "dataroom", label: "Data room", description: "Investor data room with institutional verified files", icon: Folder },
    ],
  },
];

const HELP_DOCK_ITEM: DockItem = {
  id: "help",
  label: "Help",
  description: "Guides, questions, and product feedback",
  icon: CircleHelp,
};

const MOBILE_LABELS: Partial<Record<Fuel21DockId, string>> = {
  rd: "Research & Development",
  gtm: "Go-to-market",
  ga: "General & Administrative",
};

const MOBILE_PINS: Fuel21DockId[] = ["summary", "rd", "gtm", "initiatives"];

const MOBILE_BAR_LABELS: Partial<Record<Fuel21DockId, string>> = {
  rd: "R&D",
  gtm: "GTM",
  ga: "G&A",
};

function mobileDockLabel(item: DockItem, compact = false) {
  if (compact) return MOBILE_BAR_LABELS[item.id] ?? item.label;
  return MOBILE_LABELS[item.id] ?? item.label;
}

function MobileQuickIcon({ item, size, plain = false }: { item: DockItem; size: number; plain?: boolean }) {
  if (item.id === "summary" && !plain) {
    return (
      <span className="f21-mobile-summary-chip">
        <SummaryAiIcon size={16} />
      </span>
    );
  }
  const Icon = item.icon;
  const color = item.id === "summary" || item.id === "help" ? undefined : DOCK_ICON_META[item.id]?.color;
  return <Icon size={size} strokeWidth={1.85} color={color} aria-hidden="true" />;
}

function SummaryAiIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="3.8 0.75 17.8 22.1" fill="none" aria-hidden="true" className="f21-summary-ai-icon">
      <path
        d="M13.4 2.4H7.2A2.2 2.2 0 0 0 5 4.6v14.8A2.2 2.2 0 0 0 7.2 21.6h9.6a2.2 2.2 0 0 0 2.2-2.2V9.1"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.2 12.2h6.1M8.2 16h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M16.7 0.85 17.95 4.35 21.45 5.6 17.95 6.85 16.7 10.35 15.45 6.85 11.95 5.6 15.45 4.35 16.7 0.85Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SidebarNavButton({
  item,
  active,
  badge,
  highlighted = false,
  buttonRef,
  onSelect,
}: {
  item: SidebarNavItem;
  active: boolean;
  badge?: string;
  highlighted?: boolean;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  onSelect: (id: string) => void;
}) {
  const Icon = NAV_ICONS[item.id] ?? FileText;
  const shownBadge = badge ?? item.badge;
  const progressBadge = Boolean(shownBadge?.endsWith("%"));
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`f21-nav-item${active ? " is-active" : ""}${highlighted ? " tour-highlight" : ""}`}
      aria-current={active ? "page" : undefined}
      data-tour-target={`nav-${item.id}`}
      title={item.label}
      aria-label={item.label}
      onClick={() => onSelect(item.id)}
    >
      <Icon size={15} strokeWidth={1.85} aria-hidden="true" className="f21-nav-item-icon" />
      <span className="f21-nav-item-label">{item.label}</span>
      {shownBadge ? (
        <span
          className={`f21-nav-badge${
            progressBadge || item.badgeTone === "green" ? " is-green" : item.badgeShape === "circle" ? " is-circle" : ""
          }`}
        >
          {shownBadge}
        </span>
      ) : null}
    </button>
  );
}

function MobileQuickBar({
  activeId,
  onSelect,
  tourTarget = null,
}: {
  activeId: string | null;
  onSelect: (id: Fuel21DockId) => void;
  tourTarget?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pinned = new Set<string>(MOBILE_PINS);
  const moreActive = Boolean(activeId && !pinned.has(activeId));
  const sheetGroups = RIGHT_DOCK_GROUPS.map(group =>
    group.id === "actions" ? { ...group, items: [...group.items, HELP_DOCK_ITEM] } : group,
  );

  useEffect(() => {
    setOpen(false);
  }, [tourTarget]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 820) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const choose = (id: Fuel21DockId) => {
    setOpen(false);
    onSelect(id);
  };

  const pinItem = (id: Fuel21DockId) =>
    RIGHT_DOCK_GROUPS.flatMap(group => group.items).find(item => item.id === id);

  return (
    <>
      <nav
        className={`f21-mobile-quick${tourTarget === "dock-quick-actions" ? " tour-highlight" : ""}`}
        aria-label="Quick actions"
        data-tour-target="dock-quick-actions"
      >
        {MOBILE_PINS.map(id => {
          const item = pinItem(id);
          if (!item) return null;
          const label = mobileDockLabel(item, true);
          const active = activeId === id;
          return (
            <button
              key={id}
              type="button"
              className={`f21-mobile-tab${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => choose(id)}
            >
              <span className="f21-mobile-tab-icon">
                <MobileQuickIcon item={item} size={18} />
              </span>
              <span className="f21-mobile-tab-label">{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`f21-mobile-tab${moreActive || open ? " is-active" : ""}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(current => !current)}
        >
          <span className="f21-mobile-tab-icon" aria-hidden="true">
            <Ellipsis size={18} strokeWidth={1.85} />
          </span>
          <span className="f21-mobile-tab-label">More</span>
        </button>
      </nav>
      {open ? (
        <>
          <button type="button" className="f21-mobile-sheet-scrim" aria-label="Close quick actions" onClick={() => setOpen(false)} />
          <div className="f21-mobile-sheet" role="dialog" aria-modal="true" aria-label="More quick actions">
            <div className="f21-mobile-sheet-handle" aria-hidden="true" />
            <div className="f21-mobile-sheet-head">
              <strong>More</strong>
            </div>
            {sheetGroups.map(group => (
              <section key={group.id} className="f21-mobile-sheet-group" aria-label={group.label}>
                <div className="f21-mobile-sheet-label">{group.label}</div>
                <div className="f21-mobile-sheet-grid">
                  {group.items.map(item => {
                    const label = mobileDockLabel(item);
                    const active = activeId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`f21-mobile-sheet-item${active ? " is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => choose(item.id)}
                      >
                        <span className={`f21-mobile-sheet-icon${item.id === "summary" ? " is-summary" : ""}`}>
                          <MobileQuickIcon item={item} size={20} plain />
                        </span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export function Fuel21Shell({
  theme,
  activeNavId,
  activeDockId = null,
  breadcrumbRoot,
  breadcrumbCurrent,
  navBadges = {},
  recentItems,
  activeRecentId = null,
  onSelectNav,
  onSelectRecent,
  onSelectDock,
  onAskFuel,
  onToggleTheme,
  tourTarget = null,
  showContextHint = false,
  onDismissContextHint,
  showDockTour = false,
  dockTourCoachmark = false,
  onStartDockTour,
  onDismissDockTour,
  topbarActions,
  footer,
  children,
}: {
  theme: "dark" | "light";
  activeNavId: string | null;
  activeDockId?: Fuel21DockId | null;
  breadcrumbRoot: string;
  breadcrumbCurrent: string;
  /** Live counts keyed by nav item id; empty string hides the badge. */
  navBadges?: Record<string, string | undefined>;
  recentItems?: Fuel21RecentItem[];
  activeRecentId?: string | null;
  onSelectNav: (id: string) => void;
  onSelectRecent?: (id: string) => void;
  onSelectDock: (id: Fuel21DockId) => void;
  onAskFuel: () => void;
  onToggleTheme: () => void;
  tourTarget?: string | null;
  showContextHint?: boolean;
  onDismissContextHint?: () => void;
  showDockTour?: boolean;
  dockTourCoachmark?: boolean;
  onStartDockTour?: () => void;
  onDismissDockTour?: () => void;
  /** Rendered between the theme toggle and Ask Fuel AI (e.g. notifications). */
  topbarActions?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const sections = SIDEBAR_SECTIONS.filter(section => section.id !== "recently-viewed");
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readRailCollapsed("fuel21-sidebar-collapsed"));
  const [dockCollapsed, setDockCollapsed] = useState(() => readRailCollapsed("fuel21-dock-collapsed"));
  const [contextAnchor, setContextAnchor] = useState<HTMLButtonElement | null>(null);
  const openedNavForHint = useRef(false);

  useEffect(() => {
    writeRailCollapsed("fuel21-sidebar-collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    writeRailCollapsed("fuel21-dock-collapsed", dockCollapsed);
  }, [dockCollapsed]);

  useEffect(() => {
    if (tourTarget === "dock-quick-actions") setDockCollapsed(false);
  }, [tourTarget]);

  useLayoutEffect(() => {
    const narrow = window.matchMedia("(max-width: 820px)").matches;
    if (!narrow) return;
    const opensMenu = Boolean(tourTarget && (tourTarget.startsWith("nav-") || tourTarget === "profile-integrations"));
    if (showContextHint) {
      openedNavForHint.current = true;
      setNavOpen(true);
      return;
    }
    if (openedNavForHint.current) {
      openedNavForHint.current = false;
      if (!opensMenu) setNavOpen(false);
    }
    if (tourTarget) setNavOpen(opensMenu);
  }, [tourTarget, showContextHint]);

  useEffect(() => {
    const applyDockWidth = () => {
      const narrow = window.matchMedia("(max-width: 820px)").matches;
      const width = narrow || dockCollapsed ? "0px" : "60px";
      document.documentElement.style.setProperty("--f21-right-dock-width", width);
    };
    applyDockWidth();
    const query = window.matchMedia("(max-width: 820px)");
    query.addEventListener("change", applyDockWidth);
    return () => {
      query.removeEventListener("change", applyDockWidth);
      document.documentElement.style.removeProperty("--f21-right-dock-width");
    };
  }, [dockCollapsed]);

  useEffect(() => {
    setNavOpen(false);
  }, [activeNavId]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const selectNav = (id: string) => {
    setNavOpen(false);
    onSelectNav(id);
  };

  return (
    <div className="f21-app" data-f21-theme={theme}>
      <button
        type="button"
        className={`f21-nav-scrim${navOpen ? " is-open" : ""}`}
        aria-label="Close menu"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />
      <aside className={`f21-sidebar${navOpen ? " is-open" : ""}${sidebarCollapsed ? " is-collapsed" : ""}`}>
        <div className="f21-sidebar-top">
          <div className="f21-sidebar-brand-row">
            <FuelSidebarBrand theme={theme} className="f21-sidebar-brand-header" />
            <button
              type="button"
              className="f21-rail-toggle"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              onClick={() => setSidebarCollapsed(collapsed => !collapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={16} strokeWidth={1.85} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={16} strokeWidth={1.85} aria-hidden="true" />
              )}
            </button>
          </div>

          <button
            type="button"
            className={`f21-nav-dashboard-item${activeNavId === "dashboard" ? " is-active" : ""}${tourTarget === "nav-dashboard" ? " tour-highlight" : ""}`}
            onClick={() => selectNav("dashboard")}
            aria-label={`Dashboard, ${breadcrumbRoot}`}
            data-tour-target="nav-dashboard"
          >
            <LayoutGrid size={15} strokeWidth={2} aria-hidden="true" className="f21-nav-item-icon" />
            <span className="f21-nav-dashboard-copy">
              <span className="f21-nav-dashboard-kicker">Dashboard</span>
              <span className="f21-nav-item-label">{breadcrumbRoot}</span>
            </span>
          </button>

          {sections.map(section => (
            <div key={section.id} className="f21-sidebar-section">
              <div className="f21-sidebar-section-label">{section.label}</div>
              {section.items.map(item => (
                <SidebarNavButton
                  key={item.id}
                  item={item}
                  active={activeNavId === item.id}
                  badge={item.id in navBadges ? navBadges[item.id] : undefined}
                  highlighted={tourTarget === `nav-${item.id}`}
                  buttonRef={item.id === "context" ? setContextAnchor : undefined}
                  onSelect={selectNav}
                />
              ))}
            </div>
          ))}

          {recentItems && recentItems.length > 0 ? (
            <div className="f21-sidebar-section">
              <div className="f21-sidebar-section-label">Recently viewed</div>
              {recentItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`f21-nav-item${activeRecentId === item.id ? " is-active" : ""}`}
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => {
                    setNavOpen(false);
                    onSelectRecent?.(item.id);
                  }}
                >
                  <FileText size={15} strokeWidth={1.85} aria-hidden="true" className="f21-nav-item-icon" />
                  <span className="f21-nav-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="f21-sidebar-foot">{footer}</div>
      </aside>

      <div className="f21-main">
        <header className="f21-topbar">
          <button
            type="button"
            className="f21-menu-btn"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen(open => !open)}
          >
            <Menu size={18} strokeWidth={1.85} aria-hidden="true" />
          </button>
          <div className="f21-breadcrumb">
            <span>{breadcrumbRoot}</span>
            <span className="f21-breadcrumb-sep">/</span>
            <span className="f21-breadcrumb-current">{breadcrumbCurrent}</span>
          </div>
          <div className="f21-topbar-right">
            <label className="f21-search">
              <Search size={14} strokeWidth={1.85} aria-hidden="true" />
              <input type="search" placeholder="Search company" aria-label="Search company" />
              <kbd>⌘ K</kbd>
            </label>
            <button
              type="button"
              className={`f21-topbar-ai-btn${tourTarget === "ask-fuel-ai" ? " tour-highlight" : ""}`}
              data-tour-target="ask-fuel-ai"
              onClick={onAskFuel}
              aria-label="Ask Fuel AI"
            >
              <Sparkles size={12} strokeWidth={2.0} aria-hidden="true" />
              <span>Ask Fuel AI</span>
            </button>
            <button
              type="button"
              className="f21-icon-btn"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={onToggleTheme}
            >
              {theme === "dark" ? (
                <Moon size={15} strokeWidth={1.85} aria-hidden="true" />
              ) : (
                <Sun size={15} strokeWidth={1.85} aria-hidden="true" />
              )}
            </button>
            {topbarActions}
            {showDockTour ? (
              <div className={`f21-mobile-tour${dockTourCoachmark && !showContextHint ? " is-coachmark" : ""}`}>
                <button
                  type="button"
                  className={`f21-dock-tour-btn${dockTourCoachmark && !showContextHint ? " is-pointed" : ""}`}
                  aria-label="Tour"
                  onClick={onStartDockTour}
                >
                  <TourMark />
                </button>
                {dockTourCoachmark && !showContextHint ? (
                  <div className="f21-mobile-tour-coachmark" role="status">
                    <span className="f21-dock-tour-coachmark-icon" aria-hidden="true">
                      <TourMark />
                    </span>
                    <p>You can click here later to take a tour of the platform.</p>
                    <button type="button" onClick={onDismissDockTour}>OK</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>
        {showContextHint ? (
          <ContextEngineHint anchor={contextAnchor} onDismiss={() => onDismissContextHint?.()} />
        ) : null}
        <div className="f21-workspace-layout">
          <main className="f21-content">{children}</main>

          {dockCollapsed ? (
            <button
              type="button"
              className="f21-dock-edge"
              aria-label="Show side panel"
              title="Show side panel"
              onClick={() => setDockCollapsed(false)}
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}

          <aside
            className={`f21-right-dock${dockCollapsed ? " is-collapsed" : ""}${tourTarget === "dock-quick-actions" ? " tour-highlight" : ""}`}
            aria-label="Workspace quick companion"
            data-tour-target="dock-quick-actions"
            hidden={dockCollapsed}
          >
            {RIGHT_DOCK_GROUPS.map((group, index) => (
              <div key={group.id} className="f21-dock-section">
                {index > 0 ? <div className="f21-dock-divider" role="separator" /> : null}
                <div className="f21-dock-group" aria-label={group.label}>
                  {group.items.map(item => (
                    <DockButton
                      key={item.id}
                      item={item}
                      active={activeDockId === item.id}
                      onSelect={onSelectDock}
                      spotlight={tourTarget === "dock-quick-actions" && item.id === "summary"}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="f21-dock-foot">
              {showDockTour ? (
                <div className={`f21-dock-tour${dockTourCoachmark ? " is-coachmark" : ""}`}>
                  <button
                    type="button"
                    className={`f21-dock-tour-btn${dockTourCoachmark ? " is-pointed" : ""}`}
                    aria-label="Tour"
                    onClick={onStartDockTour}
                  >
                    <TourMark />
                  </button>
                  {dockTourCoachmark ? (
                    <div className="f21-dock-tour-coachmark" role="status">
                      <span className="f21-dock-tour-coachmark-icon" aria-hidden="true">
                        <TourMark />
                      </span>
                      <p>You can click here later to take a tour of the platform.</p>
                      <button type="button" onClick={onDismissDockTour}>OK</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <DockButton
                item={{ id: "help", label: "Help and feedback", description: "Guides, questions, and product feedback", icon: CircleHelp }}
                active={activeDockId === "help"}
                onSelect={onSelectDock}
                muted
              />
              <button
                type="button"
                className="f21-rail-toggle f21-dock-toggle"
                aria-label="Collapse side menu"
                aria-expanded
                onClick={() => setDockCollapsed(true)}
              >
                <PanelRightClose size={16} strokeWidth={1.85} aria-hidden="true" />
              </button>
            </div>
          </aside>
        </div>
        <MobileQuickBar
          activeId={activeDockId}
          tourTarget={tourTarget}
          onSelect={id => {
            setNavOpen(false);
            onSelectDock(id);
          }}
        />
      </div>
    </div>
  );
}

function readRailCollapsed(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeRailCollapsed(key: string, collapsed: boolean) {
  try {
    window.localStorage.setItem(key, collapsed ? "1" : "0");
  } catch {
    /* ignore quota errors in preview */
  }
}

function TourMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3.5v2.2M8 10.3V12.5M3.5 8h2.2M10.3 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

function DockButton({
  item,
  active,
  onSelect,
  muted = false,
  spotlight = false,
}: {
  item: DockItem;
  active: boolean;
  onSelect: (id: Fuel21DockId) => void;
  muted?: boolean;
  spotlight?: boolean;
}) {
  const Icon = item.icon;
  const meta = DOCK_ICON_META[item.id];
  const wash = muted ? "rgba(40, 66, 86, 0.08)" : meta?.wash;
  return (
    <div className="f21-dock-item-wrap">
      <button
        type="button"
        className={`f21-dock-item${item.id === "summary" ? " is-emphasis" : ""}${active ? " is-active" : ""}${spotlight ? " tour-highlight" : ""}`}
        data-dock={item.id}
        style={item.id === "summary" || !wash ? undefined : ({ ["--dock-wash"]: wash } as CSSProperties)}
        onClick={() => onSelect(item.id)}
        aria-label={`${item.label} — ${item.description}`}
      >
        <span
          className={`f21-dock-icon${muted ? " f21-dock-icon--help" : ""}${item.id === "summary" ? " f21-dock-icon--chip" : ""}`}
          aria-hidden="true"
        >
          {item.id === "summary" ? (
            <SummaryAiIcon size={18} />
          ) : (
            <Icon
              size={FUEL21_DOCK_ICON_SIZE}
              strokeWidth={1.85}
              color={muted ? undefined : meta?.color}
              aria-hidden="true"
            />
          )}
        </span>
      </button>
      <div className="f21-dock-tooltip" role="tooltip">
        <strong className="f21-dock-tooltip-title">{item.label}</strong>
        <p className="f21-dock-tooltip-desc">{item.description}</p>
      </div>
    </div>
  );
}

function ContextEngineHint({
  anchor,
  onDismiss,
}: {
  anchor: HTMLButtonElement | null;
  onDismiss: () => void;
}) {
  const [frame, setFrame] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      setFrame({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    anchor.scrollIntoView({ block: "nearest" });
    place();
    const retries = [80, 220, 420].map(ms => window.setTimeout(place, ms));
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      retries.forEach(id => window.clearTimeout(id));
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  if (!frame || frame.left < -8 || frame.width < 2) return null;
  const host = anchor?.closest(".f21-app") ?? document.body;
  const pad = 12;
  const hole = {
    left: Math.max(0, frame.left - pad),
    top: Math.max(0, frame.top - pad),
    right: Math.min(window.innerWidth, frame.left + frame.width + pad),
    bottom: Math.min(window.innerHeight, frame.top + frame.height + pad),
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(260, vw - 24);
  const roomRight = vw - (frame.left + frame.width + 12);
  const placeBelow = roomRight < cardWidth + 8;
  const cardLeft = placeBelow
    ? Math.max(12, Math.min(frame.left, vw - cardWidth - 12))
    : frame.left + frame.width + 12;
  const belowTop = frame.top + frame.height + 14;
  const cardTop = placeBelow
    ? (belowTop + 160 < vh ? belowTop : Math.max(12, frame.top - 168))
    : frame.top;
  return createPortal(
    <>
      <div
        className="f21-context-hint-backdrop"
        style={{
          clipPath: `polygon(evenodd, 0px 0px, ${vw}px 0px, ${vw}px ${vh}px, 0px ${vh}px, 0px 0px, ${hole.left}px ${hole.top}px, ${hole.left}px ${hole.bottom}px, ${hole.right}px ${hole.bottom}px, ${hole.right}px ${hole.top}px, ${hole.left}px ${hole.top}px)`,
        }}
      />
      <div
        className="f21-context-hint-ring"
        style={{ top: frame.top, left: frame.left, width: frame.width, height: frame.height }}
        aria-hidden="true"
      />
      <div
        className={`f21-context-hint${placeBelow ? " is-below" : ""}`}
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
        role="status"
      >
        <p>Add the rest here. Context engine is where company answers, notes, and files go — and where you earn the credit for finishing them.</p>
        <button type="button" onClick={onDismiss}>OK</button>
      </div>
    </>,
    host,
  );
}

/** Profile row with plan status folded under the name; full plan details live behind the gear. */
export function Fuel21UserFooter({
  initials,
  name,
  subtitle,
  tier,
  remaining,
  total,
  low,
  onOpenMenu,
  onOpenPlan,
  menuOpen = false,
  planOpen = false,
  menu,
  planPopover,
}: {
  initials: string;
  name: string;
  subtitle: string;
  tier: string;
  remaining: number;
  total: number;
  low: boolean;
  onOpenMenu: () => void;
  onOpenPlan: () => void;
  menuOpen?: boolean;
  planOpen?: boolean;
  menu?: ReactNode;
  planPopover?: ReactNode;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100))) : 0;
  return (
    <div className="f21-user-card-wrap">
      {menu}
      {planPopover}
      <div className="f21-user-card">
        <div className="f21-user-card-main">
          <button
            type="button"
            className="f21-user-card-hit"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open user menu"
            onClick={onOpenMenu}
          >
            <span className="f21-user-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="f21-user-copy">
              <strong className="f21-user-name">{name}</strong>
              <span className="f21-user-role">{subtitle}</span>
            </span>
          </button>
          <button
            type="button"
            className={`f21-user-usage${low ? " is-low" : ""}${planOpen ? " is-open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={planOpen}
            aria-label={`${tier} plan, ${remaining} of ${total} credits available. Open credit details`}
            onClick={onOpenPlan}
          >
            <span className="f21-user-usage-line">
              <span className="f21-user-usage-tier">{tier}</span>
              <span className="f21-usage-counts">
                <strong>{remaining.toLocaleString()}</strong>
                <span> / {total.toLocaleString()}</span>
              </span>
            </span>
            <span
              className="f21-usage-meter-track"
              role="progressbar"
              aria-valuenow={remaining}
              aria-valuemin={0}
              aria-valuemax={total}
            >
              <span className="f21-usage-meter-fill" style={{ width: `${pct}%` }} />
            </span>
          </button>
        </div>
        <button type="button" className="f21-user-settings-btn" aria-label="Plan and settings" onClick={onOpenPlan}>
          <Settings size={15} strokeWidth={1.85} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
