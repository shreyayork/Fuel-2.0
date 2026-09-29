import "server-only";
import TurndownService from "turndown";
import {
  assertPublicHttpUrl,
  extractSocialUrlsFromText,
  type ExtractedSocialUrls,
  UnsafeUrlError,
} from "./urls";

const UA =
  "Mozilla/5.0 (compatible; FuelBot/1.0; +https://v2.fuel.york.ie/fuelbot) Chrome/121 Safari/537.36";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Drop nav / footer / script / style / svg so the markdown stays signal-heavy.
// Turndown's types only know DOM element names — "noscript" and "iframe" fit
// those, but we cast through unknown to keep the list concise.
const REMOVED = [
  "script",
  "style",
  "noscript",
  "iframe",
  "form",
  "svg",
] as unknown as Parameters<typeof turndown.remove>[0];
turndown.remove(REMOVED);

export interface WebsiteScrapeResult {
  url: string;
  finalUrl: string;
  status: number;
  title: string | null;
  description: string | null;
  markdown: string;
  /** Social links parsed from raw HTML (footer/header) before chrome is stripped. */
  socialLinks: ExtractedSocialUrls;
  fetchedAt: string;
  error?: string;
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return m ? m[1].trim() : null;
}

function extractDescription(html: string): string | null {
  const m =
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(
      html,
    );
  if (m) return m[1].trim();
  const og =
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i.exec(
      html,
    );
  return og ? og[1].trim() : null;
}

// Strip head + obvious chrome before md conversion to keep output lean.
function stripBoilerplate(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");
}

/**
 * Plain-fetch the URL and convert the body to markdown. Handles ~80% of
 * marketing / VC portfolio / landing pages. Sites that block plain fetch or
 * require JS rendering will need a Bright Data Web Unlocker fallback
 * (follow-up).
 */
export async function scrapeWebsiteMarkdown(opts: {
  url: string;
  /** Keep the output under N chars to bound agent context cost. */
  maxChars?: number;
  timeoutSeconds?: number;
}): Promise<WebsiteScrapeResult> {
  const { url } = opts;
  try {
    assertPublicHttpUrl(url);
  } catch (e) {
    return {
      url,
      finalUrl: url,
      status: 0,
      title: null,
      description: null,
      markdown: "",
      socialLinks: {
        linkedinUrl: null,
        twitterUrl: null,
        crunchbaseUrl: null,
      },
      fetchedAt: new Date().toISOString(),
      error: e instanceof UnsafeUrlError ? e.message : "unsafe_url",
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    (opts.timeoutSeconds ?? 20) * 1000,
  );

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": UA,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (e) {
    clearTimeout(timeout);
    return {
      url,
      finalUrl: url,
      status: 0,
      title: null,
      description: null,
      markdown: "",
      socialLinks: {
        linkedinUrl: null,
        twitterUrl: null,
        crunchbaseUrl: null,
      },
      fetchedAt: new Date().toISOString(),
      error: (e as Error).message?.slice(0, 200) ?? "fetch_failed",
    };
  }
  clearTimeout(timeout);

  const html = await res.text();
  const title = extractTitle(html);
  const description = extractDescription(html);
  const socialLinks = extractSocialUrlsFromText(html);

  const cleaned = stripBoilerplate(html);
  let markdown = turndown.turndown(cleaned);

  // Collapse runs of blank lines + trim.
  markdown = markdown
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (opts.maxChars && markdown.length > opts.maxChars) {
    markdown = markdown.slice(0, opts.maxChars) + "\n\n… [truncated]";
  }

  return {
    url,
    finalUrl: res.url,
    status: res.status,
    title,
    description,
    markdown,
    socialLinks,
    fetchedAt: new Date().toISOString(),
  };
}
