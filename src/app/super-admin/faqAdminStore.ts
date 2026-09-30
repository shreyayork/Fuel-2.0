import type { HelpFaqAudience, HelpFaqItem } from "../FuelHelpFaq";

export type HelpFaqAdminEntry = {
  id: string;
  question: string;
  answer: string;
  pointsText: string;
  footnote: string;
  published: boolean;
  founder: boolean;
  investor: boolean;
};

const STORAGE_KEY = "fuel-help-faq-admin-v1";

export function loadHelpFaqAdminEntries(): HelpFaqAdminEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HelpFaqAdminEntry[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveHelpFaqAdminEntries(entries: HelpFaqAdminEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("fuel-help-faq-admin-updated"));
  } catch {
    /* ignore */
  }
}

function parsePointsText(text: string): HelpFaqItem["points"] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return undefined;
  return lines.map(line => {
    const dash = line.indexOf(" – ");
    if (dash === -1) {
      const hy = line.indexOf(" - ");
      if (hy === -1) return { label: line, body: "" };
      return { label: line.slice(0, hy), body: line.slice(hy + 3) };
    }
    return { label: line.slice(0, dash), body: line.slice(dash + 3) };
  });
}

export function adminEntryToHelpFaqItem(entry: HelpFaqAdminEntry): HelpFaqItem {
  return {
    id: entry.id,
    question: entry.question,
    answer: entry.answer,
    points: parsePointsText(entry.pointsText),
    footnote: entry.footnote.trim() ? entry.footnote : undefined,
  };
}

export function getPublishedHelpFaqForAudience(audience: HelpFaqAudience): HelpFaqItem[] {
  const entries = loadHelpFaqAdminEntries();
  return entries
    .filter(entry => entry.published && (audience === "founder" ? entry.founder : entry.investor))
    .map(adminEntryToHelpFaqItem);
}

export function newHelpFaqAdminId() {
  return `faq-${Date.now().toString(36)}`;
}
