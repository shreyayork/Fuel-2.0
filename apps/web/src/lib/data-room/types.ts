export interface DataRoomFileRecord {
  id: string;
  name: string;
  typeId: string;
  typeLabel: string;
  format: string;
  uploadedAt: string;
  uploadedAtMs: number;
  source: string;
  intelligenceCount: number;
  contextItemId: string | null;
  observationIds: string[];
  downloadPath: string;
}

export interface DataRoomDocumentSlot {
  typeId: string;
  typeLabel: string;
  current: DataRoomFileRecord | null;
  history: DataRoomFileRecord[];
}

export interface DataRoomFeedAttachment {
  id: string;
  contextItemId: string;
  attachmentId: string;
  name: string;
  format: string;
  uploadedAt: string;
  uploadedAtMs: number;
  source: string;
  intelligenceCount: number;
  observationIds: string[];
  downloadPath: string;
}

export interface DataRoomSnapshot {
  slots: DataRoomDocumentSlot[];
  activeCount: number;
  /**
   * Sources badge total = current vault docs ∪ HubSpot notes ∪ Granola meetings.
   * Matches `/intelligence/sources` meta.total.
   */
  sourcesTotal: number;
  feedAttachments: DataRoomFeedAttachment[];
}

/**
 * Serialized Sources sidebar row — mirrors IntelligenceSourceListItem without
 * importing the client SourcesDrawer module.
 */
export type IntelligenceSourceItem = {
  id: string;
  kind: "note" | "doc";
  /** Chip text: HubSpot / Granola / Doc / Note. */
  originLabel: string;
  title: string;
  addedAtLabel: string;
  uploadedAtMs: number;
  contextItemId: string | null;
  status: "generated" | "awaiting" | "reference";
  intelligenceIds: string[];
  intelligenceCount: number;
};
