"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import { BREAKPOINTS, TOUCH_TARGET_MIN, mqMax, useMediaQuery } from "@/lib/responsive";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import { drawerCloseBtnStyle } from "@/components/drawer/styles";
import {
  manualObservationValuePlaceholder,
  parseManualObservationValue,
  type SignalCatalogItem,
} from "@/lib/signals/group-catalog";
import { addManualObservationAction } from "@/app/(app)/company/[uuid]/actions";
import {
  formatIntelligencePeriod,
  intelligencePeriodYearOptions,
  INTELLIGENCE_QUARTERS,
  normalizeIntelligencePeriod,
  parseIntelligencePeriod,
} from "./format";
import { HoverBtn } from "@/components/company/overview/drawerShared";
import {
  benchActionBtnStyle,
  benchActionsStyle,
} from "@/components/company/overview/drawerStyles";
import { SignalCatalogPicker } from "./SignalCatalogPicker";
import {
  drawerFormInputStyle,
  drawerFormControlStyle,
  INTELLIGENCE_DRAWER_INPUT_CLASS,
  intelligenceDrawerInputCss,
} from "./styles";

function fieldLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 6,
  };
}

function CloseIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 3l8 8M11 3L3 11"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogIntelligenceDrawer({
  t,
  open,
  companyUuid,
  signalCatalog,
  defaultPeriod,
  onClose,
  onLogged,
}: {
  t: Theme;
  open: boolean;
  companyUuid: string;
  signalCatalog: SignalCatalogItem[];
  defaultPeriod?: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const sheet = useMediaQuery(mqMax(BREAKPOINTS.md), false);
  const [signalId, setSignalId] = useState("");
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState(() =>
    normalizeIntelligencePeriod(defaultPeriod),
  );
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    setSignalId("");
    setValue("");
    setPeriod(normalizeIntelligencePeriod(defaultPeriod));
    setNote("");
  }, [open, defaultPeriod]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const { mounted, visible, durationMs } = useDrawerPresence(open);

  const selected = useMemo(
    () => signalCatalog.find((s) => s.id === signalId) ?? null,
    [signalCatalog, signalId],
  );

  // Clear / reset value when the selected signal (and thus kind) changes —
  // matches prior IntelligenceTimeline behavior for type-aware inputs.
  const handleSignalChange = (nextId: string) => {
    setSignalId(nextId);
    const next = signalCatalog.find((s) => s.id === nextId) ?? null;
    setValue(next?.kind === "boolean" ? "true" : "");
  };

  const periodParts = parseIntelligencePeriod(period);
  const yearOptions = intelligencePeriodYearOptions(periodParts.year);
  const valuePlaceholder = manualObservationValuePlaceholder(selected);
  const parsedValue = selected
    ? parseManualObservationValue(selected, value)
    : null;
  const valueInvalid =
    Boolean(selected && value.trim()) && parsedValue !== null && !parsedValue.valid;

  const canSubmit = Boolean(
    signalId &&
      selected &&
      periodParts.quarter &&
      periodParts.year &&
      parsedValue?.valid,
  );

  const submit = async () => {
    if (!canSubmit || !selected || !parsedValue?.valid || submitLock.current) return;
    const parsed = parsedValue;
    submitLock.current = true;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("uuid", companyUuid);
      fd.set("signalId", selected.id);
      fd.set("period", formatIntelligencePeriod(periodParts.quarter, periodParts.year));
      if (parsed.valueNumeric != null) {
        fd.set("valueNumeric", String(parsed.valueNumeric));
      }
      if (parsed.valueText != null) fd.set("valueText", parsed.valueText);
      if (parsed.valueBool != null) fd.set("valueBool", String(parsed.valueBool));
      if (note.trim()) fd.set("note", note.trim());
      await addManualObservationAction(fd);
      onLogged();
      onClose();
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  };

  if (!mounted) return null;

  const valueControl =
    selected?.kind === "boolean" ? (
      <select
        aria-label="Value"
        value={value || "true"}
        onChange={(e) => setValue(e.target.value)}
        className={INTELLIGENCE_DRAWER_INPUT_CLASS}
        style={{ ...drawerFormControlStyle(t), width: "100%" }}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    ) : selected?.kind === "quantitative" && selected.unit !== "usd" ? (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={valuePlaceholder}
        type="number"
        step="any"
        inputMode="decimal"
        className={INTELLIGENCE_DRAWER_INPUT_CLASS}
        style={{
          ...drawerFormControlStyle(t),
          width: "100%",
          ...(valueInvalid ? { borderColor: t.negative } : null),
        }}
      />
    ) : (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={valuePlaceholder}
        disabled={!selected}
        inputMode={selected?.kind === "quantitative" ? "decimal" : undefined}
        className={INTELLIGENCE_DRAWER_INPUT_CLASS}
        style={{
          ...drawerFormControlStyle(t),
          width: "100%",
          ...(valueInvalid ? { borderColor: t.negative } : null),
        }}
      />
    );

  return (
    <>
      <button
        type="button"
        aria-label="Close log intelligence"
        onClick={onClose}
        style={{
          background: t.overlay,
          border: "none",
          bottom: 0,
          cursor: "pointer",
          left: 0,
          position: "fixed",
          right: 0,
          top: 0,
          zIndex: 70,
          ...drawerScrimMotionStyle(visible, durationMs),
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Log intelligence"
        style={{
          background: t.panel,
          ...(sheet
            ? {
                borderRadius: "16px 16px 0 0",
                borderTop: `1px solid ${t.rule}`,
                bottom: 0,
                boxShadow: `0 -16px 48px ${t.overlay}`,
                left: 0,
                maxHeight: "min(92vh, 720px)",
                right: 0,
                top: "auto",
                width: "100%",
              }
            : {
                borderLeft: `1px solid ${t.rule}`,
                bottom: 0,
                boxShadow: `-24px 0 60px ${t.overlay}`,
                maxWidth: 520,
                right: 0,
                top: 0,
                width: "min(100vw, 520px)",
              }),
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          zIndex: 71,
          ...drawerPanelMotionStyle(visible, durationMs, {
            from: sheet ? "bottom" : "right",
          }),
        }}
      >
        {sheet ? (
          <div
            aria-hidden
            style={{
              alignSelf: "center",
              background: t.rule,
              borderRadius: 999,
              flexShrink: 0,
              height: 4,
              marginTop: 8,
              width: 36,
            }}
          />
        ) : null}

        <header
          style={{
            alignItems: "flex-start",
            background: sheet ? t.panel : t.panelAlt,
            borderBottom: `1px solid ${t.ruleSoft}`,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            padding: sheet ? "10px 16px 12px" : "16px 18px",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Log intelligence
            </h2>
            <p
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 12,
                lineHeight: 1.4,
                margin: "4px 0 0",
              }}
            >
              {sheet
                ? "Pick a signal, enter the value, and it lands on the timeline."
                : "Record a metric value against a catalog signal. Select the signal and enter the value — it will appear in your intelligence timeline."}
            </p>
          </div>
          <button
            type="button"
            className="fuel-drawer-close"
            aria-label="Close"
            onClick={onClose}
            style={drawerCloseBtnStyle(t)}
          >
            <CloseIcon />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: sheet ? "14px 16px" : 18,
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: intelligenceDrawerInputCss(t) }} />

          <div
            style={{
              display: "grid",
              gap: sheet ? 12 : 10,
              gridTemplateColumns: sheet
                ? "minmax(0, 1fr)"
                : "minmax(0, 1fr) minmax(120px, 140px)",
            }}
          >
            <label style={{ display: "block", minWidth: 0 }}>
              <div style={fieldLabelStyle(t)}>Signal</div>
              <SignalCatalogPicker
                t={t}
                value={signalId}
                onChange={handleSignalChange}
                signals={signalCatalog}
                triggerStyle={{ ...drawerFormControlStyle(t), width: "100%" }}
              />
            </label>

            <label style={{ display: "block", minWidth: 0 }}>
              <div style={fieldLabelStyle(t)}>Value</div>
              {valueControl}
              {valueInvalid ? (
                <div
                  style={{
                    color: t.negative,
                    fontFamily: t.sans,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {selected?.unit === "usd"
                    ? "Enter a number (e.g. 2.4M or 2400000)"
                    : selected?.unit
                      ? `Enter a number in ${selected.unit}`
                      : "Enter a valid number"}
                </div>
              ) : null}
            </label>
          </div>

          <div style={{ marginTop: sheet ? 12 : 14 }}>
            <div style={fieldLabelStyle(t)}>Period</div>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "1fr 1fr",
                maxWidth: sheet ? undefined : 200,
                width: "100%",
              }}
            >
              <select
                aria-label="Quarter"
                value={periodParts.quarter}
                onChange={(e) => {
                  const q = e.target.value;
                  const y = periodParts.year || String(new Date().getFullYear());
                  if (q) setPeriod(formatIntelligencePeriod(q, y));
                }}
                className={INTELLIGENCE_DRAWER_INPUT_CLASS}
                style={{ ...drawerFormControlStyle(t), width: "100%" }}
              >
                <option value="">Q</option>
                {INTELLIGENCE_QUARTERS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <select
                aria-label="Year"
                value={periodParts.year}
                onChange={(e) => {
                  const y = e.target.value;
                  const q = periodParts.quarter || "Q1";
                  if (y) setPeriod(formatIntelligencePeriod(q, y));
                }}
                className={INTELLIGENCE_DRAWER_INPUT_CLASS}
                style={{ ...drawerFormControlStyle(t), width: "100%" }}
              >
                <option value="">Year</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={{ display: "block", marginTop: sheet ? 12 : 14 }}>
            <div style={fieldLabelStyle(t)}>
              Note <span style={{ color: t.mutedSoft, fontWeight: 400 }}>(optional)</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context or commentary…"
              rows={sheet ? 2 : 3}
              className={INTELLIGENCE_DRAWER_INPUT_CLASS}
              style={{ ...drawerFormInputStyle(t), resize: "vertical", width: "100%" }}
            />
          </label>
        </div>

        <footer
          style={{
            ...benchActionsStyle(t),
            gap: sheet ? 10 : 8,
            padding: sheet
              ? "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))"
              : "14px 18px",
            ...(sheet
              ? {
                  display: "grid",
                  gridTemplateColumns: "1fr 1.4fr",
                }
              : null),
          }}
        >
          <HoverBtn
            type="button"
            styleFor={(hovered) => ({
              ...benchActionBtnStyle(t, "cancel", { hovered }),
              ...(sheet
                ? {
                    alignItems: "center",
                    display: "inline-flex",
                    justifyContent: "center",
                    minHeight: TOUCH_TARGET_MIN,
                    width: "100%",
                  }
                : null),
            })}
            onClick={onClose}
          >
            Cancel
          </HoverBtn>
          <HoverBtn
            type="button"
            disabled={!canSubmit || pending}
            styleFor={(hovered) => ({
              ...benchActionBtnStyle(t, "save", {
                hovered,
                disabled: !canSubmit || pending,
              }),
              ...(sheet
                ? {
                    alignItems: "center",
                    display: "inline-flex",
                    justifyContent: "center",
                    minHeight: TOUCH_TARGET_MIN,
                    width: "100%",
                  }
                : null),
            })}
            onClick={() => void submit()}
          >
            {pending ? "Logging…" : "Log intelligence"}
          </HoverBtn>
        </footer>
      </aside>
    </>
  );
}
