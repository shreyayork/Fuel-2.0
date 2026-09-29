"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BreadcrumbSegment = { label: string; href?: string };

type BreadcrumbContextValue = {
  base: BreadcrumbSegment[];
  setBase: (segments: BreadcrumbSegment[]) => void;
  override: BreadcrumbSegment[] | null;
  setOverride: (segments: BreadcrumbSegment[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState<BreadcrumbSegment[]>([]);
  const [override, setOverride] = useState<BreadcrumbSegment[] | null>(null);
  const value = useMemo(
    () => ({ base, setBase, override, setOverride }),
    [base, override],
  );
  return (
    <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
  );
}

/** Sync route-derived breadcrumb from AppShell when pathname changes. */
export function BreadcrumbBase({ segments }: { segments: BreadcrumbSegment[] }) {
  const ctx = useContext(BreadcrumbContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setBase(segments);
    return () => ctx.setBase([]);
  }, [ctx, segments]);
  return null;
}

/** Let a page append/replace breadcrumb segments (e.g. watchlist name on detail). */
export function useBreadcrumbOverride(segments: BreadcrumbSegment[] | null) {
  const ctx = useContext(BreadcrumbContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setOverride(segments);
    return () => ctx.setOverride(null);
  }, [ctx, segments]);
}

export function useBreadcrumbTrail(): BreadcrumbSegment[] {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) return [];
  return ctx.override ?? ctx.base;
}
