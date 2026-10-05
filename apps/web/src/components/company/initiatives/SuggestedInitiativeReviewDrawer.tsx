"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CompanyInitiativeSummary } from "@/components/views/CompanyPublicView";
import { HoverBtn, useDrawerEscape } from "@/components/company/overview/drawerShared";
import {
  benchActionBtnStyle,
  benchActionsStyle,
} from "@/components/company/overview/drawerStyles";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import type { Theme } from "@/lib/theme";
import {
  displayDue,
  kindLabel,
  pillarFromStored,
  pillarLabel,
} from "./pillars";
import {
  drawerCloseBtnStyle,
  drawerEyebrowStyle,
  drawerMetaDdStyle,
  drawerMetaDtStyle,
  drawerMetaRowStyle,
  drawerScrimStyle,
  drawerSectionCardStyle,
  drawerSectionHeadStyle,
  drawerSectionLabelStyle,
  drawerStyle,
  secondaryBtnStyle,
  splitInitiativeBenefitBullets,
  initiativeDrawerWidthStyle,
} from "./styles";

export function DismissSuggestedInitiativeAlert({
  t,
  onCancel,
  onConfirm,
}: {
  t: Theme;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCancelRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        alignItems: "center",
        background: t.overlay,
        display: "flex",
        inset: 0,
        justifyContent: "center",
        padding: 20,
        position: "absolute",
        zIndex: 2,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dismiss-suggestion-title"
        aria-describedby="dismiss-suggestion-body"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 10,
          fontFamily: t.sans,
          maxWidth: 420,
          padding: "20px 20px 16px",
          width: "100%",
        }}
      >
        <h3
          id="dismiss-suggestion-title"
          style={{
            color: t.ink,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          Dismiss this suggested initiative?
        </h3>
        <p
          id="dismiss-suggestion-body"
          style={{
            color: t.muted,
            fontSize: 13.5,
            lineHeight: 1.5,
            margin: "8px 0 0",
          }}
        >
          This will remove the suggestion from Initiative Review. You can’t undo this action.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <HoverBtn
            type="button"
            styleFor={(hovered) => benchActionBtnStyle(t, "cancel", { hovered })}
            onClick={onCancel}
          >
            Cancel
          </HoverBtn>
          <HoverBtn
            type="button"
            styleFor={(hovered) => benchActionBtnStyle(t, "save", { hovered })}
            onClick={onConfirm}
          >
            Dismiss suggestion
          </HoverBtn>
        </div>
      </div>
    </div>
  );
}

export function SuggestedInitiativeReviewPanel({
  t,
  item,
  busy,
  accepted,
  adding,
  showBack = false,
  onBack,
  onClose,
  onDismiss,
  onAccept,
  onOpenIntelligence,
  onOpenDataRoom,
}: {
  t: Theme;
  item: CompanyInitiativeSummary;
  busy: boolean;
  accepted: boolean;
  adding: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
  onDismiss: () => void;
  onAccept: () => void;
  onOpenIntelligence?: (ids: string[]) => void;
  onOpenDataRoom?: () => void;
}) {
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const confirmOpen = confirmDismiss && !busy && !accepted;

  useEffect(() => {
    setConfirmDismiss(false);
  }, [item.id]);

  const hasMetrics = Boolean(
    item.baselineMetric?.trim() || item.targetMetric?.trim() || item.benchmarkCohort?.trim(),
  );
  const hasDescription = Boolean(item.description?.trim());
  const hasBenefit = Boolean(item.benefit?.trim());
  const hasSources = item.intelligenceLinks.length > 0 || item.sourceDocuments.length > 0;
  const hasMilestones = item.milestones.length > 0;

  return (
    <>
      <header
        style={{
          alignItems: "flex-start",
          borderBottom: `1px solid ${t.rule}`,
          display: "flex",
          justifyContent: "space-between",
          padding: "18px 20px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={drawerEyebrowStyle(t)}>Review initiative</div>
          <div
            style={{
              alignItems: "flex-start",
              display: "flex",
              gap: 10,
              minWidth: 0,
            }}
          >
            {showBack && onBack ? (
              <button
                type="button"
                aria-label="Back to suggested initiatives"
                disabled={busy}
                onClick={onBack}
                style={{
                  ...secondaryBtnStyle(t),
                  flexShrink: 0,
                  fontSize: 14,
                  lineHeight: 1,
                  marginTop: 2,
                  padding: "6px 9px",
                }}
              >
                ←
              </button>
            ) : null}
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  color: t.ink,
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                {item.name}
              </h2>
              <p style={{ color: t.muted, fontSize: 12, margin: "6px 0 0" }}>
                {kindLabel(item.kind)} ·{" "}
                {pillarLabel(
                  pillarFromStored({
                    overviewCategoryId: item.overviewCategoryId,
                    area: item.area,
                  }),
                )}
                {` · ${item.ownerEmail}`}
                {item.due ? ` · ${displayDue(item.due)}` : ""}
                {item.priority ? ` · ${item.priority} priority` : ""}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="fuel-drawer-close"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
          style={drawerCloseBtnStyle(t)}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M4 4l8 8M12 4L4 12"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 20px" }}>
        {hasMetrics ? (
          <section
            style={{
              ...drawerSectionCardStyle(t),
              marginBottom: 12,
            }}
          >
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Metrics</span>
            </div>
            <dl
              style={{
                display: "grid",
                gap: 8,
                margin: 0,
              }}
            >
              {(
                [
                  ["Baseline", item.baselineMetric],
                  ["Target", item.targetMetric],
                  ["Benchmark cohort", item.benchmarkCohort],
                ] as const
              )
                .filter(([, value]) => Boolean(value?.trim()))
                .map(([label, value], index, all) => (
                  <div key={label} style={drawerMetaRowStyle(t, index === all.length - 1)}>
                    <dt style={drawerMetaDtStyle(t)}>{label}</dt>
                    <dd style={drawerMetaDdStyle(t)}>{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ) : null}

        {hasDescription ? (
          <section style={drawerSectionCardStyle(t)}>
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Description</span>
            </div>
            <p
              style={{
                color: t.inkSoft,
                fontSize: 13.5,
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {item.description}
            </p>
          </section>
        ) : null}

        {hasBenefit ? (
          <section
            style={{
              ...drawerSectionCardStyle(t),
              marginTop: hasDescription ? 12 : 0,
            }}
          >
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Benefit</span>
            </div>
            <p
              style={{
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              Value of completing the initiative
            </p>
            <ul
              style={{
                color: t.inkSoft,
                display: "flex",
                flexDirection: "column",
                fontSize: 13.5,
                gap: 8,
                listStyle: "disc",
                margin: 0,
                padding: "0 0 0 1.15em",
              }}
            >
              {splitInitiativeBenefitBullets(item.benefit ?? "").map((bullet, index) => (
                <li key={`${index}-${bullet.slice(0, 48)}`} style={{ lineHeight: 1.55 }}>
                  {bullet}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasSources ? (
          <section
            style={{
              ...drawerSectionCardStyle(t),
              marginTop: hasDescription || hasBenefit ? 12 : 0,
            }}
          >
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Sources</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.intelligenceLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => {
                    onOpenIntelligence?.([link.intelligenceId]);
                    onClose();
                  }}
                  style={{
                    ...secondaryBtnStyle(t),
                    justifyContent: "flex-start",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  Intelligence · {link.title}
                  {link.highlight ? ` · ${link.highlight}` : ""}
                </button>
              ))}
              {item.sourceDocuments.map((doc) =>
                onOpenDataRoom ? (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onOpenDataRoom();
                      onClose();
                    }}
                    style={{
                      ...secondaryBtnStyle(t),
                      justifyContent: "flex-start",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    Document · {doc.title}
                    {doc.typeLabel ? ` · ${doc.typeLabel}` : ""}
                  </button>
                ) : (
                  <div
                    key={doc.id}
                    style={{
                      color: t.inkSoft,
                      fontSize: 13,
                      lineHeight: 1.4,
                    }}
                  >
                    {doc.typeLabel ? `${doc.typeLabel} · ` : ""}
                    {doc.title}
                  </div>
                ),
              )}
            </div>
          </section>
        ) : null}

        {hasMilestones ? (
          <section
            style={{
              ...drawerSectionCardStyle(t),
              marginTop: hasDescription || hasBenefit || hasSources ? 12 : 0,
            }}
          >
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Milestones</span>
            </div>
            <ul
              style={{
                color: t.inkSoft,
                display: "flex",
                flexDirection: "column",
                fontSize: 13,
                gap: 8,
                listStyle: "disc",
                margin: 0,
                padding: "0 0 0 1.15em",
              }}
            >
              {item.milestones.map((milestone) => (
                <li key={milestone.id} style={{ lineHeight: 1.4 }}>
                  {milestone.label}
                  {milestone.dueDate ? (
                    <span style={{ color: t.muted }}>{` · ${milestone.dueDate}`}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!hasDescription && !hasBenefit && !hasMilestones && !hasSources ? (
          <p style={{ color: t.muted, fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
            No additional detail for this suggestion yet.
          </p>
        ) : null}
      </div>
      <footer style={benchActionsStyle(t)}>
        {accepted ? (
          <HoverBtn
            type="button"
            disabled
            styleFor={(hovered) => benchActionBtnStyle(t, "save", { hovered, disabled: true })}
          >
            ✓ Added to Initiatives
          </HoverBtn>
        ) : (
          <>
            <HoverBtn
              type="button"
              disabled={busy}
              styleFor={(hovered) =>
                benchActionBtnStyle(t, "cancel", {
                  hovered,
                  disabled: busy,
                })
              }
              onClick={() => setConfirmDismiss(true)}
            >
              Dismiss
            </HoverBtn>
            <HoverBtn
              type="button"
              disabled={busy || adding}
              styleFor={(hovered) =>
                benchActionBtnStyle(t, "save", {
                  hovered,
                  disabled: busy || adding,
                })
              }
              onClick={onAccept}
            >
              {adding ? "Adding…" : "Create initiative"}
            </HoverBtn>
          </>
        )}
      </footer>
      {confirmOpen ? (
        <DismissSuggestedInitiativeAlert
          t={t}
          onCancel={() => setConfirmDismiss(false)}
          onConfirm={() => {
            setConfirmDismiss(false);
            onDismiss();
          }}
        />
      ) : null}
    </>
  );
}

export function SuggestedInitiativeReviewDrawer({
  t,
  open,
  item,
  fallbackName,
  loadError,
  busy,
  accepted,
  adding,
  onClose,
  onDismiss,
  onAccept,
  onOpenIntelligence,
  onOpenDataRoom,
}: {
  t: Theme;
  open: boolean;
  item: CompanyInitiativeSummary | null;
  fallbackName?: string;
  loadError?: string | null;
  busy: boolean;
  accepted: boolean;
  adding: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onAccept: () => void;
  onOpenIntelligence?: (ids: string[]) => void;
  onOpenDataRoom?: () => void;
}) {
  const presence = useDrawerPresence(open);
  useDrawerEscape(open, busy, onClose);
  if (!presence.mounted || typeof document === "undefined") return null;

  const title = item?.name ?? fallbackName ?? "Suggested initiative";

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{
        ...drawerScrimStyle(t),
        ...drawerScrimMotionStyle(presence.visible, presence.durationMs),
      }}
    >
      <aside
        className="initiative-suggested-drawer"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...drawerStyle(t),
          ...initiativeDrawerWidthStyle(),
          ...drawerPanelMotionStyle(presence.visible, presence.durationMs),
        }}
      >
        {item ? (
          <SuggestedInitiativeReviewPanel
            t={t}
            item={item}
            busy={busy}
            accepted={accepted}
            adding={adding}
            onClose={onClose}
            onDismiss={onDismiss}
            onAccept={onAccept}
            onOpenIntelligence={onOpenIntelligence}
            onOpenDataRoom={onOpenDataRoom}
          />
        ) : (
          <>
            <header
              style={{
                alignItems: "flex-start",
                borderBottom: `1px solid ${t.rule}`,
                display: "flex",
                justifyContent: "space-between",
                padding: "18px 20px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={drawerEyebrowStyle(t)}>Review initiative</div>
                <h2
                  style={{
                    color: t.ink,
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                className="fuel-drawer-close"
                aria-label="Close"
                disabled={busy}
                onClick={onClose}
                style={drawerCloseBtnStyle(t)}
              >
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M4 4l8 8M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 20px" }}>
              <p style={{ color: t.muted, fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
                {loadError ?? "Loading initiative…"}
              </p>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
