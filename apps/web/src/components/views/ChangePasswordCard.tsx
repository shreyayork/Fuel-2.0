"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/(app)/account/profile/actions";
import {
  CHANGE_PASSWORD_COPY,
  fieldErrorsForReason,
  type ChangePasswordFieldErrors,
} from "@/lib/auth/change-password";
import {
  checkPasswordRequirements,
  isPasswordStrong,
  PASSWORD_REQUIREMENTS,
  passwordsMatch,
  passwordStrength,
} from "@/lib/auth/password-policy";
import { useTheme } from "../ThemeContext";
import { useToast } from "../toast/ToastProvider";

export function ChangePasswordCard() {
  const t = useTheme();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({});

  const reqs = checkPasswordRequirements(newPassword);
  const strength = passwordStrength(newPassword);

  const inputStyle = (invalid: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "10px 12px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${invalid ? t.negative : t.rule}`,
    borderRadius: 8,
    fontFamily: t.sans,
    fontSize: 16,
    minHeight: 44,
    boxSizing: "border-box",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 500,
    color: t.muted,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;

    const local: ChangePasswordFieldErrors = {};
    if (!currentPassword.trim()) local.current = CHANGE_PASSWORD_COPY.currentRequired;
    if (!newPassword) local.new = CHANGE_PASSWORD_COPY.newRequired;
    else if (!isPasswordStrong(newPassword)) {
      local.new = CHANGE_PASSWORD_COPY.weak;
    }
    if (!confirmPassword) local.confirm = CHANGE_PASSWORD_COPY.confirmRequired;
    else if (!passwordsMatch(newPassword, confirmPassword)) {
      local.confirm = CHANGE_PASSWORD_COPY.mismatch;
    }
    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!res.ok) {
        const fields = fieldErrorsForReason(res.reason);
        if (fields) {
          setFieldErrors(fields);
          return;
        }
        showToast({
          message:
            res.reason === "session_expired"
              ? CHANGE_PASSWORD_COPY.sessionExpired
              : res.reason === "unavailable"
                ? CHANGE_PASSWORD_COPY.unavailable
                : res.reason === "rate_limited"
                  ? CHANGE_PASSWORD_COPY.rateLimited
                  : res.reason === "limit_exceeded"
                    ? CHANGE_PASSWORD_COPY.limitExceeded
                    : CHANGE_PASSWORD_COPY.unknown,
          variant: "error",
        });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      showToast({
        message: "Password updated successfully.",
        variant: "success",
      });
    });
  };

  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 15,
          fontWeight: 600,
          color: t.ink,
          marginBottom: 8,
        }}
      >
        Change your password
      </div>
      <p
        style={{
          margin: "0 0 14px",
          fontFamily: t.sans,
          fontSize: 13,
          color: t.muted,
          lineHeight: 1.5,
        }}
      >
        When you change your password, we keep you logged in to this device but
        may log you out from your other devices.
      </p>

      <form onSubmit={handleSubmit} autoComplete="off" noValidate>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="current-password" style={labelStyle}>
            Current password*
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.current)}
            aria-describedby={fieldErrors.current ? "current-password-error" : undefined}
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (fieldErrors.current) {
                setFieldErrors((prev) => ({ ...prev, current: undefined }));
              }
            }}
            style={inputStyle(Boolean(fieldErrors.current))}
          />
          <FieldError id="current-password-error" message={fieldErrors.current} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="new-password" style={labelStyle}>
            New password*
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.new)}
            aria-describedby={fieldErrors.new ? "new-password-error" : undefined}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (fieldErrors.new) {
                setFieldErrors((prev) => ({ ...prev, new: undefined }));
              }
            }}
            style={inputStyle(Boolean(fieldErrors.new))}
          />
          <StrengthInline
            level={strength.level}
            label={strength.label}
            accent={t.accent}
            muted={t.muted}
            rule={t.ruleSoft}
          />
          <FieldError id="new-password-error" message={fieldErrors.new} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="confirm-password" style={labelStyle}>
            Confirm new password*
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.confirm)}
            aria-describedby={fieldErrors.confirm ? "confirm-password-error" : undefined}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirm) {
                setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
              }
            }}
            style={inputStyle(Boolean(fieldErrors.confirm))}
          />
          <FieldError id="confirm-password-error" message={fieldErrors.confirm} />
        </div>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {PASSWORD_REQUIREMENTS.map((req) => {
            const met = reqs[req.id];
            return (
              <li
                key={req.id}
                style={{
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: met ? t.accent : t.muted,
                }}
              >
                {met ? "✓" : "○"} {req.label}
              </li>
            );
          })}
        </ul>

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "8px 14px",
            background: t.ink,
            color: t.bg,
            border: `1px solid ${t.ink}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: 500,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <div
      id={id}
      role="alert"
      style={{
        marginTop: 6,
        fontFamily: t.sans,
        fontSize: 12,
        lineHeight: 1.45,
        color: t.negative,
      }}
    >
      {message}
    </div>
  );
}

function StrengthInline({
  level,
  label,
  accent,
  muted,
  rule,
}: {
  level: number;
  label: string;
  accent: string;
  muted: string;
  rule: string;
}) {
  if (!label) return null;
  return (
    <div style={{ marginTop: 8 }} aria-live="polite">
      <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: level >= n ? accent : rule,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: level >= 3 ? accent : muted }}>{label}</div>
    </div>
  );
}
