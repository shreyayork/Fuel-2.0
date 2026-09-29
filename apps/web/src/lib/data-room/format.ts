import { DATA_ROOM_DOCUMENT_TYPES } from "./constants";
import type { DataRoomDocumentSlot } from "./types";

export function slugifyDocumentLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "document"
  );
}

/** Trim, lowercase, collapse internal whitespace — for duplicate type checks. */
export function normalizeDocumentTypeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export type DocumentTypeRef = {
  typeId: string;
  typeLabel: string;
};

/**
 * Returns an existing document type that collides with a proposed custom label
 * (case / whitespace insensitive). Same custom slot (`custom:{slug}`) is not a
 * duplicate — callers may re-upload / version that slot.
 */
export function findDuplicateDocumentType(
  label: string,
  existingSlots: readonly DocumentTypeRef[] = [],
): DocumentTypeRef | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const proposedTypeId = `custom:${slugifyDocumentLabel(trimmed)}`;
  const normalized = normalizeDocumentTypeLabel(trimmed);
  const slug = slugifyDocumentLabel(trimmed);

  for (const type of DATA_ROOM_DOCUMENT_TYPES) {
    if (type.id === "custom") continue;
    const predefinedSlug = type.id.replace(/_/g, "-");
    if (
      normalizeDocumentTypeLabel(type.label) === normalized ||
      predefinedSlug === slug
    ) {
      return { typeId: type.id, typeLabel: type.label };
    }
  }

  for (const slot of existingSlots) {
    if (slot.typeId === proposedTypeId) continue;
    if (normalizeDocumentTypeLabel(slot.typeLabel) === normalized) {
      return { typeId: slot.typeId, typeLabel: slot.typeLabel };
    }
  }

  return null;
}

/**
 * Returns an existing on-file document display title that collides with a
 * proposed source title (case / whitespace insensitive).
 */
export function findDuplicateDocumentTitle(
  title: string,
  slots: readonly DataRoomDocumentSlot[] = [],
): string | null {
  const normalized = normalizeDocumentTypeLabel(title);
  if (!normalized) return null;

  for (const slot of slots) {
    const names = [
      slot.current?.name,
      ...slot.history.map((row) => row.name),
    ].filter((name): name is string => Boolean(name?.trim()));
    for (const name of names) {
      if (normalizeDocumentTypeLabel(name) === normalized) {
        return name;
      }
    }
  }

  return null;
}

export function getDocumentTypeLabel(typeId: string, fallback?: string): string {
  if (typeId.startsWith("custom:")) {
    return fallback || typeId.slice(7).replace(/-/g, " ");
  }
  return fallback || typeId.replace(/_/g, " ");
}

export function getFileFormat(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() || "file";
  if (extension === "pdf") return "PDF";
  if (extension === "ppt" || extension === "pptx") return "PowerPoint";
  if (extension === "doc" || extension === "docx") return "Word";
  if (extension === "xls" || extension === "xlsx") return "Excel";
  if (extension === "csv") return "CSV";
  if (extension === "txt" || extension === "md") return "Text";
  return extension.toUpperCase();
}

export function formatUploadedAt(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
