"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { onAccentText, type Theme } from "@/lib/theme";
import { addManualObservationAction } from "@/app/(app)/company/[uuid]/actions";
import { MagicShimmer } from "@/components/ai/MagicShimmer";
import { IntelligenceItemPicker, intelligenceValuePreview } from "@/components/intelligence/IntelligenceItemPicker";
import { SignalCatalogPicker } from "@/components/intelligence/SignalCatalogPicker";
import {
  clampListPage,
  DEFAULT_LIST_PAGE_SIZE,
  ListPagination,
  type ListPageSize,
} from "@/components/ui/ListPagination";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  INTELLIGENCE_CATEGORIES,
  type IntelligenceCategory,
} from "@/lib/intelligence/constants";
import { currentIntelligencePeriod } from "@/lib/intelligence/period";
import {
  formatSignalObservationValue,
  manualObservationValuePlaceholder,
  parseManualObservationValue,
  type SignalCatalogItem,
} from "@/lib/signals/group-catalog";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import {
  buildProgressIntelligenceLinkDisplay,
  formatProgressLinkMeta,
  progressIntelRowFromLoggedObservation,
  upsertProgressIntelligenceLink,
  withUpdatedIntelligenceLinks,
} from "@/lib/initiatives/progress-intelligence-links";
import {
  milestoneDueDateToInputValue,
  normalizeMilestoneDueDate,
} from "@/lib/initiative-milestone-dates";
import { INVALID_EMAIL_MESSAGE, isValidEmail } from "@/lib/is-valid-email";
import { patchSearchParams } from "@/lib/use-url-synced-tab";
import type {
  CompanyAdvisorSummary,
  CompanyInitiativeSummary,
  CompanySignalObservation,
  InitiativeIntelligenceLinkSummary,
} from "@/components/views/CompanyPublicView";
import {
  useDrawerEscape,
} from "@/components/company/overview/drawerShared";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useAnimatedDrawerClose,
  useDrawerPresence,
} from "@/components/drawer/motion";
import { InitiativeMilestonesPanel } from "./InitiativeSidePanels";
import { DismissSuggestedInitiativeAlert, SuggestedInitiativeReviewPanel } from "./SuggestedInitiativeReviewDrawer";
import { MemberAssigneesField } from "./MemberAssigneesField";
import { YorkHelpPanel } from "./YorkHelpPanel";
import {
  displayDue,
  dueYearOptions,
  formatDueQuarter,
  kindLabel,
  normalizeListStatus,
  normalizeUiStatus,
  parseDueQuarter,
  pillarFromStored,
  pillarLabel,
  PILLAR_OPTIONS,
  areaFromPillar,
  type InitiativeListStatus,
  type InitiativePillar,
} from "./pillars";
import { dataRoomIntelligenceLinkStyle } from "@/components/data-room/styles";
import {
  drawerDeleteBtnStyle,
  drawerEditLinkStyle,
  drawerEyebrowStyle,
  drawerMetaDdStyle,
  drawerMetaDtStyle,
  drawerMetaRowStyle,
  drawerMiniBtnStyle,
  drawerScrimStyle,
  drawerSectionCardStyle,
  drawerSectionHeadStyle,
  drawerSectionLabelStyle,
  drawerStyle,
  emptyCardStyle,
  fieldLabelStyle,
  formCardStyle,
  formControlStyle,
  INITIATIVE_CARD_CLASS,
  INITIATIVE_CARD_OPEN_HINT_CLASS,
  initiativeCardMetaStyle,
  initiativeCardStyle,
  initiativeCardTitleStyle,
  initiativeDrawerWidthStyle,
  initiativeFormControlsCss,
  initiativeStatusBadgeStyle,
  initiativesHeadActionsStyle,
  initiativesHeadStyle,
  initiativesPageStyle,
  INITIATIVE_FORM_CONTROL_CLASS,
  panelCardStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
  statusToggleBtnStyle,
  statusToggleStyle,
} from "./styles";
import { HoverBtn } from "@/components/company/overview/drawerShared";
import {
  benchActionBtnStyle,
  benchActionsStyle,
} from "@/components/company/overview/drawerStyles";

type ProgressRole = "baseline" | "current";

type InitiativesPageResponse = {
  data: CompanyInitiativeSummary[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    activeTotal: number;
    completedTotal: number;
  };
};

function optimisticInitiativeSummary(opts: {
  id: string;
  name: string;
  kind: "continuous" | "onetime";
  pillar: InitiativePillar;
  description: string;
  ownerEmail: string;
  assignees: string[];
  due: string;
  status: InitiativeListStatus;
  advisors: CompanyInitiativeSummary["advisors"];
  milestones: { id: string; title: string; due: string; done: boolean }[];
}): CompanyInitiativeSummary {
  const now = new Date().toISOString();
  return {
    id: opts.id,
    kind: opts.kind,
    name: opts.name,
    area: areaFromPillar(opts.pillar),
    overviewCategoryId: opts.pillar,
    description: opts.description.trim() || null,
    status: opts.status.toLowerCase(),
    source: "manual",
    ownerEmail: opts.ownerEmail,
    assignees: opts.assignees,
    due: opts.due.trim() || null,
    createdAt: now,
    updatedAt: now,
    advisors: opts.advisors,
    progress: [],
    milestones: opts.milestones.map((milestone) => ({
      id: milestone.id,
      label: milestone.title,
      status: milestone.done ? "done" : "todo",
      dueDate: milestone.due || null,
      note: null,
      completedAt: milestone.done ? now : null,
    })),
    intelligenceLinks: [],
    sourceDocuments: [],
    sourceRationale: null,
    benefit: null,
    priority: null,
    baselineMetric: null,
    targetMetric: null,
    benchmarkCohort: null,
    yorkHelp: null,
    yorkHelpStatus: "idle",
    yorkHelpDismissed: false,
  };
}

/** Skeleton row count — enough to read as a list without a tall placeholder. */
const INITIATIVE_SKELETON_ROWS = 5;

/** Placeholder cards mirror the initiative card geometry to avoid layout jump. */
function InitiativeListSkeleton({ t, rows }: { t: Theme; rows: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading initiatives"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <article
          key={i}
          style={{
            ...initiativeCardStyle(t),
            alignItems: "center",
            display: "flex",
            gap: 12,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              gap: 5,
              minWidth: 0,
            }}
          >
            <MagicShimmer theme={t} width={i % 2 ? "42%" : "56%"} height={13} rounded={4} />
            <div style={{ alignItems: "center", display: "flex", gap: 10 }}>
              <MagicShimmer theme={t} width={54} height={14} rounded={4} />
              <MagicShimmer theme={t} width={i % 3 ? "38%" : "48%"} height={11} rounded={4} />
            </div>
          </div>
          <MagicShimmer theme={t} width={38} height={11} rounded={4} />
        </article>
      ))}
    </div>
  );
}

function nextProgressRole(links: InitiativeIntelligenceLinkSummary[]): ProgressRole {
  const roles: ProgressRole[] = ["baseline", "current"];
  for (const role of roles) {
    if (!links.some((l) => l.role === role)) return role;
  }
  return "current";
}

function toIntelligenceCategory(category: string): IntelligenceCategory {
  return (INTELLIGENCE_CATEGORIES as readonly string[]).includes(category)
    ? (category as IntelligenceCategory)
    : "strategic";
}

function emptyLogDraft(role: ProgressRole = "baseline") {
  return {
    role,
    signalId: "",
    value: "",
    note: "",
  };
}

function emptyLinkDraft(role: ProgressRole = "baseline") {
  return {
    role,
    intelligenceId: "",
    note: "",
  };
}

/** Pick the first assignee that is a valid email — used to resolve `ownerEmail`. */
function firstEmailLikeAssignee(assignees: string[]): string | null {
  return assignees.find((a) => isValidEmail(a)) ?? null;
}

function allAssigneesValidEmails(assignees: string[]): boolean {
  return assignees.length > 0 && assignees.every((a) => isValidEmail(a));
}

function createPrimaryBtnStyle(t: Theme, opts?: { disabled?: boolean }): CSSProperties {
  const disabled = opts?.disabled ?? false;
  const isLight = t.mode === "editorial";
  return {
    background: isLight ? t.ink : t.accent,
    border: `1px solid ${isLight ? t.ink : t.accent}`,
    borderRadius: 8,
    color: isLight ? t.panel : onAccentText(t),
    cursor: disabled ? "default" : "pointer",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 700,
    opacity: disabled ? 0.45 : 1,
    padding: "10px 16px",
  };
}

/** Design: select + Link row (`initiative-link-advisor-row`). */
function AdvisorLinkPicker({
  t,
  pool,
  disabled = false,
  onSelect,
}: {
  t: Theme;
  pool: CompanyAdvisorSummary[];
  disabled?: boolean;
  onSelect: (advisorId: string) => void;
}) {
  const [advisorDraftId, setAdvisorDraftId] = useState("");
  const emptyLabel = pool.length === 0 ? "No advisors available" : "Pick an advisor…";

  return (
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(0,1fr) auto" }}>
      <select
        value={advisorDraftId}
        disabled={disabled || pool.length === 0}
        onChange={(e) => setAdvisorDraftId(e.target.value)}
        className={INITIATIVE_FORM_CONTROL_CLASS}
        style={formControlStyle(t)}
        aria-label="Advisor"
      >
        <option value="">{emptyLabel}</option>
        {pool.map((a) => (
          <option key={a.advisorId} value={a.advisorId}>
            {a.name}
            {a.title ? ` · ${a.title}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled || !advisorDraftId}
        style={createPrimaryBtnStyle(t, { disabled: !advisorDraftId })}
        onClick={() => {
          if (!advisorDraftId) return;
          onSelect(advisorDraftId);
          setAdvisorDraftId("");
        }}
      >
        Link
      </button>
    </div>
  );
}

function DueQuarterField({
  t,
  due,
  onChange,
}: {
  t: Theme;
  due: string;
  onChange: (next: string) => void;
}) {
  const parsed = parseDueQuarter(due);
  const years = dueYearOptions();
  return (
    <div style={{ minWidth: 0 }}>
      <span style={fieldLabelStyle(t)}>Due</span>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
        <select
          value={parsed?.quarter ?? ""}
          onChange={(e) => {
            const q = Number(e.target.value);
            if (!q) {
              onChange("");
              return;
            }
            onChange(formatDueQuarter(parsed?.year ?? years[0], q));
          }}
          className={INITIATIVE_FORM_CONTROL_CLASS}
          style={formControlStyle(t)}
          aria-label="Due quarter"
        >
          <option value="">Quarter</option>
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              Q{q}
            </option>
          ))}
        </select>
        <select
          value={parsed?.year ?? ""}
          onChange={(e) => {
            const y = Number(e.target.value);
            if (!y) {
              onChange("");
              return;
            }
            onChange(formatDueQuarter(y, parsed?.quarter ?? 1));
          }}
          className={INITIATIVE_FORM_CONTROL_CLASS}
          style={formControlStyle(t)}
          aria-label="Due year"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CreateInitiativeDrawer({
  t,
  open,
  saving,
  error,
  title,
  kind,
  pillar,
  description,
  assignees,
  due,
  status,
  advisorIds,
  advisorPool,
  allowAdvisorLinking,
  milestones,
  onTitleChange,
  onKindChange,
  onPillarChange,
  onDescriptionChange,
  onAssigneesChange,
  onDueChange,
  onStatusChange,
  onAdvisorIdsChange,
  onMilestonesChange,
  onClose,
  onSubmit,
}: {
  t: Theme;
  open: boolean;
  saving: boolean;
  error: string | null;
  title: string;
  kind: "continuous" | "onetime";
  pillar: InitiativePillar;
  description: string;
  assignees: string[];
  due: string;
  status: InitiativeListStatus;
  advisorIds: string[];
  advisorPool: CompanyAdvisorSummary[];
  allowAdvisorLinking: boolean;
  milestones: { id: string; title: string; due: string; done: boolean }[];
  onTitleChange: (next: string) => void;
  onKindChange: (next: "continuous" | "onetime") => void;
  onPillarChange: (next: InitiativePillar) => void;
  onDescriptionChange: (next: string) => void;
  onAssigneesChange: (next: string[]) => void;
  onDueChange: (next: string) => void;
  onStatusChange: (next: InitiativeListStatus) => void;
  onAdvisorIdsChange: (next: string[]) => void;
  onMilestonesChange: (
    next: { id: string; title: string; due: string; done: boolean }[],
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [showAdvisorForm, setShowAdvisorForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState({ title: "", due: "" });
  const [intelPanel, setIntelPanel] = useState<"log" | "link" | null>(null);

  const { mounted, visible, durationMs } = useDrawerPresence(open);
  useDrawerEscape(open, saving, onClose);

  if (!mounted) return null;

  const milestonesDone = milestones.filter((m) => m.done).length;
  const milestonesTotal = milestones.length;
  const milestonesPct =
    milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;
  const linkedAdvisors = advisorPool.filter((a) => advisorIds.includes(a.advisorId));
  const unlinkedPool = advisorPool.filter((a) => !advisorIds.includes(a.advisorId));
  const canCreate = title.trim().length > 0 && assignees.length > 0;
  const isLight = t.mode === "editorial";
  const sectionCard = drawerSectionCardStyle(t);
  const sectionHead = drawerSectionHeadStyle(t);
  const miniBtn = drawerMiniBtnStyle(t);
  const controlFocusBorder = isLight ? t.ink : t.accent;

  return (
    <div
      role="presentation"
      onClick={saving ? undefined : onClose}
      style={{
        ...drawerScrimStyle(t),
        ...drawerScrimMotionStyle(visible, durationMs),
      }}
    >
      <aside
        role="dialog"
        aria-label="New initiative"
        className="initiative-drawer initiative-create-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...drawerStyle(t),
          ...initiativeDrawerWidthStyle(),
          background: t.panel,
          ...drawerPanelMotionStyle(visible, durationMs),
        }}
      >
        <header
          style={{
            alignItems: "flex-start",
            borderBottom: `1px solid ${t.rule}`,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            padding: "18px 24px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={drawerEyebrowStyle(t)}>Initiative</div>
            <h2
              style={{
                color: t.ink,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              New initiative
            </h2>
            <p style={{ color: t.muted, fontSize: 12, lineHeight: 1.5, margin: "6px 0 0" }}>
              Name the work, assign owners, link advisors, and set milestones before you create.
            </p>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexShrink: 0,
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <div
              role="group"
              aria-label="Status"
              style={{
                background: isLight ? t.bg : t.panelAlt,
                border: `1px solid ${t.rule}`,
                borderRadius: 8,
                display: "inline-flex",
                gap: 2,
                padding: 3,
              }}
            >
              {(["Active", "Completed"] as const).map((s) => {
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    disabled={saving}
                    onClick={() => onStatusChange(s)}
                    style={{
                      background: active
                        ? isLight
                          ? t.panel
                          : `${t.accent}29`
                        : "transparent",
                      border: 0,
                      borderRadius: 6,
                      boxShadow: active && isLight ? "0 1px 2px rgba(26, 35, 50, 0.06)" : undefined,
                      color: active ? t.ink : t.muted,
                      cursor: "pointer",
                      fontFamily: t.sans,
                      fontSize: 12,
                      fontWeight: isLight ? 600 : 700,
                      padding: "6px 10px",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Close"
              disabled={saving}
              onClick={onClose}
              style={{
                ...secondaryBtnStyle(t),
                background: t.panel,
                padding: "7px 10px",
              }}
            >
              ✕
            </button>
          </div>
        </header>

        <div style={{ borderBottom: `1px solid ${t.rule}`, padding: "14px 24px 16px" }}>
          <div
            style={{
              alignItems: "baseline",
              color: t.muted,
              display: "flex",
              fontSize: 11,
              fontWeight: 700,
              gap: 12,
              justifyContent: "space-between",
              letterSpacing: "0.06em",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            <span>Milestone progress</span>
            <strong style={{ color: t.inkSoft, fontSize: 13, fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>
              {milestonesTotal === 0
                ? "No milestones yet"
                : `${milestonesDone} of ${milestonesTotal} done`}
            </strong>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={milestonesPct}
            aria-label="Milestone completion"
            style={{
              background: isLight ? t.bg : t.rule,
              borderRadius: 999,
              height: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: t.accent,
                height: "100%",
                transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                width: `${milestonesPct}%`,
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: isLight ? t.bg : t.panel,
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: 16,
            overflow: "auto",
            padding: "20px 24px 28px",
          }}
        >
          <section style={sectionCard}>
            <div style={sectionHead}>
              <span style={drawerSectionLabelStyle(t)}>Details</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "minmax(0,1fr) 130px 110px",
                }}
              >
                <input
                  value={title}
                  autoFocus
                  disabled={saving}
                  placeholder="Initiative name"
                  onChange={(e) => onTitleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCreate) {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  style={{
                    ...formControlStyle(t),
                    borderColor: title.trim() ? t.rule : controlFocusBorder,
                  }}
                />
                <select
                  value={kind}
                  disabled={saving}
                  onChange={(e) => onKindChange(e.target.value as "continuous" | "onetime")}
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  style={formControlStyle(t)}
                  aria-label="Type"
                >
                  <option value="continuous">Continuous</option>
                  <option value="onetime">One-time</option>
                </select>
                <select
                  value={pillar}
                  disabled={saving}
                  onChange={(e) => onPillarChange(e.target.value as InitiativePillar)}
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  style={formControlStyle(t)}
                  aria-label="Category"
                >
                  {PILLAR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={description}
                disabled={saving}
                rows={3}
                placeholder="What's the goal and why now? (optional)"
                onChange={(e) => onDescriptionChange(e.target.value)}
                className={INITIATIVE_FORM_CONTROL_CLASS}
                style={{ ...formControlStyle(t), resize: "vertical", width: "100%" }}
              />
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "minmax(0,1fr) minmax(200px,240px)",
                }}
              >
                <MemberAssigneesField
                  t={t}
                  value={assignees}
                  onChange={onAssigneesChange}
                  disabled={saving}
                  loadWhen={open}
                />
                <DueQuarterField t={t} due={due} onChange={onDueChange} />
              </div>
            </div>
          </section>

          <section style={sectionCard}>
            <div style={sectionHead}>
              <span style={drawerSectionLabelStyle(t)}>Milestones</span>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowMilestoneForm((x) => !x);
                  setMilestoneDraft({ title: "", due: "" });
                }}
                style={miniBtn}
              >
                {showMilestoneForm ? "Cancel" : "+ Add milestone"}
              </button>
            </div>
            {milestones.length === 0 ? (
              <p style={{ color: t.muted, fontSize: 12, margin: 0 }}>No milestones yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignItems: "center",
                      background: isLight ? t.bg : t.panel,
                      border: `1px solid ${t.rule}`,
                      borderRadius: 8,
                      display: "flex",
                      gap: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={m.done}
                      disabled={saving}
                      onChange={() =>
                        onMilestonesChange(
                          milestones.map((row) =>
                            row.id === m.id ? { ...row, done: !row.done } : row,
                          ),
                        )
                      }
                      aria-label={`Mark ${m.title} done`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: t.ink,
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: m.done ? "line-through" : undefined,
                        }}
                      >
                        {m.title}
                      </div>
                      {m.due ? (
                        <div style={{ color: t.muted, fontSize: 11, marginTop: 2 }}>{m.due}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${m.title}`}
                      disabled={saving}
                      onClick={() =>
                        onMilestonesChange(milestones.filter((row) => row.id !== m.id))
                      }
                      style={{ ...miniBtn, padding: "2px 8px" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showMilestoneForm ? (
              <div
                style={{
                  alignItems: "end",
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "minmax(0,1fr) minmax(0,160px) auto",
                }}
              >
                <input
                  value={milestoneDraft.title}
                  disabled={saving}
                  placeholder="Milestone"
                  onChange={(e) =>
                    setMilestoneDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  style={{ ...formControlStyle(t), width: "100%" }}
                />
                <DatePicker
                  t={t}
                  disabled={saving}
                  value={milestoneDueDateToInputValue(milestoneDraft.due) || ""}
                  onChange={(ymd) =>
                    setMilestoneDraft((prev) => ({
                      ...prev,
                      due: normalizeMilestoneDueDate(ymd) ?? "",
                    }))
                  }
                  aria-label="Milestone due date"
                  placeholder="Pick a date"
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  triggerStyle={{
                    ...formControlStyle(t),
                    fontSize: 13,
                    fontWeight: 500,
                    width: "100%",
                  }}
                />
                <button
                  type="button"
                  disabled={saving || !milestoneDraft.title.trim()}
                  style={createPrimaryBtnStyle(t, {
                    disabled: !milestoneDraft.title.trim(),
                  })}
                  onClick={() => {
                    const nextTitle = milestoneDraft.title.trim();
                    if (!nextTitle) return;
                    onMilestonesChange([
                      ...milestones,
                      {
                        id: `ms_${Date.now()}`,
                        title: nextTitle,
                        due: normalizeMilestoneDueDate(milestoneDraft.due) ?? "",
                        done: false,
                      },
                    ]);
                    setMilestoneDraft({ title: "", due: "" });
                    setShowMilestoneForm(false);
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </section>

          {allowAdvisorLinking ? (
          <section style={sectionCard}>
            <div style={sectionHead}>
              <span style={drawerSectionLabelStyle(t)}>Advisors</span>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowAdvisorForm((x) => !x);
                }}
                style={miniBtn}
              >
                {showAdvisorForm ? "Cancel" : "+ Link advisor"}
              </button>
            </div>
            {linkedAdvisors.length === 0 ? (
              <p style={{ color: t.muted, fontSize: 12, margin: 0 }}>No advisors linked.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {linkedAdvisors.map((a) => (
                  <div
                    key={a.advisorId}
                    style={{
                      alignItems: "center",
                      background: isLight ? t.bg : t.panel,
                      border: `1px solid ${t.rule}`,
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                    }}
                  >
                    <div>
                      <div style={{ color: t.ink, fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                      {a.title ? (
                        <div style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{a.title}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      disabled={saving}
                      onClick={() =>
                        onAdvisorIdsChange(advisorIds.filter((id) => id !== a.advisorId))
                      }
                      style={{ ...miniBtn, padding: "2px 8px" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showAdvisorForm ? (
              <AdvisorLinkPicker
                t={t}
                pool={unlinkedPool}
                disabled={saving}
                onSelect={(advisorId) => {
                  onAdvisorIdsChange([...advisorIds, advisorId]);
                  setShowAdvisorForm(false);
                }}
              />
            ) : null}
          </section>
          ) : null}

          <section style={sectionCard}>
            <div style={sectionHead}>
              <span style={drawerSectionLabelStyle(t)}>Progress — baseline · current</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIntelPanel(intelPanel === "log" ? null : "log")}
                  style={miniBtn}
                >
                  + Log intelligence
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIntelPanel(intelPanel === "link" ? null : "link")}
                  style={miniBtn}
                >
                  + Link intelligence
                </button>
              </div>
            </div>
            <div
              style={{
                border: `1px dashed ${t.rule}`,
                borderRadius: 8,
                color: t.muted,
                fontSize: 12,
                lineHeight: 1.5,
                padding: "12px 14px",
                textAlign: "center",
              }}
            >
              No intelligence tracked yet. Log or link a baseline and a current reading so progress can be
              narrated from the timeline.
            </div>
            {intelPanel ? (
              <p style={{ color: t.muted, fontSize: 12, margin: 0 }}>
                Intelligence can be logged or linked after you create this initiative.
              </p>
            ) : null}
          </section>

          {error ? (
            <p role="alert" style={{ color: t.negative, fontFamily: t.sans, fontSize: 12.5, margin: 0 }}>
              {error}
            </p>
          ) : null}
        </div>

        <footer style={benchActionsStyle(t)}>
          <HoverBtn
            type="button"
            disabled={saving}
            styleFor={(hovered) =>
              benchActionBtnStyle(t, "cancel", { hovered, disabled: saving })
            }
            onClick={onClose}
          >
            Cancel
          </HoverBtn>
          <HoverBtn
            type="button"
            disabled={saving || !canCreate}
            styleFor={(hovered) =>
              benchActionBtnStyle(t, "save", {
                hovered,
                disabled: saving || !canCreate,
              })
            }
            onClick={onSubmit}
          >
            {saving ? "Creating…" : "Create initiative"}
          </HoverBtn>
        </footer>
      </aside>
    </div>
  );
}

/** Shared active-initiative sidebar — Initiatives tab + Overview track detail. */
export function InitiativeDetailDrawer({
  t,
  companyUuid,
  item,
  advisorPool,
  allowAdvisorLinking,
  availableIntelligence,
  signalCatalog,
  recentObservations,
  onClose,
  onStatusTabChange,
  onStart,
  onIntelligenceLinksSaved,
}: {
  t: Theme;
  companyUuid: string;
  item: CompanyInitiativeSummary;
  advisorPool: CompanyAdvisorSummary[];
  allowAdvisorLinking: boolean;
  availableIntelligence: CompanyIntelligenceRow[];
  signalCatalog: SignalCatalogItem[];
  recentObservations: CompanySignalObservation[];
  onClose: () => void;
  onStatusTabChange: (status: InitiativeListStatus) => void;
  onStart: (cb: () => void | Promise<void>) => void;
  onIntelligenceLinksSaved: (links: InitiativeIntelligenceLinkSummary[]) => void;
}) {
  void recentObservations;
  const { visible, durationMs, requestClose } = useAnimatedDrawerClose(onClose);
  useDrawerEscape(true, false, requestClose);
  const pillar = pillarFromStored({
    overviewCategoryId: item.overviewCategoryId,
    area: item.area,
  });
  const listStatus = normalizeListStatus(item.status);
  const milestonesDone = item.milestones.filter((m) => m.status === "done").length;
  const milestonesTotal = item.milestones.length;
  const milestonesPct =
    milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;
  const roleOrder: ProgressRole[] = ["baseline", "current"];
  const links = useMemo(
    () => item.intelligenceLinks ?? [],
    [item.intelligenceLinks],
  );

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.name);
  const [kind, setKind] = useState<"continuous" | "onetime">(item.kind);
  const [pillarDraft, setPillarDraft] = useState<InitiativePillar>(pillar);
  const [description, setDescription] = useState(item.description ?? "");
  const [assignees, setAssignees] = useState<string[]>(
    item.assignees.length ? item.assignees : [item.ownerEmail].filter(Boolean),
  );
  const [due, setDue] = useState(item.due ?? "");
  const [showAdvisorForm, setShowAdvisorForm] = useState(false);
  const [intelPanel, setIntelPanel] = useState<"log" | "link" | null>(null);
  const [intelBusy, setIntelBusy] = useState<"log" | "link" | null>(null);
  const [linkDraft, setLinkDraft] = useState(() =>
    emptyLinkDraft(nextProgressRole(links)),
  );
  const [intelligenceOptions, setIntelligenceOptions] =
    useState<CompanyIntelligenceRow[]>(availableIntelligence);
  const [intelLoadState, setIntelLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [logDraft, setLogDraft] = useState(() =>
    emptyLogDraft(nextProgressRole(links)),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const intelFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTitle(item.name);
    setKind(item.kind);
    setPillarDraft(pillar);
    setDescription(item.description ?? "");
    setAssignees(item.assignees.length ? item.assignees : [item.ownerEmail].filter(Boolean));
    setDue(item.due ?? "");
  }, [item, pillar]);

  useEffect(() => {
    setIntelligenceOptions(availableIntelligence);
  }, [availableIntelligence]);

  useEffect(() => {
    if (!intelPanel) return;
    let cancelled = false;
    let inner = 0;
    // Double rAF: wait until form is painted before scrolling.
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const form = intelFormRef.current;
        if (!form) return;
        form.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
        // Focus form shell only — never native <select>. Programmatic select
        // focus + smooth scroll eats first click (Chrome) and breaks open/select (Safari).
        form.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [intelPanel]);

  useEffect(() => {
    if (intelPanel !== "link") return;
    let cancelled = false;
    const ctrl = new AbortController();
    setIntelLoadState("loading");
    void (async () => {
      try {
        const res = await fetch(
          `/api/company/${companyUuid}/intelligence?includeHistory=true`,
          {
            signal: ctrl.signal,
          },
        );
        if (!res.ok) throw new Error(`intelligence_fetch_${res.status}`);
        const json = (await res.json()) as { items?: CompanyIntelligenceRow[] };
        if (cancelled) return;
        setIntelligenceOptions(json.items ?? []);
        setIntelLoadState("idle");
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return;
        Sentry.captureException(error);
        setIntelLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [intelPanel, companyUuid]);

  const linkedIds = new Set(item.advisors.map((a) => a.advisorId));
  const unlinkedPool = advisorPool.filter((a) => !linkedIds.has(a.advisorId));
  const filteredIntelligence = useMemo(() => {
    const linkedIntelligenceIds = new Set(links.map((l) => l.intelligenceId));
    return intelligenceOptions.filter((intel) => !linkedIntelligenceIds.has(intel.id));
  }, [intelligenceOptions, links]);

  const selectedLinkIntel = useMemo(
    () =>
      filteredIntelligence.find((i) => i.id === linkDraft.intelligenceId) ??
      intelligenceOptions.find((i) => i.id === linkDraft.intelligenceId) ??
      null,
    [filteredIntelligence, intelligenceOptions, linkDraft.intelligenceId],
  );
  const linkValuePreview = selectedLinkIntel
    ? intelligenceValuePreview(selectedLinkIntel)
    : "";
  const canSubmitLink = Boolean(
    linkDraft.intelligenceId &&
      selectedLinkIntel &&
      intelLoadState !== "loading" &&
      intelBusy == null,
  );

  const handleLinkIntelligenceChange = (nextId: string) => {
    setLinkDraft((p) => ({
      ...p,
      intelligenceId: nextId,
    }));
  };

  const selectedLogSignal = useMemo(
    () => signalCatalog.find((s) => s.id === logDraft.signalId) ?? null,
    [signalCatalog, logDraft.signalId],
  );
  const parsedLogValue = selectedLogSignal
    ? parseManualObservationValue(selectedLogSignal, logDraft.value)
    : null;
  const logValueInvalid =
    Boolean(selectedLogSignal && logDraft.value.trim()) &&
    parsedLogValue !== null &&
    !parsedLogValue.valid;
  const canSubmitLog = Boolean(
    selectedLogSignal && parsedLogValue?.valid && intelBusy == null,
  );
  const logValuePlaceholder = manualObservationValuePlaceholder(selectedLogSignal);

  const handleLogSignalChange = (nextId: string) => {
    const next = signalCatalog.find((s) => s.id === nextId) ?? null;
    setLogDraft((p) => ({
      ...p,
      signalId: nextId,
      value: next?.kind === "boolean" ? "true" : "",
    }));
  };

  const persistLinks = async (next: InitiativeIntelligenceLinkSummary[]) => {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("companyUuid", companyUuid);
    fd.set("intelligenceLinks", JSON.stringify(next));
    const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
    const saved = await mod.setInitiativeIntelligenceLinksAction(fd);
    if (!saved) {
      throw new Error("initiative_intelligence_links_not_saved");
    }
    onIntelligenceLinksSaved(saved);
  };

  const attachIntelligence = async (
    intel: CompanyIntelligenceRow,
    role: ProgressRole,
    note?: string,
  ) => {
    const { title, highlight } = buildProgressIntelligenceLinkDisplay(intel, note);
    await persistLinks(
      upsertProgressIntelligenceLink(links, {
        id: `ilink_${Date.now()}`,
        role,
        intelligenceId: intel.id,
        title,
        highlight,
        type: intel.category,
        date: intel.period ?? intel.createdAt.slice(0, 10),
      }),
    );
  };

  const setListStatus = (next: InitiativeListStatus) => {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("companyUuid", companyUuid);
    fd.set("status", next);
    fd.set("name", item.name);
    fd.set("kind", item.kind);
    fd.set("pillar", pillar);
    fd.set("ownerEmail", item.ownerEmail);
    if (item.description) fd.set("description", item.description);
    if (item.due) fd.set("due", item.due);
    onStart(async () => {
      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
      await mod.updateInitiativeAction(fd);
      onStatusTabChange(next);
    });
  };

  const saveDetails = () => {
    if (assignees.length === 0) return;
    if (!allAssigneesValidEmails(assignees)) return;
    const ownerEmail = (firstEmailLikeAssignee(assignees) ?? "")
      .trim()
      .toLowerCase();
    if (!ownerEmail) return;
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("companyUuid", companyUuid);
    fd.set("name", title.trim() || item.name);
    fd.set("kind", kind);
    fd.set("pillar", pillarDraft);
    fd.set("description", description);
    fd.set("ownerEmail", ownerEmail);
    fd.set("assignees", JSON.stringify(assignees.map((a) => a.trim())));
    fd.set("due", due);
    fd.set("status", listStatus);
    onStart(async () => {
      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
      await mod.updateInitiativeAction(fd);
      setEditing(false);
    });
  };

  const isLight = t.mode === "editorial";

  return (
    <div
      role="presentation"
      onClick={requestClose}
      style={{
        ...drawerScrimStyle(t),
        ...drawerScrimMotionStyle(visible, durationMs),
      }}
    >
      <aside
        role="dialog"
        aria-label={item.name || "Initiative"}
        className="initiative-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...drawerStyle(t),
          ...initiativeDrawerWidthStyle(),
          background: t.panel,
          ...drawerPanelMotionStyle(visible, durationMs),
        }}
      >
        <header
          style={{
            alignItems: "flex-start",
            borderBottom: `1px solid ${t.rule}`,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            padding: "18px 24px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={drawerEyebrowStyle(t)}>Initiative</div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.ink, letterSpacing: "-0.01em" }}>
              {item.name || "Untitled initiative"}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: t.muted }}>
              {kindLabel(item.kind)} · {pillarLabel(pillar)} · {displayDue(item.due)}
            </p>
          </div>
          <div style={{ alignItems: "center", display: "flex", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
            <div
              role="group"
              aria-label="Status"
              style={{
                background: isLight ? t.bg : t.panelAlt,
                border: `1px solid ${t.rule}`,
                borderRadius: 8,
                display: "inline-flex",
                gap: 2,
                padding: 3,
              }}
            >
              {(["Active", "Completed"] as const).map((s) => {
                const active = listStatus === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setListStatus(s)}
                    style={{
                      background: active
                        ? isLight
                          ? t.panel
                          : `${t.accent}29`
                        : "transparent",
                      border: 0,
                      borderRadius: 6,
                      boxShadow: active && isLight ? "0 1px 2px rgba(26, 35, 50, 0.06)" : undefined,
                      color: active ? t.ink : t.muted,
                      cursor: "pointer",
                      fontFamily: t.sans,
                      fontSize: 12,
                      fontWeight: isLight ? 600 : 700,
                      padding: "6px 10px",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {confirmDelete ? (
              <div style={{ alignItems: "center", display: "flex", gap: 6 }}>
                <span style={{ color: t.muted, fontSize: 11 }}>Delete this initiative?</span>
                <button
                  type="button"
                  style={drawerDeleteBtnStyle(t)}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", item.id);
                    fd.set("companyUuid", companyUuid);
                    onStart(async () => {
                      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
                      await mod.deleteInitiativeAction(fd);
                      requestClose();
                    });
                  }}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  style={secondaryBtnStyle(t)}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                style={drawerDeleteBtnStyle(t)}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            )}
            <button type="button" onClick={requestClose} aria-label="Close" style={secondaryBtnStyle(t)}>
              ✕
            </button>
          </div>
        </header>

        <div style={{ borderBottom: `1px solid ${t.rule}`, padding: "14px 24px 16px" }}>
          <div
            style={{
              color: t.muted,
              display: "flex",
              fontSize: 11,
              fontWeight: 700,
              justifyContent: "space-between",
              letterSpacing: "0.06em",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            <span>Milestone progress</span>
            <strong style={{ color: t.inkSoft, fontSize: 13, fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>
              {milestonesTotal === 0
                ? "No milestones yet"
                : `${milestonesDone} of ${milestonesTotal} done`}
            </strong>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={milestonesPct}
            style={{
              background: isLight ? t.bg : t.panelAlt,
              borderRadius: 999,
              height: 6,
              overflow: "hidden",
            }}
          >
            <div style={{ background: t.accent, height: "100%", width: `${milestonesPct}%` }} />
          </div>
        </div>

        <div
          style={{
            background: isLight ? t.bg : t.panel,
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: 16,
            overflow: "auto",
            padding: "20px 24px 28px",
          }}
        >
          <section style={drawerSectionCardStyle(t)}>
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Details</span>
              <button
                type="button"
                onClick={() => {
                  if (editing) saveDetails();
                  else setEditing(true);
                }}
                style={drawerEditLinkStyle(t)}
              >
                {editing ? "Done" : "Edit details"}
              </button>
            </div>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 130px 110px" }}>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Initiative name"
                    className={INITIATIVE_FORM_CONTROL_CLASS}
                    style={formControlStyle(t)}
                  />
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "continuous" | "onetime")}
                    className={INITIATIVE_FORM_CONTROL_CLASS}
                    style={formControlStyle(t)}
                  >
                    <option value="continuous">Continuous</option>
                    <option value="onetime">One-time</option>
                  </select>
                  <select
                    value={pillarDraft}
                    onChange={(e) => setPillarDraft(e.target.value as InitiativePillar)}
                    className={INITIATIVE_FORM_CONTROL_CLASS}
                    style={formControlStyle(t)}
                  >
                    {PILLAR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's the goal and why now? (optional)"
                  rows={3}
                  className={INITIATIVE_FORM_CONTROL_CLASS}
                  style={{ ...formControlStyle(t), resize: "vertical", width: "100%" }}
                />
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0,1fr) minmax(220px,260px)" }}>
                  <MemberAssigneesField t={t} value={assignees} onChange={setAssignees} />
                  <DueQuarterField t={t} due={due} onChange={setDue} />
                </div>
              </div>
            ) : (
              <div>
                {item.description?.trim() ? (
                  <p style={{ color: t.inkSoft, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{item.description}</p>
                ) : (
                  <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>No description yet.</p>
                )}
                <dl style={{ margin: item.description?.trim() ? "12px 0 0" : 0 }}>
                  {(
                    [
                      ["Kind", kindLabel(item.kind)],
                      ["Pillar", pillarLabel(pillar)],
                      ["Owner", item.assignees.length ? item.assignees.join(", ") : item.ownerEmail],
                      ["Target", displayDue(item.due)],
                    ] as const
                  ).map(([label, value], index, all) => (
                    <div key={label} style={drawerMetaRowStyle(t, index === all.length - 1)}>
                      <dt style={drawerMetaDtStyle(t)}>{label}</dt>
                      <dd style={drawerMetaDdStyle(t)}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>

          <InitiativeMilestonesPanel
            t={t}
            initiativeId={item.id}
            companyUuid={companyUuid}
            milestones={item.milestones}
            onStart={onStart}
            variant="drawer"
          />

          <YorkHelpPanel
            t={t}
            companyUuid={companyUuid}
            initiativeId={item.id}
            yorkHelp={item.yorkHelp}
            yorkHelpStatus={item.yorkHelpStatus}
            dismissed={item.yorkHelpDismissed}
            onStart={onStart}
          />

          {allowAdvisorLinking ? (
          <section style={drawerSectionCardStyle(t)}>
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Advisors</span>
              <button
                type="button"
                onClick={() => setShowAdvisorForm((x) => !x)}
                style={drawerMiniBtnStyle(t)}
              >
                {showAdvisorForm ? "Cancel" : "+ Link advisor"}
              </button>
            </div>
            {item.advisors.length === 0 ? (
              <p style={{ color: t.muted, fontSize: 12, margin: 0 }}>No advisors linked.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {item.advisors.map((a) => (
                  <div
                    key={a.advisorId}
                    style={{
                      alignItems: "center",
                      background: t.panelAlt,
                      border: `1px solid ${t.rule}`,
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                    }}
                  >
                    <div>
                      <div style={{ color: t.ink, fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                      {a.title || a.role ? (
                        <div style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>
                          {a.role || a.title}
                        </div>
                      ) : null}
                    </div>
                    <form
                      action={(fd) => {
                        onStart(async () => {
                          const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
                          await mod.unlinkInitiativeAdvisorAction(fd);
                        });
                      }}
                    >
                      <input type="hidden" name="initiativeId" value={item.id} />
                      <input type="hidden" name="advisorId" value={a.advisorId} />
                      <input type="hidden" name="companyUuid" value={companyUuid} />
                      <button type="submit" style={{ ...secondaryBtnStyle(t), padding: "2px 8px" }}>
                        ×
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            {showAdvisorForm ? (
              <div style={{ marginTop: 10 }}>
                <AdvisorLinkPicker
                  t={t}
                  pool={unlinkedPool}
                  onSelect={(advisorId) => {
                    const fd = new FormData();
                    fd.set("initiativeId", item.id);
                    fd.set("companyUuid", companyUuid);
                    fd.set("advisorId", advisorId);
                    onStart(async () => {
                      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
                      await mod.linkInitiativeAdvisorAction(fd);
                      setShowAdvisorForm(false);
                    });
                  }}
                />
              </div>
            ) : null}
          </section>
          ) : null}

          <section style={drawerSectionCardStyle(t)}>
            <div style={drawerSectionHeadStyle(t)}>
              <span style={drawerSectionLabelStyle(t)}>Progress — baseline · current</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  type="button"
                  disabled={intelBusy != null}
                  onClick={() => {
                    if (intelBusy) return;
                    if (intelPanel === "log") {
                      setIntelPanel(null);
                      return;
                    }
                    setLogDraft(emptyLogDraft(nextProgressRole(links)));
                    setIntelPanel("log");
                  }}
                  style={drawerMiniBtnStyle(t)}
                >
                  + Log intelligence
                </button>
                <button
                  type="button"
                  disabled={intelBusy != null}
                  onClick={() => {
                    if (intelBusy) return;
                    if (intelPanel === "link") {
                      setIntelPanel(null);
                      return;
                    }
                    setLinkDraft(emptyLinkDraft(nextProgressRole(links)));
                    setIntelPanel("link");
                  }}
                  style={drawerMiniBtnStyle(t)}
                >
                  + Link intelligence
                </button>
              </div>
            </div>

            {links.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roleOrder.flatMap((role) =>
                  links
                    .filter((l) => l.role === role)
                    .map((link) => (
                    <div
                      key={link.id}
                      style={{
                        alignItems: "center",
                        background: t.panelAlt,
                        border: `1px solid ${t.rule}`,
                        borderRadius: 8,
                        display: "flex",
                        gap: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <span
                        style={{
                          color: t.accent,
                          fontFamily: t.mono,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          width: 64,
                        }}
                      >
                        {role}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: t.ink,
                            fontSize: 13,
                            fontWeight: 600,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {link.title}
                        </div>
                        <div
                          style={{
                            color: t.muted,
                            fontSize: 11,
                            marginTop: 2,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {formatProgressLinkMeta(link)}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${role} intelligence`}
                        onClick={() => {
                          void persistLinks(links.filter((l) => l.id !== link.id)).catch((error) => {
                            Sentry.captureException(error);
                          });
                        }}
                        style={{ ...secondaryBtnStyle(t), padding: "2px 8px" }}
                      >
                        ×
                      </button>
                    </div>
                    )),
                )}
              </div>
            ) : (
              <div
                style={{
                  border: `1px dashed ${t.rule}`,
                  borderRadius: 8,
                  color: t.muted,
                  fontSize: 12,
                  lineHeight: 1.5,
                  padding: "12px 14px",
                  textAlign: "center",
                }}
              >
                No intelligence tracked yet. Log or link a baseline and a current reading so progress can be narrated from
                the timeline.
              </div>
            )}

            {intelPanel === "log" ? (
              <div
                ref={intelFormRef}
                tabIndex={-1}
                aria-label="Log intelligence form"
                style={{
                  ...formCardStyle(t),
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 10,
                  outline: "none",
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    alignItems: "start",
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns:
                      "minmax(0, 0.85fr) minmax(0, 1.7fr) minmax(0, 1fr)",
                  }}
                >
                  <label style={{ display: "block", minWidth: 0 }}>
                    <span style={fieldLabelStyle(t)}>Mark as</span>
                    <select
                      value={logDraft.role}
                      onChange={(e) =>
                        setLogDraft((p) => ({ ...p, role: e.target.value as ProgressRole }))
                      }
                      className={INITIATIVE_FORM_CONTROL_CLASS}
                      style={{
                        ...formControlStyle(t),
                        width: "100%",
                      }}
                    >
                      <option value="baseline">Baseline</option>
                      <option value="current">Current</option>
                    </select>
                  </label>

                  <label style={{ display: "block", minWidth: 0 }}>
                    <span style={fieldLabelStyle(t)}>Signal</span>
                    <SignalCatalogPicker
                      t={t}
                      value={logDraft.signalId}
                      onChange={handleLogSignalChange}
                      signals={signalCatalog}
                      triggerStyle={{
                        ...formControlStyle(t),
                        color: logDraft.signalId ? t.ink : t.muted,
                        fontFamily: t.sans,
                        fontSize: 13,
                        minHeight: 40,
                      }}
                    />
                  </label>

                  <label style={{ display: "block", minWidth: 0 }}>
                    <span style={fieldLabelStyle(t)}>Value</span>
                    {selectedLogSignal?.kind === "boolean" ? (
                      <select
                        aria-label="Value"
                        value={logDraft.value || "true"}
                        onChange={(e) => setLogDraft((p) => ({ ...p, value: e.target.value }))}
                        className={INITIATIVE_FORM_CONTROL_CLASS}
                        style={{
                          ...formControlStyle(t),
                          width: "100%",
                        }}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : selectedLogSignal?.kind === "quantitative" &&
                      selectedLogSignal.unit !== "usd" ? (
                      <input
                        value={logDraft.value}
                        onChange={(e) => setLogDraft((p) => ({ ...p, value: e.target.value }))}
                        placeholder={logValuePlaceholder}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        className={INITIATIVE_FORM_CONTROL_CLASS}
                        style={{
                          ...formControlStyle(t),
                          width: "100%",
                          ...(logValueInvalid ? { borderColor: t.negative } : null),
                        }}
                      />
                    ) : (
                      <input
                        value={logDraft.value}
                        onChange={(e) => setLogDraft((p) => ({ ...p, value: e.target.value }))}
                        placeholder={logValuePlaceholder}
                        disabled={!selectedLogSignal}
                        inputMode={
                          selectedLogSignal?.kind === "quantitative" ? "decimal" : undefined
                        }
                        className={INITIATIVE_FORM_CONTROL_CLASS}
                        style={{
                          ...formControlStyle(t),
                          width: "100%",
                          ...(logValueInvalid ? { borderColor: t.negative } : null),
                        }}
                      />
                    )}
                    {logValueInvalid ? (
                      <div
                        style={{
                          color: t.negative,
                          fontFamily: t.sans,
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        {selectedLogSignal?.unit === "usd"
                          ? "Enter a number (e.g. 2.4M or 2400000)"
                          : selectedLogSignal?.unit
                            ? `Enter a number in ${selectedLogSignal.unit}`
                            : "Enter a valid number"}
                      </div>
                    ) : null}
                  </label>
                </div>

                <label style={{ display: "block" }}>
                  <span style={fieldLabelStyle(t)}>
                    Note{" "}
                    <span style={{ fontWeight: 500, letterSpacing: "0.04em" }}>(optional)</span>
                  </span>
                  <input
                    value={logDraft.note}
                    onChange={(e) => setLogDraft((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Context or commentary…"
                    className={INITIATIVE_FORM_CONTROL_CLASS}
                    style={{
                      ...formControlStyle(t),
                      width: "100%",
                    }}
                  />
                </label>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <HoverBtn
                    type="button"
                    disabled={intelBusy != null}
                    styleFor={(hovered) =>
                      benchActionBtnStyle(t, "cancel", {
                        hovered,
                        disabled: intelBusy != null,
                      })
                    }
                    onClick={() => setIntelPanel(null)}
                  >
                    Cancel
                  </HoverBtn>
                  <HoverBtn
                    type="button"
                    disabled={!canSubmitLog}
                    aria-busy={intelBusy === "log"}
                    styleFor={(hovered) =>
                      benchActionBtnStyle(t, "save", {
                        hovered,
                        disabled: !canSubmitLog,
                      })
                    }
                    onClick={() => {
                      if (!selectedLogSignal || !parsedLogValue?.valid || intelBusy) return;
                      const signal = selectedLogSignal;
                      const parsed = parsedLogValue;
                      const role = logDraft.role;
                      const note = logDraft.note.trim();
                      setIntelBusy("log");
                      void (async () => {
                        try {
                          const period = currentIntelligencePeriod();
                          const fd = new FormData();
                          fd.set("uuid", companyUuid);
                          fd.set("signalId", signal.id);
                          fd.set("period", period);
                          if (parsed.valueNumeric != null) {
                            fd.set("valueNumeric", String(parsed.valueNumeric));
                          }
                          if (parsed.valueText != null) {
                            fd.set("valueText", parsed.valueText);
                          }
                          if (parsed.valueBool != null) {
                            fd.set("valueBool", String(parsed.valueBool));
                          }
                          if (note) fd.set("note", note);
                          const observationId = await addManualObservationAction(fd);
                          if (!observationId) return;

                          const display = formatSignalObservationValue({
                            kind: signal.kind,
                            unit: signal.unit,
                            valueNumeric: parsed.valueNumeric,
                            valueText: parsed.valueText,
                            valueBool: parsed.valueBool,
                          });
                          const row = progressIntelRowFromLoggedObservation({
                            observationId,
                            companyUuid,
                            category: toIntelligenceCategory(signal.category),
                            signalLabel: signal.label,
                            displayValue: display,
                            period,
                            note: note || null,
                          });
                          await attachIntelligence(row, role);
                          setLogDraft(emptyLogDraft(nextProgressRole(links)));
                          setIntelPanel(null);
                        } catch (error) {
                          Sentry.captureException(error);
                        } finally {
                          setIntelBusy(null);
                        }
                      })();
                    }}
                  >
                    {intelBusy === "log" ? "Logging…" : "Log intelligence"}
                  </HoverBtn>
                </div>
              </div>
            ) : null}

            {intelPanel === "link" ? (
              <div
                ref={intelFormRef}
                tabIndex={-1}
                aria-label="Link intelligence form"
                style={{
                  ...formCardStyle(t),
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 10,
                  outline: "none",
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    alignItems: "start",
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns:
                      "minmax(0, 0.85fr) minmax(0, 1.7fr) minmax(0, 1fr)",
                  }}
                >
                  <label style={{ display: "block", minWidth: 0 }}>
                    <span style={fieldLabelStyle(t)}>Mark as</span>
                    <select
                      value={linkDraft.role}
                      onChange={(e) =>
                        setLinkDraft((p) => ({
                          ...p,
                          role: e.target.value as ProgressRole,
                        }))
                      }
                      className={INITIATIVE_FORM_CONTROL_CLASS}
                      style={{
                        ...formControlStyle(t),
                        width: "100%",
                      }}
                    >
                      <option value="baseline">Baseline</option>
                      <option value="current">Current</option>
                    </select>
                  </label>

                  <label style={{ display: "block", minWidth: 0 }}>
                    <span style={fieldLabelStyle(t)}>Intelligence</span>
                    <IntelligenceItemPicker
                      t={t}
                      value={linkDraft.intelligenceId}
                      onChange={handleLinkIntelligenceChange}
                      items={filteredIntelligence}
                      loading={intelLoadState === "loading"}
                      emptyMessage="No intelligence available to link. Log one first, or open the Intelligence tab."
                      triggerStyle={{
                        ...formControlStyle(t),
                        color: linkDraft.intelligenceId ? t.ink : t.muted,
                        fontFamily: t.sans,
                        fontSize: 13,
                        minHeight: 40,
                      }}
                    />
                  </label>

                  <label style={{ display: "block", minWidth: 0 }}>
                    <span style={fieldLabelStyle(t)}>Value</span>
                    <input
                      value={linkValuePreview}
                      readOnly
                      placeholder="Select intelligence…"
                      aria-label="Value from selected intelligence"
                      className={INITIATIVE_FORM_CONTROL_CLASS}
                      style={{
                        ...formControlStyle(t),
                        color: linkValuePreview ? t.ink : t.muted,
                        cursor: "default",
                        width: "100%",
                      }}
                    />
                  </label>
                </div>

                {intelLoadState === "error" ? (
                  <p role="alert" style={{ color: t.negative, fontSize: 12, margin: 0 }}>
                    Could not load intelligence. Try again.
                  </p>
                ) : null}

                <label style={{ display: "block" }}>
                  <span style={fieldLabelStyle(t)}>
                    Note{" "}
                    <span style={{ fontWeight: 500, letterSpacing: "0.04em" }}>(optional)</span>
                  </span>
                  <input
                    value={linkDraft.note}
                    onChange={(e) => setLinkDraft((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Context or commentary…"
                    className={INITIATIVE_FORM_CONTROL_CLASS}
                    style={{
                      ...formControlStyle(t),
                      width: "100%",
                    }}
                  />
                </label>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <HoverBtn
                    type="button"
                    disabled={intelBusy != null}
                    styleFor={(hovered) =>
                      benchActionBtnStyle(t, "cancel", {
                        hovered,
                        disabled: intelBusy != null,
                      })
                    }
                    onClick={() => {
                      setIntelPanel(null);
                      setLinkDraft(emptyLinkDraft(nextProgressRole(links)));
                    }}
                  >
                    Cancel
                  </HoverBtn>
                  <HoverBtn
                    type="button"
                    disabled={!canSubmitLink}
                    aria-busy={intelBusy === "link"}
                    styleFor={(hovered) =>
                      benchActionBtnStyle(t, "save", {
                        hovered,
                        disabled: !canSubmitLink,
                      })
                    }
                    onClick={() => {
                      if (!selectedLinkIntel || intelBusy) return;
                      const intel = selectedLinkIntel;
                      const role = linkDraft.role;
                      const note = linkDraft.note;
                      setIntelBusy("link");
                      void (async () => {
                        try {
                          await attachIntelligence(intel, role, note);
                          setIntelPanel(null);
                          setLinkDraft(emptyLinkDraft(nextProgressRole(links)));
                        } catch (error) {
                          Sentry.captureException(error);
                        } finally {
                          setIntelBusy(null);
                        }
                      })();
                    }}
                  >
                    {intelBusy === "link" ? "Linking…" : "Link intelligence"}
                  </HoverBtn>
                </div>
              </div>
            ) : null}
          </section>

        </div>

        <footer style={benchActionsStyle(t)}>
          <HoverBtn
            type="button"
            styleFor={(hovered) => benchActionBtnStyle(t, "cancel", { hovered })}
            onClick={requestClose}
          >
            Close
          </HoverBtn>
        </footer>
      </aside>
    </div>
  );
}

export function InitiativesTab({
  t,
  companyUuid,
  initiatives,
  advisorPool,
  recentObservations,
  availableIntelligence = [],
  signalCatalog = [],
  investorMode = false,
  defaultAssignee,
  onOpenIntelligence,
  onOpenDataRoom,
  onOpenProfile,
}: {
  t: Theme;
  companyUuid: string;
  initiatives: CompanyInitiativeSummary[];
  advisorPool: CompanyAdvisorSummary[];
  recentObservations: CompanySignalObservation[];
  availableIntelligence?: CompanyIntelligenceRow[];
  signalCatalog?: SignalCatalogItem[];
  investorMode?: boolean;
  defaultAssignee?: string;
  onOpenIntelligence?: (intelligenceIds: string[]) => void;
  onOpenDataRoom?: () => void;
  onOpenProfile?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusInitiativeId = searchParams.get("initiativeId");
  const focusSuggested = searchParams.get("suggested") === "1";
  const focusReviewId = searchParams.get("review");
  const [isPending, startTransition] = useTransition();

  const replaceQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const qs = patchSearchParams(searchParams, patch);
      const next = qs ? `${pathname}?${qs}` : pathname;
      const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      if (next === current) return;
      router.replace(next, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<InitiativeListStatus>("Active");
  const [listPage, setListPage] = useState(0);
  const [listPageSize, setListPageSize] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);
  const [listItems, setListItems] = useState<CompanyInitiativeSummary[]>(() =>
    initiatives
      .filter(
        (item) =>
          normalizeUiStatus(item.status) !== "Suggested" &&
          normalizeListStatus(item.status) === "Active",
      )
      .slice(0, DEFAULT_LIST_PAGE_SIZE),
  );
  const [listTotal, setListTotal] = useState(() =>
    initiatives.filter(
      (item) =>
        normalizeUiStatus(item.status) !== "Suggested" &&
        normalizeListStatus(item.status) === "Active",
    ).length,
  );
  const [statusCounts, setStatusCounts] = useState<Record<InitiativeListStatus, number>>(
    () => {
      const counts: Record<InitiativeListStatus, number> = { Active: 0, Completed: 0 };
      for (const item of initiatives) {
        if (normalizeUiStatus(item.status) !== "Suggested") {
          counts[normalizeListStatus(item.status)] += 1;
        }
      }
      return counts;
    },
  );
  const [listLoadState, setListLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (focusSuggested ? null : focusInitiativeId),
  );
  const [openedSnapshot, setOpenedSnapshot] = useState<CompanyInitiativeSummary | null>(
    () =>
      focusInitiativeId
        ? (initiatives.find((item) => item.id === focusInitiativeId) ?? null)
        : null,
  );
  const [suggestedOpen, setSuggestedOpen] = useState(focusSuggested);
  const [previewSuggestedId, setPreviewSuggestedId] = useState<string | null>(
    () => (focusSuggested ? focusReviewId : null),
  );
  /** Local accept state so cards show "Added to Initiatives" until the drawer closes. */
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());
  const [acceptedSnapshots, setAcceptedSnapshots] = useState<
    Map<string, CompanyInitiativeSummary>
  >(() => new Map());
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftKind, setDraftKind] = useState<"continuous" | "onetime">("continuous");
  const [draftPillar, setDraftPillar] = useState<InitiativePillar>("mkt");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftAssignees, setDraftAssignees] = useState<string[]>(
    defaultAssignee ? [defaultAssignee] : [],
  );
  const [draftDue, setDraftDue] = useState("");
  const [draftStatus, setDraftStatus] = useState<InitiativeListStatus>("Active");
  const [draftAdvisorIds, setDraftAdvisorIds] = useState<string[]>([]);
  const [draftMilestones, setDraftMilestones] = useState<
    { id: string; title: string; due: string; done: boolean }[]
  >([]);

  useEffect(() => {
    if (!focusInitiativeId || focusSuggested) return;
    setStatusTab("Active");
    setListPage(0);
    setSuggestedOpen(false);
    setListRefreshKey((key) => key + 1);
    // One-shot refetch so a just-created initiative appears on Active.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot
  }, [focusInitiativeId, focusSuggested]);

  useEffect(() => {
    if (!focusInitiativeId || focusSuggested) return;
    const focused =
      listItems.find((item) => item.id === focusInitiativeId) ??
      initiatives.find(
        (item) =>
          item.id === focusInitiativeId &&
          normalizeUiStatus(item.status) !== "Suggested",
      );
    if (!focused || normalizeUiStatus(focused.status) === "Suggested") return;
    setStatusTab(normalizeListStatus(focused.status));
    setListPage(0);
    setSelectedId(focused.id);
    setOpenedSnapshot(focused);
    setSuggestedOpen(false);
  }, [focusInitiativeId, focusSuggested, initiatives, listItems]);

  const recommendedItems = useMemo(
    () => initiatives.filter((item) => normalizeUiStatus(item.status) === "Suggested"),
    [initiatives],
  );

  const suggestedDrawerItems = useMemo(() => {
    const live = recommendedItems.filter((item) => !acceptedIds.has(item.id));
    const accepted = [...acceptedSnapshots.values()];
    return [...accepted, ...live];
  }, [recommendedItems, acceptedIds, acceptedSnapshots]);

  const previewSuggested = useMemo(() => {
    if (!previewSuggestedId) return null;
    return (
      suggestedDrawerItems.find((item) => item.id === previewSuggestedId) ??
      recommendedItems.find((item) => item.id === previewSuggestedId) ??
      null
    );
  }, [previewSuggestedId, suggestedDrawerItems, recommendedItems]);

  useEffect(() => {
    if (
      previewSuggestedId &&
      !suggestedDrawerItems.some((item) => item.id === previewSuggestedId) &&
      !recommendedItems.some((item) => item.id === previewSuggestedId)
    ) {
      setPreviewSuggestedId(null);
    }
  }, [previewSuggestedId, suggestedDrawerItems, recommendedItems]);

  useEffect(() => {
    if (!suggestedOpen) {
      setPreviewSuggestedId(null);
      setAcceptedIds(new Set());
      setAcceptedSnapshots(new Map());
      setAcceptingId(null);
    }
  }, [suggestedOpen]);

  const listQueryKey = `${companyUuid}:${statusTab}:${listPage}:${listPageSize}`;
  const listQueryKeyRef = useRef(listQueryKey);

  useEffect(() => {
    const controller = new AbortController();
    const queryChanged = listQueryKeyRef.current !== listQueryKey;
    listQueryKeyRef.current = listQueryKey;
    if (queryChanged) setListLoadState("loading");
    void (async () => {
      try {
        const params = new URLSearchParams({
          status: statusTab.toLowerCase(),
          limit: String(listPageSize),
          offset: String(listPage * listPageSize),
        });
        const response = await fetch(
          `/api/company/${companyUuid}/initiatives?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error(`initiatives_fetch_${response.status}`);
        const payload = (await response.json()) as InitiativesPageResponse;
        if (controller.signal.aborted) return;
        const clampedPage = clampListPage(listPage, payload.meta.total, listPageSize);
        setStatusCounts({
          Active: payload.meta.activeTotal,
          Completed: payload.meta.completedTotal,
        });
        setListTotal(payload.meta.total);
        if (clampedPage !== listPage) {
          setListPage(clampedPage);
          return;
        }
        setListItems(payload.data);
        setListLoadState("ready");
      } catch (error) {
        if (controller.signal.aborted || (error as Error).name === "AbortError") return;
        Sentry.captureException(error);
        setListLoadState("error");
      }
    })();
    return () => controller.abort();
  }, [companyUuid, listPage, listPageSize, listRefreshKey, statusTab]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    // Prefer the live list and the optimistic snapshot. The server `initiatives`
    // prop can still be Suggested after accept until the page revalidates, and
    // that stale row must not hide the detail drawer.
    const candidates = [
      listItems.find((item) => item.id === selectedId),
      openedSnapshot?.id === selectedId ? openedSnapshot : null,
      initiatives.find((item) => item.id === selectedId),
    ].filter((item): item is CompanyInitiativeSummary => item != null);
    return (
      candidates.find((item) => normalizeUiStatus(item.status) !== "Suggested") ??
      null
    );
  }, [initiatives, listItems, openedSnapshot, selectedId]);

  useEffect(() => {
    if (!selectedId || selectedItem) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/company/${companyUuid}/initiatives?id=${encodeURIComponent(selectedId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as InitiativesPageResponse;
        const found = payload.data.find((item) => item.id === selectedId);
        if (!found || normalizeUiStatus(found.status) === "Suggested") return;
        setOpenedSnapshot(found);
        setStatusTab(normalizeListStatus(found.status));
      } catch (error) {
        if (controller.signal.aborted || (error as Error).name === "AbortError") return;
        Sentry.captureException(error);
      }
    })();
    return () => controller.abort();
  }, [companyUuid, selectedId, selectedItem]);

  const showSuggested = !investorMode && (recommendedItems.length > 0 || acceptedSnapshots.size > 0);
  const suggestionCount = Math.max(recommendedItems.length, acceptedSnapshots.size);
  const refetchInitiatives = useCallback(() => {
    setListRefreshKey((key) => key + 1);
  }, []);
  const startListMutation = useCallback(
    (callback: () => void | Promise<void>) => {
      startTransition(async () => {
        try {
          await callback();
        } finally {
          refetchInitiatives();
        }
      });
    },
    [refetchInitiatives],
  );

  const resetCreateForm = () => {
    setDraftTitle("");
    setDraftKind("continuous");
    setDraftPillar("mkt");
    setDraftDescription("");
    setDraftAssignees(defaultAssignee ? [defaultAssignee] : []);
    setDraftDue("");
    setDraftStatus("Active");
    setDraftAdvisorIds([]);
    setDraftMilestones([]);
    setCreateError(null);
    setIsCreating(false);
  };

  const handleCreate = () => {
    if (!draftTitle.trim()) return;
    if (draftAssignees.length === 0) {
      setCreateError("Add at least one assignee.");
      return;
    }
    if (!allAssigneesValidEmails(draftAssignees)) {
      setCreateError(INVALID_EMAIL_MESSAGE);
      return;
    }
    const ownerEmail = (
      firstEmailLikeAssignee(draftAssignees) ??
      defaultAssignee ??
      ""
    )
      .trim()
      .toLowerCase();
    if (!ownerEmail || !isValidEmail(ownerEmail)) {
      setCreateError(INVALID_EMAIL_MESSAGE);
      return;
    }
    setCreateError(null);
    const fd = new FormData();
    fd.set("companyUuid", companyUuid);
    fd.set("name", draftTitle.trim());
    fd.set("kind", draftKind);
    fd.set("pillar", draftPillar);
    fd.set("description", draftDescription);
    fd.set("ownerEmail", ownerEmail);
    fd.set("assignees", JSON.stringify(draftAssignees.map((a) => a.trim())));
    fd.set("due", draftDue);
    fd.set("status", draftStatus.toLowerCase());
    for (const advisorId of draftAdvisorIds) {
      fd.append("advisorId", advisorId);
    }
    if (draftMilestones.length > 0) {
      fd.set(
        "milestones",
        JSON.stringify(
          draftMilestones.map((m) => ({
            title: m.title,
            dueDate: m.due || null,
            checked: m.done,
          })),
        ),
      );
    }
    startTransition(async () => {
      try {
        const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
        const result = await mod.createInitiativeAction(fd);
        if (!result?.id) {
          setCreateError("Could not create the initiative. Please check the form and try again.");
          return;
        }
        const created = optimisticInitiativeSummary({
          id: result.id,
          name: draftTitle.trim(),
          kind: draftKind,
          pillar: draftPillar,
          description: draftDescription,
          ownerEmail,
          assignees: draftAssignees.map((a) => a.trim()),
          due: draftDue,
          status: draftStatus,
          advisors: advisorPool
            .filter((advisor) => draftAdvisorIds.includes(advisor.advisorId))
            .map((advisor) => ({
              advisorId: advisor.advisorId,
              name: advisor.name,
              title: advisor.title,
              company: advisor.company,
              photoUrl: advisor.photoUrl,
              role: advisor.role,
            })),
          milestones: draftMilestones,
        });
        setStatusTab(draftStatus);
        setListPage(0);
        setOpenedSnapshot(created);
        setSelectedId(result.id);
        setSuggestedOpen(false);
        resetCreateForm();
        replaceQuery({
          initiativeId: result.id,
          suggested: null,
          review: null,
        });
        refetchInitiatives();
      } catch (error) {
        Sentry.captureException(error);
        setCreateError("Could not create the initiative. Please try again.");
      }
    });
  };

  const acceptRecommendation = (id: string) => {
    if (acceptedIds.has(id) || acceptingId) return;
    const snapshot =
      recommendedItems.find((item) => item.id === id) ??
      suggestedDrawerItems.find((item) => item.id === id) ??
      null;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("companyUuid", companyUuid);
    setAcceptingId(id);
    startTransition(async () => {
      try {
        const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
        const result = await mod.acceptSuggestedInitiativeAction(fd);
        if (result?.id && snapshot) {
          const created: CompanyInitiativeSummary = { ...snapshot, status: "active" };
          setAcceptedIds((prev) => new Set(prev).add(result.id));
          setAcceptedSnapshots((prev) => {
            const next = new Map(prev);
            next.set(result.id, created);
            return next;
          });
          setPreviewSuggestedId(null);
          setSuggestedOpen(false);
          setStatusTab("Active");
          setListPage(0);
          setOpenedSnapshot(created);
          setSelectedId(result.id);
          replaceQuery({
            initiativeId: result.id,
            suggested: null,
            review: null,
          });
          refetchInitiatives();
        }
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setAcceptingId(null);
      }
    });
  };

  const dismissRecommendation = (id: string) => {
    if (acceptingId) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("companyUuid", companyUuid);
    startTransition(async () => {
      try {
        const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
        await mod.dismissSuggestedInitiativeAction(fd);
        setPreviewSuggestedId((cur) => (cur === id ? null : cur));
        if (selectedId === id) setSelectedId(null);
        setAcceptedIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setAcceptedSnapshots((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        refetchInitiatives();
      } catch (error) {
        Sentry.captureException(error);
      }
    });
  };

  const closeSuggestedDrawer = () => {
    if (isPending || acceptingId) return;
    setConfirmDismissId(null);
    setPreviewSuggestedId(null);
    setSuggestedOpen(false);
    replaceQuery({ suggested: null, review: null });
  };

  const cancelReview = () => {
    if (isPending || acceptingId) return;
    setPreviewSuggestedId(null);
    replaceQuery({ review: null });
  };

  const suggestedPresence = useDrawerPresence(suggestedOpen && showSuggested);
  useDrawerEscape(suggestedOpen, isPending || Boolean(acceptingId), closeSuggestedDrawer);

  return (
    <section style={{ ...initiativesPageStyle(), fontFamily: t.sans }}>
      <style dangerouslySetInnerHTML={{ __html: initiativeFormControlsCss(t) }} />
      <div style={initiativesHeadStyle()}>
        <div>
          <h2 style={{ color: t.ink, fontSize: 14, fontWeight: 700, margin: 0 }}>Initiatives</h2>
          <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.55, margin: "6px 0 0", maxWidth: 640 }}>
            {investorMode
              ? "Your private initiatives on this company — not visible to the founding team or other investors."
              : "Continuous + one-time work the operating team is running with this company. When Fuel has enough profile, benchmark, context, or uploaded-document data, important patterns and document findings can become recommended initiatives."}
          </p>
        </div>
        <div style={initiativesHeadActionsStyle()}>
          {showSuggested ? (
            <button
              type="button"
              style={secondaryBtnStyle(t)}
              onClick={() => {
                setIsCreating(false);
                setSelectedId(null);
                setOpenedSnapshot(null);
                setSuggestedOpen(true);
                replaceQuery({ suggested: "1", initiativeId: null, review: null });
              }}
            >
              Suggested{" "}
              <em style={{ color: t.accent, fontStyle: "normal", marginLeft: 4 }}>
                {suggestionCount}
              </em>
            </button>
          ) : null}
          <button
            type="button"
            style={primaryBtnStyle(t)}
            onClick={() => {
              setSuggestedOpen(false);
              setSelectedId(null);
              setOpenedSnapshot(null);
              setCreateError(null);
              setIsCreating(true);
              replaceQuery({ suggested: null, review: null, initiativeId: null });
            }}
          >
            + New initiative
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Initiative status" style={statusToggleStyle(t)}>
        {(["Active", "Completed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={statusTab === tab}
            style={statusToggleBtnStyle(t, statusTab === tab)}
            onClick={() => {
              setStatusTab(tab);
              setListPage(0);
            }}
          >
            {tab}
            <em
              style={{
                color: statusTab === tab ? t.accent : t.muted,
                fontStyle: "normal",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {listLoadState === "loading" ? (
                <MagicShimmer theme={t} width={14} height={11} rounded={4} />
              ) : (
                statusCounts[tab]
              )}
            </em>
          </button>
        ))}
      </div>

      {listLoadState === "loading" ? (
        <InitiativeListSkeleton
          t={t}
          rows={Math.min(listPageSize, INITIATIVE_SKELETON_ROWS)}
        />
      ) : null}

      {listLoadState === "error" ? (
        <div role="alert" style={emptyCardStyle(t)}>
          <strong style={{ color: t.ink, fontSize: 14, fontWeight: 700 }}>
            Could not load initiatives
          </strong>
          <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.55, margin: "8px 0 12px" }}>
            Check your connection and try again.
          </p>
          <button type="button" style={secondaryBtnStyle(t)} onClick={refetchInitiatives}>
            Retry
          </button>
        </div>
      ) : null}

      {listLoadState === "ready" && listItems.length === 0 ? (
        <div style={emptyCardStyle(t)}>
          <strong style={{ color: t.ink, fontSize: 14, fontWeight: 700 }}>
            {statusTab === "Completed" ? "No completed initiatives" : "No active initiatives"}
          </strong>
          <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.55, margin: "8px 0 0", maxWidth: 620 }}>
            {statusTab === "Completed"
              ? "Mark an active initiative Completed when the work ships."
              : showSuggested
                ? "Fuel has suggested initiatives from intelligence, benchmark gaps, or uploaded documents. Review them, or create your own with + New initiative."
                : investorMode
                  ? "Create diligence or value-creation work with + New initiative — kept private to your account."
                  : "Create an initiative manually with + New initiative, or complete your company profile and upload documents in the Data Room so Fuel can recommend high-leverage work from intelligence and document findings."}
          </p>
          {statusTab === "Active" && !investorMode && !showSuggested ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {onOpenProfile ? (
                <button type="button" style={secondaryBtnStyle(t)} onClick={onOpenProfile}>
                  Complete profile
                </button>
              ) : null}
              {onOpenDataRoom ? (
                <button type="button" style={secondaryBtnStyle(t)} onClick={onOpenDataRoom}>
                  Upload documents
                </button>
              ) : null}
              <button
                type="button"
                style={primaryBtnStyle(t)}
                onClick={() => {
                  setCreateError(null);
                  setIsCreating(true);
                }}
              >
                + New initiative
              </button>
            </div>
          ) : null}
          {statusTab === "Active" && showSuggested ? (
            <button
              type="button"
              style={{ ...primaryBtnStyle(t), marginTop: 14 }}
              onClick={() => {
                setIsCreating(false);
                setSelectedId(null);
                setOpenedSnapshot(null);
                setSuggestedOpen(true);
                replaceQuery({ suggested: "1", initiativeId: null, review: null });
              }}
            >
              View suggested · {suggestionCount}
            </button>
          ) : null}
        </div>
      ) : null}

      {listLoadState !== "loading" && listItems.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {listItems.map((item) => {
            const status = normalizeUiStatus(item.status);
            const selected = selectedId === item.id;
            const pillar = pillarFromStored({
              overviewCategoryId: item.overviewCategoryId,
              area: item.area,
            });
            const milestonesDone = item.milestones.filter((m) => m.status === "done").length;
            const milestonesTotal = item.milestones.length;
            const intelligenceLinks = item.intelligenceLinks ?? [];
            const intelligenceTaggedCount = intelligenceLinks.length;
            const intelligenceIds = intelligenceLinks.map((link) => link.intelligenceId);
            const canOpenIntelligence =
              intelligenceTaggedCount > 0 &&
              intelligenceIds.length > 0 &&
              typeof onOpenIntelligence === "function";
            const openInitiative = () => {
              setSuggestedOpen(false);
              setSelectedId(item.id);
              setOpenedSnapshot(item);
              replaceQuery({
                initiativeId: item.id,
                suggested: null,
                review: null,
              });
            };
            return (
              <article
                key={item.id}
                className={`${INITIATIVE_CARD_CLASS}${selected ? " is-selected" : ""}`}
                style={{
                  ...initiativeCardStyle(t),
                  alignItems: "center",
                  display: "flex",
                  gap: 12,
                  padding: "12px 14px",
                }}
              >
                <button
                  type="button"
                  onClick={openInitiative}
                  aria-pressed={selected}
                  style={{
                    alignItems: "center",
                    background: "transparent",
                    border: 0,
                    color: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    flex: 1,
                    fontFamily: t.sans,
                    gap: 12,
                    justifyContent: "space-between",
                    minWidth: 0,
                    padding: 0,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                    <strong style={initiativeCardTitleStyle(t)}>{item.name}</strong>
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px 10px",
                      }}
                    >
                      <span style={initiativeStatusBadgeStyle(t, status)}>{status}</span>
                      <em style={initiativeCardMetaStyle(t)}>
                        {kindLabel(item.kind)} · {pillarLabel(pillar)} ·{" "}
                        {item.assignees.length ? item.assignees.join(", ") : item.ownerEmail}
                        {milestonesTotal > 0
                          ? ` · ${milestonesDone}/${milestonesTotal} milestones`
                          : ""}
                      </em>
                    </div>
                  </div>
                </button>
                {canOpenIntelligence ? (
                  <button
                    type="button"
                    onClick={() => onOpenIntelligence(intelligenceIds)}
                    style={{
                      ...dataRoomIntelligenceLinkStyle(t),
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                    aria-label={`View ${intelligenceTaggedCount} intelligence tagged to ${item.name}`}
                  >
                    {intelligenceTaggedCount} intelligence →
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={openInitiative}
                  className={INITIATIVE_CARD_OPEN_HINT_CLASS}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: t.muted,
                    cursor: "pointer",
                    flexShrink: 0,
                    fontFamily: t.sans,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: 0,
                  }}
                  aria-label={`Open ${item.name}`}
                >
                  Open
                </button>
              </article>
            );
          })}
          <ListPagination
            t={t}
            page={listPage}
            pageSize={listPageSize}
            total={listTotal}
            itemLabel="initiatives"
            onPageChange={setListPage}
            onPageSizeChange={(size) => {
              setListPageSize(size);
              setListPage((p) => clampListPage(p, listTotal, size));
            }}
          />
        </div>
      ) : null}

      <CreateInitiativeDrawer
        t={t}
        open={isCreating}
        saving={isPending}
        error={createError}
        title={draftTitle}
        kind={draftKind}
        pillar={draftPillar}
        description={draftDescription}
        assignees={draftAssignees}
        due={draftDue}
        status={draftStatus}
        advisorIds={draftAdvisorIds}
        advisorPool={advisorPool}
        allowAdvisorLinking={!investorMode}
        milestones={draftMilestones}
        onTitleChange={setDraftTitle}
        onKindChange={setDraftKind}
        onPillarChange={setDraftPillar}
        onDescriptionChange={setDraftDescription}
        onAssigneesChange={setDraftAssignees}
        onDueChange={setDraftDue}
        onStatusChange={setDraftStatus}
        onAdvisorIdsChange={setDraftAdvisorIds}
        onMilestonesChange={setDraftMilestones}
        onClose={resetCreateForm}
        onSubmit={handleCreate}
      />

      {suggestedPresence.mounted ? (
        <div
          role="presentation"
          onClick={closeSuggestedDrawer}
          style={{
            ...drawerScrimStyle(t),
            ...drawerScrimMotionStyle(suggestedPresence.visible, suggestedPresence.durationMs),
          }}
        >
          <aside
            className="initiative-suggested-drawer"
            role="dialog"
            aria-label={previewSuggested ? previewSuggested.name : "Suggested initiatives"}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...drawerStyle(t),
              ...initiativeDrawerWidthStyle(),
              ...drawerPanelMotionStyle(
                suggestedPresence.visible,
                suggestedPresence.durationMs,
              ),
            }}
          >
            {previewSuggested ? (
              <SuggestedInitiativeReviewPanel
                t={t}
                item={previewSuggested}
                busy={isPending || Boolean(acceptingId)}
                accepted={acceptedIds.has(previewSuggested.id)}
                adding={acceptingId === previewSuggested.id}
                showBack
                onBack={cancelReview}
                onClose={closeSuggestedDrawer}
                onDismiss={() => dismissRecommendation(previewSuggested.id)}
                onAccept={() => acceptRecommendation(previewSuggested.id)}
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
                  <div>
                    <div style={drawerEyebrowStyle(t)}>Suggested initiatives</div>
                    <h2 style={{ color: t.ink, fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>
                      Suggested
                    </h2>
                    <p style={{ color: t.muted, fontSize: 12, margin: "6px 0 0" }}>
                      From intelligence, benchmark gaps, and uploaded documents. Create an initiative
                      to add it to Active, or dismiss ideas you don&apos;t need.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    disabled={isPending || Boolean(acceptingId)}
                    onClick={closeSuggestedDrawer}
                    style={secondaryBtnStyle(t)}
                  >
                    ✕
                  </button>
                </header>
                <div style={{ flex: 1, overflow: "auto", padding: "12px 20px 20px" }}>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
                    {suggestedDrawerItems.map((item) => {
                      const pillar = pillarFromStored({
                        overviewCategoryId: item.overviewCategoryId,
                        area: item.area,
                      });
                      const added = acceptedIds.has(item.id);
                      const sourceBits = [
                        ...item.intelligenceLinks.map((l) => l.title),
                        ...item.sourceDocuments.map((d) => d.title),
                      ];
                      return (
                        <li
                          key={item.id}
                          style={{
                            ...panelCardStyle(t),
                            background: t.panelAlt,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            padding: "12px 14px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewSuggestedId(item.id);
                              replaceQuery({ suggested: "1", review: item.id });
                            }}
                            aria-label={`Review suggested initiative: ${item.name}`}
                            style={{
                              background: "transparent",
                              border: 0,
                              color: "inherit",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              fontFamily: t.sans,
                              minWidth: 0,
                              padding: 0,
                              textAlign: "left",
                              width: "100%",
                            }}
                          >
                            <strong style={{ color: t.ink, fontSize: 13, fontWeight: 500 }}>{item.name}</strong>
                            <span
                              style={{
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: 3,
                                color: t.muted,
                                display: "-webkit-box",
                                fontSize: 12,
                                lineHeight: 1.45,
                                overflow: "hidden",
                              }}
                            >
                              {kindLabel(item.kind)} · {pillarLabel(pillar)}
                              {item.due ? ` · ${displayDue(item.due)}` : ""}
                              {item.description?.trim() ? ` · ${item.description}` : ""}
                            </span>
                            {sourceBits.length > 0 ? (
                              <span style={{ color: t.mutedSoft, fontSize: 11, marginTop: 2 }}>
                                From · {sourceBits.slice(0, 2).join(" · ")}
                              </span>
                            ) : null}
                          </button>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {added ? (
                              <button type="button" style={primaryBtnStyle(t)} disabled>
                                ✓ Added to Initiatives
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  style={secondaryBtnStyle(t)}
                                  disabled={isPending || Boolean(acceptingId)}
                                  onClick={() => {
                                    setPreviewSuggestedId(item.id);
                                    replaceQuery({ suggested: "1", review: item.id });
                                  }}
                                >
                                  Review
                                </button>
                                <button
                                  type="button"
                                  style={primaryBtnStyle(t)}
                                  disabled={isPending || acceptingId === item.id}
                                  onClick={() => acceptRecommendation(item.id)}
                                >
                                  {acceptingId === item.id ? "Adding…" : "Create initiative"}
                                </button>
                                <button
                                  type="button"
                                  style={secondaryBtnStyle(t)}
                                  disabled={isPending || Boolean(acceptingId)}
                                  onClick={() => setConfirmDismissId(item.id)}
                                >
                                  Dismiss
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <footer style={benchActionsStyle(t)}>
                  <HoverBtn
                    type="button"
                    disabled={isPending || Boolean(acceptingId)}
                    styleFor={(hovered) =>
                      benchActionBtnStyle(t, "cancel", {
                        hovered,
                        disabled: isPending || Boolean(acceptingId),
                      })
                    }
                    onClick={closeSuggestedDrawer}
                  >
                    Close
                  </HoverBtn>
                </footer>
                {confirmDismissId ? (
                  <DismissSuggestedInitiativeAlert
                    t={t}
                    onCancel={() => setConfirmDismissId(null)}
                    onConfirm={() => {
                      const id = confirmDismissId;
                      setConfirmDismissId(null);
                      dismissRecommendation(id);
                    }}
                  />
                ) : null}
              </>
            )}
          </aside>
        </div>
      ) : null}

      {selectedItem ? (
        <InitiativeDetailDrawer
          key={selectedItem.id}
          t={t}
          companyUuid={companyUuid}
          item={selectedItem}
          advisorPool={advisorPool}
          allowAdvisorLinking={!investorMode}
          availableIntelligence={availableIntelligence}
          signalCatalog={signalCatalog}
          recentObservations={recentObservations}
          onClose={() => {
            setSelectedId(null);
            setOpenedSnapshot(null);
            replaceQuery({ initiativeId: null });
          }}
          onStatusTabChange={(status) => {
            setSelectedId(null);
            setOpenedSnapshot(null);
            setStatusTab(status);
            setListPage(0);
            replaceQuery({ initiativeId: null });
          }}
          onStart={startListMutation}
          onIntelligenceLinksSaved={(intelligenceLinks) => {
            setListItems((prev) =>
              withUpdatedIntelligenceLinks(prev, selectedItem.id, intelligenceLinks),
            );
          }}
        />
      ) : null}
    </section>
  );
}
