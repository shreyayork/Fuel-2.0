"use client";

import { useEffect, useMemo, useState } from "react";
import type { Theme } from "@/lib/theme";
import type {
  CompanySignalObservation,
  InitiativeMilestoneSummary,
  InitiativeProgressSummary,
} from "@/components/views/CompanyPublicView";
import {
  milestoneDueDateToInputValue,
  normalizeMilestoneDueDate,
} from "@/lib/initiative-milestone-dates";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  drawerMiniBtnStyle,
  drawerSectionCardStyle,
  drawerSectionHeadStyle,
  drawerSectionLabelStyle,
  fieldLabelStyle,
  formControlStyle,
  INITIATIVE_FORM_CONTROL_CLASS,
} from "./styles";
import { HoverBtn } from "@/components/company/overview/drawerShared";
import { benchActionBtnStyle } from "@/components/company/overview/drawerStyles";

function formatUsd(n?: number): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function MilestoneEditIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function MilestoneRemoveIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function initiativeInputStyle(t: Theme): React.CSSProperties {
  return {
    padding: "6px 10px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 4,
    fontFamily: t.mono,
    fontSize: 12,
  };
}

// ---------------------------------------------------------------------------
// Initiative progress dashboard — baseline → current → target per signal,
// plus the qualitative milestones panel. Rendered inside the expanded
// InitiativeRow so operators can see at a glance "where were we, where are
// we now, where are we trying to get to" for each signal the initiative is
// instrumenting against.
// ---------------------------------------------------------------------------

export function InitiativeProgressPanel({
  t,
  initiativeId,
  companyUuid,
  progress,
  recentObservations,
  onStart,
}: {
  t: Theme;
  initiativeId: string;
  companyUuid: string;
  progress: InitiativeProgressSummary[];
  recentObservations: CompanySignalObservation[];
  onStart: (cb: () => void) => void;
}) {
  const [adding, setAdding] = useState(false);
  // Offer only signals the company has been observed against — saves the
  // user from scrolling the 100+ catalog when the relevant ones are
  // typically the half-dozen with recent data.
  const observedSignals = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; label: string; category: string; kind: CompanySignalObservation["signalKind"] }
    >();
    for (const o of recentObservations) {
      if (!byId.has(o.signalId)) {
        byId.set(o.signalId, {
          id: o.signalId,
          label: o.signalLabel,
          category: o.signalCategory,
          kind: o.signalKind,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [recentObservations]);

  return (
    <div>
      <div
        style={{
          fontFamily: t.mono,
          fontSize: 10,
          color: t.mutedSoft,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Progress — baseline · current · target</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAdding((x) => !x);
          }}
          style={{
            padding: "3px 8px",
            background: "transparent",
            color: t.muted,
            border: `1px solid ${t.rule}`,
            borderRadius: 4,
            fontFamily: t.sans,
            fontSize: 10.5,
            cursor: "pointer",
            textTransform: "none",
            letterSpacing: "0",
          }}
        >
          {adding ? "Cancel" : "+ Link signal"}
        </button>
      </div>

      {progress.length === 0 ? (
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.muted,
            padding: "8px 10px",
            border: `1px dashed ${t.rule}`,
            borderRadius: 6,
          }}
        >
          No signals tracked yet. Link a baseline (where you started) and a target
          (where you want to land) so the dashboard can narrate progress for you.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {progress.map((p) => (
            <ProgressRow
              key={p.signal.id}
              t={t}
              initiativeId={initiativeId}
              companyUuid={companyUuid}
              row={p}
              onStart={onStart}
            />
          ))}
        </div>
      )}

      {adding ? (
        <LinkSignalForm
          t={t}
          initiativeId={initiativeId}
          companyUuid={companyUuid}
          observedSignals={observedSignals}
          onStart={onStart}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </div>
  );
}

function ProgressRow({
  t,
  initiativeId,
  companyUuid,
  row,
  onStart,
}: {
  t: Theme;
  initiativeId: string;
  companyUuid: string;
  row: InitiativeProgressSummary;
  onStart: (cb: () => void) => void;
}) {
  const fmt = (v: InitiativeProgressSummary["baseline"] | InitiativeProgressSummary["current"] | InitiativeProgressSummary["target"]) => {
    if (!v) return null;
    if (v.valueNumeric != null) return formatBySignalUnit(v.valueNumeric, row.signal.unit);
    if (v.valueText) return v.valueText;
    if (v.valueBool != null) return v.valueBool ? "yes" : "no";
    return null;
  };
  const baselineVal = fmt(row.baseline);
  const currentVal = fmt(row.current);
  const targetVal = fmt(row.target);

  return (
    <div
      style={{
        border: `1px solid ${t.ruleSoft}`,
        borderRadius: 6,
        padding: "8px 10px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: t.sans, fontSize: 12.5, fontWeight: 600, color: t.ink }}>
          {row.signal.label}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: t.mono,
            fontSize: 11,
            color: t.muted,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>
            <span style={{ color: t.mutedSoft }}>Baseline:</span>{" "}
            {baselineVal ? (
              <span style={{ color: t.inkSoft }}>{baselineVal}</span>
            ) : (
              <span style={{ color: t.mutedSoft }}>—</span>
            )}
          </span>
          <span style={{ color: t.mutedSoft }}>→</span>
          <span>
            <span style={{ color: t.mutedSoft }}>Current:</span>{" "}
            {currentVal ? (
              <span style={{ color: t.accent }}>{currentVal}</span>
            ) : (
              <span style={{ color: t.mutedSoft }}>no recent data</span>
            )}
            {row.current ? (
              <span style={{ color: t.mutedSoft }}> · {row.current.period}</span>
            ) : null}
          </span>
          <span style={{ color: t.mutedSoft }}>→</span>
          <span>
            <span style={{ color: t.mutedSoft }}>Target:</span>{" "}
            {targetVal ? (
              <span style={{ color: t.inkSoft }}>{targetVal}</span>
            ) : (
              <span style={{ color: t.mutedSoft }}>—</span>
            )}
            {row.target?.targetDate ? (
              <span style={{ color: t.mutedSoft }}> by {row.target.targetDate}</span>
            ) : null}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {row.baseline ? (
          <UnlinkSignalButton
            t={t}
            initiativeId={initiativeId}
            companyUuid={companyUuid}
            signalId={row.signal.id}
            role="baseline"
            label="Remove baseline"
            onStart={onStart}
          />
        ) : null}
        {row.target ? (
          <UnlinkSignalButton
            t={t}
            initiativeId={initiativeId}
            companyUuid={companyUuid}
            signalId={row.signal.id}
            role="target"
            label="Remove target"
            onStart={onStart}
          />
        ) : null}
      </div>
    </div>
  );
}

function UnlinkSignalButton({
  t,
  initiativeId,
  companyUuid,
  signalId,
  role,
  label,
  onStart,
}: {
  t: Theme;
  initiativeId: string;
  companyUuid: string;
  signalId: string;
  role: "baseline" | "target";
  label: string;
  onStart: (cb: () => void) => void;
}) {
  return (
    <form
      action={(fd) => {
        onStart(async () => {
          const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
          await mod.unlinkInitiativeSignalAction(fd);
        });
      }}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "inline" }}
    >
      <input type="hidden" name="initiativeId" value={initiativeId} />
      <input type="hidden" name="signalId" value={signalId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="companyUuid" value={companyUuid} />
      <button
        type="submit"
        title={label}
        style={{
          padding: "2px 6px",
          background: "transparent",
          color: t.mutedSoft,
          border: `1px solid ${t.rule}`,
          borderRadius: 4,
          fontFamily: t.mono,
          fontSize: 9.5,
          cursor: "pointer",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {role === "baseline" ? "− base" : "− target"}
      </button>
    </form>
  );
}

function LinkSignalForm({
  t,
  initiativeId,
  companyUuid,
  observedSignals,
  onStart,
  onClose,
}: {
  t: Theme;
  initiativeId: string;
  companyUuid: string;
  observedSignals: Array<{
    id: string;
    label: string;
    category: string;
    kind: CompanySignalObservation["signalKind"];
  }>;
  onStart: (cb: () => void) => void;
  onClose: () => void;
}) {
  return (
    <form
      action={(fd) => {
        onStart(async () => {
          const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
          await mod.linkInitiativeSignalAction(fd);
          onClose();
        });
      }}
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: 8,
        padding: 10,
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        borderRadius: 6,
        display: "grid",
        gridTemplateColumns: "1fr 120px 1fr 140px auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <input type="hidden" name="initiativeId" value={initiativeId} />
      <input type="hidden" name="companyUuid" value={companyUuid} />
      <select name="signalId" defaultValue="" required style={initiativeInputStyle(t)}>
        <option value="" disabled>
          Pick a signal…
        </option>
        {observedSignals.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <select name="role" defaultValue="target" style={initiativeInputStyle(t)}>
        <option value="target">Target</option>
        <option value="baseline">Baseline</option>
      </select>
      <input
        name="valueNumeric"
        placeholder="Value (e.g. 5000000)"
        style={initiativeInputStyle(t)}
      />
      <input name="targetDate" placeholder="Target date (e.g. 2026-q4)" style={initiativeInputStyle(t)} />
      <button
        type="submit"
        style={{
          padding: "6px 12px",
          background: t.ink,
          color: t.bg,
          border: `1px solid ${t.ink}`,
          borderRadius: 4,
          fontFamily: t.sans,
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Link
      </button>
    </form>
  );
}

export function InitiativeMilestonesPanel({
  t,
  initiativeId,
  companyUuid,
  milestones,
  onStart,
  variant = "plain",
}: {
  t: Theme;
  initiativeId: string;
  companyUuid: string;
  milestones: InitiativeMilestoneSummary[];
  onStart: (cb: () => void) => void;
  /** Design initiative drawer card chrome. */
  variant?: "plain" | "drawer";
}) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState({ label: "", dueDate: "" });
  const isDrawer = variant === "drawer";
  const isLight = t.mode === "editorial";

  const closeAddForm = () => {
    setAdding(false);
    setAddDraft({ label: "", dueDate: "" });
  };

  const head = (
    <div
      style={
        isDrawer
          ? drawerSectionHeadStyle(t)
          : {
              fontFamily: t.mono,
              fontSize: 10,
              color: t.mutedSoft,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }
      }
    >
      <span style={isDrawer ? drawerSectionLabelStyle(t) : undefined}>Milestones</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (adding) closeAddForm();
          else setAdding(true);
        }}
        style={
          isDrawer
            ? drawerMiniBtnStyle(t)
            : {
                padding: "3px 8px",
                background: "transparent",
                color: t.muted,
                border: `1px solid ${t.rule}`,
                borderRadius: 4,
                fontFamily: t.sans,
                fontSize: 10.5,
                cursor: "pointer",
                textTransform: "none",
                letterSpacing: "0",
              }
        }
      >
        {adding ? "Cancel" : "+ Add milestone"}
      </button>
    </div>
  );

  const addForm = adding ? (
    isDrawer ? (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isLight ? t.bg : t.panelAlt,
          border: `1px solid ${t.rule}`,
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "14px 14px 12px",
        }}
      >
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0,1fr) minmax(0,180px)" }}>
          <label style={{ display: "block", minWidth: 0 }}>
            <span style={fieldLabelStyle(t)}>Milestone</span>
            <input
              value={addDraft.label}
              autoFocus
              placeholder="Milestone"
              onChange={(e) => setAddDraft((prev) => ({ ...prev, label: e.target.value }))}
              className={INITIATIVE_FORM_CONTROL_CLASS}
              style={{ ...formControlStyle(t), width: "100%" }}
            />
          </label>
          <label style={{ display: "block", minWidth: 0 }}>
            <span style={fieldLabelStyle(t)}>Due date</span>
            <DatePicker
              t={t}
              aria-label="Milestone due date"
              value={milestoneDueDateToInputValue(addDraft.dueDate)}
              onChange={(ymd) =>
                setAddDraft((prev) => ({
                  ...prev,
                  dueDate: normalizeMilestoneDueDate(ymd) ?? "",
                }))
              }
              placeholder="Pick a date"
              className={INITIATIVE_FORM_CONTROL_CLASS}
              triggerStyle={{
                ...formControlStyle(t),
                fontSize: 13,
                fontWeight: 500,
                width: "100%",
              }}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <HoverBtn
            type="button"
            styleFor={(hovered) => benchActionBtnStyle(t, "cancel", { hovered })}
            onClick={closeAddForm}
          >
            Cancel
          </HoverBtn>
          <HoverBtn
            type="button"
            disabled={!addDraft.label.trim()}
            styleFor={(hovered) =>
              benchActionBtnStyle(t, "save", {
                hovered,
                disabled: !addDraft.label.trim(),
              })
            }
            onClick={() => {
              const label = addDraft.label.trim();
              if (!label) return;
              const fd = new FormData();
              fd.set("initiativeId", initiativeId);
              fd.set("companyUuid", companyUuid);
              fd.set("label", label);
              fd.set("dueDate", normalizeMilestoneDueDate(addDraft.dueDate) ?? "");
              onStart(async () => {
                const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
                await mod.createMilestoneAction(fd);
                closeAddForm();
              });
            }}
          >
            Save
          </HoverBtn>
        </div>
      </div>
    ) : (
      <form
        action={(fd) => {
          onStart(async () => {
            fd.set("dueDate", normalizeMilestoneDueDate(addDraft.dueDate) ?? "");
            const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
            await mod.createMilestoneAction(fd);
            closeAddForm();
          });
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: 8, display: "flex", gap: 6 }}
      >
        <input type="hidden" name="initiativeId" value={initiativeId} />
        <input type="hidden" name="companyUuid" value={companyUuid} />
        <input
          name="label"
          required
          placeholder="Milestone"
          value={addDraft.label}
          onChange={(e) => setAddDraft((prev) => ({ ...prev, label: e.target.value }))}
          style={{ ...initiativeInputStyle(t), flex: 1, fontFamily: t.sans }}
        />
        <input
          type="date"
          aria-label="Milestone due date"
          value={milestoneDueDateToInputValue(addDraft.dueDate)}
          onChange={(e) =>
            setAddDraft((prev) => ({
              ...prev,
              dueDate: normalizeMilestoneDueDate(e.target.value) ?? "",
            }))
          }
          style={initiativeInputStyle(t)}
        />
        <button
          type="submit"
          style={{
            padding: "6px 12px",
            background: t.ink,
            color: t.bg,
            border: `1px solid ${t.ink}`,
            borderRadius: 4,
            fontFamily: t.sans,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </form>
    )
  ) : null;

  const body = (
    <>
      {milestones.length === 0 && !adding ? (
        <p
          style={{
            color: t.muted,
            fontFamily: t.sans,
            fontSize: isDrawer ? 13 : 12,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {isDrawer ? "No milestones yet." : "No milestones set."}
        </p>
      ) : null}

      {milestones.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: isDrawer ? 6 : 4 }}>
          {milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              t={t}
              initiativeId={initiativeId}
              companyUuid={companyUuid}
              milestone={m}
              onStart={onStart}
              drawer={isDrawer}
            />
          ))}
        </div>
      ) : null}

      {addForm}
    </>
  );

  if (isDrawer) {
    return (
      <section style={drawerSectionCardStyle(t)}>
        {head}
        {body}
      </section>
    );
  }

  return (
    <div>
      {head}
      {body}
    </div>
  );
}

function MilestoneRow({
  t,
  initiativeId,
  companyUuid,
  milestone,
  onStart,
  drawer = false,
}: {
  t: Theme;
  initiativeId: string;
  companyUuid: string;
  milestone: InitiativeMilestoneSummary;
  onStart: (cb: () => void) => void;
  drawer?: boolean;
}) {
  const isDone = milestone.status === "done";
  const [editingNote, setEditingNote] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [noteDraft, setNoteDraft] = useState(milestone.note ?? "");
  const [labelDraft, setLabelDraft] = useState(milestone.label);
  const [dueDraft, setDueDraft] = useState(milestone.dueDate ?? "");
  const [hovered, setHovered] = useState(false);
  const noteText = milestone.note?.trim() ?? "";
  const showChrome = hovered || editingNote || editingDetails;
  const isLight = t.mode === "editorial";

  useEffect(() => {
    if (editingDetails) return;
    setLabelDraft(milestone.label);
    setDueDraft(milestone.dueDate ?? "");
    setNoteDraft(milestone.note ?? "");
  }, [milestone.label, milestone.dueDate, milestone.note, editingDetails]);

  const saveNote = () => {
    const fd = new FormData();
    fd.set("initiativeId", initiativeId);
    fd.set("milestoneId", milestone.id);
    fd.set("companyUuid", companyUuid);
    fd.set("note", noteDraft.slice(0, 280));
    onStart(async () => {
      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
      await mod.updateMilestoneNoteAction(fd);
      setEditingNote(false);
    });
  };

  const cancelNote = () => {
    setNoteDraft(milestone.note ?? "");
    setEditingNote(false);
  };

  const openDetailsEdit = () => {
    setLabelDraft(milestone.label);
    setDueDraft(milestone.dueDate ?? "");
    setEditingNote(false);
    setEditingDetails(true);
  };

  const cancelDetailsEdit = () => {
    setLabelDraft(milestone.label);
    setDueDraft(milestone.dueDate ?? "");
    setEditingDetails(false);
  };

  const saveDetails = () => {
    const label = labelDraft.trim();
    if (!label) return;
    const fd = new FormData();
    fd.set("initiativeId", initiativeId);
    fd.set("milestoneId", milestone.id);
    fd.set("companyUuid", companyUuid);
    fd.set("label", label);
    fd.set("dueDate", normalizeMilestoneDueDate(dueDraft) ?? "");
    onStart(async () => {
      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
      await mod.updateMilestoneAction(fd);
      setEditingDetails(false);
    });
  };

  const toggleForm = (
    <form
      action={(fd) => {
        onStart(async () => {
          const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
          await mod.updateMilestoneStatusAction(fd);
        });
      }}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "inline", marginTop: 1 }}
    >
      <input type="hidden" name="initiativeId" value={initiativeId} />
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <input type="hidden" name="companyUuid" value={companyUuid} />
      <input type="hidden" name="status" value={isDone ? "todo" : "done"} />
      <button
        type="submit"
        title={isDone ? "Mark incomplete" : "Mark complete"}
        aria-label={isDone ? "Mark incomplete" : "Mark complete"}
        style={
          drawer
            ? {
                alignItems: "center",
                background: isDone ? `${t.accent}29` : "transparent",
                border: `1px solid ${t.accent}73`,
                borderRadius: 4,
                color: t.accent,
                cursor: "pointer",
                display: "inline-flex",
                flexShrink: 0,
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 800,
                height: 16,
                justifyContent: "center",
                lineHeight: 1,
                padding: 0,
                width: 16,
              }
            : {
                width: 18,
                height: 18,
                background: isDone ? t.accent : "transparent",
                border: `1px solid ${isDone ? t.accent : t.rule}`,
                borderRadius: 4,
                cursor: "pointer",
                color: isDone ? t.bg : "transparent",
                fontSize: 12,
                lineHeight: 1,
              }
        }
      >
        {isDone ? "✓" : ""}
      </button>
    </form>
  );

  const deleteForm = (
    <form
      action={(fd) => {
        onStart(async () => {
          const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
          await mod.deleteMilestoneAction(fd);
        });
      }}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "inline" }}
    >
      <input type="hidden" name="initiativeId" value={initiativeId} />
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <input type="hidden" name="companyUuid" value={companyUuid} />
      <button
        type="submit"
        title="Delete milestone"
        aria-label="Remove milestone"
        style={{
          alignItems: "center",
          background: "transparent",
          border: 0,
          color: t.muted,
          cursor: "pointer",
          display: "inline-flex",
          flexShrink: 0,
          justifyContent: "center",
          lineHeight: 1,
          opacity: drawer ? (showChrome ? 1 : 0.55) : 1,
          padding: 2,
          transition: "opacity 0.12s",
        }}
      >
        <MilestoneRemoveIcon color="currentColor" />
      </button>
    </form>
  );

  if (!drawer) {
    return (
      <div
        style={{
          alignItems: "flex-start",
          border: `1px solid ${t.ruleSoft}`,
          borderRadius: 6,
          display: "flex",
          gap: 10,
          padding: "6px 10px",
        }}
      >
        {toggleForm}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: isDone ? t.muted : t.ink,
              fontFamily: t.sans,
              fontSize: 12.5,
              textDecoration: isDone ? "line-through" : "none",
            }}
          >
            {milestone.label}
          </div>
          {editingNote ? (
            <div style={{ marginTop: 6 }}>
              <textarea
                value={noteDraft}
                maxLength={280}
                rows={2}
                autoFocus
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveNote();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelNote();
                  }
                }}
                onBlur={saveNote}
                style={{
                  ...initiativeInputStyle(t),
                  width: "100%",
                  resize: "vertical",
                  fontFamily: t.sans,
                }}
              />
              <div style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft, marginTop: 4 }}>
                Enter to save · Esc to cancel · {noteDraft.length}/280
              </div>
            </div>
          ) : noteText ? (
            <button
              type="button"
              onClick={() => {
                setNoteDraft(milestone.note ?? "");
                setEditingNote(true);
              }}
              style={{
                marginTop: 4,
                background: "transparent",
                border: "none",
                padding: 0,
                fontFamily: t.sans,
                fontSize: 11.5,
                color: t.muted,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {noteText}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNoteDraft("");
                setEditingNote(true);
              }}
              style={{
                marginTop: 4,
                background: "transparent",
                border: "none",
                padding: 0,
                fontFamily: t.sans,
                fontSize: 11,
                color: t.mutedSoft,
                cursor: "pointer",
              }}
            >
              + Note
            </button>
          )}
        </div>
        {milestone.dueDate ? (
          <span style={{ fontFamily: t.mono, fontSize: 10.5, color: t.mutedSoft, marginTop: 2 }}>
            {milestone.dueDate}
          </span>
        ) : null}
        {deleteForm}
      </div>
    );
  }

  // Design `.initiative-milestone-item` / edit card
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: editingDetails
          ? "transparent"
          : hovered
            ? `${t.accent}0A`
            : "transparent",
        borderRadius: 8,
        padding: editingDetails ? 0 : "8px 6px",
        transition: "background 0.12s",
      }}
    >
      <div
        style={{
          alignItems: "flex-start",
          display: "grid",
          gap: 10,
          gridTemplateColumns: editingDetails
            ? "18px minmax(0, 1fr)"
            : "18px minmax(0, 1fr) auto auto",
        }}
      >
        {toggleForm}
        {editingDetails ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isLight ? t.bg : t.panelAlt,
              border: `1px solid ${t.rule}`,
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "14px 14px 12px",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "minmax(0,1fr) minmax(0,180px)",
              }}
            >
              <label style={{ display: "block", minWidth: 0 }}>
                <span style={fieldLabelStyle(t)}>Milestone</span>
                <input
                  value={labelDraft}
                  autoFocus
                  placeholder="Milestone"
                  aria-label="Milestone title"
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveDetails();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelDetailsEdit();
                    }
                  }}
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  style={{ ...formControlStyle(t), width: "100%" }}
                />
              </label>
              <label style={{ display: "block", minWidth: 0 }}>
                <span style={fieldLabelStyle(t)}>Due date</span>
                <DatePicker
                  t={t}
                  aria-label="Milestone due date"
                  value={milestoneDueDateToInputValue(dueDraft)}
                  onChange={(ymd) =>
                    setDueDraft(normalizeMilestoneDueDate(ymd) ?? "")
                  }
                  placeholder="Pick a date"
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  triggerStyle={{
                    ...formControlStyle(t),
                    fontSize: 13,
                    fontWeight: 500,
                    width: "100%",
                  }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <HoverBtn
                type="button"
                styleFor={(hovered) => benchActionBtnStyle(t, "cancel", { hovered })}
                onClick={cancelDetailsEdit}
              >
                Cancel
              </HoverBtn>
              <HoverBtn
                type="button"
                disabled={!labelDraft.trim()}
                styleFor={(hovered) =>
                  benchActionBtnStyle(t, "save", {
                    hovered,
                    disabled: !labelDraft.trim(),
                  })
                }
                onClick={saveDetails}
              >
                Save
              </HoverBtn>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetailsEdit();
                }}
                style={{
                  background: "transparent",
                  border: 0,
                  color: isDone ? t.muted : t.ink,
                  cursor: "pointer",
                  fontFamily: t.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  padding: 0,
                  textAlign: "left",
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                {milestone.label}
              </button>
              {editingNote ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                  <textarea
                    value={noteDraft}
                    maxLength={280}
                    rows={2}
                    autoFocus
                    placeholder="Add a short note…"
                    aria-label={`Note for ${milestone.label}`}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveNote();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelNote();
                      }
                    }}
                    onBlur={saveNote}
                    style={{
                      background: isLight ? t.bg : t.panelAlt,
                      border: `1px solid ${t.rule}`,
                      borderRadius: 6,
                      color: t.ink,
                      fontFamily: t.sans,
                      fontSize: 12,
                      lineHeight: 1.45,
                      outline: "none",
                      padding: "8px 10px",
                      resize: "none",
                      width: "100%",
                    }}
                  />
                  <span style={{ color: t.mutedSoft, fontFamily: t.sans, fontSize: 10, fontWeight: 600 }}>
                    Enter to save · Esc to cancel
                  </span>
                </div>
              ) : noteText ? (
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft(milestone.note ?? "");
                    setEditingNote(true);
                  }}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: t.muted,
                    cursor: "pointer",
                    fontFamily: t.sans,
                    fontSize: 12,
                    lineHeight: 1.45,
                    overflow: "hidden",
                    padding: 0,
                    textAlign: "left",
                    textDecoration: "none",
                  }}
                >
                  {noteText}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft("");
                    setEditingNote(true);
                  }}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: t.accent,
                    cursor: "pointer",
                    fontFamily: t.sans,
                    fontSize: 11,
                    fontWeight: 600,
                    opacity: showChrome ? 1 : 0,
                    padding: 0,
                    textAlign: "left",
                    transition: "opacity 0.12s",
                  }}
                >
                  + Note
                </button>
              )}
            </div>
            <div
              style={{
                alignItems: "center",
                display: "inline-flex",
                gap: 8,
                paddingTop: 1,
              }}
            >
              <em
                style={{
                  color: t.muted,
                  fontFamily: t.sans,
                  fontSize: 11,
                  fontStyle: "normal",
                  lineHeight: 1.35,
                  whiteSpace: "nowrap",
                }}
              >
                {milestone.dueDate || "No due date"}
              </em>
              <button
                type="button"
                aria-label={`Edit ${milestone.label}`}
                title="Edit milestone"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetailsEdit();
                }}
                style={{
                  alignItems: "center",
                  background: "transparent",
                  border: 0,
                  color: t.muted,
                  cursor: "pointer",
                  display: "inline-flex",
                  flexShrink: 0,
                  justifyContent: "center",
                  lineHeight: 1,
                  opacity: showChrome ? 1 : 0.55,
                  padding: 2,
                  transition: "opacity 0.12s",
                }}
              >
                <MilestoneEditIcon color="currentColor" />
              </button>
            </div>
            {deleteForm}
          </>
        )}
      </div>
    </div>
  );
}

/** Compact "$3.2M" / "45%" / "24mo" formatter shared between the progress
 *  row and the brief's suggestion row. Falls back to a localized number when
 *  the signal has no unit. */
function formatBySignalUnit(value: number, unit: string | null): string {
  switch (unit) {
    case "usd":
      return formatUsd(value) ?? `$${value.toLocaleString()}`;
    case "pct":
      return `${Math.round(value * 10) / 10}%`;
    case "months":
      return `${value}mo`;
    case "days":
      return `${value}d`;
    case "ratio":
      return `${Math.round(value * 100) / 100}x`;
    default:
      return value.toLocaleString();
  }
}
