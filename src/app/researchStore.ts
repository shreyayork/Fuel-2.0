export type ResearchArtifact = {
  id: string;
  typeLabel: string;
  companyName: string;
  authorEmail: string;
  createdAt: string;
  title: string;
  body: string;
  subject?: string;
};

const STORAGE_KEY = "fuel-research-artifacts-v1";
const DEMO_SEED_KEY = "fuel-research-demo-seeded-v1";

export function loadResearchArtifacts(): ResearchArtifact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResearchArtifact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResearchArtifacts(entries: ResearchArtifact[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function formatResearchDisplayDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function buildResearchTitle(typeLabel: string, companyName: string, iso: string): string {
  return `${typeLabel} — ${companyName} — ${formatResearchDisplayDate(iso)}`;
}

export function createResearchArtifact({
  typeLabel,
  companyName,
  body,
  authorEmail = "shreya.g@york.ie",
  subject,
}: {
  typeLabel: string;
  companyName: string;
  body: string;
  authorEmail?: string;
  subject?: string;
}): ResearchArtifact {
  const createdAt = new Date().toISOString();
  return {
    id: `research-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    typeLabel,
    companyName,
    authorEmail,
    createdAt,
    title: buildResearchTitle(typeLabel, companyName, createdAt),
    body,
    subject: subject ?? companyName,
  };
}

export const PITCH_DECK_MISSING_RESEARCH_BODY = [
  "I don't have a contextItemId or attachmentId to extract the PDF from — those are required inputs for this playbook and weren't provided alongside the run request.",
  "",
  "To proceed, I need one of the following:",
  "• The contextItemId of the uploaded pitch deck in this company's Data Room or chat context",
  "• An attachmentId if the deck was uploaded directly in Ask Fuel",
  "",
  "Could you share the contextItemId (and attachmentId if known), or confirm you'd like me to check this company's recent context items for an uploaded deck?",
].join("\n");

export function kpiBenchmarkResearchBody(companyName: string): string {
  return [
    `Headline metrics for ${companyName} were compared to the peer cohort's p25/p50/p75/p90 bands.`,
    "Growth and retention sit below median; capital efficiency metrics need verification before board or investor conversations.",
    "Open this run in Ask Fuel to refresh after benchmark updates.",
  ].join("\n");
}

export function seedDemoResearchArtifacts(companyName: string): ResearchArtifact[] {
  const pitchDate = new Date("2026-09-02T12:00:00Z").toISOString();
  const kpiDate = new Date("2026-08-07T12:00:00Z").toISOString();
  return [
    {
      id: "research-demo-pitch-deck",
      typeLabel: "Pitch Deck Evaluation",
      companyName,
      authorEmail: "shreya.g@york.ie",
      createdAt: pitchDate,
      title: buildResearchTitle("Pitch Deck Evaluation", companyName, pitchDate),
      body: PITCH_DECK_MISSING_RESEARCH_BODY,
      subject: companyName,
    },
    {
      id: "research-demo-kpi",
      typeLabel: "KPI Benchmark",
      companyName,
      authorEmail: "shreya.g@york.ie",
      createdAt: kpiDate,
      title: buildResearchTitle("KPI Benchmark", companyName, kpiDate),
      body: kpiBenchmarkResearchBody(companyName),
      subject: companyName,
    },
  ];
}

export function ensureDemoResearchSeed(companyName: string): ResearchArtifact[] {
  try {
    if (localStorage.getItem(DEMO_SEED_KEY)) return loadResearchArtifacts();
    const seed = seedDemoResearchArtifacts(companyName);
    saveResearchArtifacts(seed);
    localStorage.setItem(DEMO_SEED_KEY, "1");
    return seed;
  } catch {
    return loadResearchArtifacts();
  }
}

export function briefToResearchBody(brief: {
  summary: { headline: string; points: { text: string }[] };
  stateOfBusiness: string;
  dataQualityFlag: string | null;
}): string {
  const parts = [brief.summary.headline, brief.stateOfBusiness];
  if (brief.dataQualityFlag) parts.push(brief.dataQualityFlag);
  if (brief.summary.points.length) {
    parts.push(
      brief.summary.points.map(p => `• ${p.text}`).join("\n"),
    );
  }
  return parts.filter(Boolean).join("\n\n");
}
