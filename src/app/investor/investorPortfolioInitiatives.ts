/** Demo value-creation initiatives logged per portfolio company (founder workspace). */

export type PortfolioInitiativePillar = "dev" | "mkt" | "rev";
export type PortfolioInitiativeKind = "continuous" | "one-time";
export type PortfolioInitiativeListStatus = "Active" | "Completed";

export type PortfolioInitiativeMilestone = {
  id: string;
  title: string;
  done: boolean;
};

export type PortfolioCompanyInitiative = {
  id: string;
  title: string;
  description: string;
  pillar: PortfolioInitiativePillar;
  kind: PortfolioInitiativeKind;
  status: PortfolioInitiativeListStatus;
  owner: string;
  assignees: string[];
  milestones: PortfolioInitiativeMilestone[];
};

export type PortfolioInitiativeRow = PortfolioCompanyInitiative & {
  companyId: string;
  companyName: string;
};

function ms(id: string, title: string, done: boolean): PortfolioInitiativeMilestone {
  return { id, title, done };
}

const PORTFOLIO_INITIATIVES_BY_COMPANY: Record<string, PortfolioCompanyInitiative[]> = {
  patriotpay: [
    {
      id: "pp-nrr",
      title: "Launch proactive NRR recovery for accounts below 100%",
      description: "Save motion with CS and product usage signals before renewals stack.",
      pillar: "mkt",
      kind: "continuous",
      status: "Active",
      owner: "Alex Rivera",
      assignees: ["Alex Rivera"],
      milestones: [
        ms("pp-nrr-1", "Define at-risk account criteria", true),
        ms("pp-nrr-2", "Pilot save playbook with CS", true),
        ms("pp-nrr-3", "Roll out to renewals queue", false),
        ms("pp-nrr-4", "Review NRR vs baseline", false),
        ms("pp-nrr-5", "Board checkpoint on retention", false),
      ],
    },
    {
      id: "pp-cac",
      title: "Establish CAC payback threshold and enforce in budget",
      description: "Set a hard payback ceiling and tie channel spend approvals to it.",
      pillar: "mkt",
      kind: "continuous",
      status: "Active",
      owner: "Jordan Lee",
      assignees: ["Jordan Lee"],
      milestones: [
        ms("pp-cac-1", "Model payback by channel", true),
        ms("pp-cac-2", "Agree threshold with finance", false),
        ms("pp-cac-3", "Update spend approval rules", false),
        ms("pp-cac-4", "First month under new guardrails", false),
      ],
    },
    {
      id: "pp-burn",
      title: "Reduce monthly net burn by 15% without cutting GTM capacity",
      description: "G&A and vendor levers that preserve pipeline coverage.",
      pillar: "rev",
      kind: "one-time",
      status: "Completed",
      owner: "Sam Patel",
      assignees: ["Sam Patel"],
      milestones: [
        ms("pp-burn-1", "Vendor spend review", true),
        ms("pp-burn-2", "Negotiate renewals", true),
        ms("pp-burn-3", "Implement savings plan", true),
        ms("pp-burn-4", "Report burn vs target", true),
      ],
    },
  ],
  "operator-ai": [
    {
      id: "op-enterprise",
      title: "Launch enterprise onboarding playbooks and success milestones",
      description: "Document onboarding stages, owners, and checkpoints tied to ACV band.",
      pillar: "mkt",
      kind: "continuous",
      status: "Active",
      owner: "Morgan Chen",
      assignees: ["Morgan Chen"],
      milestones: [
        ms("op-ent-1", "Map enterprise journey", true),
        ms("op-ent-2", "Draft playbooks by ACV band", true),
        ms("op-ent-3", "Train CS on milestones", true),
        ms("op-ent-4", "Measure time-to-value", false),
      ],
    },
    {
      id: "op-quality",
      title: "Ship workflow reliability sprint for top integration paths",
      description: "Cut failed automations on the three highest-volume customer recipes.",
      pillar: "dev",
      kind: "one-time",
      status: "Active",
      owner: "Dev lead",
      assignees: ["Dev lead"],
      milestones: [
        ms("op-q-1", "Identify top failure paths", true),
        ms("op-q-2", "Fix priority integrations", true),
        ms("op-q-3", "Monitor error budget", false),
      ],
    },
  ],
  "sync-sports": [
    {
      id: "ss-retention",
      title: "Stand up league-season retention reviews with product analytics",
      description: "Weekly reviews on active leagues and churn risk before season end.",
      pillar: "mkt",
      kind: "continuous",
      status: "Active",
      owner: "Taylor Brooks",
      assignees: ["Taylor Brooks"],
      milestones: [
        ms("ss-r-1", "Build league health dashboard", true),
        ms("ss-r-2", "Weekly review cadence", false),
        ms("ss-r-3", "Season-end retention report", false),
      ],
    },
    {
      id: "ss-mobile",
      title: "Mobile check-in MVP for venue staff",
      description: "Reduce game-day support load and improve live data quality.",
      pillar: "dev",
      kind: "one-time",
      status: "Completed",
      owner: "Engineering",
      assignees: ["Engineering"],
      milestones: [
        ms("ss-m-1", "Scope MVP flows", true),
        ms("ss-m-2", "Pilot at two venues", true),
        ms("ss-m-3", "Ship to early adopters", true),
      ],
    },
  ],
  winrate: [
    {
      id: "wr-pipeline",
      title: "Rebuild outbound pipeline with ICP scoring from win/loss data",
      description: "Align SDR targeting to segments with highest closed-won rate.",
      pillar: "mkt",
      kind: "continuous",
      status: "Active",
      owner: "Revenue ops",
      assignees: ["Revenue ops"],
      milestones: [
        ms("wr-1", "Win/loss analysis", true),
        ms("wr-2", "ICP scoring model", true),
        ms("wr-3", "Outbound list refresh", false),
        ms("wr-4", "Pipeline quality review", false),
      ],
    },
  ],
};

export function portfolioInitiativePillarLabel(pillar: PortfolioInitiativePillar): string {
  if (pillar === "dev") return "R&D";
  if (pillar === "mkt") return "GTM";
  return "G&A";
}

export function portfolioInitiativeKindLabel(kind: PortfolioInitiativeKind): string {
  return kind === "continuous" ? "Continuous" : "One-time";
}

export function portfolioInitiativeListStatus(item: PortfolioCompanyInitiative): PortfolioInitiativeListStatus {
  return item.status === "Completed" ? "Completed" : "Active";
}

export function portfolioInitiativeDisplayStatus(status: PortfolioInitiativeListStatus): string {
  return status === "Completed" ? "Completed" : "Open";
}

export function portfolioInitiativeAssignees(owner: string, assignees: string[]): string[] {
  const list = assignees.length ? assignees : owner.trim() ? [owner.trim()] : [];
  return list.filter(Boolean);
}

export function portfolioInitiativeMilestoneProgress(item: PortfolioCompanyInitiative) {
  const total = item.milestones.length;
  const done = item.milestones.filter(milestone => milestone.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

export function listPortfolioInitiativesForCompanies(
  companies: ReadonlyArray<{ id: string; displayName: string }>,
): PortfolioInitiativeRow[] {
  const rows: PortfolioInitiativeRow[] = [];
  for (const company of companies) {
    const items = PORTFOLIO_INITIATIVES_BY_COMPANY[company.id];
    if (!items?.length) continue;
    for (const item of items) {
      rows.push({
        ...item,
        companyId: company.id,
        companyName: company.displayName,
      });
    }
  }
  return rows.sort((a, b) => {
    const statusOrder = { Active: 0, Completed: 1 };
    const byStatus = statusOrder[portfolioInitiativeListStatus(a)] - statusOrder[portfolioInitiativeListStatus(b)];
    if (byStatus !== 0) return byStatus;
    return a.companyName.localeCompare(b.companyName) || a.title.localeCompare(b.title);
  });
}

export function countPortfolioInitiativesForCompanies(
  companies: ReadonlyArray<{ id: string; displayName: string }>,
): number {
  return listPortfolioInitiativesForCompanies(companies).length;
}
