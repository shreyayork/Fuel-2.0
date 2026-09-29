/**
 * Wappalyzer-style fingerprints, curated for B2B research. Each rule tests
 * one signal source and returns the technology name + category when matched.
 * Not exhaustive — ~60 high-signal techs. Keep the list small + reliable.
 */

export type Category =
  | "frontend-framework"
  | "backend-framework"
  | "cms"
  | "ecommerce"
  | "hosting"
  | "cdn"
  | "cloud"
  | "analytics"
  | "crm"
  | "marketing"
  | "support"
  | "payments"
  | "auth"
  | "observability"
  | "search"
  | "webserver"
  | "language"
  | "dev-platform";

export interface TechFingerprint {
  name: string;
  category: Category;
  /** Matches any header name (lowercased) with value regex. */
  headers?: Array<[string, RegExp]>;
  /** Regex against full HTML body. */
  html?: RegExp[];
  /** Regex against `<script src="...">` URLs. */
  script?: RegExp[];
  /** Regex against `<meta name/property>` values. */
  meta?: Array<[string, RegExp]>;
  /** Cookie name contains. */
  cookies?: RegExp[];
  /** Regex against URL itself. */
  url?: RegExp[];
}

export const FINGERPRINTS: TechFingerprint[] = [
  // --- Frontend frameworks ---
  { name: "Next.js", category: "frontend-framework", headers: [["x-powered-by", /Next\.js/i]], html: [/_next\/static/i], meta: [["next-head-count", /./]] },
  { name: "React", category: "frontend-framework", script: [/react(\.production\.min|\.development)?\.js/i], html: [/__REACT_DEVTOOLS_GLOBAL_HOOK__/] },
  { name: "Vue.js", category: "frontend-framework", script: [/vue(\.runtime)?\.(min|global|esm)?\.js/i], html: [/data-v-[a-f0-9]{8}/i] },
  { name: "Angular", category: "frontend-framework", html: [/ng-version="[^"]+"/i], script: [/@angular\/core/i] },
  { name: "Svelte", category: "frontend-framework", html: [/svelte-[a-z0-9]+/i] },
  { name: "Nuxt", category: "frontend-framework", html: [/id="__nuxt"/i], meta: [["nuxt-version", /./]] },
  { name: "Remix", category: "frontend-framework", html: [/__remixContext/] },
  { name: "Gatsby", category: "frontend-framework", html: [/id="___gatsby"/i], meta: [["generator", /Gatsby/i]] },
  { name: "Astro", category: "frontend-framework", html: [/astro-island/i], meta: [["generator", /Astro/i]] },

  // --- Backend frameworks / languages ---
  { name: "Ruby on Rails", category: "backend-framework", headers: [["x-powered-by", /Phusion Passenger/i], ["server", /Rails/i]], html: [/csrf-param/i] },
  { name: "Django", category: "backend-framework", cookies: [/^csrftoken$/], headers: [["x-frame-options", /./]] },
  { name: "Laravel", category: "backend-framework", cookies: [/^laravel_session$/i, /^XSRF-TOKEN$/i] },
  { name: "Express", category: "backend-framework", headers: [["x-powered-by", /Express/i]] },
  { name: "ASP.NET", category: "backend-framework", headers: [["x-aspnet-version", /./i], ["x-powered-by", /ASP\.NET/i]] },
  { name: "PHP", category: "language", headers: [["x-powered-by", /PHP/i], ["set-cookie", /PHPSESSID/]] },

  // --- CMS + ecommerce ---
  { name: "WordPress", category: "cms", html: [/wp-content\/|wp-includes\//i], meta: [["generator", /WordPress/i]] },
  { name: "Webflow", category: "cms", meta: [["generator", /Webflow/i]], html: [/w-webflow-badge/i] },
  { name: "Shopify", category: "ecommerce", headers: [["x-shopid", /\d+/]], html: [/cdn\.shopify\.com/i] },
  { name: "Wix", category: "cms", meta: [["generator", /Wix\.com/i]] },
  { name: "Squarespace", category: "cms", html: [/squarespace-cdn\.com/i], meta: [["generator", /Squarespace/i]] },
  { name: "Contentful", category: "cms", html: [/images\.ctfassets\.net/i] },
  { name: "Sanity", category: "cms", html: [/cdn\.sanity\.io/i] },

  // --- Cloud / hosting / CDN ---
  { name: "AWS", category: "cloud", headers: [["server", /AmazonS3/i], ["x-amz-request-id", /./]] },
  { name: "CloudFront", category: "cdn", headers: [["x-amz-cf-id", /./], ["via", /CloudFront/i]] },
  { name: "Cloudflare", category: "cdn", headers: [["server", /cloudflare/i], ["cf-ray", /./]] },
  { name: "Vercel", category: "hosting", headers: [["server", /Vercel/i], ["x-vercel-id", /./]] },
  { name: "Netlify", category: "hosting", headers: [["server", /Netlify/i], ["x-nf-request-id", /./]] },
  { name: "Fastly", category: "cdn", headers: [["x-served-by", /fastly/i]] },
  { name: "Google Cloud", category: "cloud", headers: [["server", /Google Frontend|GSE/i]] },
  { name: "Azure", category: "cloud", headers: [["x-ms-request-id", /./], ["server", /Microsoft-IIS/i]] },

  // --- Web servers ---
  { name: "Nginx", category: "webserver", headers: [["server", /nginx/i]] },
  { name: "Apache", category: "webserver", headers: [["server", /Apache/i]] },

  // --- Analytics ---
  { name: "Google Analytics", category: "analytics", script: [/google-analytics\.com\/(analytics|ga|urchin)\.js/i, /googletagmanager\.com\/gtag\/js/i] },
  { name: "Google Tag Manager", category: "analytics", script: [/googletagmanager\.com\/gtm\.js/i], html: [/GTM-[A-Z0-9]+/] },
  { name: "Mixpanel", category: "analytics", script: [/cdn\.mxpnl\.com|mixpanel\.com\/api/i] },
  { name: "Amplitude", category: "analytics", script: [/cdn\.amplitude\.com|api\.amplitude\.com/i] },
  { name: "Segment", category: "analytics", script: [/cdn\.segment\.com\/analytics\.js/i] },
  { name: "Heap", category: "analytics", script: [/cdn\.heapanalytics\.com|heap\.io/i] },
  { name: "Plausible", category: "analytics", script: [/plausible\.io\/js/i] },

  // --- CRM / marketing ---
  { name: "HubSpot", category: "crm", script: [/js\.hs-scripts\.com|js\.hsforms\.net|js\.hs-analytics\.net/i], html: [/hs-loader-v5/i] },
  { name: "Salesforce", category: "crm", script: [/salesforceliveagent|pardot\.com/i] },
  { name: "Marketo", category: "marketing", script: [/munchkin\.marketo\.net/i] },
  { name: "Mailchimp", category: "marketing", script: [/chimpstatic\.com|list-manage\.com/i] },
  { name: "Klaviyo", category: "marketing", script: [/klaviyo\.com\/media/i] },

  // --- Support / chat ---
  { name: "Intercom", category: "support", script: [/widget\.intercom\.io/i], html: [/intercomSettings/] },
  { name: "Zendesk", category: "support", script: [/static\.zdassets\.com|zendesk\.com/i] },
  { name: "Drift", category: "support", script: [/js\.driftt\.com/i] },
  { name: "Crisp", category: "support", script: [/client\.crisp\.chat/i] },

  // --- Payments ---
  { name: "Stripe", category: "payments", script: [/js\.stripe\.com\/v3|checkout\.stripe\.com/i] },
  { name: "Braintree", category: "payments", script: [/js\.braintreegateway\.com/i] },
  { name: "PayPal", category: "payments", script: [/paypal\.com\/sdk|paypalobjects\.com/i] },
  { name: "Chargebee", category: "payments", script: [/js\.chargebee\.com/i] },

  // --- Auth ---
  { name: "Auth0", category: "auth", script: [/cdn\.auth0\.com/i] },
  { name: "Okta", category: "auth", script: [/okta-auth-js|cdn\.okta\.com/i] },
  { name: "Firebase Auth", category: "auth", script: [/firebaseapp\.com|firebase\.js/i] },

  // --- Observability ---
  { name: "Sentry", category: "observability", script: [/browser\.sentry-cdn\.com|sentry-trace/i] },
  { name: "Datadog", category: "observability", script: [/browser-intake-datadoghq\.com|datadog-rum/i] },
  { name: "New Relic", category: "observability", script: [/js-agent\.newrelic\.com/i] },
  { name: "LogRocket", category: "observability", script: [/cdn\.logrocket\.io|logrocket\.com/i] },
  { name: "FullStory", category: "observability", script: [/edge\.fullstory\.com/i] },

  // --- Search ---
  { name: "Algolia", category: "search", script: [/cdn\.jsdelivr\.net\/npm\/algoliasearch|algolia\.net/i] },

  // --- Dev platform ---
  { name: "GitHub Pages", category: "hosting", headers: [["x-github-request-id", /./]] },
  { name: "Gitbook", category: "cms", html: [/gitbook\.io/i] },
];
