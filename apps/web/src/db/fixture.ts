// Fuel 2.0 seed fixture — ported verbatim from the design prototype's data.js.
// Kept in TypeScript so the seeder and UI can share the shape.

export const fixture = {
  companies: [
    { id: 1, name: "Datora", logo: "DT", domain: "datora.io", stage: "Series B", industry: "Data Infra", list: "portfolio", type: "investment", arr: 8.2e6, arrGrowth: 62, burn: 740000, runway: 22, nrr: 118, fitScore: 91, hq: "New York, NY", founded: 2019, employees: 142 },
    { id: 2, name: "Lattice Grid", logo: "LG", domain: "latticegrid.com", stage: "Series A", industry: "Climate Tech", list: "portfolio", type: "operating", arr: 3.1e6, arrGrowth: 38, burn: 420000, runway: 11, nrr: 96, fitScore: 74, hq: "Austin, TX", founded: 2021, employees: 48 },
    { id: 3, name: "Marlow AI", logo: "MA", domain: "marlow.ai", stage: "Series B", industry: "Dev Tools", list: "portfolio", type: "investment", arr: 12.8e6, arrGrowth: 88, burn: 910000, runway: 19, nrr: 132, fitScore: 94, hq: "Boston, MA", founded: 2020, employees: 201 },
    { id: 4, name: "Cortex Labs", logo: "CL", domain: "cortexlabs.bio", stage: "Seed", industry: "Bio+AI", list: "portfolio", type: "investment", arr: 0.8e6, arrGrowth: 210, burn: 220000, runway: 9, nrr: 104, fitScore: 82, hq: "San Diego, CA", founded: 2023, employees: 18 },
    { id: 5, name: "Rowan Works", logo: "RW", domain: "rowanworks.com", stage: "Series A", industry: "Vertical SaaS", list: "portfolio", type: "operating", arr: 4.7e6, arrGrowth: 54, burn: 380000, runway: 16, nrr: 112, fitScore: 86, hq: "Denver, CO", founded: 2020, employees: 62 },

    { id: 10, name: "Harbor Signal", logo: "HS", domain: "harborsignal.com", stage: "Series A", industry: "Fintech", list: "pipeline", type: "investment", arr: 5.4e6, arrGrowth: 78, nrr: 122, fitScore: 89, raising: true, targetRound: "Series B", hubspotStage: "Evaluation", hubspotId: "HS-2041", hubspotOwner: "M. Azar" },
    { id: 11, name: "Pinecrest", logo: "PC", domain: "pinecresthealth.com", stage: "Seed", industry: "Healthtech", list: "pipeline", type: "investment", arr: 1.2e6, arrGrowth: 140, nrr: 108, fitScore: 77, raising: true, targetRound: "Series A", hubspotStage: "First Meeting", hubspotId: "HS-2058", hubspotOwner: "K. Nguyen" },
    { id: 12, name: "Volt Atlas", logo: "VA", domain: "voltatlas.com", stage: "Series B", industry: "Energy", list: "pipeline", type: "investment", arr: 14.1e6, arrGrowth: 46, nrr: 115, fitScore: 83, raising: false, targetRound: "Series C", hubspotStage: "Diligence", hubspotId: "HS-2071", hubspotOwner: "M. Azar" },
    { id: 13, name: "Linework", logo: "LW", domain: "linework.dev", stage: "Seed", industry: "Dev Tools", list: "pipeline", type: "investment", arr: 0.3e6, arrGrowth: 310, nrr: 102, fitScore: 71, raising: true, targetRound: "Series A", hubspotStage: "Screening", hubspotId: "HS-2089", hubspotOwner: "J. Park" },
    { id: 14, name: "Sable Health", logo: "SH", domain: "sablehealth.com", stage: "Series A", industry: "Healthtech", list: "pipeline", type: "investment", arr: 6.8e6, arrGrowth: 51, nrr: 119, fitScore: 86, raising: true, targetRound: "Series B", hubspotStage: "Term Sheet", hubspotId: "HS-2104", hubspotOwner: "K. Nguyen" },
  ],

  people: [
    { id: 1, name: "Sarah Chen", avatar: "SC", role: "Partner", team: "investment", focus: "Infra + Dev Tools" },
    { id: 2, name: "Marcus Azar", avatar: "MA", role: "Principal", team: "investment", focus: "Fintech + Energy" },
    { id: 3, name: "Priya Ram", avatar: "PR", role: "Operating Partner", team: "operating", focus: "GTM" },
    { id: 4, name: "Jamie Park", avatar: "JP", role: "Associate", team: "investment", focus: "Dev Tools" },
    { id: 5, name: "Elena Ruiz", avatar: "ER", role: "Operating Partner", team: "operating", focus: "R&D" },
    { id: 6, name: "Kai Nguyen", avatar: "KN", role: "Partner", team: "investment", focus: "Health + Bio" },
    { id: 7, name: "Owen Reed", avatar: "OR", role: "Fractional CFO", team: "external", focus: "G&A" },
    { id: 8, name: "Mira Solano", avatar: "MS", role: "Fractional CMO", team: "external", focus: "GTM" },
    { id: 9, name: "Tomás Beltran", avatar: "TB", role: "Advisor", team: "external", focus: "Enterprise Sales" },
  ],

  initiatives: [
    { id: 101, companyId: 3, kind: "continuous", name: "Demand Gen Engine", area: "GTM", health: "on-track", automation: 72, since: "Jan '25", ownerId: 3, signal: [3, 5, 7, 8, 10, 12, 14, 16], value: "$28K / mo", team: [3] },
    { id: 102, companyId: 1, kind: "continuous", name: "RevOps Autopilot", area: "GTM", health: "on-track", automation: 81, since: "Sep '24", ownerId: 8, signal: [4, 4, 6, 7, 9, 10, 12, 14], value: "$22K / mo", team: [8] },
    { id: 103, companyId: 5, kind: "continuous", name: "Finance Copilot", area: "G&A", health: "drifting", automation: 48, since: "Nov '24", ownerId: 7, signal: [6, 7, 6, 5, 5, 4, 4, 3], value: "$14K / mo", team: [7] },
    { id: 104, companyId: 2, kind: "onetime", name: "Pricing Repack", area: "GTM", pct: 68, due: "May 22", ownerId: 8, team: [1, 3, 8] },
    { id: 105, companyId: 4, kind: "onetime", name: "Seed-to-A Narrative", area: "GTM", pct: 32, due: "Jun 10", ownerId: 3, team: [6, 3] },
    { id: 106, companyId: 1, kind: "onetime", name: "SOC 2 Readiness", area: "R&D", pct: 84, due: "Apr 30", ownerId: 5, team: [5, 1] },
    { id: 107, companyId: 3, kind: "onetime", name: "Board Pack Refresh", area: "G&A", pct: 12, due: "Jun 28", ownerId: 7, team: [7] },
  ],

  signals: [
    { companyId: 1, at: "2h", kind: "meeting", text: "QBR with Datora CEO — NRR pushed to 120%+, unlocking expansion into mid-market." },
    { companyId: 1, at: "1d", kind: "hubspot", text: "New ARR opportunity: Nordics pilot with Klarna, est. $180K ACV." },
    { companyId: 1, at: "3d", kind: "slack", text: "#datora-ops — Priya flagged hiring gap on SE team; Sarah looping Tomás." },
    { companyId: 1, at: "1w", kind: "email", text: "Board deck v3 shared — growth narrative tightened, burn multiple 1.4x." },
    { companyId: 3, at: "5h", kind: "meeting", text: "Marlow founders debriefed on enterprise security walkthrough." },
    { companyId: 3, at: "1d", kind: "hubspot", text: "Late-stage outbound from Sequoia — introduced CEO; we're lead." },
    { companyId: 3, at: "2d", kind: "slack", text: "Ops channel: deploy freq back to 8/wk after incident; Elena satisfied." },
  ],

  benchmarks: [
    { metric: "ARR", p25: "$2.1M", p50: "$4.4M", p75: "$9.2M", you: "$8.2M", youIdx: 0.82, invert: false },
    { metric: "Growth", p25: "22%", p50: "41%", p75: "68%", you: "62%", youIdx: 0.74, invert: false },
    { metric: "NRR", p25: "96%", p50: "108%", p75: "120%", you: "118%", youIdx: 0.78, invert: false },
    { metric: "Burn Multiple", p25: "2.4x", p50: "1.8x", p75: "1.3x", you: "1.4x", youIdx: 0.71, invert: true },
    { metric: "Win Rate", p25: "14%", p50: "22%", p75: "31%", you: "28%", youIdx: 0.72, invert: false },
    { metric: "CAC", p25: "$24K", p50: "$16K", p75: "$9K", you: "$14K", youIdx: 0.56, invert: true },
  ],
} as const;

export type Fixture = typeof fixture;
