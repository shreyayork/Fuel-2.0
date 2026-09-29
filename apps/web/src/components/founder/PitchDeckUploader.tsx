"use client";

import { useRef, useState } from "react";

/**
 * First-session pitch-deck upload flow. Renders a small modal-like card
 * over the company page that takes a PDF, posts it to /api/uploads/pitch-deck,
 * and on success invokes the supplied callback with the created
 * contextItemId + attachmentId so the parent can fire the
 * pitch-deck-evaluation playbook with those IDs in the prompt.
 */
export function PitchDeckUploader({
  onUploaded,
  onSkip,
}: {
  onUploaded: (ids: { contextItemId: string; attachmentId: string }) => void;
  onSkip: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/pitch-deck", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as
        | { contextItemId: string; attachmentId: string; byteSize: number }
        | { error: string };
      if (!res.ok) {
        if ("error" in json && json.error === "uploads_not_configured") {
          setError(
            "Pitch-deck uploads aren't enabled in this environment yet. Ask York IE to provision the uploads bucket, then come back.",
          );
          return;
        }
        setError(`Upload failed: ${"error" in json ? json.error : res.status}`);
        return;
      }
      if ("contextItemId" in json) {
        onUploaded({
          contextItemId: json.contextItemId,
          attachmentId: json.attachmentId,
        });
      }
    } catch (e) {
      setError((e as Error).message ?? "upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 26, 36, 0.6)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "min(520px, 92%)",
          background: "#172632",
          border: "1px solid #263947",
          borderRadius: 14,
          padding: 28,
          color: "#F4F6F8",
          fontFamily: "Inter, -apple-system, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#00B48A",
            marginBottom: 8,
          }}
        >
          One file to get started
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
          Upload your pitch deck.
        </h2>
        <p
          style={{
            marginTop: 10,
            color: "#CBD3DB",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          PDF only, 25&nbsp;MB max. The AI will score it against a structured
          rubric, surface the strengths and gaps, and recommend the single
          highest-leverage edit. You can find this evaluation later under{" "}
          <strong>Past assessments</strong>.
        </p>
        {error ? (
          <div
            style={{
              marginTop: 16,
              padding: 10,
              borderRadius: 6,
              background: "#3A1A1A",
              color: "#FF6B5B",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}
        <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            style={{
              padding: "12px 22px",
              borderRadius: 8,
              background: busy ? "#0E8A6A" : "#00B48A",
              color: "#0F1A24",
              fontWeight: 600,
              border: "none",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Uploading…" : "Choose PDF"}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            style={{
              padding: "12px 22px",
              borderRadius: 8,
              background: "transparent",
              color: "#CBD3DB",
              border: "1px solid #263947",
              cursor: "pointer",
            }}
          >
            Skip for now
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      </div>
    </div>
  );
}
