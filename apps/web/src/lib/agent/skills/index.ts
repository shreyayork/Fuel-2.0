import "server-only";
import type { Skill, SkillRegistry } from "../types";
import { addCompanyNoteSkill } from "./addCompanyNote";
import { compareToBenchmarkSkill } from "./compareToBenchmark";
import { detectTechStackSkill } from "./detectTechStack";
import { findSimilarContextSkill } from "./findSimilarContext";
import { getCohortBenchmarksSkill } from "./getCohortBenchmarks";
import { getCompanyContextSkill } from "./getCompanyContext";
import { getCompanyPrivateMetricsSkill } from "./getCompanyPrivateMetrics";
import { getPlaybookSkill } from "./getPlaybook";
import { getPortfolioCompaniesSkill } from "./getPortfolioCompanies";
import { listPortfoliosSkill } from "./listPortfolios";
import { searchPlaybooksSkill } from "./searchPlaybooks";
import { getCompanySkill } from "./getCompany";
import { scrapeCrunchbaseCompanySkill } from "./scrapeCrunchbaseCompany";
import { scrapeLinkedInCompanySkill } from "./scrapeLinkedInCompany";
import { scrapeLinkedInProfileSkill } from "./scrapeLinkedInProfile";
import { scrapeWebsiteMarkdownSkill } from "./scrapeWebsiteMarkdown";
import { searchCompaniesSkill } from "./searchCompanies";

// --- Gap-fill reads ---
import { listPipelineSkill } from "./listPipeline";
import { listInitiativesSkill } from "./listInitiatives";
import { getInitiativeSkill } from "./getInitiative";
import { listPeopleSkill } from "./listPeople";
import { getPersonWorkloadSkill } from "./getPersonWorkload";
import { getCompanySignalsSkill } from "./getCompanySignals";
import { getCompanyObservationsSkill } from "./getCompanyObservations";
import { getCompanyInitiativesSkill } from "./getCompanyInitiatives";
import { getPortfolioSummarySkill } from "./getPortfolioSummary";
import { listWatchlistsSkill } from "./listWatchlists";
import { getWatchlistSkill } from "./getWatchlist";
import { listContextItemsSkill } from "./listContextItems";
import { listPortfolioUpdatesSkill } from "./listPortfolioUpdates";
import { getPortfolioUpdateSkill } from "./getPortfolioUpdate";
import { listCatalogCompaniesSkill } from "./listCatalogCompanies";

// --- Advisors ---
import { listAdvisorsSkill } from "./listAdvisors";
import { addAdvisorSkill } from "./addAdvisor";
import { linkAdvisorToCompanySkill } from "./linkAdvisorToCompany";

// --- Investors ---
import { searchInvestorsSkill } from "./searchInvestors";
import { getInvestorSkill } from "./getInvestor";
import { bookmarkInvestorSkill } from "./bookmarkInvestor";

// --- Service Providers ---
import { listServiceProvidersSkill } from "./listServiceProviders";
import { getServiceProviderSkill } from "./getServiceProvider";
import { upsertServiceProviderSkill } from "./upsertServiceProvider";
import { deleteServiceProviderSkill } from "./deleteServiceProvider";

// --- Gap-fill writes ---
import { createWatchlistSkill } from "./createWatchlist";
import { renameWatchlistSkill } from "./renameWatchlist";
import { deleteWatchlistSkill } from "./deleteWatchlist";
import { setWatchlistScopeSkill } from "./setWatchlistScope";
import { addCompanyToWatchlistSkill } from "./addCompanyToWatchlist";
import { removeCompanyFromWatchlistSkill } from "./removeCompanyFromWatchlist";
import { setWatchlistFollowerSkill } from "./setWatchlistFollower";
import { addContextItemSkill } from "./addContextItem";
import { deleteContextItemSkill } from "./deleteContextItem";
import { upsertPortfolioUpdateSkill } from "./upsertPortfolioUpdate";
import { extractPdfTextSkill } from "./extractPdfText";
import { extractCompanyProfileSkill } from "./extractCompanyProfile";
import { estimateCompanyKpisSkill } from "./estimateCompanyKpis";

export const skills: SkillRegistry = Object.freeze({
  [searchCompaniesSkill.name]: searchCompaniesSkill as unknown as Skill,
  [getCompanySkill.name]: getCompanySkill as unknown as Skill,
  [getCompanyContextSkill.name]: getCompanyContextSkill as unknown as Skill,
  [addCompanyNoteSkill.name]: addCompanyNoteSkill as unknown as Skill,
  [compareToBenchmarkSkill.name]: compareToBenchmarkSkill as unknown as Skill,
  [scrapeLinkedInCompanySkill.name]: scrapeLinkedInCompanySkill as unknown as Skill,
  [scrapeLinkedInProfileSkill.name]: scrapeLinkedInProfileSkill as unknown as Skill,
  [scrapeCrunchbaseCompanySkill.name]: scrapeCrunchbaseCompanySkill as unknown as Skill,
  [detectTechStackSkill.name]: detectTechStackSkill as unknown as Skill,
  [scrapeWebsiteMarkdownSkill.name]: scrapeWebsiteMarkdownSkill as unknown as Skill,
  [findSimilarContextSkill.name]: findSimilarContextSkill as unknown as Skill,
  [searchPlaybooksSkill.name]: searchPlaybooksSkill as unknown as Skill,
  [getPlaybookSkill.name]: getPlaybookSkill as unknown as Skill,
  [listPortfoliosSkill.name]: listPortfoliosSkill as unknown as Skill,
  [getPortfolioCompaniesSkill.name]: getPortfolioCompaniesSkill as unknown as Skill,
  [getCohortBenchmarksSkill.name]: getCohortBenchmarksSkill as unknown as Skill,
  [getCompanyPrivateMetricsSkill.name]: getCompanyPrivateMetricsSkill as unknown as Skill,

  // Gap-fill reads
  [listPipelineSkill.name]: listPipelineSkill as unknown as Skill,
  [listInitiativesSkill.name]: listInitiativesSkill as unknown as Skill,
  [getInitiativeSkill.name]: getInitiativeSkill as unknown as Skill,
  [listPeopleSkill.name]: listPeopleSkill as unknown as Skill,
  [getPersonWorkloadSkill.name]: getPersonWorkloadSkill as unknown as Skill,
  [getCompanySignalsSkill.name]: getCompanySignalsSkill as unknown as Skill,
  [getCompanyObservationsSkill.name]: getCompanyObservationsSkill as unknown as Skill,
  [getCompanyInitiativesSkill.name]: getCompanyInitiativesSkill as unknown as Skill,
  [getPortfolioSummarySkill.name]: getPortfolioSummarySkill as unknown as Skill,
  [listWatchlistsSkill.name]: listWatchlistsSkill as unknown as Skill,
  [getWatchlistSkill.name]: getWatchlistSkill as unknown as Skill,
  [listContextItemsSkill.name]: listContextItemsSkill as unknown as Skill,
  [listPortfolioUpdatesSkill.name]: listPortfolioUpdatesSkill as unknown as Skill,
  [getPortfolioUpdateSkill.name]: getPortfolioUpdateSkill as unknown as Skill,
  [listCatalogCompaniesSkill.name]: listCatalogCompaniesSkill as unknown as Skill,

  // Advisors
  [listAdvisorsSkill.name]: listAdvisorsSkill as unknown as Skill,
  [addAdvisorSkill.name]: addAdvisorSkill as unknown as Skill,
  [linkAdvisorToCompanySkill.name]: linkAdvisorToCompanySkill as unknown as Skill,

  // Investors
  [searchInvestorsSkill.name]: searchInvestorsSkill as unknown as Skill,
  [getInvestorSkill.name]: getInvestorSkill as unknown as Skill,
  [bookmarkInvestorSkill.name]: bookmarkInvestorSkill as unknown as Skill,

  // Service Providers
  [listServiceProvidersSkill.name]: listServiceProvidersSkill as unknown as Skill,
  [getServiceProviderSkill.name]: getServiceProviderSkill as unknown as Skill,
  [upsertServiceProviderSkill.name]: upsertServiceProviderSkill as unknown as Skill,
  [deleteServiceProviderSkill.name]: deleteServiceProviderSkill as unknown as Skill,

  // Gap-fill writes
  [createWatchlistSkill.name]: createWatchlistSkill as unknown as Skill,
  [renameWatchlistSkill.name]: renameWatchlistSkill as unknown as Skill,
  [deleteWatchlistSkill.name]: deleteWatchlistSkill as unknown as Skill,
  [setWatchlistScopeSkill.name]: setWatchlistScopeSkill as unknown as Skill,
  [addCompanyToWatchlistSkill.name]: addCompanyToWatchlistSkill as unknown as Skill,
  [removeCompanyFromWatchlistSkill.name]: removeCompanyFromWatchlistSkill as unknown as Skill,
  [setWatchlistFollowerSkill.name]: setWatchlistFollowerSkill as unknown as Skill,
  [addContextItemSkill.name]: addContextItemSkill as unknown as Skill,
  [deleteContextItemSkill.name]: deleteContextItemSkill as unknown as Skill,
  [upsertPortfolioUpdateSkill.name]: upsertPortfolioUpdateSkill as unknown as Skill,
  [extractPdfTextSkill.name]: extractPdfTextSkill as unknown as Skill,
  [extractCompanyProfileSkill.name]: extractCompanyProfileSkill as unknown as Skill,
  [estimateCompanyKpisSkill.name]: estimateCompanyKpisSkill as unknown as Skill,
});

export function getSkill(name: string): Skill | undefined {
  return skills[name];
}

export function listSkills(): Skill[] {
  return Object.values(skills);
}
