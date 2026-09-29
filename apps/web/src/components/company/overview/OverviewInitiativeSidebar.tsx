"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { InitiativeDetailDrawer } from "@/components/company/initiatives/InitiativesTab";
import type {
  CompanyAdvisorSummary,
  CompanyInitiativeSummary,
  CompanySignalObservation,
  SignalCatalogEntry,
} from "@/components/views/CompanyPublicView";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import type { SignalCatalogItem } from "@/lib/signals/group-catalog";
import { useOverviewTheme } from "@/components/company/overview/overview-theme";

type InitiativesPageResponse = {
  data: CompanyInitiativeSummary[];
};

async function fetchInitiativeSummary(
  companyUuid: string,
  initiativeId: string,
  signal: AbortSignal,
): Promise<CompanyInitiativeSummary | null> {
  const byId = await fetch(
    `/api/company/${companyUuid}/initiatives?id=${encodeURIComponent(initiativeId)}`,
    { signal, cache: "no-store" },
  );
  if (byId.ok) {
    const payload = (await byId.json()) as InitiativesPageResponse;
    const found = payload.data.find((item) => item.id === initiativeId);
    if (found) return found;
  }
  const pageSize = 50;
  for (const status of ["active", "completed"] as const) {
    let offset = 0;
    for (;;) {
      const params = new URLSearchParams({
        status,
        limit: String(pageSize),
        offset: String(offset),
      });
      const response = await fetch(
        `/api/company/${companyUuid}/initiatives?${params.toString()}`,
        { signal, cache: "no-store" },
      );
      if (!response.ok) throw new Error(`initiatives_fetch_${response.status}`);
      const payload = (await response.json()) as InitiativesPageResponse;
      const found = payload.data.find((item) => item.id === initiativeId);
      if (found) return found;
      if (payload.data.length < pageSize) break;
      offset += pageSize;
      if (offset > 500) break;
    }
  }
  return null;
}

/**
 * Opens the shared InitiativeDetailDrawer from Overview track detail without
 * navigating to the Initiatives tab.
 */
export function OverviewInitiativeSidebar({
  companyUuid,
  initiativeId,
  seedInitiatives,
  advisorPool,
  availableIntelligence,
  signalCatalog,
  recentObservations,
  allowAdvisorLinking,
  onClose,
}: {
  companyUuid: string;
  initiativeId: string;
  seedInitiatives: CompanyInitiativeSummary[];
  advisorPool: CompanyAdvisorSummary[];
  availableIntelligence: CompanyIntelligenceRow[];
  signalCatalog: SignalCatalogEntry[];
  recentObservations: CompanySignalObservation[];
  allowAdvisorLinking: boolean;
  onClose: () => void;
}) {
  const t = useOverviewTheme();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const seed =
    seedInitiatives.find((row) => row.id === initiativeId) ?? null;
  const seedStatus = (seed?.status ?? "").toLowerCase();
  const optimisticSeed = seed
    ? {
        ...seed,
        status:
          seedStatus === "suggested" || seedStatus === "draft" ? "active" : seed.status,
      }
    : null;
  const [item, setItem] = useState<CompanyInitiativeSummary | null>(optimisticSeed);
  const [loadError, setLoadError] = useState<string | null>(null);
  const seedKey = seed ? `${seed.id}:${seed.status}` : "";

  useEffect(() => {
    const nextOptimistic = seed
      ? {
          ...seed,
          status:
            (seed.status ?? "").toLowerCase() === "suggested" ||
            (seed.status ?? "").toLowerCase() === "draft"
              ? "active"
              : seed.status,
        }
      : null;
    if (nextOptimistic) {
      setItem(nextOptimistic);
      setLoadError(null);
    }
    const controller = new AbortController();
    if (!nextOptimistic) {
      setItem(null);
      setLoadError(null);
    }
    void (async () => {
      try {
        const found = await fetchInitiativeSummary(
          companyUuid,
          initiativeId,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (!found) {
          if (!nextOptimistic) setLoadError("Could not open this initiative.");
          return;
        }
        setItem(found);
      } catch (error) {
        if (controller.signal.aborted || (error as Error).name === "AbortError") {
          return;
        }
        Sentry.captureException(error);
        if (!nextOptimistic) setLoadError("Could not open this initiative.");
      }
    })();
    return () => controller.abort();
  }, [companyUuid, initiativeId, seedKey]);

  if (loadError) {
    return (
      <div role="alert" style={{ position: "fixed", inset: 0, zIndex: 80 }}>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          style={{
            background: "rgba(12, 26, 37, 0.35)",
            border: 0,
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 12,
            color: t.ink,
            fontFamily: t.sans,
            fontSize: 14,
            left: "50%",
            maxWidth: 360,
            padding: 20,
            position: "absolute",
            top: "20%",
            transform: "translateX(-50%)",
          }}
        >
          <p style={{ margin: "0 0 12px" }}>{loadError}</p>
          <button type="button" onClick={onClose} style={{ cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const catalog: SignalCatalogItem[] = signalCatalog.map((entry) => ({
    id: entry.id,
    label: entry.label,
    category: entry.category,
    kind: entry.kind,
    unit: entry.unit,
  }));

  return (
    <InitiativeDetailDrawer
      key={item.id}
      t={t}
      companyUuid={companyUuid}
      item={item}
      advisorPool={advisorPool}
      allowAdvisorLinking={allowAdvisorLinking}
      availableIntelligence={availableIntelligence}
      signalCatalog={catalog}
      recentObservations={recentObservations}
      onClose={onClose}
      onStatusTabChange={() => {
        onClose();
        router.refresh();
      }}
      onStart={(cb) => {
        startTransition(async () => {
          try {
            await cb();
          } finally {
            router.refresh();
          }
        });
      }}
      onIntelligenceLinksSaved={(intelligenceLinks) => {
        setItem((prev) =>
          prev ? { ...prev, intelligenceLinks } : prev,
        );
      }}
    />
  );
}
