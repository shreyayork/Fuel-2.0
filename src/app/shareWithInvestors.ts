import {
  ensureDemoShareInvestorLinks,
  getAdvisorProfile,
  listCompanyAdvisorLinks,
} from "./advisorDirectoryStorage.ts";
import { DEFAULT_ADVISOR_ID, DEFAULT_ADVISOR_NAME } from "./advisorConnectionStorage.ts";

export type ShareInvestorOption = {
  id: string;
  name: string;
  subtitle: string;
  email?: string;
  photoUrl?: string;
};

/** Baseline investors always available to share with on the demo founder company. */
const DEMO_SHARE_INVESTORS: ShareInvestorOption[] = [
  {
    id: DEFAULT_ADVISOR_ID,
    name: DEFAULT_ADVISOR_NAME,
    subtitle: "Lead investor · connected",
    email: "team@york.ie",
  },
  {
    id: "adv-matt",
    name: "Matt L.",
    subtitle: "Operating partner · York IE",
    email: "matt@york.ie",
  },
  {
    id: "adv-priya",
    name: "Priya R.",
    subtitle: "Go-to-market advisor · York IE",
    email: "priya@york.ie",
  },
];

function optionFromAdvisorId(advisorId: string): ShareInvestorOption | null {
  const profile = getAdvisorProfile(advisorId);
  if (!profile) return null;
  const subtitle = [profile.title, profile.company].filter(Boolean).join(" · ") || "Connected investor";
  return {
    id: profile.id,
    name: profile.name,
    subtitle,
    email: profile.email?.trim() || undefined,
    photoUrl: profile.photoUrl?.trim() || undefined,
  };
}

/**
 * Investors / advisors the founding team can share initiatives and data-room
 * files with. Prefers connected company links; seeds demo investors so the
 * control is never empty in the product demo.
 */
export function listShareableInvestorsForCompany(companyId: string): ShareInvestorOption[] {
  ensureDemoShareInvestorLinks(companyId, companyId);

  const byId = new Map<string, ShareInvestorOption>();

  listCompanyAdvisorLinks(companyId)
    .filter(link => link.status === "connected" || link.status === "linked")
    .forEach(link => {
      const option = optionFromAdvisorId(link.advisorId);
      if (option) byId.set(option.id, option);
    });

  DEMO_SHARE_INVESTORS.forEach(option => {
    const existing = byId.get(option.id);
    if (!existing) {
      byId.set(option.id, option);
      return;
    }
    if (!existing.email && option.email) {
      byId.set(option.id, { ...existing, email: option.email });
    }
  });

  scaleDemoShareInvestors(companyId).forEach(option => {
    if (!byId.has(option.id)) byId.set(option.id, option);
  });

  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function formatShareWithSummary(
  selectedIds: ReadonlyArray<string>,
  options: ReadonlyArray<ShareInvestorOption>,
): string {
  const investorIds = selectedIds.filter(id => !id.startsWith("email:"));
  if (investorIds.length === 0) return "Private";
  if (investorIds.length === 1) {
    const match = options.find(option => option.id === investorIds[0]);
    return match ? match.name : "1 person";
  }
  if (investorIds.length === options.length && options.length > 1) {
    return "All connected investors";
  }
  return `${investorIds.length} people`;
}

export function toggleShareInvestorId(
  selectedIds: ReadonlyArray<string>,
  investorId: string,
): string[] {
  if (selectedIds.includes(investorId)) {
    return selectedIds.filter(id => id !== investorId);
  }
  return [...selectedIds, investorId];
}

/** Firm label for grouping roster rows (parsed from subtitle). */
export function shareInvestorFirmLabel(option: ShareInvestorOption): string {
  const parts = option.subtitle.split("·").map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) return "Other connections";
  const last = parts[parts.length - 1]!;
  if (/^(connected|linked|pending)$/i.test(last) && parts.length >= 2) {
    return parts[parts.length - 2]!;
  }
  if (/^(connected|linked|pending)$/i.test(last)) {
    if (option.email?.includes("york.ie")) return "York IE";
    return "Independent";
  }
  return last;
}

export function shareInvestorRowSubtitle(option: ShareInvestorOption): string {
  const firm = shareInvestorFirmLabel(option);
  const contact = option.email?.trim() || "Connected";
  return `${firm} · ${contact}`;
}

export function groupShareInvestorsByFirm(
  options: ReadonlyArray<ShareInvestorOption>,
): Array<{ firm: string; items: ShareInvestorOption[] }> {
  const byFirm = new Map<string, ShareInvestorOption[]>();
  options.forEach(option => {
    const firm = shareInvestorFirmLabel(option);
    const bucket = byFirm.get(firm) ?? [];
    bucket.push(option);
    byFirm.set(firm, bucket);
  });
  return [...byFirm.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([firm, items]) => ({
      firm,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

const SCALE_DEMO_FIRMS = [
  "York IE",
  "Atlas Venture",
  "Northview Capital",
  "Summit Partners",
  "Harbor Street",
  "Redwood Growth",
] as const;

function scaleDemoShareInvestors(companyId: string): ShareInvestorOption[] {
  if (companyId !== "patriotpay") return [];
  const firstNames = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Blake"];
  const lastInitials = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];
  const rows: ShareInvestorOption[] = [];
  let index = 0;
  for (const firm of SCALE_DEMO_FIRMS) {
    for (let slot = 0; slot < 12; slot += 1) {
      const fn = firstNames[slot % firstNames.length]!;
      const li = lastInitials[(slot + index) % lastInitials.length]!;
      const id = `scale-demo-${firm.toLowerCase().replace(/\s+/g, "-")}-${slot}`;
      rows.push({
        id,
        name: `${fn} ${li}.`,
        subtitle: slot % 3 === 0 ? `Partner · ${firm}` : `Principal · ${firm}`,
        email: `${fn.toLowerCase()}.${li.toLowerCase()}@${firm.split(" ")[0]!.toLowerCase()}.vc`,
      });
      index += 1;
    }
  }
  return rows;
}
