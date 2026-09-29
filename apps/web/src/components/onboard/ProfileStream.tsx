"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { OnboardCard, OnboardHeading, OnboardBody } from "./layout";
import { ProfileConfirmCard, type EditableProfile } from "./ProfileConfirmCard";
import { type BusinessModel, isBusinessModel } from "@/lib/business-model";
type Cta = "benchmark" | "pitch-deck" | "explore";
type StepId = "website" | "techstack" | "extract" | "cohort";
type StepStatus = "pending" | "running" | "done" | "error";
interface StepState {
  id: StepId;
  label: string;
  status: StepStatus;
  error?: string;
}
interface EnrichmentPayload {
  domain: string;
  websiteUrl: string;
  name: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  industry: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  foundedOn: string | null;
  totalFundingUsd: number | null;
  numFundingRounds: number | null;
  crunchbaseUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  sources: Record<string, unknown>;
  providers: {
    website: boolean;
    techStack: boolean;
    crunchbase: boolean;
    linkedin: boolean;
    fuelData?: boolean;
  };
}
interface ExtractedProfile {
  domain: string;
  name: string | null;
  shortDescription: string | null;
  industry: string | null;
  foundedOn: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  businessModel: BusinessModel | null;
  sources: Partial<Record<string, string>>;
  cached: { website: boolean; techStack: boolean };
  error?: string;
}
interface OnboardProfilePayload {
  enrichment: EnrichmentPayload;
  extracted: ExtractedProfile | null;
}
const INITIAL_STEPS: StepState[] = [
  { id: "website", label: "Scanning your homepage", status: "pending" },
  { id: "techstack", label: "Detecting your tech stack", status: "pending" },
  {
    id: "extract",
    label: "Reading the details into a profile",
    status: "pending",
  },
  { id: "cohort", label: "Identifying your peer cohort", status: "pending" },
];
export function ProfileStream({
  cta,
  email,
  domain,
}: {
  cta: Cta;
  email: string;
  domain: string;
}) {
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [payload, setPayload] = useState<OnboardProfilePayload | null>(null);
  type ErrorState =
    | { kind: "blocked_provider" }
    | { kind: "already_has_account" }
    | { kind: "unknown"; message: string };
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runStream(setSteps, setPayload, (e) => setErrorState(e));
  }, []);
  if (errorState?.kind === "blocked_provider") {
    return (
      <OnboardCard>
        <OnboardHeading eyebrow="Sign-up paused">
          Use your work email so your numbers count.
        </OnboardHeading>
        <OnboardBody>
          You signed in as <strong>{email}</strong>. Personal webmail addresses
          can&apos;t verify a company domain — sign back in with your work email
          to continue.
        </OnboardBody>
      </OnboardCard>
    );
  }
  if (errorState?.kind === "already_has_account") {
    return (
      <OnboardCard>
        <OnboardHeading eyebrow="Welcome back">
          You already have a Fuel account.
        </OnboardHeading>
        <OnboardBody>
          <p>
            We found an existing membership for <strong>{email}</strong>.
            Continue to your workspace.
          </p>
          <Link
            href="/"
            style={{
              marginTop: 16,
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 8,
              background: "#00B48A",
              color: "#0F1A24",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to my workspace
          </Link>
        </OnboardBody>
      </OnboardCard>
    );
  }
  if (payload) {
    const { enrichment, extracted } = payload;
    // Merge: LLM extraction wins over raw enrichment for non-null values.
    // The user can still edit anything they want.
    const pick = (a: string | null | undefined, b: string | null | undefined) =>
      (a && a.trim()) || (b && b.trim()) || "";
    const initialProfile: EditableProfile = {
      name: pick(extracted?.name, enrichment.name) || domain,
      shortDescription: pick(
        extracted?.shortDescription,
        enrichment.shortDescription,
      ),
      industry: pick(extracted?.industry, enrichment.industry),
      locationCity: pick(extracted?.locationCity, enrichment.locationCity),
      locationState: pick(extracted?.locationState, enrichment.locationState),
      locationCountry: pick(
        extracted?.locationCountry,
        enrichment.locationCountry,
      ),
      foundedOn: pick(extracted?.foundedOn, enrichment.foundedOn),
      website: enrichment.websiteUrl,
      linkedinUrl: pick(extracted?.linkedinUrl, enrichment.linkedinUrl),
      crunchbaseUrl: enrichment.crunchbaseUrl ?? "",
      twitterUrl: pick(extracted?.twitterUrl, enrichment.twitterUrl),
      businessModel: isBusinessModel(extracted?.businessModel)
        ? extracted.businessModel
        : "",
    };
    // Tech-stack names for the worklog panel.
    const techStackNames = extractTechStackNames(enrichment);
    return (
      <ProfileConfirmCard
        cta={cta}
        domain={enrichment.domain}
        initial={initialProfile}
        rawPayload={enrichment}
        extracted={{
          sources: (extracted?.sources ?? {}) as Partial<
            Record<keyof EditableProfile, string>
          >,
          techStack: techStackNames,
          cached: extracted?.cached ?? { website: false, techStack: false },
        }}
        onAlreadyHasAccount={() =>
          setErrorState({ kind: "already_has_account" })
        }
        onBlockedProvider={() => setErrorState({ kind: "blocked_provider" })}
      />
    );
  }
  function extractTechStackNames(p: EnrichmentPayload): string[] {
    const techStack = p.sources?.techStack as
      | { detected?: Array<{ name?: string }> }
      | undefined;
    return (techStack?.detected ?? [])
      .map((d) => d.name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 12);
  }
  return (
    <OnboardCard>
      <OnboardHeading eyebrow="Setting up your workspace">
        We&apos;re profiling <span style={{ color: "#00B48A" }}>{domain}</span>.
      </OnboardHeading>
      <OnboardBody>
        <p style={{ marginBottom: 24 }}>
          One pass through your public footprint — this takes a few seconds.
          You&apos;ll get to review and edit everything before we save.
        </p>
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {steps.map((step) => (
            <li
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 0",
                borderBottom: "1px solid #1F3140",
              }}
            >
              <StepIcon status={step.status} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color:
                      step.status === "done"
                        ? "#F4F6F8"
                        : step.status === "running"
                          ? "#F4F6F8"
                          : step.status === "error"
                            ? "#FF6B5B"
                            : "#8A99A6",
                    fontWeight: step.status === "running" ? 500 : 400,
                  }}
                >
                  {step.label}
                </div>
                {step.error ? (
                  <div style={{ fontSize: 12, color: "#FF6B5B", marginTop: 2 }}>
                    {step.error}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </OnboardBody>
    </OnboardCard>
  );
}
function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: "#00B48A",
          color: "#0F1A24",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        ✓
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          border: "2px solid #00B48A",
          borderTopColor: "transparent",
          display: "inline-block",
          animation: "fuel-spin 0.9s linear infinite",
        }}
      >
        <style>{`@keyframes fuel-spin { to { transform: rotate(360deg); } }`}</style>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: "#FF6B5B",
          color: "#0F1A24",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        !
      </span>
    );
  }
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        border: "1px dashed #596876",
        display: "inline-block",
      }}
    />
  );
}
type StreamErrorState =
  | { kind: "blocked_provider" }
  | { kind: "already_has_account" }
  | { kind: "unknown"; message: string };
async function runStream(
  setSteps: (fn: (s: StepState[]) => StepState[]) => void,
  setPayload: (p: OnboardProfilePayload) => void,
  setError: (e: StreamErrorState) => void,
) {
  let res: Response;
  try {
    res = await fetch("/api/onboard/profile", {
      method: "GET",
      headers: { accept: "application/x-ndjson" },
    });
  } catch (e) {
    setError({ kind: "unknown", message: (e as Error).message });
    return;
  }
  if (!res.ok || !res.body) {
    setError({ kind: "unknown", message: `stream failed: ${res.status}` });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const event = JSON.parse(line) as
          | {
              type: "step";
              id: StepId;
              status: "running" | "done" | "error";
              label: string;
              error?: string;
            }
          | { type: "profile"; payload: OnboardProfilePayload }
          | { type: "done" }
          | {
              type: "error";
              code: "blocked_provider" | "already_has_account" | "unknown";
              message: string;
            };
        if (event.type === "step") {
          setSteps((prev) =>
            prev.map((s) =>
              s.id === event.id
                ? {
                    ...s,
                    status: event.status,
                    error: event.error,
                    label: event.label,
                  }
                : s,
            ),
          );
        } else if (event.type === "profile") {
          setPayload(event.payload);
        } else if (event.type === "error") {
          if (event.code === "blocked_provider") {
            setError({ kind: "blocked_provider" });
          } else if (event.code === "already_has_account") {
            setError({ kind: "already_has_account" });
          } else {
            setError({ kind: "unknown", message: event.message });
          }
          return;
        }
      } catch {
        // skip malformed line
      }
    }
  }
}
