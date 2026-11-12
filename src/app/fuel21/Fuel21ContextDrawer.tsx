import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ChevronRight, FileText, NotebookPen, Upload } from "lucide-react";
import { SOURCE_MATERIALS } from "./demoData.ts";
import { F21_COMPANION_EYEBROW } from "./fuel21CompanionDrawer.ts";
import "../PatriotPayJourney.css";
import "./fuel21-context-drawer.css";

type ContextListItem = {
  id: string;
  title: string;
  meta: string;
  intelligence: string;
};

type AddMode = "note" | "file";

export function Fuel21ContextDrawerPanel({
  onClose,
  onOpenContextEngine,
  embedded = false,
}: {
  onClose: () => void;
  onOpenContextEngine?: () => void;
  embedded?: boolean;
}) {
  const [addMode, setAddMode] = useState<AddMode>("file");
  const [draftText, setDraftText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ContextListItem[]>(() =>
    SOURCE_MATERIALS.slice(0, 6).map(row => ({
      id: row.id,
      title: row.title,
      meta: row.meta,
      intelligence: row.intelligence,
    })),
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const ingestFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setItems(prev => [
      ...files.map(file => ({
        id: `file-${file.name}-${file.lastModified}`,
        title: file.name,
        meta: "Uploaded just now",
        intelligence: "Pending extraction",
      })),
      ...prev,
    ]);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      ingestFiles(Array.from(event.dataTransfer.files ?? []));
    },
    [ingestFiles],
  );

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    ingestFiles(files);
    event.target.value = "";
  };

  const addTextContext = () => {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    const title = trimmed.length > 64 ? `${trimmed.slice(0, 61)}…` : trimmed;
    setItems(prev => [
      {
        id: `text-${Date.now()}`,
        title,
        meta: "Manual note",
        intelligence: "Ready to process",
      },
      ...prev,
    ]);
    setDraftText("");
  };

  const goToContextEngine = () => {
    onClose();
    onOpenContextEngine?.();
  };

  const rootClass = embedded
    ? "f21-companion-panel-fill f21-context-drawer f21-context-drawer--embedded"
    : "bench-drawer add-sources-drawer f21-context-drawer";

  const Root = embedded ? "div" : "aside";

  return (
    <Root
      className={rootClass}
      onClick={event => event.stopPropagation()}
      role="dialog"
      aria-label="Add context"
    >
      <header className="bench-drawer-head f21-context-drawer-head">
        <div className="f21-context-drawer-head-main">
          <div className="add-sources-eyebrow sc-drawer-eyebrow f21-companion-eyebrow">{F21_COMPANION_EYEBROW.context}</div>
          <div className="f21-context-drawer-title-row">
            <h2 className="bench-drawer-title">Add context</h2>
            {onOpenContextEngine ? (
              <button type="button" className="f21-context-engine-link" onClick={goToContextEngine}>
                Context Engine
                <ChevronRight size={14} strokeWidth={2.25} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p className="bench-drawer-sub">
            Add a short note or upload a file — Fuel uses this for intelligence and recommendations.
          </p>
        </div>
        <button type="button" className="bench-drawer-x" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="bench-drawer-body f21-context-drawer-body">
        <div className="f21-context-add-panel" role="tablist" aria-label="Add context">
          <div className="f21-context-add-toggle">
            <button
              type="button"
              role="tab"
              aria-selected={addMode === "file"}
              className={`f21-context-add-toggle-btn${addMode === "file" ? " is-active" : ""}`}
              onClick={() => setAddMode("file")}
            >
              <Upload size={14} strokeWidth={2} aria-hidden="true" />
              File
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={addMode === "note"}
              className={`f21-context-add-toggle-btn${addMode === "note" ? " is-active" : ""}`}
              onClick={() => setAddMode("note")}
            >
              <NotebookPen size={14} strokeWidth={2} aria-hidden="true" />
              Note
            </button>
          </div>

          <div className="f21-context-add-panel-body">
            {addMode === "note" ? (
              <div className="f21-context-note-panel f21-context-add-panel-pane" role="tabpanel">
                <label className="bench-field-label" htmlFor="f21-context-note">
                  Note
                </label>
                <textarea
                  id="f21-context-note"
                  className="bench-field-input add-sources-textarea f21-context-note-input"
                  value={draftText}
                  onChange={event => setDraftText(event.target.value)}
                  placeholder="Paste or type what Fuel should remember…"
                  rows={4}
                />
                <div className="f21-context-note-actions">
                  <button
                    type="button"
                    className="bench-drawer-save f21-context-save-note"
                    disabled={!draftText.trim()}
                    onClick={addTextContext}
                  >
                    Save note
                  </button>
                </div>
              </div>
            ) : (
              <div className="f21-context-file-panel f21-context-add-panel-pane" role="tabpanel">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="f21-context-file-input"
                  multiple
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
                  onChange={onFileInputChange}
                />
                <div className="f21-context-dropzone" onDragOver={onDragOver} onDrop={onDrop}>
                  <Upload size={22} strokeWidth={1.85} aria-hidden="true" />
                  <strong>Drop files here</strong>
                  <span>PDF, Word, Excel, slides, or text</span>
                  <button
                    type="button"
                    className="f21-context-choose-file"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose file
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="f21-context-drawer-list-head">
          <span>Recent context</span>
          <em>{items.length} items</em>
        </div>
        <ul className="f21-context-drawer-list">
          {items.map(item => (
            <li key={item.id} className="f21-context-drawer-list-item">
              <span className="f21-context-drawer-list-icon" aria-hidden="true">
                <FileText size={14} strokeWidth={2} />
              </span>
              <div className="f21-context-drawer-list-copy">
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
                <em>{item.intelligence}</em>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Root>
  );
}

/** @deprecated Standalone shell — prefer Fuel21CompanionBenchHost */
export function Fuel21ContextDrawer({
  open,
  onClose,
  onOpenContextEngine,
}: {
  open: boolean;
  onClose: () => void;
  onOpenContextEngine?: () => void;
}) {
  if (!open) return null;

  return (
    <div className="bench-drawer-scrim f21-context-drawer-scrim f21-companion-scrim" onClick={onClose}>
      <aside className="bench-drawer f21-companion-drawer add-sources-drawer" onClick={e => e.stopPropagation()}>
        <Fuel21ContextDrawerPanel
          embedded
          onClose={onClose}
          onOpenContextEngine={onOpenContextEngine}
        />
      </aside>
    </div>
  );
}
