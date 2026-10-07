"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";
import { BREAKPOINTS, mqMax, useMediaQuery } from "@/lib/responsive";
import type { DataRoomDocumentSlot, DataRoomSnapshot } from "@/lib/data-room/types";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import { totalRemaining } from "@/lib/credits/logic";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import { AddScreenShell } from "@/components/drawer/AddScreenShell";
import { drawerCloseBtnStyle } from "@/components/drawer/styles";
import { IntelligenceSourcesPanel } from "./IntelligenceSourcesPanel";

/**
 * Canonical Add Source drawer (Intelligence UI). Used from Intelligence and Overview.
 */
export function AddSourceDrawer({
  t,
  open,
  companyUuid,
  documentSlots: documentSlotsProp,
  creditBalance: creditBalanceProp,
  onClose,
  onSaved,
  onBalanceChange,
  onItemsChange,
  onDataRoomSnapshot,
  onDocumentNotice,
  onIntelligenceGenerated,
}: {
  t: Theme;
  open: boolean;
  companyUuid: string;
  /** When omitted, slots load from the data-room API while open. */
  documentSlots?: DataRoomDocumentSlot[];
  creditBalance?: number;
  onClose: () => void;
  /** Called after a successful generate (Overview refresh, etc.). */
  onSaved?: () => void | Promise<void>;
  onBalanceChange?: (balance: number) => void;
  onItemsChange?: (items: CompanyIntelligenceRow[]) => void;
  onDataRoomSnapshot?: (snapshot: DataRoomSnapshot) => void;
  onDocumentNotice?: (message: string | null) => void;
  onIntelligenceGenerated?: (ids: string[], sourceTitle: string) => void;
}) {
  const presence = useDrawerPresence(open);
  const sheet = useMediaQuery(mqMax(BREAKPOINTS.md), false);
  const credits = useCreditsOptional();
  const [fetchedSlots, setFetchedSlots] = useState<DataRoomDocumentSlot[]>([]);

  useEffect(() => {
    if (documentSlotsProp) return;
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/company/${companyUuid}/data-room`);
        if (!res.ok) return;
        const json = (await res.json()) as { slots?: DataRoomDocumentSlot[] };
        if (!cancelled) setFetchedSlots(json.slots ?? []);
      } catch {
        if (!cancelled) setFetchedSlots([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, companyUuid, documentSlotsProp]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!presence.mounted) return null;

  const documentSlots = documentSlotsProp ?? fetchedSlots;
  const creditBalance =
    creditBalanceProp ??
    (credits?.snapshot ? totalRemaining(credits.snapshot) : 0);

  const panel = (
        <IntelligenceSourcesPanel
          t={t}
          companyUuid={companyUuid}
          documentSlots={documentSlots}
          creditBalance={creditBalance}
          onBalanceChange={onBalanceChange}
          onItemsChange={onItemsChange}
          onDataRoomSnapshot={(snapshot) => {
            if (!documentSlotsProp) setFetchedSlots(snapshot.slots);
            onDataRoomSnapshot?.(snapshot);
          }}
          onDocumentNotice={onDocumentNotice}
          onIntelligenceGenerated={onIntelligenceGenerated}
          onSuccess={onSaved}
          forceShowForm
          onCancel={onClose}
        />
  );

  if (sheet) {
    return (
      <AddScreenShell t={t} title="Add source" onClose={onClose} zIndex={90}>
        {panel}
      </AddScreenShell>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close add source"
        onClick={onClose}
        style={{
          background: t.overlay,
          border: "none",
          bottom: 0,
          cursor: "pointer",
          left: 0,
          position: "fixed",
          right: 0,
          top: 0,
          zIndex: 70,
          ...drawerScrimMotionStyle(presence.visible, presence.durationMs),
        }}
      />
      <aside
        role="dialog"
        aria-modal
        aria-label="Add source"
        style={{
          background: t.panel,
          borderLeft: `1px solid ${t.rule}`,
          bottom: 0,
          boxShadow: `-24px 0 60px ${t.overlay}`,
          display: "flex",
          flexDirection: "column",
          maxWidth: 560,
          position: "fixed",
          right: 0,
          top: 0,
          width: "min(100vw, 560px)",
          zIndex: 71,
          ...drawerPanelMotionStyle(presence.visible, presence.durationMs, { from: "right" }),
        }}
      >
        <header
          style={{
            alignItems: "flex-start",
            background: t.panel,
            borderBottom: `1px solid ${t.ruleSoft}`,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            padding: "16px 18px",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <h2
              style={{
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Add source
            </h2>
            <p
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 12,
                lineHeight: 1.45,
                margin: "6px 0 0",
              }}
            >
              Capture notes or attach a document, then generate intelligence for your timeline.
            </p>
          </div>
          <button
            type="button"
            className="fuel-drawer-close"
            aria-label="Close"
            onClick={onClose}
            style={drawerCloseBtnStyle(t)}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4 4l8 8M12 4L4 12"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        {panel}
      </aside>
    </>
  );
}
