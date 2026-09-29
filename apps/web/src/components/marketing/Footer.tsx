import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function MarketingFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(31,49,64,0.95)",
        padding: "32px",
        background:
          "linear-gradient(180deg, rgba(15,26,36,0) 0%, rgba(11,20,28,0.6) 100%)",
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
          color: "#8A99A6",
        }}
      >
        <BrandMark size={22} />
        <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
          <Link
            href="/sign-in"
            style={{ color: "#CBD3DB", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <a
            href="https://york.ie"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#CBD3DB", textDecoration: "none" }}
          >
            York IE
          </a>
          <span style={{ color: "#596876" }}>
            © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
}
