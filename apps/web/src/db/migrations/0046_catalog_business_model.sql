-- Catalog company business model. Free-text for now (validated in app
-- code, not at the DB layer) so we can iterate on the taxonomy without
-- another migration. Expected values: saas | operating_services |
-- investment_firm | operating_and_investment | other.
--
-- Used by the guided KPI Benchmark wizard to hide/show SaaS-specific
-- fields, and by `estimateCompanyKpis` to scope its prompt so it doesn't
-- try to estimate ARR for a venture firm.
ALTER TABLE "catalog_companies" ADD COLUMN "business_model" text;
