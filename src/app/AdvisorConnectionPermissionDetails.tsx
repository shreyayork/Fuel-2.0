import React from "react";
import { FuelIcon } from "./icons.tsx";
import { ADVISOR_PERMISSION_OPTIONS } from "./advisorPermissionOptions.ts";

export function AdvisorConnectionPermissionDetails() {
  return (
    <details className="advisor-connection-permission-details">
      <summary>
        <span className="advisor-connection-permission-details-label">
          What each selection shares
        </span>
        <span className="advisor-connection-permission-details-toggle">
          <span className="advisor-connection-permission-details-toggle-show">Show</span>
          <span className="advisor-connection-permission-details-toggle-hide">Hide</span>
          <span className="advisor-connection-permission-details-chevron" aria-hidden="true">
            <FuelIcon name="chevronDown" size={14} strokeWidth={2} />
          </span>
        </span>
      </summary>
      <div className="advisor-connection-permission-details-panel">
        <ul>
          {ADVISOR_PERMISSION_OPTIONS.map(option => (
            <li key={option.key}>
              <strong>{option.title}:</strong> {option.description}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
