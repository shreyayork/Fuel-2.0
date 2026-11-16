import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "./a11y/useDialogA11y.ts";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim.ts";
import { CompanyAdvisorShareDialog } from "./CompanyAdvisorShareDialog.tsx";
import { DEFAULT_ADVISOR_PERMISSIONS, type AdvisorConnectionPermissions } from "./advisorConnectionStorage.ts";
import {
  ADVISOR_DIRECTORY_CHANGE_EVENT,
  advisorInitials,
  createAdvisorProfileFromDraft,
  enhanceAdvisorProfiles,
  findAdvisorByLinkedIn,
  findExactAdvisorMatch,
  formatAdvisorAccountStatus,
  formatCompanyAdvisorLinkStatus,
  getAdvisorProfile,
  getCompanyAdvisorLink,
  inviteAdvisorToCompany,
  linkAdvisorToCompany,
  linkedCompanyCount,
  listCompanyAdvisorLinks,
  updateCompanyAdvisorPermissions,
  type AdvisorDraftInput,
  type CompanyAdvisorLink,
  type FuelAdvisorProfile,
} from "./advisorDirectoryStorage.ts";
import { upsertNotification } from "./notificationStorage.ts";
import {
  INVESTOR_PORTFOLIO,
  SUGGESTED_FOUNDERS,
  buildPortfolioCompanyView,
  type InvestorCompanyRef,
  type PortfolioCompany,
  type PortfolioCompanyView,
} from "./investor/investorData.ts";
import "./advisorConnections.css";
import "./advisorsPage.css";
import "./investor/investor.css";

type CompanySearchOption = {
  id: string;
  name: string;
  domain: string;
  description: string;
  meta: string;
  logo: string;
  logoBg: string;
};

const EXTRA_COMPANY_OPTIONS: CompanySearchOption[] = [
  {
    id: "york-ie",
    name: "York IE",
    domain: "york.ie",
    description: "Operating and investment firm partnering with early-stage software companies.",
    meta: "Manchester, NH, US · 51–200",
    logo: "Y",
    logoBg: "#00B48A",
  },
  {
    id: "independent",
    name: "Independent",
    domain: "",
    description: "Independent advisor, not tied to a firm.",
    meta: "Advisor · Independent",
    logo: "I",
    logoBg: "#2A5C8C",
  },
  {
    id: "relay-advisory",
    name: "Relay Advisory",
    domain: "relayadvisory.com",
    description: "Revenue operations advisory for B2B software teams.",
    meta: "United States · 1–10",
    logo: "R",
    logoBg: "#3A8C5B",
  },
  {
    id: "harbor-studio",
    name: "Harbor Studio",
    domain: "harborstudio.io",
    description: "Product strategy studio for technical founders.",
    meta: "United States · 1–10",
    logo: "H",
    logoBg: "#8C3A5B",
  },
];

const COMPANY_SEARCH_OPTIONS: CompanySearchOption[] = [
  ...SUGGESTED_FOUNDERS.map(company => ({
    id: company.id,
    name: company.displayName,
    domain: company.domain,
    description: company.matchReason,
    meta: [company.headquarters, company.employees].filter(Boolean).join(" · "),
    logo: company.logo,
    logoBg: company.logoBg,
  })),
  ...EXTRA_COMPANY_OPTIONS.filter(option => (
    !SUGGESTED_FOUNDERS.some(company => company.displayName.toLowerCase() === option.name.toLowerCase())
  )),
];

function catalogCompanyProfile(name: string): { company: PortfolioCompanyView; aboutOnly: boolean } | null {
  const needle = name.trim().toLowerCase();
  if (!needle || needle === "independent") return null;
  const portfolio = INVESTOR_PORTFOLIO.find(company => (
    company.displayName.toLowerCase() === needle || company.name.toLowerCase() === needle
  ));
  if (portfolio) return { company: buildPortfolioCompanyView(portfolio), aboutOnly: false };
  const suggested = SUGGESTED_FOUNDERS.find(company => (
    company.displayName.toLowerCase() === needle || company.name.toLowerCase() === needle
  ));
  if (suggested) {
    return { company: buildPortfolioCompanyView(companyShell(suggested)), aboutOnly: true };
  }
  const extra = EXTRA_COMPANY_OPTIONS.find(option => option.name.toLowerCase() === needle && option.domain);
  if (!extra) return null;
  const [headquarters, employees] = extra.meta.split(" · ");
  return {
    company: buildPortfolioCompanyView(companyShell({
      id: extra.id,
      name: extra.name,
      displayName: extra.name,
      domain: extra.domain,
      logo: extra.logo,
      logoBg: extra.logoBg,
      meta: extra.meta,
      headquarters: headquarters ?? "",
      employees: employees ?? "",
      linkedin: "",
      onFuel: true,
    })),
    aboutOnly: true,
  };
}

function advisorCompanyProfile(name: string): PortfolioCompanyView | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const known = catalogCompanyProfile(trimmed);
  if (known) return known.company;
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "advisor-company";
  return buildPortfolioCompanyView(companyShell({
    id: `advisor-company-${slug}`,
    name: slug,
    displayName: trimmed,
    domain: "",
    logo: trimmed.slice(0, 1).toUpperCase(),
    logoBg: "#2A5C8C",
    meta: "",
    headquarters: "",
    employees: "",
    linkedin: "",
    onFuel: false,
  }));
}

function companyShell(company: InvestorCompanyRef & { stage?: string; sector?: string }): PortfolioCompany {
  return {
    ...company,
    ownership: "",
    invested: "",
    investedAmount: 0,
    estimatedValue: 0,
    arr: "",
    arrGrowthQoQ: 0,
    nrr: 0,
    runwayMonths: 0,
    runway: "",
    stage: company.stage ?? "",
    sector: company.sector ?? "",
    investedAt: "",
    daysSinceBenchmark: 0,
    health: "watch",
    strugglingAreas: [],
    lastUpdate: "",
  };
}

function matchCompanyOption(query: string): CompanySearchOption | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  return COMPANY_SEARCH_OPTIONS.find(option => option.name.toLowerCase() === needle)
    ?? COMPANY_SEARCH_OPTIONS.find(option => option.domain.toLowerCase() === needle)
    ?? null;
}

function filterCompanyOptions(query: string): CompanySearchOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return COMPANY_SEARCH_OPTIONS.filter(option => (
    option.name.toLowerCase().includes(needle)
    || option.domain.toLowerCase().includes(needle)
    || option.description.toLowerCase().includes(needle)
  )).slice(0, 6);
}

const EMPTY_DRAFT: AdvisorDraftInput = {
  name: "",
  title: "",
  company: "",
  email: "",
  linkedinUrl: "",
  photoUrl: "",
  expertise: "",
  focusIndustries: "",
  publicCard: true,
};

function AdvisorAvatar({ advisor, size = 40 }: { advisor: FuelAdvisorProfile; size?: number }) {
  return (
    <span className="advisors-avatar" style={{ height: size, width: size, fontSize: size > 40 ? 16 : 13 }}>
      {advisor.photoUrl ? <img src={advisor.photoUrl} alt="" /> : advisorInitials(advisor.name)}
    </span>
  );
}

function cardLinkStatus(status: CompanyAdvisorLink["status"]) {
  if (status === "connected") return { label: "Active", tone: "active" };
  if (status === "invite_sent") return { label: "Invited", tone: "invited" };
  return { label: "Linked", tone: "linked" };
}

function inviteActionLabel(status?: CompanyAdvisorLink["status"]) {
  if (status === "connected") return "Connected";
  if (status === "invite_sent") return "Resend invite";
  return "Invite";
}

function AdvisorCardMenu({
  onManagePermissions,
}: {
  onManagePermissions: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="advisors-card-menu" ref={wrapRef}>
      <button
        type="button"
        className="advisors-card-menu-trigger"
        aria-label="Advisor options"
        aria-expanded={open}
        onClick={event => {
          event.stopPropagation();
          setOpen(current => !current);
        }}
      >
        ···
      </button>
      {open ? (
        <div className="advisors-card-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={event => {
              event.stopPropagation();
              setOpen(false);
              onManagePermissions();
            }}
          >
            Manage shared access
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CompanyNameSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => filterCompanyOptions(value), [value]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions.length]);

  function pick(option: CompanySearchOption) {
    onChange(option.name);
    setOpen(false);
  }

  const query = value.trim();
  const tagged = matchCompanyOption(query);
  const showSuggestions = open && query.length > 0 && suggestions.length > 0;

  if (tagged) {
    return (
      <div ref={wrapRef} className="advisors-company-tag">
        <span className="advisors-suggest-logo" style={{ background: tagged.logoBg }}>{tagged.logo}</span>
        <strong>{tagged.name}</strong>
        {tagged.domain ? <em>{tagged.domain}</em> : null}
        <button type="button" aria-label="Clear company" onClick={() => onChange("")}>✕</button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="advisors-typeahead">
      <input
        value={value}
        onChange={event => {
          onChange(event.target.value);
          setOpen(event.target.value.trim().length > 0);
        }}
        onKeyDown={event => {
          if (event.key === "ArrowDown" && suggestions.length > 0) {
            event.preventDefault();
            setHighlight(current => Math.min(current + 1, suggestions.length - 1));
          }
          if (event.key === "ArrowUp" && suggestions.length > 0) {
            event.preventDefault();
            setHighlight(current => Math.max(current - 1, 0));
          }
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Company"
        autoComplete="off"
      />
      {showSuggestions ? (
        <div className="advisors-suggest-panel" role="listbox">
          {suggestions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={`advisors-suggest-item${index === highlight ? " is-active" : ""}`}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(option)}
            >
              <span className="advisors-suggest-logo" style={{ background: option.logoBg }}>{option.logo}</span>
              <span className="advisors-suggest-copy">
                <span className="advisors-suggest-title">
                  <strong>{option.name}</strong>
                  {option.domain ? <em>{option.domain}</em> : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdvisorProfileDrawer({
  advisor,
  link,
  onClose,
  onInvite,
  onViewFuelProfile,
}: {
  advisor: FuelAdvisorProfile | null;
  link: CompanyAdvisorLink | null;
  onClose: () => void;
  onInvite: (advisor: FuelAdvisorProfile) => void;
  onViewFuelProfile?: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const open = Boolean(advisor);
  useDialogA11y(open, dialogRef, onClose);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!advisor) return null;

  const meta = [advisor.title, advisor.company].filter(Boolean).join(" · ");
  const companyCount = linkedCompanyCount(advisor.id);
  const connected = link?.status === "connected";

  return createPortal(
    <div
      className="investor-company-drawer-scrim profile-complete-drawer-scrim"
      onPointerDown={handleScrimPointerDown}
      role="presentation"
    >
      <aside
        ref={dialogRef}
        className="investor-company-drawer profile-complete-drawer"
        {...drawerPanelPointerProps()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisor-profile-drawer-title"
      >
        <header className="investor-company-drawer-head">
          <div className="investor-company-drawer-identity">
            <span className="investor-company-drawer-founder-avatar" aria-hidden="true">
              {advisorInitials(advisor.name)}
            </span>
            <div>
              <span className="investor-company-drawer-eyebrow">Advisor</span>
              <strong id="advisor-profile-drawer-title">{advisor.name}</strong>
              {meta ? <p>{meta}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="investor-company-drawer-close profile-complete-drawer-x"
            onClick={onClose}
            aria-label="Close advisor profile"
            data-autofocus
          >
            ✕
          </button>
        </header>

        <div className="investor-company-drawer-tags">
          <span className={`investor-company-drawer-tag${advisor.accountStatus === "signed_up" ? " is-fuel" : ""}`}>
            {formatAdvisorAccountStatus(advisor.accountStatus)}
          </span>
          {link ? (
            <span className="investor-company-drawer-tag">{formatCompanyAdvisorLinkStatus(link.status)}</span>
          ) : null}
          <span className="investor-company-drawer-tag">
            {companyCount === 1 ? "1 linked company" : `${companyCount} linked companies`}
          </span>
        </div>

        <div className="investor-company-drawer-body">
          <section className="investor-company-drawer-section">
            <span className="investor-company-drawer-section-label">Profile</span>
            <div className="investor-company-drawer-facts">
              {advisor.title ? (
                <div>
                  <em>Title</em>
                  <strong>{advisor.title}</strong>
                </div>
              ) : null}
              {advisor.company ? (
                <div>
                  <em>Company</em>
                  <strong>{advisor.company}</strong>
                </div>
              ) : null}
              {advisor.email ? (
                <div>
                  <em>Email</em>
                  <strong>
                    <a href={`mailto:${advisor.email}`}>{advisor.email}</a>
                  </strong>
                </div>
              ) : null}
              {advisor.linkedinUrl ? (
                <div>
                  <em>LinkedIn</em>
                  <strong>
                    <a href={advisor.linkedinUrl} target="_blank" rel="noreferrer">View LinkedIn profile</a>
                  </strong>
                </div>
              ) : null}
              <div>
                <em>On Fuel</em>
                <strong>{advisor.accountStatus === "signed_up" ? "Yes" : "Listed, not signed up"}</strong>
              </div>
              {advisor.expertise.length > 0 ? (
                <div>
                  <em>Expertise</em>
                  <strong>{advisor.expertise.join(", ")}</strong>
                </div>
              ) : null}
              {advisor.focusIndustries.length > 0 ? (
                <div>
                  <em>Focus</em>
                  <strong>{advisor.focusIndustries.join(", ")}</strong>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <footer className="investor-company-drawer-foot">
          {onViewFuelProfile ? (
            <button type="button" className="investor-suggested-primary" onClick={onViewFuelProfile}>
              View full profile
            </button>
          ) : null}
          {connected ? (
            <button type="button" className="investor-suggested-primary" disabled>Connected</button>
          ) : (
            <button
              type="button"
              className={onViewFuelProfile ? "investor-suggested-ghost" : "investor-suggested-primary"}
              onClick={() => onInvite(advisor)}
            >
              {inviteActionLabel(link?.status)}
            </button>
          )}
          {advisor.email ? (
            <a className="investor-suggested-ghost" href={`mailto:${advisor.email}`}>Email</a>
          ) : null}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export function AdvisorsPage({
  companyId,
  companyName,
  onOpenCompany,
}: {
  companyId: string;
  companyName: string;
  onOpenCompany?: (company: InvestorCompanyRef) => void;
}) {
  const [draft, setDraft] = useState<AdvisorDraftInput>(EMPTY_DRAFT);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [linkedinBusy, setLinkedinBusy] = useState(false);
  const [linkedinNote, setLinkedinNote] = useState("");
  const linkedinRequest = useRef(0);
  const [banner, setBanner] = useState("");
  const [tick, setTick] = useState(0);
  const [shareDialog, setShareDialog] = useState<{
    advisor: FuelAdvisorProfile;
    mode: "invite" | "manage";
  } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setTick(value => value + 1);
    window.addEventListener(ADVISOR_DIRECTORY_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(ADVISOR_DIRECTORY_CHANGE_EVENT, refresh);
  }, []);

  const closeDialog = () => {
    if (scraping) return;
    linkedinRequest.current += 1;
    setLinkedinBusy(false);
    setLinkedinNote("");
    setDialogOpen(false);
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
  };

  function revealProfile(advisorId: string) {
    linkedinRequest.current += 1;
    setLinkedinBusy(false);
    setLinkedinNote("");
    setDialogOpen(false);
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setProfileId(advisorId);
  }

  useDialogA11y(dialogOpen, dialogRef, closeDialog);

  const linkedAdvisors = useMemo(() => {
    return listCompanyAdvisorLinks(companyId)
      .map(link => {
        const advisor = getAdvisorProfile(link.advisorId);
        return advisor ? { advisor, link } : null;
      })
      .filter((row): row is { advisor: FuelAdvisorProfile; link: CompanyAdvisorLink } => Boolean(row))
      .sort((a, b) => a.advisor.name.localeCompare(b.advisor.name));
  }, [companyId, tick]);

  const selected = selectedId ? getAdvisorProfile(selectedId) : null;
  const exactDraftMatch = findExactAdvisorMatch(draft);
  const matchedAdvisor = selected ?? exactDraftMatch;
  const profileAdvisor = profileId ? getAdvisorProfile(profileId) : null;
  const profileLink = profileAdvisor ? getCompanyAdvisorLink(companyId, profileAdvisor.id) : null;

  function openAdd() {
    setProfileId(null);
    setDraft(EMPTY_DRAFT);
    setSelectedId(null);
    setDialogOpen(true);
  }

  function openProfile(advisorId: string) {
    setDialogOpen(false);
    setProfileId(advisorId);
  }

  function updateDraft<K extends keyof AdvisorDraftInput>(key: K, value: AdvisorDraftInput[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    if (key === "name" || key === "email" || key === "linkedinUrl") {
      setSelectedId(null);
    }
  }

  function notifyInvite(advisor: FuelAdvisorProfile, invited: boolean) {
    upsertNotification({
      id: `advisor-invite-${companyId}-${advisor.id}`,
      kind: "advisor",
      title: invited ? `Invite sent to ${advisor.name}` : `${advisor.name} added`,
      message: invited
        ? advisor.accountStatus === "signed_up"
          ? `${advisor.name} already has a Fuel account. They can accept and start monitoring ${companyName}.`
          : `${advisor.name} is listed on Fuel. We sent an invite to join and connect with ${companyName}.`
        : `${advisor.name} is now on your advisors list.`,
      action: { type: "navigate", label: "View advisors", page: "advisors" },
      sourceLabel: "Advisors",
    });
  }

  function openInviteDialog(advisor: FuelAdvisorProfile) {
    setShareDialog({ advisor, mode: "invite" });
  }

  function openManagePermissions(advisor: FuelAdvisorProfile) {
    setShareDialog({ advisor, mode: "manage" });
  }

  function sendInvite(advisor: FuelAdvisorProfile, permissions: AdvisorConnectionPermissions) {
    inviteAdvisorToCompany({
      companyId,
      companyName,
      advisorId: advisor.id,
      email: advisor.email,
      permissions,
    });
    notifyInvite(advisor, true);
    setShareDialog(null);
    setBanner(advisor.accountStatus === "signed_up"
      ? `Invite sent. ${advisor.name} can accept from Fuel.`
      : `Invite sent. ${advisor.name} can join Fuel and then connect.`);
    if (profileId !== advisor.id) revealProfile(advisor.id);
  }

  function savePermissions(advisor: FuelAdvisorProfile, permissions: AdvisorConnectionPermissions) {
    updateCompanyAdvisorPermissions({
      companyId,
      advisorId: advisor.id,
      permissions,
    });
    setShareDialog(null);
    setBanner(`Updated shared access for ${advisor.name}.`);
  }

  function handleLink(advisor: FuelAdvisorProfile) {
    linkAdvisorToCompany({
      companyId,
      companyName,
      advisorId: advisor.id,
    });
    notifyInvite(advisor, false);
    setBanner(`${advisor.name} is now on your advisors list.`);
    revealProfile(advisor.id);
  }

  async function handleCreate() {
    if (!draft.name.trim()) return;
    const match = findExactAdvisorMatch(draft);
    if (match) {
      handleLink(match);
      return;
    }
    setScraping(true);
    await new Promise(resolve => window.setTimeout(resolve, 1100));
    const created = createAdvisorProfileFromDraft(draft);
    linkAdvisorToCompany({
      companyId,
      companyName,
      advisorId: created.id,
    });
    notifyInvite(created, false);
    setScraping(false);
    setBanner(`${created.name} is listed with the details you entered.`);
    revealProfile(created.id);
  }

  async function handleEnhanceLinkedIn() {
    const url = draft.linkedinUrl.trim();
    if (!url || linkedinBusy) return;
    const request = ++linkedinRequest.current;
    setLinkedinBusy(true);
    setLinkedinNote("");
    await new Promise(resolve => window.setTimeout(resolve, 700));
    if (linkedinRequest.current !== request) return;
    const profile = findAdvisorByLinkedIn(url);
    if (!profile) {
      setLinkedinBusy(false);
      setLinkedinNote("Nothing came back from that LinkedIn URL.");
      return;
    }
    const company = matchCompanyOption(profile.company);
    setDraft(current => ({
      ...current,
      name: profile.name,
      title: profile.title,
      email: profile.email ?? "",
      company: company?.name ?? profile.company,
      expertise: profile.expertise.join(", "),
      focusIndustries: profile.focusIndustries.join(", "),
      linkedinUrl: profile.linkedinUrl ?? current.linkedinUrl,
      photoUrl: profile.photoUrl ?? "",
      publicCard: profile.publicCard,
    }));
    setSelectedId(profile.id);
    setLinkedinBusy(false);
  }

  async function handleEnhanceAll() {
    if (linkedAdvisors.length === 0) return;
    setEnhancing(true);
    await new Promise(resolve => window.setTimeout(resolve, 900));
    enhanceAdvisorProfiles(linkedAdvisors.map(row => row.advisor.id));
    setEnhancing(false);
    setBanner("Nothing else is on file. Blank fields stay blank.");
  }

  const dialogTitle = "Add advisor";
  const dialogEyebrow = "Network";

  return (
    <div className="advisors-page">
      <div className="advisors-page-head">
        <div>
          <h1>Advisors</h1>
          <p>
            {linkedAdvisors.length === 1
              ? "1 active"
              : `${linkedAdvisors.length} active`}
            {" · "}
            Search Fuel before creating anyone new. A listed profile can exist before they sign up.
          </p>
        </div>
        <div className="advisors-page-actions">
          <button
            type="button"
            className="secondary"
            disabled={enhancing || linkedAdvisors.length === 0}
            onClick={handleEnhanceAll}
          >
            {enhancing ? "Enhancing…" : "Enhance all"}
          </button>
          <button type="button" className="primary" onClick={openAdd}>
            + Add advisor
          </button>
        </div>
      </div>

      {banner ? <div className="advisors-banner" role="status">{banner}</div> : null}

      {linkedAdvisors.length === 0 ? (
        <div className="overview-panel advisors-empty">
          <h2>No advisors on this company yet</h2>
          <p>
            Search Fuel for someone you already work with. If they are listed but not signed up,
            invite them. If they are not on Fuel at all, create a profile and we will fill it in.
          </p>
          <button type="button" className="primary" onClick={openAdd}>+ Add advisor</button>
        </div>
      ) : (
        <div className="advisors-grid">
          {linkedAdvisors.map(({ advisor, link }) => (
            <article
              key={advisor.id}
              className="overview-panel advisors-card"
              onClick={() => openProfile(advisor.id)}
            >
              <div className="advisors-card-top">
                <AdvisorAvatar advisor={advisor} />
                <div className="advisors-card-copy">
                  <strong>{advisor.name}</strong>
                  <em title={[advisor.title, advisor.company].filter(Boolean).join(" · ")}>
                    {[advisor.title, advisor.company].filter(Boolean).join(" · ") || "—"}
                  </em>
                </div>
                <div className="advisors-card-top-actions">
                  <span className={`advisors-card-badge is-${cardLinkStatus(link.status).tone}`}>
                    {cardLinkStatus(link.status).label}
                  </span>
                  <AdvisorCardMenu onManagePermissions={() => openManagePermissions(advisor)} />
                </div>
              </div>
              <p className="advisors-count">
                {linkedCompanyCount(advisor.id) === 1
                  ? "1 linked company"
                  : `${linkedCompanyCount(advisor.id)} linked companies`}
              </p>
              <div className="advisors-card-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={event => {
                    event.stopPropagation();
                    const company = advisorCompanyProfile(advisor.company);
                    if (company && onOpenCompany) {
                      setProfileId(null);
                      onOpenCompany(company);
                      return;
                    }
                    openProfile(advisor.id);
                  }}
                >
                  View Fuel profile
                </button>
                {link.status === "connected" ? (
                  <button type="button" className="secondary advisors-invite-btn" disabled>Connected</button>
                ) : (
                  <button
                    type="button"
                    className="primary advisors-invite-btn"
                    onClick={event => {
                      event.stopPropagation();
                      openInviteDialog(advisor);
                    }}
                  >
                    {inviteActionLabel(link.status)}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <CompanyAdvisorShareDialog
        open={Boolean(shareDialog)}
        advisor={shareDialog?.advisor ?? null}
        companyName={companyName}
        mode={shareDialog?.mode ?? "invite"}
        initialPermissions={
          shareDialog
            ? getCompanyAdvisorLink(companyId, shareDialog.advisor.id)?.permissions ?? DEFAULT_ADVISOR_PERMISSIONS
            : DEFAULT_ADVISOR_PERMISSIONS
        }
        onClose={() => setShareDialog(null)}
        onSave={permissions => {
          if (!shareDialog) return;
          if (shareDialog.mode === "invite") {
            sendInvite(shareDialog.advisor, permissions);
            return;
          }
          savePermissions(shareDialog.advisor, permissions);
        }}
      />

      {dialogOpen ? createPortal(
        <div className="advisor-connection-scrim" role="presentation">
          <div
            ref={dialogRef}
            className="advisor-connection-dialog overview-panel advisors-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advisors-dialog-title"
          >
            <header className="advisor-connection-dialog-head">
              <div>
                <span>{dialogEyebrow}</span>
                <h2 id="advisors-dialog-title">{dialogTitle}</h2>
              </div>
              <button type="button" onClick={closeDialog} aria-label="Close">✕</button>
            </header>

            <div className="advisor-connection-dialog-body">
                <form
                  className="advisors-form"
                  onSubmit={event => {
                    event.preventDefault();
                    void handleCreate();
                  }}
                >
                  {scraping ? <p className="advisors-scrape-note">Saving…</p> : null}
                  <div className="advisors-field">
                    <span>LinkedIn URL</span>
                    <div className="advisors-linkedin-row">
                      <input
                        value={draft.linkedinUrl}
                        onChange={event => {
                          setLinkedinNote("");
                          updateDraft("linkedinUrl", event.target.value);
                        }}
                        placeholder="https://www.linkedin.com/in/…"
                        aria-label="LinkedIn URL"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="advisors-enhance-btn"
                        disabled={linkedinBusy || !draft.linkedinUrl.trim()}
                        onClick={() => void handleEnhanceLinkedIn()}
                      >
                        {linkedinBusy ? "Enhancing…" : "Enhance with LinkedIn"}
                      </button>
                    </div>
                    {linkedinNote ? <p className="advisors-linkedin-note">{linkedinNote}</p> : null}
                  </div>
                  <label className="advisors-field">
                    <span>Name</span>
                    <input
                      value={draft.name}
                      onChange={event => updateDraft("name", event.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="advisors-field">
                    <span>Title</span>
                    <input value={draft.title} onChange={event => updateDraft("title", event.target.value)} />
                  </label>
                  <label className="advisors-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={draft.email}
                      onChange={event => updateDraft("email", event.target.value)}
                    />
                  </label>
                  <div className="advisors-field">
                    <span>Company</span>
                    <CompanyNameSearch
                      value={draft.company ?? ""}
                      onChange={company => updateDraft("company", company)}
                    />
                  </div>
                  <label className="advisors-field">
                    <span>Expertise</span>
                    <input
                      value={draft.expertise}
                      onChange={event => updateDraft("expertise", event.target.value)}
                      placeholder="Go-to-market, pricing, revenue operations"
                    />
                  </label>
                  <label className="advisors-field">
                    <span>Focus industries</span>
                    <input
                      value={draft.focusIndustries}
                      onChange={event => updateDraft("focusIndustries", event.target.value)}
                      placeholder="Fintech, data infrastructure"
                    />
                  </label>
                  <label className="advisors-check">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.publicCard)}
                      onChange={event => updateDraft("publicCard", event.target.checked)}
                    />
                    <span>Allow a public Fuel card so people can find this advisor before they sign up.</span>
                  </label>
                </form>
            </div>

            <footer className="advisor-connection-dialog-actions">
              <>
                  <button type="button" className="secondary" onClick={closeDialog} disabled={scraping}>
                    Close
                  </button>
                  {matchedAdvisor ? (
                    <button
                      type="button"
                      className="primary"
                      disabled={scraping}
                      onClick={() => {
                        if (getCompanyAdvisorLink(companyId, matchedAdvisor.id)) {
                          openInviteDialog(matchedAdvisor);
                          return;
                        }
                        handleLink(matchedAdvisor);
                      }}
                    >
                      {getCompanyAdvisorLink(companyId, matchedAdvisor.id)
                        ? inviteActionLabel(getCompanyAdvisorLink(companyId, matchedAdvisor.id)?.status)
                        : "Link existing profile"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary"
                      disabled={scraping || !draft.name.trim()}
                      onClick={() => void handleCreate()}
                    >
                      {scraping ? "Creating profile…" : "Create profile"}
                    </button>
                  )}
              </>
            </footer>
          </div>
        </div>,
        document.body,
      ) : null}
      <AdvisorProfileDrawer
        advisor={profileAdvisor}
        link={profileLink}
        onClose={() => setProfileId(null)}
        onInvite={openInviteDialog}
        onViewFuelProfile={
          profileAdvisor && advisorCompanyProfile(profileAdvisor.company) && onOpenCompany
            ? () => {
                const resolved = advisorCompanyProfile(profileAdvisor.company);
                if (!resolved) return;
                setProfileId(null);
                onOpenCompany(resolved);
              }
            : undefined
        }
      />
    </div>
  );
}
