import React from "react";

/** Placeholder search — labeled and keyboard reachable until live search ships. */
export function TopbarCompanySearch() {
  return (
    <div className="search-box">
      <label htmlFor="topbar-company-search" className="sr-only">
        Search companies
      </label>
      <span aria-hidden="true" style={{ fontSize: "12px", opacity: 0.6 }}>
        ⌕
      </span>
      <input
        id="topbar-company-search"
        type="search"
        className="search-box-input"
        placeholder="Search companies..."
        disabled
        aria-describedby="topbar-company-search-hint"
      />
      <span id="topbar-company-search-hint" className="sr-only">
        Company search is coming soon. Recently viewed companies are listed in the sidebar.
      </span>
    </div>
  );
}
