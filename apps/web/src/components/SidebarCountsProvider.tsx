"use client";

import { createContext, Suspense, use, useContext, type ReactNode } from "react";
import type { SidebarCounts } from "./Shell";

const ZERO_COUNTS: SidebarCounts = {
  advisors: 0,
  serviceProviders: 0,
  investors: 0,
  pipeline: 0,
};

const SidebarCountsContext = createContext<SidebarCounts>(ZERO_COUNTS);

export function useSidebarCounts(): SidebarCounts {
  return useContext(SidebarCountsContext);
}

function ResolvedCounts({
  promise,
  children,
}: {
  promise: Promise<SidebarCounts>;
  children: ReactNode;
}) {
  const counts = use(promise);
  return (
    <SidebarCountsContext.Provider value={counts}>{children}</SidebarCountsContext.Provider>
  );
}

export function SidebarCountsProvider({
  counts,
  countsPromise,
  children,
}: {
  counts?: SidebarCounts;
  countsPromise?: Promise<SidebarCounts>;
  children: ReactNode;
}) {
  if (countsPromise) {
    return (
      <Suspense
        fallback={
          <SidebarCountsContext.Provider value={counts ?? ZERO_COUNTS}>
            {children}
          </SidebarCountsContext.Provider>
        }
      >
        <ResolvedCounts promise={countsPromise}>{children}</ResolvedCounts>
      </Suspense>
    );
  }
  return (
    <SidebarCountsContext.Provider value={counts ?? ZERO_COUNTS}>
      {children}
    </SidebarCountsContext.Provider>
  );
}
