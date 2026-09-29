import type { ReactNode } from "react";

/**
 * Public route group — no session check, no AppShell. Pages rendered here are
 * world-visible. Each page decides what to show and, if it wants, calls
 * getSession() itself to offer a "log in for more" path to signed-in users.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
