import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Document parsers use Node APIs / CJS — keep them external so webpack
  // does not try (and fail) to bundle them into the server graph.
  serverExternalPackages: ["mammoth", "xlsx", "jszip", "unpdf", "pdfkit"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "dev.v2.fuel.york.ie",
        "stage.v2.fuel.york.ie",
        "v2.fuel.york.ie",
        "localhost:3000",
      ],
    },
    // Keep invoice PDF fonts/assets with the Lambda/server bundle.
    outputFileTracingIncludes: {
      "/api/credits/invoices/[invoiceId]/pdf": [
        "./src/lib/credits/invoice-pdf/fonts/**/*",
        "./src/lib/credits/invoice-pdf/assets/**/*",
      ],
      "/api/credits/webhooks/stripe": [
        "./src/lib/credits/invoice-pdf/fonts/**/*",
        "./src/lib/credits/invoice-pdf/assets/**/*",
      ],
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  tunnelRoute: "/monitoring",
  webpack: {
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: true,
    autoInstrumentAppDirectory: true,
    automaticVercelMonitors: false,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
