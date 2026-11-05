import React, { useEffect, useMemo, useRef, useState } from "react";
import { FuelIcon } from "../icons.tsx";
import { resolveCompanyLogoUrl, type PortfolioCompanyView } from "./investorData.ts";
import {
  countPortfolioInitiativesForCompanies,
  listPortfolioInitiativesForCompanies,
  portfolioInitiativeAssignees,
  portfolioInitiativeDisplayStatus,
  portfolioInitiativeKindLabel,
  portfolioInitiativeListStatus,
  portfolioInitiativeMilestoneProgress,
  portfolioInitiativePillarLabel,
  type PortfolioInitiativeKind,
  type PortfolioInitiativeListStatus,
  type PortfolioInitiativePillar,
  type PortfolioInitiativeRow,
} from "./investorPortfolioInitiatives.ts";

const PAGE_SIZE = 10;

type PortfolioInitiativeGroupBy = "none" | "company" | "track" | "kind";

const PILLAR_ORDER: PortfolioInitiativePillar[] = ["dev", "mkt", "rev"];

function matchesSearch(parts: (string | undefined)[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some(part => (part ?? "").toLowerCase().includes(needle));
}

function groupKeyForRow(row: PortfolioInitiativeRow, groupBy: PortfolioInitiativeGroupBy): string {
  if (groupBy === "company") return row.companyId;
  if (groupBy === "track") return row.pillar;
  if (groupBy === "kind") return row.kind;
  return "";
}

function compareGroupKeys(
  leftKey: string,
  rightKey: string,
  groupBy: PortfolioInitiativeGroupBy,
): number {
  if (groupBy === "track") {
    return PILLAR_ORDER.indexOf(leftKey as PortfolioInitiativePillar)
      - PILLAR_ORDER.indexOf(rightKey as PortfolioInitiativePillar);
  }
  if (groupBy === "kind") {
    if (leftKey === rightKey) return 0;
    return leftKey === "continuous" ? -1 : 1;
  }
  return leftKey.localeCompare(rightKey);
}

function PortfolioInitiativeProgressCell({ item }: { item: PortfolioInitiativeRow }) {
  const { done, total, pct } = portfolioInitiativeMilestoneProgress(item);
  if (total === 0) {
    return (
      <div className="workspace-table-progress-cell workspace-table-progress-cell--empty">
        <span className="workspace-table-progress-label">—</span>
      </div>
    );
  }
  return (
    <div className="workspace-table-progress-cell">
      <span className="workspace-table-progress-label">{done}/{total}</span>
      <div
        className="workspace-table-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${done} of ${total} milestones complete`}
      >
        <span className="workspace-table-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PortfolioCompanyLogo({
  company,
}: {
  company: Pick<PortfolioCompanyView, "displayName" | "logo" | "logoBg" | "domain" | "logoUrl">;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const logoUrl = resolveCompanyLogoUrl(company);

  if (logoUrl && !useFallback) {
    return (
      <span className="investor-company-logo investor-company-logo--xs investor-company-logo--photo" title={company.displayName}>
        <img src={logoUrl} alt="" loading="lazy" onError={() => setUseFallback(true)} />
      </span>
    );
  }

  return (
    <span
      className="investor-company-logo investor-company-logo--xs"
      style={{ background: company.logoBg }}
      title={company.displayName}
    >
      {company.logo}
    </span>
  );
}

function PortfolioInitiativesToolbar({
  searchQuery,
  onSearchChange,
  pillarFilter,
  onPillarFilterChange,
  kindFilter,
  onKindFilterChange,
  groupBy,
  onGroupByChange,
  statusTab,
  onStatusTabChange,
  statusCounts,
  activeFilterCount,
  onClearFilters,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  pillarFilter: PortfolioInitiativePillar | "all";
  onPillarFilterChange: (value: PortfolioInitiativePillar | "all") => void;
  kindFilter: PortfolioInitiativeKind | "all";
  onKindFilterChange: (value: PortfolioInitiativeKind | "all") => void;
  groupBy: PortfolioInitiativeGroupBy;
  onGroupByChange: (value: PortfolioInitiativeGroupBy) => void;
  statusTab: PortfolioInitiativeListStatus;
  onStatusTabChange: (tab: PortfolioInitiativeListStatus) => void;
  statusCounts: Record<PortfolioInitiativeListStatus, number>;
  activeFilterCount: number;
  onClearFilters: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersOpen]);

  return (
    <div className="signals-intel-toolbar workspace-compact-toolbar workspace-compact-toolbar--split">
      <label className="signals-intel-search">
        <span className="signals-intel-search-icon" aria-hidden="true">
          <FuelIcon name="search" size={14} />
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Search initiatives…"
          aria-label="Search initiatives"
        />
      </label>
      <div className="workspace-compact-toolbar-actions">
        <div className="workspace-filter-cta" ref={filterRef}>
          <button
            type="button"
            className={`workspace-filter-btn${filtersOpen || activeFilterCount > 0 ? " is-active" : ""}`}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            onClick={() => setFiltersOpen(open => !open)}
          >
            <FuelIcon name="filter" size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 ? <em>{activeFilterCount}</em> : null}
            <FuelIcon name="chevronDown" size={12} />
          </button>
          {filtersOpen ? (
            <div className="workspace-filter-panel" role="dialog" aria-label="Initiative filters">
              <div className="workspace-filter-panel-fields">
                <label className="workspace-filter-field">
                  <span>Track</span>
                  <select
                    className="signals-intel-toolbar-select workspace-compact-toolbar-select"
                    value={pillarFilter}
                    onChange={event => onPillarFilterChange(event.target.value as PortfolioInitiativePillar | "all")}
                    aria-label="Track"
                  >
                    <option value="all">All tracks</option>
                    <option value="dev">R&D</option>
                    <option value="mkt">GTM</option>
                    <option value="rev">G&A</option>
                  </select>
                </label>
                <label className="workspace-filter-field">
                  <span>Kind</span>
                  <select
                    className="signals-intel-toolbar-select workspace-compact-toolbar-select"
                    value={kindFilter}
                    onChange={event => onKindFilterChange(event.target.value as PortfolioInitiativeKind | "all")}
                    aria-label="Kind"
                  >
                    <option value="all">All kinds</option>
                    <option value="continuous">Continuous</option>
                    <option value="one-time">One-time</option>
                  </select>
                </label>
              </div>
              <div className="workspace-filter-panel-footer">
                <button
                  type="button"
                  className="initiatives-secondary-btn"
                  onClick={() => {
                    onClearFilters();
                  }}
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  className="initiatives-primary-btn"
                  onClick={() => setFiltersOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <label className="investor-portfolio-initiatives-group-by">
          <span className="sr-only">Group by</span>
          <select
            value={groupBy}
            onChange={event => onGroupByChange(event.target.value as PortfolioInitiativeGroupBy)}
            aria-label="Group by"
          >
            <option value="none">Group: None</option>
            <option value="company">Group: Company</option>
            <option value="track">Group: Track</option>
            <option value="kind">Group: Kind</option>
          </select>
        </label>
        <div className="workspace-compact-toolbar-end">
          <div className="initiatives-status-toggle initiatives-status-toggle--toolbar" role="tablist" aria-label="Initiative status">
            {(["Active", "Completed"] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={statusTab === tab}
                className={`initiatives-status-toggle-btn${statusTab === tab ? " is-active" : ""}`}
                onClick={() => onStatusTabChange(tab)}
              >
                {tab === "Active" ? "Open" : "Completed"}
                <em>{statusCounts[tab]}</em>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortfolioInitiativesSection({
  companies,
  onOpenCompanyProfile,
}: {
  companies: PortfolioCompanyView[];
  onOpenCompanyProfile?: (company: PortfolioCompanyView) => void;
}) {
  const [statusTab, setStatusTab] = useState<PortfolioInitiativeListStatus>("Active");
  const [searchQuery, setSearchQuery] = useState("");
  const [pillarFilter, setPillarFilter] = useState<PortfolioInitiativePillar | "all">("all");
  const [kindFilter, setKindFilter] = useState<PortfolioInitiativeKind | "all">("all");
  const [groupBy, setGroupBy] = useState<PortfolioInitiativeGroupBy>("none");
  const [page, setPage] = useState(1);

  const companiesById = useMemo(
    () => new Map(companies.map(company => [company.id, company])),
    [companies],
  );

  const allRows = useMemo(
    () => listPortfolioInitiativesForCompanies(companies),
    [companies],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<PortfolioInitiativeListStatus, number> = { Active: 0, Completed: 0 };
    allRows.forEach(row => {
      counts[portfolioInitiativeListStatus(row)] += 1;
    });
    return counts;
  }, [allRows]);

  const tabItems = useMemo(
    () => allRows.filter(row => portfolioInitiativeListStatus(row) === statusTab),
    [allRows, statusTab],
  );

  const visibleItems = useMemo(() => tabItems.filter(row => {
    if (pillarFilter !== "all" && row.pillar !== pillarFilter) return false;
    if (kindFilter !== "all" && row.kind !== kindFilter) return false;
    const assignees = portfolioInitiativeAssignees(row.owner, row.assignees);
    return matchesSearch(
      [
        row.companyName,
        row.title,
        row.description,
        portfolioInitiativePillarLabel(row.pillar),
        portfolioInitiativeKindLabel(row.kind),
        assignees.join(" "),
        portfolioInitiativeDisplayStatus(portfolioInitiativeListStatus(row)),
      ],
      searchQuery,
    );
  }), [tabItems, pillarFilter, kindFilter, searchQuery]);

  const sortedItems = useMemo(() => {
    if (groupBy === "none") return visibleItems;
    return [...visibleItems].sort((left, right) => {
      const leftKey = groupKeyForRow(left, groupBy);
      const rightKey = groupKeyForRow(right, groupBy);
      const byGroup = compareGroupKeys(leftKey, rightKey, groupBy);
      if (byGroup !== 0) return byGroup;
      if (groupBy !== "company") {
        const byCompany = left.companyName.localeCompare(right.companyName);
        if (byCompany !== 0) return byCompany;
      }
      return left.title.localeCompare(right.title);
    });
  }, [visibleItems, groupBy]);

  const groupCounts = useMemo(() => {
    if (groupBy === "none") return new Map<string, number>();
    const counts = new Map<string, number>();
    visibleItems.forEach(row => {
      const key = groupKeyForRow(row, groupBy);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [visibleItems, groupBy]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, searchQuery, pillarFilter, kindFilter, groupBy, companies.length]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [sortedItems, safePage]);

  const activeFilterCount = (pillarFilter !== "all" ? 1 : 0) + (kindFilter !== "all" ? 1 : 0);
  const showCompanyColumn = groupBy !== "company";

  function groupHeading(key: string, sampleRow: PortfolioInitiativeRow): string {
    if (groupBy === "company") return sampleRow.companyName;
    if (groupBy === "track") return portfolioInitiativePillarLabel(sampleRow.pillar);
    if (groupBy === "kind") return portfolioInitiativeKindLabel(sampleRow.kind);
    return key;
  }

  function renderRow(item: PortfolioInitiativeRow) {
    const company = companiesById.get(item.companyId);
    const listStatus = portfolioInitiativeListStatus(item);
    const displayStatus = portfolioInitiativeDisplayStatus(listStatus);
    const assignees = portfolioInitiativeAssignees(item.owner, item.assignees);
    const statusClass = listStatus === "Completed" ? "completed" : "active";
    return (
      <div
        key={`${item.companyId}-${item.id}`}
        className="workspace-table-row initiatives-table-row"
      >
        {showCompanyColumn ? (
          <div className="investor-portfolio-initiatives-company-cell">
            {company && onOpenCompanyProfile ? (
              <button
                type="button"
                className="investor-portfolio-initiatives-company"
                onClick={() => onOpenCompanyProfile(company)}
              >
                <PortfolioCompanyLogo company={company} />
                <span>{item.companyName}</span>
              </button>
            ) : (
              <span className="investor-portfolio-initiatives-company is-static">{item.companyName}</span>
            )}
          </div>
        ) : null}
        <div className="workspace-table-title-cell">
          <strong title={item.title}>{item.title}</strong>
          <span className="workspace-table-subtitle" title={assignees.join(", ")}>
            {assignees.length ? assignees.join(", ") : "Unassigned"}
          </span>
        </div>
        <span className={`workspace-table-badge initiative-status initiative-status--${statusClass}`}>
          {displayStatus}
        </span>
        <PortfolioInitiativeProgressCell item={item} />
        <span className="workspace-table-keyfact">{portfolioInitiativePillarLabel(item.pillar)}</span>
        <span className="workspace-table-date">{portfolioInitiativeKindLabel(item.kind)}</span>
        <div className="workspace-table-actions">
          {company && onOpenCompanyProfile ? (
            <button
              type="button"
              className="workspace-table-action-btn workspace-table-action-btn--primary workspace-table-action-btn--icon"
              onClick={() => onOpenCompanyProfile(company)}
              aria-label={`Open ${item.companyName}`}
              title={`Open ${item.companyName}`}
            >
              <FuelIcon name="investors" size={14} />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section className="investor-portfolio-initiatives initiatives-page" aria-label="Portfolio initiatives">
      <article className="overview-panel workspace-list-panel">
        <PortfolioInitiativesToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pillarFilter={pillarFilter}
          onPillarFilterChange={setPillarFilter}
          kindFilter={kindFilter}
          onKindFilterChange={setKindFilter}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          statusTab={statusTab}
          onStatusTabChange={setStatusTab}
          statusCounts={statusCounts}
          activeFilterCount={activeFilterCount}
          onClearFilters={() => {
            setPillarFilter("all");
            setKindFilter("all");
          }}
        />

        {tabItems.length === 0 ? (
          <div className="initiatives-empty-card">
            <strong>{statusTab === "Completed" ? "No completed initiatives" : "No open initiatives"}</strong>
            <p>
              {statusTab === "Completed"
                ? "Completed initiatives from portfolio companies will show here."
                : "When companies log active initiatives on Fuel, they appear in this portfolio view."}
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="workspace-list-filter-empty workspace-list-panel-inset">
            <strong>No matches</strong>
            <p>Try a different search or filter.</p>
            <button
              type="button"
              className="initiatives-secondary-btn"
              onClick={() => {
                setSearchQuery("");
                setPillarFilter("all");
                setKindFilter("all");
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
            <div
              className={`workspace-table initiatives-table initiatives-table--portfolio${
                showCompanyColumn ? "" : " initiatives-table--portfolio-no-company"
              }`}
            >
              <div className="workspace-table-head initiatives-table-head" role="row">
                {showCompanyColumn ? <span>Company</span> : null}
                <span>Initiative</span>
                <span>Status</span>
                <span>Progress</span>
                <span>Track</span>
                <span>Kind</span>
                <span>Actions</span>
              </div>
              {pageItems.map((item, index) => {
                const key = groupKeyForRow(item, groupBy);
                const prevKey = index > 0 ? groupKeyForRow(pageItems[index - 1]!, groupBy) : null;
                const showGroupHead = groupBy !== "none" && (index === 0 || key !== prevKey);
                return (
                  <React.Fragment key={`${item.companyId}-${item.id}`}>
                    {showGroupHead ? (
                      <div className="initiatives-table-group-head" role="row">
                        <span>
                          {groupBy === "company" && companiesById.get(item.companyId) ? (
                            <span className="initiatives-table-group-head-label">
                              <PortfolioCompanyLogo company={companiesById.get(item.companyId)!} />
                              {groupHeading(key, item)}
                            </span>
                          ) : (
                            groupHeading(key, item)
                          )}
                        </span>
                        <em>{groupCounts.get(key) ?? 0}</em>
                      </div>
                    ) : null}
                    {renderRow(item)}
                  </React.Fragment>
                );
              })}
            </div>
            {sortedItems.length > 0 ? (
              <div className="workspace-table-pagination" role="navigation" aria-label="Table pagination">
                <span className="workspace-table-pagination-meta">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedItems.length)} of {sortedItems.length}
                </span>
                <div className="workspace-table-pagination-controls">
                  <button
                    type="button"
                    className="workspace-table-pagination-btn"
                    disabled={safePage <= 1}
                    aria-label="Previous page"
                    onClick={() => setPage(safePage - 1)}
                  >
                    <FuelIcon name="chevronLeft" size={14} />
                  </button>
                  <span className="workspace-table-pagination-page">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="workspace-table-pagination-btn"
                    disabled={safePage >= totalPages}
                    aria-label="Next page"
                    onClick={() => setPage(safePage + 1)}
                  >
                    <FuelIcon name="chevronRight" size={14} />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </article>
    </section>
  );
}

export { countPortfolioInitiativesForCompanies };
