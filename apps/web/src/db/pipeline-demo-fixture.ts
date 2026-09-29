/** IDs/names prefixed `demo_pipeline_` — safe to delete via unseed script. */

export const DEMO_PIPELINE_PREFIX = "demo_pipeline_";

export const DEMO_CONNECTION_ID = `${DEMO_PIPELINE_PREFIX}conn`;
export const DEMO_CONFIG_ID = `${DEMO_PIPELINE_PREFIX}config`;
export const DEMO_PROVIDER_PIPELINE_ID = "demo-pipeline-1";
export const DEMO_HUBSPOT_PORTAL_ID = "demo-portal-0001";

export const DEMO_STAGES = [
  { id: "demo_stage_screening", label: "Screening", displayOrder: 0, probability: 10 },
  { id: "demo_stage_meeting", label: "First Meeting", displayOrder: 1, probability: 20 },
  { id: "demo_stage_eval", label: "Evaluation", displayOrder: 2, probability: 40 },
  { id: "demo_stage_diligence", label: "Diligence", displayOrder: 3, probability: 60 },
  { id: "demo_stage_terms", label: "Term Sheet", displayOrder: 4, probability: 80 },
] as const;

export interface DemoPipelineDeal {
  id: string;
  providerDealId: string;
  stageId: (typeof DEMO_STAGES)[number]["id"];
  companyName: string;
  companyDomain: string;
  companyIndustry: string;
  dealName: string;
  dealAmount: number;
  dealCloseDate: string;
}

export const DEMO_PIPELINE_DEALS: DemoPipelineDeal[] = [
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_acme`,
    providerDealId: "demo-deal-acme",
    stageId: "demo_stage_screening",
    companyName: "Acme Corp",
    companyDomain: "acme.io",
    companyIndustry: "B2B SaaS",
    dealName: "Acme Seed Round",
    dealAmount: 750_000,
    dealCloseDate: "2026-03-22",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_brightfield`,
    providerDealId: "demo-deal-brightfield",
    stageId: "demo_stage_screening",
    companyName: "Brightfield Analytics",
    companyDomain: "brightfield.io",
    companyIndustry: "Data & Analytics",
    dealName: "Brightfield Pre-Seed",
    dealAmount: 500_000,
    dealCloseDate: "2026-04-10",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_nimbus`,
    providerDealId: "demo-deal-nimbus",
    stageId: "demo_stage_screening",
    companyName: "Nimbus Cloud",
    companyDomain: "nimbus.cloud",
    companyIndustry: "Infrastructure",
    dealName: "Nimbus Platform Raise",
    dealAmount: 1_200_000,
    dealCloseDate: "2025-11-15",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_orion`,
    providerDealId: "demo-deal-orion",
    stageId: "demo_stage_meeting",
    companyName: "Orion Labs",
    companyDomain: "orionlabs.com",
    companyIndustry: "Developer Tools",
    dealName: "Series A — Orion Expansion",
    dealAmount: 4_500_000,
    dealCloseDate: "2026-06-04",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_cedar`,
    providerDealId: "demo-deal-cedar",
    stageId: "demo_stage_meeting",
    companyName: "Cedar Health",
    companyDomain: "cedarhealth.com",
    companyIndustry: "Healthcare",
    dealName: "Cedar Seed Extension",
    dealAmount: 2_000_000,
    dealCloseDate: "2026-05-18",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_shieldstack`,
    providerDealId: "demo-deal-shieldstack",
    stageId: "demo_stage_eval",
    companyName: "ShieldStack",
    companyDomain: "shieldstack.security",
    companyIndustry: "Cybersecurity",
    dealName: "ShieldStack Series A",
    dealAmount: 8_000_000,
    dealCloseDate: "2026-07-01",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_delta`,
    providerDealId: "demo-deal-delta",
    stageId: "demo_stage_eval",
    companyName: "Delta Robotics",
    companyDomain: "deltarobotics.io",
    companyIndustry: "Hardware",
    dealName: "Delta R&D Bridge",
    dealAmount: 3_250_000,
    dealCloseDate: "2025-09-30",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_lumen`,
    providerDealId: "demo-deal-lumen",
    stageId: "demo_stage_eval",
    companyName: "Lumen AI",
    companyDomain: "lumen.ai",
    companyIndustry: "Artificial Intelligence",
    dealName: "Lumen Seed",
    dealAmount: 1_800_000,
    dealCloseDate: "2026-02-14",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_ember`,
    providerDealId: "demo-deal-ember",
    stageId: "demo_stage_diligence",
    companyName: "Ember Payments",
    companyDomain: "emberpay.com",
    companyIndustry: "Fintech",
    dealName: "Ember Series B",
    dealAmount: 15_000_000,
    dealCloseDate: "2026-08-20",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_harbor`,
    providerDealId: "demo-deal-harbor",
    stageId: "demo_stage_diligence",
    companyName: "Harbor Logistics",
    companyDomain: "harborlogistics.co",
    companyIndustry: "Supply Chain",
    dealName: "Harbor Growth Round",
    dealAmount: 6_500_000,
    dealCloseDate: "2024-12-01",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_vertex`,
    providerDealId: "demo-deal-vertex",
    stageId: "demo_stage_terms",
    companyName: "Vertex Commerce",
    companyDomain: "vertexcommerce.com",
    companyIndustry: "E-commerce",
    dealName: "Vertex Term Sheet",
    dealAmount: 12_000_000,
    dealCloseDate: "2026-09-15",
  },
  {
    id: `${DEMO_PIPELINE_PREFIX}deal_pioneer`,
    providerDealId: "demo-deal-pioneer",
    stageId: "demo_stage_terms",
    companyName: "Pioneer Climate",
    companyDomain: "pioneerclimate.io",
    companyIndustry: "Climate Tech",
    dealName: "Pioneer Series A Close",
    dealAmount: 9_500_000,
    dealCloseDate: "2026-10-01",
  },
];
