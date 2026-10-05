/** Shared Super Admin nav taxonomy — shell + overview stay in sync. */

export type AdminNavItem = {
  href: string;
  label: string;
  /** SVG path `d` in 20×20 viewBox — Shell-compatible stroke icons. */
  icon: string;
  blurb: string;
  /** Highest-traffic destinations — Overview Frequent + rail emphasis. */
  frequent?: boolean;
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        href: "/super-admin",
        label: "Overview",
        icon: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z",
        blurb: "Platform analytics, shortcuts, and every Super Admin area.",
      },
      {
        href: "/super-admin/users",
        label: "Users",
        icon: "M10 11a4 4 0 100-8 4 4 0 000 8zM3 18c0-3.5 3.1-6 7-6s7 2.5 7 6",
        blurb: "Cognito signups, onboarding status, and workspace plans.",
        frequent: true,
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        href: "/super-admin/signals",
        label: "Signals",
        icon: "M3 12h2.5l2-7 3 14 2.5-7H17",
        blurb: "Metrics and observations from context ingest.",
      },
      {
        href: "/super-admin/cohorts",
        label: "Cohorts",
        icon: "M3 16V9M8 16V5M13 16v-6M18 16v-3",
        blurb: "Peer distributions for benchmark overlays.",
      },
      {
        href: "/super-admin/playbooks",
        label: "Playbooks",
        icon: "M4 3h9l3 3v11H4zM4 7h9",
        blurb: "Operating frameworks and system prompts.",
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        href: "/super-admin/credits",
        label: "Credits",
        icon: "M3 7h14v3H3zM3 12h14v3H3zM5 5h10",
        blurb: "Plans, action costs, and top-up packs by flow.",
        frequent: true,
      },
      {
        href: "/super-admin/coupons",
        label: "Coupons",
        icon: "M3 7.5 5.5 4h9L17 7.5v8.5H3zM7 11h6",
        blurb: "Stripe campaigns, promotion codes, and recipient email.",
        frequent: true,
      },
    ],
  },
  {
    label: "Network",
    items: [
      {
        href: "/super-admin/service-providers",
        label: "Service providers",
        icon: "M4 8h12l-1.5 8h-9zM8 8V5h4v3",
        blurb: "Global and York-internal directory.",
      },
      {
        href: "/super-admin/advisors",
        label: "Advisors",
        icon: "M10 9a3 3 0 100-6 3 3 0 000 6zM4 17c0-3 3-5 6-5s6 2 6 5",
        blurb: "Instance advisors for every account.",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/super-admin/chips",
        label: "Chips management",
        icon: "M6 3.5h8v13H6zM8.5 7h3M8.5 10h3M8.5 13h2",
        blurb: "Partner headlines for insight chips.",
      },
      {
        href: "/super-admin/faq",
        label: "Help & FAQ",
        icon: "M10 16.5a1 1 0 100-2 1 1 0 000 2zM7.8 7.2C8.3 5.6 9.2 4.5 10.6 4.5c1.5 0 2.6 1.1 2.6 2.6 0 1.3-.9 1.9-1.9 2.5-.7.4-1.2.8-1.2 1.7V12",
        blurb: "Questions, publish state, and order.",
      },
    ],
  },
];

export function adminNavItemsFlat(): AdminNavItem[] {
  return ADMIN_NAV_GROUPS.flatMap((g) => g.items);
}

export function adminFrequentItems(): AdminNavItem[] {
  return adminNavItemsFlat().filter((item) => item.frequent);
}

/** Shortcut strip — every area except Overview itself. */
export function adminShortcutItems(): AdminNavItem[] {
  return adminNavItemsFlat().filter((item) => item.href !== "/super-admin");
}

export function resolveAdminLocation(pathname: string): {
  group: string | null;
  title: string;
  href: string;
} {
  const path = pathname || "/super-admin";
  if (path === "/super-admin") {
    return { group: "Platform", title: "Overview", href: "/super-admin" };
  }

  let best: { group: string; title: string; href: string } | null = null;
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === "/super-admin") continue;
      if (path === item.href || path.startsWith(`${item.href}/`)) {
        if (!best || item.href.length > best.href.length) {
          best = { group: group.label, title: item.label, href: item.href };
        }
      }
    }
  }

  if (best) return best;
  return { group: null, title: "Super Admin", href: "/super-admin" };
}
