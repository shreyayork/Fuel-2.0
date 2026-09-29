import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import Script from "next/script";
import { NavProgress } from "@/components/NavProgress";
import "./globals.css";

const GTM_ID = "GTM-TNHNZ2B";

/** GTM only on the prod Lambda (`STAGE=prod`). Local / dev / stage stay off. */
async function ProductionGtm() {
  await connection();
  if (process.env.STAGE !== "prod") return null;
  return (
    <>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
      <Script
        id="gtm"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />
    </>
  );
}

export const metadata: Metadata = {
  title: "Fuel 2.0 — York IE",
  description: "York IE Fuel 2.0 operator + investor platform",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  appleWebApp: { title: "York IE Fuel" },
};

export const viewport: Viewport = {
  themeColor: "#284256",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Launchpad Feedback — install snippet (verbatim from Launchpad console). */}
        <Script
          id="launchpad-feedback"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.launchpadFeedbackConfig = {
  project: 'ebd34ad7-48e7-474a-a25c-9baaa05b66fc',
  source: 'snippet'
};

!function(e,r){if(e.__LaunchpadFeedback)return;e.__LaunchpadFeedback=1;var s=r.createElement("script");s.async=1;s.src="https://launchpad.yorkdevs.link/launchpad-feedback-shim.js";var i=r.getElementsByTagName("script")[0];i&&i.parentNode?i.parentNode.insertBefore(s,i):(r.head||r.documentElement).appendChild(s)}(window,document);`,
          }}
        />
      </head>
      <body>
        <ProductionGtm />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
