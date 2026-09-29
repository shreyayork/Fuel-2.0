"use client";

import type { Theme } from "@/lib/theme";
import type { CompanyAdvisorSummary } from "@/components/views/CompanyPublicView";
import { initiativeInputStyle } from "./InitiativeSidePanels";
import { PILLAR_OPTIONS, pillarFromStored, type InitiativePillar } from "./pillars";

export function NewInitiativeForm({
  t,
  companyUuid,
  sourceArtifactId,
  advisorPool,
  allowAdvisorLinking = true,
  onDone,
  onStart,
  onSuccess,
  onError,
  submitting = false,
  initialName,
  initialDescription,
  initialKind,
  initialArea,
}: {
  t: Theme;
  companyUuid: string;
  sourceArtifactId?: string;
  advisorPool: CompanyAdvisorSummary[];
  allowAdvisorLinking?: boolean;
  onDone: () => void;
  onStart: (cb: () => Promise<void>) => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  submitting?: boolean;
  initialName?: string;
  initialDescription?: string;
  initialKind?: "continuous" | "onetime";
  initialArea?: string;
}) {
  const initialPillar: InitiativePillar = pillarFromStored({ area: initialArea });

  return (
    <form
      action={(fd) => {
        if (submitting) return;
        onStart(async () => {
          const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
          const result = await mod.createInitiativeAction(fd);
          if (!result?.id) {
            onError?.("Could not create initiative. Please check the form and try again.");
            return;
          }
          if (onSuccess) {
            onSuccess();
            return;
          }
          onDone();
        });
      }}
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        padding: 16,
        display: "grid",
        gap: 10,
        fontFamily: t.sans,
      }}
    >
      <input type="hidden" name="companyUuid" value={companyUuid} />
      {sourceArtifactId ? (
        <input type="hidden" name="sourceArtifactId" value={sourceArtifactId} />
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px", gap: 10 }}>
        <input
          name="name"
          placeholder="Initiative name"
          required
          defaultValue={initialName ?? ""}
          disabled={submitting}
          style={{ ...initiativeInputStyle(t), fontFamily: t.sans }}
        />
        <select
          name="kind"
          defaultValue={initialKind ?? "continuous"}
          disabled={submitting}
          style={initiativeInputStyle(t)}
        >
          <option value="continuous">Continuous</option>
          <option value="onetime">One-time</option>
        </select>
        <select
          name="pillar"
          defaultValue={initialPillar}
          disabled={submitting}
          style={initiativeInputStyle(t)}
        >
          {PILLAR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="description"
        placeholder="What's the goal and why now? (optional)"
        rows={2}
        defaultValue={initialDescription ?? ""}
        disabled={submitting}
        style={{ ...initiativeInputStyle(t), fontFamily: t.sans, resize: "vertical" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
        <input
          name="ownerEmail"
          placeholder="Owner email (defaults to you)"
          disabled={submitting}
          style={initiativeInputStyle(t)}
        />
        <input
          name="due"
          placeholder="Due (e.g. 2026-Q3)"
          disabled={submitting}
          style={initiativeInputStyle(t)}
        />
      </div>
      {allowAdvisorLinking && advisorPool.length > 0 ? (
        <div>
          <div
            style={{
              fontFamily: t.mono,
              fontSize: 10,
              color: t.mutedSoft,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Advisors on this initiative
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {advisorPool.map((a) => (
              <label
                key={a.advisorId}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  border: `1px solid ${t.rule}`,
                  borderRadius: 999,
                  fontFamily: t.sans,
                  fontSize: 12,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="advisorId"
                  value={a.advisorId}
                  disabled={submitting}
                />
                {a.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          style={{
            padding: "8px 14px",
            background: submitting ? t.panelAlt : t.ink,
            color: submitting ? t.muted : t.bg,
            border: `1px solid ${submitting ? t.rule : t.ink}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: 500,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Creating…" : "Create initiative"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onDone}
          style={{
            padding: "8px 14px",
            background: "transparent",
            color: t.muted,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
