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

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #142535 0%, #0F1A24 45%, #0B141C 100%)",
        color: "#F4F6F8",
        fontFamily: "Inter, -apple-system, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid rgba(38,57,71,0.55)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(15,26,36,0.6)",
          backdropFilter: "saturate(140%) blur(8px)",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <BrandMark size={24} />
        </Link>
        <Link
          href="/"
          style={{ color: "#8A99A6", fontSize: 13, textDecoration: "none" }}
        >
          ← Back to home
        </Link>
      </header>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 480px)",
          gap: 0,
        }}
      >
        {/* Left rail: value prop. Collapses on narrow viewports via media-CSS
            since inline styles can't do breakpoints — see <style> below. */}
        <aside className="auth-left-rail" style={leftRailStyle}>
          <ValueProp />
        </aside>

        {/* Right rail: the actual form, mounted as a client component so it
            can manage tab toggles + multi-step verification flow. */}
        <section
          style={{
            padding: "56px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(11,20,28,0.5)",
            borderLeft: "1px solid rgba(38,57,71,0.55)",
          }}
        >
          <div style={{ width: "100%", maxWidth: AUTH_FORM_MAX_WIDTH }}>
            <AuthSurface
              googleUrl={googleUrl}
              initialMode={initialMode}
              nextPath={safeNext}
              initialEmail={initialEmail}
              error={error ?? null}
            />
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .auth-left-rail { display: none !important; }
          main > div { grid-template-columns: 1fr !important; }
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
