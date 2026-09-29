"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { MagicSourceChip } from "@/components/ai";
import { OnboardSearchableCombobox } from "@/components/onboard/OnboardSearchableCombobox";
import {
  BUSINESS_MODELS,
  BUSINESS_MODEL_DESCRIPTIONS,
  BUSINESS_MODEL_LABELS,
  type BusinessModel,
} from "@/lib/business-model";
import type { BenchmarkHints } from "@/lib/agent/skills/extractBenchmarkHints";
import type { ExtractCompanyProfileResult } from "@/lib/agent/skills/extractCompanyProfile";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";
import { hintsToFormStrings } from "@/lib/onboard/benchmark-hints";
import { getFallbackBenchmarkRows } from "@/lib/onboard/benchmark-fallback-rows";
import {
  parseLocationString,
  type FieldConfidence,
  type ProfilePrefillFieldKey,
} from "@/lib/onboard/build-profile-prefill";
import { initFundingRoundsFromEnrichment } from "@/lib/onboard/funding-rounds";
import {
  filterFoundedYearInput,
  normalizeFoundedYearForForm,
} from "@/lib/onboard/founded-year";
import {
  applyLocationCountryChange,
  applyLocationStateChange,
  countryHasSubdivisions,
  listCountries,
  listSubdivisions,
  normalizeLocationForForm,
  resolveCountry,
} from "@/lib/geo";
import { SIGNAL, accentGradient, onAccentText, type Theme } from "@/lib/theme";
import { INTEGRATION_OPTIONS, ROUND_TYPES, uid } from "./constants";
import {
  CardShell,
  FieldLabel,
  GhostButton,
  PrimaryButton,
  inputStyle,
} from "./primitives";
import type {
  CrunchbaseProfile,
  FundingRound,
  ProfileFormResult,
} from "./types";
import { onboardMarkerPosition } from "@/lib/benchmarks-shared";
import { formatBenchmarkValue, formatCohortOptionLabel } from "@/lib/benchmarks-format";
import type { OnboardCohortListEntry } from "@/lib/onboard/cohort-client";
import type { OnboardBenchmarkRow } from "@/lib/onboard/profile-types";
import {
  JOURNEY_STAGES,
  KPI_AREA_LABELS,
  KPI_METRIC_AREAS,
  ONBOARD_BENCHMARK_GROUPS,
  PORTFOLIO_FIELD_TO_COHORT_METRIC,
  benchmarkInputsToFormStrings,
  benchmarkFieldUnitLabel,
  extractUserEnteredBenchmarkInputs,
  hasAnyBenchmarkInput,
  emptyBenchmarkInputs,
  inferJourneyStage,
  parseBenchmarkForm,
  sanitizeBenchmarkNumericInput,
  type JourneyStageId,
  type KpiArea,
  type OnboardBenchmarkInputs,
} from "@/lib/onboard/benchmark-fields";
function FieldSourceChip({
  source,
  confidence,
}: {
  source?: string;
  confidence?: FieldConfidence;
}) {
  if (!source) return null;
  return (
    <div
      style={{
        marginTop: 6,
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
      }}
    >
      <MagicSourceChip
        source={source}
        tone={confidence === "high" ? "accent" : "muted"}
      />
      {confidence === "low" ? (
        <span style={{ color: SIGNAL.mutedSoft, fontSize: 10 }}>
          Verify if unsure
        </span>
      ) : null}
    </div>
  );
}

// ─── Profile form ─────────────────────────────────────────────────────────────

export function ProfileFormCard({
  data,
  businessModel,
  notes,
  domain,
  linkedinUrl,
  locationCity,
  locationState,
  locationCountry,
  fieldSources,
  fieldConfidence,
  enrichment,
  extracted,
  onSubmit,
  theme,
  submitLabel = "Claim this company",
}: {
  data: CrunchbaseProfile;
  businessModel: BusinessModel | null;
  notes: string;
  domain: string;
  linkedinUrl?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  fieldSources?: Partial<Record<ProfilePrefillFieldKey, string>>;
  fieldConfidence?: Partial<Record<ProfilePrefillFieldKey, FieldConfidence>>;
  enrichment?: EnrichmentPayload | null;
  extracted?: ExtractCompanyProfileResult | null;
  onSubmit: (result: ProfileFormResult) => void;
  /** When set, use app theme instead of dark SIGNAL. */
  theme?: Theme;
  submitLabel?: string;
}) {
  const s = theme ?? SIGNAL;
  const parsedLocation = parseLocationString(data.location);
  const initialLocation = normalizeLocationForForm({
    country: locationCountry || parsedLocation.country,
    stateRegion: locationState || parsedLocation.state,
    city: locationCity || parsedLocation.city,
  });
  const [companyName, setCompanyName] = useState(data.name);
  const [description, setDescription] = useState(data.description);
  const [selectedModel, setSelectedModel] = useState<BusinessModel | null>(
    businessModel,
  );
  const [industry, setIndustry] = useState(data.category || "");
  const [founded, setFounded] = useState(
    normalizeFoundedYearForForm(data.founded),
  );
  const [city, setCity] = useState(initialLocation.city);
  const [region, setRegion] = useState(initialLocation.stateRegion);
  const [country, setCountry] = useState(initialLocation.country);
  const [website, setWebsite] = useState(
    data.website.startsWith("http")
      ? data.website
      : `https://${data.website || domain}`,
  );
  const [linkedin, setLinkedin] = useState(linkedinUrl ?? "");
  const [crunchbase, setCrunchbase] = useState(enrichment?.crunchbaseUrl ?? "");
  const [twitter, setTwitter] = useState(
    extracted?.twitterUrl ?? enrichment?.twitterUrl ?? "",
  );
  const [rounds, setRounds] = useState<FundingRound[]>(() =>
    initFundingRoundsFromEnrichment({
      enrichment: enrichment ?? null,
      totalFundingLabel: data.totalFunding,
    }),
  );
  const [profileNotes, setProfileNotes] = useState(notes);
  const [claimed, setClaimed] = useState(false);

  const requiredLabel = (label: string) => `${label} *`;
  const optionalHint = "Add if you know it — Fuel works without this";
  const compactInputStyle: CSSProperties = {
    width: "100%",
    background: s.panel,
    color: s.ink,
    border: `1px solid ${s.rule}`,
    borderRadius: 6,
    fontFamily: s.sans,
    padding: "8px 10px",
    fontSize: 12.5,
  };
  const countryOptions = useMemo(
    () => listCountries().map((c) => ({ value: c.name, label: c.name })),
    [],
  );
  const selectedCountryCode = resolveCountry(country).code;
  const hasStates = countryHasSubdivisions(selectedCountryCode);
  const countrySelected = !!country.trim();
  const cityEnabled =
    countrySelected && (!hasStates || !!region.trim());
  const stateOptions = useMemo(
    () =>
      listSubdivisions(selectedCountryCode).map((row) => ({
        value: row.name,
        label: row.name,
      })),
    [selectedCountryCode],
  );

  function handleCountryChange(next: string) {
    const loc = applyLocationCountryChange(next);
    setCountry(loc.country);
    setRegion(loc.stateRegion);
    setCity(loc.city);
  }

  function handleStateChange(next: string) {
    const loc = applyLocationStateChange(
      { country, stateRegion: region, city },
      next,
    );
    setRegion(loc.stateRegion);
  }
  const canClaim =
    companyName.trim().length > 0 &&
    description.trim().length > 0 &&
    selectedModel != null &&
    website.trim().length > 0;
  const addRound = () =>
    setRounds((current) => [
      ...current,
      { id: uid(), type: "Seed", amount: "", date: "", investors: "" },
    ]);
  const deleteRound = (id: string) =>
    setRounds((current) => current.filter((round) => round.id !== id));
  const updateRound = (id: string, key: keyof FundingRound, value: string) => {
    setRounds((current) =>
      current.map((round) =>
        round.id === id ? { ...round, [key]: value } : round,
      ),
    );
  };

  return (
    <div
      style={{
        background: s.panelAlt,
        border: `1px solid ${s.borderSubtle}`,
        borderRadius: 12,
        marginTop: 4,
        padding: 16,
      }}
    >
      <div
        style={{
          color: s.accent,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        + Profile ready
      </div>
      <div
        style={{
          color: s.ink,
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        Review your{" "}
        <span style={{ color: s.accent }}>{companyName || "company"}</span>{" "}
        profile.
      </div>
      <div
        style={{
          color: s.muted,
          fontSize: 12,
          lineHeight: 1.45,
          marginBottom: 14,
        }}
      >
        Confirm what looks right and we&apos;ll set up your workspace.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <label>
          <FieldLabel>{requiredLabel("Company")}</FieldLabel>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            style={{
              ...compactInputStyle,
              border: `1px solid ${s.accentSoft}`,
            }}
          />
        </label>

        <label>
          <FieldLabel>{requiredLabel("What they do")}</FieldLabel>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ ...compactInputStyle, resize: "vertical" }}
          />
        </label>

        <div>
          <FieldLabel>{requiredLabel("Business model")}</FieldLabel>
          <FieldSourceChip
            source={fieldSources?.businessModel}
            confidence={fieldConfidence?.businessModel}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 8,
            }}
          >
            {BUSINESS_MODELS.map((m) => {
              const active = selectedModel === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedModel(active ? null : m)}
                  style={{
                    background: active ? s.accentTint : s.panelInner,
                    border: active
                      ? `1px solid ${s.accent}`
                      : `1px solid ${s.borderSubtle}`,
                    borderRadius: 9,
                    color: "inherit",
                    cursor: "pointer",
                    minHeight: 76,
                    padding: 10,
                    textAlign: "left",
                  }}
                >
                  <strong
                    style={{
                      color: active ? s.accent : s.ink,
                      display: "block",
                      fontSize: 11.5,
                      lineHeight: 1.25,
                    }}
                  >
                    {BUSINESS_MODEL_LABELS[m]}
                  </strong>
                  <span
                    style={{
                      color: s.muted,
                      display: "block",
                      fontSize: 10.5,
                      lineHeight: 1.3,
                      marginTop: 4,
                    }}
                  >
                    {BUSINESS_MODEL_DESCRIPTIONS[m]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <label>
              <FieldLabel>Industry</FieldLabel>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                style={compactInputStyle}
              />
              <FieldSourceChip
                source={fieldSources?.industry}
                confidence={fieldConfidence?.industry}
              />
            </label>
            <label>
              <FieldLabel>Founded</FieldLabel>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={founded}
                onChange={(e) =>
                  setFounded(filterFoundedYearInput(e.target.value))
                }
                placeholder="e.g. 2018"
                style={compactInputStyle}
              />
              <FieldSourceChip
                source={fieldSources?.founded}
                confidence={fieldConfidence?.founded}
              />
              <span
                style={{
                  color: s.mutedSoft,
                  fontSize: 10,
                  marginTop: 4,
                  display: "block",
                }}
              >
                {optionalHint}
              </span>
            </label>
            <label>
              <FieldLabel>Country</FieldLabel>
              <OnboardSearchableCombobox
                value={country}
                options={countryOptions}
                onChange={handleCountryChange}
                placeholder="United States"
                inputStyle={compactInputStyle}
              />
              <FieldSourceChip
                source={fieldSources?.locationCountry}
                confidence={fieldConfidence?.locationCountry}
              />
            </label>
            <label>
              <FieldLabel>State / region</FieldLabel>
              <OnboardSearchableCombobox
                value={region}
                options={stateOptions}
                onChange={handleStateChange}
                disabled={!countrySelected || !hasStates}
                placeholder={
                  !countrySelected
                    ? "Select a country first"
                    : hasStates
                      ? "State / region"
                      : "Not applicable"
                }
                inputStyle={compactInputStyle}
              />
              <FieldSourceChip
                source={fieldSources?.locationState}
                confidence={fieldConfidence?.locationState}
              />
            </label>
            <label>
              <FieldLabel>City</FieldLabel>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!cityEnabled}
                style={{
                  ...compactInputStyle,
                  opacity: cityEnabled ? 1 : 0.45,
                  cursor: cityEnabled ? undefined : "not-allowed",
                }}
              />
              <FieldSourceChip
                source={fieldSources?.locationCity}
                confidence={fieldConfidence?.locationCity}
              />
            </label>
            <label>
              <FieldLabel>{requiredLabel("Website")}</FieldLabel>
              <input
                required
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={compactInputStyle}
              />
            </label>
          </div>
          <label>
            <FieldLabel>LinkedIn</FieldLabel>
            <input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://www.linkedin.com/company/..."
              style={compactInputStyle}
            />
            <FieldSourceChip
              source={fieldSources?.linkedinUrl}
              confidence={fieldConfidence?.linkedinUrl}
            />
            <span
              style={{
                color: s.mutedSoft,
                fontSize: 10,
                marginTop: 4,
                display: "block",
              }}
            >
              {optionalHint}
            </span>
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <label>
              <FieldLabel>Crunchbase URL</FieldLabel>
              <input
                value={crunchbase}
                onChange={(e) => setCrunchbase(e.target.value)}
                placeholder="https://crunchbase.com/organization/..."
                style={compactInputStyle}
              />
            </label>
            <label>
              <FieldLabel>Twitter / X URL</FieldLabel>
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/..."
                style={compactInputStyle}
              />
            </label>
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <FieldLabel>Funding rounds</FieldLabel>
              <button
                type="button"
                onClick={addRound}
                style={{
                  background: s.accentTint,
                  border: `1px solid ${s.accentSoft}`,
                  borderRadius: 6,
                  color: s.accent,
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "4px 9px",
                }}
              >
                + Add round
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rounds.map((round) => (
                <div
                  key={round.id}
                  style={{
                    alignItems: "center",
                    background: s.panel,
                    border: `1px solid ${s.borderFaint}`,
                    borderRadius: 8,
                    display: "grid",
                    gap: 6,
                    gridTemplateColumns: "96px 86px 128px 1fr 26px",
                    padding: 7,
                  }}
                >
                  <select
                    value={round.type}
                    onChange={(e) =>
                      updateRound(round.id, "type", e.target.value)
                    }
                    style={{
                      ...compactInputStyle,
                      padding: "6px 7px",
                      fontSize: 11,
                    }}
                  >
                    {ROUND_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    value={round.amount}
                    onChange={(e) =>
                      updateRound(round.id, "amount", e.target.value)
                    }
                    placeholder="$1.2M"
                    style={{
                      ...compactInputStyle,
                      padding: "6px 7px",
                      fontSize: 11,
                    }}
                  />
                  <input
                    type="date"
                    value={round.date}
                    onChange={(e) =>
                      updateRound(round.id, "date", e.target.value)
                    }
                    style={{
                      ...compactInputStyle,
                      padding: "6px 7px",
                      fontSize: 11,
                    }}
                  />
                  <input
                    value={round.investors}
                    onChange={(e) =>
                      updateRound(round.id, "investors", e.target.value)
                    }
                    placeholder="Investors"
                    style={{
                      ...compactInputStyle,
                      padding: "6px 7px",
                      fontSize: 11,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => deleteRound(round.id)}
                    style={{
                      alignItems: "center",
                      background: "rgba(255,107,91,0.1)",
                      border: `1px solid ${s.negative}33`,
                      borderRadius: 5,
                      color: s.negative,
                      cursor: "pointer",
                      display: "flex",
                      fontSize: 13,
                      height: 24,
                      justifyContent: "center",
                      lineHeight: 1,
                      width: 24,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <label>
            <FieldLabel>Additional context</FieldLabel>
            <textarea
              value={profileNotes}
              onChange={(e) => setProfileNotes(e.target.value)}
              rows={3}
              placeholder="Customers, priorities, markets, or anything Fuel should remember."
              style={{ ...compactInputStyle, resize: "vertical" }}
            />
          </label>
        </div>

        <div
          style={{
            background: s.accentTint,
            border: `1px solid ${s.accentSoft}`,
            borderRadius: 8,
            color: s.inkSoft,
            fontSize: 11.5,
            lineHeight: 1.45,
            padding: "10px 12px",
          }}
        >
          You&apos;ll claim{" "}
          <strong style={{ color: s.ink }}>{domain}</strong> as your
          verified company domain.
        </div>

        {!claimed ? (
          <button
            type="button"
            disabled={!canClaim}
            onClick={() => {
              if (!canClaim || selectedModel == null) return;
              setClaimed(true);
              onSubmit({
                companyName,
                description,
                businessModel: selectedModel,
                industry,
                founded,
                city,
                region,
                country,
                website,
                linkedin,
                crunchbase,
                twitter,
                fundingRounds: rounds,
                notes: profileNotes,
                domain,
                logoUrl:
                  typeof enrichment?.sources?.logoUrl === "string"
                    ? enrichment.sources.logoUrl
                    : null,
              });
            }}
            style={{
              alignSelf: "flex-start",
              background: accentGradient(s),
              border: "none",
              borderRadius: 9,
              color: onAccentText(s),
              cursor: canClaim ? "pointer" : "default",
              font: "inherit",
              fontSize: 12.5,
              fontWeight: 800,
              opacity: canClaim ? 1 : 0.5,
              padding: "10px 22px",
            }}
          >
            {submitLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── York projects ────────────────────────────────────────────────────────────

export function YorkProjectsCard({ onContinue }: { onContinue: () => void }) {
  const [continued, setContinued] = useState(false);
  const projects = [
    {
      area: "Development",
      title: "Patient billing workflow",
      status: "Active",
      summary:
        "Roadmap execution, Launchpad approvals, Pulse quality signals, and release readiness for the core billing workflow.",
    },
    {
      area: "Marketing",
      title: "GTM dashboard",
      status: "Live",
      summary:
        "Traffic, paid media, SEO, and campaign performance are available for demand and conversion signal generation.",
    },
    {
      area: "RevOps",
      title: "Pipeline operating rhythm",
      status: "Monitoring",
      summary:
        "CRM hygiene, lead-to-opportunity conversion, and forecast signals are being tracked for growth planning.",
    },
  ];

  return (
    <CardShell>
      <div
        style={{
          padding: "13px 16px",
          borderBottom: `1px solid ${SIGNAL.borderFaint}`,
        }}
      >
        <div
          style={{
            color: SIGNAL.accent,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.1em",
            marginBottom: 5,
            textTransform: "uppercase",
          }}
        >
          York IE projects
        </div>
        <div style={{ color: SIGNAL.ink, fontSize: 14, fontWeight: 800 }}>
          Active work Fuel will use for signal generation
        </div>
        <div
          style={{
            color: SIGNAL.muted,
            fontSize: 12,
            lineHeight: 1.55,
            marginTop: 5,
          }}
        >
          Your York IE workspace is already connected, so Fuel can use these
          active projects, updates, and service context automatically. You can
          review detailed project updates anytime in Current Updates.
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, padding: 14 }}>
        {projects.map((project) => (
          <div
            key={project.title}
            style={{
              background: SIGNAL.panel,
              border: `1px solid ${SIGNAL.borderFaint}`,
              borderRadius: 9,
              padding: 12,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  color: SIGNAL.accent,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {project.area}
              </span>
              <span
                style={{
                  background: SIGNAL.accentTint,
                  border: `1px solid ${SIGNAL.accentSoft}`,
                  borderRadius: 999,
                  color: SIGNAL.accent,
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 7px",
                }}
              >
                {project.status}
              </span>
            </div>
            <strong
              style={{ color: SIGNAL.ink, display: "block", fontSize: 13 }}
            >
              {project.title}
            </strong>
            <p
              style={{
                color: SIGNAL.muted,
                fontSize: 12,
                lineHeight: 1.5,
                margin: "5px 0 0",
              }}
            >
              {project.summary}
            </p>
          </div>
        ))}
      </div>
      {!continued ? (
        <div
          style={{
            borderTop: `1px solid ${SIGNAL.borderFaint}`,
            padding: "12px 14px",
          }}
        >
          <PrimaryButton
            onClick={() => {
              setContinued(true);
              onContinue();
            }}
            style={{ fontWeight: 800 }}
          >
            Use these projects for signals →
          </PrimaryButton>
        </div>
      ) : null}
    </CardShell>
  );
}

// ─── Crunchbase ───────────────────────────────────────────────────────────────

export function CrunchbaseCard({
  data,
  onConfirm,
}: {
  data: CrunchbaseProfile;
  onConfirm: (v: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmed, setConfirmed] = useState(false);
  const [fields, setFields] = useState({
    name: data.name,
    description: data.description,
    stage: data.stage,
    employees: data.employees,
    founded: data.founded,
    location: data.location,
    category: data.category,
    website: data.website,
  });
  const [rounds, setRounds] = useState<FundingRound[]>([
    {
      id: uid(),
      type: "Seed",
      amount: data.totalFunding,
      date: "",
      investors: "",
    },
  ]);

  const setField = (k: keyof typeof fields, v: string) =>
    setFields((f) => ({ ...f, [k]: v }));
  const addRound = () =>
    setRounds((r) => [
      ...r,
      { id: uid(), type: "Seed", amount: "", date: "", investors: "" },
    ]);
  const deleteRound = (id: string) =>
    setRounds((r) => r.filter((x) => x.id !== id));
  const updateRound = (id: string, k: keyof FundingRound, v: string) =>
    setRounds((r) => r.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  const totalFundingDisplay =
    rounds.length === 0
      ? "—"
      : rounds
          .map((r) => r.amount)
          .filter(Boolean)
          .join(" + ") || "—";

  if (mode === "view") {
    const displayFields = [
      { label: "Description", value: fields.description, full: true },
      { label: "Stage", value: fields.stage },
      { label: "Team size", value: fields.employees },
      { label: "Founded", value: fields.founded },
      { label: "Location", value: fields.location },
      { label: "Total funding", value: totalFundingDisplay },
    ];
    return (
      <CardShell>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${SIGNAL.borderFaint}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${SIGNAL.accentTint} 0%, ${SIGNAL.shell} 100%)`,
              border: `1px solid ${SIGNAL.accentSoft}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
              color: SIGNAL.accent,
            }}
          >
            {fields.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: SIGNAL.ink }}>
              {fields.name}
            </div>
            <div style={{ fontSize: 11, color: SIGNAL.accent, marginTop: 1 }}>
              {fields.category}
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 10,
              background: SIGNAL.accentTint,
              color: SIGNAL.accent,
              border: `1px solid ${SIGNAL.accentSoft}`,
              borderRadius: 4,
              padding: "2px 7px",
              fontWeight: 600,
            }}
          >
            Crunchbase
          </div>
        </div>
        <div
          style={{
            padding: "14px 16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 20px",
          }}
        >
          {displayFields.map(({ label, value, full }) => (
            <div key={label} style={full ? { gridColumn: "1 / -1" } : {}}>
              <FieldLabel>{label}</FieldLabel>
              <div
                style={{ fontSize: 12, color: SIGNAL.muted, lineHeight: 1.4 }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
        {!confirmed && (
          <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
            <PrimaryButton
              onClick={() => {
                setConfirmed(true);
                onConfirm("confirm");
              }}
            >
              Yes, looks good
            </PrimaryButton>
            <GhostButton onClick={() => setMode("edit")}>
              Update details
            </GhostButton>
          </div>
        )}
      </CardShell>
    );
  }

  return (
    <CardShell>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${SIGNAL.borderFaint}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: SIGNAL.ink }}>
          Update company details
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 10,
            background: "rgba(139,118,212,0.12)",
            color: SIGNAL.trackFinOps,
            border: "1px solid rgba(139,118,212,0.2)",
            borderRadius: 4,
            padding: "2px 7px",
            fontWeight: 600,
          }}
        >
          Editing
        </div>
      </div>
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <FieldLabel>Company name</FieldLabel>
            <input
              value={fields.name}
              onChange={(e) => setField("name", e.target.value)}
              style={inputStyle()}
            />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <input
              value={fields.category}
              onChange={(e) => setField("category", e.target.value)}
              style={inputStyle()}
            />
          </div>
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={fields.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={2}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <FieldLabel>Stage</FieldLabel>
            <select
              value={fields.stage}
              onChange={(e) => setField("stage", e.target.value)}
              style={inputStyle()}
            >
              {[
                "Pre-seed",
                "Seed",
                "Seed / Series A",
                "Series A",
                "Series B",
                "Series C",
                "Growth",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Team size</FieldLabel>
            <select
              value={fields.employees}
              onChange={(e) => setField("employees", e.target.value)}
              style={inputStyle()}
            >
              {["1–5", "6–10", "11–50", "51–100", "101–250", "250+"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <FieldLabel>Founded</FieldLabel>
            <input
              value={fields.founded}
              onChange={(e) => setField("founded", e.target.value)}
              style={inputStyle()}
              placeholder="e.g. 2021"
            />
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <FieldLabel>Location</FieldLabel>
            <input
              value={fields.location}
              onChange={(e) => setField("location", e.target.value)}
              style={inputStyle()}
              placeholder="City, State"
            />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <input
              value={fields.website}
              onChange={(e) => setField("website", e.target.value)}
              style={inputStyle()}
              placeholder="company.com"
            />
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${SIGNAL.borderFaint}`,
          display: "flex",
          gap: 8,
        }}
      >
        <PrimaryButton onClick={() => setMode("view")}>
          Save & review
        </PrimaryButton>
        <GhostButton onClick={() => setMode("view")}>Cancel</GhostButton>
      </div>
    </CardShell>
  );
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

const RESULTS_KPI_METRICS = [
  "arr_usd",
  "arr_growth_yoy_pct",
  "nrr_pct",
  "logo_retention_pct",
  "paid_customer_count",
  "cac_payback_months",
  "fte_count",
  "cash_on_hand_usd",
  "monthly_burn_usd",
  "gross_margin_pct",
  "burn_multiple",
] as const;

function benchmarkInputStyle(extra?: CSSProperties): CSSProperties {
  return inputStyle({
    border: "none",
    outline: "none",
    boxShadow: "none",
    ...extra,
  });
}

function PrefillSourceHint({ source }: { source: string }) {
  return (
    <div
      title={source}
      style={{
        background: SIGNAL.accentTint,
        border: `1px solid ${SIGNAL.accentSoft}`,
        borderRadius: 6,
        boxSizing: "border-box",
        color: SIGNAL.inkSoft,
        cursor: "default",
        display: "block",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        fontSize: 9.5,
        fontWeight: 700,
        lineHeight: 1.45,
        marginTop: 4,
        padding: "4px 8px",
        whiteSpace: "normal",
        width: "100%",
        wordBreak: "break-word",
      }}
    >
      ✦ {source}
    </div>
  );
}

function BenchmarkInfoTooltip({
  info,
  active,
  onActivate,
  onDeactivate,
  align = "start",
}: {
  info: string;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  align?: "start" | "end";
}) {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span
        onMouseEnter={onActivate}
        onMouseLeave={onDeactivate}
        onFocus={onActivate}
        onBlur={onDeactivate}
        tabIndex={0}
        style={{
          alignItems: "center",
          border: `1px solid ${SIGNAL.borderSubtle}`,
          borderRadius: "50%",
          color: SIGNAL.muted,
          cursor: "help",
          display: "inline-flex",
          fontSize: 9,
          fontWeight: 800,
          height: 14,
          justifyContent: "center",
          lineHeight: 1,
          width: 14,
        }}
      >
        i
      </span>
      {active ? (
        <div
          style={{
            background: SIGNAL.shell,
            border: `1px solid ${SIGNAL.accentSoft}`,
            borderRadius: 8,
            boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
            bottom: "calc(100% + 6px)",
            color: SIGNAL.inkSoft,
            fontSize: 11,
            lineHeight: 1.45,
            maxWidth: 220,
            padding: "8px 10px",
            position: "absolute",
            top: "auto",
            whiteSpace: "normal",
            width: "max-content",
            zIndex: 30,
            ...(align === "end"
              ? { right: 0, left: "auto" }
              : { left: 0, right: "auto" }),
          }}
        >
          {info}
        </div>
      ) : null}
    </span>
  );
}

function BenchmarkLoadingCard() {
  return (
    <CardShell>
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ display: "inline-flex", gap: 4, marginBottom: 12 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: SIGNAL.accent,
                animation: `fuel-onboard-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                display: "block",
              }}
            />
          ))}
        </div>
        <div style={{ color: SIGNAL.ink, fontSize: 14, fontWeight: 800 }}>
          Identifying your benchmark
        </div>
        <div
          style={{
            color: SIGNAL.muted,
            fontSize: 12,
            lineHeight: 1.5,
            marginTop: 5,
          }}
        >
          Fuel is matching your numbers to the closest cohort and percentile
          range.
        </div>
      </div>
    </CardShell>
  );
}

function KpiBarRow({
  label,
  p25,
  p50,
  p75,
  p90,
  userValue,
  bandStart,
  bandWidth,
  marker,
}: {
  label: string;
  p25: string;
  p50: string;
  p75: string;
  p90: string;
  userValue: string | null;
  bandStart: number;
  bandWidth: number;
  marker: number | null;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 14,
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{ color: SIGNAL.inkSoft, fontSize: 12.5, fontWeight: 700 }}
        >
          {label}
        </span>
        <span
          style={{
            color: SIGNAL.muted,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            fontSize: 10.5,
            lineHeight: 1.4,
            textAlign: "right",
          }}
        >
          p25 {p25} · p50{" "}
          <strong style={{ color: SIGNAL.inkSoft }}>{p50}</strong> · p75 {p75} ·
          p90 {p90}
        </span>
      </div>
      <div
        style={{
          background: SIGNAL.shell,
          borderRadius: 999,
          height: 9,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            background: `linear-gradient(90deg, ${SIGNAL.accent}66, ${SIGNAL.accent})`,
            height: "100%",
            left: `${bandStart}%`,
            position: "absolute",
            width: `${Math.max(4, bandWidth)}%`,
          }}
        />
        {marker != null ? (
          <div
            style={{
              background: SIGNAL.inkSoft,
              height: 14,
              left: `${marker}%`,
              position: "absolute",
              top: -3,
              width: 1,
            }}
          />
        ) : null}
      </div>
      {userValue ? (
        <div
          style={{
            color: SIGNAL.accent,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            fontSize: 10,
            marginTop: 4,
          }}
        >
          Your value: {userValue}
        </div>
      ) : null}
    </div>
  );
}

const HINT_TO_FIELD: Partial<
  Record<keyof OnboardBenchmarkInputs, keyof BenchmarkHints>
> = {
  arrUsd: "arr",
  fteCount: "headcount",
  cashOnHandUsd: "cashOnHand",
  monthlyBurnUsd: "monthlyBurn",
  paidCustomerCount: "payingCustomers",
  notableCustomers: "notableCustomers",
  challenges: "currentChallenges",
};

function OnboardCohortPicker({
  cohortKey,
  allCohorts,
  onChange,
}: {
  cohortKey: string | null;
  allCohorts: OnboardCohortListEntry[];
  onChange: (cohortKey: string) => void;
}) {
  if (allCohorts.length === 0) return null;

  return (
    <label
      style={{
        alignItems: "center",
        display: "inline-flex",
        fontFamily: "inherit",
        fontSize: 11,
        gap: 6,
        color: SIGNAL.muted,
      }}
    >
      cohort
      <select
        value={cohortKey ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          if (val) onChange(val);
        }}
        style={{
          background: SIGNAL.panelAlt,
          border: `1px solid ${SIGNAL.borderFaint}`,
          borderRadius: 6,
          color: SIGNAL.ink,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11,
          maxWidth: 280,
          padding: "4px 6px",
        }}
      >
        {allCohorts.map((c) => (
          <option key={c.cohortKey} value={c.cohortKey}>
            {formatCohortOptionLabel(c.dimensions, c.cohortKey, c.sampleSize)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BenchmarkCard({
  stage,
  cohortKey,
  cohortLabel,
  cohortSampleSize,
  cohortBenchmarkRows,
  allCohorts,
  businessModel,
  benchmarkHints,
  benchmarkInputs,
  totalFundingUsd,
  onCohortChange,
  onSave,
  onContinue,
}: {
  stage: string;
  cohortKey: string | null;
  cohortLabel: string;
  cohortSampleSize: number | null;
  cohortBenchmarkRows: OnboardBenchmarkRow[];
  allCohorts: OnboardCohortListEntry[];
  businessModel: BusinessModel | null;
  benchmarkHints: BenchmarkHints | null;
  benchmarkInputs: OnboardBenchmarkInputs | null;
  totalFundingUsd: number | null;
  onCohortChange: (cohortKey: string) => void;
  onSave: (inputs: OnboardBenchmarkInputs | null) => void;
  onContinue: () => void;
}) {
  const benchmarks = useMemo(
    () =>
      cohortBenchmarkRows.length > 0
        ? cohortBenchmarkRows
        : getFallbackBenchmarkRows(),
    [cohortBenchmarkRows],
  );

  const [mode, setMode] = useState<"form" | "loading" | "results">(
    benchmarkInputs ? "results" : "form",
  );
  const [continued, setContinued] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(() =>
    benchmarkInputs
      ? benchmarkInputsToFormStrings(benchmarkInputs)
      : hintsToFormStrings(benchmarkHints),
  );
  const [savedInputs, setSavedInputs] = useState<OnboardBenchmarkInputs | null>(
    benchmarkInputs,
  );
  const [userTouchedFields, setUserTouchedFields] = useState(
    () =>
      new Set<keyof OnboardBenchmarkInputs>(
        benchmarkInputs && hasAnyBenchmarkInput(benchmarkInputs)
          ? (
              Object.entries(benchmarkInputs) as Array<
                [
                  keyof OnboardBenchmarkInputs,
                  OnboardBenchmarkInputs[keyof OnboardBenchmarkInputs],
                ]
              >
            )
              .filter(([, v]) => v != null && v !== "")
              .map(([k]) => k)
          : [],
      ),
  );
  const [selectedStage, setSelectedStage] = useState<JourneyStageId>(() => {
    const hint = benchmarkHints?.journeyStage;
    if (hint) {
      const match = JOURNEY_STAGES.find((s) => s.title === hint);
      if (match) return match.id;
    }
    return inferJourneyStage(totalFundingUsd);
  });

  const hintSources = benchmarkHints?.sources ?? {};
  const sampleSize =
    cohortSampleSize ??
    benchmarks.find((b) => b.sampleSize != null)?.sampleSize ??
    null;

  const showHybridCohortNote =
    businessModel === "operating_and_investment" ||
    businessModel === "investment_firm";

  const benchmarkByMetric = useMemo(
    () => new Map(benchmarks.map((r) => [r.metric, r])),
    [benchmarks],
  );

  const userValueByMetric = useMemo(() => {
    const inputs = savedInputs ?? emptyBenchmarkInputs();
    const out = new Map<string, number>();
    for (const [field, metric] of Object.entries(
      PORTFOLIO_FIELD_TO_COHORT_METRIC,
    )) {
      const v = inputs[field as keyof OnboardBenchmarkInputs];
      if (typeof v === "number") out.set(metric, v);
    }
    return out;
  }, [savedInputs]);

  const kpiRows = useMemo(() => {
    return RESULTS_KPI_METRICS.flatMap((metricId) => {
      const meta = KPI_METRIC_AREAS[metricId];
      const row = benchmarkByMetric.get(metricId);
      const userVal = userValueByMetric.get(metricId) ?? null;
      if (userVal == null || !row) return [];

      const unit = row.unit ?? null;
      const bench = {
        p25: row.p25,
        p50: row.p50,
        p75: row.p75,
        p90: row.p90,
        invertedGood: row.invertedGood,
      };
      const marker = onboardMarkerPosition(userVal, bench);
      const p25Pos = onboardMarkerPosition(row.p25 ?? 0, bench) ?? 0;
      const p75Pos = onboardMarkerPosition(row.p75 ?? 0, bench) ?? 100;

      return [
        {
          metricId,
          area: meta?.area ?? ("gtm" as KpiArea),
          sub: meta?.sub ?? "",
          label: meta?.label ?? metricId,
          p25: formatBenchmarkValue(row.p25, unit),
          p50: formatBenchmarkValue(row.p50, unit),
          p75: formatBenchmarkValue(row.p75, unit),
          p90: formatBenchmarkValue(row.p90, unit),
          userValue: formatBenchmarkValue(userVal, unit),
          bandStart: Math.min(p25Pos, p75Pos),
          bandWidth: Math.abs(p75Pos - p25Pos),
          marker,
        },
      ];
    });
  }, [benchmarkByMetric, userValueByMetric]);

  function markFieldTouched(key: keyof OnboardBenchmarkInputs) {
    setUserTouchedFields((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  function updateFormValue(key: keyof OnboardBenchmarkInputs, value: string) {
    markFieldTouched(key);
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function updateBenchmarkNumberValue(
    key: keyof OnboardBenchmarkInputs,
    value: string,
  ) {
    const sanitized = sanitizeBenchmarkNumericInput(value);
    if (sanitized === null) return;
    updateFormValue(key, sanitized);
  }

  function handleSave() {
    const parsedInputs = parseBenchmarkForm(formValues);
    const submissionInputs = extractUserEnteredBenchmarkInputs(
      formValues,
      userTouchedFields,
    );
    const displayInputs = hasAnyBenchmarkInput(parsedInputs)
      ? parsedInputs
      : null;
    setSavedInputs(displayInputs);
    setMode("loading");
    window.setTimeout(() => {
      setMode("results");
      onSave(submissionInputs);
    }, 1400);
  }

  if (mode === "loading") {
    return <BenchmarkLoadingCard />;
  }

  if (mode === "form") {
    return (
      <CardShell style={{ overflow: "visible" }}>
        <div
          style={{
            padding: "13px 16px",
            borderBottom: `1px solid ${SIGNAL.borderFaint}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: SIGNAL.ink }}>
            Add your benchmark numbers
          </div>
          <div
            style={{
              fontSize: 12,
              color: SIGNAL.muted,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Share your current numbers and Fuel will identify your benchmark
            range, generate signals, recommend playbooks, and surface the
            initiatives that can help your startup grow.
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 12,
            }}
          >
            <OnboardCohortPicker
              cohortKey={cohortKey}
              allCohorts={allCohorts}
              onChange={onCohortChange}
            />
            {cohortLabel ? (
              <span
                style={{
                  color: SIGNAL.mutedSoft,
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                  fontSize: 10.5,
                }}
              >
                {cohortLabel}
                {sampleSize ? ` · n=${sampleSize}` : ""}
              </span>
            ) : null}
          </div>
          {showHybridCohortNote ? (
            <div
              style={{
                color: SIGNAL.mutedSoft,
                fontSize: 11,
                lineHeight: 1.45,
                marginTop: 8,
              }}
            >
              Benchmarks compare your operating metrics to the peer group above —
              adjust the cohort if you want a different comparison set.
            </div>
          ) : null}
        </div>
        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {ONBOARD_BENCHMARK_GROUPS.map((group) => (
            <div
              key={group.title}
              style={{
                background: SIGNAL.panel,
                border: `1px solid ${SIGNAL.borderFaint}`,
                borderRadius: 10,
                padding: 13,
              }}
            >
              <div
                style={{
                  color: SIGNAL.mutedSoft,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                {group.title}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 10,
                }}
              >
                {group.fields.map((input, fieldIndex) => {
                  const hintKey = HINT_TO_FIELD[input.id];
                  const prefillSrc = hintKey ? hintSources[hintKey] : undefined;
                  const fieldVal = formValues[input.id];
                  const isPrefilled = !!fieldVal && !!prefillSrc;
                  const unitLabel = benchmarkFieldUnitLabel(input.unit);
                  return (
                    <label
                      key={input.id}
                      style={{
                        minWidth: 0,
                        ...(input.kind === "textarea"
                          ? { gridColumn: "1 / -1" }
                          : {}),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 4,
                          position: "relative",
                        }}
                      >
                        <FieldLabel>
                          {input.label}
                          {unitLabel ? (
                            <span
                              style={{
                                color: SIGNAL.mutedSoft,
                                marginLeft: 6,
                                fontWeight: 400,
                              }}
                            >
                              {unitLabel}
                            </span>
                          ) : null}
                        </FieldLabel>
                        <BenchmarkInfoTooltip
                          info={input.info}
                          active={activeTooltip === input.id}
                          onActivate={() => setActiveTooltip(input.id)}
                          onDeactivate={() => setActiveTooltip(null)}
                          align={fieldIndex % 2 === 1 ? "end" : "start"}
                        />
                      </div>
                      {input.kind === "textarea" ? (
                        <textarea
                          className="fuel-benchmark-input"
                          value={fieldVal}
                          onChange={(e) =>
                            updateFormValue(input.id, e.target.value)
                          }
                          placeholder={input.placeholder}
                          rows={2}
                          style={benchmarkInputStyle({
                            padding: "8px 10px",
                            fontSize: 12.5,
                            resize: "vertical",
                          })}
                        />
                      ) : (
                        <input
                          className="fuel-benchmark-input"
                          type="number"
                          min={0}
                          value={fieldVal}
                          onChange={(e) =>
                            updateBenchmarkNumberValue(input.id, e.target.value)
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
                          placeholder={input.placeholder}
                          style={benchmarkInputStyle({
                            padding: "8px 10px",
                            fontSize: 12.5,
                            minWidth: 0,
                          })}
                        />
                      )}
                      {isPrefilled && prefillSrc ? (
                        <PrefillSourceHint source={prefillSrc} />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: "0 16px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <PrimaryButton
            onClick={handleSave}
            style={{ padding: "9px 20px", fontWeight: 800 }}
          >
            Save and identify benchmark →
          </PrimaryButton>
          <span style={{ fontSize: 12, color: SIGNAL.mutedSoft }}>
            You can leave unknown fields blank
          </span>
        </div>
      </CardShell>
    );
  }

  const selectedStageMeta = JOURNEY_STAGES.find((s) => s.id === selectedStage);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginTop: 4,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${SIGNAL.panel} 0%, ${SIGNAL.panelAlt} 100%)`,
          border: `1px solid ${SIGNAL.accentSoft}`,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: SIGNAL.accent,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Your startup journey
            </div>
            <div style={{ color: SIGNAL.ink, fontSize: 20, fontWeight: 800 }}>
              Currently at{" "}
              <span style={{ color: SIGNAL.accent }}>
                {benchmarkHints?.journeyStage ??
                  selectedStageMeta?.title ??
                  stage ??
                  "Pre-Product"}
                .
              </span>
            </div>
          </div>
          <span
            style={{
              background: `${SIGNAL.accent}18`,
              border: `1px solid ${SIGNAL.accentSoft}`,
              borderRadius: 999,
              color: "#8FE8D2",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              fontSize: 10.5,
              fontWeight: 800,
              padding: "4px 10px",
              whiteSpace: "nowrap",
            }}
          >
            AI estimate · from public signal
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {JOURNEY_STAGES.map((item) => {
            const isSelected = item.id === selectedStage;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedStage(item.id)}
                style={{
                  background: isSelected ? `${SIGNAL.accent}20` : SIGNAL.shell,
                  border: isSelected
                    ? `1px solid ${SIGNAL.accent}88`
                    : `1px solid ${SIGNAL.borderFaint}`,
                  borderRadius: 9,
                  cursor: "pointer",
                  minHeight: 76,
                  padding: 10,
                  position: "relative",
                  textAlign: "left",
                  font: "inherit",
                }}
              >
                {isSelected ? (
                  <span
                    style={{
                      color: SIGNAL.accent,
                      fontSize: 12,
                      position: "absolute",
                      right: 10,
                      top: 8,
                    }}
                  >
                    ✓
                  </span>
                ) : null}
                <div
                  style={{
                    color: SIGNAL.mutedSoft,
                    fontSize: 9.5,
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {item.stage}
                </div>
                <strong
                  style={{
                    color: SIGNAL.inkSoft,
                    display: "block",
                    fontSize: 12,
                    lineHeight: 1.25,
                  }}
                >
                  {item.title}
                </strong>
                <p
                  style={{
                    color: SIGNAL.muted,
                    fontSize: 10.5,
                    lineHeight: 1.3,
                    margin: "4px 0 0",
                  }}
                >
                  {item.detail}
                </p>
              </button>
            );
          })}
        </div>
        <div
          style={{
            color: SIGNAL.muted,
            fontSize: 12,
            lineHeight: 1.5,
            marginTop: 12,
          }}
        >
          We inferred this from your public profile. Click another card if it
          doesn&apos;t match.
        </div>
      </div>

      <CardShell>
        <div style={{ padding: "16px 18px 12px" }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 10,
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: SIGNAL.accent,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                KPI snapshot
              </div>
              <div style={{ color: SIGNAL.ink, fontSize: 19, fontWeight: 800 }}>
                How your cohort performs across R&amp;D, GTM, and G&amp;A.
              </div>
            </div>
            <button
              type="button"
              title="Edit benchmark numbers"
              aria-label="Edit benchmark numbers"
              onClick={() => {
                if (savedInputs && hasAnyBenchmarkInput(savedInputs)) {
                  setUserTouchedFields(
                    new Set(
                      (
                        Object.entries(savedInputs) as Array<
                          [
                            keyof OnboardBenchmarkInputs,
                            OnboardBenchmarkInputs[keyof OnboardBenchmarkInputs],
                          ]
                        >
                      )
                        .filter(([, v]) => v != null && v !== "")
                        .map(([k]) => k),
                    ),
                  );
                }
                setMode("form");
              }}
              style={{
                alignItems: "center",
                background: `${SIGNAL.accent}14`,
                border: `1px solid ${SIGNAL.accentSoft}`,
                borderRadius: 7,
                color: SIGNAL.accent,
                cursor: "pointer",
                display: "inline-flex",
                font: "inherit",
                fontSize: 12,
                fontWeight: 800,
                height: 30,
                justifyContent: "center",
                width: 34,
              }}
            >
              ✎
            </button>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 14,
            }}
          >
            <div
              style={{
                background: SIGNAL.panel,
                border: `1px solid ${SIGNAL.borderFaint}`,
                borderRadius: 999,
                color: SIGNAL.muted,
                display: "inline-block",
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 10.5,
                fontWeight: 800,
                padding: "4px 9px",
              }}
            >
              Cohort · {cohortLabel}
              {sampleSize ? ` · n=${sampleSize}` : ""}
            </div>
            <OnboardCohortPicker
              cohortKey={cohortKey}
              allCohorts={allCohorts}
              onChange={onCohortChange}
            />
          </div>
          {showHybridCohortNote ? (
            <div
              style={{
                color: SIGNAL.mutedSoft,
                fontSize: 11,
                lineHeight: 1.45,
                marginTop: 8,
              }}
            >
              Operating metrics are compared to the benchmark cohort above.
            </div>
          ) : null}
          <div
            style={{
              color: SIGNAL.muted,
              fontSize: 12.5,
              lineHeight: 1.5,
              marginTop: 10,
            }}
          >
            Cohort distribution shown below — your marker lands on metrics you
            entered.
          </div>
        </div>
        <div
          style={{
            padding: "4px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {kpiRows.length === 0 ? (
            <div
              style={{
                color: SIGNAL.muted,
                fontSize: 12.5,
                lineHeight: 1.5,
                padding: "8px 0 4px",
              }}
            >
              Enter at least one benchmark number to see where you land on the
              cohort distribution.
            </div>
          ) : null}
          {kpiRows.map((row, index) => {
            const showGroup =
              index === 0 || kpiRows[index - 1].area !== row.area;
            return (
              <div
                key={row.metricId}
                style={{
                  alignItems: "center",
                  borderTop:
                    showGroup && index > 0
                      ? `1px solid ${SIGNAL.borderFaint}`
                      : "none",
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "104px minmax(0, 1fr)",
                  paddingTop: showGroup && index > 0 ? 16 : 0,
                }}
              >
                <div>
                  {showGroup ? (
                    <>
                      <div
                        style={{
                          color: SIGNAL.accent,
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {KPI_AREA_LABELS[row.area]}
                      </div>
                      <div
                        style={{
                          color: SIGNAL.mutedSoft,
                          fontSize: 10.5,
                          lineHeight: 1.25,
                          marginTop: 2,
                        }}
                      >
                        {row.sub}
                      </div>
                    </>
                  ) : null}
                </div>
                <KpiBarRow
                  label={row.label}
                  p25={row.p25}
                  p50={row.p50}
                  p75={row.p75}
                  p90={row.p90}
                  userValue={row.userValue}
                  bandStart={row.bandStart}
                  bandWidth={row.bandWidth}
                  marker={row.marker}
                />
              </div>
            );
          })}
        </div>
      </CardShell>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "0 2px 2px",
        }}
      >
        <div
          style={{
            background: `${SIGNAL.accent}0D`,
            border: `1px solid ${SIGNAL.accentSoft}`,
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: SIGNAL.muted,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: SIGNAL.inkSoft }}>
            Your benchmark is now ready.
          </strong>{" "}
          Fuel can use these signals to recommend playbooks and identify the
          highest-leverage initiatives for your next stage.
        </div>
        {!continued && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <PrimaryButton
              onClick={() => {
                setContinued(true);
                onContinue();
              }}
              style={{ padding: "9px 20px", fontWeight: 800 }}
            >
              Show me how Fuel helps →
            </PrimaryButton>
            <span style={{ fontSize: 12, color: SIGNAL.mutedSoft }}>
              York portfolio · benchmark cohort · operating signals
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Value prop ───────────────────────────────────────────────────────────────

export function ValuePropCard({
  cohortLabel,
  onContinue,
}: {
  cohortLabel?: string | null;
  onContinue: () => void;
}) {
  const [clicked, setClicked] = useState(false);
  const props = [
    {
      icon: "⚡",
      title: "Real-time Signals",
      desc: "Surface what's moving across product, GTM, revenue, and finance.",
    },
    {
      icon: "📋",
      title: "Playbooks & Initiatives",
      desc: "Curated operating plays mapped to your stage.",
    },
    {
      icon: "🔭",
      title: "Competitive Intelligence",
      desc: "Track competitors and stay ahead using Fuel's market data.",
    },
    {
      icon: "🤖",
      title: "Fuel AI",
      desc: "Research, summaries, and opportunities in your operating workflow.",
    },
    {
      icon: "📊",
      title: "One Operating Command Center",
      desc: "Dev · Marketing · RevOps · FinOps in a unified view.",
    },
  ];
  return (
    <CardShell>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${SIGNAL.borderFaint}`,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: SIGNAL.ink }}>
          How Fuel accelerates your journey
        </div>
        {cohortLabel ? (
          <div style={{ fontSize: 11.5, color: SIGNAL.muted, marginTop: 4 }}>
            Fuel maps you to{" "}
            <strong style={{ color: SIGNAL.inkSoft }}>{cohortLabel}</strong> —
            plays and benchmarks tuned to your stage.
          </div>
        ) : null}
      </div>
      <div
        style={{
          padding: "10px 16px 4px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {props.map((p) => (
          <div
            key={p.title}
            style={{
              display: "flex",
              gap: 10,
              padding: "8px 0",
              borderBottom: `1px solid ${SIGNAL.borderFaint}`,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon}</span>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: SIGNAL.ink,
                  marginBottom: 2,
                }}
              >
                {p.title}
              </div>
              <div
                style={{ fontSize: 11.5, color: SIGNAL.muted, lineHeight: 1.5 }}
              >
                {p.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!clicked && (
        <div style={{ padding: "10px 16px 14px" }}>
          <PrimaryButton
            onClick={() => {
              setClicked(true);
              onContinue();
            }}
          >
            This is exactly what we need →
          </PrimaryButton>
        </div>
      )}
    </CardShell>
  );
}

// ─── York services ────────────────────────────────────────────────────────────

export function YorkServicesCard({
  onChoice,
}: {
  onChoice: (v: "york-yes" | "york-skip") => void;
}) {
  const [chosen, setChosen] = useState(false);
  const tracks = [
    {
      label: "Development",
      color: SIGNAL.accent,
      icon: "⚙️",
      tracked: [
        "Product roadmap & delivery health",
        "Code quality & release readiness",
      ],
      helps: "Senior engineers embedded in your team.",
    },
    {
      label: "Marketing",
      color: SIGNAL.trackMarketing,
      icon: "📣",
      tracked: [
        "Traffic, demand & channel mix",
        "SEO, paid, social performance",
      ],
      helps: "GTM strategy to execution.",
    },
    {
      label: "RevOps",
      color: SIGNAL.warn,
      icon: "💼",
      tracked: [
        "Pipeline health & CRM hygiene",
        "Lead-to-opportunity conversion",
      ],
      helps: "Clean pipeline and scalable revenue motion.",
    },
    {
      label: "FinOps",
      color: SIGNAL.trackFinOps,
      icon: "📊",
      tracked: [
        "Runway, burn & cash position",
        "Board & fundraising readiness",
      ],
      helps: "Finance as a strategic lever.",
    },
  ];
  return (
    <CardShell>
      <div
        style={{
          padding: "13px 16px",
          borderBottom: `1px solid ${SIGNAL.borderFaint}`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: SIGNAL.ink }}>
          York IE — embedded growth partner
        </div>
        <div
          style={{
            fontSize: 12,
            color: SIGNAL.muted,
            marginTop: 4,
            lineHeight: 1.55,
          }}
        >
          Senior practitioners across the same four tracks Fuel monitors.
        </div>
      </div>
      <div
        style={{
          padding: "12px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {tracks.map((t) => (
          <div
            key={t.label}
            style={{
              background: SIGNAL.panel,
              border: `1px solid ${t.color}22`,
              borderRadius: 9,
              padding: "12px 13px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.color }}>
                {t.label}
              </span>
            </div>
            {t.tracked.map((item) => (
              <div
                key={item}
                style={{ fontSize: 11, color: SIGNAL.muted, marginBottom: 3 }}
              >
                · {item}
              </div>
            ))}
            <div
              style={{
                borderTop: `1px solid ${t.color}18`,
                paddingTop: 8,
                fontSize: 11,
                color: SIGNAL.inkSoft,
                fontStyle: "italic",
              }}
            >
              {t.helps}
            </div>
          </div>
        ))}
      </div>
      {!chosen && (
        <div
          style={{
            padding: "4px 16px 14px",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <PrimaryButton
            onClick={() => {
              setChosen(true);
              onChoice("york-yes");
            }}
          >
            I want York IE on my team →
          </PrimaryButton>
          <GhostButton
            onClick={() => {
              setChosen(true);
              onChoice("york-skip");
            }}
          >
            Continue to Fuel →
          </GhostButton>
        </div>
      )}
    </CardShell>
  );
}

// ─── Why integrate ────────────────────────────────────────────────────────────

export function WhyIntegrateCard({ onContinue }: { onContinue: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <CardShell>
      <div
        style={{
          padding: "13px 16px",
          borderBottom: `1px solid ${SIGNAL.borderFaint}`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: SIGNAL.ink }}>
          Why add integrations?
        </div>
        <div style={{ fontSize: 12, color: SIGNAL.muted, marginTop: 3 }}>
          Your integrations power everything in Fuel.
        </div>
      </div>
      {!dismissed && (
        <div style={{ padding: "12px 16px 14px" }}>
          <PrimaryButton
            onClick={() => {
              setDismissed(true);
              onContinue();
            }}
          >
            Set up my integrations →
          </PrimaryButton>
        </div>
      )}
    </CardShell>
  );
}

// ─── Integration selector ─────────────────────────────────────────────────────

export function IntegrationSelector({
  selected,
  onToggle,
  onDone,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onDone: () => void;
}) {
  const categories = ["Development", "Marketing", "RevOps", "FinOps"];
  return (
    <CardShell>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${SIGNAL.borderFaint}`,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: SIGNAL.ink }}>
          Set up your integrations
        </div>
        <div style={{ fontSize: 11.5, color: SIGNAL.muted, marginTop: 3 }}>
          Select integrations to activate. Add more anytime from the Fuel Store.
        </div>
      </div>
      {categories.map((cat) => {
        const items = INTEGRATION_OPTIONS.filter((i) => i.category === cat);
        return (
          <div
            key={cat}
            style={{
              padding: "10px 16px",
              borderBottom: `1px solid ${SIGNAL.borderFaint}`,
            }}
          >
            <FieldLabel>{cat}</FieldLabel>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
              }}
            >
              {items.map((item) => {
                const isSelected = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggle(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      background: isSelected ? SIGNAL.accentTint : SIGNAL.panel,
                      border: isSelected
                        ? `1px solid ${SIGNAL.accentSoft}`
                        : `1px solid ${SIGNAL.borderSubtle}`,
                      borderRadius: 7,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: `${item.color}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 800,
                        color: item.color,
                      }}
                    >
                      {item.abbr}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: isSelected ? SIGNAL.accent : SIGNAL.muted,
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {item.name}
                    </span>
                    {"york" in item && item.york ? (
                      <span
                        style={{
                          fontSize: 9,
                          color: SIGNAL.accent,
                          background: SIGNAL.accentTint,
                          borderRadius: 3,
                          padding: "1px 4px",
                          fontWeight: 700,
                        }}
                      >
                        York
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ padding: "12px 16px" }}>
        <PrimaryButton onClick={onDone}>
          {selected.length > 0
            ? `Connect ${selected.length} integration${selected.length > 1 ? "s" : ""}`
            : "Skip for now"}
        </PrimaryButton>
      </div>
    </CardShell>
  );
}
