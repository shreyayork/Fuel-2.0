import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getArtifact, getArtifactKind } from "@/lib/artifacts";
import { FuelMark } from "@/components/FuelMark";
import { PrintButton } from "./PrintButton";
import { ThemeToggle } from "./ThemeToggle";

export const dynamic = "force-dynamic";

/**
 * react-markdown hook that rewrites in-app relative URLs (/company/…,
 * /portfolio/…, /artifacts/…) into absolute ones pointed at APP_URL.
 *
 * On-screen clicks work either way, but when the page is saved as a PDF the
 * link annotations carry whatever the `href` attribute said. Relative hrefs
 * open fine inside a browser PDF viewer but break in most standalone viewers
 * (Preview, Acrobat reader) because there's no base to resolve against. By
 * baking APP_URL in at render time we get clickable PDF links everywhere
 * without having to teach the agent to emit absolute URLs.
 *
 * External URLs (http://…, https://…, mailto:, tel:) are returned unchanged.
 * Fragment-only links (#section) stay local to the page.
 */
function absolutizeUrl(url: string): string {
  if (!url) return url;
  if (/^(https?:|mailto:|tel:|#)/i.test(url)) return url;
  if (!url.startsWith("/")) return url;
  const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}${url}` : url;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const requireAuth = process.env.COGNITO_USER_POOL_ID != null;
  const email = requireAuth ? (await getSession())?.email : "mike@york.ie";
  if (!email) return { title: "Fuel · Artifact" };
  const account = await getActiveAccountForUser(email);
  if (!account) return { title: "Fuel · Artifact" };
  const artifact = await getArtifact({ accountId: account.id, id });
  return { title: artifact ? `${artifact.title} · Fuel` : "Fuel · Artifact" };
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requireAuth = process.env.COGNITO_USER_POOL_ID != null;
  const session = requireAuth ? await getSession() : null;
  if (requireAuth && !session) redirect("/sign-in");
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) notFound();
  const artifact = await getArtifact({ accountId: account.id, id });
  if (!artifact) notFound();

  const kindInfo = getArtifactKind(artifact.kind);
  const createdAt = new Date(artifact.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subjects = artifact.subjects ?? [];
  const companySubject = subjects.find((s) => s.type === "company") as
    | { type: "company"; uuid?: string; name?: string }
    | undefined;

  return (
    <>
      <style>{`
        /* --- Theme variables -------------------------------------------------
         * Default (light / "editorial") values live on :root. The dark
         * ("signal") palette overrides them via [data-theme="signal"] on
         * <html>, which the ThemeToggle client component flips on mount
         * based on the user's stored preference. */
        :root {
          --artifact-bg: #f6f5f1;
          --artifact-paper: #ffffff;
          --artifact-ink: #0f0f0f;
          --artifact-ink-soft: #1a1a1a;
          --artifact-muted: #4a4a4a;
          --artifact-mutedSoft: #6a6a6a;
          --artifact-rule: #e5e3dc;
          --artifact-rule-strong: #284256;
          --artifact-accent: #00B48A;
          --artifact-brand: #284256;
          --artifact-code-bg: #f6f5f1;
          --artifact-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        [data-theme="signal"] {
          --artifact-bg: #0d1117;
          --artifact-paper: #151b23;
          --artifact-ink: #e9ecef;
          --artifact-ink-soft: #d1d5db;
          --artifact-muted: #9ca3af;
          --artifact-mutedSoft: #6b7280;
          --artifact-rule: #2a313c;
          --artifact-rule-strong: #00B48A;
          --artifact-accent: #00B48A;
          --artifact-brand: #9db4c0;
          --artifact-code-bg: #1e242e;
          --artifact-shadow: 0 2px 18px rgba(0,0,0,0.5);
        }
        @page { margin: 0.75in; }
        /* Preserve the on-screen theme when printing / saving as PDF. Without
         * print-color-adjust: exact, Chrome strips background colors and
         * inverts text for "toner-friendly" output — which is exactly what
         * swallowed dark mode previously. We set it universally here and
         * also on the body + artifact surface so nested elements inherit. */
        html, body, .artifact-page, .artifact-body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          .no-print { display: none !important; }
          .artifact-page { box-shadow: none !important; border: none !important; }
        }
        body { background: var(--artifact-bg); color: var(--artifact-ink); }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "var(--artifact-bg)",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "var(--artifact-ink)",
        }}
      >
        {/* Top action bar — hidden on print */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 24px",
            borderBottom: "1px solid var(--artifact-rule)",
            background: "var(--artifact-paper)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href={companySubject?.uuid ? `/company/${companySubject.uuid}` : "/"}
              style={{
                fontSize: 13,
                color: "var(--artifact-muted)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              ← Back
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <ThemeToggle />
            <PrintButton />
          </div>
        </div>

        {/* Printable document */}
        <div
          className="artifact-page"
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "48px 64px 64px",
            background: "var(--artifact-paper)",
            boxShadow: "var(--artifact-shadow)",
            border: "1px solid var(--artifact-rule)",
            borderTop: "none",
          }}
        >
          {/* York IE letterhead */}
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingBottom: 20,
              borderBottom: "2px solid var(--artifact-rule-strong)",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FuelMark size={32} />
              <div>
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--artifact-brand)",
                    fontWeight: 500,
                  }}
                >
                  York IE · Fuel
                </div>
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    color: "var(--artifact-mutedSoft)",
                    marginTop: 2,
                  }}
                >
                  {kindInfo.label}
                </div>
              </div>
            </div>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                color: "var(--artifact-mutedSoft)",
                textAlign: "right",
              }}
            >
              <div>{createdAt}</div>
              <div style={{ marginTop: 2 }}>{artifact.authorEmail}</div>
            </div>
          </header>

          {/* Title */}
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: "-0.015em",
              margin: "0 0 8px",
              color: "var(--artifact-ink)",
            }}
          >
            {artifact.title}
          </h1>
          {companySubject?.name ? (
            <div style={{ fontSize: 14, color: "var(--artifact-muted)", marginBottom: 28 }}>
              Subject:{" "}
              {companySubject.uuid ? (
                <Link
                  href={`/company/${companySubject.uuid}`}
                  style={{ color: "var(--artifact-accent)", textDecoration: "none" }}
                >
                  {companySubject.name}
                </Link>
              ) : (
                companySubject.name
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 28 }} />
          )}

          {/* Body */}
          <article
            className="artifact-body"
            style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--artifact-ink)" }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={absolutizeUrl}
            >
              {artifact.content}
            </ReactMarkdown>
          </article>

          <footer
            style={{
              marginTop: 48,
              paddingTop: 16,
              borderTop: "1px solid var(--artifact-rule)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              color: "var(--artifact-mutedSoft)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Generated by Fuel · York IE</span>
            <span>{artifact.id.slice(0, 8)}</span>
          </footer>
        </div>

        <style>{`
          .artifact-body h1, .artifact-body h2, .artifact-body h3 {
            font-weight: 700;
            letter-spacing: -0.01em;
            line-height: 1.3;
            margin: 1.6em 0 0.5em;
            color: var(--artifact-ink);
          }
          .artifact-body h1 { font-size: 22px; }
          .artifact-body h2 { font-size: 18px; }
          .artifact-body h3 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--artifact-brand); }
          .artifact-body p { margin: 0 0 1em; }
          .artifact-body ul, .artifact-body ol { margin: 0 0 1em; padding-left: 24px; }
          .artifact-body li { margin-bottom: 0.3em; }
          .artifact-body a { color: var(--artifact-accent); text-decoration: none; }
          .artifact-body a:hover { text-decoration: underline; }
          .artifact-body table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 13px; }
          .artifact-body th, .artifact-body td {
            border: 1px solid var(--artifact-rule);
            padding: 6px 10px;
            text-align: left;
            vertical-align: top;
          }
          .artifact-body th { background: var(--artifact-code-bg); font-weight: 600; }
          .artifact-body code {
            font-family: JetBrains Mono, monospace;
            font-size: 0.9em;
            background: var(--artifact-code-bg);
            padding: 1px 5px;
            border-radius: 3px;
          }
          .artifact-body pre {
            background: var(--artifact-code-bg);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 12px;
          }
          .artifact-body blockquote {
            border-left: 3px solid var(--artifact-rule-strong);
            padding-left: 14px;
            margin: 1em 0;
            color: var(--artifact-muted);
          }
          .artifact-body hr { border: none; border-top: 1px solid var(--artifact-rule); margin: 1.5em 0; }
        `}</style>
      </div>
    </>
  );
}
