"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  onboardOptionFromManualDomain,
  type OnboardCompanyOption,
} from "@/lib/onboard/map-company-hit";
import {
  INVESTOR_PATH_MODELS,
  normalizeUiBusinessModel,
  onboardPathKind,
  resolveUiBusinessModel,
} from "@/lib/onboard/resolve-ui-business-model";
import { normalizeManualCompanyDomain } from "@/lib/onboard/company-domain";
import {
  ONBOARD_CANT_FIND_COMPANY_LABEL,
  ONBOARD_MANUAL_DOMAIN_HEADING,
  ONBOARD_MANUAL_DOMAIN_INPUT_LABEL,
  ONBOARD_MANUAL_DOMAIN_INVALID,
  ONBOARD_MANUAL_DOMAIN_PLACEHOLDER,
  ONBOARD_MANUAL_DOMAIN_SUBCOPY,
  parseManualDomainSubmission,
} from "@/lib/onboard/manual-domain-entry";
import type { OnboardProfilePayload } from "@/lib/onboard/profile-types";
import {
  buildProfilePrefill,
  mergeUntouchedProfileFields,
} from "@/lib/onboard/build-profile-prefill";
import {
  fetchOnboardCompanySearch,
  matchCompanyOption,
  pickDefaultCompanyCandidate,
} from "@/lib/onboard/company-hint-client";
import {
  fetchOnboardEnrichmentStatus,
  fetchOnboardProfileStream,
} from "@/lib/onboard/stream-client";
import { fetchOnboardCohort } from "@/lib/onboard/cohort-client";
import type { OnboardCohortListEntry } from "@/lib/onboard/cohort-client";
import {
  formatCohortOptionLabel,
  prettyCohortKey,
} from "@/lib/benchmarks-format";
import { cohortDimensionsLabel } from "@/lib/benchmarks-shared";
import {
  computeOnboardingProfileCompleteness,
  isStateRegionRequired,
  validateOnboardingReviewProfile,
  type OnboardingProfileFieldErrors,
  type RequiredReviewFieldKey,
} from "@/lib/onboard/onboarding-profile-completeness";
import {
  applyLocationCountryChange,
  applyLocationStateChange,
  countryHasSubdivisions,
  listCountries,
  listSubdivisions,
  normalizeLocationForForm,
  resolveCountry,
} from "@/lib/geo";
import {
  filterFoundedYearInput,
  normalizeFoundedYearForForm,
} from "@/lib/onboard/founded-year";
import { OnboardSearchableCombobox } from "@/components/onboard/OnboardSearchableCombobox";
import { Logo } from "@/components/Logo";
import {
  mergeCohortBandsIntoMetrics,
  onboardBenchmarkMetricBandsFromDrawer,
  parseOnboardBenchmarkValue,
  type BenchmarkMetricBands,
} from "@/lib/onboard/map-benchmark-insights";
import {
  cohortDotColor,
  cohortDotGlow,
} from "@/lib/overview/benchmark-drawer-fields";
import { BenchmarkTrackHover } from "@/components/company/overview/BenchmarkTrackHover";
import type { OnboardBenchmarkRow } from "@/lib/onboard/profile-types";
import {
  ONBOARD_SLACK_BRAND,
  onboardFullScreenOverlay,
  onboardV2BottomBar,
  onboardV2FieldInput,
  onboardV2FieldLabel,
  onboardV2FlowCss,
  onboardV2FormSurface,
  onboardV2LeftColumn,
  onboardV2LogoMark,
  onboardV2LogoRow,
  onboardTextButton,
  onboardV2PrimaryCta,
  onboardV2ScrollInner,
  onboardV2Shell,
  onboardMotionRightPanel,
} from "@/components/onboard/styles";
import { SIGNAL } from "@/lib/theme";
import { useNarrow } from "@/lib/responsive";
import {
  applyEnrichmentStepStatus,
  crunchbaseScrapeBannerKind,
  crunchbaseScrapeBannerMessage,
  initialEnrichmentProgress,
  settleInterruptedCrunchbase,
  type EnrichmentProgress,
} from "@/lib/onboard/enrichment-progress";
import {
  isUnknownAnswer,
  isAnswered,
  ONBOARD_UNKNOWN_ANSWER,
  ONBOARD_UNKNOWN_LABEL,
  ONBOARD_UNKNOWN_PLACEHOLDER,
  unknownOptionSpansFullWidth,
} from "@/lib/onboard/unknown-answer";
import {
  BENCHMARK_NUMERIC_INPUT_MAX_LENGTH,
  sanitizeBenchmarkNumericInput,
} from "@/lib/onboard/benchmark-fields";
import {
  formatFundingRoundDateUs,
  initFundingRoundsFromEnrichment,
  toFundingRoundDateInputValue,
} from "@/lib/onboard/funding-rounds";
import {
  investorCtaLabel,
  resolveInvestorSteps,
  showHubSpotPipelineHint,
} from "@/lib/portfolio/investor-steps";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  ProfileMotion,
  DevMotion,
  GtmMotion,
  RevopsMotion,
  InvestmentMotion,
  BenchmarkMotion,
  HubSpotMotion,
  SourcesMotion,
} from "./OnboardingMotionGraphics";
import {
  DEV_PRODUCT_STAGES,
  DEV_PRODUCT_TYPES,
  DEV_DELIVERY_CONSTRAINTS,
  MKT_SALES_MOTIONS,
  MKT_GROWTH_BOTTLENECKS,
  MKT_ICP_CLARITY_OPTIONS,
  MKT_REVENUE_TRACKING_OPTIONS,
  REV_RUNWAY_OPTIONS,
  REV_FINANCE_MANAGEMENT_OPTIONS,
  REV_CAPITAL_PRIORITY_OPTIONS,
  findOtherSpecifyOption,
  formatOtherSpecifyAnswer,
  isChoiceAnswerComplete,
  isOtherSpecifyOption,
  isOtherSpecifySelected,
  parseOtherSpecifyText,
} from "@/lib/overview/detail-question-catalog";
import { OtherSpecifyInput } from "@/components/forms/OtherSpecifyInput";

// ─── Types ──────────────────────────────────────────────────────────────────

type StepId =
  | "profile"
  | "development"
  | "gtm"
  | "revops"
  | "benchmarking"
  | "investment"
  | "hubspot"
  | "sources";
type ConnectStatus = "pending" | "connecting" | "connected";

interface FundingRound {
  id: string;
  type: string;
  amount: string;
  date: string;
  investors: string;
}
interface ProfileForm {
  company: string;
  whatTheyDo: string;
  businessModel: string;
  industry: string;
  founded: string;
  city: string;
  stateRegion: string;
  country: string;
  website: string;
  linkedin: string;
  additionalContext: string;
  /** OpenSearch logo from selected company hit. */
  logoUrl?: string;
}
interface Answers {
  productType: string;
  productStage: string;
  productChallenge: string;
  salesMotion: string;
  funnelBreakdown: string;
  icpClarity: string;
  revenueTracking: string;
  runway: string;
  financeManagement: string;
  capitalPriority: string;
  arr: string;
  arrGrowth: string;
  nrr: string;
  logoRetention: string;
  grossMargin: string;
  cacPayback: string;
  burnMultiple: string;
  ruleOf40: string;
  monthlyBurn: string;
  cashOnHand: string;
  headcount: string;
  payingCustomers: string;
  investCheckSize: string;
  investGeography: string;
  investPipeline: string;
}

const STEPS_DEFAULT: StepId[] = [
  "profile",
  "development",
  "gtm",
  "revops",
  "benchmarking",
];

const EMPTY_OPERATING_ANSWERS: Pick<
  Answers,
  | "productType"
  | "productStage"
  | "productChallenge"
  | "salesMotion"
  | "funnelBreakdown"
  | "icpClarity"
  | "revenueTracking"
  | "runway"
  | "financeManagement"
  | "capitalPriority"
  | "arr"
  | "arrGrowth"
  | "nrr"
  | "logoRetention"
  | "grossMargin"
  | "cacPayback"
  | "burnMultiple"
  | "ruleOf40"
  | "monthlyBurn"
  | "cashOnHand"
  | "headcount"
  | "payingCustomers"
> = {
  productType: "",
  productStage: "",
  productChallenge: "",
  salesMotion: "",
  funnelBreakdown: "",
  icpClarity: "",
  revenueTracking: "",
  runway: "",
  financeManagement: "",
  capitalPriority: "",
  arr: "",
  arrGrowth: "",
  nrr: "",
  logoRetention: "",
  grossMargin: "",
  cacPayback: "",
  burnMultiple: "",
  ruleOf40: "",
  monthlyBurn: "",
  cashOnHand: "",
  headcount: "",
  payingCustomers: "",
};

const EMPTY_INVEST_ANSWERS: Pick<
  Answers,
  "investCheckSize" | "investGeography" | "investPipeline"
> = {
  investCheckSize: "",
  investGeography: "",
  investPipeline: "",
};

const BUSINESS_MODELS = [
  {
    id: "product",
    label: "Product",
    desc: "SaaS, marketplace, or app with recurring or transactional revenue.",
  },
  {
    id: "invest",
    label: "Investment",
    desc: "Fund or holding company managing a portfolio.",
  },
];

const COMPANY_SEARCH_DEBOUNCE_MS = 350;

const COMPANY_BENCHMARK_METRICS: Array<
  BenchmarkMetricBands & { key: keyof Answers }
> = onboardBenchmarkMetricBandsFromDrawer().map((m) => ({
  ...m,
  key: m.key as keyof Answers,
}));

const STEP_META: Record<StepId, { label: string; sub: string }> = {
  profile: { label: "Profile", sub: "Review your details" },
  development: { label: "R&D", sub: "Product & engineering" },
  gtm: { label: "GTM", sub: "Sales & growth" },
  revops: { label: "G&A", sub: "Pipeline & financials" },
  investment: { label: "Investment", sub: "Fund thesis & deal flow" },
  hubspot: { label: "Connect", sub: "Load your deal pipeline" },
  benchmarking: { label: "Benchmarking", sub: "Optional — compare metrics" },
  sources: { label: "Sources", sub: "Meetings & investor updates" },
};

const ROUND_TYPES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Bridge",
  "Grant",
  "Revenue-based",
];

type CompanyRecord = OnboardCompanyOption;

function filterCompanyOptions(
  query: string,
  options: CompanyRecord[],
): CompanyRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, 8);
  return options
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.domain.includes(q),
    )
    .slice(0, 8);
}

function findCompanyByQuery(
  query: string,
  options: CompanyRecord[],
): CompanyRecord | null {
  return matchCompanyOption(query, options);
}

function CompanySearch({
  value,
  onChange,
  onSelect,
  options,
  onSearch,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: CompanyRecord) => void;
  options: CompanyRecord[];
  onSearch: (query: string) => Promise<CompanyRecord[]>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [remoteOptions, setRemoteOptions] = useState<CompanyRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localSuggestions = useMemo(
    () => filterCompanyOptions(value, options),
    [value, options],
  );

  const suggestions = value.trim() ? remoteOptions : localSuggestions;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions.length]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = value.trim();
    if (!q) {
      setRemoteOptions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      void onSearch(q).then((rows) => {
        setRemoteOptions(rows);
        setSearching(false);
      });
    }, COMPANY_SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [value, onSearch]);

  function pick(c: CompanyRecord) {
    onChange(c.name);
    onSelect(c);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          className="of-input"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) {
              if (e.key === "Enter") {
                const match = findCompanyByQuery(value, suggestions);
                if (match) pick(match);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              pick(suggestions[highlight]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search companies…"
          style={{
            ...onboardV2FieldInput(),
            fontSize: 15,
            padding: "14px 44px 14px 16px",
            borderRadius: 10,
          }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(true);
            }}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#556878",
              fontSize: 18,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {open && !disabled && (
        <div
          className="of-suggest-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "#172632",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              padding: "8px 14px",
              fontSize: 10,
              fontWeight: 700,
              color: "#3A4F5E",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {searching ? "Searching…" : "Companies · Fuel catalog"}
          </div>
          {suggestions.length === 0 && !searching ? (
            <div style={{ padding: "14px", fontSize: 13, color: "#556878" }}>
              No matches — pick from suggestions or refine your search.
            </div>
          ) : null}
          {suggestions.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="of-suggest-item"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(c)}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "12px 14px",
                background:
                  i === highlight ? "rgba(61,214,140,0.08)" : "transparent",
                borderBottom:
                  i < suggestions.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Logo
                t={SIGNAL}
                co={{
                  logo: (c.name.trim()[0] || "?").toUpperCase(),
                  name: c.name,
                  uuid: c.id || null,
                  logoUrl: c.logoUrl ?? null,
                }}
                size={36}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: "#F2F5F2" }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#556878",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.industry} · {c.city}, {c.stateRegion}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#3A4F5E", flexShrink: 0 }}>
                {c.domain}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

let _rid = 0;
const rid = () => `r${Date.now()}-${++_rid}`;

// ─── Styles ──────────────────────────────────────────────────────────────────

const css = onboardV2FlowCss();
const inp = (extra?: React.CSSProperties): React.CSSProperties =>
  onboardV2FieldInput(extra);
const SELECT_ACCENT = SIGNAL.positive;

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={onboardV2FieldLabel()}>
        {label}
        {required && (
          <span style={{ color: SIGNAL.negative, marginLeft: 3 }}>*</span>
        )}
      </label>
      {children}
      {error ? (
        <div
          role="alert"
          style={{
            fontSize: 12,
            color: SIGNAL.negative,
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

function profileFieldInputStyle(hasError?: boolean): React.CSSProperties {
  return inp(
    hasError
      ? {
          border: `1px solid ${SIGNAL.negative}`,
          boxShadow: `0 0 0 1px ${SIGNAL.negative}33`,
        }
      : undefined,
  );
}

function unknownOptionButtonStyle(
  on: boolean,
  accent: string,
): React.CSSProperties {
  return {
    padding: "15px 18px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: on ? 600 : 400,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "center",
    lineHeight: 1.35,
    background: on ? `${accent}0A` : "transparent",
    border: on
      ? `1.5px dashed ${accent}`
      : "1.5px dashed rgba(255,255,255,0.18)",
    color: on ? SIGNAL.muted : SIGNAL.mutedSoft,
    letterSpacing: "-0.1px",
  };
}

function UnknownCheckboxControl({
  checked,
  onChange,
  accent = SIGNAL.accent,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: string;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 11,
        color: checked ? SIGNAL.muted : SIGNAL.mutedSoft,
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: checked
            ? `1.5px solid ${accent}`
            : "1.5px solid rgba(255,255,255,0.22)",
          background: checked ? `${accent}22` : "transparent",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        {checked ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke={accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {ONBOARD_UNKNOWN_LABEL}
    </label>
  );
}

function FigmaQuestion({
  title,
  subtitle,
  options,
  value,
  onChange,
  accent = SELECT_ACCENT,
  hint,
  columns = 2,
  grouped = false,
  allowUnknown = false,
}: {
  title: string;
  subtitle?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accent?: string;
  hint?: string;
  columns?: number;
  grouped?: boolean;
  allowUnknown?: boolean;
}) {
  const unknownOn = isUnknownAnswer(value);
  const otherOpt = findOtherSpecifyOption(options);
  const otherSelected = Boolean(otherOpt && isOtherSpecifySelected(value, otherOpt));
  const [otherDraft, setOtherDraft] = useState<string | null>(null);
  const otherText =
    otherDraft ?? (otherOpt ? parseOtherSpecifyText(value, otherOpt) : "");

  useEffect(() => {
    if (!otherSelected) setOtherDraft(null);
  }, [otherSelected]);

  return (
    <div style={{ marginBottom: grouped ? 36 : 0 }}>
      <h2 className={grouped ? "of-figma-q-grouped" : "of-figma-q-title"}>
        {title}
      </h2>
      {subtitle && <p className="of-figma-q-sub">{subtitle}</p>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            columns === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
          marginTop: grouped ? 14 : 28,
        }}
        className="of-choice-grid"
      >
        {options.map((opt) => {
          const on = isOtherSpecifyOption(opt)
            ? otherSelected
            : value === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`}
              onClick={() => {
                if (isOtherSpecifyOption(opt)) {
                  setOtherDraft("");
                  onChange(opt);
                  return;
                }
                onChange(opt);
              }}
              style={{
                padding: "15px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: on ? 600 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "center",
                lineHeight: 1.35,
                background: on ? `${accent}14` : "transparent",
                border: on
                  ? `1.5px solid ${accent}`
                  : "1.5px solid rgba(255,255,255,0.12)",
                color: on ? "#F2F5F2" : "#8FA99A",
                letterSpacing: "-0.1px",
              }}
            >
              {opt}
            </button>
          );
        })}
        {allowUnknown ? (
          <button
            type="button"
            className={`of-figma-opt${unknownOn ? " of-figma-opt--on" : ""}`}
            onClick={() => onChange(ONBOARD_UNKNOWN_ANSWER)}
            style={{
              ...unknownOptionButtonStyle(unknownOn, accent),
              ...(unknownOptionSpansFullWidth(options.length, columns)
                ? { gridColumn: "1 / -1" }
                : {}),
            }}
          >
            {ONBOARD_UNKNOWN_LABEL}
          </button>
        ) : null}
      </div>
      {otherSelected && otherOpt ? (
        <OtherSpecifyInput
          id={`figma-other-${title.replace(/\s+/g, "-").toLowerCase()}`}
          value={otherText}
          onChange={(text) => {
            setOtherDraft(text);
            onChange(formatOtherSpecifyAnswer(otherOpt, text));
          }}
          style={{
            display: "block",
            width: "100%",
            marginTop: 12,
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 10,
            fontSize: 14,
            fontFamily: "inherit",
            color: "#F2F5F2",
            background: "rgba(255,255,255,0.04)",
            border: `1.5px solid ${accent}66`,
            outline: "none",
          }}
        />
      ) : null}
      {hint && value && !isUnknownAnswer(value) && !otherSelected && (
        <div
          style={{
            marginTop: 18,
            padding: "12px 16px",
            background: "rgba(61,214,140,0.04)",
            border: "1px solid rgba(61,214,140,0.12)",
            borderRadius: 10,
            fontSize: 13,
            color: "#8FA99A",
            lineHeight: 1.65,
            fontStyle: "italic",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function FigmaMultiSelect({
  title,
  subtitle,
  options,
  selected,
  onToggle,
  onOtherTextChange,
  accent = SELECT_ACCENT,
  max,
  allowUnknown = false,
  unknownSelected = false,
  onUnknownSelect,
}: {
  title: string;
  subtitle?: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  /** When Other is selected, parent updates the Other entry with custom text. */
  onOtherTextChange?: (otherOpt: string, text: string) => void;
  accent?: string;
  max?: number;
  allowUnknown?: boolean;
  unknownSelected?: boolean;
  onUnknownSelect?: () => void;
}) {
  const atMax = max !== undefined && selected.length >= max;
  const otherOpt = findOtherSpecifyOption(options);
  const otherEntry = otherOpt
    ? selected.find((part) => isOtherSpecifySelected(part, otherOpt))
    : undefined;
  const otherSelected = Boolean(otherEntry);
  const [otherDraft, setOtherDraft] = useState<string | null>(null);
  const otherText =
    otherDraft ??
    (otherOpt && otherEntry ? parseOtherSpecifyText(otherEntry, otherOpt) : "");

  useEffect(() => {
    if (!otherSelected) setOtherDraft(null);
  }, [otherSelected]);

  return (
    <div>
      <h2 className="of-figma-q-title">{title}</h2>
      {subtitle && <p className="of-figma-q-sub">{subtitle}</p>}
      <div
        className="of-choice-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          marginTop: 28,
        }}
      >
        {options.map((opt) => {
          const on = isOtherSpecifyOption(opt)
            ? otherSelected
            : selected.includes(opt);
          const disabled = !on && atMax;
          return (
            <button
              key={opt}
              type="button"
              className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`}
              onClick={() => {
                if (isOtherSpecifyOption(opt) && !on) setOtherDraft("");
                onToggle(opt);
              }}
              disabled={disabled}
              style={{
                padding: "15px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: on ? 600 : 400,
                cursor: disabled ? "default" : "pointer",
                fontFamily: "inherit",
                textAlign: "center",
                lineHeight: 1.35,
                background: on ? `${accent}14` : "transparent",
                border: on
                  ? `1.5px solid ${accent}`
                  : "1.5px solid rgba(255,255,255,0.12)",
                color: on ? "#F2F5F2" : "#8FA99A",
                opacity: disabled ? 0.35 : 1,
                letterSpacing: "-0.1px",
              }}
            >
              {opt}
            </button>
          );
        })}
        {allowUnknown ? (
          <button
            type="button"
            className={`of-figma-opt${unknownSelected ? " of-figma-opt--on" : ""}`}
            onClick={() => onUnknownSelect?.()}
            style={{
              ...unknownOptionButtonStyle(unknownSelected, accent),
              ...(unknownOptionSpansFullWidth(options.length, 2)
                ? { gridColumn: "1 / -1" }
                : {}),
            }}
          >
            {ONBOARD_UNKNOWN_LABEL}
          </button>
        ) : null}
      </div>
      {otherSelected && otherOpt && onOtherTextChange ? (
        <OtherSpecifyInput
          id={`figma-multi-other-${title.replace(/\s+/g, "-").toLowerCase()}`}
          value={otherText}
          onChange={(text) => {
            setOtherDraft(text);
            onOtherTextChange(otherOpt, text);
          }}
          style={{
            display: "block",
            width: "100%",
            marginTop: 12,
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 10,
            fontSize: 14,
            fontFamily: "inherit",
            color: "#F2F5F2",
            background: "rgba(255,255,255,0.04)",
            border: `1.5px solid ${accent}66`,
            outline: "none",
          }}
        />
      ) : null}
      {selected.length > 0 && max !== undefined && !unknownSelected && (
        <p style={{ marginTop: 16, fontSize: 13, color: "#556878" }}>
          {selected.length} of {max} selected
        </p>
      )}
    </div>
  );
}

// ─── Benchmark helpers ───────────────────────────────────────────────────────
function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatBenchmarkP(v: number, unit: string): string {
  if (unit === "%" || unit === "pct") return `${v}%`;
  if (unit === "usd") return formatUsd(v);
  if (unit === "months") return `${Math.round(v)} mo`;
  if (unit === "x") {
    const rounded = Math.round(v * 10) / 10;
    return `${rounded}x`;
  }
  return String(v);
}

function parseVal(s: string): number | null {
  if (isUnknownAnswer(s)) return null;
  return parseOnboardBenchmarkValue(s);
}

const SUB_Q_COUNT: Partial<Record<StepId, number>> = {
  investment: 5,
};

function StepHeading({ meta }: { meta: { label: string; sub: string } }) {
  return (
    <div className="of-step-heading" style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontWeight: 800,
          color: "#F2F5F2",
          margin: "0 0 10px",
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
        }}
      >
        {meta.label}
      </h2>
      <p
        style={{
          color: "#556878",
          margin: 0,
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        {meta.sub}
      </p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export type OnboardingFlowCompletePayload = {
  profileForm: ProfileForm;
  fundingRounds: FundingRound[];
  answers: Answers;
  investStages: string[];
  investSectors: string[];
  cohortKey: string | null;
  enrichmentRunId: string | null;
  setupIncomplete?: boolean;
};

export default function OnboardingFlow({
  onComplete,
  initialCompanyCandidates = [],
  emailDomain = "",
  initialCompanyHintName = null,
}: {
  onComplete: (payload: OnboardingFlowCompletePayload) => void;
  initialCompanyCandidates?: CompanyRecord[];
  emailDomain?: string;
  initialCompanyHintName?: string | null;
}) {
  /** Hide editorial motion rail; form-first layout (matches chat progress rail cutoff). */
  const narrow = useNarrow(900);
  const [stepIndex, setStepIndex] = useState(0);

  const [companyQuery, setCompanyQuery] = useState("");
  const [companyOptions, setCompanyOptions] = useState<CompanyRecord[]>(
    initialCompanyCandidates,
  );
  const [searchState, setSearchState] = useState<
    "idle" | "manual" | "searching" | "review"
  >("idle");
  const [enrichmentProgress, setEnrichmentProgress] =
    useState<EnrichmentProgress>(initialEnrichmentProgress);
  const [enrichmentActive, setEnrichmentActive] = useState(false);
  const [enrichmentRunId, setEnrichmentRunId] = useState<string | null>(null);
  const profileFieldsTouchedRef = useRef<Set<keyof ProfileForm>>(new Set());
  const fundingTouchedRef = useRef(false);
  const [manualDomainInput, setManualDomainInput] = useState("");
  const [manualDomainError, setManualDomainError] = useState<string | null>(
    null,
  );
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    company: "",
    whatTheyDo: "",
    businessModel: "",
    industry: "",
    founded: "",
    city: "",
    stateRegion: "",
    country: "",
    website: "",
    linkedin: "",
    additionalContext: "",
  });
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);
  const [profileFieldErrors, setProfileFieldErrors] =
    useState<OnboardingProfileFieldErrors>({});

  const [answers, setAnswers] = useState<Answers>({
    productType: "",
    productStage: "",
    productChallenge: "",
    salesMotion: "",
    funnelBreakdown: "",
    icpClarity: "",
    revenueTracking: "",
    runway: "",
    financeManagement: "",
    capitalPriority: "",
    arr: "",
    arrGrowth: "",
    nrr: "",
    logoRetention: "",
    grossMargin: "",
    cacPayback: "",
    burnMultiple: "",
    ruleOf40: "",
    monthlyBurn: "",
    cashOnHand: "",
    headcount: "",
    payingCustomers: "",
    investCheckSize: "",
    investGeography: "",
    investPipeline: "",
  });
  const [investStages, setInvestStages] = useState<string[]>([]);
  const [investSectors, setInvestSectors] = useState<string[]>([]);
  const [investQ, setInvestQ] = useState(0);
  const [hubspotStatus, setHubspotStatus] = useState<ConnectStatus>("pending");
  const [granolaStatus, setGranolaStatus] = useState<ConnectStatus>("pending");
  const [slackStatus, setSlackStatus] = useState<ConnectStatus>("pending");
  const [benchmarkGenerating, setBenchmarkGenerating] = useState(false);
  const [benchmarkSummaryReady, setBenchmarkSummaryReady] = useState(false);
  const [profileCohortLabel, setProfileCohortLabel] = useState<string | null>(
    null,
  );
  const [cohortKey, setCohortKey] = useState<string | null>(null);
  const [cohortBenchmarkRows, setCohortBenchmarkRows] = useState<
    OnboardBenchmarkRow[]
  >([]);
  const [allCohorts, setAllCohorts] = useState<OnboardCohortListEntry[]>([]);
  const [cohortManualOverride, setCohortManualOverride] = useState(false);
  const cohortFetchGen = useRef(0);
  const processingRef = useRef(false);
  const enrichmentAbortRef = useRef<AbortController | null>(null);
  const companyPrefillDoneRef = useRef(false);

  useEffect(
    () => () => {
      enrichmentAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    setCompanyOptions(initialCompanyCandidates);
  }, [initialCompanyCandidates]);

  useEffect(() => {
    if (companyPrefillDoneRef.current || companyQuery) return;
    const defaultCompany = pickDefaultCompanyCandidate(
      initialCompanyCandidates,
      emailDomain,
      initialCompanyHintName,
    );
    if (!defaultCompany) return;
    setCompanyQuery(defaultCompany.name);
    companyPrefillDoneRef.current = true;
  }, [
    initialCompanyCandidates,
    emailDomain,
    initialCompanyHintName,
    companyQuery,
  ]);

  const searchCompaniesRemote = useCallback(
    (query: string) => fetchOnboardCompanySearch(query),
    [],
  );

  const filledBenchmarkCount = useMemo(
    () =>
      COMPANY_BENCHMARK_METRICS.filter(
        (m) => parseVal(answers[m.key] || "") !== null,
      ).length,
    [answers],
  );
  const allBenchmarkFilled =
    filledBenchmarkCount === COMPANY_BENCHMARK_METRICS.length;

  const benchmarkMetricsWithCohort = useMemo(
    () =>
      mergeCohortBandsIntoMetrics(
        COMPANY_BENCHMARK_METRICS,
        cohortBenchmarkRows,
      ) as Array<BenchmarkMetricBands & { key: keyof Answers }>,
    [cohortBenchmarkRows],
  );

  const isInvestor = (INVESTOR_PATH_MODELS as readonly string[]).includes(
    profileForm.businessModel,
  );
  const activeSteps = useMemo(
    () =>
      isInvestor
        ? resolveInvestorSteps(answers.investPipeline)
        : STEPS_DEFAULT,
    [isInvestor, answers.investPipeline],
  );
  const businessModelRef = useRef(profileForm.businessModel);

  const profileCompleteness = useMemo(
    () => computeOnboardingProfileCompleteness(profileForm, fundingRounds),
    [profileForm, fundingRounds],
  );

  // Clamp sync so a path switch never paints `5 / 2` before effects run.
  const safeStepIndex = Math.min(
    stepIndex,
    Math.max(activeSteps.length - 1, 0),
  );
  const stepId = activeSteps[safeStepIndex];
  const isLast = safeStepIndex === activeSteps.length - 1;
  const currentSubQ = stepId === "investment" ? investQ : 0;
  const currentStepSubCount = stepId ? (SUB_Q_COUNT[stepId] ?? 1) : 1;
  const isLastVisibleStep =
    stepId != null &&
    safeStepIndex === activeSteps.length - 1 &&
    currentSubQ === currentStepSubCount - 1;
  const ctaLabel = investorCtaLabel({ isLastVisibleStep });
  const showConnectLater = false;

  function resetBranchProgress(nextModel: string) {
    const nextKind = onboardPathKind(nextModel);
    setStepIndex(0);
    setInvestQ(0);
    if (nextKind === "short") {
      setInvestStages([]);
      setInvestSectors([]);
      setAnswers((a) => ({
        ...a,
        ...EMPTY_OPERATING_ANSWERS,
        ...EMPTY_INVEST_ANSWERS,
      }));
    } else {
      setInvestStages([]);
      setInvestSectors([]);
      setAnswers((a) => ({ ...a, ...EMPTY_INVEST_ANSWERS }));
    }
  }

  function selectBusinessModel(label: string) {
    if (label === profileForm.businessModel) return;
    const hadModel = !!profileForm.businessModel;
    // Advance ref first so the prefill effect does not double-reset.
    businessModelRef.current = label;
    setPF("businessModel", label);
    if (hadModel) resetBranchProgress(label);
  }

  useEffect(() => {
    const prev = businessModelRef.current;
    if (prev === profileForm.businessModel) return;
    const hadPrev = !!prev;
    businessModelRef.current = profileForm.businessModel;
    if (!hadPrev) return;
    // Prefill / enrichment changed org type.
    resetBranchProgress(profileForm.businessModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to businessModel string
  }, [profileForm.businessModel]);

  useEffect(() => {
    if (isInvestor) return;
    if (searchState !== "review" && stepId !== "benchmarking") return;
    if (cohortManualOverride) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const gen = ++cohortFetchGen.current;
      void fetchOnboardCohort({
        industry: profileForm.industry,
        locationCountry: profileForm.country,
        fundingRounds: fundingRounds.map((r) => ({
          type: r.type,
          date: r.date,
        })),
      }).then((resolution) => {
        if (cancelled || !resolution || gen !== cohortFetchGen.current) return;
        setCohortKey(resolution.cohortKey);
        setCohortBenchmarkRows(resolution.benchmarkRows);
        setAllCohorts(resolution.allCohorts);
        if (resolution.cohortKey) {
          setProfileCohortLabel(prettyCohortKey(resolution.cohortKey));
        } else if (resolution.inferred) {
          setProfileCohortLabel(cohortDimensionsLabel(resolution.inferred));
        } else {
          setProfileCohortLabel(null);
        }
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isInvestor,
    searchState,
    stepId,
    profileForm.industry,
    profileForm.country,
    profileForm.businessModel,
    fundingRounds,
    cohortManualOverride,
  ]);

  const handleCohortChange = useCallback(
    async (nextKey: string) => {
      if (!nextKey) return;
      setCohortManualOverride(true);
      const gen = ++cohortFetchGen.current;
      const resolution = await fetchOnboardCohort({
        industry: profileForm.industry,
        locationCountry: profileForm.country,
        fundingRounds: fundingRounds.map((r) => ({
          type: r.type,
          date: r.date,
        })),
        cohortKeyOverride: nextKey,
      });
      if (!resolution || gen !== cohortFetchGen.current) return;
      setCohortKey(resolution.cohortKey);
      setCohortBenchmarkRows(resolution.benchmarkRows);
      setAllCohorts(resolution.allCohorts);
      if (resolution.cohortKey) {
        setProfileCohortLabel(prettyCohortKey(resolution.cohortKey));
      } else if (resolution.inferred) {
        setProfileCohortLabel(cohortDimensionsLabel(resolution.inferred));
      }
    },
    [profileForm.industry, profileForm.country, fundingRounds],
  );

  useEffect(() => {
    if (stepId !== "benchmarking" || !allBenchmarkFilled) {
      setBenchmarkGenerating(false);
      setBenchmarkSummaryReady(false);
      return;
    }
    setBenchmarkSummaryReady(false);
    setBenchmarkGenerating(true);
    const t = setTimeout(() => {
      setBenchmarkGenerating(false);
      setBenchmarkSummaryReady(true);
    }, 2400);
    return () => clearTimeout(t);
  }, [stepId, allBenchmarkFilled, answers]);

  function clearProfileFieldError(k: RequiredReviewFieldKey) {
    setProfileFieldErrors((prev) => {
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }

  function setPF(k: keyof ProfileForm, v: string) {
    profileFieldsTouchedRef.current.add(k);
    setProfileForm((p) => ({ ...p, [k]: v }));
    if (
      k === "company" ||
      k === "whatTheyDo" ||
      k === "businessModel" ||
      k === "industry" ||
      k === "founded" ||
      k === "city" ||
      k === "stateRegion" ||
      k === "country" ||
      k === "website"
    ) {
      clearProfileFieldError(k);
    }
  }

  function setCountry(nextCountry: string) {
    profileFieldsTouchedRef.current.add("country");
    profileFieldsTouchedRef.current.add("stateRegion");
    profileFieldsTouchedRef.current.add("city");
    setProfileForm((p) => ({
      ...p,
      ...applyLocationCountryChange(nextCountry),
    }));
    setProfileFieldErrors((prev) => {
      const next = { ...prev };
      delete next.country;
      delete next.stateRegion;
      delete next.city;
      return next;
    });
  }

  function setStateRegion(nextState: string) {
    profileFieldsTouchedRef.current.add("stateRegion");
    setProfileForm((p) => ({
      ...p,
      ...applyLocationStateChange(
        {
          country: p.country,
          stateRegion: p.stateRegion,
          city: p.city,
        },
        nextState,
      ),
    }));
    setProfileFieldErrors((prev) => {
      const next = { ...prev };
      delete next.stateRegion;
      return next;
    });
  }

  function setAns(k: keyof Answers, v: string) {
    setAnswers((p) => ({ ...p, [k]: v }));
  }

  function profileFormFromRecord(record: CompanyRecord): ProfileForm {
    const location = normalizeLocationForForm({
      country: record.country,
      stateRegion: record.stateRegion,
      city: record.city,
    });
    const logoUrl = record.logoUrl?.trim();
    return {
      company: record.name,
      whatTheyDo: record.whatTheyDo,
      businessModel: normalizeUiBusinessModel(record.businessModel),
      industry: record.industry,
      founded: normalizeFoundedYearForForm(record.founded),
      city: location.city,
      stateRegion: location.stateRegion,
      country: location.country,
      website: record.domain ? `https://${record.domain}` : "",
      linkedin: record.linkedin,
      additionalContext: "",
      ...(logoUrl ? { logoUrl } : {}),
    };
  }

  function fundingRoundsFromRecord(record: CompanyRecord): FundingRound[] {
    return record.funding.map((f) => ({
      id: rid(),
      type: f.type,
      amount: f.amount,
      date: f.date ?? "",
      investors: f.investors ?? "",
    }));
  }

  function loadCompanyProfile(record: CompanyRecord) {
    enrichmentAbortRef.current?.abort();
    const abortController = new AbortController();
    enrichmentAbortRef.current = abortController;

    // Prefill from Fuel catalog immediately; right-rail shows searching motion
    // until unlockReview. Slow providers keep running after review opens.
    processingRef.current = true;
    profileFieldsTouchedRef.current.clear();
    fundingTouchedRef.current = false;
    setCompanyQuery(record.name);
    setProfileFieldErrors({});
    setManualDomainError(null);
    setProfileForm(profileFormFromRecord(record));
    setFundingRounds(fundingRoundsFromRecord(record));
    setEnrichmentProgress(initialEnrichmentProgress());
    setEnrichmentActive(true);
    setEnrichmentRunId(null);
    setSearchState("searching");
    let reviewUnlocked = false;
    let queuedRunId: string | null = null;
    let pollStarted = false;

    const applyPayload = (
      payload: OnboardProfilePayload,
      partial: boolean,
      unlockReview: boolean,
    ) => {
      if (abortController.signal.aborted) return;
      const enrichmentDomain = record.domain.trim();
      const prefill = buildProfilePrefill({
        enrichment: payload.enrichment,
        extracted: payload.extracted,
        companyName: record.name,
        domain: enrichmentDomain || payload.enrichment.domain,
      });
      const p = prefill.crunchbaseProfile;
      const location = normalizeLocationForForm({
        country: prefill.location.country || record.country,
        stateRegion: prefill.location.state || record.stateRegion,
        city: prefill.location.city || record.city,
      });

      const fromEnrichment = initFundingRoundsFromEnrichment({
        enrichment: payload.enrichment,
        totalFundingLabel: p.totalFunding?.trim() || undefined,
        lastFundingType: p.stage || null,
      }).map((r) => ({
        id: r.id || rid(),
        type: r.type || "Funding",
        amount: r.amount,
        date: r.date,
        investors: r.investors,
      }));

      const selectedLogo =
        record.logoUrl?.trim() ||
        (typeof payload.enrichment.sources?.logoUrl === "string"
          ? payload.enrichment.sources.logoUrl.trim()
          : "");
      setProfileForm((current) =>
        mergeUntouchedProfileFields(
          current,
          {
          company: p.name || record.name,
          whatTheyDo: p.description || record.whatTheyDo,
          businessModel: resolveUiBusinessModel({
            prefillModel: prefill.businessModel,
            recordLabel: record.businessModel,
          }),
          industry: p.category || record.industry,
          founded: normalizeFoundedYearForForm(p.founded || record.founded),
          city: location.city,
          stateRegion: location.stateRegion,
          country: location.country,
          website: p.website?.startsWith("http")
            ? p.website
            : enrichmentDomain
              ? `https://${enrichmentDomain}`
              : p.website,
          linkedin: prefill.linkedinUrl || record.linkedin,
          additionalContext: "",
          ...(selectedLogo ? { logoUrl: selectedLogo } : {}),
          },
          profileFieldsTouchedRef.current,
        ),
      );

      if (fromEnrichment.length > 0 && !fundingTouchedRef.current) {
        setFundingRounds(fromEnrichment);
      } else if (!partial && !fundingTouchedRef.current) {
        setFundingRounds(fundingRoundsFromRecord(record));
      }

      if (unlockReview && !reviewUnlocked) {
        reviewUnlocked = true;
        setSearchState("review");
      }

    };

    const pollQueuedEnrichment = async (runId: string) => {
      const deadline = Date.now() + 20 * 60 * 1000;
      while (!abortController.signal.aborted && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        if (abortController.signal.aborted) return;
        const status = await fetchOnboardEnrichmentStatus(
          runId,
          abortController.signal,
        ).catch(() => null);
        if (!status) continue;
        setEnrichmentProgress((prev) => {
          let next = prev;
          for (const [id, value] of Object.entries(status.steps)) {
            const progressValue =
              value === "queued" ? "running" : value;
            if (
              progressValue === "pending" ||
              progressValue === "running" ||
              progressValue === "done" ||
              progressValue === "error"
            ) {
              next = applyEnrichmentStepStatus(next, id, progressValue);
            }
          }
          return next;
        });
        if (status.status === "completed" && status.payload) {
          applyPayload(status.payload, false, false);
          setEnrichmentActive(false);
          return;
        }
        if (status.status === "failed") {
          setEnrichmentProgress(settleInterruptedCrunchbase);
          setEnrichmentActive(false);
          return;
        }
      }
      if (!abortController.signal.aborted) {
        setEnrichmentProgress(settleInterruptedCrunchbase);
        setEnrichmentActive(false);
      }
    };

    void (async () => {
      const enrichmentDomain = record.domain.trim();
      try {
        const { payload, error: streamError } = await fetchOnboardProfileStream(
          {
            onStep: (event) => {
              if (abortController.signal.aborted) return;
              setEnrichmentProgress((prev) =>
                applyEnrichmentStepStatus(prev, event.id, event.status),
              );
            },
            onProfile: (p, meta) => {
              applyPayload(
                p,
                meta?.partial === true,
                meta?.unlockReview === true || meta?.partial !== true,
              );
            },
            onJob: (event) => {
              queuedRunId = event.runId;
              setEnrichmentRunId(event.runId);
              if (
                !pollStarted &&
                (event.status === "pending" ||
                  event.status === "queued" ||
                  event.status === "running")
              ) {
                pollStarted = true;
                void pollQueuedEnrichment(event.runId);
              }
              if (event.status === "completed") setEnrichmentActive(false);
            },
          },
          {
            companyId: record.id || undefined,
            companyDomain: enrichmentDomain || undefined,
            backgroundEnrichment: true,
          },
          { signal: abortController.signal },
        );

        if (abortController.signal.aborted) return;
        if (payload) {
          applyPayload(payload, false, true);
        } else if (streamError) {
          // Fail open to review with fuel-data / synthetic record so user can continue.
          setEnrichmentProgress(settleInterruptedCrunchbase);
          setSearchState("review");
        }
      } catch {
        if (abortController.signal.aborted) return;
        setEnrichmentProgress(settleInterruptedCrunchbase);
        setSearchState("review");
      } finally {
        if (!abortController.signal.aborted) {
          processingRef.current = false;
          if (!queuedRunId) {
            setEnrichmentActive(false);
            setEnrichmentProgress(settleInterruptedCrunchbase);
          }
          if (!reviewUnlocked) setSearchState("review");
        }
      }
    })();
  }

  function submitManualDomain() {
    if (processingRef.current) return;
    const parsed = parseManualDomainSubmission(
      manualDomainInput,
      normalizeManualCompanyDomain,
    );
    if (!parsed.ok) {
      setManualDomainError(parsed.error);
      return;
    }
    const option = onboardOptionFromManualDomain(parsed.domain);
    if (!option) {
      setManualDomainError(ONBOARD_MANUAL_DOMAIN_INVALID);
      return;
    }
    setManualDomainError(null);
    loadCompanyProfile(option);
  }

  function trySelectCompanyFromQuery() {
    const match = findCompanyByQuery(companyQuery, companyOptions);
    if (match) loadCompanyProfile(match);
  }

  function addRound() {
    fundingTouchedRef.current = true;
    setFundingRounds((p) => [
      ...p,
      { id: rid(), type: "Seed", amount: "", date: "", investors: "" },
    ]);
  }
  function updateRound(id: string, k: keyof FundingRound, v: string) {
    fundingTouchedRef.current = true;
    setFundingRounds((p) => p.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  }
  function updateRoundAmount(id: string, raw: string) {
    const next = sanitizeBenchmarkNumericInput(raw);
    if (next === null) return;
    updateRound(id, "amount", next);
  }
  function updateRoundDate(id: string, isoYmd: string) {
    // DatePicker emits yyyy-mm-dd — store as mm/dd/yyyy for display/persistence.
    updateRound(id, "date", isoYmd ? formatFundingRoundDateUs(isoYmd) : "");
  }
  function removeRound(id: string) {
    fundingTouchedRef.current = true;
    setFundingRounds((p) => p.filter((r) => r.id !== id));
  }

  function connectHubSpot() {
    if (hubspotStatus !== "pending") return;
    setHubspotStatus("connecting");
    setTimeout(() => setHubspotStatus("connected"), 1800);
  }

  function connectSource(id: "granola" | "slack") {
    const status = id === "granola" ? granolaStatus : slackStatus;
    const setStatus = id === "granola" ? setGranolaStatus : setSlackStatus;
    if (status !== "pending") return;
    setStatus("connecting");
    setTimeout(() => setStatus("connected"), 1600);
  }

  function canAdvance() {
    if (stepId === "profile") {
      if (searchState === "idle") {
        return (
          !!findCompanyByQuery(companyQuery, companyOptions) ||
          companyOptions.some((c) => c.name === companyQuery.trim())
        );
      }
      if (searchState === "manual") {
        return !!normalizeManualCompanyDomain(manualDomainInput);
      }
      if (searchState === "searching") return false;
      // Allow Continue so validation can run and surface field errors.
      return searchState === "review";
    }
    if (stepId === "development")
      return (
        isAnswered(answers.productStage) &&
        isChoiceAnswerComplete(answers.productType, DEV_PRODUCT_TYPES) &&
        isAnswered(answers.productChallenge)
      );
    if (stepId === "gtm")
      return (
        isChoiceAnswerComplete(answers.salesMotion, MKT_SALES_MOTIONS) &&
        isAnswered(answers.funnelBreakdown) &&
        isAnswered(answers.icpClarity) &&
        isAnswered(answers.revenueTracking)
      );
    if (stepId === "revops")
      return (
        isAnswered(answers.runway) &&
        isAnswered(answers.financeManagement) &&
        isAnswered(answers.capitalPriority)
      );
    if (stepId === "investment") {
      if (investQ === 0) return investStages.length > 0;
      if (investQ === 1) {
        if (investSectors.length === 0) return false;
        if (investSectors.includes(ONBOARD_UNKNOWN_ANSWER)) return true;
        const otherEntry = investSectors.find((s) =>
          isOtherSpecifySelected(s, "Other"),
        );
        if (!otherEntry) return true;
        return parseOtherSpecifyText(otherEntry, "Other").trim().length > 0;
      }
      if (investQ === 2) return isAnswered(answers.investCheckSize);
      if (investQ === 3) return isAnswered(answers.investGeography);
      if (investQ === 4) return isAnswered(answers.investPipeline);
    }
    if (stepId === "benchmarking" && allBenchmarkFilled && benchmarkGenerating)
      return false;
    return true;
  }

  function completeFlow(setupIncomplete = false) {
    onComplete({
      profileForm,
      fundingRounds,
      answers,
      investStages,
      investSectors,
      cohortKey,
      enrichmentRunId,
      setupIncomplete,
    });
  }

  function skipConnectors() {
    completeFlow();
  }

  function next() {
    if (stepId === "profile" && searchState === "idle") {
      trySelectCompanyFromQuery();
      return;
    }
    if (stepId === "profile" && searchState === "manual") {
      submitManualDomain();
      return;
    }
    if (stepId === "profile" && searchState === "review") {
      const errors = validateOnboardingReviewProfile(profileForm);
      setProfileFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;
      for (const key of Object.keys(profileForm) as Array<keyof ProfileForm>) {
        profileFieldsTouchedRef.current.add(key);
      }
      fundingTouchedRef.current = true;
    }
    if (stepId === "investment" && investQ < 4) {
      setInvestQ((q) => q + 1);
      return;
    }
    if (stepId === "investment") setInvestQ(0);
    if (isLast) {
      completeFlow();
      return;
    }
    setStepIndex(safeStepIndex + 1);
  }

  function back() {
    if (stepId === "profile") {
      if (searchState === "review" || searchState === "searching") {
        enrichmentAbortRef.current?.abort();
        processingRef.current = false;
        setEnrichmentActive(false);
        setProfileFieldErrors({});
        setSearchState("idle");
        return;
      }
      if (searchState === "manual") {
        setManualDomainError(null);
        setManualDomainInput("");
        setSearchState("idle");
        return;
      }
    }
    if (stepId === "investment" && investQ > 0) {
      setInvestQ((q) => q - 1);
      return;
    }
    if (activeSteps[safeStepIndex - 1] === "investment") setInvestQ(4);
    setStepIndex(Math.max(0, safeStepIndex - 1));
  }

  const showBack =
    safeStepIndex > 0 ||
    (stepId === "investment" && investQ > 0) ||
    (stepId === "profile" &&
      (searchState === "review" ||
        searchState === "manual" ||
        searchState === "searching"));

  const countryOptions = useMemo(
    () => listCountries().map((c) => ({ value: c.name, label: c.name })),
    [],
  );
  const selectedCountryCode = resolveCountry(profileForm.country).code;
  const hasStates = countryHasSubdivisions(selectedCountryCode);
  const stateRequired = isStateRegionRequired(profileForm.country);
  const countrySelected = !!profileForm.country.trim();
  const cityEnabled =
    countrySelected && (!hasStates || !!profileForm.stateRegion.trim());
  const stateOptions = useMemo(
    () =>
      listSubdivisions(selectedCountryCode).map((s) => ({
        value: s.name,
        label: s.name,
      })),
    [selectedCountryCode],
  );

  const companyName = profileForm.company || companyQuery || "your company";
  const crunchbaseBannerKind = crunchbaseScrapeBannerKind(
    enrichmentProgress.crunchbase,
    enrichmentActive &&
      (searchState === "searching" || searchState === "review"),
  );
  const crunchbaseBannerMessage =
    crunchbaseScrapeBannerMessage(crunchbaseBannerKind);
  const crunchbaseBannerAccent =
    crunchbaseBannerKind === "complete" ? SIGNAL.positive : SIGNAL.warn;
  const crunchbaseBannerStyle = {
    background: `color-mix(in srgb, ${crunchbaseBannerAccent} 22%, ${SIGNAL.panel})`,
    border: `1px solid color-mix(in srgb, ${crunchbaseBannerAccent} 45%, ${SIGNAL.rule})`,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    color: SIGNAL.ink,
    lineHeight: 1.45,
  } as const;

  const isTopAligned =
    stepId === "development" ||
    stepId === "gtm" ||
    stepId === "revops" ||
    (stepId === "profile" && searchState === "review") ||
    stepId === "benchmarking";
  const isCenteredView =
    !isTopAligned &&
    ((stepId === "profile" && searchState !== "review") ||
      stepId === "investment");

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [stepId, searchState, currentSubQ]);

  const rightPanel: Record<StepId, React.ReactNode> = {
    profile: (
      <ProfileMotion
        searchState={searchState}
        form={profileForm}
        companyQuery={companyQuery}
        isInvestor={isInvestor}
        cohortLabel={profileCohortLabel}
        profileCompleteness={profileCompleteness}
      />
    ),
    development: <DevMotion answers={answers} companyName={companyName} />,
    gtm: <GtmMotion answers={answers} companyName={companyName} />,
    revops: <RevopsMotion answers={answers} companyName={companyName} />,
    investment: (
      <InvestmentMotion
        investQ={currentSubQ}
        stages={investStages}
        sectors={investSectors}
        checkSize={answers.investCheckSize}
        geography={answers.investGeography}
        pipeline={answers.investPipeline}
        companyName={companyName}
      />
    ),
    benchmarking: (
      <BenchmarkMotion
        answers={answers}
        cohortLabel={
          profileCohortLabel || profileForm.industry || "your peer group"
        }
        companyName={companyName}
        allMetricsFilled={allBenchmarkFilled}
        filledCount={filledBenchmarkCount}
        totalCount={COMPANY_BENCHMARK_METRICS.length}
        isGenerating={benchmarkGenerating}
        summaryReady={benchmarkSummaryReady}
      />
    ),
    hubspot: <HubSpotMotion status={hubspotStatus} companyName={companyName} />,
    sources: (
      <SourcesMotion
        granolaStatus={granolaStatus}
        slackStatus={slackStatus}
        companyName={companyName}
      />
    ),
  };

  // Progress accounts for sub-questions within multi-part steps
  // (Investment alone is 5 screens — footer must not stay stuck at `2/2`).
  const totalUnits = activeSteps.reduce((n, s) => n + (SUB_Q_COUNT[s] ?? 1), 0);
  const doneUnits =
    activeSteps
      .slice(0, safeStepIndex)
      .reduce((n, s) => n + (SUB_Q_COUNT[s] ?? 1), 0) + currentSubQ;
  const progressPct = Math.round(
    (doneUnits / Math.max(totalUnits - 1, 1)) * 100,
  );
  const progressLabelCurrent = Math.min(doneUnits + 1, totalUnits);
  const progressLabelTotal = totalUnits;

  return (
    <>
      <style>{css}</style>
      <div style={onboardFullScreenOverlay()}>
        <div style={onboardV2Shell(narrow)}>
          {/* ── LEFT (form) ── */}
          <div style={onboardV2LeftColumn(narrow)}>
            {/* Logo — top left */}
            <div
              style={{
                ...onboardV2LogoRow(narrow),
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={onboardV2LogoMark()}>F</div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: SIGNAL.ink,
                  letterSpacing: "-0.2px",
                }}
              >
                Fuel
              </span>
              <span style={{ fontSize: 11, color: SIGNAL.mutedSoft }}>
                by York IE
              </span>
              </div>
              {!isInvestor &&
              (stepId === "development" ||
                stepId === "gtm" ||
                stepId === "revops" ||
                stepId === "benchmarking") ? (
                <button
                  type="button"
                  onClick={() => completeFlow(true)}
                  style={onboardTextButton()}
                >
                  Set up later →
                </button>
              ) : null}
            </div>

            {/* Scrollable content */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                alignItems: isCenteredView ? "center" : "flex-start",
                justifyContent: "center",
                minHeight: 0,
              }}
            >
              <div style={onboardV2ScrollInner(isCenteredView, narrow)}>
                <div
                  style={onboardV2FormSurface(narrow)}
                >
                <div
                  className="of-step"
                  key={`${stepId}-${currentSubQ}-${searchState}`}
                >
                  {/* PROFILE */}
                  {stepId === "profile" && (
                    <div>
                      {searchState === "idle" && (
                        <div>
                          <h2
                            className="of-figma-q-title"
                            style={{ marginBottom: 12 }}
                          >
                            Which company is this workspace for?
                          </h2>
                          <p
                            className="of-figma-q-sub"
                            style={{ margin: "0 0 28px" }}
                          >
                            Search by name — Fuel pulls your profile, funding
                            history, and cohort match from public signals.
                          </p>
                          <CompanySearch
                            value={companyQuery}
                            onChange={(v) => setCompanyQuery(v)}
                            onSelect={loadCompanyProfile}
                            options={companyOptions}
                            onSearch={searchCompaniesRemote}
                          />
                          <p
                            style={{
                              fontSize: 12,
                              color: "#3A4F5E",
                              marginTop: 14,
                              lineHeight: 1.55,
                            }}
                          >
                            Select a match from the list, or continue with your
                            current selection.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setManualDomainError(null);
                              setSearchState("manual");
                            }}
                            style={onboardTextButton({
                              marginTop: 18,
                              color: SIGNAL.accent,
                              textDecoration: "underline",
                              textUnderlineOffset: 3,
                              padding: 0,
                            })}
                          >
                            {ONBOARD_CANT_FIND_COMPANY_LABEL}
                          </button>
                        </div>
                      )}

                      {searchState === "manual" && (
                        <div>
                          <h2
                            className="of-figma-q-title"
                            style={{ marginBottom: 12 }}
                          >
                            {ONBOARD_MANUAL_DOMAIN_HEADING}
                          </h2>
                          <p
                            className="of-figma-q-sub"
                            style={{ margin: "0 0 28px" }}
                          >
                            {ONBOARD_MANUAL_DOMAIN_SUBCOPY}
                          </p>
                          <label
                            htmlFor="onboard-manual-domain"
                            style={onboardV2FieldLabel()}
                          >
                            {ONBOARD_MANUAL_DOMAIN_INPUT_LABEL}
                          </label>
                          <input
                            id="onboard-manual-domain"
                            type="text"
                            inputMode="url"
                            autoComplete="url"
                            spellCheck={false}
                            value={manualDomainInput}
                            placeholder={ONBOARD_MANUAL_DOMAIN_PLACEHOLDER}
                            aria-invalid={!!manualDomainError}
                            aria-describedby={
                              manualDomainError
                                ? "onboard-manual-domain-error"
                                : undefined
                            }
                            onChange={(e) => {
                              setManualDomainInput(e.target.value);
                              if (manualDomainError) setManualDomainError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                submitManualDomain();
                              }
                            }}
                            style={{
                              ...profileFieldInputStyle(!!manualDomainError),
                              marginTop: 8,
                            }}
                          />
                          {manualDomainError ? (
                            <p
                              id="onboard-manual-domain-error"
                              role="alert"
                              style={{
                                margin: "8px 0 0",
                                fontSize: 12,
                                color: SIGNAL.negative,
                              }}
                            >
                              {manualDomainError}
                            </p>
                          ) : null}
                        </div>
                      )}

                      {searchState === "searching" && (
                        <div style={{ padding: "48px 0", textAlign: "center" }}>
                          {crunchbaseBannerMessage ? (
                            <div
                              role="status"
                              aria-live="polite"
                              style={{
                                ...crunchbaseBannerStyle,
                                marginBottom: 28,
                                textAlign: "left",
                              }}
                            >
                              {crunchbaseBannerMessage}
                            </div>
                          ) : null}
                          <div
                            style={{
                              position: "relative",
                              width: 80,
                              height: 80,
                              margin: "0 auto 24px",
                            }}
                          >
                            <div
                              className="of-spin"
                              style={{
                                width: 80,
                                height: 80,
                                borderRadius: "50%",
                                border: `3px solid ${SIGNAL.accent}1A`,
                                borderTop: `3px solid ${SIGNAL.positive}`,
                                position: "absolute",
                              }}
                            />
                            <div
                              className="of-spin"
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                border: `2px solid ${SIGNAL.accent}0F`,
                                borderBottom: `2px solid ${SIGNAL.accent}66`,
                                position: "absolute",
                                top: 12,
                                left: 12,
                                animationDirection: "reverse",
                                animationDuration: "0.65s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 17,
                              fontWeight: 700,
                              color: SIGNAL.ink,
                              marginBottom: 6,
                            }}
                          >
                            {`Building ${companyQuery}'s profile…`}
                          </div>
                          <div style={{ fontSize: 13, color: SIGNAL.muted }}>
                            Matching you to a real peer cohort so your first
                            benchmark means something
                          </div>
                        </div>
                      )}

                      {searchState === "review" && (
                        <div>
                          {crunchbaseBannerMessage ? (
                            <div
                              role="status"
                              aria-live="polite"
                              style={{
                                ...crunchbaseBannerStyle,
                                marginBottom: 20,
                              }}
                            >
                              {crunchbaseBannerMessage}
                            </div>
                          ) : null}
                          <div style={{ marginBottom: 24 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 8,
                              }}
                            >
                              <div
                                className={
                                  crunchbaseBannerKind === "in_progress"
                                    ? "of-pulse"
                                    : undefined
                                }
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background:
                                    crunchbaseBannerKind === "in_progress"
                                      ? SIGNAL.warn
                                      : SIGNAL.positive,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color:
                                    crunchbaseBannerKind === "in_progress"
                                      ? SIGNAL.warn
                                      : SIGNAL.positive,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {crunchbaseBannerKind === "in_progress"
                                  ? "Enriching in background"
                                  : "Profile ready"}
                              </span>
                            </div>
                            <h2
                              style={{
                                fontSize: 34,
                                fontWeight: 800,
                                color: SIGNAL.ink,
                                margin: "0 0 8px",
                                letterSpacing: "-0.4px",
                                lineHeight: 1.15,
                              }}
                            >
                              Review your {profileForm.company} profile.
                            </h2>
                            <p
                              style={{
                                fontSize: 15,
                                color: SIGNAL.muted,
                                margin: 0,
                                lineHeight: 1.6,
                              }}
                            >
                              The more accurate this is, the tighter your peer
                              cohort. Garbage in, garbage out.
                            </p>
                          </div>

                          <Field
                            label="Company"
                            required
                            error={profileFieldErrors.company}
                          >
                            <input
                              className="of-input"
                              value={profileForm.company}
                              onChange={(e) => setPF("company", e.target.value)}
                              aria-invalid={!!profileFieldErrors.company}
                              style={profileFieldInputStyle(
                                !!profileFieldErrors.company,
                              )}
                            />
                          </Field>

                          <Field
                            label="What they do"
                            required
                            error={profileFieldErrors.whatTheyDo}
                          >
                            <textarea
                              className="of-input"
                              value={profileForm.whatTheyDo}
                              onChange={(e) =>
                                setPF("whatTheyDo", e.target.value)
                              }
                              rows={3}
                              aria-invalid={!!profileFieldErrors.whatTheyDo}
                              style={{
                                ...profileFieldInputStyle(
                                  !!profileFieldErrors.whatTheyDo,
                                ),
                                resize: "vertical",
                                lineHeight: 1.65,
                              }}
                            />
                          </Field>

                          <div style={{ marginBottom: 20 }}>
                            <label
                              style={{
                                display: "block",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#8FA99A",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: 9,
                              }}
                            >
                              Organization type
                              <span
                                style={{
                                  color: SIGNAL.negative,
                                  marginLeft: 3,
                                }}
                              >
                                *
                              </span>
                            </label>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 7,
                                ...(profileFieldErrors.businessModel
                                  ? {
                                      borderRadius: 10,
                                      boxShadow: `0 0 0 1px ${SIGNAL.negative}`,
                                      padding: 2,
                                    }
                                  : null),
                              }}
                            >
                              {BUSINESS_MODELS.map((bm) => {
                                const on =
                                  profileForm.businessModel === bm.label;
                                return (
                                  <button
                                    key={bm.id}
                                    type="button"
                                    className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`}
                                    onClick={() => {
                                      selectBusinessModel(bm.label);
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 13,
                                      padding: "14px 16px",
                                      borderRadius: 10,
                                      textAlign: "left",
                                      background: on
                                        ? `${SELECT_ACCENT}14`
                                        : "transparent",
                                      border: on
                                        ? `1.5px solid ${SELECT_ACCENT}`
                                        : "1.5px solid rgba(255,255,255,0.12)",
                                      cursor: "pointer",
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: "50%",
                                        flexShrink: 0,
                                        marginTop: 1,
                                        border: on
                                          ? `2px solid ${SELECT_ACCENT}`
                                          : "2px solid rgba(255,255,255,0.15)",
                                        background: on
                                          ? `${SELECT_ACCENT}33`
                                          : "transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {on && (
                                        <div
                                          style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            background: SELECT_ACCENT,
                                          }}
                                        />
                                      )}
                                    </div>
                                    <div>
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 700,
                                          color: on ? "#F2F5F2" : "#8FA99A",
                                          marginBottom: 2,
                                        }}
                                      >
                                        {bm.label}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: "#3A4F5E",
                                          lineHeight: 1.5,
                                        }}
                                      >
                                        {bm.desc}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {profileFieldErrors.businessModel && (
                              <div
                                role="alert"
                                style={{
                                  fontSize: 12,
                                  color: SIGNAL.negative,
                                  marginTop: 6,
                                  lineHeight: 1.4,
                                }}
                              >
                                {profileFieldErrors.businessModel}
                              </div>
                            )}
                          </div>

                          <Field
                            label="Industry"
                            required
                            error={profileFieldErrors.industry}
                          >
                            <input
                              className="of-input"
                              value={profileForm.industry}
                              onChange={(e) =>
                                setPF("industry", e.target.value)
                              }
                              aria-invalid={!!profileFieldErrors.industry}
                              style={profileFieldInputStyle(
                                !!profileFieldErrors.industry,
                              )}
                            />
                          </Field>

                          <div
                            className="of-profile-split"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "0 16px",
                            }}
                          >
                            <Field
                              label="Founded"
                              required
                              error={profileFieldErrors.founded}
                            >
                              <input
                                className="of-input"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={profileForm.founded}
                                onChange={(e) =>
                                  setPF(
                                    "founded",
                                    filterFoundedYearInput(e.target.value),
                                  )
                                }
                                placeholder="2021"
                                aria-invalid={!!profileFieldErrors.founded}
                                style={profileFieldInputStyle(
                                  !!profileFieldErrors.founded,
                                )}
                              />
                            </Field>
                            <Field
                              label="Country"
                              required
                              error={profileFieldErrors.country}
                            >
                              <OnboardSearchableCombobox
                                value={profileForm.country}
                                options={countryOptions}
                                onChange={setCountry}
                                placeholder="United States"
                                invalid={!!profileFieldErrors.country}
                                inputStyle={profileFieldInputStyle(
                                  !!profileFieldErrors.country,
                                )}
                              />
                            </Field>
                            <Field
                              label="State / Region"
                              required={stateRequired}
                              error={profileFieldErrors.stateRegion}
                            >
                              <OnboardSearchableCombobox
                                value={profileForm.stateRegion}
                                options={stateOptions}
                                onChange={setStateRegion}
                                disabled={!countrySelected || !hasStates}
                                placeholder={
                                  !countrySelected
                                    ? "Select a country first"
                                    : hasStates
                                      ? "Massachusetts"
                                      : "Not applicable"
                                }
                                invalid={!!profileFieldErrors.stateRegion}
                                inputStyle={profileFieldInputStyle(
                                  !!profileFieldErrors.stateRegion,
                                )}
                              />
                            </Field>
                            <Field
                              label="City"
                              required
                              error={profileFieldErrors.city}
                            >
                              <input
                                className="of-input"
                                value={profileForm.city}
                                onChange={(e) => setPF("city", e.target.value)}
                                placeholder="Boston"
                                disabled={!cityEnabled}
                                aria-invalid={!!profileFieldErrors.city}
                                style={{
                                  ...profileFieldInputStyle(
                                    !!profileFieldErrors.city,
                                  ),
                                  opacity: cityEnabled ? 1 : 0.45,
                                  cursor: cityEnabled
                                    ? undefined
                                    : "not-allowed",
                                }}
                              />
                            </Field>
                          </div>

                          <Field
                            label="Website"
                            required
                            error={profileFieldErrors.website}
                          >
                            <input
                              className="of-input"
                              value={profileForm.website}
                              onChange={(e) => setPF("website", e.target.value)}
                              aria-invalid={!!profileFieldErrors.website}
                              style={profileFieldInputStyle(
                                !!profileFieldErrors.website,
                              )}
                            />
                          </Field>

                          <Field label="LinkedIn">
                            <input
                              className="of-input"
                              value={profileForm.linkedin}
                              onChange={(e) =>
                                setPF("linkedin", e.target.value)
                              }
                              placeholder="https://linkedin.com/company/patriotpay"
                              style={inp()}
                            />
                          </Field>

                          {/* Funding rounds */}
                          <div style={{ marginBottom: 20 }}>
                            <label
                              style={{
                                display: "block",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#8FA99A",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: 9,
                              }}
                            >
                              Funding rounds
                            </label>
                            {fundingRounds.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                  marginBottom: 8,
                                }}
                              >
                                {fundingRounds.map((r) => (
                                  <div
                                    key={r.id}
                                    style={{
                                      background: "#1A2D3F",
                                      border:
                                        "1px solid rgba(255,255,255,0.07)",
                                      borderRadius: 9,
                                      padding: "11px 13px",
                                    }}
                                  >
                                    <div
                                      className="of-funding-row"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "110px 90px 120px 1fr 28px",
                                        gap: 8,
                                        alignItems: "center",
                                      }}
                                    >
                                      <select
                                        value={r.type}
                                        onChange={(e) =>
                                          updateRound(
                                            r.id,
                                            "type",
                                            e.target.value,
                                          )
                                        }
                                        style={{
                                          ...inp(),
                                          padding: "7px 9px",
                                          cursor: "pointer",
                                        }}
                                      >
                                        {ROUND_TYPES.map((t) => (
                                          <option key={t} value={t}>
                                            {t}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        maxLength={
                                          BENCHMARK_NUMERIC_INPUT_MAX_LENGTH
                                        }
                                        value={r.amount}
                                        onChange={(e) =>
                                          updateRoundAmount(
                                            r.id,
                                            e.target.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "-" ||
                                            e.key === "e" ||
                                            e.key === "E"
                                          ) {
                                            e.preventDefault();
                                          }
                                        }}
                                        placeholder="$4.2M"
                                        style={{
                                          ...inp(),
                                          padding: "7px 10px",
                                        }}
                                      />
                                      <DatePicker
                                        t={SIGNAL}
                                        aria-label="Funding round date"
                                        value={toFundingRoundDateInputValue(
                                          r.date,
                                        )}
                                        onChange={(ymd) =>
                                          updateRoundDate(r.id, ymd)
                                        }
                                        onClear={() => updateRoundDate(r.id, "")}
                                        placeholder="Pick a date"
                                        triggerStyle={{
                                          ...inp(),
                                          padding: "7px 10px",
                                          fontSize: 12,
                                          fontWeight: 500,
                                          width: "100%",
                                        }}
                                      />
                                      <input
                                        value={r.investors}
                                        onChange={(e) =>
                                          updateRound(
                                            r.id,
                                            "investors",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Investors"
                                        style={{
                                          ...inp(),
                                          padding: "7px 10px",
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeRound(r.id)}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: SIGNAL.muted,
                                          fontSize: 16,
                                          cursor: "pointer",
                                          padding: 0,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              className="of-add-round"
                              onClick={addRound}
                              style={{
                                background: "none",
                                border: `1px dashed ${SIGNAL.borderSubtle}`,
                                borderRadius: 8,
                                padding: "9px 18px",
                                fontSize: 13,
                                color: SIGNAL.muted,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                transition: "all 0.15s",
                              }}
                            >
                              <span style={{ fontSize: 16, lineHeight: 1 }}>
                                +
                              </span>{" "}
                              Add round
                            </button>
                          </div>

                          <Field label="Additional context">
                            <textarea
                              className="of-input"
                              value={profileForm.additionalContext}
                              onChange={(e) =>
                                setPF("additionalContext", e.target.value)
                              }
                              placeholder="Customers, priorities, markets, or anything Fuel should remember."
                              rows={3}
                              style={{
                                ...inp(),
                                resize: "vertical",
                                lineHeight: 1.65,
                              }}
                            />
                          </Field>

                          <div
                            style={{
                              padding: "11px 14px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 8,
                              fontSize: 12,
                              color: SIGNAL.muted,
                              lineHeight: 1.6,
                            }}
                          >
                            Teammates can create their own profiles for the same
                            company once{" "}
                            <span style={{ color: SIGNAL.inkSoft }}>
                              {profileForm.company}
                            </span>{" "}
                            is linked.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DEVELOPMENT — all questions grouped */}
                  {stepId === "development" && (
                    <div>
                      <StepHeading meta={STEP_META.development} />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="Where is your product today?"
                        options={[...DEV_PRODUCT_STAGES]}
                        value={answers.productStage}
                        onChange={(v) => setAns("productStage", v)}
                        columns={1}
                      />
                      <FigmaQuestion
                        grouped
                        title="What type of product are you building?"
                        options={[...DEV_PRODUCT_TYPES]}
                        value={answers.productType}
                        onChange={(v) => setAns("productType", v)}
                      />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="What is the primary constraint slowing down your product delivery?"
                        options={[...DEV_DELIVERY_CONSTRAINTS]}
                        value={answers.productChallenge}
                        onChange={(v) => setAns("productChallenge", v)}
                        columns={1}
                      />
                    </div>
                  )}

                  {/* GTM — all questions grouped */}
                  {stepId === "gtm" && (
                    <div>
                      <StepHeading meta={STEP_META.gtm} />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="What is your primary go-to-market motion?"
                        options={[...MKT_SALES_MOTIONS]}
                        value={answers.salesMotion}
                        onChange={(v) => setAns("salesMotion", v)}
                      />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="Where is your biggest growth bottleneck today?"
                        options={[...MKT_GROWTH_BOTTLENECKS]}
                        value={answers.funnelBreakdown}
                        onChange={(v) => setAns("funnelBreakdown", v)}
                        columns={1}
                      />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="How clear is your ideal customer profile, including who buys and why?"
                        options={[...MKT_ICP_CLARITY_OPTIONS]}
                        value={answers.icpClarity}
                        onChange={(v) => setAns("icpClarity", v)}
                        columns={1}
                      />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="How do you track and close revenue today?"
                        options={[...MKT_REVENUE_TRACKING_OPTIONS]}
                        value={answers.revenueTracking}
                        onChange={(v) => setAns("revenueTracking", v)}
                        columns={1}
                      />
                    </div>
                  )}

                  {/* REVOPS / G&A — all questions grouped */}
                  {stepId === "revops" && (
                    <div>
                      <StepHeading meta={STEP_META.revops} />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="How long is your current runway?"
                        options={[...REV_RUNWAY_OPTIONS]}
                        value={answers.runway}
                        onChange={(v) => setAns("runway", v)}
                      />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="How mature is your finance operation today?"
                        options={[...REV_FINANCE_MANAGEMENT_OPTIONS]}
                        value={answers.financeManagement}
                        onChange={(v) => setAns("financeManagement", v)}
                        columns={1}
                      />
                      <FigmaQuestion
                        grouped
                        allowUnknown
                        title="What is your near-term capital and reporting priority?"
                        options={[...REV_CAPITAL_PRIORITY_OPTIONS]}
                        value={answers.capitalPriority}
                        onChange={(v) => setAns("capitalPriority", v)}
                        columns={1}
                      />
                    </div>
                  )}

                  {/* INVESTMENT — one question at a time */}
                  {stepId === "investment" && (
                    <div className="of-step" key={investQ}>
                      {investQ === 0 && (
                        <FigmaMultiSelect
                          allowUnknown
                          title="What stages do you typically invest in?"
                          subtitle="Select all that apply."
                          options={[
                            "Pre-seed / Seed",
                            "Series A / B",
                            "Growth / Series C+",
                          ]}
                          selected={investStages}
                          unknownSelected={investStages.includes(
                            ONBOARD_UNKNOWN_ANSWER,
                          )}
                          onUnknownSelect={() =>
                            setInvestStages([ONBOARD_UNKNOWN_ANSWER])
                          }
                          onToggle={(s) => {
                            if (investStages.includes(ONBOARD_UNKNOWN_ANSWER)) {
                              setInvestStages([s]);
                              return;
                            }
                            if (investStages.includes(s))
                              setInvestStages((p) => p.filter((x) => x !== s));
                            else setInvestStages((p) => [...p, s]);
                          }}
                        />
                      )}

                      {investQ === 1 && (
                        <FigmaMultiSelect
                          allowUnknown
                          title="What sectors are you most active in?"
                          subtitle="Pick up to 3."
                          options={[
                            "SaaS / Software",
                            "FinTech",
                            "Healthcare",
                            "Deep tech / AI",
                            "Consumer",
                            "Other",
                          ]}
                          selected={investSectors}
                          unknownSelected={investSectors.includes(
                            ONBOARD_UNKNOWN_ANSWER,
                          )}
                          onUnknownSelect={() =>
                            setInvestSectors([ONBOARD_UNKNOWN_ANSWER])
                          }
                          onToggle={(s) => {
                            if (
                              investSectors.includes(ONBOARD_UNKNOWN_ANSWER)
                            ) {
                              setInvestSectors([s]);
                              return;
                            }
                            const isOther = isOtherSpecifyOption(s);
                            const already = isOther
                              ? investSectors.some((part) =>
                                  isOtherSpecifySelected(part, s),
                                )
                              : investSectors.includes(s);
                            if (already) {
                              setInvestSectors((p) =>
                                p.filter((x) =>
                                  isOther
                                    ? !isOtherSpecifySelected(x, s)
                                    : x !== s,
                                ),
                              );
                              return;
                            }
                            if (investSectors.length < 3)
                              setInvestSectors((p) => [...p, s]);
                          }}
                          onOtherTextChange={(otherOpt, text) => {
                            setInvestSectors((prev) => {
                              const without = prev.filter(
                                (x) => !isOtherSpecifySelected(x, otherOpt),
                              );
                              return [
                                ...without,
                                formatOtherSpecifyAnswer(otherOpt, text),
                              ];
                            });
                          }}
                          max={3}
                        />
                      )}

                      {investQ === 2 && (
                        <FigmaQuestion
                          allowUnknown
                          title="What is your typical check size?"
                          options={[
                            "Under $500K",
                            "$500K – $2M",
                            "$2M – $10M",
                            "Over $10M",
                          ]}
                          value={answers.investCheckSize}
                          onChange={(v) => setAns("investCheckSize", v)}
                        />
                      )}

                      {investQ === 3 && (
                        <FigmaQuestion
                          allowUnknown
                          title="Where do you primarily invest?"
                          options={[
                            "United States",
                            "North America",
                            "Europe",
                            "Global",
                          ]}
                          value={answers.investGeography}
                          onChange={(v) => setAns("investGeography", v)}
                        />
                      )}

                      {investQ === 4 && (
                        <FigmaQuestion
                          allowUnknown
                          title="How are you managing your deal pipeline?"
                          options={[
                            "HubSpot",
                            "Another CRM",
                            "Spreadsheet",
                            "Not yet",
                          ]}
                          value={answers.investPipeline}
                          onChange={(v) => setAns("investPipeline", v)}
                          hint={
                            showHubSpotPipelineHint(answers.investPipeline)
                              ? "We'll connect HubSpot in the next step to load your pipeline."
                              : undefined
                          }
                        />
                      )}
                    </div>
                  )}

                  {/* BENCHMARKING — operating companies only */}
                  {stepId === "benchmarking" && (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <h2
                          style={{
                            fontSize: 38,
                            fontWeight: 800,
                            color: "#F2F5F2",
                            margin: "0 0 10px",
                            letterSpacing: "-0.5px",
                            lineHeight: 1.1,
                          }}
                        >
                          How do you stack up?
                        </h2>
                        <p
                          style={{
                            fontSize: 16,
                            color: "#556878",
                            margin: 0,
                            lineHeight: 1.55,
                          }}
                        >
                          Enter your numbers - the graph shows where you sit.
                          Fuel builds your intelligence, initiatives, and
                          playbooks behind the scenes. You unlock everything in
                          your scorecard.
                        </p>
                      </div>

                      <div
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(43,184,160,0.1) 0%, rgba(61,214,140,0.06) 100%)",
                          border: "1px solid rgba(43,184,160,0.25)",
                          borderRadius: 12,
                          padding: "14px 18px",
                          marginBottom: 22,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#2BB8A0",
                            marginBottom: 4,
                          }}
                        >
                          ✦ The more you share, the sharper your intelligence
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8FA99A",
                            lineHeight: 1.6,
                          }}
                        >
                          Every number narrows your cohort. Once all metrics are
                          entered, Fuel builds your{" "}
                          <strong style={{ color: "#F2F5F2" }}>
                            intelligence
                          </strong>
                          , suggested{" "}
                          <strong style={{ color: "#F2F5F2" }}>
                            initiatives
                          </strong>
                          , and{" "}
                          <strong style={{ color: "#F2F5F2" }}>
                            playbooks
                          </strong>{" "}
                          on the right. This step is optional.
                        </div>
                      </div>

                      {allCohorts.length > 0 ? (
                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontFamily: "inherit",
                            fontSize: 11,
                            color: SIGNAL.muted,
                            marginBottom: 18,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: SIGNAL.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.4px",
                            }}
                          >
                            Cohort
                          </span>
                          <div style={{ position: "relative", width: "100%" }}>
                            <select
                              value={cohortKey ?? ""}
                              aria-label="Benchmark cohort"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) void handleCohortChange(val);
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor =
                                  SIGNAL.accent;
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor =
                                  SIGNAL.borderFaint;
                              }}
                              style={{
                                WebkitAppearance: "none",
                                appearance: "none",
                                background: SIGNAL.panelAlt,
                                border: `1px solid ${SIGNAL.borderFaint}`,
                                borderRadius: 8,
                                color: SIGNAL.ink,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize: 13,
                                fontWeight: 500,
                                height: 40,
                                outline: "none",
                                padding: "8px 34px 8px 12px",
                                transition: "border-color 0.15s ease",
                                width: "100%",
                              }}
                            >
                              {allCohorts.map((c) => (
                                <option key={c.cohortKey} value={c.cohortKey}>
                                  {formatCohortOptionLabel(
                                    c.dimensions,
                                    c.cohortKey,
                                    c.sampleSize,
                                  )}
                                </option>
                              ))}
                            </select>
                            <span
                              aria-hidden="true"
                              style={{
                                color: SIGNAL.ink,
                                fontFamily: "inherit",
                                fontSize: 18,
                                fontWeight: 700,
                                lineHeight: 1,
                                pointerEvents: "none",
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                              }}
                            >
                              ▾
                            </span>
                          </div>
                        </label>
                      ) : null}

                      {benchmarkMetricsWithCohort.map((m) => {
                        const raw = answers[m.key] || "";
                        const metricUnknown = isUnknownAnswer(raw);
                        const val = parseVal(raw);
                        const hasVal = val !== null;
                        const displayMax = m.p90 * 1.3;
                        const p25pct = (m.p25 / displayMax) * 100;
                        const p75pct = (m.p75 / displayMax) * 100;
                        const p90pct = (m.p90 / displayMax) * 100;
                        const dotPct = hasVal
                          ? Math.min(Math.max((val! / displayMax) * 100, 1), 99)
                          : null;
                        const dc = hasVal
                          ? cohortDotColor(
                              val!,
                              m.p25,
                              m.p50,
                              m.p75,
                              Boolean(m.lowerIsBetter),
                            )
                          : "#3A4F5E";
                        return (
                          <div key={m.key} style={{ marginBottom: 14 }}>
                            {/* Label row */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                marginBottom: 5,
                              }}
                            >
                              <label
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#8FA99A",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                }}
                              >
                                {m.label}
                              </label>
                              <UnknownCheckboxControl
                                checked={metricUnknown}
                                onChange={(next) => {
                                  if (next)
                                    setAns(m.key, ONBOARD_UNKNOWN_ANSWER);
                                  else setAns(m.key, "");
                                }}
                              />
                            </div>
                            {/* Input — stays editable while NA so typing clears the checkbox */}
                            <input
                              className="of-input"
                              type="text"
                              inputMode="decimal"
                              maxLength={BENCHMARK_NUMERIC_INPUT_MAX_LENGTH}
                              value={metricUnknown ? "" : raw}
                              onChange={(e) => {
                                const next = sanitizeBenchmarkNumericInput(
                                  e.target.value,
                                );
                                if (next === null) return;
                                // Any numeric entry replaces __unknown__ → NA unchecks
                                setAns(m.key, next);
                              }}
                              onKeyDown={(e) => {
                                if (
                                  e.key === "-" ||
                                  e.key === "e" ||
                                  e.key === "E"
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              placeholder={
                                metricUnknown
                                  ? ONBOARD_UNKNOWN_PLACEHOLDER
                                  : m.ph
                              }
                              style={{
                                ...inp(),
                                padding: "8px 12px",
                                fontSize: 13,
                                marginBottom: 7,
                                borderColor: hasVal ? `${dc}55` : undefined,
                                transition: "border-color 0.3s",
                              }}
                            />
                            {/* Bar */}
                            <BenchmarkTrackHover
                              cohort={{
                                p25: m.p25,
                                p50: m.p50,
                                p75: m.p75,
                                p90: m.p90,
                              }}
                              unit="usd"
                              lowerIsBetter={Boolean(m.lowerIsBetter)}
                              formatValue={(v) => formatBenchmarkP(v, m.unit)}
                              colors={{
                                indicator: SIGNAL.inkSoft,
                                tooltipBg: SIGNAL.panel,
                                tooltipBorder: SIGNAL.rule,
                                title: SIGNAL.ink,
                                body: SIGNAL.muted,
                                shadow: `0 8px 24px ${SIGNAL.overlay}`,
                              }}
                            >
                              <div
                                style={{
                                  position: "relative",
                                  height: 7,
                                  background: "rgba(255,255,255,0.04)",
                                  borderRadius: 4,
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    left: `${p25pct}%`,
                                    top: 0,
                                    width: `${p75pct - p25pct}%`,
                                    height: "100%",
                                    background: "rgba(61,214,140,0.2)",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    left: `${p75pct}%`,
                                    top: 0,
                                    width: `${p90pct - p75pct}%`,
                                    height: "100%",
                                    background: "rgba(61,214,140,0.35)",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    left: `${p90pct}%`,
                                    top: 0,
                                    right: 0,
                                    height: "100%",
                                    background: "rgba(61,214,140,0.12)",
                                    borderRadius: "0 4px 4px 0",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    left: `${p25pct}%`,
                                    top: 0,
                                    width: 1,
                                    height: "100%",
                                    background: "rgba(61,214,140,0.3)",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    left: `${p75pct}%`,
                                    top: 0,
                                    width: 1,
                                    height: "100%",
                                    background: "rgba(61,214,140,0.45)",
                                  }}
                                />
                                {dotPct !== null && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: -5,
                                      zIndex: 2,
                                      left: `calc(${dotPct}% - 8px)`,
                                      width: 17,
                                      height: 17,
                                      borderRadius: "50%",
                                      background: dc,
                                      border: "2px solid #0F1E2B",
                                      boxShadow: cohortDotGlow(
                                        val!,
                                        m.p25,
                                        m.p50,
                                        m.p75,
                                        Boolean(m.lowerIsBetter),
                                      ),
                                      transition:
                                        "left 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.3s, box-shadow 0.3s",
                                    }}
                                  />
                                )}
                              </div>
                            </BenchmarkTrackHover>
                            {/* P labels */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 3,
                              }}
                            >
                              {[
                                { l: "P25", v: m.p25 },
                                { l: "P75", v: m.p75 },
                                { l: "P90", v: m.p90 },
                              ].map((p) => (
                                <span
                                  key={p.l}
                                  style={{ fontSize: 11, color: SIGNAL.muted }}
                                >
                                  {p.l} {formatBenchmarkP(p.v, m.unit)}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: SIGNAL.muted,
                        }}
                      >
                        Numbers stay in your workspace and are never shared
                        externally.
                      </div>
                    </div>
                  )}

                  {/* HUBSPOT — investors final step */}
                  {stepId === "hubspot" && (
                    <div>
                      <h2
                        className="of-figma-q-title"
                        style={{ marginBottom: 12 }}
                      >
                        Connect HubSpot
                      </h2>
                      <p
                        className="of-figma-q-sub"
                        style={{ marginBottom: 28 }}
                      >
                        Load your deal pipeline into Fuel. Contacts, companies,
                        deal stages, and notes sync automatically.
                      </p>

                      <div
                        style={{
                          background:
                            hubspotStatus === "connected"
                              ? "rgba(61,214,140,0.06)"
                              : "#1A2D3F",
                          border:
                            hubspotStatus === "connected"
                              ? "1.5px solid rgba(61,214,140,0.35)"
                              : "1.5px solid rgba(255,255,255,0.1)",
                          borderRadius: 14,
                          padding: "22px 20px",
                          marginBottom: 22,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            marginBottom: 18,
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              flexShrink: 0,
                              background: "#FF7A5922",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#FF7A59",
                            }}
                          >
                            HS
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: "#F2F5F2",
                              }}
                            >
                              HubSpot CRM
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#8FA99A",
                                marginTop: 2,
                              }}
                            >
                              Deal pipeline · contacts · companies
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color:
                                hubspotStatus === "connected"
                                  ? "#3DD68C"
                                  : hubspotStatus === "connecting"
                                    ? "#D4924A"
                                    : "#556878",
                              background:
                                hubspotStatus === "connected"
                                  ? "rgba(61,214,140,0.1)"
                                  : hubspotStatus === "connecting"
                                    ? "rgba(212,146,74,0.1)"
                                    : "rgba(255,255,255,0.04)",
                              borderRadius: 6,
                              padding: "3px 9px",
                            }}
                          >
                            {hubspotStatus === "connected"
                              ? "Connected"
                              : hubspotStatus === "connecting"
                                ? "Connecting…"
                                : "Not connected"}
                          </span>
                        </div>

                        {hubspotStatus === "pending" && (
                          <button
                            type="button"
                            onClick={connectHubSpot}
                            style={{
                              width: "100%",
                              background: "#FF7A59",
                              color: "#fff",
                              border: "none",
                              borderRadius: 10,
                              padding: "13px 20px",
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Connect with HubSpot
                          </button>
                        )}

                        {hubspotStatus === "connecting" && (
                          <div
                            style={{
                              height: 4,
                              background: "rgba(255,255,255,0.06)",
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              className="of-hubspot-bar"
                              style={{
                                height: "100%",
                                background:
                                  "linear-gradient(90deg, #FF7A59, #FFB199)",
                                borderRadius: 2,
                                animation:
                                  "ofHubspotLoad 1.8s ease-in-out forwards",
                              }}
                            />
                          </div>
                        )}

                        {hubspotStatus === "connected" && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#3DD68C",
                              lineHeight: 1.55,
                            }}
                          >
                            ✓ Pipeline synced — {24} deals, {156} contacts
                            loaded into Fuel.
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#8FA99A",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: 10,
                        }}
                      >
                        What Fuel pulls in
                      </div>
                      {[
                        "Deal stages & pipeline health",
                        "Contacts & company records",
                        "Activity notes & task history",
                        "Owner assignments & deal values",
                      ].map((item) => (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#FF7A59",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, color: "#8FA99A" }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SOURCES — founders after benchmarking */}
                  {stepId === "sources" && (
                    <div>
                      <h2
                        className="of-figma-q-title"
                        style={{ marginBottom: 12 }}
                      >
                        Power your intelligence
                      </h2>
                      <p
                        className="of-figma-q-sub"
                        style={{ marginBottom: 28 }}
                      >
                        Integrate these sources for sharper{" "}
                        <strong style={{ color: "#F2F5F2", fontWeight: 600 }}>
                          intelligence
                        </strong>
                        ,{" "}
                        <strong style={{ color: "#F2F5F2", fontWeight: 600 }}>
                          initiatives
                        </strong>
                        , and{" "}
                        <strong style={{ color: "#F2F5F2", fontWeight: 600 }}>
                          playbooks
                        </strong>
                        .
                      </p>

                      {[
                        {
                          id: "granola" as const,
                          name: "Granola",
                          category: "meetings",
                          color: "#D4924A",
                          abbr: "G",
                          description:
                            "When you meet with someone from a company on your watchlist or in a portfolio, the Granola summary auto-syncs to that company's private sources.",
                          status: granolaStatus,
                        },
                        {
                          id: "slack" as const,
                          name: "Slack",
                          category: "chat",
                          color: ONBOARD_SLACK_BRAND,
                          abbr: "S",
                          description:
                            "Monitor channels where investor updates land. Each message becomes a source item for intelligence, initiatives and playbooks and is extracted against the signal catalog.",
                          status: slackStatus,
                        },
                      ].map((src, idx, arr) => {
                        const connected = src.status === "connected";
                        const connecting = src.status === "connecting";
                        const connect = () => connectSource(src.id);
                        return (
                          <div
                            key={src.id}
                            style={{
                              background: connected
                                ? "rgba(61,214,140,0.06)"
                                : "#1A2D3F",
                              border: connected
                                ? "1.5px solid rgba(61,214,140,0.35)"
                                : "1.5px solid rgba(255,255,255,0.1)",
                              borderRadius: 14,
                              padding: "20px 18px",
                              marginBottom: idx < arr.length - 1 ? 14 : 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 14,
                                marginBottom: 14,
                              }}
                            >
                              <div
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 10,
                                  flexShrink: 0,
                                  background: `${src.color}22`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: src.color,
                                }}
                              >
                                {src.abbr}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 6,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 15,
                                      fontWeight: 700,
                                      color: "#F2F5F2",
                                    }}
                                  >
                                    {src.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: src.color,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.4px",
                                      background: `${src.color}18`,
                                      border: `1px solid ${src.color}33`,
                                      borderRadius: 5,
                                      padding: "2px 7px",
                                    }}
                                  >
                                    {src.category}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    fontSize: 13,
                                    color: "#8FA99A",
                                    margin: 0,
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {src.description}
                                </p>
                              </div>
                            </div>

                            {src.status === "pending" && (
                              <button
                                type="button"
                                onClick={connect}
                                style={{
                                  width: "100%",
                                  background: `${src.color}26`,
                                  color: src.color,
                                  border: `1px solid ${src.color}59`,
                                  borderRadius: 10,
                                  padding: "12px 20px",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                Connect
                              </button>
                            )}

                            {connecting && (
                              <div
                                style={{
                                  height: 4,
                                  background: "rgba(255,255,255,0.06)",
                                  borderRadius: 2,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  className="of-hubspot-bar"
                                  style={{
                                    height: "100%",
                                    background: `linear-gradient(90deg, ${src.color}, ${src.color}88)`,
                                    borderRadius: 2,
                                    animation:
                                      "ofHubspotLoad 1.6s ease-in-out forwards",
                                  }}
                                />
                              </div>
                            )}

                            {connected && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#3DD68C",
                                  lineHeight: 1.55,
                                }}
                              >
                                ✓ {src.name} connected — syncing to private
                                sources.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>

            {/* Bottom bar — back + progress + CTA */}
            <div style={onboardV2BottomBar(narrow)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: narrow ? 12 : 16,
                  minWidth: 0,
                  flex: narrow ? "1 1 100%" : undefined,
                }}
              >
                {showBack && (
                  <button
                    className="of-back"
                    onClick={back}
                    aria-label="Back"
                    style={{
                      background: "none",
                      border: "none",
                      color: SIGNAL.muted,
                      fontSize: 18,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      lineHeight: 1,
                      padding: narrow ? "10px 4px" : 0,
                      minWidth: narrow ? 44 : undefined,
                      minHeight: narrow ? 44 : undefined,
                      flexShrink: 0,
                    }}
                  >
                    ←
                  </button>
                )}
                <div
                  className={narrow ? "of-mobile-progress" : undefined}
                  style={{
                    width: narrow ? undefined : 160,
                    height: 3,
                    background: SIGNAL.borderFaint,
                    borderRadius: 2,
                    overflow: "hidden",
                    flexShrink: narrow ? 1 : 0,
                    flex: narrow ? "1 1 auto" : undefined,
                    minWidth: narrow ? 0 : undefined,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      background: `linear-gradient(90deg, ${SIGNAL.accent}, ${SIGNAL.positive})`,
                      width: `${progressPct}%`,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: SIGNAL.mutedSoft,
                    flexShrink: 0,
                  }}
                >
                  {progressLabelCurrent} / {progressLabelTotal}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexShrink: 0,
                  width: narrow ? "100%" : undefined,
                  justifyContent: narrow ? "stretch" : undefined,
                }}
              >
                {stepId === "benchmarking" && (
                  <span style={{ fontSize: 12, color: SIGNAL.muted }}>
                    {benchmarkGenerating ? "Generating…" : "Optional"}
                  </span>
                )}
                {showConnectLater && (
                  <button
                    type="button"
                    onClick={skipConnectors}
                    style={{
                      fontSize: 12,
                      color: SIGNAL.ink,
                      textDecoration: "underline",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: 0,
                    }}
                  >
                    Connect later
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={!canAdvance()}
                  className={narrow ? "of-mobile-cta" : undefined}
                  style={onboardV2PrimaryCta(
                    canAdvance(),
                    narrow
                      ? {
                          width: "100%",
                          minHeight: 48,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }
                      : undefined,
                  )}
                >
                  {ctaLabel}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT (motion) — desktop / large tablet only ── */}
          {!narrow ? (
            <div style={onboardMotionRightPanel()}>
              <div
                className="of-step"
                key={`g-${stepId}-${searchState}-${currentSubQ}-${hubspotStatus}-${granolaStatus}-${slackStatus}-${benchmarkGenerating}-${benchmarkSummaryReady}`}
                style={{ width: "100%", height: "100%", display: "flex" }}
              >
                {rightPanel[stepId]}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
