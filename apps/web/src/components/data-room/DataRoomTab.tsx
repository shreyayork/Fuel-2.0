"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Theme } from "@/lib/theme";
import type {
  DataRoomDocumentSlot,
  DataRoomFeedAttachment,
  DataRoomFileRecord,
  DataRoomSnapshot,
} from "@/lib/data-room/types";
import { slotsWithFiles } from "@/lib/data-room/slots";
import { DocumentHistorySidebar } from "./DocumentHistorySidebar";
import { DataRoomDownloadLink } from "./DataRoomDownloadLink";
import { DocumentUploadDropdown } from "./DocumentUploadDropdown";
import { DATA_ROOM_ACCEPT_EXTENSIONS } from "@/lib/data-room/constants";
import { postDataRoomUpload, type DataRoomUploadResult } from "@/lib/data-room/upload-client";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import {
  canAfford,
  formatActionInsufficientCreditsMessage,
  formatInsufficientCreditsMessage,
} from "@/lib/credits/logic";
import { useToast } from "@/components/toast/ToastProvider";
import { waitForDocumentInitiativesIdle } from "@/lib/initiatives/client";
import {
  dataRoomEmptyStyle,
  dataRoomHeadActionsStyle,
  dataRoomHeadStyle,
  dataRoomHistoryBtnStyle,
  dataRoomIntelligenceLinkStyle,
  dataRoomRowStyle,
  dataRoomTableStyle,
  dataRoomUploadBtnStyle,
} from "./styles";
import { useNarrow } from "@/lib/responsive";

function useNarrowLayout(breakpoint = 900) {
  return useNarrow(breakpoint);
}

function findSlot(slots: DataRoomDocumentSlot[], typeId: string) {
  return slots.find((slot) => slot.typeId === typeId) ?? null;
}

function IntelligenceCell({
  t,
  record,
  onViewIntelligence,
}: {
  t: Theme;
  record: DataRoomFileRecord | DataRoomFeedAttachment;
  onViewIntelligence?: (intelligenceIds: string[]) => void;
}) {
  if (record.intelligenceCount <= 0 || record.observationIds.length === 0) {
    return <span style={{ color: t.muted }}>—</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onViewIntelligence?.(record.observationIds)}
      style={dataRoomIntelligenceLinkStyle(t)}
    >
      {record.intelligenceCount} generated →
    </button>
  );
}

export function DataRoomTab({
  t,
  companyUuid,
  initialSnapshot,
  onSnapshot,
  onViewIntelligence,
  creditBalance,
  onCreditBalanceChange,
  onIntelligenceRefresh,
}: {
  t: Theme;
  companyUuid: string;
  initialSnapshot: DataRoomSnapshot;
  onSnapshot?: (snapshot: DataRoomSnapshot) => void;
  onViewIntelligence?: (intelligenceIds: string[]) => void;
  creditBalance?: number;
  onCreditBalanceChange?: (balance: number) => void;
  onIntelligenceRefresh?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [processingTypeId, setProcessingTypeId] = useState<string | null>(null);
  const [historySlot, setHistorySlot] = useState<DataRoomDocumentSlot | null>(null);
  const narrow = useNarrowLayout();
  const initiativeWaitGen = useRef(0);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const filledSlots = useMemo(() => slotsWithFiles(snapshot.slots), [snapshot.slots]);
  const hasVaultDocs = snapshot.activeCount > 0;
  const hasFeedAttachments = snapshot.feedAttachments.length > 0;

  const applySnapshot = (next: DataRoomSnapshot) => {
    setSnapshot(next);
    onSnapshot?.(next);
    setProcessingTypeId(null);
    if (historySlot) {
      setHistorySlot(findSlot(next.slots, historySlot.typeId));
    }
  };

  const handleUploadStart = (typeId: string | null) => {
    setProcessingTypeId(typeId);
  };

  const handleUploadResult = (result: DataRoomUploadResult) => {
    if (result.ok && result.creditSnapshot) {
      onCreditBalanceChange?.(
        Math.max(
          0,
          result.creditSnapshot.monthlyLimit +
            result.creditSnapshot.topUpBalance -
            result.creditSnapshot.monthlyUsed,
        ),
      );
    } else if (result.ok && typeof result.creditBalance === "number") {
      onCreditBalanceChange?.(result.creditBalance);
    }
    if (result.ok && result.intelligenceIds?.length) {
      void onIntelligenceRefresh?.();
    }
    if (result.ok && result.initiativesGenerating) {
      const gen = ++initiativeWaitGen.current;
      void waitForDocumentInitiativesIdle(companyUuid).then(() => {
        if (gen !== initiativeWaitGen.current) return;
        router.refresh();
      });
    }
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        fontFamily: t.sans,
        gap: 16,
        marginTop: 16,
      }}
    >
      <div
        style={{
          ...dataRoomHeadStyle(),
          alignItems: "center",
        }}
      >
        <h2
          style={{
            color: t.ink,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: 0,
            minWidth: 0,
          }}
        >
          Data Room
        </h2>
        <div style={dataRoomHeadActionsStyle()}>
          <DocumentUploadDropdown
            t={t}
            companyUuid={companyUuid}
            documentSlots={snapshot.slots}
            processingTypeId={processingTypeId}
            uploadSource="data_room"
            creditBalance={creditBalance}
            iconOnly
            onSnapshot={applySnapshot}
            onUploadStart={handleUploadStart}
            onUploadResult={handleUploadResult}
          />
        </div>
      </div>

      {!hasVaultDocs ? (
        <div style={dataRoomEmptyStyle(t)}>
          <strong
            style={{
              color: t.ink,
              display: "block",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            No documents yet
          </strong>
          <p
            style={{
              color: t.muted,
              fontSize: 13,
              lineHeight: 1.55,
              margin: "8px 0 0",
              maxWidth: 620,
            }}
          >
            Tap + to choose a file, tag the type, and upload it to this company.
          </p>
        </div>
      ) : (
        <div style={dataRoomTableStyle(t)}>
          <div style={{ ...dataRoomRowStyle(t, { isHead: true, narrow }), background: `${t.panelAlt}8C` }}>
            <span>Type</span>
            <span>Latest file</span>
            <span>Format</span>
            <span>Uploaded</span>
            <span>Intelligence</span>
            <span style={{ textAlign: "center" }}>Actions</span>
          </div>
          {filledSlots.map((slot) => (
            <div
              key={slot.typeId}
              style={dataRoomRowStyle(t, {
                isCustom: slot.typeId.startsWith("custom:"),
                narrow,
              })}
            >
              <strong style={{ color: t.ink, fontSize: 13, fontWeight: 600 }}>{slot.typeLabel}</strong>
              <span
                style={{
                  color: t.inkSoft,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {slot.current?.name ?? "—"}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>{slot.current?.format ?? "—"}</span>
              <span style={{ whiteSpace: "nowrap" }}>{slot.current?.uploadedAt ?? "—"}</span>
              <span>
                {slot.current ? (
                  <IntelligenceCell
                    t={t}
                    record={slot.current}
                    onViewIntelligence={onViewIntelligence}
                  />
                ) : (
                  "—"
                )}
              </span>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 6,
                  justifyContent: "center",
                }}
              >
                <ReplaceRowButton
                  t={t}
                  companyUuid={companyUuid}
                  slot={slot}
                  processingTypeId={processingTypeId}
                  onUploadStart={handleUploadStart}
                  onSnapshot={applySnapshot}
                  creditBalance={creditBalance}
                  onUploadResult={handleUploadResult}
                />
                {slot.current || slot.history.length > 0 ? (
                  <HistoryRowButton
                    t={t}
                    slot={slot}
                    onOpen={() => setHistorySlot(slot)}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasFeedAttachments ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div
              style={{
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              From context feed
            </div>
            <p
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 12,
                lineHeight: 1.5,
                margin: "4px 0 0",
              }}
            >
              Files attached to notes, email, and integrations — aggregated here alongside your
              typed vault documents.
            </p>
          </div>
          <div style={dataRoomTableStyle(t)}>
            <div
              style={{
                ...dataRoomRowStyle(t, { isHead: true, narrow }),
                background: `${t.panelAlt}8C`,
              }}
            >
              <span>Source</span>
              <span>File</span>
              <span>Format</span>
              <span>Uploaded</span>
              <span>Intelligence</span>
              <span style={{ textAlign: "center" }}>Download</span>
            </div>
            {snapshot.feedAttachments.map((attachment) => (
              <div
                key={attachment.id}
                style={dataRoomRowStyle(t, { narrow })}
              >
                <span style={{ color: t.inkSoft }}>{attachment.source}</span>
                <span
                  style={{
                    color: t.ink,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.name}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>{attachment.format}</span>
                <span style={{ whiteSpace: "nowrap" }}>{attachment.uploadedAt}</span>
                <IntelligenceCell
                  t={t}
                  record={attachment}
                  onViewIntelligence={onViewIntelligence}
                />
                <div style={{ textAlign: "center" }}>
                  <DataRoomDownloadLink t={t} href={attachment.downloadPath} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {historySlot ? (
        <DocumentHistorySidebar
          t={t}
          slot={historySlot}
          onClose={() => setHistorySlot(null)}
          onViewIntelligence={onViewIntelligence}
        />
      ) : null}
    </section>
  );
}

function HistoryRowButton({
  t,
  slot,
  onOpen,
}: {
  t: Theme;
  slot: DataRoomDocumentSlot;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      aria-label={`View history for ${slot.typeLabel}`}
      title="Document history"
      style={dataRoomHistoryBtnStyle(t, hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      ⧗
    </button>
  );
}

function ReplaceRowButton({
  t,
  companyUuid,
  slot,
  processingTypeId,
  onUploadStart,
  onSnapshot,
  creditBalance,
  onUploadResult,
}: {
  t: Theme;
  companyUuid: string;
  slot: DataRoomDocumentSlot;
  processingTypeId: string | null;
  onUploadStart: (typeId: string | null) => void;
  onSnapshot: (snapshot: DataRoomSnapshot) => void;
  creditBalance?: number;
  onUploadResult?: (result: DataRoomUploadResult) => void;
}) {
  const { showToast } = useToast();
  const credits = useCreditsOptional();
  const docUploadCost =
    credits?.actionCosts.find((row) => row.action === "docUpload")?.cost ?? 20;
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
  const isProcessing = processingTypeId === slot.typeId;
  const isBusy = Boolean(processingTypeId);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={DATA_ROOM_ACCEPT_EXTENSIONS}
        style={{ display: "none" }}
        disabled={isBusy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const snapshot = credits?.snapshot ?? null;
          if (snapshot) {
            if (!canAfford(snapshot, docUploadCost)) {
              showToast({
                message: formatActionInsufficientCreditsMessage(snapshot, docUploadCost),
                variant: "error",
              });
              return;
            }
          } else if (typeof creditBalance === "number" && creditBalance < docUploadCost) {
            showToast({
              message: formatInsufficientCreditsMessage(docUploadCost, creditBalance),
              variant: "error",
            });
            return;
          }
          onUploadStart(slot.typeId);
          const result = await postDataRoomUpload({
            companyUuid,
            typeId: slot.typeId,
            typeLabel: slot.typeLabel,
            file,
            source: "data_room",
          });
          if (result.snapshot) {
            onSnapshot(result.snapshot);
          }
          onUploadResult?.(result);
          if (!result.ok) {
            showToast({ message: result.message, variant: "error" });
          }
          onUploadStart(null);
        }}
      />
      <button
        type="button"
        style={dataRoomUploadBtnStyle(t, { processing: isProcessing, disabled: isBusy, hovered })}
        aria-label={slot.current ? `Replace ${slot.typeLabel}` : `Upload ${slot.typeLabel}`}
        title={slot.current ? `Replace ${slot.typeLabel}` : `Upload ${slot.typeLabel}`}
        disabled={isBusy}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => inputRef.current?.click()}
      >
        {isProcessing ? "…" : "↑"}
      </button>
    </>
  );
}
