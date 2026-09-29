import type { DataRoomDocumentSlot } from "./types";

export function countActiveDocuments(slots: DataRoomDocumentSlot[]): number {
  return slots.filter((slot) => slot.current).length;
}

export function slotsWithFiles(slots: DataRoomDocumentSlot[]): DataRoomDocumentSlot[] {
  return slots.filter((slot) => slot.current);
}
