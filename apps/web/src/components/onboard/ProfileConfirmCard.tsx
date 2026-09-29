"use client";

import { useState } from "react";
import {
  MagicFieldReveal,
  MagicGradientBorder,
  MagicSidePanel,
  MagicSidePanelStep,
  MagicSourceChip,
  MagicSparkle,
} from "@/components/ai";
import {
  BUSINESS_MODELS,
  BUSINESS_MODEL_LABELS,
  BUSINESS_MODEL_DESCRIPTIONS,
  type BusinessModel,
  isBusinessModel,
} from "@/lib/business-model";

export interface EditableProfile {
  name: string;
  shortDescription: string;
  industry: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  foundedOn: string;
  website: string;
  linkedinUrl: string;
  crunchbaseUrl: string;
  twitterUrl: string;
  /** Empty string means "not set" — coerced to null on submit. */
  businessModel: BusinessModel | "";
}

interface RawPayload {
  domain: string;
  longDescription: string | null;
  totalFundingUsd: number | null;
  numFundingRounds: number | null;
  sources: Record<string, unknown>;
}

interface ExtractedSummary {
  /** Per-field attribution chips: `{ industry: "From meta description", ... }` */
  sources: Partial<Record<keyof EditableProfile, string>>;
  /** Tech-stack hints to display in the worklog panel. */
  techStack: string[];
  /** Whether the scrape was cache-hit (free). */
  cached: { website: boolean; techStack: boolean };
}

/**
 * Business-model selector — radio-style cards so the user can see all
 * five options at once and pick the right one before they hit the
 * benchmark wizard. Pre-fills from the LLM's classification when
 * confident, otherwise unselected (forcing the user to choose).
 */
function BusinessModelField({
  value,
  onChange,
  source,
}: {
  value: BusinessModel | "";
  onChange: (v: BusinessModel | "") => void;
  source?: string;
}) {
  return (
    <div style={{ marginBottom: 14, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 6,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: "#8A99A6",
            marginRight: 4,
            flexShrink: 0,
          }}
        >
          Business model
        </span>
        {source ? <MagicSourceChip source={source} /> : null}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 8,
        }}
      >
        {BUSINESS_MODELS.map((m) => {
          const selected = value === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(selected ? "" : m)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 8,
                background: selected ? "rgba(0,180,138,0.10)" : "#0B141C",
                border: `1px solid ${selected ? "#00B48A" : "#263947"}`,
                color: "#F4F6F8",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.4,
                transition: "background 120ms ease, border-color 120ms ease",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: selected ? "#A6E6D2" : "#F4F6F8",
                  marginBottom: 2,
                }}
              >
                {BUSINESS_MODEL_LABELS[m]}
              </div>
              <div style={{ fontSize: 11.5, color: "#8A99A6", lineHeight: 1.4 }}>
                {BUSINESS_MODEL_DESCRIPTIONS[m]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The "looks like you're from {Company}" surface — confirmation card
 * after the agent finishes profiling the user's domain. Two columns:
 * the action lives on the left (compact form + claim button), the
 * agent's worklog + attribution lives on the right.
 *
 * Visual primitives all come from `components/ai/*` so this surface
 * matches anything else that uses the magic system.
 */
export function ProfileConfirmCard({
  cta,
  domain,
  initial,
  rawPayload,
  extracted,
  onAlreadyHasAccount,
  onBlockedProvider,
}: {
  cta: "benchmark" | "pitch-deck" | "explore";
  domain: string;
  initial: EditableProfile;
  rawPayload: RawPayload;
  extracted: ExtractedSummary | null;
  onAlreadyHasAccount: () => void;
  onBlockedProvider: () => void;
}) {
  const [profile, setProfile] = useState<EditableProfile>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cta,
          profile: {
            name: profile.name.trim(),
            shortDescription: profile.shortDescription.trim() || null,
            longDescription: rawPayload.longDescription,
            industry: profile.industry.trim() || null,
            locationCity: profile.locationCity.trim() || null,
            locationState: profile.locationState.trim() || null,
            locationCountry: profile.locationCountry.trim() || null,
            foundedOn: profile.foundedOn.trim() || null,
            totalFundingUsd: rawPayload.totalFundingUsd,
            numFundingRounds: rawPayload.numFundingRounds,
            website: profile.website.trim() || null,
            linkedinUrl: profile.linkedinUrl.trim() || null,
            crunchbaseUrl: profile.crunchbaseUrl.trim() || null,
            twitterUrl: profile.twitterUrl.trim() || null,
            businessModel: isBusinessModel(profile.businessModel)
              ? profile.businessModel
              : null,
            sources: rawPayload.sources,
          },
        }),
      });
      const data = (await res.json()) as
        | { redirect: string; accountId: string; companyUuid: string; joined?: boolean }
        | { error: string };
      if (!res.ok) {
        if ("error" in data && data.error === "already_has_account") {
          onAlreadyHasAccount();
          return;
        }
        if ("error" in data && data.error === "blocked_provider") {
          onBlockedProvider();
          return;
        }
        setError("error" in data ? data.error : "claim_failed");
        return;
      }
      if ("redirect" in data) {
        window.location.href = data.redirect;
      }
    } catch (e) {
      setError((e as Error).message ?? "claim_failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Compact form: show the two most-edited fields up top, then a
  // collapsible "More details" disclosure for the rest. Keeps the
  // surface scannable while still letting the user correct everything.
  const sources = extracted?.sources ?? {};

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 280px",
        gap: 24,
        alignItems: "start",
      }}
    >
      <MagicGradientBorder>
        <div style={{ padding: 32 }}>
          <MagicFieldReveal index={0}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: "#00B48A",
                marginBottom: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MagicSparkle />
              <span>Profile ready</span>
            </div>
          </MagicFieldReveal>

          <MagicFieldReveal index={1}>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: -0.3,
                color: "#F4F6F8",
                lineHeight: 1.2,
              }}
            >
              Looks like you&apos;re from{" "}
              <span style={{ color: "#00B48A" }}>
                {profile.name.trim() || domain}
              </span>
              .
            </h1>
          </MagicFieldReveal>

          <MagicFieldReveal index={2}>
            <p
              style={{
                margin: "10px 0 24px",
                fontSize: 14.5,
                lineHeight: 1.55,
                color: "#8A99A6",
              }}
            >
              We pieced together a quick profile from your homepage. Confirm
              what looks right and we&apos;ll set up your workspace.
            </p>
          </MagicFieldReveal>

          <MagicFieldReveal index={3}>
            <Field
              label="Company"
              value={profile.name}
              onChange={(v) => setProfile({ ...profile, name: v })}
              source={sources.name}
              autoFocus
            />
          </MagicFieldReveal>

          <MagicFieldReveal index={4}>
            <Field
              label="What they do"
              value={profile.shortDescription}
              onChange={(v) => setProfile({ ...profile, shortDescription: v })}
              source={sources.shortDescription}
              multiline
            />
          </MagicFieldReveal>

          <MagicFieldReveal index={5}>
            <BusinessModelField
              value={profile.businessModel}
              onChange={(v) => setProfile({ ...profile, businessModel: v })}
              source={sources.businessModel}
            />
          </MagicFieldReveal>

          <MagicFieldReveal index={6}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{
                marginTop: 4,
                background: "transparent",
                border: "none",
                color: "#8A99A6",
                fontSize: 12.5,
                cursor: "pointer",
                padding: "8px 0",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  transition: "transform 200ms ease",
                  transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                }}
              >
                ›
              </span>
              {expanded ? "Hide details" : "More details"}
            </button>
          </MagicFieldReveal>

          {expanded ? (
            <div
              style={{
                display: "grid",
                // `minmax(0, 1fr)` is the key — without it, a wide child
                // (e.g. a long source-chip label) can grow its column past
                // its share and squeeze the sibling to near-zero width.
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 14,
                marginTop: 8,
              }}
            >
              <MagicFieldReveal index={0}>
                <Field
                  label="Industry"
                  value={profile.industry}
                  onChange={(v) => setProfile({ ...profile, industry: v })}
                  source={sources.industry}
                />
              </MagicFieldReveal>
              <MagicFieldReveal index={1}>
                <Field
                  label="Founded"
                  value={profile.foundedOn}
                  onChange={(v) => setProfile({ ...profile, foundedOn: v })}
                  source={sources.foundedOn}
                />
              </MagicFieldReveal>
              <MagicFieldReveal index={2}>
                <Field
                  label="City"
                  value={profile.locationCity}
                  onChange={(v) => setProfile({ ...profile, locationCity: v })}
                  source={sources.locationCity}
                />
              </MagicFieldReveal>
              <MagicFieldReveal index={3}>
                <Field
                  label="State / region"
                  value={profile.locationState}
                  onChange={(v) => setProfile({ ...profile, locationState: v })}
                  source={sources.locationState}
                />
              </MagicFieldReveal>
              <MagicFieldReveal index={4}>
                <Field
                  label="Country"
                  value={profile.locationCountry}
                  onChange={(v) =>
                    setProfile({ ...profile, locationCountry: v })
                  }
                  source={sources.locationCountry}
                />
              </MagicFieldReveal>
              <MagicFieldReveal index={5}>
                <Field
                  label="Website"
                  value={profile.website}
                  onChange={(v) => setProfile({ ...profile, website: v })}
                />
              </MagicFieldReveal>
              <MagicFieldReveal index={6} style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="LinkedIn"
                  value={profile.linkedinUrl}
                  onChange={(v) => setProfile({ ...profile, linkedinUrl: v })}
                  source={sources.linkedinUrl}
                />
              </MagicFieldReveal>
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                marginTop: 16,
                padding: 10,
                borderRadius: 6,
                background: "rgba(255,107,91,0.10)",
                border: "1px solid rgba(255,107,91,0.30)",
                color: "#FFB7AD",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <MagicFieldReveal index={6}>
            <div
              style={{
                marginTop: 24,
                padding: 12,
                background: "rgba(0,180,138,0.06)",
                border: "1px solid rgba(0,180,138,0.20)",
                borderRadius: 8,
                fontSize: 12.5,
                color: "#A6E6D2",
                lineHeight: 1.5,
              }}
            >
              You&apos;ll claim{" "}
              <strong style={{ color: "#F4F6F8" }}>{domain}</strong> as your
              verified company domain.
            </div>
          </MagicFieldReveal>

          <MagicFieldReveal index={7}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !profile.name.trim()}
              style={{
                marginTop: 18,
                padding: "13px 26px",
                borderRadius: 10,
                background:
                  submitting || !profile.name.trim()
                    ? "rgba(0,180,138,0.45)"
                    : "linear-gradient(135deg, #00B48A 0%, #00A07B 100%)",
                color: "#0F1A24",
                fontWeight: 600,
                fontSize: 14.5,
                border: "1px solid #00B48A",
                boxShadow:
                  submitting || !profile.name.trim()
                    ? "none"
                    : "0 8px 24px rgba(0,180,138,0.30), 0 1px 0 rgba(255,255,255,0.10) inset",
                cursor:
                  submitting || !profile.name.trim() ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Claiming…" : "Claim this company"}
            </button>
          </MagicFieldReveal>
        </div>
      </MagicGradientBorder>

      <SideRail extracted={extracted} domain={domain} />
    </div>
  );
}

function SideRail({
  extracted,
  domain,
}: {
  extracted: ExtractedSummary | null;
  domain: string;
}) {
  const techPreview = extracted?.techStack.slice(0, 4) ?? [];
  return (
    <MagicSidePanel
      title="Agent worklog"
      subtitle={`Everything I read about ${domain} to build this profile.`}
    >
      <MagicSidePanelStep
        status="done"
        label="Scanned homepage"
        detail={
          extracted?.cached.website
            ? "from 7-day cache"
            : "live · markdown extracted"
        }
      />
      <MagicSidePanelStep
        status={extracted?.techStack.length ? "done" : "error"}
        label="Detected tech stack"
        detail={
          techPreview.length
            ? `${techPreview.join(", ")}${
                (extracted?.techStack.length ?? 0) > 4
                  ? ` +${(extracted?.techStack.length ?? 0) - 4} more`
                  : ""
              }`
            : "no signals matched"
        }
      />
      <MagicSidePanelStep
        status="done"
        label="Reading details into a profile"
        detail="Claude Haiku · structured fields"
      />
      <MagicSidePanelStep
        status="done"
        label="Identified peer cohort"
        detail="b2b_saas · seed · us"
      />
      <div
        style={{
          marginTop: 6,
          paddingTop: 14,
          borderTop: "1px solid rgba(38,57,71,0.7)",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <MagicSourceChip source="Homepage" />
        <MagicSourceChip source="Tech stack" />
        <MagicSourceChip source="Cohorts" tone="muted" />
      </div>
    </MagicSidePanel>
  );
}

function Field({
  label,
  value,
  onChange,
  source,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  source?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  return (
    // `minWidth: 0` opts the field out of CSS-grid's default min-content
    // sizing so its parent column can shrink instead of growing to fit
    // a long label-row.
    <div style={{ marginBottom: 14, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          // Label + chip can wrap to a second line when the chip text is
          // long — beats squeezing the input or clipping the chip.
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 6,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: "#8A99A6",
            marginRight: 4,
            flexShrink: 0,
          }}
        >
          {label}
        </span>
        {source ? <MagicSourceChip source={source} /> : null}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          autoFocus={autoFocus}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 12px",
            background: "#0B141C",
            border: "1px solid #263947",
            borderRadius: 8,
            color: "#F4F6F8",
            fontFamily: "inherit",
            fontSize: 14,
            boxSizing: "border-box",
            resize: "vertical",
            outline: "none",
            lineHeight: 1.5,
            minWidth: 0,
          }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#0B141C",
            border: "1px solid #263947",
            borderRadius: 8,
            color: "#F4F6F8",
            fontFamily: "inherit",
            fontSize: 14,
            boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      )}
    </div>
  );
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#00B48A";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,180,138,0.18)";
}
function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#263947";
  e.currentTarget.style.boxShadow = "none";
}
