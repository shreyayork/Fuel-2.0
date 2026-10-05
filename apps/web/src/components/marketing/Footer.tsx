import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { marketingTheme as t } from "./styles";

export function MarketingFooter() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${t.borderSubtle}`,
        padding: "28px var(--gutter)",
        paddingBottom: "calc(28px + var(--safe-bottom))",
        background: `linear-gradient(180deg, transparent 0%, ${t.panelInner} 100%)`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          fontSize: 13,
          color: t.muted,
          fontFamily: t.sans,
          rowGap: 14,
        }}
      >
        <BrandMark
          size={22}
          color={t.accent}
          ink={t.ink}
          muted={t.mutedSoft}
          fontFamily={t.sans}
        />
        <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
          <Link
            href={`/sign-in?next=${encodeURIComponent("/onboard")}`}
            style={{ color: t.inkSoft, textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            href={`/sign-in?mode=signup&next=${encodeURIComponent("/onboard?cta=benchmark")}`}
            style={{ color: t.inkSoft, textDecoration: "none" }}
          >
            Pricing
          </Link>
          <a
            href="https://york.ie/privacy"
            target="_blank"
            rel="noreferrer"
            style={{ color: t.inkSoft, textDecoration: "none" }}
          >
            Privacy
          </a>
          <a
            href="https://york.ie/terms"
            target="_blank"
            rel="noreferrer"
            style={{ color: t.inkSoft, textDecoration: "none" }}
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
