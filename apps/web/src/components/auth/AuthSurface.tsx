"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  confirmAndSignInAction,
  resendCodeAction,
  signInAction,
  signUpAction,
} from "@/app/(auth)/sign-in/actions";
import { authCardStyle } from "./styles";

/**
 * Single-card auth surface. Three states cycle inside it:
 *   1. "signin"  — email + password (returning users)
 *   2. "signup"  — name + email + password (new users)
 *   3. "verify"  — 6-digit confirmation code (post-signup hold)
 *
 * Google is always present at the top as the fast path. The work-email
 * blocklist lives server-side; we surface a *soft* inline hint when the
 * user types a generic provider so they can self-correct without the
 * full /onboard interstitial firing later.
 */
type Mode = "signin" | "signup" | "verify";

const ERROR_COPY: Record<string, string> = {
  invalid_input: "Please double-check the fields above.",
  invalid_email: "That email address doesn't look right.",
  username_exists: "An account already exists for that email. Try signing in instead.",
  invalid_password:
    "Password needs 12+ characters with upper, lower, number, and symbol.",
  rate_limited: "Too many attempts — wait a minute and try again.",
  user_not_confirmed:
    "We sent you a verification code when you signed up — let's finish that step.",
  invalid_credentials: "Email or password didn't match.",
  user_not_found: "We don't have an account for that email yet.",
  code_mismatch: "That code doesn't match. Check the email we sent.",
  code_expired: "That code expired. We sent you a fresh one.",
  unknown: "Something went wrong on our end. Try again in a moment.",
};

const GENERIC_PROVIDERS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "gmx.com",
  "gmx.de",
  "fastmail.com",
  "hey.com",
  "duck.com",
];

function isGenericEmailClient(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  return GENERIC_PROVIDERS.some((p) => domain === p || domain.endsWith(`.${p}`));
}

export function AuthSurface({
  googleUrl,
  initialMode,
  nextPath,
  initialEmail = null,
  error,
  designPreview = false,
}: {
  googleUrl: string | null;
  initialMode: "signin" | "signup";
  nextPath: string | null;
  initialEmail?: string | null;
  error: string | null;
  /** Skip Cognito + field validation — design/local preview folder. */
  designPreview?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pending, startTransition] = useTransition();
  const inviteFlow = Boolean(nextPath?.startsWith("/invite/"));
  /**
   * Design preview: always enter onboarding after auth — Product vs Investment
   * path first. Prefer explore CTA so claim still lands on Overview when done.
   */
  const designNext =
    nextPath?.startsWith("/onboard") || nextPath?.startsWith("/invite/")
      ? nextPath
      : "/onboard?cta=explore";

  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [errorKey, setErrorKey] = useState<string | null>(
    error && ERROR_COPY[error] ? error : null,
  );
  const [errorRaw, setErrorRaw] = useState<string | null>(
    error && !ERROR_COPY[error] ? error : null,
  );
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const genericProviderHint =
    !designPreview && email.includes("@") && isGenericEmailClient(email);

  // Reset error/info when switching modes so stale copy doesn't bleed
  useEffect(() => {
    setErrorKey(null);
    setErrorRaw(null);
    setInfo(null);
  }, [mode]);

  const continueDesignPreview = () => {
    router.push(designNext);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (designPreview) {
      continueDesignPreview();
      return;
    }
    setErrorKey(null);
    setErrorRaw(null);
    startTransition(async () => {
      const res = await signUpAction({ email, password, givenName, familyName });
      if (!res.ok) {
        setErrorKey(res.reason);
        // Capture the server-side detail for any reason that benefits from
        // specifics (invalid_input → which field, invalid_password → policy
        // detail, unknown → underlying provider message).
        if (res.message) setErrorRaw(res.message);
        return;
      }
      setCodeSentTo(res.codeDeliveryDestination ?? email);
      setMode("verify");
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (designPreview) {
      continueDesignPreview();
      return;
    }
    setErrorKey(null);
    setErrorRaw(null);
    startTransition(async () => {
      const res = await confirmAndSignInAction(
        { email, code, password },
        nextPath ?? undefined,
      );
      if (!res.ok) {
        setErrorKey(res.reason);
        if (res.message) setErrorRaw(res.message);
        return;
      }
      router.refresh();
      router.replace(res.redirect);
    });
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (designPreview) {
      continueDesignPreview();
      return;
    }
    setErrorKey(null);
    setErrorRaw(null);
    startTransition(async () => {
      const res = await signInAction({ email, password }, nextPath ?? undefined);
      if (!res.ok) {
        setErrorKey(res.reason);
        if (res.reason === "user_not_confirmed") {
          await resendCodeAction(email);
          setCodeSentTo(email);
          setMode("verify");
          return;
        }
        if (res.message) setErrorRaw(res.message);
        return;
      }
      router.refresh();
      router.replace(res.redirect);
    });
  };

  const handleResend = () => {
    setErrorKey(null);
    setErrorRaw(null);
    setInfo(null);
    startTransition(async () => {
      const res = await resendCodeAction(email);
      setInfo(res.ok ? "We sent a fresh code to your inbox." : "Couldn't send a new code — try again in a minute.");
    });
  };

  return (
    <div style={authCardStyle}>
      <HeadingForMode
        mode={mode}
        codeSentTo={codeSentTo}
        email={email}
        inviteFlow={inviteFlow}
      />

      {mode !== "verify" ? (
        <>
          <GoogleButton
            url={googleUrl}
            mode={mode}
            designPreview={designPreview}
            designHref={designNext}
          />
          <OrDivider />
        </>
      ) : null}

      {mode === "signin" ? (
        <form onSubmit={handleSignIn} autoComplete="on" noValidate>
          <Field
            id="signin-email"
            label="Email"
            type={designPreview ? "text" : "email"}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="you@yourcompany.com"
            required={!designPreview}
          />
          <Field
            id="signin-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required={!designPreview}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: -6,
              marginBottom: 8,
            }}
          >
            <Link
              href={
                email.trim()
                  ? `/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`
                  : "/forgot-password"
              }
              style={{
                fontSize: 12.5,
                color: "#00B48A",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Forgot password?
            </Link>
          </div>
          {!designPreview ? (
            <ErrorRow errorKey={errorKey} errorRaw={errorRaw} />
          ) : null}
          <PrimaryButton
            pending={pending}
            disabled={designPreview ? false : !email || !password}
            onClick={designPreview ? continueDesignPreview : undefined}
          >
            {pending ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </form>
      ) : null}

      {mode === "signup" ? (
        <form onSubmit={handleSignUp} autoComplete="on" noValidate>
          <div className="auth-name-row">
            <Field
              id="signup-given"
              label="First name"
              type="text"
              value={givenName}
              onChange={setGivenName}
              autoComplete="given-name"
              required={!designPreview}
            />
            <Field
              id="signup-family"
              label="Last name"
              type="text"
              value={familyName}
              onChange={setFamilyName}
              autoComplete="family-name"
              required={!designPreview}
            />
          </div>
          <Field
            id="signup-email"
            label="Work email"
            type={designPreview ? "text" : "email"}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="you@yourcompany.com"
            required={!designPreview}
            hint={
              genericProviderHint
                ? "Personal email is fine to try Fuel, but verified company-domain emails are what count toward our global benchmark dataset."
                : undefined
            }
          />
          <Field
            id="signup-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required={!designPreview}
            hint={
              designPreview
                ? undefined
                : "12+ characters with uppercase, lowercase, number, and symbol."
            }
          />
          {!designPreview ? (
            <ErrorRow errorKey={errorKey} errorRaw={errorRaw} />
          ) : null}
          <PrimaryButton
            pending={pending}
            disabled={false}
            onClick={designPreview ? continueDesignPreview : undefined}
          >
            {pending ? "Creating account…" : "Create account"}
          </PrimaryButton>
        </form>
      ) : null}

      {mode === "verify" ? (
        <form onSubmit={handleVerify} autoComplete="off" noValidate>
          <Field
            id="verify-code"
            label="6-digit code"
            type="text"
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
            required={!designPreview}
            mono
          />
          {!designPreview ? (
            <ErrorRow errorKey={errorKey} errorRaw={errorRaw} />
          ) : null}
          {info ? <InfoRow text={info} /> : null}
          <PrimaryButton
            pending={pending}
            disabled={designPreview ? false : code.length < 6}
            onClick={designPreview ? continueDesignPreview : undefined}
          >
            {pending ? "Verifying…" : "Verify & continue"}
          </PrimaryButton>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12.5,
              color: "#8A99A6",
            }}
          >
            <button
              type="button"
              onClick={handleResend}
              disabled={pending}
              style={textButton}
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              disabled={pending}
              style={textButton}
            >
              ← Use a different email
            </button>
          </div>
        </form>
      ) : null}

      {mode !== "verify" ? (
        <ModeToggleFooter mode={mode} onChange={setMode} />
      ) : null}
    </div>
  );
}

/* -------------------------------- Bits -------------------------------- */

function HeadingForMode({
  mode,
  codeSentTo,
  email,
  inviteFlow,
}: {
  mode: Mode;
  codeSentTo: string | null;
  email: string;
  inviteFlow: boolean;
}) {
  if (mode === "verify") {
    return (
      <>
        <Eyebrow>One last step</Eyebrow>
        <Heading>Check your inbox.</Heading>
        <SubCopy>
          We sent a 6-digit code to{" "}
          <strong style={{ color: "#F4F6F8" }}>{codeSentTo ?? email}</strong>.
          Enter it below and we&apos;ll sign you in
          {inviteFlow ? " so you can accept your invite" : ""}.
        </SubCopy>
      </>
    );
  }
  if (mode === "signup") {
    if (inviteFlow) {
      return (
        <>
          <Eyebrow>Team invite</Eyebrow>
          <Heading>Finish creating your account.</Heading>
          <SubCopy>
            Use the invited email below (or continue with Google) to join the
            account, then you&apos;ll return to accept the invite.
          </SubCopy>
        </>
      );
    }
    return (
      <>
        <Eyebrow>Create your workspace</Eyebrow>
        <Heading>Profile your company in 60 seconds.</Heading>
        <SubCopy>
          Use your work email so your KPI submissions count toward the global
          benchmark dataset.
        </SubCopy>
      </>
    );
  }
  if (inviteFlow) {
    return (
      <>
        <Eyebrow>Team invite</Eyebrow>
        <Heading>Sign in to accept your invite.</Heading>
        <SubCopy>
          Use the invited email so we can add you to the right account.
        </SubCopy>
      </>
    );
  }
  return (
    <>
      <Eyebrow>Welcome back</Eyebrow>
      <Heading>Sign in to Fuel.</Heading>
      <SubCopy>Pick up where you left off — playbooks, benchmarks, artifacts.</SubCopy>
    </>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
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

function GoogleButton({
  url,
  mode,
  designPreview = false,
  designHref = "/onboard",
}: {
  url: string | null;
  mode: Mode;
  designPreview?: boolean;
  designHref?: string;
}) {
  const href = url ?? (designPreview ? designHref : null);
  if (!href) {
    return null;
  }
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        width: "100%",
        padding: "12px 16px",
        minHeight: 44,
        background: "#FFFFFF",
        color: "#1F1F1F",
        border: "1px solid #DADCE0",
        borderRadius: 10,
        fontWeight: 500,
        textDecoration: "none",
        fontSize: 15,
        boxSizing: "border-box",
      }}
    >
      <GoogleGlyph />
      {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
    </a>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C33.8 6 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C33.8 6 29.1 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5 0 9.6-1.9 13.1-5l-6-5c-1.9 1.3-4.3 2-7.1 2-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 39.7 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6 5c-.4.4 6.9-5 6.9-14.7 0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function OrDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px 0",
        color: "#596876",
        fontSize: 12,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      <span style={{ flex: 1, height: 1, background: "rgba(38,57,71,0.7)" }} />
      <span>Or</span>
      <span style={{ flex: 1, height: 1, background: "rgba(38,57,71,0.7)" }} />
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
  inputMode,
  required,
  hint,
  mono,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "tel" | "url";
  required?: boolean;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: "#8A99A6",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        style={{
          width: "100%",
          padding: "12px 13px",
          minHeight: 44,
          background: "#0B141C",
          border: "1px solid #263947",
          borderRadius: 8,
          color: "#F4F6F8",
          fontFamily: mono
            ? "JetBrains Mono, ui-monospace, monospace"
            : "inherit",
          fontSize: mono ? 18 : 16,
          letterSpacing: mono ? 6 : 0,
          textAlign: mono ? "center" : "left",
          boxSizing: "border-box",
          outline: "none",
          transition: "border-color 160ms ease, box-shadow 160ms ease",
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
      {hint ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#8A99A6",
            lineHeight: 1.45,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function PrimaryButton({
  pending,
  disabled,
  children,
  onClick,
}: {
  pending: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  /** Design preview: navigate without form validation / Cognito. */
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      disabled={disabled || pending}
      onClick={onClick}
      style={{
        marginTop: 10,
        width: "100%",
        padding: "13px 18px",
        minHeight: 44,
        borderRadius: 10,
        background:
          disabled || pending
            ? "rgba(0,180,138,0.45)"
            : "linear-gradient(135deg, #00B48A 0%, #00A07B 100%)",
        color: "#0F1A24",
        fontWeight: 600,
        fontSize: 15,
        border: "1px solid #00B48A",
        boxShadow:
          disabled || pending
            ? "none"
            : "0 6px 20px rgba(0,180,138,0.30), 0 1px 0 rgba(255,255,255,0.10) inset",
        cursor: disabled || pending ? "not-allowed" : "pointer",
        transition: "box-shadow 200ms ease, background 200ms ease",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxSizing: "border-box",
      }}
    >
      {pending ? (
        <span
          aria-hidden
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            border: "2px solid rgba(15,26,36,0.5)",
            borderTopColor: "transparent",
            display: "inline-block",
            animation: "fuel-spin 0.8s linear infinite",
          }}
        >
          <style>{`@keyframes fuel-spin { to { transform: rotate(360deg); } }`}</style>
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

function ErrorRow({
  errorKey,
  errorRaw,
}: {
  errorKey: string | null;
  errorRaw: string | null;
}) {
  if (!errorKey && !errorRaw) return null;
  // For invalid_input we prefer the server-side detail (Zod field+message)
  // since it's specific to what the user typed; the canned copy is vague.
  // For everything else we surface the typed copy and use raw text only as
  // a fallback when there's no mapping.
  let msg: string | null;
  if (errorKey === "invalid_input" && errorRaw) {
    msg = errorRaw;
  } else if (errorKey) {
    msg = ERROR_COPY[errorKey] ?? errorRaw ?? ERROR_COPY.unknown;
  } else {
    msg = errorRaw;
  }
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
      {msg}
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div
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

function ModeToggleFooter({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      style={{
        marginTop: 22,
        textAlign: "center",
        fontSize: 13,
        color: "#8A99A6",
      }}
    >
      {mode === "signin" ? (
        <>
          New to Fuel?{" "}
          <button
            type="button"
            onClick={() => onChange("signup")}
            style={textButtonInline}
          >
            Create an account
          </button>
        </>
      ) : (
        <>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => onChange("signin")}
            style={textButtonInline}
          >
            Sign in
          </button>
        </>
      )}
    </div>
  );
}

const textButton: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#A6E6D2",
  cursor: "pointer",
  padding: 0,
  fontSize: 12.5,
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
