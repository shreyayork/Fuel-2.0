import { findFounderCompanyProfile } from "../OnboardingFlow.tsx";
import { sharedAdvisorAccess } from "../advisorConnectionStorage.ts";
import { INVESTOR_PORTFOLIO, SUGGESTED_FOUNDERS } from "../investor/investorData.ts";

export type ExternalCompanyRecord = {
  id: string;
  displayName: string;
  domain: string;
  meta: string;
  headquarters: string;
  employees: string;
  linkedin: string;
};

function publicMarketTags(company: { meta: string; headquarters: string; employees: string }) {
  const headquarters = company.headquarters.trim().toLowerCase();
  const employees = company.employees.trim().toLowerCase();
  return company.meta.split("·").map(part => part.trim()).filter(part => {
    const key = part.toLowerCase();
    if (!key || key === headquarters || key === employees) return false;
    if (part.includes(",")) return false;
    if (/^\d/.test(part)) return false;
    return true;
  });
}

function externalProfileLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ExternalCompanyOverview({ company }: { company: ExternalCompanyRecord }) {
  const suggested = SUGGESTED_FOUNDERS.find(item => item.id === company.id);
  const portfolio = INVESTOR_PORTFOLIO.find(item => item.id === company.id);
  const access = sharedAdvisorAccess(company.id);
  const founderProfile = findFounderCompanyProfile({ name: company.displayName, domain: company.domain });
  const markets = publicMarketTags(company);
  const headquarters = company.headquarters
    || [founderProfile?.city, founderProfile?.stateRegion, founderProfile?.country].filter(Boolean).join(", ");
  const industry = founderProfile?.industry || (access?.sharedProfile ? portfolio?.sector : "");
  const similar = suggested?.similarTo ? [suggested.similarTo] : [];
  const links = company.linkedin
    ? [{ label: "LinkedIn", href: externalProfileLink(company.linkedin) }]
    : [];
  const metrics = access?.approvedBenchmarks && portfolio
    ? [
      { label: "ARR", value: portfolio.arr },
      { label: "Quarterly growth", value: `${portfolio.arrGrowthQoQ > 0 ? "+" : ""}${portfolio.arrGrowthQoQ}%` },
      { label: "Runway", value: portfolio.runway },
      { label: "Net revenue retention", value: `${portfolio.nrr}%` },
    ]
    : [
      { label: "Total funding", value: "—" },
      { label: "Funding rounds", value: founderProfile?.funding.length ? String(founderProfile.funding.length) : "0" },
      { label: "Last funding", value: "—" },
      { label: "Founded", value: founderProfile?.founded || "—" },
    ];
  const sharedWaiting = access
    ? [
      access.sharedIntelligence ? "intelligence" : null,
      access.sharedInitiatives ? "initiatives" : null,
      access.sharedDataRoomFiles ? "data room files" : null,
    ].filter((item): item is string => Boolean(item))
    : [];

  return (
    <section className="overview-tour-page">
      <div className="overview-metric-grid">
        {metrics.map(metric => (
          <div className="overview-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className="overview-layout-grid">
        <div className="overview-main-column">
          <div className="overview-panel">
            <span>About</span>
            <p>{founderProfile?.whatTheyDo || "No public description on record."}</p>
          </div>

          <div className="overview-panel">
            <span>Company details</span>
            <div className="overview-detail-list">
              {company.domain ? (
                <div className="overview-detail-row">
                  <em>Website</em>
                  <strong>
                    <a className="overview-public-link" href={externalProfileLink(company.domain)} target="_blank" rel="noreferrer">
                      {company.domain}
                    </a>
                  </strong>
                </div>
              ) : null}
              <div className="overview-detail-row">
                <em>Headquarters</em>
                <strong>{headquarters || "—"}</strong>
              </div>
              <div className="overview-detail-row">
                <em>Employees</em>
                <strong>{company.employees || "—"}</strong>
              </div>
              <div className="overview-detail-row">
                <em>Founded</em>
                <strong>{founderProfile?.founded || "—"}</strong>
              </div>
              {access?.sharedProfile && portfolio?.stage ? (
                <div className="overview-detail-row">
                  <em>Stage</em>
                  <strong>{portfolio.stage}</strong>
                </div>
              ) : null}
              {industry ? (
                <div className="overview-detail-row">
                  <em>Industry</em>
                  <strong>{industry}</strong>
                </div>
              ) : null}
              {founderProfile?.businessModel ? (
                <div className="overview-detail-row">
                  <em>Organization</em>
                  <strong>{founderProfile.businessModel}</strong>
                </div>
              ) : null}
              {access?.sharedProfile && portfolio?.founderEmail ? (
                <div className="overview-detail-row">
                  <em>Founder email</em>
                  <strong>{portfolio.founderEmail}</strong>
                </div>
              ) : null}
              {markets.length > 0 ? (
                <div className="overview-detail-row">
                  <em>Markets</em>
                  <strong className="overview-market-chips">
                    {markets.map(market => (
                      <span className="overview-market-chip" key={market}>{market}</span>
                    ))}
                  </strong>
                </div>
              ) : null}
            </div>
          </div>

          {sharedWaiting.length > 0 ? (
            <div className="overview-panel">
              <span>Shared with you</span>
              <p>
                No {sharedWaiting.length === 1
                  ? sharedWaiting[0]
                  : `${sharedWaiting.slice(0, -1).join(", ")} or ${sharedWaiting[sharedWaiting.length - 1]}`} on file yet.
              </p>
            </div>
          ) : null}

          {founderProfile && founderProfile.funding.length > 0 ? (
            <div className="overview-panel">
              <div className="overview-panel-head">
                <span>Funding rounds</span>
                <em>{founderProfile.funding.length === 1 ? "1 round" : `${founderProfile.funding.length} rounds`}</em>
              </div>
              <div className="workspace-table data-room-list overview-funding-table">
                <div className="workspace-table-head" role="row">
                  <span>Round</span>
                  <span>Amount</span>
                  <span>Investors</span>
                  <span>Date</span>
                  <span>Notes</span>
                </div>
                {founderProfile.funding.map(round => (
                  <div className="workspace-table-row" role="row" key={`${round.type}-${round.amount}`}>
                    <div className="workspace-table-title-cell">
                      <strong title={round.type}>{round.type}</strong>
                    </div>
                    <span className="workspace-table-badge">{round.amount}</span>
                    <span className="workspace-table-keyfact" title={round.investors || undefined}>
                      {round.investors || "—"}
                    </span>
                    <span className="workspace-table-date">—</span>
                    <span className="workspace-table-muted">—</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overview-panel">
              <div className="overview-panel-head">
                <span>Funding rounds</span>
              </div>
              <p>No funding rounds tracked in fuel-data.</p>
            </div>
          )}

          <div className="overview-panel">
            <span>Recent news</span>
            <p>No recent news, podcasts, or mentions linked in fuel-data.</p>
          </div>
        </div>

        <aside className="overview-side-column">
          <div className="overview-panel">
            <span>Profile</span>
            <div className="overview-detail-list">
              <div className="overview-detail-row">
                <em>Company</em>
                <strong>{company.displayName}</strong>
              </div>
              <div className="overview-detail-row">
                <em>Domain</em>
                <strong>{company.domain || "—"}</strong>
              </div>
              <div className="overview-detail-row">
                <em>Company type</em>
                <strong>{founderProfile?.businessModel || "SaaS / Software product"}</strong>
              </div>
              <div className="overview-detail-row">
                <em>Source</em>
                <strong>Website · Tech stack</strong>
              </div>
            </div>
          </div>

          <div className="overview-panel">
            <span>Links</span>
            {links.length > 0 ? (
              <div className="overview-source-list">
                {links.map(link => (
                  <div key={link.href}>
                    <a className="overview-public-link" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
                  </div>
                ))}
              </div>
            ) : (
              <p>No public links on record.</p>
            )}
          </div>

          <div className="overview-panel">
            <span>Similar companies</span>
            {similar.length > 0 ? (
              <div className="overview-company-list">
                {similar.map(name => (
                  <div key={name}>{name}</div>
                ))}
              </div>
            ) : (
              <p>No similar companies indexed.</p>
            )}
          </div>

          <div className="overview-panel">
            <div className="overview-panel-head">
              <span>Data sources</span>
              <em>Enrichment</em>
            </div>
            <div className="overview-source-list">
              <div>
                <strong>Website scrape</strong>
                <em>{company.domain ? "On file" : "—"}</em>
              </div>
              <div>
                <strong>LinkedIn</strong>
                <em>{company.linkedin ? "On file" : "—"}</em>
              </div>
              <div>
                <strong>Crunchbase</strong>
                <em>—</em>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
