import React from "react";
import { FuelIcon } from "./icons.tsx";
import {
  ADVISOR_PERMISSION_ICON,
  ADVISOR_PERMISSION_OPTIONS,
} from "./advisorPermissionOptions.ts";
import type { AdvisorConnectionPermissions } from "./advisorConnectionStorage.ts";

export function AdvisorConnectionPermissionsList({
  permissions,
  permissionsHead,
  readOnly = false,
  onChange,
}: {
  permissions: AdvisorConnectionPermissions;
  permissionsHead: string;
  readOnly?: boolean;
  onChange?: (next: AdvisorConnectionPermissions) => void;
}) {
  const selectedCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="advisor-connection-permissions-panel">
      <div className="advisor-connection-permissions-head">
        <strong>{permissionsHead}</strong>
        <span
          className="advisor-connection-permissions-count"
          title={`${selectedCount} of ${ADVISOR_PERMISSION_OPTIONS.length} selected`}
        >
          {selectedCount}/{ADVISOR_PERMISSION_OPTIONS.length}
        </span>
      </div>
      <div className="advisor-connection-permissions-list">
        {ADVISOR_PERMISSION_OPTIONS.map(option => {
          const checked = permissions[option.key];
          return (
            <label
              key={option.key}
              className={`advisor-connection-permission${readOnly ? " is-readonly" : ""}${
                checked ? " is-on" : ""
              }`}
            >
              <span className="advisor-connection-permission-icon" aria-hidden="true">
                <FuelIcon
                  name={ADVISOR_PERMISSION_ICON[option.key]}
                  size={14}
                  strokeWidth={1.85}
                />
              </span>
              <span className="advisor-connection-permission-copy">
                <span>{option.title}</span>
              </span>
              <span className="advisor-connection-permission-checkbox">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly}
                  readOnly={readOnly}
                  tabIndex={readOnly ? -1 : undefined}
                  onChange={readOnly ? undefined : event => onChange?.({
                    ...permissions,
                    [option.key]: event.target.checked,
                  })}
                />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
