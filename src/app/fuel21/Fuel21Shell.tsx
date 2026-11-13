import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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
    id: "profile",
    label: "Profile",
    items: [
      { id: "profile", label: "Profile", description: "Verified founder credentials & operating team", icon: User },
    ],
  },
  {
    id: "tracks",
    label: "Tracks",
    items: [
      { id: "rd", label: "R&D", description: "Engineering velocity, test coverage & ship cadence", icon: Code2 },
      { id: "gtm", label: "GTM", description: "Go-to-market engine, CAC payback & deal pipeline", icon: TrendingUp },
      { id: "ga", label: "G&A", description: "General & administrative governance & cash model", icon: Building2 },
    ],
  },
  {
    id: "value-creation",
    label: "Value creation",
    items: [
      { id: "context", label: "Context", description: "Context engine, live documents & knowledge graph", icon: Layers },
      { id: "intelligence", label: "Intelligence", description: "Continuous telemetry & live ecosystem signals", icon: Radio },
      { id: "initiatives", label: "Initiatives", description: "Active execution playbooks & strategic milestones", icon: ListTodo },
      { id: "dataroom", label: "Data room", description: "Investor data room with institutional verified files", icon: Folder },
    ],
  },
  {
    id: "public-presence",
    label: "Public presence",
    items: [
      { id: "company", label: "Company", description: "Company identity, industry & legal profile", icon: Globe },
      { id: "blog", label: "Blog", description: "Company writing and public updates", icon: PenLine },
    ],
  },
];

function SidebarNavButton({
  item,
  active,
  badge,
  onSelect,
}: {
  item: SidebarNavItem;
  active: boolean;
  badge?: string;
  onSelect: (id: string) => void;
}) {
  const Icon = NAV_ICONS[item.id] ?? FileText;
  const shownBadge = badge ?? item.badge;
  return (
    <button
      type="button"
      className={`f21-nav-item${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(item.id)}
    >
      <Icon size={15} strokeWidth={1.85} aria-hidden="true" className="f21-nav-item-icon" />
      <span className="f21-nav-item-label">{item.label}</span>
      {shownBadge ? (
        <span
          className={`f21-nav-badge${
            item.badgeTone === "green" ? " is-green" : item.badgeShape === "circle" ? " is-circle" : ""
          }`}
        >
          {shownBadge}
        </span>
      ) : null}
    </button>
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
  /** Rendered between the theme toggle and Ask Fuel AI (e.g. notifications). */
  topbarActions?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const sections = SIDEBAR_SECTIONS.filter(section => section.id !== "recently-viewed");
  const [navOpen, setNavOpen] = useState(false);

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
      <aside className={`f21-sidebar${navOpen ? " is-open" : ""}`}>
        <div className="f21-sidebar-top">
          <FuelSidebarBrand theme={theme} className="f21-sidebar-brand-header" />

          <button
            type="button"
            className={`f21-nav-dashboard-item${activeNavId === "dashboard" ? " is-active" : ""}`}
            onClick={() => selectNav("dashboard")}
          >
            <LayoutGrid size={15} strokeWidth={2} aria-hidden="true" className="f21-nav-item-icon" />
            <span className="f21-nav-item-label">Dashboard</span>
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
              <input type="search" placeholder="Search workspace" aria-label="Search workspace" />
              <kbd>⌘ K</kbd>
            </label>
            <button
              type="button"
              className="f21-topbar-ai-btn"
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
          </div>
        </header>
        <div className="f21-workspace-layout">
          <main className="f21-content">{children}</main>

          <aside className="f21-right-dock" aria-label="Workspace quick companion">
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
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="f21-dock-foot">
              <DockButton
                item={{ id: "help", label: "Help and feedback", description: "Guides, questions, and product feedback", icon: CircleHelp }}
                active={activeDockId === "help"}
                onSelect={onSelectDock}
                muted
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DockButton({
  item,
  active,
  onSelect,
  muted = false,
}: {
  item: DockItem;
  active: boolean;
  onSelect: (id: Fuel21DockId) => void;
  muted?: boolean;
}) {
  const Icon = item.icon;
  const meta = DOCK_ICON_META[item.id];
  const wash = muted ? "rgba(40, 66, 86, 0.08)" : meta?.wash;
  return (
    <div className="f21-dock-item-wrap">
      <button
        type="button"
        className={`f21-dock-item${active ? " is-active" : ""}`}
        data-dock={item.id}
        style={wash ? ({ ["--dock-wash"]: wash } as CSSProperties) : undefined}
        onClick={() => onSelect(item.id)}
        aria-label={`${item.label} — ${item.description}`}
      >
        <span className={`f21-dock-icon${muted ? " f21-dock-icon--help" : ""}`} aria-hidden="true">
          <Icon
            size={FUEL21_DOCK_ICON_SIZE}
            strokeWidth={1.85}
            color={muted ? undefined : meta?.color}
            aria-hidden="true"
          />
        </span>
      </button>
      <div className="f21-dock-tooltip" role="tooltip">
        <strong className="f21-dock-tooltip-title">{item.label}</strong>
        <p className="f21-dock-tooltip-desc">{item.description}</p>
      </div>
    </div>
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
