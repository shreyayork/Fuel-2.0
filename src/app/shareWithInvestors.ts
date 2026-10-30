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
