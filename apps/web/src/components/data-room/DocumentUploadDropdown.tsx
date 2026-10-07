"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { type Theme } from "@/lib/theme";
import {
  DATA_ROOM_ACCEPT_EXTENSIONS,
  DATA_ROOM_DOCUMENT_TYPES,
  DATA_ROOM_MAX_BYTES,
} from "@/lib/data-room/constants";
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
import { CreateIconButton } from "@/components/ToolbarActions";
import { AddScreenShell } from "@/components/drawer/AddScreenShell";
import { addScreenPrimaryBtnStyle } from "@/components/drawer/styles";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import {
  dataRoomDropzoneStyle,
  dataRoomMenuOptionStyle,
  dataRoomMenuStyle,
  dataRoomPrimaryButtonStyle,
  dataRoomSecondaryButtonStyle,
  dataRoomTypeChipStyle,
} from "./styles";

function formatUploadSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadGlyph({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M14 18.5V7.5M14 7.5 9.75 11.5M14 7.5 18.25 11.5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 17.5v3.25A1.75 1.75 0 0 0 8.25 22.5h11.5a1.75 1.75 0 0 0 1.75-1.75V17.5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  iconOnly = false,
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
  /** Square navy plus — Data Room / compact headers. */
  iconOnly?: boolean;
  creditBalance?: number;
  onUploadResult?: (result: DataRoomUploadResult) => void;
}) {
  const { showToast } = useToast();
  const phone = useNarrow(BREAKPOINTS.md);
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
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
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

  const closePhoneScreen = () => {
    setOpen(false);
    setPickedFile(null);
    setSelectedKind(null);
    setDropActive(false);
    setCustomLabel("");
  };

  const acceptPickedFile = (file: File) => {
    const validationError = validateDataRoomFile(file);
    if (validationError) {
      const message = formatDataRoomUploadError(validationError);
      if (onAttachError) onAttachError(message);
      else showToast({ message, variant: "error" });
      return;
    }
    setPickedFile(file);
  };

  const resolveSelectedType = (): { typeId: string; typeLabel: string } | null => {
    if (isCustomOnly || selectedKind === "custom") {
      if (!customLabel.trim()) return null;
      const duplicate = findDuplicateDocumentType(customLabel, documentSlots);
      if (duplicate) {
        showToast({
          message: `Document type already exists ("${duplicate.typeLabel}"). Choose it from the list.`,
          variant: "error",
        });
        return null;
      }
      return {
        typeId: `custom:${slugifyDocumentLabel(customLabel.trim())}`,
        typeLabel: customLabel.trim(),
      };
    }
    if (!selectedKind) return null;
    const predefined = DATA_ROOM_DOCUMENT_TYPES.find((type) => type.id === selectedKind);
    if (predefined && predefined.id !== "custom") {
      return { typeId: predefined.id, typeLabel: predefined.label };
    }
    const slot = getSlotForType(selectedKind);
    if (slot) return { typeId: slot.typeId, typeLabel: slot.typeLabel };
    return null;
  };

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
    if (!open || phone) {
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
  }, [open, phone, updateMenuPosition, scope, documentSlots.length, customSlots.length]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (phone && open) {
      acceptPickedFile(file);
      return;
    }
    if (!pendingType) return;
    await processChosenFile(file, pendingType);
  };

  const processChosenFile = async (
    file: File,
    type: { typeId: string; typeLabel: string },
  ) => {
    if (attachOnly) {
      const validationError = validateDataRoomFile(file);
      if (validationError) {
        const message = formatDataRoomUploadError(validationError);
        if (onAttachError) onAttachError(message);
        else showToast({ message, variant: "error" });
        setPendingType(null);
        setCustomLabel("");
        return false;
      }
      onAttach?.(type.typeId, type.typeLabel, file);
      setPendingType(null);
      setCustomLabel("");
      return true;
    }

    onUploadStart?.(type.typeId, type.typeLabel);

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
          return false;
        }
      } else if (typeof creditBalance === "number" && creditBalance < docUploadCost) {
        showToast({
          message: formatInsufficientCreditsMessage(docUploadCost, creditBalance),
          variant: "error",
        });
        onUploadStart?.(null);
        setPendingType(null);
        setCustomLabel("");
        return false;
      }
    }

    const result = await postDataRoomUpload({
      companyUuid,
      typeId: type.typeId,
      typeLabel: type.typeLabel,
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
    return result.ok;
  };

  const phoneReady =
    Boolean(pickedFile) &&
    !isProcessing &&
    (isCustomOnly || selectedKind === "custom" ? Boolean(customLabel.trim()) : Boolean(selectedKind));

  const submitPhoneUpload = async () => {
    if (!phoneReady || !pickedFile) return;
    const type = resolveSelectedType();
    if (!type) return;
    const ok = await processChosenFile(pickedFile, type);
    if (ok) closePhoneScreen();
  };

  // Reset transient custom-type input whenever the menu closes (toggle, Escape,
  // outside click, or choosing a type). pendingType is kept for the file picker.
  useEffect(() => {
    if (open) return;
    setCustomLabel("");
    setHoveredOption(null);
    setCustomBtnHovered(false);
    setPickedFile(null);
    setSelectedKind(null);
    setDropActive(false);
  }, [open]);

  useEffect(() => {
    if (!open || phone) return;
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
  }, [open, phone]);

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
        style={{
          ...dataRoomMenuOptionStyle(t, {
            onFile: hasFile,
            hovered: hoveredOption === typeId,
          }),
          ...(phone ? { fontSize: 15, minHeight: 44, padding: "12px 10px" } : null),
        }}
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

  const menuBody = (
    <>
      {!isCustomOnly ? (
        <>
          <div
            style={{
              color: t.muted,
              fontFamily: t.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: phone ? "0 0 8px" : "8px 12px 4px",
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
    </>
  );

  const menu =
    open && !phone ? (
      <div
        ref={menuRef}
        style={{
          ...dataRoomMenuStyle(t, menuPosition ?? { top: -9999, left: 0, minWidth: 240 }),
          visibility: menuPosition ? "visible" : "hidden",
        }}
        role="listbox"
      >
        {menuBody}
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
        {iconOnly ? (
          <CreateIconButton
            t={t}
            label={isProcessing ? "Processing document" : "Upload document"}
            active={phone ? false : open}
            disabled={isProcessing}
            aria-expanded={open}
            aria-haspopup={phone ? "dialog" : "listbox"}
            onClick={() => (phone ? setOpen(true) : setOpen((value) => !value))}
          />
        ) : (
          <button
            type="button"
            style={triggerStyle}
            disabled={isProcessing}
            aria-expanded={open}
            aria-haspopup={phone ? "dialog" : "listbox"}
            onMouseEnter={() => setTriggerHovered(true)}
            onMouseLeave={() => setTriggerHovered(false)}
            onClick={() => (phone ? setOpen(true) : setOpen((value) => !value))}
          >
            {renderTriggerLabel()}
          </button>
        )}
      </div>
      {open && phone ? (
        <AddScreenShell
          t={t}
          title={attachOnly ? "Attach document" : "Upload document"}
          onClose={closePhoneScreen}
          footer={
            <button
              type="button"
              disabled={!phoneReady}
              onClick={() => void submitPhoneUpload()}
              style={addScreenPrimaryBtnStyle(t, {
                cursor: phoneReady ? "pointer" : "not-allowed",
                opacity: phoneReady ? 1 : 0.45,
              })}
            >
              {isProcessing
                ? "Processing…"
                : attachOnly
                  ? "Attach file"
                  : "Upload document"}
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <button
              type="button"
              disabled={isProcessing}
              style={dataRoomDropzoneStyle(t, { active: dropActive, hasFile: Boolean(pickedFile) })}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDropActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDropActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDropActive(false);
                const file = event.dataTransfer.files[0];
                if (file) acceptPickedFile(file);
              }}
            >
              <UploadGlyph color={t.accent} />
              {pickedFile ? (
                <>
                  <strong style={{ fontSize: 15, fontWeight: 700 }}>{pickedFile.name}</strong>
                  <span style={{ color: t.muted, fontSize: 12 }}>
                    {formatUploadSize(pickedFile.size)} · Tap to replace
                  </span>
                </>
              ) : (
                <>
                  <strong style={{ fontSize: 15, fontWeight: 700 }}>Choose a file</strong>
                  <span style={{ color: t.muted, fontSize: 12, lineHeight: 1.45 }}>
                    PDF, PowerPoint, Word, Excel, CSV, or text · up to{" "}
                    {DATA_ROOM_MAX_BYTES / (1024 * 1024)} MB
                  </span>
                </>
              )}
            </button>

            {!isCustomOnly ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3
                  style={{
                    color: t.ink,
                    fontFamily: t.sans,
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  What is this?
                </h3>
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  {DATA_ROOM_DOCUMENT_TYPES.filter((type) => type.id !== "custom").map((type) => {
                    const onFile = Boolean(getSlotForType(type.id)?.current);
                    const selected = selectedKind === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        aria-pressed={selected}
                        style={dataRoomTypeChipStyle(t, { selected, onFile })}
                        onClick={() => setSelectedKind(type.id)}
                      >
                        <span style={{ fontSize: 13, fontWeight: 650 }}>{type.label}</span>
                        {onFile ? (
                          <span style={{ color: t.accent, fontSize: 11, fontWeight: 700 }}>
                            On file
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  {customSlots.map((slot) => {
                    const selected = selectedKind === slot.typeId;
                    return (
                      <button
                        key={slot.typeId}
                        type="button"
                        aria-pressed={selected}
                        style={dataRoomTypeChipStyle(t, { selected, onFile: true })}
                        onClick={() => setSelectedKind(slot.typeId)}
                      >
                        <span style={{ fontSize: 13, fontWeight: 650 }}>{slot.typeLabel}</span>
                        <span style={{ color: t.accent, fontSize: 11, fontWeight: 700 }}>
                          On file
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={selectedKind === "custom"}
                    style={dataRoomTypeChipStyle(t, { selected: selectedKind === "custom" })}
                    onClick={() => setSelectedKind("custom")}
                  >
                    <span style={{ fontSize: 13, fontWeight: 650 }}>Custom</span>
                  </button>
                </div>
              </div>
            ) : null}

            {isCustomOnly || selectedKind === "custom" ? (
              <label
                style={{
                  color: t.ink,
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: t.sans,
                  fontSize: 13,
                  fontWeight: 650,
                  gap: 8,
                }}
              >
                Document type name
                <input
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  placeholder="e.g. Security questionnaire"
                  style={{
                    background: t.bg,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 8,
                    boxSizing: "border-box",
                    color: t.ink,
                    fontFamily: t.sans,
                    fontSize: 15,
                    fontWeight: 400,
                    minHeight: TOUCH_TARGET_MIN,
                    padding: "10px 12px",
                    width: "100%",
                  }}
                />
              </label>
            ) : null}

            {!attachOnly && uploadSource === "data_room" ? (
              <p style={{ color: t.muted, fontFamily: t.sans, fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                Uploading uses {docUploadCost} credits and extracts intelligence from the file.
              </p>
            ) : null}
          </div>
        </AddScreenShell>
      ) : null}
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
