"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import type { Theme } from "@/lib/theme";
import { Avatar, Chip } from "../atoms";
import { useTheme } from "../ThemeContext";

export type TeamAccessOption = {
  id: string;
  name: string;
  memberCount?: number;
  members?: string[];
};

export function CompactActionButton({
  children,
  tone = "secondary",
  disabled = false,
  type = "button",
  onClick,
  ariaLabel,
  title,
  iconOnly = false,
}: {
  children: ReactNode;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  ariaLabel?: string;
  /** Native tooltip (hover). Prefer with icon-only actions. */
  title?: string;
  iconOnly?: boolean;
}) {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [focused, setFocused] = useState(false);
  const primary = tone === "primary";

  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        alignItems: "center",
        background: primary
          ? hovered
            ? t.inkSoft
            : t.ink
          : hovered
            ? t.panelAlt
            : "transparent",
        border: `1px solid ${primary ? t.ink : t.rule}`,
        borderRadius: 6,
        color: primary ? t.bg : t.inkSoft,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex",
        flexShrink: 0,
        fontFamily: t.sans,
        fontSize: 12,
        fontWeight: primary ? 600 : 500,
        gap: 4,
        height: 30,
        justifyContent: "center",
        minWidth: iconOnly ? 30 : undefined,
        opacity: disabled ? 0.55 : 1,
        outline: focused ? `2px solid ${t.accent}66` : "none",
        outlineOffset: 2,
        padding: iconOnly ? 0 : "0 10px",
        transform: active && !disabled ? "translateY(1px)" : "none",
        transition: "background 120ms ease, transform 80ms ease, opacity 120ms ease",
        whiteSpace: "nowrap",
        width: iconOnly ? 30 : undefined,
      }}
    >
      {children}
    </button>
  );
}

/** Text/select field with surface bg + accent focus ring (inline edit rows). */
export function SurfaceField({
  as = "input",
  style,
  onFocus,
  onBlur,
  ...rest
}: (
  | (InputHTMLAttributes<HTMLInputElement> & { as?: "input" })
  | (SelectHTMLAttributes<HTMLSelectElement> & { as: "select" })
) & {
  style?: CSSProperties;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const { borderColor: styleBorderColor, ...restStyle } = style ?? {};
  const shared: CSSProperties = {
    background: t.panel,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: styleBorderColor ?? (focused ? t.accent : t.rule),
    borderRadius: 6,
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 13,
    outline: focused ? `2px solid ${t.accent}44` : "none",
    outlineOffset: 1,
    padding: "8px 10px",
    ...restStyle,
  };

  if (as === "select") {
    const selectProps = rest as SelectHTMLAttributes<HTMLSelectElement>;
    return (
      <select
        {...selectProps}
        onFocus={(e) => {
          setFocused(true);
          selectProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          selectProps.onBlur?.(e);
        }}
        style={shared}
      />
    );
  }

  const inputProps = rest as InputHTMLAttributes<HTMLInputElement>;
  return (
    <input
      {...inputProps}
      onFocus={(e) => {
        setFocused(true);
        inputProps.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        inputProps.onBlur?.(e);
      }}
      style={shared}
    />
  );
}

function initialsForEmail(email: string): string {
  const [local] = email.split("@");
  if (!local) return "??";
  const parts = local.split(/[._+-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export { initialsForEmail };

export function MemberAvatarStack({
  t,
  emails,
  max = 4,
  size = 22,
}: {
  t: Theme;
  emails: string[];
  max?: number;
  size?: number;
}) {
  const shown = emails.slice(0, max);
  const extra = emails.length - shown.length;
  if (emails.length === 0) {
    return <span style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>No members</span>;
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center" }} title={emails.join(", ")}>
      {shown.map((email, i) => (
        <div
          key={email}
          style={{
            marginLeft: i === 0 ? 0 : -7,
            zIndex: shown.length - i,
            outline: `2px solid ${t.panel}`,
            borderRadius: "50%",
          }}
        >
          <Avatar t={t} person={{ name: email, avatar: initialsForEmail(email) }} size={size} />
        </div>
      ))}
      {extra > 0 ? (
        <span
          style={{
            marginLeft: 4,
            fontFamily: t.mono,
            fontSize: 10,
            color: t.muted,
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 999,
            padding: "1px 6px",
          }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Fixed-position listbox portaled to document.body so table overflow cannot clip it.
 * Same pattern as DocumentUploadDropdown / CreditIndicator.
 */
function PortaledListbox({
  open,
  anchorRef,
  label,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  label: string;
  children: ReactNode;
}) {
  const t = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 200;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < menuHeight + gap && rect.top > spaceBelow;
    const top = openAbove
      ? Math.max(gap, rect.top - menuHeight - gap)
      : rect.bottom + gap;
    const width = Math.max(rect.width, 220);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPos({ top, left, width });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    const raf = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      role="listbox"
      aria-label={label}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? 0,
        width: pos?.width ?? 220,
        maxHeight: 220,
        overflowY: "auto",
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        boxShadow: `0 16px 40px ${t.overlay}`,
        zIndex: 80,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * Multi-select for team-scoped watchlists. Emits hidden `teamIds` inputs when
 * `name` is set (create forms); otherwise controlled via `value`/`onChange`.
 *
 * `variant="inline"` — chips + search in a compact field (create/edit rows).
 */
export function TeamAccessPicker({
  teams,
  value,
  onChange,
  name = "teamIds",
  disabled = false,
  compact = false,
  variant = "default",
}: {
  teams: TeamAccessOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Form field name for each selected team (create flows). Pass empty to skip hidden inputs. */
  name?: string;
  disabled?: boolean;
  /** Tighter layout for detail-page drawers. */
  compact?: boolean;
  variant?: "default" | "inline";
}) {
  const t = useTheme();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) => {
      if (team.name.toLowerCase().includes(q)) return true;
      return (team.members ?? []).some((email) => email.toLowerCase().includes(q));
    });
  }, [teams, query]);

  const selectedTeams = teams.filter((team) => value.includes(team.id));
  const selectedMemberCount = new Set(selectedTeams.flatMap((team) => team.members ?? [])).size;

  function toggle(teamId: string) {
    if (disabled) return;
    if (value.includes(teamId)) onChange(value.filter((id) => id !== teamId));
    else onChange([...value, teamId]);
  }

  if (teams.length === 0) {
    return null;
  }

  if (variant === "inline") {
    return (
      <div style={{ position: "relative", minWidth: 220, maxWidth: 360, flex: 1 }}>
        {name
          ? value.map((id) => <input key={id} type="hidden" name={name} value={id} />)
          : null}
        <div
          ref={anchorRef}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
            padding: "6px 8px",
            background: t.panel,
            border: `1px solid ${open ? t.accent : t.rule}`,
            borderRadius: 6,
            minHeight: 36,
            outline: open ? `2px solid ${t.accent}44` : "none",
            outlineOffset: 1,
          }}
        >
          {selectedTeams.map((team) => (
            <span
              key={team.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 6px 2px 8px",
                borderRadius: 999,
                background: `${t.accent}1F`,
                border: `1px solid ${t.accent}4D`,
                color: t.accent,
                fontFamily: t.sans,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {team.name}
              {!disabled ? (
                <button
                  type="button"
                  aria-label={`Remove ${team.name}`}
                  onClick={() => toggle(team.id)}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: "0 2px",
                  }}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150);
            }}
            disabled={disabled}
            placeholder={value.length === 0 ? "Select teams…" : "Add team…"}
            aria-label="Search teams"
            style={{
              flex: 1,
              minWidth: 100,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: t.sans,
              fontSize: 12,
              color: t.ink,
              padding: "2px 4px",
            }}
          />
        </div>
        <PortaledListbox open={open && !disabled} anchorRef={anchorRef} label="Teams">
          {filtered.length === 0 ? (
            <div style={{ padding: 10, fontFamily: t.sans, fontSize: 12, color: t.muted }}>
              No teams match.
            </div>
          ) : (
            filtered.map((team) => {
              const selected = value.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    toggle(team.id);
                    setQuery("");
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                    padding: "8px 10px",
                    border: 0,
                    background: selected ? `${t.accent}14` : "transparent",
                    cursor: "pointer",
                    fontFamily: t.sans,
                    fontSize: 12,
                    color: t.ink,
                  }}
                >
                  <span style={{ flex: 1, fontWeight: selected ? 600 : 500 }}>{team.name}</span>
                  {selected ? <Chip t={t} tone="accent">Selected</Chip> : null}
                </button>
              );
            })
          )}
        </PortaledListbox>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {name
        ? value.map((id) => <input key={id} type="hidden" name={name} value={id} />)
        : null}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search teams or members…"
          aria-label="Search teams"
          style={{
            flex: 1,
            minWidth: 180,
            padding: "7px 10px",
            background: t.panelAlt,
            color: t.ink,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
          }}
        />
        {value.length > 0 ? (
          <Chip t={t} tone="accent">
            {value.length} team{value.length === 1 ? "" : "s"}
            {selectedMemberCount > 0 ? ` · ~${selectedMemberCount} people` : ""}
          </Chip>
        ) : (
          <Chip t={t} tone="ghost">Select at least one team</Chip>
        )}
      </div>
      <div
        role="group"
        aria-label="Teams with access"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: compact ? 180 : 220,
          overflowY: "auto",
          padding: 4,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          background: t.panelAlt,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 12, fontFamily: t.sans, fontSize: 12, color: t.muted }}>
            No teams match “{query}”.
          </div>
        ) : (
          filtered.map((team) => {
            const selected = value.includes(team.id);
            const members = team.members ?? [];
            const count = team.memberCount ?? members.length;
            return (
              <button
                key={team.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => toggle(team.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${selected ? t.accent : t.rule}`,
                  background: selected ? `${t.accent}14` : t.panel,
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled ? 0.65 : 1,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `1.5px solid ${selected ? t.accent : t.rule}`,
                    background: selected ? t.accent : "transparent",
                    color: selected ? t.bg : "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {selected ? "✓" : ""}
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: t.panelAlt,
                    border: `1px solid ${t.rule}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: t.mono,
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.inkSoft,
                    flexShrink: 0,
                  }}
                >
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: t.ink,
                    }}
                  >
                    {team.name}
                  </div>
                  <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
                    {count === 0
                      ? "No members yet — link still works once people are tagged"
                      : `${count} member${count === 1 ? "" : "s"} will get access`}
                  </div>
                </div>
                <MemberAvatarStack t={t} emails={members} />
              </button>
            );
          })
        )}
      </div>
      {!compact ? (
        <p style={{ margin: 0, fontFamily: t.sans, fontSize: 12, color: t.muted, lineHeight: 1.45 }}>
          Team-scoped lists are visible to members of the selected teams (plus the owner and anyone
          you share with individually).
        </p>
      ) : null}
    </div>
  );
}

/**
 * Chip multi-select for workspace members. No existing people multi-select in
 * product UI outside onboarding — colocated here for Teams create + inline edit.
 */
export function MemberChipPicker({
  members,
  value,
  onChange,
  name,
  disabled = false,
  placeholder = "Add members…",
}: {
  members: Array<{ email: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  /** When set, emits one hidden input per selected email (create forms). */
  name?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const t = useTheme();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => {
    const set = new Set(value.map((e) => e.toLowerCase()));
    return members.filter((m) => set.has(m.email.toLowerCase()));
  }, [members, value]);

  const available = useMemo(() => {
    const selectedSet = new Set(value.map((e) => e.toLowerCase()));
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => !selectedSet.has(m.email.toLowerCase()))
      .filter((m) => !q || m.email.toLowerCase().includes(q));
  }, [members, value, query]);

  function add(email: string) {
    if (disabled) return;
    if (value.some((e) => e.toLowerCase() === email.toLowerCase())) return;
    onChange([...value, email]);
    setQuery("");
  }

  function remove(email: string) {
    if (disabled) return;
    onChange(value.filter((e) => e.toLowerCase() !== email.toLowerCase()));
  }

  return (
    <div style={{ position: "relative", minWidth: 200, width: "100%" }}>
      {name
        ? value.map((email) => <input key={email} type="hidden" name={name} value={email} />)
        : null}
      <div
        ref={anchorRef}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          padding: "6px 8px",
          background: disabled ? "transparent" : t.panel,
          border: `1px solid ${disabled ? "transparent" : open ? t.accent : t.rule}`,
          borderRadius: 6,
          minHeight: 36,
          outline: !disabled && open ? `2px solid ${t.accent}44` : "none",
          outlineOffset: 1,
        }}
      >
        {selected.map((m) => (
          <span
            key={m.email}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 6px 2px 8px",
              borderRadius: 999,
              background: `${t.accent}1F`,
              border: `1px solid ${t.accent}4D`,
              color: t.accent,
              fontFamily: t.sans,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Avatar t={t} person={{ name: m.email, avatar: initialsForEmail(m.email) }} size={16} />
            {m.email}
            {!disabled ? (
              <button
                type="button"
                aria-label={`Remove ${m.email}`}
                onClick={() => remove(m.email)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        {!disabled ? (
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150);
            }}
            placeholder={value.length === 0 ? placeholder : "Add…"}
            aria-label="Search members"
            style={{
              flex: 1,
              minWidth: 100,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: t.sans,
              fontSize: 12,
              color: t.ink,
              padding: "2px 4px",
            }}
          />
        ) : value.length === 0 ? (
          <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>No members</span>
        ) : null}
      </div>
      <PortaledListbox
        open={open && !disabled && available.length > 0}
        anchorRef={anchorRef}
        label="Members"
      >
        {available.map((m) => (
          <button
            key={m.email}
            type="button"
            role="option"
            aria-selected={false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => add(m.email)}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              gap: 8,
              textAlign: "left",
              padding: "8px 10px",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontFamily: t.sans,
              fontSize: 12,
              color: t.ink,
            }}
          >
            <Avatar t={t} person={{ name: m.email, avatar: initialsForEmail(m.email) }} size={22} />
            {m.email}
          </button>
        ))}
      </PortaledListbox>
    </div>
  );
}
