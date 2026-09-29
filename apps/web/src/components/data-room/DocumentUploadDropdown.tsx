"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Theme } from "@/lib/theme";
import { DATA_ROOM_ACCEPT_EXTENSIONS, DATA_ROOM_DOCUMENT_TYPES } from "@/lib/data-room/constants";
import {
  findDuplicateDocumentType,
  slugifyDocumentLabel,
} from "@/lib/data-room/format";
import type { DataRoomDocumentSlot, DataRoomSnapshot } from "@/lib/data-room/types";
import { formatDataRoomUploadError } from "@/lib/data-room/upload-errors";
import { postDataRoomUpload, type DataRoomUploadResult } from "@/lib/data-room/upload-client";
import {
  validateDataRoomFile,
  type DataRoomUploadSource,
} from "@/lib/data-room/validate-file";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import {
  canAfford,
  formatActionInsufficientCreditsMessage,
  formatInsufficientCreditsMessage,
} from "@/lib/credits/logic";
import { useToast } from "@/components/toast/ToastProvider";
import {
  dataRoomMenuOptionStyle,
  dataRoomMenuStyle,
  dataRoomPrimaryButtonStyle,
  dataRoomSecondaryButtonStyle,
} from "./styles";

export function DocumentUploadDropdown({
  t,
  companyUuid,
  documentSlots,
  processingTypeId = null,
  onUpload,
  onSnapshot,
  onUploadStart,
  uploadSource = "data_room",
  scope = "all",
  attachOnly = false,
  onAttach,
  onAttachError,
  attachedFileName = null,
  inline = false,
  creditBalance,
  onUploadResult,
}: {
  t: Theme;
  companyUuid: string;
  documentSlots: DataRoomDocumentSlot[];
  processingTypeId?: string | null;
  onUpload?: (snapshot: DataRoomSnapshot) => void;
  onSnapshot?: (snapshot: DataRoomSnapshot) => void;
  onUploadStart?: (typeId: string | null, typeLabel?: string) => void;
  uploadSource?: DataRoomUploadSource;
  scope?: "all" | "custom-only";
  /** Attach file locally without uploading — used by Sources panel generate flow. */
  attachOnly?: boolean;
  onAttach?: (typeId: string, typeLabel: string, file: File) => void;
  /** When set, attach validation failures use this instead of the default toast. */
  onAttachError?: (message: string) => void;
  attachedFileName?: string | null;
  inline?: boolean;
  creditBalance?: number;
  onUploadResult?: (result: DataRoomUploadResult) => void;
}) {
  const { showToast } = useToast();
  const credits = useCreditsOptional();
  const docUploadCost =
    credits?.actionCosts.find((row) => row.action === "docUpload")?.cost ?? 20;
  const [open, setOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [pendingType, setPendingType] = useState<{ typeId: string; typeLabel: string } | null>(
    null,
  );
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [customBtnHovered, setCustomBtnHovered] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isProcessing = Boolean(processingTypeId);
  const isCustomOnly = scope === "custom-only";
  const activeCount = documentSlots.filter((slot) => slot.current).length;
  const customSlots = documentSlots.filter(
    (slot) => slot.typeId.startsWith("custom:") && slot.current,
  );

  const getSlotForType = (typeId: string) =>
    documentSlots.find((slot) => slot.typeId === typeId);

  const beginUpload = (typeId: string, typeLabel: string) => {
    if (typeId === "custom" && !customLabel.trim()) return;
    if (typeId === "custom") {
      const duplicate = findDuplicateDocumentType(customLabel, documentSlots);
      if (duplicate) {
        showToast({
          message: `Document type already exists ("${duplicate.typeLabel}"). Choose it from the list.`,
          variant: "error",
        });
        return;
      }
    }
    const resolvedTypeId =
      typeId === "custom" ? `custom:${slugifyDocumentLabel(customLabel.trim())}` : typeId;
    const resolvedLabel = typeId === "custom" ? customLabel.trim() : typeLabel;
    setPendingType({ typeId: resolvedTypeId, typeLabel: resolvedLabel });
    setOpen(false);
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const MENU_GAP = 8;
  const FALLBACK_MENU_HEIGHT = 280;

  const updateMenuPosition = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const menuWidth = 280;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const measuredHeight = menuRef.current?.offsetHeight ?? 0;
    const menuHeight = measuredHeight > 0 ? measuredHeight : FALLBACK_MENU_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const fitsBelow = spaceBelow >= menuHeight + MENU_GAP;
    const fitsAbove = spaceAbove >= menuHeight + MENU_GAP;

    const openAbove = inline ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

    const top = openAbove
      ? Math.max(MENU_GAP, rect.top - menuHeight - MENU_GAP)
      : rect.bottom + MENU_GAP;

    setMenuPosition({
      top,
      left,
      minWidth: Math.max(rect.width, menuWidth),
    });
  }, [inline]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    const raf = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition, scope, documentSlots.length, customSlots.length]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !pendingType) return;

    if (attachOnly) {
      const validationError = validateDataRoomFile(file);
      if (validationError) {
        const message = formatDataRoomUploadError(validationError);
        if (onAttachError) onAttachError(message);
        else showToast({ message, variant: "error" });
        setPendingType(null);
        setCustomLabel("");
        return;
      }
      onAttach?.(pendingType.typeId, pendingType.typeLabel, file);
      setPendingType(null);
      setCustomLabel("");
      return;
    }

    onUploadStart?.(pendingType.typeId, pendingType.typeLabel);

    if (uploadSource === "data_room") {
      const snapshot = credits?.snapshot ?? null;
      if (snapshot) {
        if (!canAfford(snapshot, docUploadCost)) {
          showToast({
            message: formatActionInsufficientCreditsMessage(snapshot, docUploadCost),
            variant: "error",
          });
          onUploadStart?.(null);
          setPendingType(null);
          setCustomLabel("");
          return;
        }
      } else if (typeof creditBalance === "number" && creditBalance < docUploadCost) {
        showToast({
          message: formatInsufficientCreditsMessage(docUploadCost, creditBalance),
          variant: "error",
        });
        onUploadStart?.(null);
        setPendingType(null);
        setCustomLabel("");
        return;
      }
    }

    const result = await postDataRoomUpload({
      companyUuid,
      typeId: pendingType.typeId,
      typeLabel: pendingType.typeLabel,
      file,
      source: uploadSource,
    });

    if (result.snapshot) {
      onSnapshot?.(result.snapshot);
      onUpload?.(result.snapshot);
    }
    onUploadResult?.(result);
    if (!result.ok) {
      showToast({ message: result.message, variant: "error" });
    }

    onUploadStart?.(null);
    setPendingType(null);
    setCustomLabel("");
  };

  // Reset transient custom-type input whenever the menu closes (toggle, Escape,
  // outside click, or choosing a type). pendingType is kept for the file picker.
  useEffect(() => {
    if (open) return;
    setCustomLabel("");
    setHoveredOption(null);
    setCustomBtnHovered(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const renderTriggerLabel = () => {
    if (isProcessing) return "Processing document…";
    if (attachedFileName) return attachedFileName;
    if (inline) return "Attach document ▾";
    if (isCustomOnly) return "Add custom document ▾";
    if (activeCount > 0) return `Upload document · ${activeCount} ▾`;
    return "Upload document ▾";
  };

  const triggerStyle = isCustomOnly || inline
    ? dataRoomSecondaryButtonStyle(t, { disabled: isProcessing, isOpen: open, hovered: triggerHovered })
    : dataRoomPrimaryButtonStyle(t, {
        disabled: isProcessing,
        isOpen: open,
        hovered: triggerHovered,
      });

  const renderOption = (typeId: string, label: string) => {
    const slot = getSlotForType(typeId);
    const hasFile = Boolean(slot?.current);
    return (
      <button
        type="button"
        key={typeId}
        style={dataRoomMenuOptionStyle(t, {
          onFile: hasFile,
          hovered: hoveredOption === typeId,
        })}
        onMouseEnter={() => setHoveredOption(typeId)}
        onMouseLeave={() => setHoveredOption(null)}
        onClick={() => beginUpload(typeId, label)}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {hasFile ? (
          <span
            style={{
              color: t.accent,
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}
          >
            on file
          </span>
        ) : null}
      </button>
    );
  };

  const renderCustomSection = () => (
    <div
      style={{
        borderTop: isCustomOnly ? undefined : `1px solid ${t.ruleSoft}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginTop: isCustomOnly ? 0 : 4,
        padding: "8px 10px 10px",
      }}
    >
      <span
        style={{
          alignItems: "center",
          color: t.muted,
          display: "flex",
          fontFamily: t.sans,
          fontSize: 11,
          fontWeight: 700,
          gap: 8,
          justifyContent: "space-between",
        }}
      >
        Custom document
        {customSlots.length > 0 ? (
          <em
            style={{
              color: t.accent,
              fontFamily: t.mono,
              fontSize: 10,
              fontStyle: "normal",
              fontWeight: 700,
            }}
          >
            {customSlots.length} on file
          </em>
        ) : null}
      </span>
      <input
        value={customLabel}
        onChange={(event) => setCustomLabel(event.target.value)}
        placeholder="Document type name"
        style={{
          background: t.panelInner,
          border: `1px solid ${t.rule}`,
          borderRadius: 6,
          boxSizing: "border-box",
          color: t.ink,
          fontFamily: t.sans,
          fontSize: 12,
          padding: "6px 8px",
          width: "100%",
        }}
      />
      <button
        type="button"
        style={dataRoomSecondaryButtonStyle(t, { disabled: !customLabel.trim(), hovered: customBtnHovered })}
        disabled={!customLabel.trim()}
        onMouseEnter={() => setCustomBtnHovered(true)}
        onMouseLeave={() => setCustomBtnHovered(false)}
        onClick={() => beginUpload("custom", customLabel.trim())}
      >
        Choose file
      </button>
    </div>
  );

  const menu =
    open ? (
      <div
        ref={menuRef}
        style={{
          ...dataRoomMenuStyle(t, menuPosition ?? { top: -9999, left: 0, minWidth: 240 }),
          visibility: menuPosition ? "visible" : "hidden",
        }}
        role="listbox"
      >
        {!isCustomOnly ? (
          <>
            <div
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "8px 12px 4px",
                textTransform: "uppercase",
              }}
            >
              Attach a document
            </div>
            {DATA_ROOM_DOCUMENT_TYPES.filter((type) => type.id !== "custom").map((type) =>
              renderOption(type.id, type.label),
            )}
            {customSlots.map((slot) => renderOption(slot.typeId, slot.typeLabel))}
          </>
        ) : null}
        {renderCustomSection()}
      </div>
    ) : null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={DATA_ROOM_ACCEPT_EXTENSIONS}
        disabled={isProcessing}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button
          type="button"
          style={triggerStyle}
          disabled={isProcessing}
          aria-expanded={open}
          aria-haspopup="listbox"
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          onClick={() => setOpen((value) => !value)}
        >
          {renderTriggerLabel()}
        </button>
      </div>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
