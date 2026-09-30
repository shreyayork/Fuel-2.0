export type LegalDocId = "terms" | "privacy" | "payment";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  id: LegalDocId;
  title: string;
  shortTitle: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const LEGAL_LAST_UPDATED = "September 25, 2026";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "terms",
    title: "Terms of Service",
    shortTitle: "Terms",
    description: "Rules for using Fuel, your workspace, and AI-powered features.",
    lastUpdated: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "agreement",
        title: "Agreement",
        paragraphs: [
          "These Terms of Service (“Terms”) govern access to Fuel, York IE’s operating platform for founders and investment teams (“Fuel,” “we,” “us”). By creating an account, signing in, or using Fuel, you agree to these Terms and our Privacy Policy.",
          "If you use Fuel on behalf of a company or fund, you represent that you have authority to bind that organization. “You” means the individual user and the organization they act for.",
        ],
      },
      {
        id: "service",
        title: "The service",
        paragraphs: [
          "Fuel helps you organize company profile data, benchmarks, documents, and operating signals; view scorecards and intelligence; run initiatives and playbooks; and interact with an AI advisor trained to reason over your workspace context.",
          "Features, limits, and availability may change. We may add or remove functionality, run experiments, or offer different plans (including free trial, Pro subscription, and credit top-ups) as described at purchase and in your account.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts and access",
        paragraphs: [
          "You are responsible for your credentials and for activity under your account. Use a work email where possible and keep access limited to people who should see your company or portfolio data.",
          "We may suspend or terminate access for violation of these Terms, suspected abuse, non-payment, or risk to the platform or other users. You may stop using Fuel at any time; some provisions survive termination as described below.",
        ],
      },
      {
        id: "your-data",
        title: "Your content and permissions",
        paragraphs: [
          "You retain ownership of information you submit (profile fields, benchmarks, uploads, notes, and similar content). You grant York IE a license to host, process, display, and analyze that content solely to operate Fuel, improve product safety and reliability, and provide support—consistent with our Privacy Policy.",
          "You represent that you have the rights to upload and share content you provide, and that it does not violate law or third-party rights.",
        ],
      },
      {
        id: "ai",
        title: "AI outputs",
        paragraphs: [
          "Ask Fuel and related features use automated models to generate suggestions, summaries, and analysis based on your inputs and workspace context. Outputs may be incomplete or incorrect. They are not legal, financial, investment, or tax advice.",
          "You are responsible for reviewing AI output before relying on it for decisions. Do not use Fuel as a substitute for professional advisors where judgment or compliance requires human expertise.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        bullets: [
          "Do not probe, scrape, or reverse engineer Fuel except as allowed by law.",
          "Do not upload malware, attempt unauthorized access, or interfere with other users.",
          "Do not use Fuel to build competing datasets by systematically extracting peer benchmark data we provide.",
          "Do not misrepresent your identity, stage, or metrics in ways that undermine benchmark integrity for others.",
          "Comply with applicable export, sanctions, and privacy laws when using the product internationally.",
        ],
        paragraphs: [],
      },
      {
        id: "ip",
        title: "Our intellectual property",
        paragraphs: [
          "Fuel’s software, branding, cohort methodologies, and documentation are owned by York IE or its licensors. These Terms do not grant you ownership of the product—only the right to use it under your plan.",
        ],
      },
      {
        id: "disclaimers",
        title: "Disclaimers",
        paragraphs: [
          "Fuel is provided “as is” to the maximum extent permitted by law. We disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement. Benchmarks and peer comparisons are statistical summaries, not guarantees of performance or valuation.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, York IE will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, or data. Our aggregate liability for claims relating to Fuel in any twelve-month period is limited to the greater of (a) amounts you paid us for Fuel in that period or (b) one hundred U.S. dollars.",
        ],
      },
      {
        id: "changes",
        title: "Changes and contact",
        paragraphs: [
          "We may update these Terms. We will post the revised version with a new “Last updated” date. Material changes may also be emailed or shown in-product. Continued use after changes take effect constitutes acceptance.",
          "Questions: support@york.ie · York IE, Manchester, NH, United States.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    shortTitle: "Privacy",
    description: "How we collect, use, and protect information in Fuel.",
    lastUpdated: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "scope",
        title: "Scope",
        paragraphs: [
          "This Privacy Policy describes how York IE (“we”) handles personal and business information when you use Fuel. It applies to the web application, account settings, billing through our payment processor, and support channels.",
        ],
      },
      {
        id: "collect",
        title: "Information we collect",
        bullets: [
          "Account data: name, work email, organization, role, authentication identifiers.",
          "Workspace data: company profile, funding, tracks, benchmark submissions, documents, initiatives, and chat prompts you submit.",
          "Usage data: feature interactions, credit consumption, device/browser metadata, and diagnostic logs.",
          "Billing data: plan tier, invoices, and payment status (card details are handled by Stripe, not stored on our servers).",
        ],
        paragraphs: [
          "We may enrich profile fields from public sources you connect (for example, firmographic data) when you enable integrations.",
        ],
      },
      {
        id: "use",
        title: "How we use information",
        bullets: [
          "Provide and secure Fuel, including AI features scoped to your workspace.",
          "Calculate benchmarks, scores, and intelligence shown in your dashboard.",
          "Process subscriptions and credit top-ups.",
          "Send product, billing, and security notices.",
          "Improve reliability, debug issues, and develop new features using aggregated or de-identified analytics where possible.",
        ],
        paragraphs: [],
      },
      {
        id: "ai-processing",
        title: "AI processing",
        paragraphs: [
          "When you use Ask Fuel or similar features, relevant workspace context may be sent to model providers under contractual restrictions. We configure providers not to use your content to train public models where those options exist.",
          "Do not submit sensitive personal data you are not authorized to share (for example, patient health information or unreleased personal financial records unrelated to the business).",
        ],
      },
      {
        id: "sharing",
        title: "Sharing",
        paragraphs: [
          "We share data with subprocessors that help us run Fuel (hosting, analytics, email, payments, and AI infrastructure) under data protection terms. We may disclose information if required by law or to protect rights, safety, and integrity of the service.",
          "We do not sell your private benchmark submissions as a standalone data product. Aggregated, de-identified cohort statistics may be used to improve benchmark quality for all customers.",
        ],
      },
      {
        id: "retention",
        title: "Retention and deletion",
        paragraphs: [
          "We retain workspace data while your account is active and for a reasonable period afterward for backups, billing, and legal compliance. You may request deletion of your account by contacting support; some logs may persist in encrypted backups for a limited time.",
        ],
      },
      {
        id: "rights",
        title: "Your choices and rights",
        paragraphs: [
          "Depending on your location, you may have rights to access, correct, delete, or export personal data, or to object to certain processing. Contact support@york.ie to exercise these rights.",
          "Marketing emails include an unsubscribe link. Security and billing notices may still be sent as part of the service.",
        ],
      },
      {
        id: "security",
        title: "Security",
        paragraphs: [
          "We use administrative, technical, and organizational measures appropriate to the sensitivity of the data, including encryption in transit, access controls, and monitoring. No system is perfectly secure; report concerns to support@york.ie promptly.",
        ],
      },
      {
        id: "international",
        title: "International users",
        paragraphs: [
          "If you access Fuel from outside the United States, you understand that information may be processed in the U.S. and other countries where we or our providers operate.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: [
          "Privacy questions: support@york.ie · York IE, Manchester, NH, United States.",
        ],
      },
    ],
  },
  {
    id: "payment",
    title: "Payment & Credit Terms",
    shortTitle: "Payment terms",
    description: "Subscriptions, credits, billing cycles, refunds, and taxes.",
    lastUpdated: LEGAL_LAST_UPDATED,
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "These Payment & Credit Terms (“Payment Terms”) apply when you purchase Fuel Pro, top up credits, or otherwise pay for paid features. They supplement the Terms of Service. Capitalized terms not defined here have the meaning in the Terms.",
        ],
      },
      {
        id: "plans",
        title: "Plans and credits",
        paragraphs: [
          "Fuel may offer a free tier with limited monthly and daily credits, a Pro subscription with higher allowances, and optional one-time credit packs. Allowances, per-action credit costs, and prices are shown in-product and at checkout and may change with notice for future billing periods.",
          "Credits are a usage unit inside Fuel—not cash, securities, or cryptocurrency. Credits have no monetary value outside the product, are non-transferable between unrelated accounts, and expire or reset according to your plan rules displayed in Usage.",
        ],
      },
      {
        id: "billing",
        title: "Billing and renewal",
        bullets: [
          "Pro subscriptions bill monthly or annually as selected at purchase. Annual plans are charged upfront for the term.",
          "Subscriptions renew automatically until canceled in account billing or through the Stripe customer portal where available.",
          "Top-ups charge once at purchase and add credits to your balance immediately after successful payment.",
          "Failed payments may downgrade features or pause paid usage until resolved.",
        ],
        paragraphs: [],
      },
      {
        id: "stripe",
        title: "Payment processing",
        paragraphs: [
          "Payments are processed by Stripe (or another designated processor). By paying, you also agree to the processor’s applicable terms. We do not store full payment card numbers on our servers.",
        ],
      },
      {
        id: "taxes",
        title: "Taxes",
        paragraphs: [
          "Prices may exclude taxes. You are responsible for applicable sales, VAT, GST, or similar taxes unless we state otherwise at checkout.",
        ],
      },
      {
        id: "refunds",
        title: "Refunds and cancellation",
        paragraphs: [
          "You may cancel Pro renewal at any time; access continues through the end of the paid period unless otherwise stated. Credit top-ups are generally non-refundable once credits are added, except where required by law or where we determine a billing error occurred.",
          "If you believe you were charged in error, contact support@york.ie within thirty days with invoice details.",
        ],
      },
      {
        id: "fair-use",
        title: "Fair use of paid capacity",
        paragraphs: [
          "Paid plans are intended for normal workspace use by your team. Automated scraping, reselling access, or attempts to circumvent credit limits may result in suspension without refund.",
        ],
      },
      {
        id: "changes-pricing",
        title: "Price changes",
        paragraphs: [
          "We may change plan prices or credit economics for future periods. We will give reasonable notice before changes apply to your renewal. Continued use or renewal after notice constitutes acceptance of new pricing for subsequent terms.",
        ],
      },
      {
        id: "contact-billing",
        title: "Billing support",
        paragraphs: [
          "Billing questions: support@york.ie. Include your workspace email and approximate charge date so we can locate the invoice quickly.",
        ],
      },
    ],
  },
];

export function getLegalDocument(id: LegalDocId): LegalDocument {
  return LEGAL_DOCUMENTS.find(doc => doc.id === id) ?? LEGAL_DOCUMENTS[0];
}
