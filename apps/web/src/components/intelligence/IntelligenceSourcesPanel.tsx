"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Theme } from "@/lib/theme";
import type { DataRoomDocumentSlot, DataRoomSnapshot } from "@/lib/data-room/types";
import type { CreditSnapshot } from "@/lib/credits/types";
import { syncCreditsAfterAction } from "@/lib/credits/client";
import {
  canAfford,
  formatActionInsufficientCreditsMessage,
  formatInsufficientCreditsMessage,
  totalRemaining,
} from "@/lib/credits/logic";
import { canGenerateIntelligenceFromSource, sourceGenerateBlockedReason } from "@/lib/intelligence/constants";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import { DocumentUploadDropdown } from "@/components/data-room/DocumentUploadDropdown";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import { useToast } from "@/components/toast/ToastProvider";
import { useWorkspaceTourOptional } from "@/components/workspace-tour/WorkspaceTourContext";
import { HoverBtn } from "@/components/company/overview/drawerShared";
import {
  benchActionBtnStyle,
  benchActionsStyle,
} from "@/components/company/overview/drawerStyles";
import { waitForDocumentInitiativesIdle } from "@/lib/initiatives/client";
import {
  drawerFormInputStyle,
  INTELLIGENCE_DRAWER_INPUT_CLASS,
  intelligenceDrawerInputCss,
  primaryButtonStyle,
  sourcesHeaderStyle,
  sourcesPanelStyle,
} from "./styles";

function formatIntelligenceError(code: string): string {
  switch (code) {
    case "no_insights_extracted":
      return "Could not extract intelligence from this document. Try a different file or add more context in the description.";
    case "insights_shape_invalid":
      return "The model returned insights in an unexpected format. Please try again.";
    case "document_too_short":
      return "This document has too little readable text to generate intelligence.";
    case "notes_too_short":
      return "Add a title and description, or attach a document.";
    case "insufficient_credits":
      return "Not enough credits to generate intelligence.";
    case "forbidden":
      return "You do not have permission to generate intelligence for this company.";
    case "not_found":
      return "Company not found.";
    case "unsupported_file_type":
    case "invalid_file_content":
      return "Unsupported file type. Use PDF, PowerPoint, Word, Excel, CSV, or plain text.";
    case "file_too_large":
      return "File is too large. Maximum size is 25 MB.";
    case "generation_failed":
    case "intelligence_generation_failed":
      return "Intelligence generation failed. Please try again.";
    default:
      return "Intelligence generation failed. Please try again.";
  }
}

export function IntelligenceSourcesPanel({
  t,
  companyUuid,
  documentSlots,
  creditBalance,
  onBalanceChange,
  onItemsChange,
  onDataRoomSnapshot,
  onDocumentNotice,
  onIntelligenceGenerated,
  forceShowForm = false,
  onCancel,
  onSuccess,
}: {
  t: Theme;
  companyUuid: string;
  documentSlots: DataRoomDocumentSlot[];
  creditBalance: number;
  onBalanceChange?: (balance: number) => void;
  onItemsChange?: (items: CompanyIntelligenceRow[]) => void;
  onDataRoomSnapshot?: (snapshot: DataRoomSnapshot) => void;
  onDocumentNotice?: (message: string | null) => void;
  /** Called with newly created intelligence ids so the feed can pin/blink them. */
  onIntelligenceGenerated?: (ids: string[], sourceTitle: string) => void;
  /** Open the add-source form immediately (header CTA / drawer). */
  forceShowForm?: boolean;
  /** Drawer mode: close the host drawer instead of collapsing the inline form. */
  onCancel?: () => void;
  /** Fired once after a successful generate (before form reset / close). */
  onSuccess?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const credits = useCreditsOptional();
  const { showToast } = useToast();
  const tour = useWorkspaceTourOptional();
  const addSourceHighlight = tour?.activeTarget === "add-source";
  const generateSourceCost =
    credits?.actionCosts.find((row) => row.action === "generateSource")?.cost ?? 8;
  const creditsRemaining = credits?.snapshot ? totalRemaining(credits.snapshot) : null;

  const [showForm, setShowForm] = useState(forceShowForm);
  useEffect(() => {
    if (forceShowForm) setShowForm(true);
  }, [forceShowForm]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [attached, setAttached] = useState<{
    typeId: string;
    typeLabel: string;
    file: File;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generated, setGenerated] = useState(false);
  /** Attach / field validation near the form — not generation failures. */
  const [formError, setFormError] = useState<string | null>(null);

  const notifyInsufficientCredits = (
    snapshot: CreditSnapshot | null | undefined,
    required: number,
    fallbackBalance?: number,
  ) => {
    const message = snapshot
      ? formatActionInsufficientCreditsMessage(snapshot, required)
      : formatInsufficientCreditsMessage(required, fallbackBalance ?? 0);
    showToast({ message, variant: "error" });
  };

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setAttached(null);
    setGenerated(false);
    setFormError(null);
  };

  const cancelForm = () => {
    resetForm();
    if (onCancel) {
      onCancel();
      return;
    }
    setShowForm(false);
  };

  const hasDocument = !!attached;
  const canGenerate = canGenerateIntelligenceFromSource({
    title,
    notes,
    hasDocument,
  });
  // Notes-only path: title + description required. Document path: both optional
  // (title falls back to filename).
  const titleRequired = !hasDocument;
  const descriptionRequired = !hasDocument;
  const blockedReason = sourceGenerateBlockedReason({ title, notes, hasDocument });

  const refreshItems = async () => {
    const listRes = await fetch(`/api/company/${companyUuid}/intelligence`);
    if (!listRes.ok) return;
    const listJson = (await listRes.json()) as { items: CompanyIntelligenceRow[] };
    onItemsChange?.(listJson.items);
  };

  const handleGenerate = async () => {
    const snapshot = credits?.snapshot ?? null;
    if (snapshot) {
      if (!canAfford(snapshot, generateSourceCost)) {
        notifyInsufficientCredits(snapshot, generateSourceCost);
        return;
      }
    } else {
      const availableCredits = creditsRemaining ?? creditBalance;
      if (availableCredits < generateSourceCost) {
        notifyInsufficientCredits(null, generateSourceCost, availableCredits);
        return;
      }
    }
    if (!canGenerate) return;
    setProcessing(true);
    setFormError(null);
    try {
      const formData = new FormData();
      const resolvedTitle =
        title.trim() ||
        (attached ? attached.file.name.replace(/\.[^.]+$/, "") || attached.file.name : "");
      formData.set("title", resolvedTitle);
      formData.set("notes", notes.trim());
      if (attached) {
        formData.set("file", attached.file);
        formData.set("typeId", attached.typeId);
        formData.set("typeLabel", attached.typeLabel);
      }
      const res = await fetch(`/api/company/${companyUuid}/intelligence/generate`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        error?: string;
        balance?: number;
        required?: number;
        creditBalance?: number;
        creditSnapshot?: CreditSnapshot;
        dataRoom?: DataRoomSnapshot;
        intelligenceIds?: string[];
        initiativesGenerating?: boolean;
      };
      if (res.status === 402) {
        syncCreditsAfterAction(json.creditSnapshot);
        notifyInsufficientCredits(
          json.creditSnapshot,
          json.required ?? generateSourceCost,
          json.balance ?? creditsRemaining ?? creditBalance,
        );
        onDocumentNotice?.(null);
        return;
      }
      if (!res.ok) {
        throw new Error(json.error ?? "generation_failed");
      }
      syncCreditsAfterAction(json.creditSnapshot);
      if (json.dataRoom) onDataRoomSnapshot?.(json.dataRoom);
      if (typeof json.creditBalance === "number") {
        onBalanceChange?.(json.creditBalance);
      }
      await refreshItems();
      const generatedIds = json.intelligenceIds ?? [];
      if (generatedIds.length > 0) {
        onIntelligenceGenerated?.(generatedIds, resolvedTitle);
      }
      await onSuccess?.();
      if (json.initiativesGenerating) {
        onDocumentNotice?.(
          "Intelligence generated. Initiative suggestions are now generating in the background…",
        );
        void waitForDocumentInitiativesIdle(companyUuid).then((status) => {
          router.refresh();
          if (status === "complete") {
            onDocumentNotice?.("Suggested initiatives updated from this source.");
            return;
          }
          if (status === "failed") {
            onDocumentNotice?.(
              "Intelligence generated. Initiative suggestions could not be generated — try again from Initiatives.",
            );
            return;
          }
          onDocumentNotice?.(null);
        });
      } else {
        onDocumentNotice?.("Intelligence generated from source.");
      }
      setGenerated(true);
      window.setTimeout(() => {
        resetForm();
        if (onCancel) onCancel();
        else setShowForm(false);
      }, 600);
    } catch (e) {
      const code = e instanceof Error ? e.message : "generation_failed";
      onDocumentNotice?.(null);
      showToast({ message: formatIntelligenceError(code), variant: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const drawerMode = forceShowForm;

  return (
    <div
      style={{
        display: "flex",
        flex: drawerMode ? 1 : undefined,
        flexDirection: "column",
        gap: drawerMode ? 0 : 8,
        minHeight: drawerMode ? 0 : undefined,
      }}
    >
      <section
        style={{
          ...sourcesPanelStyle(t),
          ...(drawerMode
            ? {
                border: "none",
                borderRadius: 0,
                display: "flex",
                flex: 1,
                flexDirection: "column",
                minHeight: 0,
              }
            : null),
        }}
      >
        {!drawerMode ? (
          <div style={sourcesHeaderStyle(t)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span
                style={{
                  color: t.mutedSoft,
                  fontFamily: t.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Sources
              </span>
              <strong style={{ color: t.ink, fontFamily: t.sans, fontSize: 15, fontWeight: 700 }}>
                Auto-generate sources from connected context
              </strong>
              <p style={{ color: t.muted, fontFamily: t.sans, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                Capture notes, connector activity, and meetings — then turn them into intelligence.
              </p>
            </div>
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                data-tour-target="add-source"
                className={addSourceHighlight ? "fuel-tour-highlight" : undefined}
                style={primaryButtonStyle(t)}
              >
                + Add a source
              </button>
            ) : null}
          </div>
        ) : null}

        {showForm ? (
          <>
            <style dangerouslySetInnerHTML={{ __html: intelligenceDrawerInputCss(t) }} />
            <div
              style={{
                display: "flex",
                flex: drawerMode ? 1 : undefined,
                flexDirection: "column",
                gap: 12,
                minHeight: 0,
                overflow: drawerMode ? "auto" : undefined,
                padding: drawerMode ? 18 : "14px 18px 18px",
              }}
            >
              {formError ? (
                <p
                  role="alert"
                  style={{
                    color: t.negative,
                    fontFamily: t.sans,
                    fontSize: 12.5,
                    margin: 0,
                  }}
                >
                  {formError}
                </p>
              ) : null}
              <label style={{ color: t.muted, display: "flex", flexDirection: "column", fontFamily: t.sans, fontSize: 12, gap: 6 }}>
                <span style={{ fontWeight: 600 }}>
                  Title
                  {titleRequired ? (
                    <span style={{ color: t.negative, marginLeft: 3 }} aria-hidden>
                      *
                    </span>
                  ) : null}
                </span>
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 enterprise pipeline risk"
                    autoFocus
                    required={titleRequired}
                    aria-required={titleRequired}
                    className={INTELLIGENCE_DRAWER_INPUT_CLASS}
                    style={{ ...drawerFormInputStyle(t), flex: "1 1 200px" }}
                  />
                  <DocumentUploadDropdown
                    t={t}
                    companyUuid={companyUuid}
                    documentSlots={documentSlots}
                    attachOnly
                    inline
                    attachedFileName={attached?.file.name ?? null}
                    onAttachError={setFormError}
                    onAttach={(typeId, typeLabel, file) => {
                      setFormError(null);
                      setAttached({ typeId, typeLabel, file });
                      setTitle((current) => {
                        if (current.trim()) return current;
                        return file.name.replace(/\.[^.]+$/, "") || file.name;
                      });
                    }}
                  />
                </div>
              </label>

              {attached ? (
                <div
                  style={{
                    alignItems: "center",
                    background: t.panelAlt,
                    border: `1px solid ${t.ruleSoft}`,
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                  }}
                >
                  <span style={{ color: t.inkSoft, fontFamily: t.sans, fontSize: 12 }}>
                    <strong style={{ color: t.ink, marginRight: 8 }}>{attached.typeLabel}</strong>
                    <em style={{ color: t.muted, fontStyle: "normal" }}>{attached.file.name}</em>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttached(null);
                      setFormError(null);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: t.muted,
                      cursor: "pointer",
                      fontFamily: t.sans,
                      fontSize: 11,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}

              <label style={{ color: t.muted, display: "flex", flexDirection: "column", fontFamily: t.sans, fontSize: 12, gap: 6 }}>
                <span style={{ fontWeight: 600 }}>
                  Description
                  {descriptionRequired ? (
                    <span style={{ color: t.negative, marginLeft: 3 }} aria-hidden>
                      *
                    </span>
                  ) : null}
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What should Fuel extract from this source?"
                  rows={3}
                  required={descriptionRequired}
                  aria-required={descriptionRequired}
                  style={{ ...drawerFormInputStyle(t), resize: "vertical" }}
                />
              </label>

              {!canGenerate && !processing && !generated ? (
                <p style={{ color: t.mutedSoft, fontFamily: t.sans, fontSize: 11, margin: 0 }}>
                  {blockedReason}
                </p>
              ) : (
                <p style={{ color: t.mutedSoft, fontFamily: t.sans, fontSize: 11, margin: 0 }}>
                  {hasDocument
                    ? "Description is optional when a document is attached. The file is saved to the Data Room on generate."
                    : "Attach a document (description optional) or add a title and description."}
                </p>
              )}
            </div>

            <footer style={benchActionsStyle(t)}>
              <HoverBtn
                type="button"
                styleFor={(hovered) => benchActionBtnStyle(t, "cancel", { hovered })}
                onClick={cancelForm}
              >
                Cancel
              </HoverBtn>
              <HoverBtn
                type="button"
                disabled={!canGenerate || processing || generated}
                styleFor={(hovered) =>
                  benchActionBtnStyle(t, "save", {
                    hovered,
                    disabled: !canGenerate || processing || generated,
                  })
                }
                onClick={handleGenerate}
              >
                {processing
                  ? "Parsing and generating…"
                  : generated
                    ? "Generated"
                    : "Generate intelligence"}
              </HoverBtn>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}
