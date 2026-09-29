import type { OnboardBenchmarkRow } from "@/lib/onboard/profile-types";

function parseMoney(s: string): number {
  const clean = s.replace(/[$,\s]/g, "").toUpperCase();
  const m = /^([\d.]+)([KMB])?$/.exec(clean);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult =
    m[2] === "K" ? 1_000 : m[2] === "M" ? 1_000_000 : m[2] === "B" ? 1_000_000_000 : 1;
  return Math.round(n * mult);
}

function parsePct(s: string): number {
  return parseFloat(s.replace(/%/g, "")) || 0;
}

/** Static cohort percentile rows when the profile API does not return live benchmarks. */
export function getFallbackBenchmarkRows(): OnboardBenchmarkRow[] {
  return [
    {
      metric: "arr_usd",
      p25: parseMoney("$150K"),
      p50: parseMoney("$500K"),
      p75: parseMoney("$1.2M"),
      p90: parseMoney("$2.5M"),
      unit: "usd",
      invertedGood: false,
      sampleSize: 147,
    },
    {
      metric: "arr_growth_yoy_pct",
      p25: parsePct("120%"),
      p50: parsePct("200%"),
      p75: parsePct("350%"),
      p90: parsePct("600%"),
      unit: "pct",
      invertedGood: false,
      sampleSize: 147,
    },
    {
      metric: "nrr_pct",
      p25: parsePct("95%"),
      p50: parsePct("108%"),
      p75: parsePct("125%"),
      p90: parsePct("145%"),
      unit: "pct",
      invertedGood: false,
      sampleSize: 147,
    },
    {
      metric: "logo_retention_pct",
      p25: parsePct("80%"),
      p50: parsePct("88%"),
      p75: parsePct("93%"),
      p90: parsePct("97%"),
      unit: "pct",
      invertedGood: false,
      sampleSize: 147,
    },
    {
      metric: "fte_count",
      p25: 6,
      p50: 12,
      p75: 22,
      p90: 40,
      unit: "count",
      invertedGood: false,
      sampleSize: 147,
    },
    {
      metric: "paid_customer_count",
      p25: 10,
      p50: 40,
      p75: 100,
      p90: 250,
      unit: "count",
      invertedGood: false,
      sampleSize: 147,
    },
    {
      metric: "cash_on_hand_usd",
      p25: parseMoney("$500K"),
      p50: parseMoney("$1.5M"),
      p75: parseMoney("$3.0M"),
      p90: parseMoney("$6.0M"),
      unit: "usd",
      invertedGood: false,
      sampleSize: 147,
    },
    {
      metric: "monthly_burn_usd",
      p25: parseMoney("$40K"),
      p50: parseMoney("$80K"),
      p75: parseMoney("$180K"),
      p90: parseMoney("$350K"),
      unit: "usd",
      invertedGood: true,
      sampleSize: 147,
    },
    {
      metric: "gross_margin_pct",
      p25: parsePct("55%"),
      p50: parsePct("72%"),
      p75: parsePct("82%"),
      p90: parsePct("88%"),
      unit: "pct",
      invertedGood: false,
      sampleSize: 147,
    },
  ];
}
