import type { FuelIconName } from "./icons.tsx";

export type DataRoomFileIconTone = "pdf" | "xls" | "deck" | "doc" | "file";

export function dataRoomFileIconMeta(
  kindOrLabel: string,
  fileName = "",
  format = "",
): {
  icon: FuelIconName;
  tone: DataRoomFileIconTone;
} {
  const haystack = `${kindOrLabel} ${fileName} ${format}`.toLowerCase();

  if (
    haystack.includes("sheet")
    || haystack.includes("excel")
    || haystack.includes("xls")
    || haystack.includes("csv")
  ) {
    return { icon: "fileSpreadsheet", tone: "xls" };
  }

  if (
    haystack.includes("deck")
    || haystack.includes("slide")
    || haystack.includes("pitch")
    || haystack.includes("powerpoint")
    || haystack.includes("ppt")
  ) {
    return { icon: "fileDeck", tone: "deck" };
  }

  if (haystack.includes("pdf")) {
    return { icon: "filePdf", tone: "pdf" };
  }

  if (
    haystack.includes("word")
    || /\bdocx?\b/.test(haystack)
    || haystack.includes("memo")
    || haystack.includes("notes")
    || haystack.includes("contract")
    || haystack.includes("document")
  ) {
    return { icon: "fileDoc", tone: "doc" };
  }

  if (haystack.includes("financial model") || haystack.includes("cap table")) {
    return { icon: "fileSpreadsheet", tone: "xls" };
  }

  return { icon: "file", tone: "file" };
}
