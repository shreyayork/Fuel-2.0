/**
 * Self-hosted tech-stack detector. Fetches a URL, runs fingerprints against
 * response headers, HTML body, script src attrs, meta tags, and set-cookie
 * names. Returns an array of detected technologies with category. Cheap
 * alternative to BuiltWith / paid Wappalyzer API for the ~80% case that
 * doesn't need JS-rendered analysis.
 */
import { FINGERPRINTS, type Category, type TechFingerprint } from "./fingerprints";

export interface DetectEvent {
  url: string;
  /** Max seconds to wait for page fetch. Default 15s. */
  timeoutSeconds?: number;
}

export interface Detected {
  name: string;
  category: Category;
  /** Which source(s) triggered the match. */
  evidence: Array<"headers" | "html" | "script" | "meta" | "cookies" | "url">;
}

export interface DetectResult {
  url: string;
  finalUrl: string;
  status: number;
  detected: Detected[];
  fetchedAt: string;
  error?: string;
}

const UA =
  "Mozilla/5.0 (compatible; FuelBot/1.0; +https://v2.fuel.york.ie/fuelbot) Chrome/121 Safari/537.36";

function extractScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function extractMeta(html: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push([m[1].toLowerCase(), m[2]]);
  return out;
}

function parseSetCookieNames(headers: Headers): string[] {
  const raw = headers.get("set-cookie");
  if (!raw) return [];
  // `set-cookie` is comma-separated (node-fetch merges them); each entry is
  // `name=value; attrs`. Grab names only.
  return raw
    .split(/,(?=[^;]+=)/)
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);
}

function matches(fp: TechFingerprint, ctx: {
  headers: Headers;
  html: string;
  scripts: string[];
  meta: Array<[string, string]>;
  cookies: string[];
  url: string;
}): Detected["evidence"] | null {
  const evidence: Detected["evidence"] = [];
  if (fp.headers) {
    for (const [name, rx] of fp.headers) {
      const v = ctx.headers.get(name);
      if (v && rx.test(v)) {
        evidence.push("headers");
        break;
      }
    }
  }
  if (fp.html) {
    if (fp.html.some((r) => r.test(ctx.html))) evidence.push("html");
  }
  if (fp.script) {
    if (fp.script.some((r) => ctx.scripts.some((s) => r.test(s)))) evidence.push("script");
  }
  if (fp.meta) {
    for (const [name, rx] of fp.meta) {
      const entry = ctx.meta.find(([n]) => n === name.toLowerCase());
      if (entry && rx.test(entry[1])) {
        evidence.push("meta");
        break;
      }
    }
  }
  if (fp.cookies) {
    if (fp.cookies.some((r) => ctx.cookies.some((c) => r.test(c)))) evidence.push("cookies");
  }
  if (fp.url) {
    if (fp.url.some((r) => r.test(ctx.url))) evidence.push("url");
  }
  return evidence.length > 0 ? evidence : null;
}

export async function handler(event: DetectEvent): Promise<DetectResult> {
  const { url } = event;
  if (!url || !/^https?:\/\//i.test(url)) {
    return {
      url,
      finalUrl: url,
      status: 0,
      detected: [],
      fetchedAt: new Date().toISOString(),
      error: "invalid_url",
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    (event.timeoutSeconds ?? 15) * 1000,
  );

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (e) {
    clearTimeout(timeout);
    return {
      url,
      finalUrl: url,
      status: 0,
      detected: [],
      fetchedAt: new Date().toISOString(),
      error: (e as Error).message?.slice(0, 200) ?? "fetch_failed",
    };
  }
  clearTimeout(timeout);

  const html = await res.text();
  const scripts = extractScripts(html);
  const meta = extractMeta(html);
  const cookies = parseSetCookieNames(res.headers);

  const ctx = { headers: res.headers, html, scripts, meta, cookies, url };
  const detected: Detected[] = [];
  for (const fp of FINGERPRINTS) {
    const evidence = matches(fp, ctx);
    if (evidence) detected.push({ name: fp.name, category: fp.category, evidence });
  }

  return {
    url,
    finalUrl: res.url,
    status: res.status,
    detected,
    fetchedAt: new Date().toISOString(),
  };
}
