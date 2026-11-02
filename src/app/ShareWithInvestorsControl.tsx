import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatShareWithSummary,
  groupShareInvestorsByFirm,
  listShareableInvestorsForCompany,
  shareInvestorRowSubtitle,
  toggleShareInvestorId,
  type ShareInvestorOption,
} from "./shareWithInvestors.ts";
import { getCompanyLogoColors } from "./companyLogoColors.ts";
import "./shareWithInvestors.css";
import "./formConfirm.css";
import { FuelIcon } from "./icons.tsx";

type ShareWithInvestorsControlProps = {
  companyId: string;
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  variant?: "field" | "cell" | "cta";
  label?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
};

const MODAL_BULK_SHARE_THRESHOLD = 8;
const DRAWER_LIST_MAX = 480;

function initialFromName(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  return initialFromName(name);
}

function SharePersonAvatar({
  name,
  photoUrl,
  size = 40,
  className = "",
  title,
}: {
  name: string;
  photoUrl?: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const { bg, fg } = getCompanyLogoColors(name);
  return (
    <span
      className={`share-access-person-avatar${className ? ` ${className}` : ""}`}
      style={{
        height: size,
        width: size,
        fontSize: size >= 40 ? 13 : size >= 28 ? 11 : 10,
        ...(photoUrl ? {} : { background: bg, color: fg }),
      }}
      aria-hidden="true"
      title={title ?? name}
    >
      {photoUrl ? <img src={photoUrl} alt="" /> : personInitials(name)}
    </span>
  );
}

function ShareAvatarStack({
  people,
  max = 3,
}: {
  people: Array<{ id: string; label: string; photoUrl?: string }>;
  max?: number;
}) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  return (
    <span className="share-access-avatar-stack" aria-hidden="true">
      {visible.map(person => (
        <SharePersonAvatar
          key={person.id}
          name={person.label}
          photoUrl={person.photoUrl}
          size={22}
          className="share-access-avatar-stack-item"
          title={person.label}
        />
      ))}
      {overflow > 0 ? (
        <span className="share-access-avatar-stack-item is-more">+{overflow}</span>
      ) : null}
    </span>
  );
}

function matchesShareQuery(option: ShareInvestorOption, q: string) {
  return option.name.toLowerCase().includes(q)
    || option.subtitle.toLowerCase().includes(q)
    || option.id.toLowerCase().includes(q)
    || (option.email?.toLowerCase().includes(q) ?? false);
}

export function ShareWithInvestorsControl({
  companyId,
  selectedIds,
  onChange,
  variant = "field",
  label = "Share access with",
  disabled = false,
  defaultOpen = false,
}: ShareWithInvestorsControlProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState<ShareInvestorOption | null>(null);
  const [drawerInitialShareSession, setDrawerInitialShareSession] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerSearchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const options = listShareableInvestorsForCompany(companyId);
  const useDrawer = variant === "cell";
  const investorIds = selectedIds.filter(id => !id.startsWith("email:"));
  const summary = formatShareWithSummary(investorIds, options);
  const selectedCount = investorIds.length;
  const hasAccess = selectedCount > 0;
  const remainingToShare = Math.max(0, options.length - selectedCount);

  const selectedPeople = useMemo(
    () => investorIds.map(id => {
      const match = options.find(option => option.id === id);
      return {
        id,
        label: match?.name ?? id,
        email: match?.email,
        subtitle: match?.subtitle,
        photoUrl: match?.photoUrl,
      };
    }),
    [investorIds, options],
  );

  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const orderedOptions = useMemo(() => {
    const selected = new Set(investorIds);
    const shared: ShareInvestorOption[] = [];
    const available: ShareInvestorOption[] = [];
    options.forEach(option => {
      if (selected.has(option.id)) shared.push(option);
      else available.push(option);
    });
    return [...shared, ...available];
  }, [options, investorIds]);

  const drawerShowFullList = drawerInitialShareSession;

  const drawerListSource = useMemo(() => {
    if (drawerShowFullList) return options;
    if (hasAccess) return orderedOptions;
    return options;
  }, [drawerShowFullList, hasAccess, options, orderedOptions]);

  const drawerFilteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drawerListSource;
    return drawerListSource.filter(option => matchesShareQuery(option, q));
  }, [drawerListSource, query]);

  const drawerGroups = useMemo(
    () => groupShareInvestorsByFirm(drawerFilteredOptions).map(group => ({
      ...group,
      items: [...group.items].sort((left, right) => {
        const leftShared = investorIds.includes(left.id) ? 0 : 1;
        const rightShared = investorIds.includes(right.id) ? 0 : 1;
        if (leftShared !== rightShared) return leftShared - rightShared;
        return left.name.localeCompare(right.name);
      }),
    })),
    [drawerFilteredOptions, investorIds],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedOptions;
    return orderedOptions.filter(option => matchesShareQuery(option, q));
  }, [orderedOptions, query]);

  const showBulkShareAction = options.length >= MODAL_BULK_SHARE_THRESHOLD && remainingToShare > 0;

  useLayoutEffect(() => {
    if (!open || useDrawer || !triggerRef.current) {
      if (!open || useDrawer) setMenuPos(null);
      return;
    }
    const EDGE = 12;
    const GAP = 8;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(380, Math.max(rect.width, variant === "cta" ? 300 : 320));
      let left = variant === "cta" ? rect.right - width : rect.left;
      if (left < EDGE) left = EDGE;
      if (left + width > window.innerWidth - EDGE) {
        left = Math.max(EDGE, window.innerWidth - width - EDGE);
      }

      const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE;
      const spaceAbove = rect.top - GAP - EDGE;
      const preferredHeight = Math.min(380, Math.max(260, filteredOptions.length * 48 + 200));
      const openBelow = spaceBelow >= Math.min(preferredHeight, 220) || spaceBelow >= spaceAbove;
      const available = Math.max(180, openBelow ? spaceBelow : spaceAbove);
      const maxHeight = Math.min(preferredHeight, available);
      const top = openBelow
        ? rect.bottom + GAP
        : Math.max(EDGE, rect.top - GAP - maxHeight);

      setMenuPos({ top, left, width, maxHeight });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, filteredOptions.length, selectedCount, useDrawer, variant]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(
      () => (useDrawer ? drawerSearchRef : searchRef).current?.focus(),
      useDrawer ? 60 : 20,
    );
    return () => window.clearTimeout(timer);
  }, [open, useDrawer]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (useDrawer) return;
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (removeConfirm) {
        setRemoveConfirm(null);
        return;
      }
      closePanel();
    };
    if (!useDrawer) {
      window.addEventListener("mousedown", onPointer);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      if (!useDrawer) {
        window.removeEventListener("mousedown", onPointer);
      }
      window.removeEventListener("keydown", onKey);
    };
  }, [open, useDrawer, removeConfirm]);

  const closePanel = () => {
    setOpen(false);
    setQuery("");
    setRemoveConfirm(null);
    setDrawerInitialShareSession(false);
  };

  const drawerCloseLabel = drawerShowFullList
    ? (hasAccess ? "Save sharing" : "Close")
    : "Close";

  const drawerHeaderTitle = drawerShowFullList
    ? "Share access"
    : (hasAccess ? "Manage access" : "Share access");

  const drawerHeaderSub = drawerShowFullList
    ? "Everyone you’re connected to is listed below. Tap Add for each person you want to share with."
    : hasAccess
      ? "People with access show first in each firm. Tap Add for anyone else you want to include."
      : "Private until you share. Tap Add for each person you want to share with.";

  const toggle = (investorId: string) => {
    onChange(toggleShareInvestorId(investorIds, investorId));
  };

  const removeId = (id: string) => {
    onChange(investorIds.filter(entry => entry !== id));
  };

  const clearAccess = () => {
    onChange([]);
  };

  const shareWithAllConnected = () => {
    onChange(options.map(option => option.id));
  };

  const addSingleInvestor = (investorId: string) => {
    if (investorIds.includes(investorId)) return;
    onChange([...investorIds, investorId]);
  };

  const requestRemoveAccess = (option: ShareInvestorOption) => {
    setRemoveConfirm(option);
  };

  const cancelRemoveAccess = () => {
    setRemoveConfirm(null);
  };

  const confirmRemoveAccess = () => {
    if (!removeConfirm) return;
    removeId(removeConfirm.id);
    setRemoveConfirm(null);
  };

  const shareAccessPanelBody = (
    <div className="share-access-drawer-stack">
      <section className="initiative-card-section share-access-drawer-section">
        <div className="initiative-card-section-head">
          <span className="initiative-card-section-label">
            {hasAccess ? "Share access" : "Connected investors"}
          </span>
          <span className="share-access-drawer-head-meta">
            {hasAccess ? (
              <span className="share-access-drawer-count">{selectedCount}</span>
            ) : null}
            {showBulkShareAction && !query.trim() ? (
              <button
                type="button"
                className="initiative-edit-btn"
                onClick={shareWithAllConnected}
              >
                Share with all ({options.length})
              </button>
            ) : null}
          </span>
        </div>

        <label className="share-access-search--drawer">
          <span className="share-access-search-icon" aria-hidden="true">
            <FuelIcon name="search" size={15} strokeWidth={1.75} />
          </span>
          <span className="sr-only">Search investors</span>
          <input
            ref={drawerSearchRef}
            className="share-access-search-input"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by name, email, or firm…"
            autoComplete="off"
          />
        </label>

        {hasAccess && remainingToShare > 0 && !query.trim() ? (
          <p className="share-access-drawer-list-hint">
            {remainingToShare} more {remainingToShare === 1 ? "person" : "people"} you can add — shown below people who already have access.
          </p>
        ) : null}

        {drawerShowFullList && hasAccess ? (
          <p className="share-access-drawer-list-hint">
            {selectedCount} {selectedCount === 1 ? "person" : "people"} selected — tap Save sharing when you&apos;re finished.
          </p>
        ) : null}

        <div
          className="share-access-drawer-list share-access-drawer-list--unified"
          style={{ maxHeight: DRAWER_LIST_MAX }}
        >
          {drawerFilteredOptions.length === 0 ? (
            <p className="initiative-card-section-empty">
              {query.trim()
                ? `No investors match “${query.trim()}”.`
                : "No connected investors available."}
            </p>
          ) : (
            drawerGroups.map(group => (
              <div key={group.firm} className="share-access-firm-group">
                <div className="share-access-firm-group-head">
                  <span className="share-access-firm-group-label">{group.firm}</span>
                  <span className="share-access-firm-group-meta">{group.items.length}</span>
                </div>
                <div className="share-access-workspace-rows">
                  {group.items.map(option => {
                    const shared = investorIds.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={`share-access-drawer-row share-access-drawer-row--static${
                          shared ? " is-shared" : ""
                        }`}
                      >
                        <SharePersonAvatar
                          name={option.name}
                          photoUrl={option.photoUrl}
                          size={40}
                        />
                        <span className="share-access-drawer-row-copy">
                          <strong title={option.name}>{option.name}</strong>
                          <em title={shareInvestorRowSubtitle(option)}>
                            {shareInvestorRowSubtitle(option)}
                          </em>
                        </span>
                        {shared ? (
                          <button
                            type="button"
                            className="share-access-drawer-remove-icon"
                            aria-label={`Remove access for ${option.name}`}
                            title={`Remove ${option.name}`}
                            onClick={() => requestRemoveAccess(option)}
                          >
                            <FuelIcon name="trash" size={15} strokeWidth={1.75} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="share-access-drawer-row-action"
                            onClick={() => addSingleInvestor(option.id)}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );

  const shareAccessPopoverBody = (
    <>
      {hasAccess ? (
        <div className="share-access-selected">
          <div className="share-access-selected-head">
            <span className="share-access-selected-label">People with access</span>
            <span className="share-access-selected-count">{selectedCount}</span>
          </div>
          <div className="share-access-chips">
            {selectedPeople.map(chip => (
              <button
                key={chip.id}
                type="button"
                className="share-access-chip"
                onClick={() => removeId(chip.id)}
                title={`Remove ${chip.label}`}
              >
                <SharePersonAvatar
                  name={chip.label}
                  photoUrl={chip.photoUrl}
                  size={28}
                />
                <span className="share-access-chip-copy">
                  <em>{chip.label}</em>
                  {chip.email ? <span className="share-access-chip-email">{chip.email}</span> : null}
                </span>
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="share-access-search">
        <span className="sr-only">{hasAccess ? "Add more people" : "Search investors"}</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={hasAccess ? "Add more people…" : "Search investors…"}
          autoComplete="off"
        />
      </label>

      {hasAccess && remainingToShare > 0 && !query.trim() ? (
        <p className="share-access-add-hint">
          {remainingToShare} more {remainingToShare === 1 ? "person" : "people"} available to share with
        </p>
      ) : null}

      <div className="share-access-list" role="listbox" id={listId} aria-multiselectable="true">
        {filteredOptions.length === 0 ? (
          <p className="share-access-empty">
            {query.trim()
              ? `No investors match “${query.trim()}”.`
              : "No connected investors available."}
          </p>
        ) : (
          filteredOptions.map(option => {
            const checked = investorIds.includes(option.id);
            return (
              <label
                key={option.id}
                className={`share-access-option${checked ? " is-checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.id)}
                />
                <SharePersonAvatar
                  name={option.name}
                  photoUrl={option.photoUrl}
                  size={28}
                />
                <span className="share-access-option-copy">
                  <strong>{option.name}</strong>
                  <em>{option.subtitle}</em>
                </span>
                <span className="share-access-option-state">
                  {checked ? "Shared" : "Add"}
                </span>
              </label>
            );
          })
        )}
      </div>
    </>
  );

  const panelFooter = (
    <footer
      className={
        useDrawer
          ? "bench-drawer-actions"
          : "share-access-popover-foot"
      }
    >
      {useDrawer ? (
        <>
          <button
            type="button"
            className="bench-drawer-cancel"
            onClick={clearAccess}
            disabled={!hasAccess}
          >
            Make private
          </button>
          <div className="share-access-drawer-actions-end">
            {showBulkShareAction && query.trim() ? (
              <button
                type="button"
                className="bench-drawer-cancel"
                onClick={shareWithAllConnected}
              >
                Share with all
              </button>
            ) : null}
            <button
              type="button"
              className="bench-drawer-save"
              onClick={closePanel}
            >
              {drawerCloseLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="share-access-ghost"
            onClick={clearAccess}
            disabled={!hasAccess}
          >
            Make private
          </button>
          <button
            type="button"
            className="share-access-done"
            onClick={closePanel}
          >
            Close
          </button>
        </>
      )}
    </footer>
  );

  const removeAccessConfirmDialog = removeConfirm && typeof document !== "undefined"
    ? createPortal(
      <div
        className="form-confirm-backdrop share-access-remove-confirm-backdrop"
        onPointerDown={cancelRemoveAccess}
        role="presentation"
      >
        <div
          className="form-confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="share-access-remove-title"
          aria-describedby="share-access-remove-desc"
          onPointerDown={event => event.stopPropagation()}
        >
          <h3 id="share-access-remove-title">Remove access?</h3>
          <p id="share-access-remove-desc">
            {removeConfirm.name} will no longer be able to view this company&apos;s shared data.
            You can add them back anytime.
          </p>
          <div className="form-confirm-actions">
            <button
              type="button"
              className="form-confirm-btn secondary"
              onClick={cancelRemoveAccess}
            >
              Cancel
            </button>
            <button
              type="button"
              className="form-confirm-btn primary share-access-confirm-remove"
              autoFocus
              onClick={confirmRemoveAccess}
            >
              Remove access
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  const drawer = open && useDrawer && typeof document !== "undefined"
    ? createPortal(
      <div
        className="bench-drawer-scrim share-access-drawer-scrim"
        onClick={() => {
          if (removeConfirm) {
            setRemoveConfirm(null);
            return;
          }
          closePanel();
        }}
        role="presentation"
      >
        <aside
          className="bench-drawer share-access-drawer"
          onClick={event => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <header className="bench-drawer-head initiative-drawer-head">
            <div className="initiative-drawer-head-copy">
              <div className="initiative-drawer-eyebrow">Access</div>
              <h2 className="bench-drawer-title">{drawerHeaderTitle}</h2>
              <p className="bench-drawer-sub">{drawerHeaderSub}</p>
            </div>
            <button
              type="button"
              className="bench-drawer-x"
              aria-label="Close"
              onClick={closePanel}
            >
              ✕
            </button>
          </header>
          <div className="bench-drawer-body initiative-drawer-body share-access-drawer-body">
            {shareAccessPanelBody}
          </div>
          {panelFooter}
        </aside>
      </div>,
      document.body,
    )
    : null;

  const menu = open && !useDrawer && menuPos && typeof document !== "undefined"
    ? createPortal(
      <div
        ref={menuRef}
        className={`share-access-popover${hasAccess ? " has-shared" : ""}`}
        role="dialog"
        aria-label={label}
        style={{
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          maxHeight: menuPos.maxHeight,
        }}
      >
        <header className="share-access-popover-head">
          <div>
            <strong>{hasAccess ? "Manage access" : label}</strong>
            <p>
              {hasAccess
                ? `${selectedCount} ${selectedCount === 1 ? "person has" : "people have"} access${remainingToShare > 0 ? " · add more below" : ""}.`
                : "Choose connected investors to share access."}
            </p>
          </div>
          <button
            type="button"
            className="share-access-popover-close"
            aria-label="Close"
            onClick={closePanel}
          >
            ✕
          </button>
        </header>

        <div className="share-access-popover-body">
          {shareAccessPopoverBody}
        </div>

        {panelFooter}
      </div>,
      document.body,
    )
    : null;

  const openShare = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (useDrawer) {
      setDrawerInitialShareSession(!hasAccess);
      setOpen(true);
      return;
    }
    setOpen(previous => !previous);
  };

  return (
    <div
      ref={rootRef}
      className={`share-access${
        variant === "cell" ? " is-cell" : variant === "cta" ? " is-cta" : " is-field"
      }${hasAccess ? " has-shared" : ""}${open ? " is-open" : ""}`}
    >
      {variant === "field" ? (
        <div className={`share-access-field${hasAccess ? " has-shared" : ""}`}>
          <div className="share-access-field-copy">
            <span className="share-access-field-label">{label}</span>
            <p>
              {hasAccess
                ? `Shared with ${summary}. Add more anytime.`
                : "Private to your founding team until you share."}
            </p>
          </div>
          {hasAccess ? (
            <div className="share-access-field-shared">
              <ShareAvatarStack people={selectedPeople} />
              <div className="share-access-field-shared-meta">
                <strong>{summary}</strong>
                <em>{selectedCount} with access</em>
              </div>
              <button
                ref={triggerRef}
                type="button"
                className="share-access-trigger is-secondary"
                aria-haspopup="dialog"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => openShare()}
              >
                {remainingToShare > 0 ? "Add people" : "Manage"}
              </button>
            </div>
          ) : (
            <button
              ref={triggerRef}
              type="button"
              className="share-access-trigger"
              aria-haspopup="dialog"
              aria-expanded={open}
              disabled={disabled}
              onClick={() => openShare()}
            >
              Share access with…
            </button>
          )}
        </div>
      ) : variant === "cta" ? (
        <button
          ref={triggerRef}
          type="button"
          className={`initiatives-primary-btn share-access-cta${hasAccess ? " has-access" : ""}${open ? " is-open" : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={openShare}
        >
          {hasAccess ? (
            <>
              <ShareAvatarStack people={selectedPeople} max={2} />
              <span>Shared · {selectedCount}</span>
            </>
          ) : (
            "Share access"
          )}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className={`share-access-cell-trigger share-access-cell-trigger--compact${hasAccess ? " has-access" : ""}${open ? " is-open" : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={
            hasAccess
              ? `${selectedCount} ${selectedCount === 1 ? "person has" : "people have"} access. Manage sharing.`
              : "Share access with investors"
          }
          disabled={disabled}
          onClick={openShare}
          title={hasAccess ? `Shared with ${summary}` : "Share access with investors"}
        >
          <span className="share-access-cell-icon" aria-hidden="true">
            <FuelIcon name="advisors" size={15} strokeWidth={1.75} />
          </span>
          <span className="share-access-cell-count">{selectedCount}</span>
        </button>
      )}
      {drawer}
      {removeAccessConfirmDialog}
      {menu}
    </div>
  );
}
