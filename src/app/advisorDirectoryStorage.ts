import type { AdvisorConnectionPermissions } from "./advisorConnectionStorage.ts";

export type FuelAdvisorAccountStatus = "signed_up" | "listed";
export type FuelAdvisorSource = "fuel" | "scraped" | "manual";
export type CompanyAdvisorLinkStatus = "linked" | "invite_sent" | "connected";

export type FuelAdvisorProfile = {
  id: string;
  name: string;
  title: string;
  company: string;
  email?: string;
  linkedinUrl?: string;
  photoUrl?: string;
  expertise: string[];
  focusIndustries: string[];
  accountStatus: FuelAdvisorAccountStatus;
  source: FuelAdvisorSource;
  publicCard: boolean;
  bio?: string;
  createdAt: number;
  updatedAt: number;
};

export type CompanyAdvisorLink = {
  id: string;
  companyId: string;
  companyName: string;
  advisorId: string;
  status: CompanyAdvisorLinkStatus;
  recipientEmail?: string;
  inviteToken?: string;
  invitedAt?: number;
  connectedAt?: number;
  permissions?: AdvisorConnectionPermissions;
  linkedAt: number;
};

export type AdvisorDraftInput = {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  linkedinUrl?: string;
  photoUrl?: string;
  expertise?: string;
  focusIndustries?: string;
  publicCard?: boolean;
};

export const ADVISOR_DIRECTORY_CHANGE_EVENT = "fuel-advisor-directory-changed";

const PROFILE_KEY = "fuel-advisor-directory:v2";
const LINK_KEY = "fuel-company-advisor-links:v2";

const SEED_PROFILES: FuelAdvisorProfile[] = [
  {
    id: "adv-matt",
    name: "Matt L.",
    title: "Operating partner",
    company: "York IE",
    email: "matt@york.ie",
    linkedinUrl: "https://www.linkedin.com/in/matt-yorkie",
    expertise: [],
    focusIndustries: [],
    accountStatus: "signed_up",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-priya",
    name: "Priya R.",
    title: "Go-to-market advisor",
    company: "York IE",
    email: "priya@york.ie",
    linkedinUrl: "https://www.linkedin.com/in/priya-r-gtm",
    expertise: [],
    focusIndustries: [],
    accountStatus: "signed_up",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-jess",
    name: "Jess K.",
    title: "Product advisor",
    company: "York IE",
    email: "jess@york.ie",
    expertise: [],
    focusIndustries: [],
    accountStatus: "signed_up",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-ryan",
    name: "Ryan K.",
    title: "Finance advisor",
    company: "York IE",
    email: "ryan@york.ie",
    expertise: [],
    focusIndustries: [],
    accountStatus: "signed_up",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-amy",
    name: "Amy M.",
    title: "Growth advisor",
    company: "York IE",
    email: "amy@york.ie",
    expertise: [],
    focusIndustries: [],
    accountStatus: "signed_up",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-dana",
    name: "Dana Chen",
    title: "Fractional chief financial officer",
    company: "Independent",
    email: "dana.chen@northledger.co",
    linkedinUrl: "https://www.linkedin.com/in/dana-chen-cfo",
    expertise: [],
    focusIndustries: [],
    accountStatus: "listed",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-alex",
    name: "Alex Rivera",
    title: "Revenue operations advisor",
    company: "Relay Advisory",
    email: "alex@relayadvisory.com",
    linkedinUrl: "https://www.linkedin.com/in/alex-rivera-revops",
    expertise: [],
    focusIndustries: [],
    accountStatus: "listed",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-jordan",
    name: "Jordan Hale",
    title: "Board advisor",
    company: "Independent",
    email: "jordan.hale@haleops.com",
    linkedinUrl: "https://www.linkedin.com/in/jordanhale",
    expertise: [],
    focusIndustries: [],
    accountStatus: "listed",
    source: "fuel",
    publicCard: false,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "adv-sam",
    name: "Sam Okonkwo",
    title: "Product strategy advisor",
    company: "Harbor Studio",
    email: "sam@harborstudio.io",
    linkedinUrl: "https://www.linkedin.com/in/sam-okonkwo",
    expertise: [],
    focusIndustries: [],
    accountStatus: "listed",
    source: "fuel",
    publicCard: true,
    createdAt: 1,
    updatedAt: 1,
  },
];

const SEED_LINKS: CompanyAdvisorLink[] = [
  { id: "link-matt-northstar", companyId: "northstar", companyName: "Northstar", advisorId: "adv-matt", status: "connected", linkedAt: 1 },
  { id: "link-priya-meridian", companyId: "meridian", companyName: "Meridian", advisorId: "adv-priya", status: "connected", linkedAt: 1 },
  { id: "link-dana-harbor", companyId: "harbor", companyName: "Harbor", advisorId: "adv-dana", status: "linked", linkedAt: 1 },
  { id: "link-alex-relay", companyId: "relay", companyName: "Relay", advisorId: "adv-alex", status: "connected", linkedAt: 1 },
  { id: "link-jordan-apex", companyId: "apex", companyName: "Apex", advisorId: "adv-jordan", status: "linked", linkedAt: 1 },
];

function emitChange() {
  window.dispatchEvent(new CustomEvent(ADVISOR_DIRECTORY_CHANGE_EVENT));
}

function readProfiles(): Record<string, FuelAdvisorProfile> {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      const seeded = Object.fromEntries(SEED_PROFILES.map(profile => [profile.id, profile]));
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Record<string, FuelAdvisorProfile>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return Object.fromEntries(SEED_PROFILES.map(profile => [profile.id, profile]));
  }
}

function writeProfiles(profiles: Record<string, FuelAdvisorProfile>) {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    emitChange();
  } catch {
    /* Demo environments may block storage. */
  }
}

function readLinks(): Record<string, CompanyAdvisorLink> {
  try {
    const raw = window.localStorage.getItem(LINK_KEY);
    if (!raw) {
      const seeded = Object.fromEntries(SEED_LINKS.map(link => [link.id, link]));
      window.localStorage.setItem(LINK_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Record<string, CompanyAdvisorLink>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return Object.fromEntries(SEED_LINKS.map(link => [link.id, link]));
  }
}

function writeLinks(links: Record<string, CompanyAdvisorLink>) {
  try {
    window.localStorage.setItem(LINK_KEY, JSON.stringify(links));
    emitChange();
  } catch {
    /* Demo environments may block storage. */
  }
}

function slugId(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "advisor";
}

function freshId(prefix: string, value: string) {
  const seed = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}`;
  return `${prefix}-${slugId(value)}-${seed}`;
}

function splitList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || undefined;
}

function normalizeLinkedIn(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes("linkedin.com")) return `https://${trimmed.replace(/^\/+/, "")}`;
  return `https://www.linkedin.com/in/${trimmed.replace(/^\/+/, "")}`;
}

export function listAdvisorProfiles(): FuelAdvisorProfile[] {
  return Object.values(readProfiles()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAdvisorProfile(advisorId: string): FuelAdvisorProfile | null {
  return readProfiles()[advisorId] ?? null;
}

export function listCompanyAdvisorLinks(companyId?: string): CompanyAdvisorLink[] {
  const links = Object.values(readLinks());
  if (!companyId) return links;
  return links.filter(link => link.companyId === companyId);
}

export function countCompanyAdvisors(companyId: string): number {
  return listCompanyAdvisorLinks(companyId).filter(link => getAdvisorProfile(link.advisorId)).length;
}

export function getCompanyAdvisorLink(companyId: string, advisorId: string): CompanyAdvisorLink | null {
  return Object.values(readLinks()).find(link => (
    link.companyId === companyId && link.advisorId === advisorId
  )) ?? null;
}

export function linkedCompanyCount(advisorId: string): number {
  return Object.values(readLinks()).filter(link => link.advisorId === advisorId).length;
}

export function searchAdvisorDirectory(query: string): FuelAdvisorProfile[] {
  const needle = query.trim().toLowerCase();
  const profiles = listAdvisorProfiles();
  if (!needle) return profiles.slice(0, 6);
  return profiles.filter(profile => {
    const haystack = [
      profile.name,
      profile.title,
      profile.company,
      profile.email,
      profile.linkedinUrl,
      profile.expertise.join(" "),
      profile.focusIndustries.join(" "),
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  }).slice(0, 8);
}

function linkedInPath(value?: string) {
  const normalized = normalizeLinkedIn(value);
  if (!normalized) return "";
  try {
    return new URL(normalized).pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return normalized.toLowerCase().replace(/\/+$/, "");
  }
}

export function findAdvisorByLinkedIn(url: string): FuelAdvisorProfile | null {
  const path = linkedInPath(url);
  if (!path) return null;
  return listAdvisorProfiles().find(profile => linkedInPath(profile.linkedinUrl) === path) ?? null;
}

export function findExactAdvisorMatch(draft: AdvisorDraftInput): FuelAdvisorProfile | null {
  const email = normalizeEmail(draft.email);
  const linkedin = normalizeLinkedIn(draft.linkedinUrl)?.toLowerCase();
  const name = draft.name.trim().toLowerCase();
  return listAdvisorProfiles().find(profile => {
    if (email && profile.email?.toLowerCase() === email) return true;
    if (linkedin && profile.linkedinUrl?.toLowerCase() === linkedin) return true;
    return Boolean(name) && profile.name.toLowerCase() === name && (
      !draft.company || profile.company.toLowerCase() === draft.company.trim().toLowerCase()
    );
  }) ?? null;
}

export function scrapeAdvisorProfile(draft: AdvisorDraftInput, existing?: FuelAdvisorProfile): FuelAdvisorProfile {
  const name = draft.name.trim() || existing?.name || "";
  const now = Date.now();
  return {
    id: existing?.id ?? freshId("adv", name),
    name,
    title: draft.title?.trim() || "",
    company: draft.company?.trim() || "",
    email: normalizeEmail(draft.email),
    linkedinUrl: normalizeLinkedIn(draft.linkedinUrl),
    photoUrl: draft.photoUrl?.trim() || existing?.photoUrl,
    expertise: splitList(draft.expertise),
    focusIndustries: splitList(draft.focusIndustries),
    accountStatus: existing?.accountStatus ?? "listed",
    source: existing?.source === "fuel" && existing.accountStatus === "signed_up" ? "fuel" : "manual",
    publicCard: draft.publicCard ?? existing?.publicCard ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function createAdvisorProfileFromDraft(draft: AdvisorDraftInput): FuelAdvisorProfile {
  const existing = findExactAdvisorMatch(draft);
  const scraped = scrapeAdvisorProfile(draft, existing ?? undefined);
  const profiles = readProfiles();
  profiles[scraped.id] = scraped;
  writeProfiles(profiles);
  return scraped;
}

export function enhanceAdvisorProfile(advisorId: string): FuelAdvisorProfile | null {
  return getAdvisorProfile(advisorId);
}

export function enhanceAdvisorProfiles(advisorIds: string[]): FuelAdvisorProfile[] {
  return advisorIds
    .map(id => enhanceAdvisorProfile(id))
    .filter((profile): profile is FuelAdvisorProfile => Boolean(profile));
}

export function linkAdvisorToCompany(input: {
  companyId: string;
  companyName: string;
  advisorId: string;
  status?: CompanyAdvisorLinkStatus;
  recipientEmail?: string;
}): CompanyAdvisorLink {
  const links = readLinks();
  const existing = Object.values(links).find(link => (
    link.companyId === input.companyId && link.advisorId === input.advisorId
  ));
  const next: CompanyAdvisorLink = {
    id: existing?.id ?? freshId("link", `${input.companyId}-${input.advisorId}`),
    companyId: input.companyId,
    companyName: input.companyName,
    advisorId: input.advisorId,
    status: input.status ?? existing?.status ?? "linked",
    recipientEmail: input.recipientEmail ?? existing?.recipientEmail,
    inviteToken: existing?.inviteToken,
    invitedAt: existing?.invitedAt,
    linkedAt: existing?.linkedAt ?? Date.now(),
  };
  links[next.id] = next;
  writeLinks(links);
  return next;
}

export function inviteAdvisorToCompany(input: {
  companyId: string;
  companyName: string;
  advisorId: string;
  email?: string;
  permissions?: AdvisorConnectionPermissions;
}): CompanyAdvisorLink {
  const advisor = getAdvisorProfile(input.advisorId);
  const links = readLinks();
  const existing = Object.values(links).find(link => (
    link.companyId === input.companyId && link.advisorId === input.advisorId
  ));
  const now = Date.now();
  const next: CompanyAdvisorLink = {
    id: existing?.id ?? freshId("link", `${input.companyId}-${input.advisorId}`),
    companyId: input.companyId,
    companyName: input.companyName,
    advisorId: input.advisorId,
    status: "invite_sent",
    recipientEmail: input.email?.trim() || advisor?.email || existing?.recipientEmail,
    inviteToken: existing?.inviteToken ?? freshId("inv", input.advisorId),
    invitedAt: now,
    permissions: input.permissions ?? existing?.permissions,
    connectedAt: undefined,
    linkedAt: existing?.linkedAt ?? now,
  };
  links[next.id] = next;
  writeLinks(links);
  return next;
}

export function updateCompanyAdvisorPermissions(input: {
  companyId: string;
  advisorId: string;
  permissions: AdvisorConnectionPermissions;
}): CompanyAdvisorLink | null {
  const links = readLinks();
  const existing = Object.values(links).find(link => (
    link.companyId === input.companyId && link.advisorId === input.advisorId
  ));
  if (!existing) return null;
  const next = { ...existing, permissions: input.permissions };
  links[next.id] = next;
  writeLinks(links);
  return next;
}

export function acceptCompanyAdvisorInvite(linkId: string): CompanyAdvisorLink | null {
  const links = readLinks();
  const current = links[linkId];
  if (!current || current.status !== "invite_sent") return null;
  const next: CompanyAdvisorLink = {
    ...current,
    status: "connected",
    connectedAt: Date.now(),
  };
  links[linkId] = next;
  writeLinks(links);
  return next;
}

export function declineCompanyAdvisorInvite(linkId: string): CompanyAdvisorLink | null {
  const links = readLinks();
  const current = links[linkId];
  if (!current || current.status !== "invite_sent") return null;
  const next: CompanyAdvisorLink = {
    ...current,
    status: "linked",
    invitedAt: undefined,
    inviteToken: undefined,
  };
  links[linkId] = next;
  writeLinks(links);
  return next;
}

export function isCompanyAdvisorInviteRecipient(email: string, link: CompanyAdvisorLink): boolean {
  const needle = email.trim().toLowerCase();
  if (!needle || link.status !== "invite_sent") return false;
  if (link.recipientEmail?.trim().toLowerCase() === needle) return true;
  const advisor = getAdvisorProfile(link.advisorId);
  return advisor?.email?.trim().toLowerCase() === needle;
}

export function listPendingCompanyAdvisorInvitesForEmail(email: string): CompanyAdvisorLink[] {
  const needle = email.trim().toLowerCase();
  if (!needle) return [];
  return Object.values(readLinks()).filter(link => isCompanyAdvisorInviteRecipient(needle, link));
}

/** First pending invite for this email, optionally skipping the founder's own company (inviter session). */
export function findPendingCompanyAdvisorInviteForRecipient(
  email: string,
  options?: { excludeCompanyId?: string },
): CompanyAdvisorLink | null {
  for (const link of listPendingCompanyAdvisorInvitesForEmail(email)) {
    if (options?.excludeCompanyId && link.companyId === options.excludeCompanyId) continue;
    return link;
  }
  return null;
}

export function getCompanyAdvisorLinkById(linkId: string): CompanyAdvisorLink | null {
  return readLinks()[linkId] ?? null;
}

export function formatAdvisorAccountStatus(status: FuelAdvisorAccountStatus): string {
  return status === "signed_up" ? "On Fuel" : "Listed on Fuel";
}

export function formatCompanyAdvisorLinkStatus(status: CompanyAdvisorLinkStatus): string {
  const labels: Record<CompanyAdvisorLinkStatus, string> = {
    linked: "Linked",
    invite_sent: "Invite sent",
    connected: "Connected",
  };
  return labels[status];
}

export function advisorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
