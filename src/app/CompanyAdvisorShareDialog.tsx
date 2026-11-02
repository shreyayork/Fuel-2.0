import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "./a11y/useDialogA11y.ts";
import { AdvisorConnectionPermissionsList } from "./AdvisorConnectionPermissionsList.tsx";
import { AdvisorConnectionPermissionDetails } from "./AdvisorConnectionPermissionDetails.tsx";
import {
  DEFAULT_ADVISOR_PERMISSIONS,
  type AdvisorConnectionPermissions,
} from "./advisorConnectionStorage.ts";
import type { FuelAdvisorProfile } from "./advisorDirectoryStorage.ts";
import "./advisorConnections.css";

export function CompanyAdvisorShareDialog({
  open,
  advisor,
  companyName,
  mode,
  initialPermissions,
  onClose,
  onSave,
}: {
  open: boolean;
  advisor: FuelAdvisorProfile | null;
  companyName: string;
  mode: "invite" | "manage";
  initialPermissions?: AdvisorConnectionPermissions;
  onClose: () => void;
  onSave: (permissions: AdvisorConnectionPermissions) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [permissions, setPermissions] = useState<AdvisorConnectionPermissions>(DEFAULT_ADVISOR_PERMISSIONS);
  useDialogA11y(open, dialogRef, onClose);

  useEffect(() => {
    if (!open) return;
    setPermissions({
      ...DEFAULT_ADVISOR_PERMISSIONS,
      ...initialPermissions,
    });
  }, [open, advisor?.id, initialPermissions]);

  if (!open || !advisor) return null;

  const selectedCount = Object.values(permissions).filter(Boolean).length;
  const title = mode === "invite"
    ? `Invite ${advisor.name} to connect`
    : `Shared access for ${advisor.name}`;
  const description = mode === "invite"
    ? `Choose what ${advisor.name} can monitor if they accept. You can change this later for each advisor.`
    : `Update what ${advisor.name} can see for ${companyName}. Changes apply immediately for an active connection.`;

  return createPortal(
    <div className="advisor-connection-scrim" role="presentation">
      <div
        ref={dialogRef}
        className="advisor-connection-dialog overview-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-advisor-share-title"
      >
        <header className="advisor-connection-dialog-head">
          <div>
            <span>Advisors · {companyName}</span>
            <h2 id="company-advisor-share-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="advisor-connection-dialog-body">
          <AdvisorConnectionPermissionsList
            permissions={permissions}
            permissionsHead="Choose what to share"
            onChange={setPermissions}
          />

          <AdvisorConnectionPermissionDetails />

          <p className="advisor-connection-private">
            <strong>Always private:</strong> chats, drafts, internal notes, unshared files, billing, credentials,
            and relationships with other advisors.
          </p>
        </div>

        <footer className="advisor-connection-dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="primary"
            disabled={selectedCount === 0}
            onClick={() => onSave(permissions)}
          >
            {mode === "invite" ? "Send invite" : "Save permissions"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
