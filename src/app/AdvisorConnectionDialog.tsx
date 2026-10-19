import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "./a11y/useDialogA11y.ts";
import { ADVISOR_PERMISSION_OPTIONS } from "./advisorPermissionOptions.ts";
import type { CompanyAdvisorLink } from "./advisorDirectoryStorage.ts";
import {
  DEFAULT_ADVISOR_PERMISSIONS,
  type AdvisorConnectionPermissions,
  type AdvisorConnectionRecord,
} from "./advisorConnectionStorage.ts";
import "./advisorConnections.css";

export function AdvisorConnectionDialog({
  open,
  connection,
  companyInvite = null,
  onAccept,
  onDecline,
  onClose,
}: {
  open: boolean;
  connection?: AdvisorConnectionRecord | null;
  /** Company → advisor invite: same shell as founder review, permissions read-only. */
  companyInvite?: CompanyAdvisorLink | null;
  onAccept: (permissions: AdvisorConnectionPermissions) => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [permissions, setPermissions] = useState<AdvisorConnectionPermissions>(DEFAULT_ADVISOR_PERMISSIONS);
  const advisorReview = Boolean(companyInvite);
  useDialogA11y(open, dialogRef, onClose);

  useEffect(() => {
    if (!open) return;
    if (companyInvite) {
      setPermissions({
        ...DEFAULT_ADVISOR_PERMISSIONS,
        ...companyInvite.permissions,
      });
      return;
    }
    setPermissions({
      ...DEFAULT_ADVISOR_PERMISSIONS,
      ...connection?.permissions,
    });
  }, [companyInvite, connection?.companyId, connection?.permissions, open]);

  if (!open) return null;
  if (!advisorReview && !connection) return null;
  if (advisorReview && !companyInvite) return null;

  const permissionOptions = ADVISOR_PERMISSION_OPTIONS;
  const selectedCount = Object.values(permissions).filter(Boolean).length;

  let eyebrow: string;
  let title: string;
  let description: string;
  let permissionsHead: string;
  let declineLabel: string;
  let acceptLabel: string;

  if (advisorReview && companyInvite) {
    eyebrow = "Invitation from a company on Fuel";
    title = `${companyInvite.companyName} invited you to connect`;
    description = `${companyInvite.companyName} added you as an advisor on Fuel and chose what they want to share if you accept.`;
    permissionsHead = "What they want to share";
    declineLabel = "Decline";
    acceptLabel = "Accept invitation";
  } else if (connection) {
    const source = connection.source ?? (connection.status === "invite_sent" ? "invite" : "request");
    eyebrow = source === "invite"
      ? "Invitation from an advisor on Fuel"
      : source === "crunchbase"
        ? "Advisor found on Fuel"
        : "Request from an advisor on Fuel";
    title = source === "invite"
      ? `Share ${connection.companyName} data with ${connection.advisorName}?`
      : source === "crunchbase"
        ? `Is ${connection.advisorName} your advisor?`
        : `Share ${connection.companyName} data with ${connection.advisorName}?`;
    description = source === "crunchbase"
      ? `${connection.advisorName} is on Fuel as an advisor. Confirm the relationship and choose what you want to share.`
      : source === "invite"
        ? `${connection.advisorName} is on Fuel and invited your company to connect. Choose what they can monitor before accepting.`
        : `${connection.advisorName} is on Fuel and requested access to monitor your company. Choose what you want to share.`;
    permissionsHead = "Choose what to share";
    declineLabel = source === "crunchbase" ? "Not my advisor" : "Not now";
    acceptLabel = source === "invite" ? "Accept and share" : "Connect and share";
  } else {
    return null;
  }

  return createPortal(
    <div className="advisor-connection-scrim" role="presentation">
      <div
        ref={dialogRef}
        className="advisor-connection-dialog overview-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisor-connection-title"
      >
        <header className="advisor-connection-dialog-head">
          <div>
            <span>{eyebrow}</span>
            <h2 id="advisor-connection-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="advisor-connection-dialog-body">
          <div className="advisor-connection-permissions">
            <div className="advisor-connection-permissions-head">
              <strong>{permissionsHead}</strong>
              <span>{selectedCount} of {permissionOptions.length} selected</span>
            </div>
            {permissionOptions.map(option => (
              <label
                key={option.key}
                className={`advisor-connection-permission${advisorReview ? " is-readonly" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={permissions[option.key]}
                  disabled={advisorReview}
                  readOnly={advisorReview}
                  onChange={advisorReview ? undefined : event => setPermissions(current => ({
                    ...current,
                    [option.key]: event.target.checked,
                  }))}
                />
                <span>
                  <strong>{option.title}</strong>
                </span>
              </label>
            ))}
          </div>

          <details className="advisor-connection-permission-details">
            <summary>What each selection shares</summary>
            <ul>
              {permissionOptions.map(option => (
                <li key={option.key}>
                  <strong>{option.title}:</strong> {option.description}
                </li>
              ))}
            </ul>
          </details>

          <p className="advisor-connection-private">
            {advisorReview && companyInvite ? (
              <>
                Accepting lets you monitor the shared items above for {companyInvite.companyName}. Chats, drafts,
                and unshared files stay private to the company. You can disconnect later.
              </>
            ) : (
              <>
                <strong>Always private:</strong> chats, drafts, internal notes, unshared files, billing, credentials,
                and relationships with other advisors. You can change permissions or disconnect at any time.
              </>
            )}
          </p>
        </div>

        <footer className="advisor-connection-dialog-actions">
          <button type="button" className="secondary" onClick={onDecline}>
            {declineLabel}
          </button>
          <button
            type="button"
            className="primary"
            disabled={!advisorReview && selectedCount === 0}
            onClick={() => onAccept(permissions)}
          >
            {acceptLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
