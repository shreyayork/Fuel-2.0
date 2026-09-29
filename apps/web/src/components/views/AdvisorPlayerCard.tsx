import type { Advisor } from "@/db/schema";

// Self-contained dark palette — no dependence on AppShell's ThemeContext,
// since this page renders outside the authenticated layout.
const palette = {
  bg: "#0B1220",
  panel: "#111A2B",
  panelAlt: "#16213A",
  rule: "#1F2D4A",
  ruleSoft: "#19253F",
  ink: "#F5F7FB",
  inkSoft: "#C7D0E0",
  muted: "#7D8AA3",
  accent: "#00B48A",
  gold: "#ECD67F",
  navy: "#284256",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};

export function AdvisorPlayerCard({
  advisor,
  elevated,
}: {
  advisor: Advisor;
  elevated: boolean;
}) {
  const signInHref = `/sign-in?redirect=${encodeURIComponent(`/advisor/${advisor.id}/card`)}`;
  const initials = advisor.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        color: palette.ink,
        fontFamily: palette.sans,
        padding: "48px 24px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "min(720px, 100%)" }}>
        <div style={{ fontFamily: palette.mono, fontSize: 11, color: palette.muted, letterSpacing: "0.14em", marginBottom: 20 }}>
          FUEL · ADVISOR CARD
        </div>

        <div
          style={{
            background: palette.panel,
            border: `1px solid ${palette.rule}`,
            borderLeft: `4px solid ${palette.accent}`,
            padding: 32,
            borderRadius: 4,
          }}
        >
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {advisor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={advisor.photoUrl}
                alt={advisor.name}
                referrerPolicy="no-referrer"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  objectFit: "cover",
                  border: `2px solid ${palette.accent}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  background: palette.panelAlt,
                  border: `2px solid ${palette.accent}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 700,
                  color: palette.gold,
                }}
              >
                {initials || "·"}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {advisor.name}
              </h1>
              <div style={{ marginTop: 4, fontSize: 14, color: palette.inkSoft }}>
                {advisor.title ?? ""}
                {advisor.company ? ` · ${advisor.company}` : ""}
              </div>
              {advisor.location ? (
                <div style={{ marginTop: 2, fontSize: 12, color: palette.muted }}>
                  {advisor.location}
                </div>
              ) : null}
            </div>
          </div>

          {advisor.expertise && advisor.expertise.length ? (
            <Section title="Expertise">
              <Chips items={advisor.expertise} />
            </Section>
          ) : null}

          {advisor.focusIndustries && advisor.focusIndustries.length ? (
            <Section title="Focus industries">
              <Chips items={advisor.focusIndustries} />
            </Section>
          ) : null}

          {advisor.bio ? (
            <Section title="About">
              <div style={{ fontSize: 14, lineHeight: 1.6, color: palette.inkSoft, whiteSpace: "pre-wrap" }}>
                {advisor.bio}
              </div>
            </Section>
          ) : null}

          {elevated ? (
            <ElevatedFields advisor={advisor} />
          ) : (
            <Section title="Contact">
              <div style={{ fontSize: 13, color: palette.muted, lineHeight: 1.6 }}>
                Full contact details and private notes are visible to York IE team members.
                <div style={{ marginTop: 12 }}>
                  <a
                    href={signInHref}
                    style={{
                      display: "inline-block",
                      padding: "10px 16px",
                      background: palette.accent,
                      color: palette.bg,
                      borderRadius: 6,
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Log in to see more
                  </a>
                </div>
              </div>
            </Section>
          )}

          {advisor.linkedinUrl ? (
            <Section title="LinkedIn">
              <a
                href={advisor.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: palette.accent, textDecoration: "none", fontSize: 13, fontFamily: palette.mono }}
              >
                {advisor.linkedinUrl}
              </a>
            </Section>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 18,
            fontFamily: palette.mono,
            fontSize: 10,
            color: palette.muted,
            letterSpacing: "0.14em",
            textAlign: "center",
          }}
        >
          POWERED BY FUEL · YORK IE
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${palette.ruleSoft}` }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: palette.muted,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            padding: "4px 10px",
            background: palette.panelAlt,
            border: `1px solid ${palette.rule}`,
            borderRadius: 999,
            fontSize: 12,
            color: palette.inkSoft,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ElevatedFields({ advisor }: { advisor: Advisor }) {
  return (
    <Section title="Contact (account-visible)">
      <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
        {advisor.email ? <Row k="Email" v={advisor.email} mono /> : null}
        {advisor.phone ? <Row k="Phone" v={advisor.phone} /> : null}
        {advisor.privateNotes ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: palette.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
              Private notes
            </div>
            <div style={{ color: palette.inkSoft, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {advisor.privateNotes}
            </div>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
      <div style={{ color: palette.muted, fontSize: 12 }}>{k}</div>
      <div style={{ color: palette.inkSoft, fontFamily: mono ? palette.mono : palette.sans }}>{v}</div>
    </div>
  );
}
