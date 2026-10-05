import Link from "next/link";
import { BrandMark } from "@/components/marketing/BrandMark";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { AUTH_FORM_MAX_WIDTH } from "@/components/auth/styles";

function buildAuthorizeUrl(nextPath: string | null): string | null {
  const hostedUi = process.env.COGNITO_HOSTED_UI;
  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
  const appUrl = process.env.APP_URL;
  if (!hostedUi || !clientId || !appUrl) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: `${appUrl}/api/auth/callback`,
    identity_provider: "Google",
  });
  if (nextPath) params.set("state", nextPath);
  return `${hostedUi}/oauth2/authorize?${params.toString()}`;
}

function sanitizeEmailParam(raw: string | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  // Basic shape check only — Cognito / signup actions enforce real validity.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return null;
  }
  return email;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    next?: string;
    mode?: string;
    email?: string;
  }>;
}) {
  const { error, next, mode, email } = await searchParams;
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const googleUrl = buildAuthorizeUrl(safeNext);
  const initialMode = mode === "signup" ? "signup" : "signin";
  const initialEmail = sanitizeEmailParam(email);
  // Local design preview: always skip Cognito + field validation so Sign in /
  // Sign up advance to the next screen with empty or partial fields.
  const designPreview = true;

  return (
    <main
      className="auth-page"
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(ellipse at top, #142535 0%, #0F1A24 45%, #0B141C 100%)",
        color: "#F4F6F8",
        fontFamily: "Inter, -apple-system, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      <header
        className="auth-header"
        style={{
          padding: "12px var(--gutter)",
          borderBottom: "1px solid rgba(38,57,71,0.55)",
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 16,
          background: "rgba(15,26,36,0.6)",
          backdropFilter: "saturate(140%) blur(8px)",
          flexShrink: 0,
          minHeight: "var(--header-h)",
          boxSizing: "border-box",
        }}
      >
        {/* Back lives leading-edge (left) — not trailing; brand follows. */}
        <Link
          href="/"
          style={{
            color: "#8A99A6",
            fontSize: 13,
            textDecoration: "none",
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          ← Back to home
        </Link>
        <span
          aria-hidden
          style={{
            width: 1,
            height: 20,
            background: "rgba(38,57,71,0.85)",
            flexShrink: 0,
          }}
        />
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
          }}
        >
          <BrandMark size={24} />
        </Link>
      </header>

      <div
        className="auth-body"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 480px)",
          gap: 0,
          minHeight: 0,
        }}
      >
        {/* Left rail: value prop. Adaptive via media-CSS below. */}
        <aside className="auth-left-rail" style={leftRailStyle}>
          <ValueProp />
        </aside>

        {/* Right rail: the actual form */}
        <section
          className="auth-form-rail"
          style={{
            padding: "clamp(28px, 6vw, 56px) clamp(16px, 4vw, 48px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(11,20,28,0.5)",
            borderLeft: "1px solid rgba(38,57,71,0.55)",
            minWidth: 0,
            overflowY: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: AUTH_FORM_MAX_WIDTH }}>
            <AuthSurface
              googleUrl={googleUrl}
              initialMode={initialMode}
              nextPath={safeNext}
              initialEmail={initialEmail}
              error={designPreview ? null : (error ?? null)}
              designPreview={designPreview}
            />
          </div>
        </section>
      </div>

      <style>{`
        /* Phone portrait — form only, full width */
        @media (max-width: 880px) and (orientation: portrait) {
          .auth-left-rail { display: none !important; }
          .auth-body { grid-template-columns: 1fr !important; }
          .auth-form-rail { border-left: none !important; }
        }
        /* Phone / small landscape — compact two-pane when width allows */
        @media (max-width: 880px) and (orientation: landscape) {
          .auth-left-rail { display: none !important; }
          .auth-body { grid-template-columns: 1fr !important; }
          .auth-form-rail {
            border-left: none !important;
            padding-top: 20px !important;
            padding-bottom: 20px !important;
          }
        }
        /* Tablet landscape — keep dual pane, tighter padding */
        @media (min-width: 881px) and (max-width: 1100px) and (orientation: landscape) {
          .auth-body { grid-template-columns: minmax(0, 1fr) minmax(0, 420px) !important; }
          .auth-left-rail { padding: 32px 28px !important; }
          .auth-form-rail { padding: 28px 24px !important; }
        }
        /* Short landscape — compact chrome; form stays reachable */
        @media (orientation: landscape) and (max-height: 500px) {
          .auth-header { padding-block: 8px !important; min-height: 48px !important; }
          .auth-left-rail h1 { font-size: var(--fs-h2) !important; }
          .auth-left-rail p { font-size: 14px !important; margin: 12px 0 16px !important; }
          .auth-form-rail {
            padding-top: 16px !important;
            padding-bottom: 16px !important;
            align-items: flex-start !important;
          }
        }
        .auth-name-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 420px) {
          .auth-name-row { grid-template-columns: 1fr !important; }
        }
        @media (pointer: coarse) {
          .auth-form-rail input,
          .auth-form-rail button,
          .auth-form-rail a {
            min-height: 48px;
          }
        }
      `}</style>
    </main>
  );
}

const leftRailStyle: React.CSSProperties = {
  padding: "56px 56px",
  display: "flex",
  alignItems: "center",
  position: "relative",
  overflow: "hidden",
};

function ValueProp() {
  return (
    <div style={{ position: "relative", zIndex: 1, maxWidth: 460 }}>
      {/* Subtle aurora behind the copy. Pinned to this rail so the form
          side stays clean and high-contrast. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-10%",
          left: "-10%",
          width: "70%",
          height: "70%",
          background:
            "radial-gradient(closest-side, rgba(0,180,138,0.18), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#00B48A",
          marginBottom: 18,
        }}
      >
        FUEL · BY YORK IE
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: 38,
          fontWeight: 600,
          letterSpacing: -0.6,
          lineHeight: 1.12,
          color: "#F4F6F8",
        }}
      >
        Your AI chief of staff,{" "}
        <span
          style={{
            background:
              "linear-gradient(120deg, #00B48A 0%, #6FD3B7 50%, #ECD67F 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          waiting on you.
        </span>
      </h1>
      <p
        style={{
          margin: "20px 0 28px",
          fontSize: 15,
          lineHeight: 1.6,
          color: "#CBD3DB",
        }}
      >
        Sign in with your work email and the agent will auto-profile your
        company, slot you into a peer cohort, and queue your first benchmark in
        under a minute.
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <Bullet>Real-time signals on your business + competitors</Bullet>
        <Bullet>Peer-cohort benchmarks (p25 / p50 / p75 / p90)</Bullet>
        <Bullet>Playbooks the agent runs on your behalf</Bullet>
      </ul>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        color: "#CBD3DB",
        fontSize: 14,
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "rgba(0,180,138,0.15)",
          color: "#00B48A",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          marginTop: 1,
        }}
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
