/**
 * Design-preview workspace seed — fills catalog + account surfaces so
 * Overview / Intelligence / Initiatives / Watchlists / Portfolios look
 * populated without Cognito or live enrichments.
 *
 * Prefixed ids (`design_*`, `cat_design_fixture_*`) so re-runs are idempotent.
 *
 * Modes:
 *   founder (default) — Company Manager: PM off, primary company home
 *   investor          — Portfolio Manager: PM on, /portfolio home, fixture
 *                       portfolio/pipeline companies as real catalog rows
 *
 * Run:
 *   npm run db:seed:design --workspace=apps/web
 *   npm run db:seed:design:investor --workspace=apps/web
 *   npm run db:seed:design --workspace=apps/web -- --email=mike@york.ie --mode=investor
 */
import "dotenv/config";
import { and, eq, inArray, like, or } from "drizzle-orm";
import { getDb, getPool } from "./client";
import { fixture } from "./fixture";
import {
  accounts,
  accountMembers,
  advisors,
  artifacts,
  catalogCompanies,
  companies,
  companyAdvisors,
  companyDetailAnswers,
  companyIntelligence,
  companyInitiatives,
  contextItems,
  investorBookmarks,
  overviewCategoryScores,
  overviewPlaybookSuggestions,
  overviewSnapshots,
  playbooks,
  portfolioUpdates,
  serviceProviders,
  signalObservations,
  watchlistCompanies,
  watchlistFollowers,
  watchlists,
  workspaceCreditLedger,
} from "./schema";

const DESIGN_PREFIX = "design_";
/** Stable catalog UUIDs for fixture portfolio/pipeline companies (must be `cat_`). */
const FIXTURE_CATALOG_PREFIX = "cat_design_fixture_";

type DesignSeedMode = "founder" | "investor";

function fixtureCatalogId(fixtureCompanyId: number): string {
  return `${FIXTURE_CATALOG_PREFIX}${fixtureCompanyId}`;
}

function parseEmail(): string | null {
  const flag = process.argv.find((a) => a.startsWith("--email="));
  if (flag) return flag.slice("--email=".length).trim().toLowerCase();
  const env = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  return env || null;
}

function parseMode(): DesignSeedMode {
  const flag = process.argv.find((a) => a.startsWith("--mode="));
  const raw = (flag?.slice("--mode=".length) ?? process.env.SEED_DESIGN_MODE ?? "")
    .trim()
    .toLowerCase();
  if (raw === "investor" || raw === "pm" || raw === "portfolio") return "investor";
  return "founder";
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function mapFixtureSignalKind(
  kind: string,
): "meeting_transcript" | "hubspot_activity" | "slack_message" | "email" | "note" {
  if (kind === "meeting") return "meeting_transcript";
  if (kind === "hubspot") return "hubspot_activity";
  if (kind === "slack") return "slack_message";
  if (kind === "email") return "email";
  return "note";
}

async function main() {
  const emailArg = parseEmail();
  const mode = parseMode();
  const db = await getDb();
  const now = new Date();

  const members = await db
    .select({
      accountId: accountMembers.accountId,
      userEmail: accountMembers.userEmail,
    })
    .from(accountMembers);

  if (members.length === 0) {
    throw new Error(
      "No accounts in DB. Complete onboard / claim once, then re-run this seed.",
    );
  }

  const targetEmail = emailArg ?? members[0]!.userEmail;
  const membership = members.find((m) => m.userEmail === targetEmail);
  if (!membership) {
    const available = [...new Set(members.map((m) => m.userEmail))].join(", ");
    throw new Error(
      `No account for ${targetEmail}. Pass --email=…\nKnown: ${available}`,
    );
  }

  const accountId = membership.accountId;
  const userEmail = membership.userEmail;

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!account) throw new Error(`Account ${accountId} missing`);

  let companyUuid = account.primaryCompanyUuid;
  if (!companyUuid) {
    const [catalog] = await db
      .select({ id: catalogCompanies.id })
      .from(catalogCompanies)
      .where(eq(catalogCompanies.accountId, accountId))
      .limit(1);
    companyUuid = catalog?.id ?? null;
  }
  // Investor / PM accounts often have no primary company after claim — create a
  // stable firm catalog row so advisors + firm-level seed still have a home.
  if (!companyUuid) {
    if (mode !== "investor") {
      throw new Error(
        `Account ${accountId} has no primary/catalog company. Claim a company first.`,
      );
    }
    companyUuid = `cat_design_firm_${accountId.replace(/-/g, "").slice(0, 16)}`;
  }

  // Prefer an existing york.ie catalog row (post-claim) so inserts don't trip
  // account_domain_unique when the firm stub id is new.
  {
    const [yorkRow] = await db
      .select({ id: catalogCompanies.id })
      .from(catalogCompanies)
      .where(
        and(
          eq(catalogCompanies.accountId, accountId),
          eq(catalogCompanies.domain, "york.ie"),
        ),
      )
      .limit(1);
    if (yorkRow) companyUuid = yorkRow.id;
  }

  // Rich operating metrics — ported from fixture Datora + Marlow AI.
  const datora = fixture.companies.find((c) => c.id === 1)!;
  const marlow = fixture.companies.find((c) => c.id === 3)!;
  const period = "2026-q3";
  // Stable id — firm catalog uuid can change when we reuse an existing
  // york.ie row, but the design overview snapshot should stay idempotent.
  const snapshotId = `${DESIGN_PREFIX}overview_firm`;

  const categories = [
    {
      id: "dev",
      label: "R&D",
      fullLabel: "Research and Development",
      score: 74,
      statusLabel: "On track",
      statusTone: "positive",
      insight:
        "Deploy frequency recovered to 8/wk after the incident window. Compliance evidence is the remaining drag on enterprise deals.",
      strengths: [
        { title: "Ship cadence", detail: "Back to 8 deploys / week" },
        { title: "Product quality", detail: "Post-incident SEV load down" },
      ],
      weaknesses: [
        {
          title: "SOC 2 evidence",
          detail: "Type II pack still open for Apr board",
        },
      ],
      chips: ["Gross margin 72%", "FTE 201"],
    },
    {
      id: "mkt",
      label: "GTM",
      fullLabel: "Go to Market",
      score: 82,
      statusLabel: "Strong",
      statusTone: "positive",
      insight:
        "NRR at 118% with a live Klarna Nordics pilot. SE hiring is the constraint on converting mid-market expansion.",
      strengths: [
        { title: "NRR", detail: "118% — top quartile vs cohort" },
        { title: "Expansion", detail: "Klarna pilot unlocked mid-market" },
      ],
      weaknesses: [
        { title: "SE capacity", detail: "Enterprise deal lag on SE bench" },
      ],
      chips: ["ARR $8.2M", "Growth 62%", "NRR 118%"],
    },
    {
      id: "rev",
      label: "G&A",
      fullLabel: "General and Administrative",
      score: 68,
      statusLabel: "Watch",
      statusTone: "caution",
      insight:
        "22 months of runway and a 1.4x burn multiple leave room to invest in SE capacity without a raise.",
      strengths: [
        { title: "Runway", detail: "22 months at current burn" },
        { title: "Burn multiple", detail: "1.4x — healthy for Series B" },
      ],
      weaknesses: [
        {
          title: "EMEA CAC",
          detail: "Payback stretched to 14 months",
        },
      ],
      chips: ["Cash $16.2M", "Burn $740K"],
    },
  ] as const;

  const intelRows: Array<{
    id: string;
    category: string;
    headline: string;
    keyDetail: string;
    summary: string;
    source: string;
    overviewCategory?: "dev" | "mkt" | "rev";
    signalId?: string;
    days: number;
  }> = [
    {
      id: `${DESIGN_PREFIX}ci_arr`,
      category: "growth",
      headline: "ARR",
      keyDetail: "$8.2M",
      summary:
        "ARR holds at $8.2M with 62% YoY growth — top-quartile vs Series B SaaS cohort.",
      source: "overview_generation",
      overviewCategory: "mkt",
      signalId: "arr_usd",
      days: 1,
    },
    {
      id: `${DESIGN_PREFIX}ci_nrr`,
      category: "retention",
      headline: "Net revenue retention",
      keyDetail: "118%",
      summary:
        "QBR with the CEO pushed NRR above 120% on expansion logos; blended NRR logged at 118%.",
      source: "overview_generation",
      overviewCategory: "mkt",
      signalId: "nrr_pct",
      days: 2,
    },
    {
      id: `${DESIGN_PREFIX}ci_burn`,
      category: "finance",
      headline: "Monthly net burn",
      keyDetail: "$740K",
      summary:
        "Burn steady at $740K/mo with 22 months runway — room to staff SE capacity before the next raise.",
      source: "overview_generation",
      overviewCategory: "rev",
      signalId: "monthly_burn_usd",
      days: 2,
    },
    {
      id: `${DESIGN_PREFIX}ci_fte`,
      category: "team",
      headline: "FTE headcount",
      keyDetail: "201",
      summary:
        "Headcount at 201 with open reqs on enterprise SE and Customer Success leadership.",
      source: "overview_generation",
      overviewCategory: "dev",
      signalId: "fte_count",
      days: 3,
    },
    {
      id: `${DESIGN_PREFIX}ci_klarna`,
      category: "gtm",
      headline: "Klarna Nordics pilot",
      keyDetail: "$180K ACV",
      summary:
        "New ARR opportunity: Nordics pilot with Klarna, est. $180K ACV — mid-market expansion unlocked.",
      source: `manual:${userEmail}`,
      days: 1,
    },
    {
      id: `${DESIGN_PREFIX}ci_soc2`,
      category: "product",
      headline: "SOC 2 readiness",
      keyDetail: "84%",
      summary:
        "SOC 2 Type II evidence collection at 84% — board asked for completion by Apr 30.",
      source: `manual:${userEmail}`,
      days: 4,
    },
    {
      id: `${DESIGN_PREFIX}ci_sequoia`,
      category: "fundraising",
      headline: "Late-stage outbound interest",
      keyDetail: "Sequoia intro",
      summary:
        "Late-stage outbound from Sequoia — CEO introduced; York is positioned as lead operating partner.",
      source: "hubspot",
      days: 5,
    },
  ];

  await db.transaction(async (tx) => {
    // --- wipe prior design rows for this account/company ---
    await tx
      .delete(overviewSnapshots)
      .where(
        and(
          eq(overviewSnapshots.accountId, accountId),
          like(overviewSnapshots.id, `${DESIGN_PREFIX}overview_%`),
        ),
      );
    await tx
      .delete(companyIntelligence)
      .where(
        and(
          eq(companyIntelligence.accountId, accountId),
          like(companyIntelligence.id, `${DESIGN_PREFIX}%`),
        ),
      );
    await tx
      .delete(companyInitiatives)
      .where(
        and(
          eq(companyInitiatives.accountId, accountId),
          like(companyInitiatives.id, `${DESIGN_PREFIX}%`),
        ),
      );
    await tx
      .delete(contextItems)
      .where(
        and(
          eq(contextItems.accountId, accountId),
          like(contextItems.id, `${DESIGN_PREFIX}%`),
        ),
      );
    await tx
      .delete(signalObservations)
      .where(
        and(
          eq(signalObservations.accountId, accountId),
          like(signalObservations.id, `${DESIGN_PREFIX}%`),
        ),
      );
    // Prior broken watchlist links used non-catalog `design_fixture_co_*` ids.
    // Also clear any prior rows that reused fixture domains (unique per account).
    await tx
      .delete(catalogCompanies)
      .where(
        and(
          eq(catalogCompanies.accountId, accountId),
          or(
            like(catalogCompanies.id, `${FIXTURE_CATALOG_PREFIX}%`),
            inArray(
              catalogCompanies.domain,
              fixture.companies.map((c) => c.domain),
            ),
          ),
        ),
      );
    // Onboarding may have already written some answers (non-design ids).
    await tx
      .delete(companyDetailAnswers)
      .where(
        and(
          eq(companyDetailAnswers.accountId, accountId),
          eq(companyDetailAnswers.companyUuid, companyUuid),
        ),
      );
    await tx
      .delete(artifacts)
      .where(
        and(
          eq(artifacts.accountId, accountId),
          like(artifacts.id, `${DESIGN_PREFIX}%`),
        ),
      );
    await tx
      .delete(watchlists)
      .where(
        and(
          eq(watchlists.accountId, accountId),
          like(watchlists.id, `${DESIGN_PREFIX}%`),
        ),
      );
    await tx
      .delete(companyAdvisors)
      .where(
        and(
          eq(companyAdvisors.accountId, accountId),
          like(companyAdvisors.advisorId, `${DESIGN_PREFIX}%`),
        ),
      );
    await tx
      .delete(advisors)
      .where(like(advisors.id, `${DESIGN_PREFIX}%`));
    await tx
      .delete(serviceProviders)
      .where(like(serviceProviders.id, `${DESIGN_PREFIX}%`));
    await tx
      .delete(investorBookmarks)
      .where(
        and(
          eq(investorBookmarks.accountId, accountId),
          like(investorBookmarks.investorId, `${DESIGN_PREFIX}%`),
        ),
      );

    // --- firm catalog company (claimed CM home, or investor firm stub) ---
    const firmProfile = {
      name: account.name?.trim() || "York IE",
      domain: "york.ie",
      website: "https://york.ie",
      shortDescription:
        "York IE helps founders, operators, and investors build, scale, and monetize — operating playbooks, capital access, and hands-on GTM.",
      longDescription:
        "York IE is the operating partner behind Fuel. The platform unifies portfolio intelligence, initiative tracking, and benchmark-driven coaching so every company in the network sees the same operating truth the partners do. This design workspace mirrors a live claimed company so Overview, Intelligence, and Initiatives render with real fixture content.",
      industry: datora.industry,
      categories: ["SaaS", "Venture Platform", "Operating Partner"],
      locationCity: "Boston",
      locationState: "MA",
      locationCountry: "United States",
      employeeCount: String(marlow.employees ?? 120),
      foundedOn: "2015-01-01",
      totalFundingUsd: 28_000_000,
      numFundingRounds: 3,
      linkedinUrl: "https://www.linkedin.com/company/york-ie",
      businessModel:
        mode === "investor" ? "investment_firm" : "operating_and_investment",
      sources: {
        designSeed: true,
        designSeedMode: mode,
        fixtureCompanies: fixture.companies.map((c) => c.name),
      },
      updatedAt: now,
    };

    const [existingFirm] = await tx
      .select({ id: catalogCompanies.id })
      .from(catalogCompanies)
      .where(eq(catalogCompanies.id, companyUuid))
      .limit(1);

    if (existingFirm) {
      await tx
        .update(catalogCompanies)
        .set(firmProfile)
        .where(eq(catalogCompanies.id, companyUuid));
    } else {
      await tx.insert(catalogCompanies).values({
        id: companyUuid,
        accountId,
        createdByEmail: userEmail,
        createdAt: now,
        ...firmProfile,
      });
    }

    // Fixture portfolio + pipeline companies as real catalog rows so /company/cat_…
    // and Portfolios drill-down resolve (not design_fixture_co_* orphans).
    const fixtureCatalogRows = fixture.companies.map((c) => {
      const hq = "hq" in c && typeof c.hq === "string" ? c.hq : "";
      const [city, state] = hq.split(",").map((s) => s.trim());
      return {
        id: fixtureCatalogId(c.id),
        accountId,
        name: c.name,
        domain: c.domain,
        website: `https://${c.domain}`,
        shortDescription: `${c.industry} · ${c.stage}`,
        longDescription: `${c.name} is a design-seed ${c.list} company (${c.stage}, ${c.industry}) used to populate Portfolio Manager lists locally.`,
        industry: c.industry,
        categories: [c.industry, c.stage],
        locationCity: city || null,
        locationState: state || null,
        locationCountry: "United States",
        employeeCount:
          "employees" in c && typeof c.employees === "number"
            ? String(c.employees)
            : null,
        foundedOn:
          "founded" in c && typeof c.founded === "number"
            ? `${c.founded}-01-01`
            : null,
        totalFundingUsd: typeof c.arr === "number" ? c.arr * 2.5 : null,
        numFundingRounds: c.stage.startsWith("Seed")
          ? 1
          : c.stage.includes("A")
            ? 2
            : 3,
        businessModel:
          c.type === "investment" ? "investment_firm" : "saas",
        sources: {
          designSeed: true,
          designSeedMode: mode,
          fixtureId: c.id,
          list: c.list,
          stage: c.stage,
          arr: c.arr,
          arrGrowth: c.arrGrowth,
          nrr: c.nrr,
        },
        createdByEmail: userEmail,
        createdAt: now,
        updatedAt: now,
      };
    });
    await tx.insert(catalogCompanies).values(fixtureCatalogRows);

    // Role home: founder → company Overview; investor → /portfolio (+ Pipeline nav).
    await tx
      .update(accounts)
      .set(
        mode === "investor"
          ? {
              portfolioManagerEnabled: true,
              primaryCompanyUuid: null,
              updatedAt: now,
            }
          : {
              portfolioManagerEnabled: false,
              primaryCompanyUuid: companyUuid,
              updatedAt: now,
            },
      )
      .where(eq(accounts.id, accountId));

    // Surface Complete Profile prompt on Overview after design login (CM only).
    if (mode === "founder") {
      await tx
        .update(workspaceCreditLedger)
        .set({
          setupIncomplete: true,
          profilePromptDismissed: false,
          updatedAt: now,
        })
        .where(eq(workspaceCreditLedger.accountId, accountId));
    }

    // --- portfolio update (benchmarks / overview drawer) ---
    const existingPu = await tx
      .select({ id: portfolioUpdates.id })
      .from(portfolioUpdates)
      .where(
        and(
          eq(portfolioUpdates.accountId, accountId),
          eq(portfolioUpdates.companyUuid, companyUuid),
          eq(portfolioUpdates.period, period),
        ),
      )
      .limit(1);

    const puValues = {
      fteCount: marlow.employees ?? 120,
      paidCustomerCount: 86,
      arrUsd: datora.arr,
      arrGrowthYoyPct: datora.arrGrowth,
      nrrPct: datora.nrr,
      logoRetentionPct: 94,
      grossMarginPct: 72,
      cacPaybackMonths: 14,
      burnMultiple: 1.4,
      ruleOf40Pct: 78,
      cashOnHandUsd: 16_200_000,
      monthlyBurnUsd: datora.burn ?? 740_000,
      notableCustomers: "Klarna Nordics pilot · Mid-market expansion cohort",
      notableHires: "VP Sales (ex-HubSpot) · Head of Customer Success",
      otherUpdates: "Board pack refreshed; SOC 2 Type II evidence collection underway.",
      challenges: "SE hiring lag on enterprise deals; CAC payback stretched in EMEA.",
      bankingPartner: "Silicon Valley Bank",
      legalCounsel: "Cooley LLP",
      cloudProvider: "AWS",
      capTablePlatform: "Carta",
      doInsuranceProvider: "Coalition",
      crmPlatform: "HubSpot",
      openToInvestorIntros: true,
      status: "submitted" as const,
      submittedByEmail: userEmail,
      submittedAt: now,
      updatedAt: now,
      asOf: "2026-09-15",
    };

    if (existingPu[0]) {
      await tx
        .update(portfolioUpdates)
        .set(puValues)
        .where(eq(portfolioUpdates.id, existingPu[0].id));
    } else {
      await tx.insert(portfolioUpdates).values({
        id: `${DESIGN_PREFIX}pu_${companyUuid}`,
        accountId,
        companyUuid,
        period,
        ...puValues,
        createdAt: now,
      });
    }

    // --- overview snapshot + category scores ---
    await tx.insert(overviewSnapshots).values({
      id: snapshotId,
      accountId,
      companyUuid,
      advisorSummary:
        "York IE is operating above cohort on NRR and growth. Focus the next quarter on SE capacity and tightening CAC payback in EMEA while protecting the mid-market expansion motion that unlocked Klarna.",
      signalTags: [
        {
          category_id: "mkt",
          label: "Expansion",
          urgency: "now",
          suffix: "NRR 118%",
          risk_count: 0,
        },
        {
          category_id: "rev",
          label: "Runway",
          urgency: "watch",
          suffix: "22 mo",
          risk_count: 1,
        },
        {
          category_id: "dev",
          label: "Ship cadence",
          urgency: "ok",
          suffix: "8/wk",
          risk_count: 0,
        },
      ],
      recommendedActions: [
        {
          title: "Staff two enterprise SEs",
          sub: "Unblocks Nordics + mid-market expansion pipeline",
          cta: "Open initiative",
          done: false,
          action_type: "initiative",
        },
        {
          title: "Tighten EMEA CAC payback",
          sub: "Target ≤12 months vs current 14",
          cta: "Log benchmark",
          done: false,
          action_type: "benchmark",
        },
        {
          title: "Finish SOC 2 evidence pack",
          sub: "84% complete — board asked for Type II by Apr 30",
          cta: "View initiative",
          done: false,
          action_type: "initiative",
        },
      ],
      journeyStage: "scale",
      journeyLabel: "Scaling GTM",
      contextCompletionPct: 78,
      aiModel: "design-seed",
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(overviewCategoryScores).values(
      categories.map((c) => ({
        id: `${DESIGN_PREFIX}ocs_${c.id}_${companyUuid}`,
        snapshotId,
        accountId,
        companyUuid,
        categoryId: c.id,
        label: c.label,
        fullLabel: c.fullLabel,
        score: c.score,
        statusLabel: c.statusLabel,
        statusTone: c.statusTone,
        confidenceLevel: "High",
        focusNarrative: c.insight,
        insight: c.insight,
        strengths: [...c.strengths],
        weaknesses: [...c.weaknesses],
        benchmarkChips: [...c.chips],
        stats: c.chips.map((chip) => {
          const [label, value] = chip.split(" ");
          return { label: label ?? chip, value: value ?? chip };
        }),
        scoreContributors: [],
        intelligenceCount: 2,
        initiativeCount: 2,
        playbookCount: 1,
        detailAnsweredCount: 8,
        detailQuestionCount: 12,
        createdAt: now,
        updatedAt: now,
      })),
    );

    const playbookRows = await tx
      .select({ id: playbooks.id })
      .from(playbooks)
      .where(
        and(
          eq(playbooks.isSystem, false),
          eq(playbooks.isVisible, true),
          or(eq(playbooks.visibility, "global"), eq(playbooks.accountId, accountId)),
        ),
      )
      .limit(3);

    if (playbookRows.length > 0) {
      await tx.insert(overviewPlaybookSuggestions).values(
        playbookRows.map((pb, i) => ({
          id: `${DESIGN_PREFIX}ops_${i}_${companyUuid}`,
          snapshotId,
          playbookId: pb.id,
          categoryId: (["mkt", "dev", "rev"] as const)[i] ?? "mkt",
          reason: "Suggested from design seed cohort patterns",
          rank: i,
          createdAt: now,
        })),
      );
    }

    // --- company intelligence (overview glance + feed) ---
    await tx.insert(companyIntelligence).values(
      intelRows.map((row) => ({
        id: row.id,
        accountId,
        companyUuid,
        category: row.category,
        headline: row.headline,
        keyDetail: row.keyDetail,
        summary: row.summary,
        confidence: 0.92,
        source: row.source,
        generationPath: row.source === "overview_generation" ? "overview" : "design_seed",
        period,
        metadata: {
          ...(row.overviewCategory
            ? { overviewCategory: row.overviewCategory, snapshotId }
            : {}),
          ...(row.signalId ? { signalId: row.signalId } : {}),
          aiGenerated: row.source === "overview_generation",
          title:
            row.source === "overview_generation" ? "Benchmark Form" : "Design seed",
          designSeed: true,
        },
        authorEmail: userEmail,
        createdAt: daysAgo(row.days),
      })),
    );

    // --- signal observations (intelligence feed metrics) ---
    const observations = [
      { signalId: "arr_usd", valueNumeric: datora.arr, snippet: "ARR $8.2M" },
      { signalId: "arr_growth_yoy_pct", valueNumeric: datora.arrGrowth, snippet: "62% YoY" },
      { signalId: "nrr_pct", valueNumeric: datora.nrr, snippet: "NRR 118%" },
      { signalId: "logo_retention_pct", valueNumeric: 94, snippet: "Logo retention 94%" },
      { signalId: "gross_margin_pct", valueNumeric: 72, snippet: "GM 72%" },
      {
        signalId: "monthly_burn_usd",
        valueNumeric: datora.burn ?? 740_000,
        snippet: "Burn $740K",
      },
      { signalId: "cash_on_hand_usd", valueNumeric: 16_200_000, snippet: "Cash $16.2M" },
      {
        signalId: "fte_count",
        valueNumeric: marlow.employees ?? 201,
        snippet: "FTE 201",
      },
      { signalId: "paid_customer_count", valueNumeric: 86, snippet: "86 paid logos" },
    ] as const;

    await tx.insert(signalObservations).values(
      observations.map((o, i) => ({
        id: `${DESIGN_PREFIX}obs_${o.signalId}`,
        accountId,
        companyUuid,
        signalId: o.signalId,
        period,
        asOf: "2026-09-15",
        valueNumeric: o.valueNumeric,
        source: `manual:${userEmail}`,
        confidence: 1,
        rawSnippet: o.snippet,
        authorEmail: userEmail,
        createdAt: daysAgo(i),
      })),
    );

    // --- context items from fixture signals (Sources / activity) ---
    const fixtureSignalRows = fixture.signals.map((s, i) => {
      const kind = mapFixtureSignalKind(s.kind);
      const company = fixture.companies.find((c) => c.id === s.companyId);
      return {
        id: `${DESIGN_PREFIX}ctx_${i}`,
        accountId,
        companyUuid,
        kind,
        title: company ? `${company.name} · ${s.kind}` : s.kind,
        content: s.text,
        authorEmail: userEmail,
        source: `design_seed:fixture_signal:${i}`,
        sourceExternalId: `design_fixture_signal_${i}`,
        occurredAt: daysAgo(i + 1),
        createdAt: daysAgo(i + 1),
        metadata: { fixtureCompanyId: s.companyId, designSeed: true },
      };
    });
    await tx.insert(contextItems).values(fixtureSignalRows);

    // --- company initiatives from fixture ---
    const peopleById = new Map(fixture.people.map((p) => [p.id, p]));
    await tx.insert(companyInitiatives).values(
      fixture.initiatives.map((init) => {
        const owner = peopleById.get(init.ownerId);
        const area =
          init.area === "GTM"
            ? "gtm"
            : init.area === "R&D"
              ? "product"
              : init.area === "G&A"
                ? "finance"
                : "other";
        return {
          id: `${DESIGN_PREFIX}init_${init.id}`,
          accountId,
          companyUuid,
          kind: init.kind,
          name: init.name,
          area,
          description:
            "value" in init && init.value
              ? `Fixture initiative · ${init.value}`
              : `Fixture initiative from ${fixture.companies.find((c) => c.id === init.companyId)?.name ?? "portfolio"}`,
          status: "active" as const,
          ownerEmail: userEmail,
          assignees: owner ? [owner.name] : [],
          due: "due" in init ? (init.due ?? null) : null,
          source: "design_seed",
          overviewCategoryId: area === "gtm" ? "mkt" : area === "product" ? "dev" : "rev",
          priority: "high",
          benefit:
            "value" in init && init.value
              ? `Projected impact ${init.value}`
              : "Keeps the operating plan on the board calendar",
          sourceRationale: "Ported from local design fixture initiatives",
          createdByEmail: userEmail,
          createdAt: now,
          updatedAt: now,
        };
      }),
    );

    // --- detail answers (profile completion / overview forms) ---
    const detailAnswers: Array<{ questionId: string; answer: string }> = [
      { questionId: "profile_company", answer: "York IE" },
      {
        questionId: "profile_product_description",
        answer:
          "Operating platform for founders and investors — intelligence, initiatives, and benchmarks in one workspace.",
      },
      { questionId: "profile_industry", answer: "Venture / Operating Partner" },
      { questionId: "profile_founded", answer: "2015" },
      { questionId: "profile_city", answer: "Boston" },
      { questionId: "profile_state", answer: "MA" },
      { questionId: "profile_country", answer: "United States" },
      { questionId: "profile_website", answer: "https://york.ie" },
      { questionId: "profile_headcount", answer: "120" },
      { questionId: "dev_product_stage", answer: "Launched — scaling usage or revenue" },
      { questionId: "dev_ship_cadence", answer: "Weekly or faster" },
      { questionId: "mkt_sales_motion", answer: "Sales-led" },
      { questionId: "mkt_icp_clarity", answer: "Clear ICP with documented personas" },
      { questionId: "mkt_revenue_tracking", answer: "ARR / NRR in a trusted system" },
      { questionId: "rev_runway", answer: "18+ months" },
      { questionId: "rev_finance_management", answer: "Fractional / full-time finance lead" },
    ];

    await tx.insert(companyDetailAnswers).values(
      detailAnswers.map((a) => ({
        id: `${DESIGN_PREFIX}ans_${a.questionId}`,
        accountId,
        companyUuid,
        questionId: a.questionId,
        answer: a.answer,
        quarterLabel: period,
        source: "design_seed",
        createdAt: now,
        updatedAt: now,
      })),
    );

    // --- artifacts (briefs / playbook runs list) ---
    await tx.insert(artifacts).values([
      {
        id: `${DESIGN_PREFIX}art_board`,
        accountId,
        kind: "playbook_run",
        title: "Board Pack Refresh — Q3",
        content:
          "## Summary\nGrowth narrative tightened; burn multiple 1.4x.\n\n## Asks\n- Approve SE hiring plan\n- Confirm SOC 2 Type II timeline",
        subjects: [{ type: "company", uuid: companyUuid }],
        authorEmail: userEmail,
        visibility: "account",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        id: `${DESIGN_PREFIX}art_icp`,
        accountId,
        kind: "brief",
        title: "ICP Definition Workshop notes",
        content:
          "## ICP\nSeries A–B B2B SaaS, $3–15M ARR, GTM-constrained.\n\n## Next steps\nRun Pipeline Review playbook with Harbor Signal + Pinecrest.",
        subjects: [{ type: "company", uuid: companyUuid }],
        authorEmail: userEmail,
        visibility: "account",
        createdAt: daysAgo(6),
        updatedAt: daysAgo(6),
      },
    ]);

    // --- watchlists: portfolio holdings + competitor watchlist ---
    const portfolioWatchlistId = `${DESIGN_PREFIX}wl_portfolio`;
    const competitorWatchlistId = `${DESIGN_PREFIX}wl_watch`;

    await tx.insert(watchlists).values([
      {
        id: portfolioWatchlistId,
        name: "Fund I — Core",
        description: "Design fixture portfolio companies",
        kind: "portfolio",
        fundName: "York IE Fund I",
        scope: "account",
        cadence: "weekly",
        ownerEmail: userEmail,
        accountId,
        benchmarkMetricIds: [
          "arr_usd",
          "nrr_pct",
          "monthly_burn_usd",
          "arr_growth_yoy_pct",
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: competitorWatchlistId,
        name: "Pipeline radar",
        description: "Design fixture pipeline companies",
        kind: "watchlist",
        scope: "account",
        cadence: "weekly",
        ownerEmail: userEmail,
        accountId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const portfolioCos = fixture.companies.filter((c) => c.list === "portfolio");
    const pipelineCos = fixture.companies.filter((c) => c.list === "pipeline");

    await tx.insert(watchlistCompanies).values([
      ...portfolioCos.map((c) => ({
        watchlistId: portfolioWatchlistId,
        companyUuid: fixtureCatalogId(c.id),
        name: c.name,
        addedAt: now,
        addedByEmail: userEmail,
      })),
      // Founder seed keeps the claimed firm on the portfolio list for demos;
      // investor PM lists are fixture holdings only (firm is the workspace, not a holdco row).
      ...(mode === "founder"
        ? [
            {
              watchlistId: portfolioWatchlistId,
              companyUuid,
              name: firmProfile.name,
              addedAt: now,
              addedByEmail: userEmail,
            },
          ]
        : []),
      ...pipelineCos.map((c) => ({
        watchlistId: competitorWatchlistId,
        companyUuid: fixtureCatalogId(c.id),
        name: c.name,
        addedAt: now,
        addedByEmail: userEmail,
      })),
    ]);

    // Light intelligence on portfolio holdings so PM company → Intelligence isn't empty.
    const portfolioIntel = portfolioCos.flatMap((c) => {
      const uuid = fixtureCatalogId(c.id);
      const arrM =
        typeof c.arr === "number" ? `$${(c.arr / 1e6).toFixed(1)}M` : "—";
      return [
        {
          id: `${DESIGN_PREFIX}ci_fix_${c.id}_arr`,
          accountId,
          companyUuid: uuid,
          category: "growth",
          headline: "ARR",
          keyDetail: arrM,
          summary: `${c.name} design-seed ARR ${arrM} at ${c.arrGrowth}% YoY (${c.stage}).`,
          confidence: 0.88,
          source: "design_seed",
          generationPath: "design_seed",
          period,
          metadata: {
            designSeed: true,
            fixtureId: c.id,
            signalId: "arr_usd",
            title: "Design seed",
          },
          authorEmail: userEmail,
          createdAt: daysAgo(2),
        },
        {
          id: `${DESIGN_PREFIX}ci_fix_${c.id}_nrr`,
          accountId,
          companyUuid: uuid,
          category: "retention",
          headline: "Net revenue retention",
          keyDetail: `${c.nrr}%`,
          summary: `${c.name} NRR ${c.nrr}% — seeded from the local design fixture for Portfolio Manager QA.`,
          confidence: 0.86,
          source: "design_seed",
          generationPath: "design_seed",
          period,
          metadata: {
            designSeed: true,
            fixtureId: c.id,
            signalId: "nrr_pct",
            title: "Design seed",
          },
          authorEmail: userEmail,
          createdAt: daysAgo(3),
        },
      ];
    });
    if (portfolioIntel.length > 0) {
      await tx.insert(companyIntelligence).values(portfolioIntel);
    }

    // Metric readings on portfolio holdings — powers detail distribution /
    // mobile ranked metric boards (not just firm-level intelligence).
    const portfolioObs = portfolioCos.flatMap((c, ci) => {
      const uuid = fixtureCatalogId(c.id);
      const burn =
        "burn" in c && typeof c.burn === "number" ? c.burn : 350_000 + ci * 40_000;
      const rows: Array<{
        signalId: string;
        valueNumeric: number;
        snippet: string;
      }> = [
        {
          signalId: "arr_usd",
          valueNumeric: c.arr,
          snippet: `${c.name} ARR`,
        },
        {
          signalId: "arr_growth_yoy_pct",
          valueNumeric: c.arrGrowth,
          snippet: `${c.name} growth`,
        },
        {
          signalId: "nrr_pct",
          valueNumeric: c.nrr,
          snippet: `${c.name} NRR`,
        },
        {
          signalId: "monthly_burn_usd",
          valueNumeric: burn,
          snippet: `${c.name} burn`,
        },
      ];
      return rows.map((o) => ({
        id: `${DESIGN_PREFIX}obs_pf_${c.id}_${o.signalId}`,
        accountId,
        companyUuid: uuid,
        signalId: o.signalId,
        period,
        asOf: "2026-09-15",
        valueNumeric: o.valueNumeric,
        source: `manual:${userEmail}`,
        confidence: 0.9,
        rawSnippet: o.snippet,
        authorEmail: userEmail,
        createdAt: daysAgo(ci + 1),
      }));
    });
    if (portfolioObs.length > 0) {
      await tx.insert(signalObservations).values(portfolioObs);
    }

    await tx.insert(watchlistFollowers).values([
      {
        watchlistId: portfolioWatchlistId,
        userEmail,
        cadence: "weekly",
        starred: true,
      },
      {
        watchlistId: competitorWatchlistId,
        userEmail,
        cadence: "weekly",
        starred: false,
      },
    ]);

    // --- advisors (from fixture people) + link to claimed company ---
    const advisorRows = fixture.people.map((p) => ({
      id: `${DESIGN_PREFIX}adv_${p.id}`,
      accountId,
      name: p.name,
      title: p.role,
      company: "York IE",
      email: `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}@york.ie`,
      bio: `${p.role} focused on ${p.focus}. Ported from the local design fixture people roster.`,
      expertise: p.focus.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean),
      focusIndustries:
        p.team === "investment"
          ? ["SaaS", "Fintech", "Dev Tools"]
          : p.team === "operating"
            ? ["GTM", "Product", "Ops"]
            : ["Enterprise", "Finance"],
      location: "Boston, MA",
      publicCard: true,
      curatedByEmail: userEmail,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    }));
    await tx.insert(advisors).values(advisorRows);

    // Link a subset onto the claimed company (company Advisors rail / picker).
    const linkedAdvisorIds = [1, 3, 5, 7, 8, 9].map(
      (id) => `${DESIGN_PREFIX}adv_${id}`,
    );
    await tx.insert(companyAdvisors).values(
      linkedAdvisorIds.map((advisorId, i) => ({
        accountId,
        companyUuid,
        advisorId,
        role:
          i === 0
            ? "Board observer"
            : i === 1
              ? "GTM advisor"
              : i === 2
                ? "Product advisor"
                : "Advisor",
        addedByEmail: userEmail,
        addedAt: daysAgo(i + 2),
      })),
    );

    // --- service providers (global catalog — sidebar + /service-providers) ---
    const providerRows: Array<{
      id: string;
      category:
        | "legal"
        | "banking"
        | "cloud"
        | "cap_table"
        | "insurance"
        | "crm"
        | "accounting"
        | "payroll"
        | "recruiting"
        | "marketing";
      name: string;
      description: string;
      domain: string;
      website: string;
      tags: string[];
    }> = [
      {
        id: `${DESIGN_PREFIX}sp_cooley`,
        category: "legal",
        name: "Cooley LLP",
        description: "Venture-backed company counsel — financings, commercial, and IP.",
        domain: "cooley.com",
        website: "https://www.cooley.com",
        tags: ["legal", "venture"],
      },
      {
        id: `${DESIGN_PREFIX}sp_svb`,
        category: "banking",
        name: "Silicon Valley Bank",
        description: "Startup banking, credit lines, and treasury for growth companies.",
        domain: "svb.com",
        website: "https://www.svb.com",
        tags: ["banking", "treasury"],
      },
      {
        id: `${DESIGN_PREFIX}sp_aws`,
        category: "cloud",
        name: "Amazon Web Services",
        description: "Cloud infrastructure and credits programs for portfolio companies.",
        domain: "aws.amazon.com",
        website: "https://aws.amazon.com",
        tags: ["cloud", "infra"],
      },
      {
        id: `${DESIGN_PREFIX}sp_carta`,
        category: "cap_table",
        name: "Carta",
        description: "Cap table, equity management, and 409A valuations.",
        domain: "carta.com",
        website: "https://carta.com",
        tags: ["equity", "cap-table"],
      },
      {
        id: `${DESIGN_PREFIX}sp_coalition`,
        category: "insurance",
        name: "Coalition",
        description: "Cyber and D&O insurance tailored for technology companies.",
        domain: "coalitioninc.com",
        website: "https://www.coalitioninc.com",
        tags: ["insurance", "cyber"],
      },
      {
        id: `${DESIGN_PREFIX}sp_hubspot`,
        category: "crm",
        name: "HubSpot",
        description: "CRM and revenue platform used across the York IE portfolio.",
        domain: "hubspot.com",
        website: "https://www.hubspot.com",
        tags: ["crm", "gtm"],
      },
      {
        id: `${DESIGN_PREFIX}sp_deloitte`,
        category: "accounting",
        name: "Deloitte",
        description: "Audit, tax, and transaction advisory for scaling SaaS.",
        domain: "deloitte.com",
        website: "https://www.deloitte.com",
        tags: ["accounting", "audit"],
      },
      {
        id: `${DESIGN_PREFIX}sp_rippling`,
        category: "payroll",
        name: "Rippling",
        description: "HRIS, payroll, and IT for multi-state startups.",
        domain: "rippling.com",
        website: "https://www.rippling.com",
        tags: ["hr", "payroll"],
      },
      {
        id: `${DESIGN_PREFIX}sp_greenhouse`,
        category: "recruiting",
        name: "Greenhouse",
        description: "Hiring OS for structured recruiting and interview loops.",
        domain: "greenhouse.io",
        website: "https://www.greenhouse.io",
        tags: ["recruiting", "talent"],
      },
      {
        id: `${DESIGN_PREFIX}sp_clearbit`,
        category: "marketing",
        name: "Clearbit",
        description: "B2B data enrichment for demand gen and ICP scoring.",
        domain: "clearbit.com",
        website: "https://clearbit.com",
        tags: ["marketing", "data"],
      },
    ];
    await tx.insert(serviceProviders).values(
      providerRows.map((p) => ({
        ...p,
        visibility: "global" as const,
        curatedByEmail: userEmail,
        createdAt: now,
        updatedAt: now,
      })),
    );

    // --- investor bookmarks (Investors page — no Neptune required) ---
    const investorRows = [
      { id: `${DESIGN_PREFIX}inv_sequoia`, name: "Sequoia Capital" },
      { id: `${DESIGN_PREFIX}inv_a16z`, name: "Andreessen Horowitz" },
      { id: `${DESIGN_PREFIX}inv_accel`, name: "Accel" },
      { id: `${DESIGN_PREFIX}inv_bessemer`, name: "Bessemer Venture Partners" },
      { id: `${DESIGN_PREFIX}inv_insight`, name: "Insight Partners" },
      { id: `${DESIGN_PREFIX}inv_general`, name: "General Catalyst" },
      { id: `${DESIGN_PREFIX}inv_york`, name: "York IE Fund I" },
    ];
    await tx.insert(investorBookmarks).values(
      investorRows.map((inv, i) => ({
        accountId,
        investorId: inv.id,
        investorName: inv.name,
        addedByEmail: userEmail,
        addedAt: daysAgo(i + 1),
      })),
    );
  });

  const fixtureCompanies = await db.select({ id: companies.id }).from(companies).limit(1);
  if (fixtureCompanies.length === 0) {
    console.warn(
      "Warning: fixture `companies` table is empty — run `npm run db:seed` first for PM views.",
    );
  }

  const pool = await getPool();
  await pool.end();

  console.log(
    `Design workspace seeded (${mode}) for ${userEmail} / ${accountId}`,
  );
  if (mode === "investor") {
    console.log(
      `  Portfolio Manager: portfolioManagerEnabled=true, home=/portfolio`,
    );
    console.log(
      `  ${fixture.companies.filter((c) => c.list === "portfolio").length} portfolio + ${fixture.companies.filter((c) => c.list === "pipeline").length} watchlist catalog cos (${FIXTURE_CATALOG_PREFIX}*)`,
    );
    console.log(
      `  Pipeline demo kept from prior step — open /pipeline and /portfolio`,
    );
  } else {
    console.log(`  Company Manager: primary → ${companyUuid}`);
  }
  console.log(
    `  overview + ${categories.length} tracks, ${intelRows.length}+ intelligence, ${fixture.initiatives.length} initiatives, ${fixture.signals.length} context items, watchlists, artifacts, benchmarks`,
  );
  console.log(
    `  ${fixture.people.length} advisors, 10 service providers, 7 investor bookmarks`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
