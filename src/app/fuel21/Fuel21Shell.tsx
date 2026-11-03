import type { ReactNode } from "react";
import {
  Bell,
  ChevronsUpDown,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Moon,
  Search,
  Sun,
  Code2,
  Megaphone,
  Landmark,
  Layers,
  Rocket,
  Activity,
  FolderOpen,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { FuelPlatformMark } from "./FuelPlatformMark.tsx";
import {
  NAV_ITEMS,
  RECENTLY_VIEWED,
  USER,
  WORKSPACE,
  breadcrumbFor,
  type NavId,
} from "./demoData.ts";

const NAV_ICONS: Record<NavId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  rd: Code2,
  gtm: Megaphone,
  ga: Landmark,
  context: Layers,
  initiatives: Rocket,
  intelligence: Activity,
  "data-room": FolderOpen,
  advisors: Users,
  investors: ArrowUpRight,
};

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
  return (
    <div className="f21-app" data-f21-theme={theme}>
      <aside className="f21-sidebar">
        <div className="f21-sidebar-top">
          <FuelPlatformMark theme={theme} variant="full" className="f21-sidebar-logo" />

          <button type="button" className="f21-workspace-switcher" aria-label="Switch workspace">
            <span className="f21-workspace-avatar" aria-hidden="true">
              {WORKSPACE.initial}
            </span>
            <span className="f21-workspace-copy">
              <strong>{WORKSPACE.name}</strong>
              <em>{WORKSPACE.kind}</em>
            </span>
            <ChevronsUpDown size={14} strokeWidth={2} aria-hidden="true" />
          </button>

          <nav className="f21-nav" aria-label="Primary">
            {NAV_ITEMS.map(item => {
              const Icon = NAV_ICONS[item.id];
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`f21-nav-item${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="f21-recent">
            <div className="f21-recent-label">Recently viewed</div>
            {RECENTLY_VIEWED.map(item => (
              <button key={item.id} type="button" className="f21-recent-item">
                <FileText size={14} strokeWidth={2} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="f21-sidebar-foot">
          <button type="button" className="f21-help-link">
            <CircleHelp size={15} strokeWidth={2} aria-hidden="true" />
            <span>Help &amp; feedback</span>
          </button>
          <button type="button" className="f21-user-chip" aria-label="User menu">
            <span className="f21-user-avatar" aria-hidden="true">
              {USER.initials}
            </span>
            <span className="f21-user-copy">
              <strong>{USER.name}</strong>
              <em>{USER.role}</em>
            </span>
            <ChevronsUpDown size={14} strokeWidth={2} aria-hidden="true" />
          </button>
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
              <Search size={14} strokeWidth={2} aria-hidden="true" />
              <input type="search" placeholder="Search workspace" aria-label="Search workspace" />
              <kbd>⌘ K</kbd>
            </label>
            <button
              type="button"
              className="f21-icon-btn"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={onToggleTheme}
            >
              {theme === "dark" ? (
                <Moon size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Sun size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
            <button type="button" className="f21-icon-btn" aria-label="Notifications">
              <Bell size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="f21-content">{children}</div>
      </div>
    </div>
  );
}
