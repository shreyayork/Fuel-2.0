import { useCallback, useEffect, useState } from "react";
import {
  LogIntelligenceDrawer,
  DocumentUploadDropdown,
  InitiativeDetailDrawer,
  emptyInitiativeDraft,
  createInitialDocumentSlots,
  upsertDocumentSlot,
  createDocumentIntelligence,
  createInitiativeRecord,
  normalizeAssignees,
  normalizeInitiativeTopic,
  type DataRoomDocumentSlot,
  type IntelligenceItem,
  type InitiativeRecord,
  type InitiativeListStatus,
} from "../PatriotPayJourney.tsx";
import { F21_COMPANION_EYEBROW } from "./fuel21CompanionDrawer.ts";

export type Fuel21ActionDrawerId = "intelligence" | "initiatives" | "dataroom";

/** Workspace state from the host app; without it the drawers keep local demo state. */
export type Fuel21ActionDrawerLive = {
  intelligenceItems: IntelligenceItem[];
  onLogIntelligence: (item: IntelligenceItem) => void;
  documentSlots: DataRoomDocumentSlot[];
  processingDocumentTypeId: string | null;
  onUploadDocument: (typeId: string, typeLabel: string, file: File) => void;
  onCreateInitiative: (record: InitiativeRecord) => void;
};

export function Fuel21ActionDrawerPanel({
  id,
  onClose,
  embedded = false,
  panelActive = true,
  live,
}: {
  id: Fuel21ActionDrawerId;
  onClose: () => void;
  embedded?: boolean;
  /** False while companion dock is switching away from this panel (closes portaled menus). */
  panelActive?: boolean;
  live?: Fuel21ActionDrawerLive;
}) {
  const [localIntelligence, setLocalIntelligence] = useState<IntelligenceItem[]>([]);
  const [localDocumentSlots, setLocalDocumentSlots] = useState(createInitialDocumentSlots);
  const [localProcessingTypeId, setLocalProcessingTypeId] = useState<string | null>(null);
  const intelligenceItems = live?.intelligenceItems ?? localIntelligence;
  const documentSlots = live?.documentSlots ?? localDocumentSlots;
  const processingDocumentTypeId = live ? live.processingDocumentTypeId : localProcessingTypeId;
  const logIntelligence = useCallback(
    (item: IntelligenceItem) => {
      if (live) live.onLogIntelligence(item);
      else setLocalIntelligence(previous => [item, ...previous]);
    },
    [live],
  );
  const [createDraft, setCreateDraft] = useState<InitiativeRecord | null>(() =>
    id === "initiatives" ? emptyInitiativeDraft() : null,
  );

  useEffect(() => {
    if (id === "initiatives") {
      setCreateDraft(emptyInitiativeDraft());
    } else {
      setCreateDraft(null);
    }
  }, [id]);

  const handleDocumentUpload = useCallback((typeId: string, typeLabel: string, file: File) => {
    if (live) {
      live.onUploadDocument(typeId, typeLabel, file);
      return;
    }
    setLocalProcessingTypeId(typeId);
    window.setTimeout(() => {
      const generatedItems = createDocumentIntelligence(typeId, typeLabel, file.name);
      const generatedIds = generatedItems.map(item => item.id);
      setLocalIntelligence(previous => [...generatedItems, ...previous]);
      setLocalDocumentSlots(previous =>
        upsertDocumentSlot(previous, {
          typeId,
          typeLabel,
          file,
          source: "Data Room · Upload",
          intelligenceIds: generatedIds,
          intelligenceCount: generatedItems.length,
        }),
      );
      setLocalProcessingTypeId(null);
    }, 1400);
  }, [live]);

  const patchCreateDraft = useCallback((patch: Partial<InitiativeRecord>) => {
    setCreateDraft(previous => {
      if (!previous) return previous;
      const nextAssignees = normalizeAssignees(
        patch.owner ?? previous.owner,
        patch.assignees ?? previous.assignees,
      );
      const pillar = patch.pillar ?? previous.pillar;
      const topic = normalizeInitiativeTopic(
        pillar,
        patch.topic ?? (patch.pillar && patch.pillar !== previous.pillar ? undefined : previous.topic),
      );
      return {
        ...previous,
        ...patch,
        pillar,
        topic,
        assignees: nextAssignees,
        owner: nextAssignees[0] ?? previous.owner,
        advisors: patch.advisors ?? previous.advisors ?? [],
      };
    });
  }, []);

  const handleCreateInitiative = useCallback(() => {
    if (!createDraft?.title.trim()) return;
    const record = createInitiativeRecord({
      title: createDraft.title,
      description: createDraft.description,
      pillar: createDraft.pillar,
      topic: createDraft.topic,
      kind: createDraft.kind,
      status: createDraft.status,
      assignees: createDraft.assignees,
      advisors: createDraft.advisors,
      due: createDraft.due,
    });
    live?.onCreateInitiative(record);
    onClose();
  }, [createDraft, live, onClose]);

  if (id === "intelligence") {
    return (
      <LogIntelligenceDrawer
        embedded={embedded}
        companionEyebrow={F21_COMPANION_EYEBROW.intelligence}
        onLog={logIntelligence}
        onClose={onClose}
      />
    );
  }

  if (id === "initiatives" && createDraft) {
    return (
      <InitiativeDetailDrawer
        key={createDraft.id}
        embedded={embedded}
        companionEyebrow={F21_COMPANION_EYEBROW.initiatives}
        mode="create"
        item={createDraft}
        availableIntelligence={intelligenceItems}
        onClose={onClose}
        onPatch={patchCreateDraft}
        onCreate={handleCreateInitiative}
        onLogIntelligence={logIntelligence}
        onStatusTabChange={(_tab: InitiativeListStatus) => {}}
      />
    );
  }

  if (id === "dataroom") {
    const Root = embedded ? "div" : "aside";
    const filesOnRecord = documentSlots.filter(slot => slot.current);
    const panel = (
      <>
        <header className="bench-drawer-head">
          <div>
            <span className="sc-drawer-eyebrow f21-companion-eyebrow">{F21_COMPANION_EYEBROW.dataroom}</span>
            <h2 className="bench-drawer-title">Data room</h2>
            <p className="bench-drawer-sub">
              Pitch decks, investor notes, financial models, and other private files Fuel uses to generate
              intelligence. One latest file per type.
            </p>
          </div>
          <button type="button" className="bench-drawer-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="bench-drawer-body f21-action-dataroom-body">
          <div className="f21-dataroom-upload-block">
            <span className="bench-field-label">Upload</span>
            <div className="data-room-head-actions">
              <DocumentUploadDropdown
                key={`fuel21-dataroom-upload-${id}`}
                documentSlots={documentSlots}
                processingTypeId={processingDocumentTypeId}
                panelActive={panelActive}
                onUpload={handleDocumentUpload}
              />
            </div>
          </div>
          <div className="f21-dataroom-files">
            <div className="f21-dataroom-files-head">
              <span className="bench-field-label">On file</span>
              <em>{filesOnRecord.length} {filesOnRecord.length === 1 ? "document" : "documents"}</em>
            </div>
            {filesOnRecord.length === 0 ? (
              <p className="f21-dataroom-empty">
                No documents yet. Pick a type from <strong>Upload document</strong> to add your first file.
              </p>
            ) : (
              <ul className="f21-dataroom-file-list">
                {filesOnRecord.map(slot => (
                  <li key={slot.typeId} className="f21-dataroom-file-item">
                    <div className="f21-dataroom-file-copy">
                      <strong>{slot.typeLabel}</strong>
                      <span>{slot.current?.name ?? "—"}</span>
                    </div>
                    {slot.current?.intelligenceCount ? (
                      <span className="f21-dataroom-file-meta">
                        {slot.current.intelligenceCount} intelligence
                      </span>
                    ) : (
                      <span className="f21-dataroom-file-meta f21-dataroom-file-meta--muted">Pending</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </>
    );

    if (embedded) {
      return (
        <div
          className="f21-companion-panel-fill bench-drawer f21-action-drawer--dataroom"
          role="dialog"
          aria-label="Data room"
          onClick={event => event.stopPropagation()}
        >
          {panel}
        </div>
      );
    }

    return (
      <Root
        className="bench-drawer f21-action-drawer f21-action-drawer--dataroom"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-label="Data room"
      >
        {panel}
      </Root>
    );
  }

  return null;
}

/** @deprecated Standalone shell — prefer Fuel21CompanionBenchHost */
export function Fuel21ActionDrawer({
  id,
  open,
  onClose,
}: {
  id: Fuel21ActionDrawerId | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !id) return null;

  return (
    <div className="bench-drawer-scrim f21-action-drawer-scrim" onClick={onClose}>
      <Fuel21ActionDrawerPanel id={id} onClose={onClose} />
    </div>
  );
}
