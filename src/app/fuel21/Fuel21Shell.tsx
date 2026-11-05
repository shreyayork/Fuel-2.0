import type { CSSProperties, ComponentType, ReactNode, SVGProps } from "react";
import { useState, useEffect } from "react";
import {
  Bell,
  Building2,
  CircleHelp,
  Code2,
  FileText,
  Folder,
  Globe,
  Layers,
  LayoutGrid,
  ListTodo,
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
  Users,
} from "lucide-react";
import {
  IconCompany,
  IconProfile,
  IconContext,
  IconRD,
  IconGTM,
  IconGA,
  IconIntelligence,
  IconInitiatives,
  IconDataroom,
  DOCK_ICON_META,
} from "./RightRailIcons.tsx";
import { FuelSidebarBrand } from "./FuelPlatformMark.tsx";
import {
  SIDEBAR_SECTIONS,
  USAGE_PLAN,
  USER,
  WORKSPACE,
  breadcrumbFor,
  type NavId,
  type SidebarNavItem,
} from "./demoData.ts";

const NAV_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
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
  "public-profile": Globe,
  blog: PenLine,
  stripe: FileText,
  adyen: FileText,
  help: CircleHelp,
};

interface RightSidebarItem {
  id: string;
  label: string;
  description: string;
  group: "Input" | "Action & Analysis";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  targetNav: NavId;
  scrollTarget?: string;
}

const RIGHT_INPUT_ITEMS: RightSidebarItem[] = [
  { id: "company", label: "Company", description: "Company identity, industry & legal profile", group: "Input", icon: IconCompany, targetNav: "context" },
  { id: "profile", label: "Profile", description: "Verified founder credentials & operating team", group: "Input", icon: IconProfile, targetNav: "context" },
  { id: "context", label: "Context", description: "Context engine, live documents & knowledge graph", group: "Input", icon: IconContext, targetNav: "context" },
  { id: "rd", label: "R&D", description: "Engineering velocity, test coverage & ship cadence", group: "Input", icon: IconRD, targetNav: "rd" },
  { id: "gtm", label: "GTM", description: "Go-to-market engine, CAC payback & deal pipeline", group: "Input", icon: IconGTM, targetNav: "context" },
  { id: "ga", label: "G&A", description: "General & administrative governance & cash model", group: "Input", icon: IconGA, targetNav: "context" },
];

const RIGHT_ACTION_ITEMS: RightSidebarItem[] = [
  { id: "intelligence", label: "Intelligence", description: "Continuous telemetry & live ecosystem signals", group: "Action & Analysis", icon: IconIntelligence, targetNav: "dashboard", scrollTarget: ".f21-telemetry-panel" },
  { id: "initiatives", label: "Initiatives", description: "Active execution playbooks & strategic milestones", group: "Action & Analysis", icon: IconInitiatives, targetNav: "dashboard", scrollTarget: ".f21-initiatives-panel" },
  { id: "dataroom", label: "Data room", description: "Investor data room with institutional verified files", group: "Action & Analysis", icon: IconDataroom, targetNav: "dashboard", scrollTarget: ".f21-dataroom-panel" },
];

export function Fuel21Shell({
  theme,
  page,
  onNavigate,
  onToggleTheme,
  children,
}: {
  theme: "dark" | "light";
  page: NavId;
  onNavigate: (id: NavId) => void;
  onToggleTheme: () => void;
  children: ReactNode;
}) {
  const [activeItem, setActiveItem] = useState<string>(page);

  useEffect(() => {
    setActiveItem(page);
  }, [page]);

  const handleNavClick = (item: SidebarNavItem) => {
    setActiveItem(item.id);
    if (item.targetNav === "dashboard" && (item.id === "initiatives" || item.id === "intelligence")) {
      const selector = item.id === "intelligence" ? ".f21-telemetry-panel" : ".f21-initiatives-panel";
      if (page !== "dashboard") {
        onNavigate("dashboard");
        setTimeout(() => {
          document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } else {
        document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (item.id === "dataroom") {
      if (page !== "dashboard") {
        onNavigate("dashboard");
        setTimeout(() => {
          document.querySelector(".f21-dataroom-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } else {
        document.querySelector(".f21-dataroom-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      onNavigate(item.targetNav);
    }
  };

  const handleRightItemClick = (item: RightSidebarItem) => {
    setActiveItem(item.id);
    if (item.targetNav === "dashboard" && item.scrollTarget) {
      if (page !== "dashboard") {
        onNavigate("dashboard");
        setTimeout(() => {
          const el = document.querySelector(item.scrollTarget!);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } else {
        const el = document.querySelector(item.scrollTarget);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      onNavigate(item.targetNav);
    }
  };

  return (
    <div className="f21-app" data-f21-theme={theme}>
      <aside className="f21-sidebar">
        <div className="f21-sidebar-top">
          {/* Slanted green F + lowercase fuel */}
          <FuelSidebarBrand theme={theme} className="f21-sidebar-brand-header" />

          {/* Workspace Card: avatar circle P + PartriotPay.ai + Founder workspace */}
          <div className="f21-workspace-card">
            <span className="f21-workspace-avatar-circle" aria-hidden="true">
              {WORKSPACE.initial}
            </span>
            <div className="f21-workspace-details">
              <strong className="f21-workspace-title">{WORKSPACE.name}</strong>
              <span className="f21-workspace-subtitle">{WORKSPACE.kind}</span>
            </div>
          </div>

          {/* Standalone Dashboard Item (Green pill active state) */}
          <button
            type="button"
            className={`f21-nav-dashboard-item${activeItem === "dashboard" ? " is-active" : ""}`}
            onClick={() => {
              setActiveItem("dashboard");
              onNavigate("dashboard");
            }}
          >
            <LayoutGrid size={16} strokeWidth={2} aria-hidden="true" className="f21-nav-item-icon" />
            <span className="f21-nav-item-label">Dashboard</span>
          </button>

          {/* Sidebar Sections */}
          {SIDEBAR_SECTIONS.map(section => (
            <div key={section.id} className="f21-sidebar-section">
              <div className="f21-sidebar-section-label">{section.label}</div>
              {section.items.map(item => {
                const Icon = NAV_ICONS[item.id] ?? FileText;
                const active = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`f21-nav-item${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => handleNavClick(item)}
                  >
                    <Icon size={16} strokeWidth={1.85} aria-hidden="true" className="f21-nav-item-icon" />
                    <span className="f21-nav-item-label">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`f21-nav-badge${
                          item.badgeTone === "green"
                            ? " is-green"
                            : item.badgeShape === "circle"
                            ? " is-circle"
                            : ""
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Utility: Help and feedback */}
          <div className="f21-sidebar-section f21-sidebar-utility">
            <button
              type="button"
              className="f21-nav-item"
              onClick={() => onNavigate("context")}
              aria-label="Help and feedback"
            >
              <CircleHelp size={16} strokeWidth={1.85} aria-hidden="true" className="f21-nav-item-icon" />
              <span className="f21-nav-item-label">Help and feedback</span>
            </button>
          </div>

          {/* Divider */}
          <div className="f21-sidebar-divider" role="separator" />
        </div>

        {/* Sidebar Footer with Preserved Credit Part (FREE 220/220) and User Profile Card */}
        <div className="f21-sidebar-foot">
          {/* Preserved Credit / Usage Progress Card */}
          <div className="f21-sidebar-usage-card" aria-label="Plan and usage limit">
            <div className="f21-usage-card-top">
              <span className="f21-usage-tier-pill">{USAGE_PLAN.tier}</span>
              <span className="f21-usage-counts">
                <strong>{USAGE_PLAN.current}</strong> <span>/ {USAGE_PLAN.total}</span>
              </span>
            </div>
            <div
              className="f21-usage-meter-track"
              role="progressbar"
              aria-valuenow={USAGE_PLAN.current}
              aria-valuemin={0}
              aria-valuemax={USAGE_PLAN.total}
            >
              <span className="f21-usage-meter-fill" style={{ width: `${USAGE_PLAN.pct}%` }} />
            </div>
          </div>

          {/* User Profile Card */}
          <div className="f21-user-card">
            <span className="f21-user-avatar" aria-hidden="true">
              {USER.initials}
            </span>
            <span className="f21-user-copy">
              <strong className="f21-user-name">{USER.name}</strong>
              <span className="f21-user-role">{USER.role}</span>
            </span>
            <button type="button" className="f21-user-settings-btn" aria-label="User settings">
              <Settings size={15} strokeWidth={1.85} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="f21-main">
        <header className="f21-topbar">
          <div className="f21-breadcrumb">
            <span>{WORKSPACE.name}</span>
            <span className="f21-breadcrumb-sep">/</span>
            <span className="f21-breadcrumb-current">{breadcrumbFor(page)}</span>
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
              onClick={() => onNavigate("context")}
              aria-label="Ask Fuel AI"
            >
              <Sparkles size={13} strokeWidth={2.0} aria-hidden="true" />
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
            <button type="button" className="f21-icon-btn" aria-label="Notifications">
              <Bell size={15} strokeWidth={1.85} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="f21-workspace-layout">
          <main className="f21-content">{children}</main>

          {/* Gmail-Style Right Companion Dock with Multicolor Filled Icons & Hover Tooltips */}
          <aside
            className="f21-right-dock"
            aria-label="Workspace Quick Companion"
          >
            {/* Group 1: Input (Company, Profile, Context, R&D, GTM, G&A) */}
            <div className="f21-dock-group" aria-label="Input">
              {RIGHT_INPUT_ITEMS.map(item => {
                const Icon = item.icon;
                const active = activeItem === item.id || page === item.id;
                const meta = DOCK_ICON_META[item.id];
                return (
                  <div key={item.id} className="f21-dock-item-wrap">
                    <button
                      type="button"
                      className={`f21-dock-item${active ? " is-active" : ""}`}
                      data-dock={item.id}
                      style={meta ? ({ ["--dock-wash"]: meta.wash } as CSSProperties) : undefined}
                      onClick={() => handleRightItemClick(item)}
                      aria-label={`${item.label} (${item.group}) — ${item.description}`}
                    >
                      <span className="f21-dock-icon" aria-hidden="true">
                        <Icon width={20} height={20} color={meta?.color} />
                      </span>
                    </button>
                    <div className="f21-dock-tooltip" role="tooltip">
                      <strong className="f21-dock-tooltip-title">{item.label}</strong>
                      <p className="f21-dock-tooltip-desc">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="f21-dock-divider" role="separator" />

            {/* Group 2: Action & Analysis (Intelligence, Initiatives, Data room) */}
            <div className="f21-dock-group" aria-label="Action & Analysis">
              {RIGHT_ACTION_ITEMS.map(item => {
                const Icon = item.icon;
                const active = activeItem === item.id;
                const meta = DOCK_ICON_META[item.id];
                return (
                  <div key={item.id} className="f21-dock-item-wrap">
                    <button
                      type="button"
                      className={`f21-dock-item${active ? " is-active" : ""}`}
                      data-dock={item.id}
                      style={meta ? ({ ["--dock-wash"]: meta.wash } as CSSProperties) : undefined}
                      onClick={() => handleRightItemClick(item)}
                      aria-label={`${item.label} (${item.group}) — ${item.description}`}
                    >
                      <span className="f21-dock-icon" aria-hidden="true">
                        <Icon width={20} height={20} color={meta?.color} />
                      </span>
                    </button>
                    <div className="f21-dock-tooltip" role="tooltip">
                      <strong className="f21-dock-tooltip-title">{item.label}</strong>
                      <p className="f21-dock-tooltip-desc">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
