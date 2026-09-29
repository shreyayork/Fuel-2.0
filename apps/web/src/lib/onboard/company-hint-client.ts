import type { CompanyHint } from "@/lib/onboard/company-hint-types";
import type {
  CompanyHintBundle,
  OnboardCompanyOption,
} from "@/lib/onboard/map-company-hit";

export type { CompanyHint, CompanyHintSource } from "@/lib/onboard/company-hint-types";
export type { CompanyHintBundle, OnboardCompanyOption };

let inflightHintBundle: Promise<CompanyHintBundle | null> | null = null;

async function doFetchCompanyHintBundle(): Promise<CompanyHintBundle | null> {
  try {
    const res = await fetch("/api/onboard/company-hint", {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as CompanyHintBundle;
  } catch {
    return null;
  }
}

/** Domain derived server-side from session email. Dedupes in-flight requests (StrictMode). */
export async function fetchCompanyHintBundle(): Promise<CompanyHintBundle | null> {
  inflightHintBundle ??= doFetchCompanyHintBundle().finally(() => {
    inflightHintBundle = null;
  });
  return inflightHintBundle;
}

/** Legacy single-hint fetch — prefer fetchCompanyHintBundle. */
export async function fetchCompanyHint(): Promise<CompanyHint | null> {
  const bundle = await fetchCompanyHintBundle();
  return bundle?.hint ?? null;
}

export async function fetchOnboardCompanySearch(
  query: string,
): Promise<OnboardCompanyOption[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(
      `/api/onboard/company-search?q=${encodeURIComponent(q)}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { candidates?: OnboardCompanyOption[] };
    return body.candidates ?? [];
  } catch {
    return [];
  }
}

function matchCompanyOption(
  query: string,
  candidates: OnboardCompanyOption[],
): OnboardCompanyOption | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    candidates.find((c) => c.name.toLowerCase() === q) ??
    candidates.find((c) => c.name.toLowerCase().startsWith(q)) ??
    candidates.find((c) => c.domain.toLowerCase().includes(q)) ??
    null
  );
}

export { matchCompanyOption };

function normalizeOnboardDomain(raw: string): string {
  let d = raw.trim().toLowerCase();
  if (!d) return "";
  if (/^https?:\/\//.test(d)) {
    try {
      d = new URL(d).hostname;
    } catch {
      return "";
    }
  }
  return d.replace(/^www\./, "").split("/")[0] ?? "";
}

/** Default picker row: email-domain match, then hint name, then sole candidate. */
export function pickDefaultCompanyCandidate(
  candidates: OnboardCompanyOption[],
  emailDomain: string,
  hintName?: string | null,
): OnboardCompanyOption | null {
  if (candidates.length === 0) return null;

  const normEmailDomain = normalizeOnboardDomain(emailDomain);
  if (normEmailDomain) {
    const domainMatch = candidates.find(
      (c) => normalizeOnboardDomain(c.domain) === normEmailDomain,
    );
    if (domainMatch) return domainMatch;
  }

  if (hintName?.trim()) {
    const hintMatch = matchCompanyOption(hintName, candidates);
    if (hintMatch) return hintMatch;
  }

  return candidates.length === 1 ? candidates[0]! : null;
}
