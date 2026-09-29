"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { THEMES, type Theme, type ThemeMode } from "@/lib/theme";
import type { Company, FuelDataset } from "@/lib/types";
import {
  fetchRecentCompanies,
  migrateLegacyRecentCompanies,
  type RecentCompany,
} from "@/lib/recent-companies";
import { AgentDrawerProvider } from "./AgentDrawer";
import {
  BreadcrumbBase,
  BreadcrumbProvider,
  type BreadcrumbSegment,
} from "./BreadcrumbContext";
import { Shell, type AccountOption, type SidebarCounts, type SidebarUser } from "./Shell";
import { SidebarCountsProvider } from "./SidebarCountsProvider";
import { ThemeContext } from "./ThemeContext";
import { WorkspaceTourProviderGate } from "./workspace-tour/WorkspaceTourProviderGate";
import { CreditProvider, type InitialCredits } from "./credits/CreditProvider";
import { CreditToastHost } from "./credits/CreditToast";
import { UpgradeModal } from "./credits/UpgradeModal";
import { ToastProvider } from "./toast/ToastProvider";

// Isomorphic layout effect: on the server `useLayoutEffect` is a no-op (and
// would warn), so we pick it based on environment. On the client we want the
// sync-before-paint semantics so the stored theme is applied before React
// paints the default-theme frame — otherwise every route change flashes.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function usePersistentState<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useIsoLayoutEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored && stored !== value) setValue(stored as T);
    // Only want this on mount — further syncs happen via the setter below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue];
}

export interface AppShellProps {
  data: FuelDataset;
  eyebrow?: string;
  activeNavKey?: string;
  currentUser?: SidebarUser | null;
  counts?: SidebarCounts;
  countsPromise?: Promise<SidebarCounts>;
  groups?: string[];
  accountList?: AccountOption[];
  activeAccountId?: string | null;
  activeAccountName?: string | null;
  /** Account-wide flag — when true, Pipeline + Portfolio nav items show. */
  portfolioManagerEnabled?: boolean;
  /** SSR-fetched recently viewed companies (DB-backed, claimed excluded). */
  initialRecentCompanies?: RecentCompany[];
  initialCredits?: InitialCredits | null;
  children: ReactNode;
}

/**
 * Client-side chrome: sidebar + top header + theme toggle. Wraps every route
 * with the default Fuel 2.0 layout. When a nav item or portfolio company is
 * clicked on a detail route, we push to `/` with a query param that the home
 * page picks up — keeps a single authoritative Shell instance.
 *
 * Descendants read the active Theme from ThemeContext (via `useTheme`).
 */
export function AppShell({
  data,
  eyebrow,
  activeNavKey,
  currentUser,
  counts,
  countsPromise,
  groups,
  accountList,
  activeAccountId,
  activeAccountName,
  portfolioManagerEnabled,
  initialRecentCompanies = [],
  initialCredits,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [navPending, startTransition] = useTransition();
  const [mode, setMode] = usePersistentState<ThemeMode>("fuel:theme", "signal");

  const navigate = useCallback(
    (href: string) => {
      window.dispatchEvent(new Event("fuel:nav-start"));
      startTransition(() => router.push(href));
    },
    [router],
  );

  // Derive eyebrow + activeNavKey from the pathname when not explicitly
  // passed. Lets every page.tsx skip wiring these — the shell figures it out.
  const derived = useMemo(() => deriveFromPath(pathname ?? "/", data), [pathname, data]);
  const activeKey = activeNavKey ?? derived.activeNavKey;
  const label = eyebrow ?? derived.eyebrow;

  const t: Theme = { ...THEMES[mode], mode };

  const [recents, setRecents] = useState<RecentCompany[]>(initialRecentCompanies);
  useEffect(() => {
    setRecents(initialRecentCompanies);
  }, [initialRecentCompanies]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ entries?: RecentCompany[] }>).detail;
      if (detail?.entries) {
        setRecents(detail.entries);
        return;
      }
      void fetchRecentCompanies().then(setRecents);
    };
    window.addEventListener("fuel:recents-updated", onUpdated);
    return () => window.removeEventListener("fuel:recents-updated", onUpdated);
  }, []);

  // One-shot localStorage → DB migrate (legacy clients only).
  useEffect(() => {
    void migrateLegacyRecentCompanies().then((merged) => {
      if (merged) setRecents(merged);
    });
  }, [activeAccountId]);

  // Every nav key maps to a real route. "engage" stays as a key for back-compat.
  const NAV_ROUTES: Record<string, string> = {
    pipeline: "/pipeline",
    portfolio: "/portfolio",
    watchlists: "/watchlists",
    engage: "/initiatives",
    benchmarks: "/benchmarks",
    playbooks: "/playbooks",
    advisors: "/advisors",
    providers: "/service-providers",
    investors: "/investors",
    help: "/help",
    profile: "/account/profile",
    account: "/account",
  };

  const goToPage = (p: string) => {
    const route = NAV_ROUTES[p] ?? `/?page=${encodeURIComponent(p)}`;
    navigate(route);
  };

  const openCompany = (co: Company) => {
    navigate(`/?openCoId=${co.id}`);
  };

  const openRecent = (uuid: string) => {
    navigate(`/company/${encodeURIComponent(uuid)}`);
  };

  return (
    <ThemeContext.Provider value={t}>
      <ToastProvider>
        <CreditProvider initialCredits={initialCredits}>
          <AgentDrawerProvider>
            <WorkspaceTourProviderGate>
              <SidebarCountsProvider counts={counts} countsPromise={countsPromise}>
                <BreadcrumbProvider>
                  <BreadcrumbBase segments={derived.breadcrumb} />
                  <Shell
                    t={t}
                    mode={mode}
                    setMode={setMode}
                    page={activeKey}
                    setPage={goToPage}
                    eyebrow={label}
                    data={data}
                    onOpenCo={openCompany}
                    recentCompanies={recents}
                    onOpenRecent={openRecent}
                    currentUser={currentUser}
                    counts={counts}
                    groups={groups}
                    accountList={accountList}
                    activeAccountId={activeAccountId}
                    activeAccountName={activeAccountName}
                    portfolioManagerEnabled={portfolioManagerEnabled}
                    navPending={navPending}
                  >
                    {children}
                  </Shell>
                </BreadcrumbProvider>
              </SidebarCountsProvider>
            </WorkspaceTourProviderGate>
          </AgentDrawerProvider>
          <UpgradeModal />
          <CreditToastHost />
        </CreditProvider>
      </ToastProvider>
    </ThemeContext.Provider>
  );
}

interface DerivedPage {
  activeNavKey: string;
  eyebrow: string;
  breadcrumb: BreadcrumbSegment[];
}

/**
 * Derive eyebrow + activeNavKey from pathname so individual pages don't
 * have to hard-code them. Company pages pull the subject's name from the
 * dataset when available so the breadcrumb still reads nicely.
 */
function deriveFromPath(pathname: string, data: FuelDataset): DerivedPage {
  const seg = pathname.split("/").filter(Boolean);
  const top = seg[0] ?? "";
  switch (top) {
    case "":
      return { activeNavKey: "", eyebrow: "Dashboard", breadcrumb: [{ label: "Dashboard" }] };
    case "pipeline":
      return { activeNavKey: "pipeline", eyebrow: "Pipeline", breadcrumb: [{ label: "Pipeline" }] };
    case "portfolio":
      return {
        activeNavKey: "portfolio",
        eyebrow: seg[1] ? "Portfolio" : "Portfolios",
        breadcrumb: seg[1]
          ? [{ label: "Portfolios", href: "/portfolio" }]
          : [{ label: "Portfolios" }],
      };
    case "watchlists":
      return {
        activeNavKey: "watchlists",
        eyebrow: seg[1] ? "Watchlist" : "Watchlists",
        breadcrumb: seg[1]
          ? [{ label: "Watchlists", href: "/watchlists" }]
          : [{ label: "Watchlists" }],
      };
    case "initiatives":
      return { activeNavKey: "engage", eyebrow: "Initiatives", breadcrumb: [{ label: "Initiatives" }] };
    case "benchmarks":
      return { activeNavKey: "benchmarks", eyebrow: "Benchmarks", breadcrumb: [{ label: "Benchmarks" }] };
    case "playbooks":
      return { activeNavKey: "playbooks", eyebrow: "Playbooks", breadcrumb: [{ label: "Playbooks" }] };
    case "advisors":
      return { activeNavKey: "advisors", eyebrow: "Advisors", breadcrumb: [{ label: "Advisors" }] };
    case "investors":
      return { activeNavKey: "investors", eyebrow: "Investors", breadcrumb: [{ label: "Investors" }] };
    case "service-providers":
      return {
        activeNavKey: "providers",
        eyebrow: "Service providers",
        breadcrumb: [{ label: "Service providers" }],
      };
    case "help":
      return {
        activeNavKey: "help",
        eyebrow: "Help & FAQ",
        breadcrumb: [{ label: "Help & FAQ" }],
      };
    case "profile":
      // Legacy `/profile` redirects to `/account/profile`; keep key for back-compat.
      return {
        activeNavKey: "profile",
        eyebrow: "Account · Profile",
        breadcrumb: [
          { label: "Account", href: "/account/profile" },
          { label: "Profile" },
        ],
      };
    case "account": {
      const sub = seg[1];
      const label =
        sub === "profile" ? "Profile"
        : sub === "users" ? "Users"
        : sub === "teams" ? "Teams"
        : sub === "settings" ? "Settings"
        : sub === "integrations" ? "Integrations"
        : sub === "developer" ? "Developer"
        : sub === "usage" ? "Usage"
        : sub === "billing" ? "Billing"
        : "Overview";
      return {
        activeNavKey: sub === "profile" ? "profile" : "account",
        eyebrow: `Account · ${label}`,
        breadcrumb: [
          { label: "Account", href: "/account/profile" },
          { label },
        ],
      };
    }
    case "company": {
      // /company/[uuid] routes are keyed by fuel-data UUID which isn't in
      // the fixture dataset — the company card itself sets its own eyebrow,
      // so fall back to a generic label here.
      return { activeNavKey: "", eyebrow: "Company", breadcrumb: [{ label: "Company" }] };
    }
    default: {
      const label = top.charAt(0).toUpperCase() + top.slice(1);
      return { activeNavKey: "", eyebrow: label, breadcrumb: [{ label }] };
    }
  }
}
