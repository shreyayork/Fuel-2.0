"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CompanyOverviewPage } from "@/components/company/overview/CompanyOverviewPage";
import { InitiativesTab } from "@/components/company/initiatives/InitiativesTab";
import { BriefSuggestedInitiatives } from "@/components/company/briefs/BriefSuggestedInitiatives";
import { splitBriefSuggestions } from "@/lib/briefs/split-suggestions";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Theme } from "@/lib/theme";
import { accentChipBg, accentChipBorder, accentChipFg } from "@/lib/theme";
import type { CompanyDoc, CompanyHit, ContextItem, FundingRound } from "@/lib/fuel-data";
import { ProvenanceDrawer } from "../provenance/ProvenanceDrawer";
import { Chip, Logo, Tabs } from "../atoms";
import { useTheme } from "../ThemeContext";
import { shouldClearIntelligenceFocusOnTopNav } from "@/lib/intelligence/tab-nav-focus";
import { useUrlSyncedTab } from "@/lib/use-url-synced-tab";
import { AiActionsMenu } from "./AiActionsMenu";
import { type PlaybookPickerEntry as SharedPlaybookPickerEntry } from "./PlaybookPickerButton";
import {
  FUEL_ARTIFACT_CREATED_EVENT,
  type FuelArtifactCreatedDetail,
} from "../AgentDrawer";
import { GuidedTourOverlay } from "../workspace-tour/GuidedTourOverlay";
import {
  TourBuildingBanner,
  TourPromptBanner,
} from "../workspace-tour/TourPromptBanner";
import { BuildingOverviewStrip } from "../workspace-tour/BuildingOverviewStrip";
import { useWorkspaceTour } from "../workspace-tour/WorkspaceTourContext";
import { isTabTourTarget, type WorkspaceTourTab } from "@/lib/workspace-tour/constants";
import {
  businessModelLabel,
  profileSourceLabel,
} from "@/lib/company-profile-labels";
import { DataRoomTab } from "@/components/data-room/DataRoomTab";
import { BenchmarkEditDrawer } from "@/components/company/overview/BenchmarkEditDrawer";
import { DetailAnswersDrawer } from "@/components/company/overview/DetailAnswersDrawer";
import { OverviewStyleSheet } from "@/components/company/overview/OverviewStyleSheet";
import { IntelligencePage } from "@/components/intelligence/IntelligencePage";
import { IntelligenceProvenanceDrawer } from "@/components/intelligence/IntelligenceProvenanceDrawer";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import type { DataRoomSnapshot } from "@/lib/data-room/types";
import {
  COMPANY_TAB_KEYS,
  companyPublicNavItems,
  isLegacyTabAlias,
  type CompanyTabKey,
} from "@/lib/company-tabs";
import {
  BENCHMARK_REFRESH_PARAM,
  clearBenchmarkRefresh,
  invalidateOverviewClientCache,
  markBenchmarkRefreshError,
  markBenchmarkRefreshPending,
  markBenchmarkRefreshSaved,
  readBenchmarkRefreshState,
  seedOverviewFormCaches,
} from "@/lib/overview/client";
import { addNoteAction, deleteNoteAction } from "@/app/(app)/company/[uuid]/actions";
import { saveUpdateAction } from "@/app/(app)/company/[uuid]/update-actions";
import { toggleWatchlistMembershipAction } from "@/app/(app)/company/[uuid]/watchlist-actions";
import {
  linkAdvisorToCompanyAction,
  unlinkAdvisorFromCompanyAction,
} from "@/app/(app)/advisors/actions";

/** Match Overview section panels (`.sc-glance-row`, `.sc-detail-widget`). */
const COMPANY_PROFILE_SECTION_RADIUS = 12;

export interface ObservationFootnote {
  id: string;
  signalId: string;
  signalLabel: string;
  signalKind: "quantitative" | "qualitative" | "boolean";
  signalUnit: string | null;
  period: string;
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  confidence: number | null;
  rawSnippet: string | null;
}

export interface PrivateContextItem {
  id: string;
  kind: string;
  title: string | null;
  content: string;
  authorEmail: string | null;
  source: string;
  occurredAt: string;
  observations?: ObservationFootnote[];
  /** Count of file attachments on this item. Full attachment metadata
   *  (filename, size, storage key) isn't shipped to the client yet — the
   *  Data Room tab will load it on demand when P4.2 lands. */
  attachmentCount?: number;
}

// Tabs reorganized 2026-04-23: Advisors folded into Overview; Briefs→Research;
// Private Metrics→Intelligence (formerly Signals in URL: ?tab=signals redirects).
// Flow: Overview → Intelligence → Initiatives / Research / Data Room.
const TAB_KEYS = COMPANY_TAB_KEYS;
type TabKey = CompanyTabKey;

export interface CompanyAdvisorSummary {
  advisorId: string;
  name: string;
  title: string | null;
  company: string | null;
  photoUrl: string | null;
  expertise: string[] | null;
  role: string | null;
  publicCard: boolean;
}

export interface AdvisorPick {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  photoUrl?: string | null;
}

/** Map the account-wide advisor directory into the shape initiative UIs expect. */
export function advisorPickToSummary(a: AdvisorPick): CompanyAdvisorSummary {
  return {
    advisorId: a.id,
    name: a.name,
    title: a.title,
    company: a.company,
    photoUrl: a.photoUrl ?? null,
    expertise: null,
    role: null,
    publicCard: false,
  };
}

export interface PortfolioUpdateSummary {
  id: string;
  period: string;
  status: "draft" | "submitted";
  submittedByEmail: string;
  submittedAt: string | null;
  updatedAt: string;
  asOf: string | null;
  fteCount: number | null;
  paidCustomerCount: number | null;
  arrUsd: number | null;
  arrGrowthYoyPct: number | null;
  nrrPct: number | null;
  logoRetentionPct: number | null;
  grossMarginPct: number | null;
  cacPaybackMonths: number | null;
  burnMultiple: number | null;
  ruleOf40Pct: number | null;
  cashOnHandUsd: number | null;
  monthlyBurnUsd: number | null;
  notableCustomers: string | null;
  notableHires: string | null;
  otherUpdates: string | null;
  challenges: string | null;
  bankingPartner: string | null;
  legalCounsel: string | null;
  cloudProvider: string | null;
  capTablePlatform: string | null;
  doInsuranceProvider: string | null;
  crmPlatform: string | null;
  openToInvestorIntros: boolean;
}

export interface PrivateMetricsInput {
  period: string;
  current: PortfolioUpdateSummary | null;
  history: PortfolioUpdateSummary[];
  benchmarks: {
    cohortKey: string | null;
    rows: Array<{
      metric: string;
      p25: number | null;
      p50: number | null;
      p75: number | null;
      p90: number | null;
      unit: string | null;
      invertedGood: boolean;
    }>;
    allCohorts: Array<{
      cohortKey: string;
      dimensions: {
        businessModel?: string | null;
        stage?: string | null;
        vertical?: string | null;
        geo?: string | null;
      };
      sampleSize: number | null;
    }>;
  };
}

export interface ArtifactSummary {
  id: string;
  kind: string;
  title: string;
  content: string;
  authorEmail: string;
  createdAt: string;
}

/** Union server snapshot with in-flight local merges (dedupe by id, newest first). */
function mergeArtifactSummaries(
  fromServer: ArtifactSummary[],
  prev: ArtifactSummary[],
): ArtifactSummary[] {
  const byId = new Map<string, ArtifactSummary>();
  for (const row of fromServer) byId.set(row.id, row);
  for (const row of prev) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function formatUsd(n?: number): string | null {
  if (!n && n !== 0) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function isFoundingYear(n: number): boolean {
  return Number.isInteger(n) && n >= 1800 && n <= 2100;
}

function parseDate(value?: string | number | null): Date | null {
  if (value == null) return null;
  if (typeof value === "number") {
    // Catalog/onboarding store founding year as a number (e.g. 2019), not epoch ms.
    if (isFoundingYear(value)) return new Date(Date.UTC(value, 0, 1));
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  if (!s) return null;
  // Treat a purely-numeric string as epoch ms (Neptune serializes timestamps that way).
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    // 4-digit founding year from catalog / onboarding claim (e.g. "2019").
    if (s.length === 4 && isFoundingYear(n)) {
      return new Date(Date.UTC(n, 0, 1));
    }
    // ≤10 digits → epoch seconds; longer → epoch ms.
    const ms = s.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function yearsAgo(value?: string | number | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return years < 1 ? `${Math.round(years * 12)}mo` : `${years.toFixed(1)}yr`;
}

function formatMonth(value?: string | number | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function hostForUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

function titleCase(s?: string): string | undefined {
  if (!s) return undefined;
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function locationOf(c: CompanyDoc): string | null {
  const city = titleCase(c.locationCity);
  const state = c.locationState?.toUpperCase();
  const country = c.locationCountry?.toUpperCase();
  const region = titleCase(c.locationRegion);
  const parts = [city, state ?? region, country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function labelStyle(t: Theme): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 500,
    color: t.muted,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
}

function ProfileTile({
  t,
  company,
  businessModel,
}: {
  t: Theme;
  company: CompanyDoc;
  businessModel: string | null;
}) {
  const source = profileSourceLabel(company.raw);
  const typeLabel = businessModelLabel(businessModel);

  return (
    <Card
      title="Profile"
    >
      <div>
        <KeyValue label="Company">{company.name || "—"}</KeyValue>
        <KeyValue label="Domain">{company.domain || "—"}</KeyValue>
        <KeyValue label="Company type">{typeLabel || "—"}</KeyValue>
        <KeyValue label="Source">{source}</KeyValue>
      </div>
    </Card>
  );
}

function StatCell({ label, value }: { label: string; value: ReactNode }) {
  const t = useTheme();
  return (
    <div
      style={{
        padding: "14px 18px",
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: COMPANY_PROFILE_SECTION_RADIUS,
      }}
    >
      <div style={labelStyle(t)}>{label}</div>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 22,
          fontWeight: 600,
          color: t.ink,
          marginTop: 6,
          letterSpacing: "-0.015em",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const t = useTheme();
  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: COMPANY_PROFILE_SECTION_RADIUS,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink }}>{title}</div>
        {right ? <div style={{ fontSize: 11, color: t.muted, letterSpacing: "0.04em" }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  const t = useTheme();
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        border: `1px dashed ${t.rule}`,
        background: "transparent",
        marginTop: 24,
      }}
    >
      <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>{title}</div>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 13,
          color: t.muted,
          marginTop: 6,
          lineHeight: 1.5,
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function relativeTime(isoDate?: string): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(days / 365);
  return `${y}y ago`;
}

const KIND_LABEL: Record<ContextItem["kind"], string> = {
  article: "OWNED",
  earned: "EARNED",
  podcast: "PODCAST",
};

type ContextFilter = "all" | "private" | ContextItem["kind"];

interface MergedFeedItemBase {
  attachmentCount?: number;
}

interface MergedFeedItem extends MergedFeedItemBase {
  id: string;
  title: string;
  content?: string;
  url?: string;
  siteName?: string;
  image?: string;
  publishedDate?: string;
  keywords?: string[];
  kind: ContextItem["kind"] | "note" | "email" | "meeting_transcript" | "hubspot_activity" | "slack_message" | "other";
  source: "public" | "private";
  /** For private items, the original DB `source` string (e.g. "granola:abc", "hubspot:activity:123"). */
  sourceRaw?: string;
  privateId?: string;
  author?: string | null;
  observations?: ObservationFootnote[];
}

function formatObservationValue(o: ObservationFootnote): string {
  if (o.signalKind === "quantitative" && o.valueNumeric != null) {
    switch (o.signalUnit) {
      case "usd":
        return formatUsd(o.valueNumeric) ?? `$${o.valueNumeric}`;
      case "pct":
        return `${Math.round(o.valueNumeric * 10) / 10}%`;
      case "months":
        return `${o.valueNumeric}mo`;
      case "days":
        return `${o.valueNumeric}d`;
      case "ratio":
        return `${Math.round(o.valueNumeric * 100) / 100}x`;
      case "score":
        return `${o.valueNumeric}`;
      default:
        return o.valueNumeric.toLocaleString();
    }
  }
  if (o.signalKind === "boolean" && o.valueBool != null) {
    return o.valueBool ? "Yes" : "No";
  }
  if (o.valueText) {
    return o.valueText.length > 60 ? `${o.valueText.slice(0, 60)}…` : o.valueText;
  }
  return "—";
}

function ObservationFootnoteRow({
  t,
  observations,
  onOpenProvenance,
}: {
  t: Theme;
  observations: ObservationFootnote[];
  onOpenProvenance: (observationId: string) => void;
}) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 10px",
        background: t.panelAlt,
        border: `1px solid ${t.ruleSoft}`,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontFamily: t.mono,
          fontSize: 9,
          color: t.mutedSoft,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        Extracted · {observations.length}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {observations.map((o) => {
          const low = (o.confidence ?? 1) < 0.6;
          return (
            <button
              key={o.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenProvenance(o.id);
              }}
              style={{
                fontFamily: t.sans,
                fontSize: 11,
                padding: "4px 8px",
                border: `1px solid ${low ? t.warn : t.rule}`,
                borderRadius: 999,
                background: "transparent",
                color: t.inkSoft,
                cursor: "pointer",
              }}
              title={low ? "Low confidence · click for provenance" : "Click for provenance"}
            >
              <span style={{ fontWeight: 600 }}>{o.signalLabel}</span>{" "}
              <span style={{ color: t.accent }}>{formatObservationValue(o)}</span>{" "}
              <span style={{ color: t.mutedSoft, fontFamily: t.mono, fontSize: 10 }}>· {o.period}</span>
              <span
                aria-hidden
                style={{ marginLeft: 6, color: t.mutedSoft, fontSize: 10 }}
              >
                ⓘ
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NoteForm({ uuid, userEmail }: { uuid: string; userEmail?: string }) {
  const t = useTheme();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        padding: 14,
        background: t.panel,
        border: `1px solid ${t.rule}`,
        marginBottom: 14,
      }}
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: t.ink,
            color: t.bg,
            border: `1px solid ${t.ink}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + Add private note
        </button>
      ) : (
        <form
          action={(fd) => {
            fd.set("uuid", uuid);
            startTransition(() => addNoteAction(fd));
            setOpen(false);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <input
            name="title"
            placeholder="Title (optional)"
            style={{
              padding: "8px 10px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
            }}
          />
          <textarea
            name="content"
            autoFocus
            required
            rows={4}
            placeholder={`What do you want to remember about ${userEmail ? "this company" : "this company"}?`}
            style={{
              padding: "10px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: "6px 12px",
                background: "transparent",
                color: t.inkSoft,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "6px 12px",
                background: t.ink,
                color: t.bg,
                border: `1px solid ${t.ink}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Save note
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ContextFeed({
  uuid,
  privateContext,
  userEmail,
  onOpenProvenance,
  onOpenDataRoom,
}: {
  uuid: string;
  privateContext: PrivateContextItem[];
  userEmail?: string;
  onOpenProvenance: (observationId: string) => void;
  onOpenDataRoom?: () => void;
}) {
  const t = useTheme();
  const [items, setItems] = useState<ContextItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContextFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    fetch(`/api/fuel-data/companies/${uuid}/articles?limit=80`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { articles: ContextItem[] }) => {
        if (!cancelled) setItems(j.articles);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  // Merge public (Neptune) + private (Postgres) into one timeline.
  const publicMerged: MergedFeedItem[] = (items ?? []).map((a) => ({
    id: a.id || a.url || String(Math.random()),
    title: a.title ?? "Untitled",
    content: a.description,
    url: a.url,
    siteName: a.siteName,
    image: a.image,
    publishedDate: a.publishedDate,
    keywords: a.keywords,
    kind: a.kind,
    source: "public",
  }));

  const privateMerged: MergedFeedItem[] = privateContext.map((n) => ({
    id: `private:${n.id}`,
    title: n.title ?? (n.kind === "note" ? "Note" : n.kind),
    content: n.content,
    publishedDate: n.occurredAt,
    kind: n.kind as MergedFeedItem["kind"],
    source: "private",
    sourceRaw: n.source,
    privateId: n.id,
    author: n.authorEmail,
    observations: n.observations,
    attachmentCount: n.attachmentCount,
  }));

  const merged = [...publicMerged, ...privateMerged].sort((a, b) =>
    (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""),
  );

  const counts = merged.reduce(
    (acc, it) => {
      acc.all++;
      if (it.source === "private") acc.private++;
      else acc[it.kind as ContextItem["kind"]] = (acc[it.kind as ContextItem["kind"]] ?? 0) + 1;
      return acc;
    },
    { all: 0, private: 0 } as Record<string, number>,
  );

  const shown = merged.filter((it) => {
    if (filter === "all") return true;
    if (filter === "private") return it.source === "private";
    return it.kind === filter;
  });

  const filterBtn = (k: ContextFilter, label: string, n?: number): ReactNode => {
    const active = filter === k;
    return (
      <button
        key={k}
        onClick={() => setFilter(k)}
        style={{
          fontFamily: t.sans,
          fontSize: 12,
          fontWeight: active ? 600 : 500,
          padding: "6px 12px",
          borderRadius: 999,
          border: `1px solid ${active ? t.ink : t.rule}`,
          background: active ? t.ink : "transparent",
          color: active ? t.bg : t.inkSoft,
          cursor: "pointer",
        }}
      >
        {label}
        {n != null ? (
          <span style={{ marginLeft: 6, fontFamily: t.mono, fontSize: 11, fontWeight: 400, opacity: 0.7 }}>
            {n}
          </span>
        ) : null}
      </button>
    );
  };

  if (error && merged.length === 0) {
    return (
      <div style={{ marginTop: 24 }}>
        <NoteForm uuid={uuid} userEmail={userEmail} />
        <EmptyState
          title="Couldn't load public context"
          body={`Neptune returned ${error}. Private notes still show below.`}
        />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <NoteForm uuid={uuid} userEmail={userEmail} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {filterBtn("all", "All", counts.all)}
        {counts.private ? filterBtn("private", "Private notes", counts.private) : null}
        {counts.article ? filterBtn("article", "Owned", counts.article) : null}
        {counts.earned ? filterBtn("earned", "Earned", counts.earned) : null}
        {counts.podcast ? filterBtn("podcast", "Podcasts", counts.podcast) : null}
      </div>

      {items === null && privateMerged.length === 0 ? (
        <div style={{ padding: 24, fontFamily: t.sans, fontSize: 13, color: t.muted }}>
          Loading context…
        </div>
      ) : null}

      {items !== null && merged.length === 0 ? (
        <EmptyState
          title="No context yet"
          body="Add a private note above, or wait for public content (articles, podcasts, funding events) to stream in from fuel-data."
        />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((a) => {
          const rel = relativeTime(a.publishedDate);
          const isPrivate = a.source === "private";
          const isExpanded = expanded.has(a.id);
          const kindLabel =
            isPrivate
              ? a.kind === "note"
                ? "NOTE"
                : a.kind.toUpperCase()
              : KIND_LABEL[a.kind as ContextItem["kind"]] ?? a.kind.toUpperCase();

          // For private items, collapse body by default — HubSpot email
          // threads in particular are noisy as one wall of text. Public
          // (fuel-data) items keep their 3-line clamp so the list still
          // scans quickly.
          const showBody = isPrivate ? isExpanded : true;

          // Pull a compact from→to line for HubSpot emails so the
          // collapsed row conveys who's corresponding without expanding.
          // The metadata fields aren't threaded down to the view yet —
          // we parse it off the top of the markdown content string which
          // was built by buildEmailContent (`**From**: x\n\n**To**: y`).
          const isHubspotEmail = a.sourceRaw?.startsWith("hubspot:email:");
          const emailPeople: { from?: string; to?: string } = {};
          let bodyForDisplay = a.content ?? "";
          if (isHubspotEmail && a.content) {
            const fromMatch = a.content.match(/\*\*From\*\*:\s*([^\n]+)/);
            const toMatch = a.content.match(/\*\*To\*\*:\s*([^\n]+)/);
            if (fromMatch) emailPeople.from = fromMatch[1].trim();
            if (toMatch) emailPeople.to = toMatch[1].trim();
            // Strip the From:/To: lines from the body so the expanded
            // view doesn't echo them — they're in the metadata row.
            bodyForDisplay = a.content
              .replace(/\*\*From\*\*:[^\n]+\n*/g, "")
              .replace(/\*\*To\*\*:[^\n]+\n*/g, "")
              .trim();
          }

          const content = (
            <div
              style={{
                padding: isPrivate ? "10px 14px" : "14px 18px",
                background: t.panel,
                border: `1px solid ${isPrivate ? t.accent + "55" : t.rule}`,
                borderLeft: isPrivate ? `3px solid ${t.accent}` : `1px solid ${t.rule}`,
                display: "grid",
                gridTemplateColumns: a.image ? "72px 1fr auto" : "1fr auto",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              {a.image ? (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    background: `#000 center/cover url(${a.image})`,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                />
              ) : null}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: t.sans,
                    fontSize: isPrivate ? 13 : 14,
                    fontWeight: 600,
                    color: t.ink,
                    lineHeight: 1.4,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {isPrivate ? (
                    <span
                      aria-hidden
                      style={{
                        fontFamily: t.mono,
                        fontSize: 10,
                        color: t.mutedSoft,
                        width: 10,
                        display: "inline-block",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 120ms ease",
                      }}
                    >
                      ▸
                    </span>
                  ) : null}
                  <span
                    style={{
                      whiteSpace: isPrivate && !isExpanded ? "nowrap" : "normal",
                      overflow: isPrivate && !isExpanded ? "hidden" : "visible",
                      textOverflow: isPrivate && !isExpanded ? "ellipsis" : "clip",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {a.title}
                  </span>
                </div>
                {showBody && a.content ? (
                  isPrivate ? (
                    <div style={{ marginTop: 8 }}>
                      <MarkdownBody t={t} content={bodyForDisplay} />
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: t.sans,
                        fontSize: 12,
                        color: t.inkSoft,
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {a.content}
                    </div>
                  )
                ) : null}
                {showBody && a.observations && a.observations.length > 0 ? (
                  <ObservationFootnoteRow
                    t={t}
                    observations={a.observations}
                    onOpenProvenance={onOpenProvenance}
                  />
                ) : null}
                <div
                  style={{
                    marginTop: isPrivate && !isExpanded ? 4 : 8,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    fontFamily: t.mono,
                    fontSize: 10,
                    color: t.mutedSoft,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ color: t.accent }}>{kindLabel}</span>
                  {a.sourceRaw?.startsWith("granola:") ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#FFE66A26",
                        color: "#C8A600",
                        border: "1px solid #FFE66A55",
                        letterSpacing: "0.04em",
                      }}
                    >
                      GRANOLA
                    </span>
                  ) : a.sourceRaw?.startsWith("hubspot:") ? (
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#FF7A5926",
                        color: "#FF7A59",
                        border: "1px solid #FF7A5955",
                        letterSpacing: "0.04em",
                      }}
                    >
                      HUBSPOT
                    </span>
                  ) : null}
                  {a.siteName ? <span>{a.siteName}</span> : null}
                  {isHubspotEmail && emailPeople.from ? (
                    <span style={{ color: t.muted, textTransform: "none", letterSpacing: 0 }}>
                      {emailPeople.from}
                      {emailPeople.to ? ` → ${emailPeople.to}` : ""}
                    </span>
                  ) : isPrivate && a.author ? (
                    <span>{a.author.toUpperCase()}</span>
                  ) : null}
                  {rel ? <span>{rel}</span> : null}
                  {a.observations && a.observations.length > 0 ? (
                    <span
                      title={
                        isExpanded
                          ? `${a.observations.length} signal${a.observations.length === 1 ? "" : "s"} extracted`
                          : `${a.observations.length} signal${a.observations.length === 1 ? "" : "s"} extracted — expand to review`
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: t.accent + "22",
                        color: t.accent,
                        border: `1px solid ${t.accent}55`,
                        letterSpacing: "0.04em",
                      }}
                    >
                      ◆ {a.observations.length} {a.observations.length === 1 ? "signal" : "signals"}
                    </span>
                  ) : null}
                  {a.attachmentCount && a.attachmentCount > 0 ? (
                    <button
                      type="button"
                      title={`${a.attachmentCount} attachment${a.attachmentCount === 1 ? "" : "s"} — open in Data Room`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDataRoom?.();
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: t.panelAlt,
                        color: t.inkSoft,
                        border: `1px solid ${t.rule}`,
                        letterSpacing: "0.04em",
                        cursor: onOpenDataRoom ? "pointer" : "default",
                        font: "inherit",
                      }}
                    >
                      📎 {a.attachmentCount}
                    </button>
                  ) : null}
                  {a.keywords && a.keywords.length > 0 ? (
                    <span style={{ color: t.muted, textTransform: "none", letterSpacing: 0 }}>
                      {a.keywords.slice(0, 3).join(" · ")}
                    </span>
                  ) : null}
                </div>
              </div>
              {isPrivate && a.privateId ? (
                <form
                  action={(fd) => {
                    fd.set("id", a.privateId!);
                    fd.set("uuid", uuid);
                    startTransition(() => deleteNoteAction(fd));
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="submit"
                    title="Delete note"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: t.mutedSoft,
                      fontSize: 16,
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    ×
                  </button>
                </form>
              ) : null}
            </div>
          );

          if (a.url) {
            // Public articles still open externally — whole card is a link.
            return (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {content}
              </a>
            );
          }
          // Private items toggle expansion on click. Using a div with
          // role=button so the delete ✕ form (which stops propagation)
          // still works without nesting buttons.
          return (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleExpanded(a.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpanded(a.id);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FundingRoundsCard({ uuid }: { uuid: string }) {
  const t = useTheme();
  const [rounds, setRounds] = useState<FundingRound[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fuel-data/companies/${uuid}/funding?limit=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { rounds: FundingRound[] }) => {
        if (!cancelled) setRounds(j.rounds);
      })
      .catch(() => {
        if (!cancelled) setRounds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  if (rounds === null) {
    return (
      <Card title="Funding Rounds" right="FROM NEPTUNE">
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, padding: "4px 0" }}>
          Loading…
        </div>
      </Card>
    );
  }
  if (rounds.length === 0) {
    return (
      <Card title="Funding Rounds" right="FROM NEPTUNE">
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
          No funding rounds tracked in fuel-data.
        </div>
      </Card>
    );
  }

  // Build a cumulative-$ sparkline.
  const sorted = [...rounds].reverse(); // ascending by date
  const points = sorted.map((r, i) => {
    const prev = i > 0 ? (sorted[i - 1] as FundingRound & { _cum?: number })._cum ?? 0 : 0;
    const cur = prev + (r.raisedAmountUsd ?? 0);
    (r as FundingRound & { _cum?: number })._cum = cur;
    return cur;
  });
  const maxCum = Math.max(1, ...points);
  const sparkW = 220;
  const sparkH = 36;
  const sparkPath = sorted
    .map((_r, i) => {
      const x = (i / Math.max(1, sorted.length - 1)) * sparkW;
      const y = sparkH - (points[i] / maxCum) * (sparkH - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <Card title="Funding Rounds" right={`${rounds.length} ROUNDS`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>Cumulative raised</div>
        <svg width={sparkW} height={sparkH} style={{ display: "block" }}>
          <path d={sparkPath} fill="none" stroke={t.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {sorted.map((_r, i) => {
            const x = (i / Math.max(1, sorted.length - 1)) * sparkW;
            const y = sparkH - (points[i] / maxCum) * (sparkH - 4) - 2;
            return <circle key={i} cx={x} cy={y} r={1.8} fill={t.accent} />;
          })}
        </svg>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Date", "Round", "Amount", "Investors"].map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: i === 2 ? "right" : "left",
                  fontFamily: t.sans,
                  fontSize: 10,
                  fontWeight: 500,
                  color: t.muted,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "6px 10px",
                  borderBottom: `1px solid ${t.rule}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.id || `${r.announcedOn}-${r.investmentType}`}>
              <td style={{ padding: "10px 10px", fontSize: 12, color: t.ink, borderBottom: `1px solid ${t.ruleSoft}`, fontFamily: t.sans }}>
                {formatMonth(r.announcedOn) ?? "—"}
              </td>
              <td style={{ padding: "10px 10px", fontSize: 13, color: t.ink, borderBottom: `1px solid ${t.ruleSoft}` }}>
                {r.investmentType ? titleCase(r.investmentType.replace(/_/g, " ")) : "—"}
              </td>
              <td
                style={{
                  padding: "10px 10px",
                  fontSize: 13,
                  color: t.ink,
                  borderBottom: `1px solid ${t.ruleSoft}`,
                  textAlign: "right",
                  fontFamily: t.sans,
                  fontFeatureSettings: '"tnum" 1',
                }}
              >
                {r.raisedAmountUsd ? formatUsd(r.raisedAmountUsd) : "—"}
              </td>
              <td
                style={{
                  padding: "10px 10px",
                  fontSize: 12,
                  color: t.inkSoft,
                  borderBottom: `1px solid ${t.ruleSoft}`,
                  maxWidth: 360,
                }}
              >
                {r.investors && r.investors.length > 0 ? (
                  <span style={{ lineHeight: 1.4 }}>
                    {r.investors.slice(0, 4).map((inv, i, arr) => (
                      <span key={inv.companyUuid || inv.id || inv.name}>
                        {inv.companyUuid ? (
                          <Link
                            href={`/company/${encodeURIComponent(inv.companyUuid)}`}
                            style={{ color: t.accent, textDecoration: "none" }}
                          >
                            {inv.name}
                          </Link>
                        ) : (
                          <span>{inv.name}</span>
                        )}
                        {i < arr.length - 1 ? ", " : ""}
                      </span>
                    ))}
                    {r.investors.length > 4 ? (
                      <span style={{ color: t.muted }}> · +{r.investors.length - 4}</span>
                    ) : null}
                  </span>
                ) : r.investorNames && r.investorNames.length > 0 ? (
                  <span style={{ lineHeight: 1.4 }}>
                    {r.investorNames.slice(0, 4).join(", ")}
                    {r.investorNames.length > 4 ? (
                      <span style={{ color: t.muted }}> · +{r.investorNames.length - 4}</span>
                    ) : null}
                  </span>
                ) : (
                  <span style={{ color: t.mutedSoft }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function NewsPreviewCard({ uuid, onSeeMore }: { uuid: string; onSeeMore: () => void }) {
  const t = useTheme();
  const [items, setItems] = useState<ContextItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fuel-data/companies/${uuid}/articles?limit=5`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { articles: ContextItem[] }) => {
        if (!cancelled) setItems(j.articles);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  return (
    <Card
      title="Recent News"
      right={
        items && items.length > 0 ? (
          <button
            onClick={onSeeMore}
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.accent,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            ALL CONTEXT →
          </button>
        ) : undefined
      }
    >
      {items === null ? (
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
          No recent news, podcasts, or mentions linked in fuel-data.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.slice(0, 5).map((a) => {
            const rel = relativeTime(a.publishedDate);
            const content = (
              <div
                style={{
                  padding: "10px 0",
                  borderTop: `1px solid ${t.ruleSoft}`,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      color: t.ink,
                      lineHeight: 1.4,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {a.title ?? "Untitled"}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: t.mono,
                      fontSize: 10,
                      color: t.mutedSoft,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span style={{ color: t.accent }}>{KIND_LABEL[a.kind]}</span>
                    {a.siteName ? <span>{a.siteName}</span> : null}
                    {rel ? <span>{rel}</span> : null}
                  </div>
                </div>
              </div>
            );
            return a.url ? (
              <a
                key={a.id || a.url}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {content}
              </a>
            ) : (
              <div key={a.id}>{content}</div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function SimilarCompanies({ uuid }: { uuid: string }) {
  const t = useTheme();
  const [list, setList] = useState<CompanyHit[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fuel-data/companies/${uuid}/similar?limit=6`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { similar: CompanyHit[] }) => {
        if (!cancelled) setList(j.similar);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  return (
    <Card title="Similar Companies" right={list?.length ? `${list.length}` : undefined}>
      {list === null ? (
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, padding: "4px 0" }}>
          Loading…
        </div>
      ) : list.length === 0 ? (
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>No similar companies indexed.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((c) => (
            <Link
              key={c.uuid}
              href={`/company/${c.uuid}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderTop: `1px solid ${t.ruleSoft}`,
                color: t.ink,
                textDecoration: "none",
              }}
            >
              <Logo t={t} co={{ logo: c.name.slice(0, 2).toUpperCase(), name: c.name, uuid: c.uuid }} size={26} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontFamily: t.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    color: t.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.name}
                </div>
                {c.domain ? (
                  <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>{c.domain}</div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ color: t.accent, textDecoration: "none", fontFamily: t.sans, fontSize: 13 }}
    >
      {children}
    </a>
  );
}

function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <div style={{ display: "flex", gap: 14, padding: "8px 0", borderTop: `1px solid ${t.ruleSoft}` }}>
      <div style={{ ...labelStyle(t), width: 120, flexShrink: 0, paddingTop: 2 }}>{label}</div>
      <div style={{ fontFamily: t.sans, fontSize: 13, color: t.ink, minWidth: 0, flex: 1, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

export interface WatchlistMembershipItem {
  id: string;
  name: string;
  kind: "portfolio" | "watchlist";
  scope: "private" | "account" | "team";
  ownerEmail: string;
  contains: boolean;
}

export type PlaybookPickerEntry = SharedPlaybookPickerEntry;

export interface InitiativeProgressSummary {
  signal: {
    id: string;
    label: string;
    category: string;
    kind: "quantitative" | "qualitative" | "boolean";
    unit: string | null;
    invertedGood: boolean;
  };
  baseline: {
    valueNumeric: number | null;
    valueText: string | null;
    valueBool: boolean | null;
    capturedAt: string;
    sourceObservationId: string | null;
  } | null;
  current: {
    observationId: string;
    valueNumeric: number | null;
    valueText: string | null;
    valueBool: boolean | null;
    period: string;
    observedAt: string;
  } | null;
  target: {
    valueNumeric: number | null;
    valueText: string | null;
    valueBool: boolean | null;
    targetDate: string | null;
  } | null;
}

export interface InitiativeMilestoneSummary {
  id: string;
  label: string;
  status: string;
  dueDate: string | null;
  note: string | null;
  completedAt: string | null;
}

export interface InitiativeIntelligenceLinkSummary {
  id: string;
  role: "baseline" | "current" | "target";
  intelligenceId: string;
  title: string;
  highlight: string;
  type: string;
  date: string;
}

export interface InitiativeYorkHelpSummary {
  sectionTitle: string;
  bullets: Array<{
    title?: string;
    milestone: string;
    help: string;
    primaryService: string;
    track: "rd" | "gtm" | "ga";
  }>;
  ctaLabel: string;
}

export interface InitiativeSourceDocumentSummary {
  id: string;
  documentVersionId: string | null;
  title: string;
  typeLabel?: string | null;
}

export interface CompanyInitiativeSummary {
  id: string;
  kind: "continuous" | "onetime";
  name: string;
  area: string;
  overviewCategoryId: string | null;
  description: string | null;
  status: string;
  source: string | null;
  ownerEmail: string;
  /** Free-text assignee chips; falls back to [ownerEmail] when empty. */
  assignees: string[];
  due: string | null;
  createdAt: string;
  updatedAt: string;
  advisors: Array<{
    advisorId: string;
    name: string;
    title: string | null;
    company: string | null;
    photoUrl: string | null;
    role: string | null;
  }>;
  progress: InitiativeProgressSummary[];
  milestones: InitiativeMilestoneSummary[];
  intelligenceLinks: InitiativeIntelligenceLinkSummary[];
  sourceDocuments: InitiativeSourceDocumentSummary[];
  sourceRationale: string | null;
  benefit: string | null;
  priority: string | null;
  baselineMetric: string | null;
  targetMetric: string | null;
  benchmarkCohort: string | null;
  yorkHelp: InitiativeYorkHelpSummary | null;
  yorkHelpStatus: "idle" | "generating" | "ready" | "failed";
  yorkHelpDismissed: boolean;
}

export interface CompanySignalObservation {
  id: string;
  signalId: string;
  signalLabel: string;
  signalCategory: string;
  signalKind: "quantitative" | "qualitative" | "boolean";
  signalUnit: string | null;
  period: string;
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  confidence: number | null;
  rawSnippet: string | null;
  contextItemId: string | null;
  createdAt: string;
}

export interface SignalCatalogEntry {
  id: string;
  label: string;
  category: string;
  kind: "quantitative" | "qualitative" | "boolean";
  unit: string | null;
}

export function CompanyPublicView({
  company,
  userEmail,
  isFounderHome = false,
  privateContext = [],
  artifacts = [],
  createdBriefSuggestionKeysByArtifact = {},
  artifactCount = 0,
  initiativeCount = 0,
  privateMetrics,
  watchlistMemberships = [],
  portfolioManagerEnabled = false,
  advisors = [],
  advisorPool = [],
  signalObservations = [],
  initiatives = [],
  availablePlaybooks = [],
  signalCatalog = [],
  currentPeriod,
  isCatalogCompany = false,
  catalogBusinessModel = null,
  dataRoom = { slots: [], activeCount: 0, sourcesTotal: 0, feedAttachments: [] },
  companyIntelligence = [],
  creditBalance = 0,
}: {
  company: CompanyDoc;
  userEmail?: string;
  /** Founder CM home — Overview tab renders the AI operating dashboard. */
  isFounderHome?: boolean;
  privateContext?: PrivateContextItem[];
  artifacts?: ArtifactSummary[];
  /** Research: artifactId → created suggestion persist keys (server hydrate). */
  createdBriefSuggestionKeysByArtifact?: Record<string, string[]>;
  /** Tab badge — always loaded server-side, independent of active tab. */
  artifactCount?: number;
  initiativeCount?: number;
  privateMetrics?: PrivateMetricsInput;
  watchlistMemberships?: WatchlistMembershipItem[];
  portfolioManagerEnabled?: boolean;
  advisors?: CompanyAdvisorSummary[];
  advisorPool?: AdvisorPick[];
  /** Latest signal_observations for this company, joined with signal defs.
   *  Feeds the "Extracted signals" section on the Signals tab. */
  signalObservations?: CompanySignalObservation[];
  initiatives?: CompanyInitiativeSummary[];
  availablePlaybooks?: PlaybookPickerEntry[];
  /** Global signal catalog — powers the "+ Log signal" manual-entry form.
   *  Lightweight shape so we don't ship the full signal row (embeddings,
   *  extraction hints, etc.) to the client. */
  signalCatalog?: SignalCatalogEntry[];
  /** Current reporting period ("2026-q1") — default for the manual-entry
   *  form and the private-metrics submission flow. */
  currentPeriod?: string;
  /** Catalog (`cat_`) companies expose account-owned profile details. */
  isCatalogCompany?: boolean;
  catalogBusinessModel?: string | null;
  dataRoom?: DataRoomSnapshot;
  companyIntelligence?: CompanyIntelligenceRow[];
  creditBalance?: number;
}) {
  const t = useTheme();
  const tour = useWorkspaceTour();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab selection lives in `?tab=…` so Back/Forward navigates through
  // tabs and shared links land where the sender expects.
  const [tab, setTab] = useUrlSyncedTab<TabKey>({
    paramName: "tab",
    validKeys: TAB_KEYS,
    defaultValue: "overview",
    stripDefaultFromUrl: false,
  });

  // Rewrite legacy `?tab=signals` / `?tab=context` bookmarks to `?tab=intelligence`.
  // Unclaimed companies cannot land on Data Room via deep link.
  useEffect(() => {
    const raw = searchParams.get("tab") ?? undefined;
    if (isLegacyTabAlias(raw)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "intelligence");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      return;
    }
    if (raw === "dataroom" && !isFounderHome) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "overview");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [isFounderHome, pathname, router, searchParams]);
  const [provenanceId, setProvenanceId] = useState<string | null>(null);
  const [intelligenceProvenanceId, setIntelligenceProvenanceId] = useState<string | null>(null);
  const [highlightIntelIds, setHighlightIntelIds] = useState<string[]>([]);
  const [intelligenceItems, setIntelligenceItems] = useState(companyIntelligence);
  const [signalObservationItems, setSignalObservationItems] = useState(signalObservations);
  const [credits, setCredits] = useState(creditBalance);
  const [dataRoomState, setDataRoomState] = useState(dataRoom);
  // Research list — client state mirrors Intelligence pattern so playbook
  // completions can merge immediately (SSR props alone + soft refresh lag).
  const [artifactItems, setArtifactItems] = useState(artifacts);
  const [artifactBadgeCount, setArtifactBadgeCount] = useState(artifactCount);
  const [tourTabAnchorEl, setTourTabAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const goToIntelligence = () => setTab("intelligence");

  const { benchmarkRefreshing, benchmarkRefreshError } = useBenchmarkRefreshOverlay(
    company.uuid,
    setIntelligenceItems,
  );

  useEffect(() => {
    setDataRoomState(dataRoom);
  }, [dataRoom]);

  useEffect(() => {
    setIntelligenceItems(companyIntelligence);
  }, [companyIntelligence]);

  useEffect(() => {
    setSignalObservationItems(signalObservations);
  }, [signalObservations]);

  useEffect(() => {
    setCredits(creditBalance);
  }, [creditBalance]);

  useEffect(() => {
    setArtifactItems((prev) => mergeArtifactSummaries(artifacts, prev));
  }, [artifacts]);

  useEffect(() => {
    setArtifactBadgeCount(artifactCount);
  }, [artifactCount]);

  useEffect(() => {
    const onArtifactCreated = (event: Event) => {
      const detail = (event as CustomEvent<FuelArtifactCreatedDetail>).detail;
      if (!detail?.id || !detail.subjectCompanyUuid) return;
      if (detail.subjectCompanyUuid !== company.uuid) return;
      let inserted = false;
      setArtifactItems((prev) => {
        if (prev.some((a) => a.id === detail.id)) return prev;
        inserted = true;
        const next: ArtifactSummary = {
          id: detail.id,
          kind: detail.kind,
          title: detail.title,
          content: detail.content,
          authorEmail: detail.authorEmail,
          createdAt: detail.createdAt,
        };
        return [next, ...prev];
      });
      if (inserted) setArtifactBadgeCount((count) => count + 1);
    };
    window.addEventListener(FUEL_ARTIFACT_CREATED_EVENT, onArtifactCreated);
    return () => {
      window.removeEventListener(FUEL_ARTIFACT_CREATED_EVENT, onArtifactCreated);
    };
  }, [company.uuid]);

  const { registerCompanyTour, unregisterCompanyTour } = tour;

  // Ref-stabilise setTab so registration only runs on mount/unmount.
  // Skip no-op same-tab pushes so same-tab tour steps do not churn the router.
  const setTabRef = useRef(setTab);
  setTabRef.current = setTab;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const stableSetTab = useCallback((next: WorkspaceTourTab) => {
    if (tabRef.current === next) return;
    setTabRef.current(next as TabKey);
  }, []);

  useEffect(() => {
    registerCompanyTour({
      setTab: stableSetTab,
      includeAiAdvisor: isFounderHome,
      // Head CTAs always render — not gated on benchmark submission.
      includeIntelligenceActions: true,
    });
    return () => unregisterCompanyTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFounderHome, registerCompanyTour, stableSetTab, unregisterCompanyTour]);

  const tabTourTarget = isTabTourTarget(tour.activeTarget) ? tour.activeTarget : null;
  const aiActionsTourActive =
    tour.tourOpen &&
    (tour.activeTarget === "ai-actions-playbooks" ||
      tour.activeTarget === "ai-actions-brief");
  const aiActionsTourHighlightItem =
    tour.activeTarget === "ai-actions-playbooks"
      ? ("playbooks" as const)
      : tour.activeTarget === "ai-actions-brief"
        ? ("brief" as const)
        : undefined;

  const loc = locationOf(company);
  const founded = formatMonth(company.foundedOn);
  const foundedAgo = yearsAgo(company.foundedOn);
  const fundingTotal = formatUsd(company.totalFundingUsd);
  const lastFundingMonth = formatMonth(company.lastFundingOn);
  const lastFundingAgo = yearsAgo(company.lastFundingOn);
  const logoInitial = company.name.slice(0, 2).toUpperCase();
  const isOperating = (company.status ?? "").toLowerCase() === "operating";

  const socials: { label: string; url?: string }[] = [
    { label: "LinkedIn", url: company.linkedinUrl },
    { label: "Twitter", url: company.twitterUrl },
    { label: "Facebook", url: company.facebookUrl },
    { label: "GitHub", url: company.githubUrl },
    { label: "Instagram", url: company.instagramUrl },
    { label: "Medium", url: company.mediumUrl },
    { label: "Crunchbase", url: company.cbUrl },
  ];
  const socialLinks = socials.filter((s) => s.url);

  return (
    <div>
      <div className="company-page-chrome">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: 20,
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: COMPANY_PROFILE_SECTION_RADIUS,
        }}
      >
        <Logo
          t={t}
          co={{ logo: logoInitial, name: company.name, uuid: company.uuid, logoUrl: company.logoUrl }}
          size={48}
          fallbackTone="accent"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1
              role={isFounderHome ? "button" : undefined}
              tabIndex={isFounderHome ? 0 : undefined}
              onClick={isFounderHome ? () => setTab("profile") : undefined}
              onKeyDown={
                isFounderHome
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setTab("profile");
                      }
                    }
                  : undefined
              }
              style={{
                margin: 0,
                fontFamily: t.sans,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.015em",
                color: t.ink,
                cursor: isFounderHome ? "pointer" : undefined,
              }}
            >
              {company.name}
            </h1>
            {isOperating ? <Chip t={t} tone="ghost">Operating</Chip> : null}
            {company.status && !isOperating ? <Chip t={t} tone="warn">{titleCase(company.status)}</Chip> : null}
            {company.categories && company.categories[0] ? (
              <Chip t={t} tone="ghost">{company.categories[0].name}</Chip>
            ) : null}
            {company.domain ? (
              <a
                href={company.homepageUrl ?? `https://${company.domain}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Chip t={t} tone="accent">{company.domain}</Chip>
              </a>
            ) : null}
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
            }}
          >
            · External company · sourced from fuel-data
          </div>
        </div>
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {isFounderHome ? (
            <ViewProfileButton
              t={t}
              mode={tab === "profile" ? "overview" : "profile"}
              onClick={() => setTab(tab === "profile" ? "overview" : "profile")}
            />
          ) : null}
          {/* Hide on claimed company — `isFounderHome` from primaryCompanyUuid. */}
          {!isFounderHome ? (
            <AddToListButton
              t={t}
              uuid={company.uuid}
              companyName={company.name}
              memberships={watchlistMemberships}
              portfolioManagerEnabled={portfolioManagerEnabled}
            />
          ) : null}
          <AiActionsMenu
            companyUuid={company.uuid}
            companyName={company.name}
            playbooks={availablePlaybooks}
            tourActive={aiActionsTourActive}
            tourHighlightItem={aiActionsTourHighlightItem}
          />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Tabs
          t={t}
          active={tab}
          onChange={(k) => {
            const next = k as TabKey;
            // Top-nav Intelligence exits deep-link focus (same-tab re-click
            // included). Deep-links set ids via setTab + setHighlightIntelIds
            // and skip this path.
            if (shouldClearIntelligenceFocusOnTopNav(next)) {
              setHighlightIntelIds([]);
            }
            setTab(next);
          }}
          tourHighlightKey={tabTourTarget}
          onTourAnchorElChange={setTourTabAnchorEl}
          items={companyPublicNavItems({
            isClaimedCompany: isFounderHome,
            initiativeCount,
            artifactCount: artifactBadgeCount,
            dataRoomCount: dataRoomState.activeCount,
          })}
        />
      </div>
      </div>

      {tour.overviewBuildActive && tab !== "overview" ? <BuildingOverviewStrip /> : null}

      {tour.overviewBuildActive &&
      !tour.tourOpen &&
      (tour.showTourPrompt || tour.showTourPromptSkeleton) ? (
        <TourBuildingBanner />
      ) : null}

      {tour.showTourPrompt && !tour.overviewBuildActive ? (
        <TourPromptBanner
          onStartTour={tour.startTour}
          onDismiss={tour.dismissTourPrompt}
        />
      ) : null}

      {tour.tourOpen ? (
        <GuidedTourOverlay
          step={tour.tourStep}
          total={tour.steps.length}
          title={tour.steps[tour.tourStep]?.title ?? ""}
          description={tour.steps[tour.tourStep]?.description ?? ""}
          target={tour.activeTarget}
          tabAnchorEl={tourTabAnchorEl}
          onNext={tour.nextStep}
          onPrevious={tour.previousStep}
          onSkip={tour.skipTour}
        />
      ) : null}

      {tab === "overview" && isFounderHome ? (
          <div style={{ marginTop: 24 }}>
            <CompanyOverviewPage
              companyUuid={company.uuid}
              companyName={company.name}
              onNavigateTab={(nextTab) => setTab(nextTab as TabKey)}
              initiatives={initiatives}
              advisorPool={advisorPool.map(advisorPickToSummary)}
              availableIntelligence={intelligenceItems}
              signalCatalog={signalCatalog}
              recentObservations={signalObservationItems}
              allowAdvisorLinking={isFounderHome}
            />
          </div>
      ) : null}

      {tab === "profile" || (tab === "overview" && !isFounderHome) ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginTop: 24,
            }}
          >
            <StatCell label="Total Funding" value={fundingTotal ?? "—"} />
            <StatCell label="Funding Rounds" value={company.numFundingRounds ?? "—"} />
            <StatCell
              label="Last Funding"
              value={
                lastFundingMonth ? (
                  <div>
                    {lastFundingMonth}
                    {lastFundingAgo ? (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          fontWeight: 400,
                          color: t.muted,
                        }}
                      >
                        {lastFundingAgo} ago
                      </span>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )
              }
            />
            <StatCell
              label="Founded"
              value={
                founded ? (
                  <div>
                    {founded}
                    {foundedAgo ? (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          fontWeight: 400,
                          color: t.muted,
                        }}
                      >
                        {foundedAgo} old
                      </span>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )
              }
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {company.shortDescription ? (
                <Card title="About">
                  <p
                    style={{
                      margin: 0,
                      fontFamily: t.sans,
                      fontSize: 14,
                      color: t.ink,
                      lineHeight: 1.6,
                    }}
                  >
                    {company.shortDescription}
                  </p>
                </Card>
              ) : null}

              <Card title="Company Details">
                <div>
                  {company.homepageUrl ? (
                    <KeyValue label="Website">
                      <InlineLink href={company.homepageUrl}>{hostForUrl(company.homepageUrl)}</InlineLink>
                    </KeyValue>
                  ) : null}
                  {loc ? <KeyValue label="Headquarters">{loc}</KeyValue> : null}
                  {company.employeeCount && company.employeeCount !== "unknown" ? (
                    <KeyValue label="Employees">{company.employeeCount}</KeyValue>
                  ) : null}
                  {founded ? (
                    <KeyValue label="Founded">
                      {founded}
                      {foundedAgo ? (
                        <span style={{ color: t.muted, marginLeft: 8 }}>· {foundedAgo} old</span>
                      ) : null}
                    </KeyValue>
                  ) : null}
                  {company.categories && company.categories.length > 0 ? (
                    <KeyValue label="Markets">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {company.categories.map((c) => (
                          <Chip key={c.name} t={t} tone="default">{c.name}</Chip>
                        ))}
                      </div>
                    </KeyValue>
                  ) : null}
                  {company.keywords && company.keywords.length > 0 ? (
                    <KeyValue label={`Keywords (${company.keywords.length})`}>
                      <span style={{ color: t.inkSoft }}>
                        {company.keywords.slice(0, 14).join(" · ")}
                      </span>
                      {company.keywords.length > 14 ? (
                        <span style={{ color: t.muted }}> · +{company.keywords.length - 14}</span>
                      ) : null}
                    </KeyValue>
                  ) : null}
                </div>
              </Card>

              <FundingRoundsCard uuid={company.uuid} />

              <NewsPreviewCard uuid={company.uuid} onSeeMore={goToIntelligence} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {isCatalogCompany ? (
                <ProfileTile
                  t={t}
                  company={company}
                  businessModel={catalogBusinessModel ?? null}
                />
              ) : null}

              <Card title="Links" right={socialLinks.length ? `${socialLinks.length}` : undefined}>
                {socialLinks.length === 0 ? (
                  <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                    No public links on record.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {socialLinks.map((s) => (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "8px 0",
                          borderTop: `1px solid ${t.ruleSoft}`,
                          color: t.ink,
                          textDecoration: "none",
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            color: t.muted,
                            width: 82,
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {s.label}
                        </span>
                        <span style={{ color: t.accent, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {hostForUrl(s.url)}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                {company.cikIdentifier ? (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: `1px solid ${t.ruleSoft}`,
                      fontSize: 12,
                      color: t.muted,
                    }}
                  >
                    SEC CIK{" "}
                    <InlineLink
                      href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(
                        company.cikIdentifier,
                      )}`}
                    >
                      {company.cikIdentifier}
                    </InlineLink>
                  </div>
                ) : null}
              </Card>

              <SimilarCompanies uuid={company.uuid} />

              <Card title="Data Sources" right={company.raw?.source === "catalog" ? "ENRICHMENT" : "PUBLIC"}>
                <div style={{ fontFamily: t.sans, fontSize: 12, color: t.inkSoft, lineHeight: 1.6 }}>
                  {company.raw?.source === "catalog" ? (
                    <>
                      {[
                        { key: "website", label: "Website scrape" },
                        { key: "linkedin", label: "LinkedIn" },
                        { key: "crunchbase", label: "Crunchbase" },
                        { key: "techStack", label: "Tech stack" },
                      ].map((row, i) => {
                        const sources = company.raw?.sources as Record<string, unknown> | undefined;
                        const has = Boolean(sources?.[row.key]);
                        return (
                          <div
                            key={row.key}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "6px 0",
                              borderTop: i > 0 ? `1px solid ${t.ruleSoft}` : undefined,
                            }}
                          >
                            <span style={{ color: t.muted }}>{row.label}</span>
                            <span>{has ? "On file" : "—"}</span>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span style={{ color: t.muted }}>OpenSearch</span>
                        <span>organizations</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${t.ruleSoft}` }}>
                        <span style={{ color: t.muted }}>Neptune</span>
                        <span>has_article</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${t.ruleSoft}` }}>
                    <span style={{ color: t.muted }}>UUID</span>
                    <span style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft }}>
                      {company.uuid.slice(0, 8)}…
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Advisors — claimed profile only (F20A-188). */}
          {isFounderHome ? (
            <>
              <div style={{ marginTop: 24 }}>
                <InvolvedAdvisorsCard
                  t={t}
                  companyUuid={company.uuid}
                  initiatives={initiatives}
                  advisorPool={advisors}
                  onGoToInitiatives={() => setTab("initiatives")}
                />
              </div>
              <div style={{ marginTop: 24 }}>
                <AdvisorPoolDisclosure
                  t={t}
                  companyUuid={company.uuid}
                  advisors={advisors}
                  advisorPool={advisorPool}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {tab === "intelligence" ? (
        privateMetrics ? (
          <>
            {benchmarkRefreshing || benchmarkRefreshError ? (
              <BenchmarkRefreshBanner
                t={t}
                refreshing={benchmarkRefreshing}
                error={benchmarkRefreshError}
              />
            ) : null}
            <PrivateMetricsTab
            uuid={company.uuid}
            data={privateMetrics}
            userEmail={userEmail}
            companyName={company.name}
            currentPeriod={currentPeriod ?? privateMetrics.period}
            dataRoom={dataRoomState}
            onDataRoomSnapshot={setDataRoomState}
            onOpenDataRoom={
              isFounderHome ? () => setTab("dataroom") : undefined
            }
            companyIntelligence={intelligenceItems}
            signalCatalog={signalCatalog}
            signalObservations={signalObservationItems}
            creditBalance={credits}
            highlightIntelIds={highlightIntelIds}
            onClearHighlight={() => setHighlightIntelIds([])}
            onFocusIntelligence={(ids) => {
              setTab("intelligence");
              setHighlightIntelIds(ids);
            }}
            onIntelligenceChange={setIntelligenceItems}
            onObservationsChange={setSignalObservationItems}
            onCreditBalanceChange={setCredits}
            onOpenIntelligenceProvenance={setIntelligenceProvenanceId}
            timelineShimmer={benchmarkRefreshing}
          />
          </>
        ) : (
          <EmptyState
            title="Sign in required"
            body="Private metrics live on an account. Sign in to submit a quarterly update or view history."
          />
        )
      ) : null}

      {tab === "research" ? (
        <BriefsTab
          t={t}
          artifacts={artifactItems}
          company={{ uuid: company.uuid, name: company.name }}
          createdBriefSuggestionKeysByArtifact={createdBriefSuggestionKeysByArtifact}
        />
      ) : null}

      {tab === "initiatives" ? (
        <InitiativesTab
          t={t}
          companyUuid={company.uuid}
          initiatives={initiatives}
          advisorPool={advisorPool.map(advisorPickToSummary)}
          recentObservations={signalObservationItems}
          availableIntelligence={intelligenceItems}
          signalCatalog={signalCatalog}
          investorMode={!isFounderHome}
          defaultAssignee={userEmail}
          onOpenIntelligence={(intelligenceIds) => {
            setTab("intelligence");
            setHighlightIntelIds(intelligenceIds);
            setIntelligenceProvenanceId(null);
          }}
          onOpenDataRoom={
            isFounderHome ? () => setTab("dataroom") : undefined
          }
          onOpenProfile={() => setProfileDrawerOpen(true)}
        />
      ) : null}

      {tab === "dataroom" && isFounderHome ? (
        <DataRoomTab
          t={t}
          companyUuid={company.uuid}
          initialSnapshot={dataRoomState}
          creditBalance={credits}
          onCreditBalanceChange={setCredits}
          onSnapshot={setDataRoomState}
          onIntelligenceRefresh={async () => {
            const res = await fetch(`/api/company/${company.uuid}/intelligence`);
            if (!res.ok) return;
            const json = (await res.json()) as { items: CompanyIntelligenceRow[] };
            setIntelligenceItems(json.items);
          }}
          onViewIntelligence={(intelligenceIds) => {
            setTab("intelligence");
            setHighlightIntelIds(intelligenceIds);
            setIntelligenceProvenanceId(null);
          }}
        />
      ) : null}

      <ProvenanceDrawer
        observationId={provenanceId}
        onClose={() => setProvenanceId(null)}
        companyUuid={company.uuid}
      />
      <IntelligenceProvenanceDrawer
        intelligenceId={intelligenceProvenanceId}
        onClose={() => setIntelligenceProvenanceId(null)}
      />
      {profileDrawerOpen ? <OverviewStyleSheet /> : null}
      <DetailAnswersDrawer
        open={profileDrawerOpen}
        companyUuid={company.uuid}
        companyName={company.name}
        initialStep="profile"
        onClose={() => setProfileDrawerOpen(false)}
        onSaved={(result) => {
          invalidateOverviewClientCache(company.uuid);
          if (result?.overview) {
            seedOverviewFormCaches(company.uuid, result.overview);
          }
        }}
      />
    </div>
  );
}

/**
 * Aggregated view of advisors actively helping on this company's initiatives.
 * Derived entirely from initiatives[i].advisors — no new fetch. Each unique
 * advisor appears once with chips pointing at the initiatives they're on.
 * This is the canonical "who's helping" surface per Adam's Apr 24 ask; the
 * flat company-level advisor pool lives below as a roster-maintenance tool.
 */
function InvolvedAdvisorsCard({
  t,
  companyUuid,
  initiatives,
  advisorPool,
  onGoToInitiatives,
}: {
  t: Theme;
  companyUuid: string;
  initiatives: CompanyInitiativeSummary[];
  advisorPool: CompanyAdvisorSummary[];
  onGoToInitiatives: () => void;
}) {
  // Collect per-advisor engagements across initiatives. Same advisor linked
  // on multiple initiatives dedups into one card with N initiative chips.
  const engagements = useMemo(() => {
    const byAdvisor = new Map<
      string,
      {
        advisor: CompanyAdvisorSummary;
        initiatives: Array<{ id: string; name: string; role: string | null }>;
      }
    >();
    const poolById = new Map(advisorPool.map((a) => [a.advisorId, a]));
    for (const init of initiatives) {
      for (const a of init.advisors) {
        const poolEntry = poolById.get(a.advisorId);
        const existing = byAdvisor.get(a.advisorId) ?? {
          advisor: poolEntry ?? {
            advisorId: a.advisorId,
            name: a.name,
            title: a.title,
            company: a.company,
            photoUrl: a.photoUrl,
            expertise: [],
            role: null,
            publicCard: false,
          },
          initiatives: [],
        };
        existing.initiatives.push({
          id: init.id,
          name: init.name,
          role: a.role,
        });
        byAdvisor.set(a.advisorId, existing);
      }
    }
    return Array.from(byAdvisor.values()).sort((a, b) =>
      a.advisor.name.localeCompare(b.advisor.name),
    );
  }, [initiatives, advisorPool]);

  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>
            Advisors on active initiatives
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 2 }}>
            Who&apos;s helping, grouped by person — derived from the initiatives tab.
          </div>
        </div>
        <button
          type="button"
          onClick={onGoToInitiatives}
          style={{
            padding: "6px 12px",
            background: "transparent",
            color: t.inkSoft,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Manage in Initiatives →
        </button>
      </div>

      {engagements.length === 0 ? (
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
          No advisors linked to any initiative yet. Open an initiative to link one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {engagements.map((e) => {
            const initials = e.advisor.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("");
            return (
              <div
                key={e.advisor.advisorId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: t.panelAlt,
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 6,
                }}
              >
                {e.advisor.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={e.advisor.photoUrl}
                    alt={e.advisor.name}
                    referrerPolicy="no-referrer"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: t.panel,
                      border: `1px solid ${t.rule}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: t.mono,
                      fontSize: 11,
                      color: t.muted,
                      flexShrink: 0,
                    }}
                  >
                    {initials || "?"}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
                    {e.advisor.name}
                  </div>
                  {e.advisor.title || e.advisor.company ? (
                    <div style={{ fontFamily: t.sans, fontSize: 11.5, color: t.muted, marginTop: 1 }}>
                      {[e.advisor.title, e.advisor.company].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                  {e.initiatives.map((i) => (
                    <span
                      key={i.id}
                      title={i.role ? `Role: ${i.role}` : undefined}
                      style={{
                        padding: "2px 8px",
                        border: `1px solid ${t.rule}`,
                        borderRadius: 999,
                        fontFamily: t.sans,
                        fontSize: 11,
                        color: t.inkSoft,
                      }}
                    >
                      {i.name}
                      {i.role ? (
                        <span style={{ color: t.mutedSoft }}>
                          {" · "}
                          {i.role}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <input type="hidden" value={companyUuid} />
    </div>
  );
}

/**
 * Collapsed "Advisor pool" disclosure — keeps the legacy link-advisor-to-
 * company affordance around for roster maintenance, but demoted below the
 * canonical Involved Advisors card so nobody mistakes it for the primary
 * surface.
 */
function AdvisorPoolDisclosure({
  t,
  companyUuid,
  advisors,
  advisorPool,
}: {
  t: Theme;
  companyUuid: string;
  advisors: CompanyAdvisorSummary[];
  advisorPool: AdvisorPick[];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <details
      open={expanded}
      onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        padding: "10px 16px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontFamily: t.sans,
          fontSize: 12.5,
          fontWeight: 500,
          color: t.inkSoft,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>Advisor pool</span>
        <span style={{ fontFamily: t.mono, fontSize: 10.5, color: t.mutedSoft }}>
          {advisors.length} linked · roster-maintenance only
        </span>
      </summary>
      <div style={{ marginTop: 12 }}>
        <AdvisorsTab
          t={t}
          companyUuid={companyUuid}
          advisors={advisors}
          advisorPool={advisorPool}
        />
      </div>
    </details>
  );
}

function AdvisorsTab({
  t,
  companyUuid,
  advisors,
  advisorPool,
}: {
  t: Theme;
  companyUuid: string;
  advisors: CompanyAdvisorSummary[];
  advisorPool: AdvisorPick[];
}) {
  const [isPending, startTransition] = useTransition();
  const linkedIds = new Set(advisors.map((a) => a.advisorId));
  const available = advisorPool.filter((p) => !linkedIds.has(p.id));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
      <div>
        {advisors.length === 0 ? (
          <div
            style={{
              padding: 28,
              textAlign: "center",
              background: t.panel,
              border: `1px solid ${t.rule}`,
              fontFamily: t.sans,
              fontSize: 13,
              color: t.muted,
            }}
          >
            No advisors linked yet. Use the picker on the right to connect one of your curated advisors.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {advisors.map((a) => {
              const initials = a.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("");
              return (
                <div
                  key={a.advisorId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 14,
                    background: t.panel,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 6,
                  }}
                >
                  {a.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.photoUrl}
                      alt={a.name}
                      referrerPolicy="no-referrer"
                      style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: t.panelAlt,
                        border: `1px solid ${t.rule}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: t.sans,
                        fontSize: 14,
                        fontWeight: 700,
                        color: t.muted,
                        flexShrink: 0,
                      }}
                    >
                      {initials || "·"}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>
                      <Link
                        href={`/advisors/${a.advisorId}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {a.name}
                      </Link>
                    </div>
                    <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                      {a.title ?? ""}{a.company ? ` · ${a.company}` : ""}
                      {a.role ? ` · Role: ${a.role}` : ""}
                    </div>
                    {a.expertise && a.expertise.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {a.expertise.slice(0, 4).map((tag) => (
                          <Chip key={tag} t={t} tone="ghost">{tag}</Chip>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <form action={(fd) => startTransition(() => unlinkAdvisorFromCompanyAction(fd))}>
                    <input type="hidden" name="advisorId" value={a.advisorId} />
                    <input type="hidden" name="companyUuid" value={companyUuid} />
                    <button
                      type="submit"
                      disabled={isPending}
                      style={{
                        padding: "6px 10px",
                        background: "transparent",
                        color: t.muted,
                        border: `1px solid ${t.rule}`,
                        borderRadius: 6,
                        fontFamily: t.sans,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Unlink
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 16 }}>
        <div style={{ fontFamily: t.sans, fontSize: 12, fontWeight: 600, color: t.ink, marginBottom: 10 }}>
          Link an advisor
        </div>
        {available.length === 0 ? (
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, lineHeight: 1.6 }}>
            Every curated advisor is already linked. <Link href="/advisors" style={{ color: t.accent }}>Add more advisors</Link>.
          </div>
        ) : (
          <form action={(fd) => startTransition(() => linkAdvisorToCompanyAction(fd))}>
            <input type="hidden" name="companyUuid" value={companyUuid} />
            <select
              name="advisorId"
              required
              defaultValue=""
              style={{
                width: "100%",
                padding: "8px 10px",
                background: t.panelAlt,
                color: t.ink,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <option value="" disabled>
                Pick from your advisors…
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.title ? ` — ${p.title}` : ""}
                  {p.company ? ` · ${p.company}` : ""}
                </option>
              ))}
            </select>
            <input
              name="role"
              placeholder="Role (e.g. Board Advisor)"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: t.panelAlt,
                color: t.ink,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 13,
                marginBottom: 8,
              }}
            />
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: "8px 14px",
                background: t.ink,
                color: t.bg,
                border: `1px solid ${t.ink}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Link advisor
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


function ViewProfileButton({
  t,
  mode,
  onClick,
}: {
  t: Theme;
  /** Where the button navigates — label flips to match. */
  mode: "profile" | "overview";
  onClick: () => void;
}) {
  const label = mode === "profile" ? "View Profile" : "View Overview";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        alignItems: "center",
        background: accentChipBg(t),
        border: `1px solid ${accentChipBorder(t)}`,
        borderRadius: 8,
        color: accentChipFg(t),
        cursor: "pointer",
        display: "inline-flex",
        fontFamily: t.sans,
        fontSize: 12.5,
        fontWeight: 650,
        gap: 7,
        letterSpacing: "-0.01em",
        padding: "7px 12px",
      }}
    >
      <span
        aria-hidden
        style={{
          background: t.accent,
          borderRadius: "50%",
          flexShrink: 0,
          height: 7,
          width: 7,
        }}
      />
      {label}
    </button>
  );
}

function AddToListButton({
  t,
  uuid,
  companyName,
  memberships,
  portfolioManagerEnabled,
}: {
  t: Theme;
  uuid: string;
  companyName: string;
  memberships: WatchlistMembershipItem[];
  portfolioManagerEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Match left-nav Portfolio gate: hide portfolio lists when PM is off.
  const visibleMemberships = portfolioManagerEnabled
    ? memberships
    : memberships.filter((m) => m.kind !== "portfolio");
  const addedCount = visibleMemberships.filter((m) => m.contains).length;
  const portfolios = visibleMemberships.filter((m) => m.kind === "portfolio");
  const watchlistsArr = visibleMemberships.filter((m) => m.kind === "watchlist");
  const hasAny = visibleMemberships.length > 0;

  const toggle = (m: WatchlistMembershipItem) => {
    const fd = new FormData();
    fd.set("watchlistId", m.id);
    fd.set("companyUuid", uuid);
    fd.set("companyName", companyName);
    fd.set("intent", m.contains ? "remove" : "add");
    start(() => {
      toggleWatchlistMembershipAction(fd);
    });
  };

  const buttonLabel = addedCount > 0
    ? `In ${addedCount} list${addedCount === 1 ? "" : "s"}`
    : "Add to list";

  const sectionHeaderStyle = (withTopBorder: boolean): CSSProperties => ({
    padding: "10px 14px",
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: t.muted,
    borderBottom: `1px solid ${t.ruleSoft}`,
    borderTop: withTopBorder ? `1px solid ${t.ruleSoft}` : "none",
  });

  const renderRow = (m: WatchlistMembershipItem) => (
    <button
      key={m.id}
      onClick={() => toggle(m)}
      disabled={pending}
      style={{
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: pending ? "wait" : "pointer",
        color: t.ink,
        fontFamily: t.sans,
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = t.panelAlt;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1.5px solid ${m.contains ? t.accent : t.rule}`,
          background: m.contains ? t.accent : "transparent",
          color: "#0B1116",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {m.contains ? "✓" : ""}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {m.name}
      </span>
      <span style={{ fontSize: 10, color: t.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {m.scope}
      </span>
    </button>
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={addedCount > 0 ? "Manage lists" : "Add to list"}
        style={{
          padding: "9px 12px",
          borderRadius: 8,
          border: `1px solid ${addedCount > 0 ? t.accent : t.rule}`,
          fontFamily: t.sans,
          fontSize: 12.5,
          fontWeight: 600,
          color: addedCount > 0 ? t.accent : t.ink,
          background: addedCount > 0 ? `${t.accent}14` : t.panel,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "transform 120ms ease, background 200ms ease",
        }}
      >
        <span style={{ fontSize: 13 }}>{addedCount > 0 ? "✓" : "+"}</span>
        {buttonLabel}
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 50,
            width: 300,
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
            fontFamily: t.sans,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {hasAny ? (
            <>
              {portfolios.length > 0 ? (
                <>
                  <div style={sectionHeaderStyle(false)}>Portfolios</div>
                  {portfolios.map(renderRow)}
                </>
              ) : null}
              {watchlistsArr.length > 0 ? (
                <>
                  <div style={sectionHeaderStyle(portfolios.length > 0)}>Watchlists</div>
                  {watchlistsArr.map(renderRow)}
                </>
              ) : null}
            </>
          ) : (
            <>
              <div style={sectionHeaderStyle(false)}>Lists</div>
              <div style={{ padding: "14px 14px 16px", fontSize: 12.5, color: t.muted, lineHeight: 1.5 }}>
                No lists yet. Create one in{" "}
                {portfolioManagerEnabled ? (
                  <>
                    <Link href="/portfolio" style={{ color: t.accent, textDecoration: "none", fontWeight: 600 }}>
                      Portfolios
                    </Link>{" "}
                    or{" "}
                  </>
                ) : null}
                <Link href="/watchlists" style={{ color: t.accent, textDecoration: "none", fontWeight: 600 }}>
                  Watchlists
                </Link>
                .
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "intelligence_brief":
      return "Intelligence Brief";
    case "diligence_report":
      return "Diligence Report";
    case "meeting_summary":
      return "Meeting Summary";
    case "comparison":
      return "Comparison";
    case "playbook_run":
      return "Playbook Run";
    default:
      return kind;
  }
}

/**
 * Derive a human-readable chip label for an artifact card. Playbook runs are
 * titled "<Playbook Name> — <Subject> — <Date>" (post-Phase-1a), so pulling
 * the first segment gives us the actual playbook name ("Value Creation
 * Report" rather than the generic "Playbook Run"). Legacy rows without that
 * format fall back to the kind label.
 */
function artifactBadgeLabel(a: { kind: string; title: string }): string {
  if (a.kind !== "playbook_run") return kindLabel(a.kind);
  const idx = a.title.indexOf(" — ");
  if (idx <= 0) return kindLabel(a.kind);
  const candidate = a.title.slice(0, idx).trim();
  return candidate.length > 0 ? candidate : kindLabel(a.kind);
}

function MarkdownBody({ t, content }: { t: Theme; content: string }) {
  return (
    <>
      <style jsx>{`
        .artifact-md { font-family: ${t.sans}; font-size: 13.5px; line-height: 1.6; color: ${t.ink}; }
        .artifact-md > :global(*:first-child) { margin-top: 0 !important; }
        .artifact-md > :global(*:last-child) { margin-bottom: 0 !important; }
        .artifact-md :global(p) { margin: 0 0 10px; }
        .artifact-md :global(h1),
        .artifact-md :global(h2),
        .artifact-md :global(h3),
        .artifact-md :global(h4) {
          font-family: ${t.sans};
          letter-spacing: -0.01em;
          margin: 16px 0 6px;
          font-weight: 600;
          color: ${t.ink};
        }
        .artifact-md :global(h1) { font-size: 17px; }
        .artifact-md :global(h2) { font-size: 15px; }
        .artifact-md :global(h3) { font-size: 13px; color: ${t.accent}; text-transform: uppercase; letter-spacing: 0.04em; }
        .artifact-md :global(ul),
        .artifact-md :global(ol) { margin: 0 0 10px; padding-left: 18px; }
        .artifact-md :global(li) { margin: 2px 0; }
        .artifact-md :global(a) { color: ${t.accent}; text-decoration: none; border-bottom: 1px solid ${t.accent}44; }
        .artifact-md :global(a:hover) { border-bottom-color: ${t.accent}; }
        .artifact-md :global(code) { font-family: ${t.mono}; font-size: 12px; background: ${t.panelAlt}; padding: 1px 5px; border-radius: 4px; }
        .artifact-md :global(blockquote) { margin: 10px 0; padding: 4px 12px; border-left: 3px solid ${t.accent}; color: ${t.inkSoft}; font-style: italic; }
        .artifact-md :global(hr) { border: none; border-top: 1px solid ${t.ruleSoft}; margin: 14px 0; }
        .artifact-md :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 10px 0;
          font-size: 12.5px;
        }
        .artifact-md :global(th),
        .artifact-md :global(td) {
          border: 1px solid ${t.ruleSoft};
          padding: 6px 10px;
          text-align: left;
          vertical-align: top;
        }
        .artifact-md :global(th) { background: ${t.panelAlt}; font-weight: 600; }
      `}</style>
      <div className="artifact-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </>
  );
}

function ResearchArtifactBody({
  t,
  artifact,
  companyUuid,
  createdSuggestionKeys = [],
}: {
  t: Theme;
  artifact: ArtifactSummary;
  companyUuid: string;
  createdSuggestionKeys?: string[];
}) {
  const { body, suggestions } = useMemo(
    () => splitBriefSuggestions(artifact.content),
    [artifact.content],
  );
  return (
    <>
      <MarkdownBody t={t} content={body} />
      <BriefSuggestedInitiatives
        t={t}
        suggestions={suggestions}
        companyUuid={companyUuid}
        sourceArtifactId={artifact.id}
        createdSuggestionKeys={createdSuggestionKeys}
      />
    </>
  );
}

function BriefsTab({
  t,
  artifacts,
  company,
  createdBriefSuggestionKeysByArtifact = {},
}: {
  t: Theme;
  artifacts: ArtifactSummary[];
  company: { uuid: string; name: string };
  createdBriefSuggestionKeysByArtifact?: Record<string, string[]>;
}) {
  const [openId, setOpenId] = useState<string | null>(
    artifacts[0]?.id ?? null,
  );
  if (artifacts.length === 0) {
    return (
      <EmptyState
        title="No research yet"
        body={`Click "Generate brief" at the top of the page to produce a signal-driven briefing. Playbook runs, diligence reports, and other AI research artifacts also land here — they're account-wide and visible to every member.`}
      />
    );
  }
  return (
    <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
      {artifacts.map((a) => {
        const open = openId === a.id;
        return (
          <div
            key={a.id}
            style={{
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                marginBottom: open ? 12 : 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                  <Chip t={t} tone="accent">{artifactBadgeLabel(a)}</Chip>
                  <span style={{ fontFamily: t.sans, fontSize: 11.5, color: t.muted }}>
                    {a.authorEmail} · {formatDate(a.createdAt)}
                  </span>
                </div>
                <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>
                  {a.title}
                </div>
              </div>
              <div style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
                <Link
                  href={`/artifacts/${a.id}`}
                  target="_blank"
                  rel="noopener"
                  title="Open full page — print or save as PDF"
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    color: t.muted,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 6,
                    fontFamily: t.sans,
                    fontSize: 11,
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  Open ↗
                </Link>
                <button
                  onClick={() => setOpenId(open ? null : a.id)}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    color: t.muted,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 6,
                    fontFamily: t.sans,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {open ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>
            {open ? (
              <ResearchArtifactBody
                t={t}
                artifact={a}
                companyUuid={company.uuid}
                createdSuggestionKeys={
                  createdBriefSuggestionKeysByArtifact[a.id] ?? []
                }
              />
            ) : null}
          </div>
        );
      })}
      <div style={{ fontFamily: t.sans, fontSize: 11.5, color: t.muted, paddingTop: 4 }}>
        Subject: <Link href={`/company/${company.uuid}`} style={{ color: t.accent }}>{company.name}</Link>
      </div>
    </div>
  );
}

// --- Private Metrics / Quarterly Update ---

interface NumericFieldDef {
  name: keyof PortfolioUpdateSummary;
  label: string;
  metricId: string; // matches benchmark metric id
  unit: "usd" | "pct" | "x" | "months" | "count";
  step?: string;
  placeholder?: string;
  hint?: string;
}

const NUMERIC_GROUPS: Array<{ title: string; fields: NumericFieldDef[] }> = [
  {
    title: "Scale",
    fields: [
      { name: "fteCount", label: "Headcount (FTE)", metricId: "fte_count", unit: "count", step: "1" },
      { name: "paidCustomerCount", label: "Paid customers", metricId: "paid_customer_count", unit: "count", step: "1" },
      { name: "arrUsd", label: "ARR", metricId: "arr_usd", unit: "usd", placeholder: "e.g. 3500000" },
    ],
  },
  {
    title: "Growth",
    fields: [
      { name: "arrGrowthYoyPct", label: "ARR growth YoY", metricId: "arr_growth_yoy_pct", unit: "pct", step: "0.1", placeholder: "%" },
    ],
  },
  {
    title: "Retention",
    fields: [
      { name: "nrrPct", label: "Net revenue retention", metricId: "nrr_pct", unit: "pct", step: "0.1" },
      { name: "logoRetentionPct", label: "Logo retention", metricId: "logo_retention_pct", unit: "pct", step: "0.1" },
    ],
  },
  {
    title: "Efficiency",
    fields: [
      { name: "grossMarginPct", label: "Gross margin", metricId: "gross_margin_pct", unit: "pct", step: "0.1" },
      { name: "cacPaybackMonths", label: "CAC payback", metricId: "cac_payback_months", unit: "months", step: "0.1" },
      { name: "burnMultiple", label: "Burn multiple", metricId: "burn_multiple", unit: "x", step: "0.01" },
      { name: "ruleOf40Pct", label: "Rule of 40", metricId: "rule_of_40_pct", unit: "pct", step: "0.1" },
    ],
  },
  {
    title: "Capital",
    fields: [
      { name: "cashOnHandUsd", label: "Cash on hand", metricId: "cash_on_hand_usd", unit: "usd" },
      { name: "monthlyBurnUsd", label: "Monthly burn", metricId: "monthly_burn_usd", unit: "usd" },
    ],
  },
];

function fmtMetricValue(v: number | null, unit: NumericFieldDef["unit"]): string {
  if (v == null) return "—";
  if (unit === "usd") {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`;
    return `$${Math.round(v).toLocaleString()}`;
  }
  if (unit === "pct") return `${v.toFixed(0)}%`;
  if (unit === "months") return `${v.toFixed(1)}mo`;
  if (unit === "x") return `${v.toFixed(2)}x`;
  return Math.round(v).toLocaleString();
}

function percentilePosition(
  value: number,
  bench: { p25: number | null; p50: number | null; p75: number | null; p90: number | null; invertedGood: boolean },
): number | null {
  const { p25, p50, p75, p90, invertedGood } = bench;
  if (p25 == null || p50 == null || p75 == null || p90 == null) return null;
  const lo = Math.min(p25, p90);
  const hi = Math.max(p25, p90);
  if (hi === lo) return 50;
  // Clamp value into [lo, hi] then linearly map. For inverted metrics, flip so "low = good = right".
  const clamped = Math.max(lo, Math.min(hi, value));
  const linear = ((clamped - lo) / (hi - lo)) * 100;
  return invertedGood ? 100 - linear : linear;
}

function BenchmarkBar({
  t,
  bench,
  value,
  unit,
}: {
  t: Theme;
  bench: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
    invertedGood: boolean;
    unit: string | null;
  };
  value: number | null;
  unit: NumericFieldDef["unit"];
}) {
  const hasBench = bench.p25 != null && bench.p50 != null && bench.p75 != null && bench.p90 != null;
  const pos = value != null && hasBench ? percentilePosition(value, bench) : null;
  return (
    <div style={{ marginTop: 6 }}>
      {hasBench ? (
        <div style={{ position: "relative", height: 14 }}>
          <div
            style={{
              position: "absolute",
              top: 5,
              left: 0,
              right: 0,
              height: 4,
              background: t.panelAlt,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "25%",
              right: "10%",
              top: 5,
              height: 4,
              background: `linear-gradient(90deg, ${t.accent}33 0%, ${t.accent}88 50%, ${t.accent} 100%)`,
              borderRadius: 2,
            }}
          />
          {pos != null ? (
            <div
              style={{
                position: "absolute",
                left: `calc(${pos}% - 5px)`,
                top: 1,
                width: 10,
                height: 12,
                background: t.ink,
                border: `2px solid ${t.bg}`,
                borderRadius: 3,
              }}
              title={`your value: ${fmtMetricValue(value, unit)}`}
            />
          ) : null}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontFamily: t.mono,
          fontSize: 9.5,
          color: t.muted,
        }}
        title="Cohort distribution markers: bottom 25%, median, top 25%, top 10%"
      >
        <span>Bot 25% {fmtMetricValue(bench.p25, unit)}</span>
        <span>Median {fmtMetricValue(bench.p50, unit)}</span>
        <span>Top 25% {fmtMetricValue(bench.p75, unit)}</span>
        <span>Top 10% {fmtMetricValue(bench.p90, unit)}</span>
      </div>
    </div>
  );
}

function cohortLabel(c: PrivateMetricsInput["benchmarks"]["allCohorts"][number]): string {
  const d = c.dimensions;
  const parts: string[] = [];
  const top = d.vertical || d.businessModel;
  if (top) parts.push(prettify(top));
  if (d.stage) parts.push(prettify(d.stage));
  if (d.geo) parts.push(d.geo.toUpperCase());
  return parts.join(" · ") || c.cohortKey;
}

function prettify(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bB2b\b/i, "B2B")
    .replace(/\bSeries A\b/i, "Series A")
    .replace(/\bSeries B\b/i, "Series B");
}

/**
 * Bucket a value into a cohort percentile band and return a human-readable
 * label (e.g. "Top 10%", "Above median", "Bottom 25%"). For inverted-good
 * metrics like monthly burn or CAC payback, the bands flip — a burn value
 * LOWER than p25 is what "Top 10%" means. This is why we use the comparator
 * closure rather than numeric thresholds directly.
 *
 * The old output ("p95 / p85 / p62 / p37 / p15") was technically sound but
 * confused non-stats readers — Adam's ask from the Apr 24 review.
 */
function percentileLabel(
  value: number,
  bench: { p25: number | null; p50: number | null; p75: number | null; p90: number | null; invertedGood: boolean },
): string | null {
  const { p25, p50, p75, p90, invertedGood } = bench;
  if (p25 == null || p50 == null || p75 == null || p90 == null) return null;
  const cmp = invertedGood
    ? (a: number, b: number) => a <= b
    : (a: number, b: number) => a >= b;
  if (cmp(value, p90)) return "Top 10%";
  if (cmp(value, p75)) return "Top 25%";
  if (cmp(value, p50)) return "Above median";
  if (cmp(value, p25)) return "Below median";
  return "Bottom 25%";
}

/**
 * Flag values that sit far outside the cohort distribution — worth a manual
 * "is this right?" check. Uses the p25→p90 span as a rough σ. Also flags any
 * strictly negative percentage metric (NRR/retention/margin can't be <0).
 */
function isOutlier(value: number, bench: {
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
}, unit: NumericFieldDef["unit"]): boolean {
  if (unit === "pct" && value < 0) return true;
  if (unit === "pct" && value > 400) return true;
  const { p25, p50, p90 } = bench;
  if (p25 == null || p50 == null || p90 == null) return false;
  const span = Math.max(Math.abs(p90 - p25), 1);
  const z = Math.abs(value - p50) / span;
  return z > 4;
}

function Sparkline({
  t,
  values,
  width = 64,
  height = 18,
}: {
  t: Theme;
  values: Array<number | null>;
  width?: number;
  height?: number;
}) {
  const pts = values.filter((v): v is number => typeof v === "number");
  if (pts.length < 2) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const step = width / (pts.length - 1);
  const path = pts
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const lastY = height - ((pts[pts.length - 1] - min) / range) * height;
  return (
    <svg width={width} height={height} style={{ display: "block", flexShrink: 0 }}>
      <path d={path} fill="none" stroke={t.accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="2" fill={t.accent} />
    </svg>
  );
}

function BenchmarkRefreshBanner({
  t,
  refreshing,
  error,
}: {
  t: Theme;
  refreshing: boolean;
  error: string | null;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: 16,
        marginBottom: 4,
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid ${error ? t.warn : t.accent}55`,
        background: error ? `${t.warn}14` : t.accentTint,
        color: error ? t.warn : t.inkSoft,
        fontFamily: t.sans,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {error
        ? error
        : refreshing
          ? "Saving your benchmark and refreshing intelligence…"
          : null}
    </div>
  );
}

/**
 * After playbook "Save benchmark", we land here with ?benchmarkRefreshing=1
 * while persist finishes in the background. Do NOT poll /overview here —
 * that API is heavy and the AI regen can take a minute; intelligence should
 * paint as soon as the save ack lands.
 */
function useBenchmarkRefreshOverlay(
  companyUuid: string,
  onIntelligenceRefresh: (items: CompanyIntelligenceRow[]) => void,
): { benchmarkRefreshing: boolean; benchmarkRefreshError: string | null } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onRefreshRef = useRef(onIntelligenceRefresh);
  onRefreshRef.current = onIntelligenceRefresh;
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = false;
  }, [companyUuid]);

  useEffect(() => {
    const fromUrl = searchParams.get(BENCHMARK_REFRESH_PARAM) === "1";
    const state = readBenchmarkRefreshState(companyUuid);
    if (!fromUrl && !state) {
      setRefreshing(false);
      setError(null);
      return;
    }
    // One-shot — stripping the URL param must not restart (or cancel) the wait loop.
    if (startedRef.current) return;
    startedRef.current = true;

    setRefreshing(true);
    setError(null);

    if (fromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(BENCHMARK_REFRESH_PARAM);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }

    let cancelled = false;
    const startedAt = Date.now();
    const maxMs = 90_000;
    const pollMs = 400;

    const finishOk = async () => {
      try {
        const res = await fetch(`/api/company/${companyUuid}/intelligence`);
        if (res.ok) {
          const json = (await res.json()) as { items: CompanyIntelligenceRow[] };
          if (!cancelled) onRefreshRef.current(json.items ?? []);
        }
      } catch {
        // Keep existing items if refresh fails.
      }
      if (!cancelled) {
        setRefreshing(false);
        clearBenchmarkRefresh(companyUuid);
      }
    };

    const tick = async () => {
      while (!cancelled) {
        const flag = readBenchmarkRefreshState(companyUuid);
        if (flag === "error") {
          setError("Could not save benchmark. Please try again from the playbook.");
          setRefreshing(false);
          clearBenchmarkRefresh(companyUuid);
          return;
        }
        // Save ack only — overview AI can keep running in the background.
        if (flag === "saved") {
          await finishOk();
          return;
        }
        if (Date.now() - startedAt > maxMs) {
          await finishOk();
          return;
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }
    };

    void tick();
    return () => {
      cancelled = true;
      // Allow restart after Strict Mode remount / real unmount.
      startedRef.current = false;
      setRefreshing(false);
    };
    // Omit searchParams: replace() would re-fire and cancel the in-flight wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot refresh gate
  }, [companyUuid, pathname, router]);
  return { benchmarkRefreshing: refreshing, benchmarkRefreshError: error };
}

function PrivateMetricsTab({
  uuid,
  data,
  userEmail,
  companyName,
  currentPeriod,
  dataRoom = { slots: [], activeCount: 0, sourcesTotal: 0, feedAttachments: [] },
  onDataRoomSnapshot,
  onOpenDataRoom,
  companyIntelligence = [],
  signalCatalog = [],
  signalObservations = [],
  creditBalance = 0,
  highlightIntelIds = [],
  onClearHighlight,
  onFocusIntelligence,
  onIntelligenceChange,
  onObservationsChange,
  onCreditBalanceChange,
  onOpenIntelligenceProvenance,
  timelineShimmer = false,
}: {
  uuid: string;
  data: PrivateMetricsInput;
  userEmail?: string;
  companyName: string;
  currentPeriod?: string;
  dataRoom?: DataRoomSnapshot;
  onDataRoomSnapshot?: (snapshot: DataRoomSnapshot) => void;
  onOpenDataRoom?: () => void;
  companyIntelligence?: CompanyIntelligenceRow[];
  signalCatalog?: SignalCatalogEntry[];
  signalObservations?: CompanySignalObservation[];
  creditBalance?: number;
  highlightIntelIds?: string[];
  onClearHighlight?: () => void;
  onFocusIntelligence?: (ids: string[], label: string) => void;
  onIntelligenceChange?: (items: CompanyIntelligenceRow[]) => void;
  onObservationsChange?: (observations: CompanySignalObservation[]) => void;
  onCreditBalanceChange?: (balance: number) => void;
  onOpenIntelligenceProvenance?: (id: string) => void;
  timelineShimmer?: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);
  // If there's no current-period submission yet and no history, start on the
  // overview screen; otherwise also start there so users see their latest +
  // history before jumping into the form.
  const [mode, setMode] = useState<"overview" | "editing">("overview");

  const benchByMetric = new Map(data.benchmarks.rows.map((r) => [r.metric, r]));
  const current = data.current;
  const latest = current ?? data.history[0] ?? null;
  const hasAnyData = latest != null;

  const rawVal = (k: NumericFieldDef["name"]): number | null => {
    const v = current?.[k];
    return typeof v === "number" ? v : null;
  };
  const rawStr = (k: keyof PortfolioUpdateSummary): string => {
    const v = current?.[k];
    return typeof v === "string" && v ? v : "";
  };

  const cohortChip = data.benchmarks.cohortKey ? (
    <Chip t={t} tone="ghost">cohort · {data.benchmarks.cohortKey}</Chip>
  ) : null;

  const handleDataRoomSnapshot = async (snapshot: DataRoomSnapshot) => {
    onDataRoomSnapshot?.(snapshot);
    try {
      const res = await fetch(`/api/company/${uuid}/intelligence`);
      if (res.ok) {
        const json = (await res.json()) as { items: CompanyIntelligenceRow[] };
        onIntelligenceChange?.(json.items);
      }
    } catch {
      /* non-fatal refresh */
    }
  };

  if (mode === "overview") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <IntelligencePage
          t={t}
          companyUuid={uuid}
          signalCatalog={signalCatalog}
          observations={signalObservations}
          companyIntelligence={companyIntelligence}
          currentPeriod={currentPeriod ?? data.period}
          dataRoomSlots={dataRoom.slots}
          initialSourcesTotal={dataRoom.sourcesTotal}
          creditBalance={creditBalance}
          highlightIds={highlightIntelIds}
          onClearHighlight={onClearHighlight}
          onFocusIntelligence={(ids, label) => onFocusIntelligence?.(ids, label)}
          onIntelligenceChange={onIntelligenceChange}
          onObservationsChange={onObservationsChange}
          onCreditBalanceChange={onCreditBalanceChange}
          onDataRoomSnapshot={handleDataRoomSnapshot}
          onUpdateBenchmark={() => setBenchmarkOpen(true)}
          timelineShimmer={timelineShimmer}
        />

        {hasAnyData && data.benchmarks.allCohorts.length > 0 ? (
          <div style={{ fontFamily: t.sans, fontSize: 11, color: t.mutedSoft, textAlign: "right" }}>
            Overlay uses{" "}
            <span style={{ color: t.muted }}>{data.benchmarks.cohortKey ?? "(no cohort resolved)"}</span>.{" "}
            Explore all cohorts on <Link href="/benchmarks" style={{ color: t.accent }}>Benchmarks</Link>.
          </div>
        ) : null}

        <OverviewStyleSheet />
        <BenchmarkEditDrawer
          open={benchmarkOpen}
          companyUuid={uuid}
          companyName={companyName}
          includeOverview={false}
          onClose={() => setBenchmarkOpen(false)}
          onSaveStart={() => {
            markBenchmarkRefreshPending(uuid);
            setBenchmarkOpen(false);
          }}
          onSaved={async () => {
            markBenchmarkRefreshSaved(uuid);
            try {
              const res = await fetch(`/api/company/${uuid}/intelligence`);
              if (res.ok) {
                const json = (await res.json()) as { items: CompanyIntelligenceRow[] };
                onIntelligenceChange?.(json.items);
              }
            } catch {
              /* non-fatal refresh */
            }
            router.refresh();
          }}
          onSaveError={() => {
            markBenchmarkRefreshError(uuid);
          }}
        />
      </div>
    );
  }

  // mode === "editing"
  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          padding: "12px 16px",
        }}
      >
        <div>
          <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
            Log private data · {data.period.toUpperCase()}
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 11.5, color: t.muted, marginTop: 3 }}>
            Fill in what you know about {companyName}. All fields are optional — save a draft as
            you learn more from calls, board decks, or HubSpot.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {cohortChip}
          <button
            onClick={() => setMode("overview")}
            style={{
              padding: "6px 12px",
              background: "transparent",
              color: t.inkSoft,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      <form
        action={(fd) => {
          fd.set("uuid", uuid);
          fd.set("period", data.period);
          startTransition(async () => {
            await saveUpdateAction(fd);
            setSavedAt(new Date());
          });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {NUMERIC_GROUPS.map((g) => (
          <div
            key={g.title}
            style={{
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 600,
                color: t.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              {g.title}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
                gap: 16,
              }}
            >
              {g.fields.map((f) => {
                const val = rawVal(f.name);
                const bench = benchByMetric.get(f.metricId);
                return (
                  <div key={f.name}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: t.sans,
                        fontSize: 12,
                        fontWeight: 500,
                        color: t.inkSoft,
                        marginBottom: 4,
                      }}
                    >
                      {f.label}
                      <span style={{ color: t.mutedSoft, marginLeft: 6, fontWeight: 400 }}>
                        {f.unit === "usd" ? "USD" : f.unit === "pct" ? "%" : f.unit === "months" ? "months" : f.unit === "x" ? "multiple" : ""}
                      </span>
                    </label>
                    <input
                      type="number"
                      name={f.name as string}
                      defaultValue={val ?? ""}
                      step={f.step ?? "any"}
                      placeholder={f.placeholder ?? ""}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: t.panelAlt,
                        color: t.ink,
                        border: `1px solid ${t.rule}`,
                        borderRadius: 6,
                        fontFamily: t.sans,
                        fontSize: 13,
                        fontFeatureSettings: '"tnum" 1',
                      }}
                    />
                    {bench ? (
                      <BenchmarkBar t={t} bench={bench} value={val} unit={f.unit} />
                    ) : (
                      <div style={{ marginTop: 6, fontFamily: t.mono, fontSize: 10, color: t.mutedSoft }}>
                        no cohort data
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              fontWeight: 600,
              color: t.muted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Narrative
          </div>
          {(
            [
              ["notableCustomers", "Notable customer wins", "e.g. Closed Salesforce ACV $240k in Q2 for the new workflow module"],
              ["notableHires", "Notable hires", "e.g. VP Eng (ex-Datadog) joined March 3 after 4-month search"],
              ["otherUpdates", "Other updates worth surfacing", "Product launches, partnerships, press, etc."],
              ["challenges", "Biggest challenges", "Where is the team stuck? Where does York help most?"],
            ] as Array<[keyof PortfolioUpdateSummary, string, string]>
          ).map(([key, label, placeholder]) => (
            <div key={key}>
              <label
                style={{
                  display: "block",
                  fontFamily: t.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.inkSoft,
                  marginBottom: 4,
                }}
              >
                {label}
              </label>
              <textarea
                name={key as string}
                defaultValue={rawStr(key)}
                rows={3}
                placeholder={placeholder}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: t.panelAlt,
                  color: t.ink,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 6,
                  fontFamily: t.sans,
                  fontSize: 13,
                  lineHeight: 1.5,
                  resize: "vertical",
                }}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              fontWeight: 600,
              color: t.muted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Vendor relationships
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
              gap: 12,
            }}
          >
            {(
              [
                ["bankingPartner", "Banking"],
                ["legalCounsel", "Legal counsel"],
                ["cloudProvider", "Cloud provider"],
                ["capTablePlatform", "Cap table"],
                ["doInsuranceProvider", "D&O insurance"],
                ["crmPlatform", "CRM"],
              ] as Array<[keyof PortfolioUpdateSummary, string]>
            ).map(([key, label]) => (
              <div key={key}>
                <label
                  style={{
                    display: "block",
                    fontFamily: t.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    color: t.inkSoft,
                    marginBottom: 4,
                  }}
                >
                  {label}
                </label>
                <input
                  type="text"
                  name={key as string}
                  defaultValue={rawStr(key)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: t.panelAlt,
                    color: t.ink,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 6,
                    fontFamily: t.sans,
                    fontSize: 13,
                  }}
                />
              </div>
            ))}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              fontFamily: t.sans,
              fontSize: 13,
              color: t.ink,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="openToInvestorIntros"
              defaultChecked={!!current?.openToInvestorIntros}
              style={{ accentColor: t.accent }}
            />
            Open to investor intros this quarter
          </label>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "flex-end",
            fontFamily: t.sans,
            fontSize: 12,
            color: t.muted,
          }}
        >
          {savedAt ? <span>Saved {savedAt.toLocaleTimeString()}</span> : null}
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={pending}
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: t.inkSoft,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            Save draft
          </button>
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
            style={{
              padding: "8px 14px",
              background: t.ink,
              color: t.bg,
              border: `1px solid ${t.ink}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            Submit for {data.period.toUpperCase()}
          </button>
        </div>
        {userEmail ? (
          <div style={{ fontFamily: t.sans, fontSize: 11, color: t.mutedSoft, textAlign: "right" }}>
            Submitting as {userEmail}
          </div>
        ) : null}
      </form>

    </div>
  );
}
