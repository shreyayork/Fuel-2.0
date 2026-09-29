"use client";

import { useTheme } from "@/components/ThemeContext";
import { CompanyOverviewPage } from "@/components/company/overview/CompanyOverviewPage";

/**
 * Founder-mode landing for `/company/[uuid]`. Renders the AI-generated
 * operating overview (F20A-105) when the account is in CM mode.
 */
export interface FounderOverviewCompany {
  uuid: string;
  name: string;
  domain: string | null;
  industry: string | null;
  totalFundingUsd: number | null;
  foundedOn: string | null;
}

export interface FounderOverviewBenchmark {
  metric: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  unit: string | null;
  invertedGood: boolean | null;
}

export interface FounderOverviewArtifact {
  id: string;
  kind: string;
  title: string;
  createdAt: string;
}

export interface FounderOverviewInitiative {
  id: string;
  name: string;
  area: string | null;
  status: string | null;
  due: string | null;
}

export interface FounderOverviewSubmittedUpdate {
  period: string;
  submittedAt: string;
  submittedByEmail: string;
}

export interface FounderOverviewProps {
  company: FounderOverviewCompany;
  benchmarks: FounderOverviewBenchmark[];
  cohortKey: string | null;
  cohortSampleSize: number | null;
  techStack: string[];
  latestSubmittedUpdate: FounderOverviewSubmittedUpdate | null;
  artifacts: FounderOverviewArtifact[];
  initiatives: FounderOverviewInitiative[];
}

export function FounderOverview({ company }: FounderOverviewProps) {
  const t = useTheme();

  return (
    <div
      style={{
        color: t.ink,
        fontFamily: t.sans,
        maxWidth: 1240,
        margin: "0 auto",
        padding: "40px 32px",
      }}
    >
      <CompanyOverviewPage companyUuid={company.uuid} companyName={company.name} />
    </div>
  );
}
