import React, { useCallback, useEffect, useRef, useState } from "react";
import { seedHelpFaqAdminFromCatalog } from "./helpFaqAdminSeed";
import { useDialogA11y } from "../a11y/useDialogA11y";
import {
  loadHelpFaqAdminEntries,
  newHelpFaqAdminId,
  saveHelpFaqAdminEntries,
  type HelpFaqAdminEntry,
} from "./faqAdminStore";

function FaqDragHandleIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" focusable="false">
      <circle cx="3.5" cy="3" r="1.35" fill="currentColor" />
      <circle cx="8.5" cy="3" r="1.35" fill="currentColor" />
      <circle cx="3.5" cy="8" r="1.35" fill="currentColor" />
      <circle cx="8.5" cy="8" r="1.35" fill="currentColor" />
      <circle cx="3.5" cy="13" r="1.35" fill="currentColor" />
      <circle cx="8.5" cy="13" r="1.35" fill="currentColor" />
    </svg>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="sa-faq-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function FaqEditorDialog({
  title,
  initial,
  isNew,
  onClose,
  onSave,
}: {
  title: string;
  initial: HelpFaqAdminEntry;
  isNew: boolean;
  onClose: () => void;
  onSave: (entry: HelpFaqAdminEntry) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(true, ref, onClose);
  const [draft, setDraft] = useState(initial);
  const audienceDisabled = !draft.published;

  return (
    <div className="sa-edit-scrim" onClick={onClose}>
      <div
        ref={ref}
        className="overview-panel sa-edit-dialog sa-faq-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sa-faq-edit-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="sa-faq-dialog-head">
          <h2 id="sa-faq-edit-title">{title}</h2>
          <button type="button" className="sa-row-edit" onClick={onClose}>Close</button>
        </div>

        <div className="sa-edit-body sa-faq-dialog-body">
          <Field label="QUESTION" required>
            <input
              value={draft.question}
              onChange={e => setDraft({ ...draft, question: e.target.value })}
            />
          </Field>
          <Field label="ANSWER" required>
            <textarea
              rows={4}
              value={draft.answer}
              onChange={e => setDraft({ ...draft, answer: e.target.value })}
            />
          </Field>
          <Field label="POINTS">
            <textarea
              rows={3}
              placeholder="One per line: Label – detail body"
              value={draft.pointsText}
              onChange={e => setDraft({ ...draft, pointsText: e.target.value })}
            />
          </Field>
          <Field label="FOOTNOTE">
            <textarea
              rows={2}
              value={draft.footnote}
              onChange={e => setDraft({ ...draft, footnote: e.target.value })}
            />
          </Field>

          <div className="sa-faq-checks">
            <label className="sa-faq-check">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={e => setDraft({ ...draft, published: e.target.checked })}
              />
              <span>Visible on Help &amp; FAQ</span>
            </label>
            <label className={`sa-faq-check${audienceDisabled ? " is-disabled" : ""}`}>
              <input
                type="checkbox"
                checked={draft.founder}
                disabled={audienceDisabled}
                onChange={e => setDraft({ ...draft, founder: e.target.checked })}
              />
              <span>Founder</span>
            </label>
            <label className={`sa-faq-check${audienceDisabled ? " is-disabled" : ""}`}>
              <input
                type="checkbox"
                checked={draft.investor}
                disabled={audienceDisabled}
                onChange={e => setDraft({ ...draft, investor: e.target.checked })}
              />
              <span>Investor</span>
            </label>
          </div>
        </div>

        <div className="sa-edit-actions sa-faq-dialog-actions">
          <span />
          <button
            type="button"
            className="sa-edit-save"
            disabled={!draft.question.trim() || !draft.answer.trim()}
            onClick={() => onSave(draft)}
          >
            {isNew ? "Create entry" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FaqVisibleTo({ entry }: { entry: HelpFaqAdminEntry }) {
  if (!entry.published) {
    return <span className="sa-faq-visible-to is-muted">not visible</span>;
  }
  const audiences: string[] = [];
  if (entry.founder) audiences.push("founder");
  if (entry.investor) audiences.push("investor");
  if (!audiences.length) {
    return <span className="sa-faq-visible-to is-muted">none selected</span>;
  }
  return (
    <div className="sa-faq-visible-to">
      {audiences.map(label => (
        <span key={label} className="sa-faq-visible-tag">
          {label}
        </span>
      ))}
    </div>
  );
}

function emptyEntry(): HelpFaqAdminEntry {
  return {
    id: newHelpFaqAdminId(),
    question: "",
    answer: "",
    pointsText: "",
    footnote: "",
    published: true,
    founder: true,
    investor: false,
  };
}

export function HelpFaqAdmin() {
  const [entries, setEntries] = useState(() => loadHelpFaqAdminEntries());
  const [editor, setEditor] = useState<HelpFaqAdminEntry | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (entries.length) return;
    const seed = seedHelpFaqAdminFromCatalog();
    if (!seed.length) return;
    saveHelpFaqAdminEntries(seed);
    setEntries(seed);
  }, [entries.length]);

  const persist = useCallback((next: HelpFaqAdminEntry[]) => {
    setEntries(next);
    saveHelpFaqAdminEntries(next);
  }, []);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= entries.length || to >= entries.length) return;
    const next = [...entries];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  function saveEntry(entry: HelpFaqAdminEntry) {
    if (isNew) {
      persist([...entries, entry]);
    } else {
      persist(entries.map(row => (row.id === entry.id ? entry : row)));
    }
    setEditor(null);
    setIsNew(false);
  }

  return (
    <div className="sa-faq-admin">
      <header className="sa-faq-head">
        <div>
          <h1 className="sa-page-title">Help &amp; FAQ · Admin</h1>
          <p className="sa-page-lede">
            Drag rows to reorder (last-write-wins). Choose Founder and/or Investor so each question shows on the right Help page.
          </p>
        </div>
        <button
          type="button"
          className="sa-faq-new"
          onClick={() => {
            setIsNew(true);
            setEditor(emptyEntry());
          }}
        >
          + New question
        </button>
      </header>

      <div className="overview-panel sa-faq-table">
        <div className="sa-faq-table-head">
          <span className="sa-faq-col-drag" aria-hidden="true" />
          <span className="sa-faq-col-q">Question</span>
          <span className="sa-faq-col-visible">Visible to</span>
          <span className="sa-faq-col-status">Status</span>
          <span className="sa-faq-col-action" />
        </div>
        <ul className="sa-faq-list">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className={`sa-faq-row${dragIndex === index ? " is-dragging" : ""}${dropIndex === index ? " is-drop-target" : ""}`}
              onDragOver={event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragIndex !== null && dragIndex !== index) setDropIndex(index);
              }}
              onDragLeave={() => {
                if (dropIndex === index) setDropIndex(null);
              }}
              onDrop={event => {
                event.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, index);
                setDragIndex(null);
                setDropIndex(null);
              }}
            >
              <button
                type="button"
                className="sa-faq-drag-handle"
                title="Drag to reorder"
                aria-label={`Reorder: ${entry.question}`}
                draggable
                onDragStart={event => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", entry.id);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
              >
                <FaqDragHandleIcon />
              </button>
              <div className="sa-faq-q">
                <strong>{entry.question}</strong>
                <p>{entry.answer}</p>
              </div>
              <FaqVisibleTo entry={entry} />
              <div className="sa-faq-status">
                {entry.published ? (
                  <span className="sa-faq-badge published">Published</span>
                ) : (
                  <span className="sa-faq-badge draft">Draft</span>
                )}
              </div>
              <button
                type="button"
                className="sa-row-edit sa-faq-edit"
                onClick={() => {
                  setIsNew(false);
                  setEditor(entry);
                }}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>

      {editor ? (
        <FaqEditorDialog
          title={isNew ? "New FAQ entry" : "Edit FAQ entry"}
          isNew={isNew}
          initial={editor}
          onClose={() => {
            setEditor(null);
            setIsNew(false);
          }}
          onSave={saveEntry}
        />
      ) : null}
    </div>
  );
}
