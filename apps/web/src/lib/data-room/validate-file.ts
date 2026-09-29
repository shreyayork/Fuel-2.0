import { DATA_ROOM_MAX_BYTES } from "./constants";

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
};

const PDF_MAGIC = Buffer.from("%PDF-", "utf8");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export type DataRoomFileValidationError =
  | "file_required"
  | "file_too_large"
  | "unsupported_file_type"
  | "invalid_file_content";

export function extensionFromFilename(filename: string): string | null {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

export function contentTypeForExtension(ext: string): string | null {
  return EXTENSION_CONTENT_TYPES[ext] ?? null;
}

function startsWithMagic(buf: Buffer, magic: Buffer): boolean {
  return buf.length >= magic.length && buf.slice(0, magic.length).equals(magic);
}

/** Server-side content sniff — extension alone is not trusted. */
export function validateDataRoomBuffer(buf: Buffer, ext: string): DataRoomFileValidationError | null {
  if (!buf.length) return "file_required";
  if (buf.length > DATA_ROOM_MAX_BYTES) return "file_too_large";
  if (!contentTypeForExtension(ext)) return "unsupported_file_type";

  switch (ext) {
    case "pdf":
      return startsWithMagic(buf, PDF_MAGIC) ? null : "invalid_file_content";
    case "pptx":
    case "docx":
    case "xlsx":
      return startsWithMagic(buf, ZIP_MAGIC) ? null : "invalid_file_content";
    case "ppt":
    case "doc":
    case "xls":
      return startsWithMagic(buf, OLE_MAGIC) ? null : "invalid_file_content";
    case "csv":
    case "txt":
    case "md":
      return null;
    default:
      return "unsupported_file_type";
  }
}

export function validateDataRoomFile(file: File): DataRoomFileValidationError | null {
  if (!(file instanceof File) || file.size === 0) return "file_required";
  if (file.size > DATA_ROOM_MAX_BYTES) return "file_too_large";
  const ext = extensionFromFilename(file.name);
  if (!ext || !contentTypeForExtension(ext)) return "unsupported_file_type";
  return null;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n]/g, " ").replace(/[/\\]/g, "-").trim().slice(0, 200) || "document";
}

export const DATA_ROOM_UPLOAD_SOURCES = ["data_room", "intelligence"] as const;
export type DataRoomUploadSource = (typeof DATA_ROOM_UPLOAD_SOURCES)[number];

export function parseUploadSource(value: string | null | undefined): DataRoomUploadSource {
  if (value === "intelligence") return "intelligence";
  return "data_room";
}
