"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "6px 14px",
        fontSize: 12.5,
        fontWeight: 500,
        background: "var(--artifact-accent)",
        color: "#ffffff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      Print / Save as PDF
    </button>
  );
}
