export type OnboardBenchmarkInsightCategory = "Intelligence" | "Initiative" | "Playbook";

export type OnboardBenchmarkInsightCard = {
  id: string;
  cat: OnboardBenchmarkInsightCategory;
  title: string;
  body: string;
  metricLabel: string;
  displayVal: string;
  signalCategory: string;
  signalId: string;
  signalLabel: string;
  playbookSlug?: string | null;
  linkedIntelligenceId?: string | null;
  linkedIntelligenceTitle?: string | null;
};

export type OnboardBenchmarkMetricInput = {
  answerKey: string;
  metricId: string;
  label: string;
  userValue: number;
  displayVal: string;
  tier: "top10" | "top25" | "above" | "below" | "weak";
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  invertedGood: boolean;
  unit: string;
};

export type OnboardBenchmarkInsightsRequest = {
  companyName: string;
  cohortKey: string | null;
  cohortLabel: string;
  industry?: string | null;
  businessModel?: string | null;
  metrics: OnboardBenchmarkMetricInput[];
};

export type OnboardBenchmarkInsightsResponse = {
  cards: OnboardBenchmarkInsightCard[];
  fallback?: boolean;
};
