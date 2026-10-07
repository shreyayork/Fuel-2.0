"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Link from "@tiptap/extension-link";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Theme } from "@/lib/theme";
import { ctaPrimaryStyle } from "@/lib/theme";
import {
  FAQ_ASK_FUEL_HREF,
  isFaqActionLink,
  markdownToTipTapDoc,
  sanitizeFaqHref,
  tipTapDocToMarkdown,
  type TipTapDoc,
} from "@/lib/faq-rich-text";

function fieldShell(t: Theme, minHeight: number, mono: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: mono ? t.mono : t.sans,
    fontSize: mono ? 12 : 13,
    width: "100%",
    minHeight,
    lineHeight: 1.5,
  };
}

function toolbarBtn(t: Theme, active?: boolean, disabled?: boolean): CSSProperties {
  return {
    padding: "4px 10px",
    background: active ? `${t.accent}14` : "transparent",
    color: disabled ? t.mutedSoft : active ? t.accent : t.inkSoft,
    border: `1px solid ${active ? t.accent : t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

/**
 * TipTap link-only editor for FAQ answer / points / footnote.
 * Persists the same `[text](url)` markdown as before — no schema change.
 */
export function FaqLinkedTextarea({
  t,
  name,
  defaultValue,
  required,
  placeholder,
  minHeight = 80,
  mono = false,
}: {
  t: Theme;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  minHeight?: number;
  mono?: boolean;
}) {
  const popoverId = useId();
  const [markdown, setMarkdown] = useState(defaultValue ?? "");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState("");

  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const hrefInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openLinkPanelRef = useRef<() => void>(() => undefined);

  const extensions = useMemo(
    () => [
      Document,
      Paragraph,
      Text,
      HardBreak,
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto", "action"],
        HTMLAttributes: {
          rel: "noopener noreferrer",
          class: "faq-tiptap-link",
        },
        isAllowedUri: (url) => sanitizeFaqHref(url) != null,
      }),
    ],
    [placeholder],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions,
    content: markdownToTipTapDoc(defaultValue ?? ""),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder ?? "FAQ content",
        class: "faq-tiptap-editor",
        style: [
          `min-height:${minHeight}px`,
          "outline:none",
          "white-space:pre-wrap",
          "overflow-wrap:anywhere",
          `font-family:${mono ? t.mono : t.sans}`,
          `font-size:${mono ? 12 : 13}px`,
          `color:${t.ink}`,
          "line-height:1.5",
        ].join(";"),
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (text == null) return false;
        event.preventDefault();
        const { state, dispatch } = _view;
        const tr = state.tr.insertText(text.replace(/\r\n/g, "\n"));
        dispatch(tr);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          openLinkPanelRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const next = tipTapDocToMarkdown(ed.getJSON() as TipTapDoc);
      setMarkdown((prev) => (prev === next ? prev : next));
    },
  });

  const selectionState = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return { inLink: false, canLink: false };
      const inLink = ed.isActive("link");
      const { empty } = ed.state.selection;
      return { inLink, canLink: !empty || inLink };
    },
  });
  const inLink = selectionState?.inLink ?? false;
  const canLink = selectionState?.canLink ?? false;

  const closeLinkPanel = useCallback(() => {
    setLinkOpen(false);
    setError(null);
    editor?.commands.focus();
  }, [editor]);

  const openLinkPanel = useCallback(() => {
    if (!editor) return;
    const { empty } = editor.state.selection;
    const activeLink = editor.isActive("link");
    if (empty && !activeLink) {
      setError("Select text first.");
      setLinkOpen(false);
      setLinkHref("");
      setSelectedPreview("");
      window.setTimeout(() => {
        setError((prev) => (prev === "Select text first." ? null : prev));
      }, 2200);
      return;
    }
    if (activeLink) {
      editor.chain().focus().extendMarkRange("link").run();
    }
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    setSelectedPreview(text);
    setLinkHref((editor.getAttributes("link").href as string | undefined) ?? "");
    setError(null);
    setLinkOpen(true);
  }, [editor]);

  openLinkPanelRef.current = openLinkPanel;

  // Reload when modal opens a different FAQ row.
  useEffect(() => {
    if (!editor) return;
    const next = defaultValue ?? "";
    const current = tipTapDocToMarkdown(editor.getJSON() as TipTapDoc);
    if (current === next) return;
    editor.commands.setContent(markdownToTipTapDoc(next), { emitUpdate: false });
    setMarkdown(next);
    setLinkOpen(false);
    setError(null);
  }, [defaultValue, editor]);

  useEffect(() => {
    if (!editor) return;
    const style = document.createElement("style");
    style.setAttribute("data-faq-tiptap", "1");
    style.textContent = `
      .faq-tiptap-editor a.faq-tiptap-link {
        color: ${t.accent};
        font-weight: 650;
        text-decoration: none;
        cursor: pointer;
      }
      .faq-tiptap-editor a.faq-tiptap-link:hover {
        text-decoration: underline;
      }
      .faq-tiptap-editor p { margin: 0; }
      .faq-tiptap-editor p.is-editor-empty:first-child::before {
        color: ${t.mutedSoft};
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [editor, t.accent, t.mutedSoft]);

  // Focus URL input when popover opens.
  useEffect(() => {
    if (!linkOpen) return;
    const id = window.requestAnimationFrame(() => {
      hrefInputRef.current?.focus();
      hrefInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [linkOpen]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!linkOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (linkBtnRef.current?.contains(target)) return;
      setLinkOpen(false);
      setError(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLinkPanel();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [linkOpen, closeLinkPanel]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = sanitizeFaqHref(linkHref);
    if (!href) {
      setError(
        "Enter a valid URL, path, /company/{{company_id}}?tab=…, or use Ask Fuel below.",
      );
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      setError("Select text first.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setError(null);
    const next = tipTapDocToMarkdown(editor.getJSON() as TipTapDoc);
    setMarkdown((prev) => (prev === next ? prev : next));
  }, [editor, linkHref]);

  const applyAskFuelLink = useCallback(() => {
    if (!editor) return;
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      setError("Select text first.");
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: FAQ_ASK_FUEL_HREF })
      .run();
    setLinkOpen(false);
    setError(null);
    const next = tipTapDocToMarkdown(editor.getJSON() as TipTapDoc);
    setMarkdown((prev) => (prev === next ? prev : next));
  }, [editor]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setError(null);
    const next = tipTapDocToMarkdown(editor.getJSON() as TipTapDoc);
    setMarkdown((prev) => (prev === next ? prev : next));
  }, [editor]);

  return (
    <div style={{ display: "grid", gap: 0 }}>
      <input type="hidden" name={name} value={markdown} readOnly />
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={markdown}
          onChange={() => undefined}
          style={{
            position: "absolute",
            opacity: 0,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      ) : null}

      <div
        style={{
          border: `1px solid ${t.rule}`,
          borderRadius: 6,
          overflow: "visible",
          background: t.panelAlt,
        }}
      >
        <div
          role="toolbar"
          aria-label="Formatting"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            padding: "6px 8px",
            borderBottom: `1px solid ${t.rule}`,
            background: t.panel,
            borderRadius: "6px 6px 0 0",
          }}
        >
          <button
            ref={linkBtnRef}
            type="button"
            title={canLink ? (inLink ? "Edit link" : "Add link") : "Select text first"}
            aria-label={inLink ? "Edit link" : "Add link"}
            aria-haspopup="dialog"
            aria-expanded={linkOpen}
            aria-controls={linkOpen ? popoverId : undefined}
            disabled={!canLink}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!canLink) return;
              if (linkOpen) {
                closeLinkPanel();
                return;
              }
              openLinkPanel();
            }}
            style={toolbarBtn(t, inLink || linkOpen, !canLink)}
          >
            {inLink ? "Edit link" : "Link"}
          </button>
          {inLink ? (
            <button
              type="button"
              title="Remove link"
              aria-label="Remove link"
              onMouseDown={(e) => e.preventDefault()}
              onClick={removeLink}
              style={toolbarBtn(t)}
            >
              Unlink
            </button>
          ) : null}
          <span style={{ fontFamily: t.sans, fontSize: 10, color: t.muted, marginLeft: "auto" }}>
            ⌘/Ctrl+K
          </span>
          {!linkOpen && error ? (
            <span
              role="status"
              aria-live="polite"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 8,
                zIndex: 30,
                padding: "6px 8px",
                background: t.panel,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 11,
                color: t.negative,
                boxShadow: `0 4px 12px ${t.borderSubtle}`,
              }}
            >
              {error}
            </span>
          ) : null}

          {linkOpen ? (
            <div
              ref={popoverRef}
              id={popoverId}
              role="dialog"
              aria-modal="true"
              aria-label="Add or edit link"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 8,
                zIndex: 40,
                width: "min(320px, calc(100% - 16px))",
                padding: 10,
                background: t.panel,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                boxShadow: `0 8px 24px ${t.borderSubtle}`,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontFamily: t.sans, fontSize: 12, fontWeight: 600, color: t.ink }}>
                {inLink ? "Edit link" : "Add link"}
                {selectedPreview ? (
                  <span style={{ fontWeight: 400, color: t.muted }}>
                    {" "}
                    — “{selectedPreview.slice(0, 36)}
                    {selectedPreview.length > 36 ? "…" : ""}”
                  </span>
                ) : null}
              </div>
              <label
                style={{
                  display: "grid",
                  gap: 4,
                  fontFamily: t.sans,
                  fontSize: 11,
                  color: t.muted,
                }}
              >
                URL
                <input
                  ref={hrefInputRef}
                  value={linkHref}
                  onChange={(e) => setLinkHref(e.target.value)}
                  placeholder="https://…, /path, or /company/{{company_id}}?tab=…"
                  aria-invalid={error != null}
                  style={{
                    padding: "7px 9px",
                    background: t.panelAlt,
                    color: t.ink,
                    border: `1px solid ${error ? t.negative : t.rule}`,
                    borderRadius: 6,
                    fontFamily: t.sans,
                    fontSize: 13,
                    width: "100%",
                    overflowWrap: "anywhere",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      closeLinkPanel();
                    }
                  }}
                />
              </label>
              <div style={{ fontFamily: t.sans, fontSize: 10, color: t.muted, lineHeight: 1.45 }}>
                Company-scoped path: use{" "}
                <code style={{ fontFamily: t.mono, fontSize: 10 }}>{"{{company_id}}"}</code>
                {" "}— e.g.{" "}
                <code style={{ fontFamily: t.mono, fontSize: 10 }}>
                  /company/{"{{company_id}}"}?tab=intelligence
                </code>
                . Resolved per viewer’s active company at Help render.
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyAskFuelLink}
                title="Opens Ask Fuel AI sidebar — no URL"
                style={{
                  ...toolbarBtn(t, isFaqActionLink(linkHref)),
                  justifySelf: "start",
                }}
              >
                Insert Ask Fuel link
              </button>
              {error ? (
                <div role="alert" style={{ fontFamily: t.sans, fontSize: 12, color: t.negative }}>
                  {error}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" onClick={closeLinkPanel} style={toolbarBtn(t)}>
                  Cancel
                </button>
                {inLink ? (
                  <button type="button" onClick={removeLink} style={toolbarBtn(t)}>
                    Unlink
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={applyLink}
                  style={{
                    ...toolbarBtn(t),
                    ...ctaPrimaryStyle(t),
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ ...fieldShell(t, minHeight, mono), border: "none", borderRadius: "0 0 6px 6px" }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
