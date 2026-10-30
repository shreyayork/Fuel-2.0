import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatShareWithSummary,
  listShareableInvestorsForCompany,
  toggleShareInvestorId,
  type ShareInvestorOption,
} from "./shareWithInvestors.ts";
import "./shareWithInvestors.css";
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

const MODAL_SUGGESTION_COUNT = 5;
const MODAL_CHIP_COLLAPSE = 8;
const MODAL_BULK_SHARE_THRESHOLD = 8;

function initialFromName(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

function ShareAvatarStack({
  people,
  max = 3,
}: {
  people: Array<{ id: string; label: string }>;
  max?: number;
}) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  return (
    <span className="share-access-avatar-stack" aria-hidden="true">
      {visible.map(person => (
        <span key={person.id} className="share-access-avatar-stack-item" title={person.label}>
          {initialFromName(person.label)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="share-access-avatar-stack-item is-more">+{overflow}</span>
      ) : null}
    </span>
  );
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
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [activePickerIndex, setActivePickerIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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
    return [...available, ...shared];
  }, [options, investorIds]);

  const matchesShareQuery = (option: ShareInvestorOption, q: string) => (
    option.name.toLowerCase().includes(q)
    || option.subtitle.toLowerCase().includes(q)
    || option.id.toLowerCase().includes(q)
    || (option.email?.toLowerCase().includes(q) ?? false)
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedOptions;
    return orderedOptions.filter(option => matchesShareQuery(option, q));
  }, [orderedOptions, query]);

  const availableOptions = useMemo(
    () => options.filter(option => !investorIds.includes(option.id)),
    [options, investorIds],
  );

  const modalPickerOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return availableOptions.filter(option => matchesShareQuery(option, q));
    return availableOptions.slice(0, MODAL_SUGGESTION_COUNT);
  }, [availableOptions, query]);

  const hiddenChipCount = chipsExpanded
    ? 0
    : Math.max(0, selectedPeople.length - MODAL_CHIP_COLLAPSE);

  const visibleChips = chipsExpanded
    ? selectedPeople
    : selectedPeople.slice(0, MODAL_CHIP_COLLAPSE);

  const showBulkShareAction = options.length >= MODAL_BULK_SHARE_THRESHOLD && remainingToShare > 0;

  useEffect(() => {
    setActivePickerIndex(modalPickerOptions.length > 0 ? 0 : -1);
  }, [query, modalPickerOptions.length, open]);

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
    const timer = window.setTimeout(() => searchRef.current?.focus(), useDrawer ? 60 : 20);
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
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
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
  }, [open, useDrawer]);

  const closePanel = () => {
    setOpen(false);
    setQuery("");
    setChipsExpanded(false);
    setActivePickerIndex(-1);
  };

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

  const addInvestor = (investorId: string) => {
    if (investorIds.includes(investorId)) return;
    onChange([...investorIds, investorId]);
    setQuery("");
  };

  const onModalSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (modalPickerOptions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActivePickerIndex(index => Math.min(index + 1, modalPickerOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActivePickerIndex(index => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = modalPickerOptions[activePickerIndex] ?? modalPickerOptions[0];
      if (pick) addInvestor(pick.id);
    }
  };

  const shareAccessPanelBody = (
    <div className="share-access-drawer-stack">
      <section className="initiative-card-section share-access-drawer-section">
        <div className="initiative-card-section-head">
          <span className="initiative-card-section-label">
            {hasAccess ? "Add people" : "Select people"}
          </span>
          {showBulkShareAction && !query.trim() ? (
            <button
              type="button"
              className="initiative-edit-btn"
              onClick={shareWithAllConnected}
            >
              Share with all ({options.length})
            </button>
          ) : null}
        </div>

        <label className="share-access-search--drawer">
          <span className="share-access-search-icon" aria-hidden="true">
            <FuelIcon name="search" size={15} strokeWidth={1.75} />
          </span>
          <span className="sr-only">Search investors</span>
          <input
            ref={searchRef}
            className="share-access-search-input"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={onModalSearchKeyDown}
            placeholder="Search by name, email, or firm…"
            autoComplete="off"
            role="combobox"
            aria-expanded={modalPickerOptions.length > 0}
            aria-controls={listId}
            aria-activedescendant={
              activePickerIndex >= 0 && modalPickerOptions[activePickerIndex]
                ? `${listId}-opt-${modalPickerOptions[activePickerIndex].id}`
                : undefined
            }
          />
        </label>

        {modalPickerOptions.length > 0 ? (
          <div className="share-access-drawer-list" role="listbox" id={listId}>
            {modalPickerOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                id={`${listId}-opt-${option.id}`}
                role="option"
                aria-selected={index === activePickerIndex}
                className={`share-access-drawer-row${
                  index === activePickerIndex ? " is-active" : ""
                }`}
                onMouseEnter={() => setActivePickerIndex(index)}
                onClick={() => addInvestor(option.id)}
              >
                <span className="share-access-drawer-avatar" aria-hidden="true">
                  {initialFromName(option.name)}
                </span>
                <span className="share-access-drawer-row-copy">
                  <strong>{option.name}</strong>
                  <em>{option.email || option.subtitle}</em>
                </span>
                <span className="share-access-drawer-row-action">Add</span>
              </button>
            ))}
          </div>
        ) : query.trim() ? (
          <p className="initiative-card-section-empty">
            No investors match “{query.trim()}”.
          </p>
        ) : !hasAccess ? (
          <p className="initiative-card-section-empty">
            No connected investors available.
          </p>
        ) : null}

        {hasAccess ? (
          <div className="share-access-drawer-shared">
            <div className="share-access-drawer-shared-head">
              <span className="share-access-drawer-shared-label">Shared with</span>
              <span className="share-access-drawer-count">{selectedCount}</span>
            </div>
            <div
              className={`share-access-chips share-access-chips--email${
                chipsExpanded ? " is-expanded" : ""
              }`}
            >
              {visibleChips.map(person => {
                const chipTitle = person.email || person.subtitle || person.label;
                return (
                  <div
                    key={person.id}
                    className="share-access-email-chip"
                    title={chipTitle}
                  >
                    <span className="share-access-email-chip-avatar" aria-hidden="true">
                      {initialFromName(person.label)}
                    </span>
                    <span className="share-access-email-chip-name">{person.label}</span>
                    <button
                      type="button"
                      className="share-access-email-chip-x"
                      aria-label={`Remove ${person.label}`}
                      title={`Remove ${person.label}`}
                      onClick={() => removeId(person.id)}
                    >
                      <FuelIcon name="close" size={12} strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
              {hiddenChipCount > 0 ? (
                <button
                  type="button"
                  className="share-access-drawer-more"
                  onClick={() => setChipsExpanded(true)}
                >
                  +{hiddenChipCount} more
                </button>
              ) : null}
              {chipsExpanded && selectedPeople.length > MODAL_CHIP_COLLAPSE ? (
                <button
                  type="button"
                  className="share-access-drawer-more"
                  onClick={() => setChipsExpanded(false)}
                >
                  Show less
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
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
                <span className="share-access-chip-avatar" aria-hidden="true">
                  {initialFromName(chip.label)}
                </span>
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
                <span className="share-access-avatar" aria-hidden="true">
                  {initialFromName(option.name)}
                </span>
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
              Done
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
            Done
          </button>
        </>
      )}
    </footer>
  );

  const drawer = open && useDrawer && typeof document !== "undefined"
    ? createPortal(
      <div
        className="bench-drawer-scrim share-access-drawer-scrim"
        onClick={closePanel}
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
              <h2 className="bench-drawer-title">
                {hasAccess ? "Manage access" : "Share access"}
              </h2>
              <p className="bench-drawer-sub">
                {hasAccess
                  ? "Search to add someone, or remove access from the list below."
                  : "Private until you share. Search connected investors to give access."}
              </p>
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
      {menu}
    </div>
  );
}
