"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  confirmForgotPasswordAction,
  forgotPasswordAction,
} from "@/app/(auth)/forgot-password/actions";
import { FORGOT_PASSWORD_COPY } from "@/lib/auth/forgot-password";
import {
  checkPasswordRequirements,
  PASSWORD_REQUIREMENTS,
  passwordsMatch,
  passwordStrength,
} from "@/lib/auth/password-policy";
import { authCardStyle } from "./styles";

type Step = "email" | "otp" | "reset" | "success";

const RESEND_SECONDS = 60;

const ERROR_COPY: Record<string, string> = {
  invalid_input: "Please double-check the fields above.",
  invalid_email: "That email address doesn't look right.",
  user_not_found: FORGOT_PASSWORD_COPY.userNotFound,
  unavailable: "Password reset isn't available in this environment.",
  rate_limited: "Too many attempts — wait a minute and try again.",
  code_mismatch: "That code doesn't match. Check the email we sent.",
  code_expired: "That code expired. Request a fresh one.",
  invalid_password:
    "Password needs 12+ characters with upper, lower, number, and symbol.",
  weak_password:
    "Password needs 12+ characters with upper, lower, number, and symbol.",
  mismatch: "Passwords don't match.",
  unknown: "Something went wrong on our end. Try again in a moment.",
};

export function ForgotPasswordSurface({
  initialEmail = null,
}: {
  initialEmail?: string | null;
}) {
  const [step, setStep] = useState<Step>("email");
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  const startResendTimer = () => setSecondsLeft(RESEND_SECONDS);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const clearFeedback = () => {
    setErrorKey(null);
    setInfo(null);
  };

  const sendCode = (targetEmail: string, asResend: boolean) => {
    if (submitting.current || pending) return;
    submitting.current = true;
    clearFeedback();
    startTransition(async () => {
      try {
        const res = await forgotPasswordAction({ email: targetEmail });
        if (!res.ok) {
          setErrorKey(res.reason);
          return;
        }
        setCodeSentTo(res.codeDeliveryDestination ?? targetEmail);
        startResendTimer();
        if (asResend) {
          setInfo("We sent a fresh code to your inbox.");
        } else {
          setStep("otp");
          setCode("");
        }
      } finally {
        submitting.current = false;
      }
    });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCode(email, false);
  };

  const handleOtpContinue = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (code.length < 6) {
      setErrorKey("invalid_input");
      return;
    }
    // Cognito validates the code on ConfirmForgotPassword — advance UI only.
    setStep("reset");
  };

  const handleResend = () => {
    if (secondsLeft > 0 || pending || submitting.current) return;
    sendCode(email, true);
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || pending) return;
    clearFeedback();
    if (!passwordsMatch(password, confirm)) {
      setErrorKey("mismatch");
      return;
    }
    submitting.current = true;
    startTransition(async () => {
      try {
        const res = await confirmForgotPasswordAction({
          email,
          code,
          password,
        });
        if (!res.ok) {
          setErrorKey(res.reason);
          if (res.reason === "code_mismatch" || res.reason === "code_expired") {
            setStep("otp");
          }
          return;
        }
        setStep("success");
      } finally {
        submitting.current = false;
      }
    });
  };

  const reqs = checkPasswordRequirements(password);
  const strength = passwordStrength(password);

  return (
    <div style={authCardStyle}>
      {step === "email" ? (
        <>
          <Eyebrow>Account recovery</Eyebrow>
          <Heading>Forgot your password?</Heading>
          <SubCopy>
            No worries. Enter the email address associated with your account and
            we&apos;ll send you a verification code.
          </SubCopy>
          <form onSubmit={handleEmailSubmit} autoComplete="on">
            <Field
              id="forgot-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
            <ErrorRow errorKey={errorKey} />
            <PrimaryButton pending={pending} disabled={!email}>
              {pending ? "Sending…" : "Send Verification Code"}
            </PrimaryButton>
          </form>
          <FooterNav>
            Remember your password?{" "}
            <Link href="/sign-in" style={inlineLink}>
              Sign in
            </Link>
          </FooterNav>
        </>
      ) : null}

      {step === "otp" ? (
        <>
          <Eyebrow>Verification</Eyebrow>
          <Heading>Verify your email</Heading>
          <SubCopy>
            We&apos;ve sent a 6-digit verification code to{" "}
            <strong style={{ color: "#F4F6F8" }}>{codeSentTo ?? email}</strong>.
          </SubCopy>
          <form onSubmit={handleOtpContinue} autoComplete="off">
            <OtpInputs value={code} onChange={setCode} disabled={pending} />
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#8A99A6",
                }}
                aria-live="polite"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {secondsLeft > 0
                  ? `${formatTimer(secondsLeft)} remaining`
                  : "You can resend a code now"}
              </div>
              <button
                type="button"
                onClick={handleResend}
                disabled={pending || secondsLeft > 0}
                style={{
                  ...textButton,
                  opacity: pending || secondsLeft > 0 ? 0.5 : 1,
                  cursor:
                    pending || secondsLeft > 0 ? "not-allowed" : "pointer",
                }}
              >
                Didn&apos;t receive the code?{" "}
                <span style={{ color: "#00B48A", fontWeight: 600 }}>
                  Resend OTP
                </span>
              </button>
            </div>
            <ErrorRow errorKey={errorKey} />
            {info ? <InfoRow text={info} /> : null}
            <PrimaryButton pending={pending} disabled={code.length < 6}>
              {pending ? "Working…" : "Verify Code"}
            </PrimaryButton>
          </form>
          <FooterNav>
            Wrong email?{" "}
            <button
              type="button"
              onClick={() => {
                clearFeedback();
                setStep("email");
                setCode("");
              }}
              style={textButtonInline}
            >
              Change it
            </button>
          </FooterNav>
        </>
      ) : null}

      {step === "reset" ? (
        <>
          <Eyebrow>New credentials</Eyebrow>
          <Heading>Create new password</Heading>
          <SubCopy>
            Your new password must be different from previously used passwords.
          </SubCopy>
          <form onSubmit={handleReset} autoComplete="off">
            <Field
              id="forgot-new-password"
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              trailing={
                <ToggleVisibility
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
            />
            <Field
              id="forgot-confirm-password"
              label="Confirm Password"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
              trailing={
                <ToggleVisibility
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                />
              }
            />
            <StrengthBars level={strength.level} label={strength.label} />
            <RequirementList state={reqs} />
            <ErrorRow errorKey={errorKey} />
            <PrimaryButton
              pending={pending}
              disabled={
                !password || !confirm || !passwordsMatch(password, confirm)
              }
            >
              {pending ? "Resetting…" : "Reset Password"}
            </PrimaryButton>
          </form>
        </>
      ) : null}

      {step === "success" ? (
        <>
          <Eyebrow>All set</Eyebrow>
          <Heading>Password reset successful!</Heading>
          <SubCopy>
            Your password has been updated successfully. You can now sign in
            with your new password.
          </SubCopy>
          <Link href="/sign-in" style={primaryLinkStyle}>
            Back to Sign In
          </Link>
          <FooterNav>
            If you didn&apos;t make this change, please{" "}
            <a href="mailto:support@york.ie" style={inlineLink}>
              contact support
            </a>{" "}
            immediately.
          </FooterNav>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------- Bits -------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: "#00B48A",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: -0.3,
        color: "#F4F6F8",
        lineHeight: 1.2,
      }}
    >
      {children}
    </h2>
  );
}

function SubCopy({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "8px 0 24px",
        fontSize: 14,
        lineHeight: 1.55,
        color: "#8A99A6",
      }}
    >
      {children}
    </p>
  );
}

function FooterNav({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 22,
        textAlign: "center",
        fontSize: 13,
        color: "#8A99A6",
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type,
  placeholder,
  autoComplete,
  required,
  trailing,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: "#8A99A6",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          style={{
            width: "100%",
            padding: trailing ? "11px 40px 11px 13px" : "11px 13px",
            background: "#0B141C",
            border: "1px solid #263947",
            borderRadius: 8,
            color: "#F4F6F8",
            fontFamily: "inherit",
            fontSize: 14,
            boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#00B48A";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,180,138,0.18)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#263947";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {trailing ? (
          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToggleVisibility({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? "Hide password" : "Show password"}
      style={{
        background: "transparent",
        border: "none",
        color: "#8A99A6",
        cursor: "pointer",
        padding: 4,
        fontSize: 12,
        fontFamily: "inherit",
      }}
    >
      {show ? "Hide" : "Show"}
    </button>
  );
}

function OtpInputs({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const setAt = (index: number, char: string) => {
    const next = digits.map((d, i) => (i === index ? char : d));
    onChange(next.join("").replace(/\D/g, "").slice(0, 6));
  };

  return (
    <div
      role="group"
      aria-label="6-digit verification code"
      style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (raw.length > 1) {
              // Paste into first box fills all.
              onChange(raw.slice(0, 6));
              const focusIdx = Math.min(raw.length, 5);
              refs.current[focusIdx]?.focus();
              return;
            }
            setAt(i, raw.slice(-1));
            if (raw && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          style={{
            width: 48,
            height: 54,
            textAlign: "center",
            fontSize: 20,
            fontWeight: 700,
            background: "#0B141C",
            border: `2px solid ${digit ? "#00B48A" : "#263947"}`,
            borderRadius: 8,
            color: "#F4F6F8",
            outline: "none",
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
          }}
        />
      ))}
    </div>
  );
}

function StrengthBars({
  level,
  label,
}: {
  level: number;
  label: string;
}) {
  const colors = ["#263947", "#E07A5F", "#ECD67F", "#00B48A"];
  return (
    <div style={{ marginBottom: 14 }} aria-live="polite">
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: level >= n ? colors[level] ?? "#00B48A" : "#263947",
            }}
          />
        ))}
      </div>
      {label ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: level >= 3 ? "#00B48A" : "#8A99A6",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

function RequirementList({
  state,
}: {
  state: ReturnType<typeof checkPasswordRequirements>;
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: "0 0 8px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = state[req.id];
        return (
          <li
            key={req.id}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: 13,
              color: met ? "#A6E6D2" : "#8A99A6",
            }}
          >
            <span aria-hidden style={{ color: met ? "#00B48A" : "#596876" }}>
              {met ? "✓" : "○"}
            </span>
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}

function PrimaryButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      style={{
        marginTop: 10,
        width: "100%",
        padding: "13px 18px",
        borderRadius: 10,
        background:
          disabled || pending
            ? "rgba(0,180,138,0.45)"
            : "linear-gradient(135deg, #00B48A 0%, #00A07B 100%)",
        color: "#0F1A24",
        fontWeight: 600,
        fontSize: 14.5,
        border: "1px solid #00B48A",
        boxShadow:
          disabled || pending
            ? "none"
            : "0 6px 20px rgba(0,180,138,0.30), 0 1px 0 rgba(255,255,255,0.10) inset",
        cursor: disabled || pending ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

function ErrorRow({ errorKey }: { errorKey: string | null }) {
  if (!errorKey) return null;
  return (
    <div
      role="alert"
      style={{
        marginTop: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(255,107,91,0.10)",
        border: "1px solid rgba(255,107,91,0.30)",
        color: "#FFB7AD",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {ERROR_COPY[errorKey] ?? ERROR_COPY.unknown}
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div
      role="status"
      style={{
        marginTop: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(0,180,138,0.10)",
        border: "1px solid rgba(0,180,138,0.30)",
        color: "#A6E6D2",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {text}
    </div>
  );
}

const textButton: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#8A99A6",
  cursor: "pointer",
  padding: 0,
  fontSize: 14,
  fontFamily: "inherit",
};

const textButtonInline: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#00B48A",
  cursor: "pointer",
  padding: 0,
  fontSize: "inherit",
  fontFamily: "inherit",
  fontWeight: 600,
};

const inlineLink: React.CSSProperties = {
  color: "#00B48A",
  fontWeight: 600,
  textDecoration: "none",
};

const primaryLinkStyle: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: "13px 18px",
  borderRadius: 10,
  background: "linear-gradient(135deg, #00B48A 0%, #00A07B 100%)",
  color: "#0F1A24",
  fontWeight: 600,
  fontSize: 14.5,
  border: "1px solid #00B48A",
  boxShadow:
    "0 6px 20px rgba(0,180,138,0.30), 0 1px 0 rgba(255,255,255,0.10) inset",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  boxSizing: "border-box",
};
