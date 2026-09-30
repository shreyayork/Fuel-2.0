import React, { useEffect, useState } from "react";
import { CreditsAdmin } from "./CreditsAdmin";
import { HelpFaqAdmin } from "./HelpFaqAdmin";
import { PLAYBOOKS } from "../fuelBrief";
import { SIGNAL_CATALOG } from "../signalCatalog";
import "./superAdmin.css";

type SuperAdminSection =
  | "overview"
  | "users"
  | "signals"
  | "playbooks"
  | "credits"
  | "coupons"
  | "providers"
  | "advisors"
  | "chips"
  | "help";

type SuperAdminCard = {
  id: SuperAdminSection;
  title: string;
  body: string;
};

const NAV_PRIMARY: { id: SuperAdminSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "signals", label: "Signals" },
  { id: "playbooks", label: "Playbooks" },
  { id: "credits", label: "Credits" },
  { id: "coupons", label: "Coupons" },
];

const NAV_SECONDARY: { id: SuperAdminSection; label: string }[] = [
  { id: "providers", label: "Service providers" },
  { id: "advisors", label: "Advisors" },
  { id: "chips", label: "Chips management" },
  { id: "help", label: "Help & FAQ" },
];

const OVERVIEW_CARDS: SuperAdminCard[] = [
  {
    id: "users",
    title: "Users",
    body: "Reconcile Cognito signups with Fuel accounts, onboarding status, and purchased plans.",
  },
  {
    id: "signals",
    title: "Signals",
    body: "The global catalog of quantitative metrics and qualitative observations we extract from every content item.",
  },
  {
    id: "playbooks",
    title: "Playbooks",
    body: "Curate York IE’s global operating frameworks — diligence, GTM, board prep, and guided wizards.",
  },
  {
    id: "credits",
    title: "Credits",
    body: "Edit credit plans, Pro subscriber tiers, custom costs, and top-up packs — with optional Stripe Price sync.",
  },
  {
    id: "coupons",
    title: "Coupons",
    body: "Create Stripe coupon campaigns, mint unique promotion codes, and email them to Fuel 1.0 promo recipients.",
  },
  {
    id: "providers",
    title: "Service Providers",
    body: "Curate the global directory of law firms, banks, SaaS vendors, etc.",
  },
  {
    id: "advisors",
    title: "Advisors",
    body: "Curate instance-level advisors visible to every account alongside each account’s own.",
  },
  {
    id: "chips",
    title: "Chips management",
    body: "Edit York IE partner marketing headlines for R&D, GTM, and G&A insight chips.",
  },
  {
    id: "help",
    title: "Help & FAQ",
    body: "Curate the platform FAQ — questions, answers, publish state, and display order.",
  },
];

const ADMIN_USERS = [
  { name: "Shreya Gokani", email: "shreya.g@york.ie", cognito: "Linked", plan: "Pro", onboarding: "Complete" },
  { name: "Maya Chen", email: "maya@operator.ai", cognito: "Linked", plan: "Free", onboarding: "Complete" },
  { name: "James Okonkwo", email: "james@patriotpay.com", cognito: "Pending", plan: "Free", onboarding: "In progress" },
  { name: "Priya Shah", email: "priya@northstar.vc", cognito: "Linked", plan: "Pro", onboarding: "Complete" },
];

const ADMIN_COUPONS = [
  { campaign: "Fuel 1.0 alumni", code: "FUEL-ALUM-25", off: "25%", sent: "142", status: "Active" },
  { campaign: "Beta founders", code: "BETA-2K", off: "2,000 credits", sent: "18", status: "Active" },
  { campaign: "York IE network", code: "YORK-PROMO", off: "Pro 3 months", sent: "0", status: "Draft" },
];

const ADMIN_PROVIDERS = [
  { name: "Wilson Sonsini", kind: "Law firm", region: "US" },
  { name: "Silicon Valley Bank", kind: "Bank", region: "US" },
  { name: "Stripe", kind: "SaaS vendor", region: "Global" },
  { name: "HubSpot", kind: "SaaS vendor", region: "Global" },
  { name: "Orrick", kind: "Law firm", region: "US / EU" },
];

const ADMIN_ADVISORS = [
  { name: "York IE product partnership", track: "R&D", visible: "Every account" },
  { name: "York IE GTM partnership", track: "GTM", visible: "Every account" },
  { name: "York IE FinOps partnership", track: "G&A", visible: "Every account" },
];

const CHIP_SEED = [
  { track: "R&D", headline: "York IE product partnership — design and engineering that ships with you" },
  { track: "GTM", headline: "York IE GTM partnership — website, demand, social, and RevOps" },
  { track: "G&A", headline: "York IE FinOps partnership — bookkeeping and operating finance" },
];

function readFuelTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem("fuel-ui-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyFuelTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("fuel-ui-theme", theme);
  } catch {
    /* ignore */
  }
}

function SectionHead({ title, lede }: { title: string; lede: string }) {
  return (
    <header>
      <h1 className="sa-page-title">{title}</h1>
      <p className="sa-page-lede">{lede}</p>
    </header>
  );
}

function AdminTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overview-panel sa-table-wrap">
      <table className="sa-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cellIndex > 0 ? "sa-muted" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewSection({ onOpen }: { onOpen: (id: SuperAdminSection) => void }) {
  return (
    <>
      <SectionHead title="Super Admin" lede="Platform-level curation and maintenance." />
      <div className="sa-tile-grid">
        {OVERVIEW_CARDS.map(card => (
          <button
            key={card.id}
            type="button"
            className="sa-tile"
            onClick={() => onOpen(card.id)}
          >
            <strong>{card.title}</strong>
            <span>{card.body}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function ChipsSection() {
  const [chips, setChips] = useState(CHIP_SEED);

  return (
    <>
      <SectionHead
        title="Chips management"
        lede="Edit York IE partner marketing headlines for R&D, GTM, and G&A insight chips."
      />
      <div className="overview-panel sa-section" style={{ marginTop: 22 }}>
        <div className="sa-chip-list">
          {chips.map((chip, index) => (
            <div key={chip.track} className="sa-chip-row">
              <label htmlFor={`sa-chip-${chip.track}`}>{chip.track}</label>
              <textarea
                id={`sa-chip-${chip.track}`}
                value={chip.headline}
                onChange={event => {
                  const next = event.target.value;
                  setChips(current => current.map((item, i) => (
                    i === index ? { ...item, headline: next } : item
                  )));
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SuperAdminSectionView({
  section,
  onOpen,
}: {
  section: SuperAdminSection;
  onOpen: (id: SuperAdminSection) => void;
}) {
  switch (section) {
    case "overview":
      return <OverviewSection onOpen={onOpen} />;
    case "users":
      return (
        <>
          <SectionHead
            title="Users"
            lede="Reconcile Cognito signups with Fuel accounts, onboarding status, and purchased plans."
          />
          <div className="sa-section">
            <AdminTable
              columns={["Name", "Email", "Cognito", "Plan", "Onboarding"]}
              rows={ADMIN_USERS.map(user => [
                user.name, user.email, user.cognito, user.plan, user.onboarding,
              ])}
            />
          </div>
        </>
      );
    case "signals":
      return (
        <>
          <SectionHead
            title="Signals"
            lede="The global catalog of quantitative metrics and qualitative observations we extract from every content item."
          />
          <div className="sa-section">
            <AdminTable
              columns={["Category", "Signals"]}
              rows={SIGNAL_CATALOG.map(cat => [
                cat.label,
                String(cat.signals.length),
              ])}
            />
          </div>
        </>
      );
    case "playbooks":
      return (
        <>
          <SectionHead
            title="Playbooks"
            lede="Curate York IE’s global operating frameworks — diligence, GTM, board prep, and guided wizards."
          />
          <div className="sa-section">
            <AdminTable
              columns={["Playbook", "Category", "Kind"]}
              rows={PLAYBOOKS.map(pb => [pb.name, pb.category, pb.kind])}
            />
          </div>
        </>
      );
    case "credits":
      return <CreditsAdmin />;
    case "coupons":
      return (
        <>
          <SectionHead
            title="Coupons"
            lede="Create Stripe coupon campaigns, mint unique promotion codes, and email them to Fuel 1.0 promo recipients."
          />
          <div className="sa-section">
            <AdminTable
              columns={["Campaign", "Code", "Offer", "Emailed", "Status"]}
              rows={ADMIN_COUPONS.map(row => [row.campaign, row.code, row.off, row.sent, row.status])}
            />
          </div>
        </>
      );
    case "providers":
      return (
        <>
          <SectionHead
            title="Service Providers"
            lede="Curate the global directory of law firms, banks, SaaS vendors, etc."
          />
          <div className="sa-section">
            <AdminTable
              columns={["Provider", "Type", "Region"]}
              rows={ADMIN_PROVIDERS.map(row => [row.name, row.kind, row.region])}
            />
          </div>
        </>
      );
    case "advisors":
      return (
        <>
          <SectionHead
            title="Advisors"
            lede="Curate instance-level advisors visible to every account alongside each account’s own."
          />
          <div className="sa-section">
            <AdminTable
              columns={["Advisor", "Track", "Visibility"]}
              rows={ADMIN_ADVISORS.map(row => [row.name, row.track, row.visible])}
            />
          </div>
        </>
      );
    case "chips":
      return <ChipsSection />;
    case "help":
      return <HelpFaqAdmin />;
  }
}

export function SuperAdminDashboard({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<SuperAdminSection>("overview");
  const [theme, setTheme] = useState<"dark" | "light">(() => readFuelTheme());

  useEffect(() => {
    applyFuelTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector(".sa-edit-dialog")) return;
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="sa-shell" role="dialog" aria-modal="true" aria-labelledby="sa-topbar-title">
      <header className="sa-topbar">
        <button type="button" className="sa-back" onClick={onClose}>
          Back to Fuel
        </button>
        <div id="sa-topbar-title" className="sa-topbar-title">Super Admin</div>
        <button
          type="button"
          className="sa-theme"
          onClick={() => setTheme(prev => (prev === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>
      <div className="sa-body">
        <nav className="sa-nav" aria-label="Super Admin">
          {NAV_PRIMARY.map(item => (
            <button
              key={item.id}
              type="button"
              className={`sa-nav-item${section === item.id ? " is-active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="sa-nav-gap" />
          {NAV_SECONDARY.map(item => (
            <button
              key={item.id}
              type="button"
              className={`sa-nav-item${section === item.id ? " is-active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <main className="sa-main">
          <SuperAdminSectionView section={section} onOpen={setSection} />
        </main>
      </div>
    </div>
  );
}
