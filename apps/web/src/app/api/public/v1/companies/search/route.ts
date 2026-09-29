import { NextResponse, type NextRequest } from "next/server";
import {
  encodeCompanySearchCursor,
  normalizeCategoryFilters,
  normalizeEmployeeCountBands,
  resolveCompanySearchPagination,
  searchCompaniesPage,
  type CompanySearchFilters,
} from "@/lib/fuel-data";
import { clampSearchLimit, clampSearchOffset } from "@/lib/company-search-paging";
import { requirePublicApiAuth } from "@/lib/public-api/require-auth";
import { toPublicCompanySearchResponse } from "@/lib/public-api/company-search";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILTER_LEN = 128;

function parseNonNegInt(raw: string | null, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readFilter(params: URLSearchParams, key: string): string | undefined {
  const v = params.get(key)?.trim();
  if (!v) return undefined;
  return v.slice(0, MAX_FILTER_LEN);
}

/**
 * Collect multi-value query params (repeated keys and/or comma-separated).
 * Example: `members=11-50&members=51-100` or `category=FinTech,SaaS`.
 */
function readMultiFilter(params: URLSearchParams, key: string): string[] {
  return normalizeEmployeeCountBands(params.getAll(key), MAX_FILTER_LEN);
}

/**
 * Public company search for external integrations (n8n, partners).
 *
 * Auth: Client ID + Client Secret via Basic auth or X-Client-Id / X-Client-Secret.
 * Env: PUBLIC_API_CLIENT_ID, PUBLIC_API_CLIENT_SECRET
 *
 * ## Pagination (pick one mode — do not combine `offset` and `cursor`)
 *
 * ### Offset (existing / shallow)
 * - `limit` (1–50, default 10) → OpenSearch `size`
 * - `offset` → OpenSearch `from`
 * - Hard limit: `offset + limit ≤ 10000` (OpenSearch `max_result_window`).
 * - With `limit=50`, last safe offset is **9950**. Prefer cursor for deeper pages.
 * - Empty `q` + no filters → empty `data` (unchanged).
 *
 * ### Cursor (deep / full-corpus crawl ~1.6M orgs)
 * - Start: `GET .../search?limit=50&cursor=` (empty cursor = first page)
 * - Continue: `GET .../search?limit=50&cursor=<meta.nextCursor>`
 * - Uses OpenSearch `search_after` — **no `from`**, not bound by the 10k window.
 * - Empty `q` + no filters → `match_all` crawl (cursor mode only).
 * - Keep filters/`q` identical across pages.
 * - Live index (no PIT on ES 7.9): long crawls may see rare skips/dupes if orgs
 *   change mid-run — acceptable for most exports; not a frozen snapshot.
 *
 * Filters: `country`, `city`, `category`, `employeeCount` (alias `members`).
 * Multi: `category=FinTech,SaaS` or repeated keys; same for members.
 * Precedence: `employeeCount` wins over `members`.
 *
 * Example (offset): `?q=stripe&limit=8&offset=0&country=USA&category=FinTech`
 * Example (cursor crawl): `?limit=50&cursor=` then `?limit=50&cursor=<nextCursor>`
 */
export async function GET(req: NextRequest) {
  const authError = requirePublicApiAuth(req);
  if (authError) return authError;

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const limit = clampSearchLimit(parseNonNegInt(params.get("limit"), 10));

  const pagination = resolveCompanySearchPagination({
    offsetParam: params.get("offset"),
    cursorParam: params.get("cursor"),
    parseOffset: (raw, fallback) => clampSearchOffset(parseNonNegInt(raw, fallback)),
  });

  if (pagination.mode === "error") {
    if (pagination.error === "offset_cursor_conflict") {
      return NextResponse.json(
        {
          error: "offset_cursor_conflict",
          message: "Use either offset or cursor pagination, not both.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "invalid_cursor", message: "Malformed or unsupported cursor." },
      { status: 400 },
    );
  }

  const filters: CompanySearchFilters = {};
  const country = readFilter(params, "country");
  const city = readFilter(params, "city");
  const category = normalizeCategoryFilters(params.getAll("category"), MAX_FILTER_LEN);
  // Prefer employeeCount over members (same precedence as before).
  const employeeBands = readMultiFilter(params, "employeeCount");
  const memberBands = readMultiFilter(params, "members");
  const employeeCount = employeeBands.length > 0 ? employeeBands : memberBands;
  if (country) filters.country = country;
  if (city) filters.city = city;
  if (category.length > 0) filters.category = category;
  if (employeeCount.length > 0) filters.employeeCount = employeeCount;

  try {
    if (pagination.mode === "cursor") {
      const page = await searchCompaniesPage(q, {
        limit,
        filters,
        pagination: "cursor",
        searchAfter: pagination.searchAfter,
      });
      const nextCursor =
        page.nextSearchAfter && page.nextSearchAfter.length > 0
          ? encodeCompanySearchCursor(page.nextSearchAfter)
          : undefined;
      return NextResponse.json(
        toPublicCompanySearchResponse(page.hits, { q, limit, nextCursor }),
      );
    }

    // Offset mode — unchanged contract (includes meta.offset).
    const page = await searchCompaniesPage(q, {
      limit,
      offset: pagination.offset,
      filters,
      pagination: "offset",
    });
    return NextResponse.json(
      toPublicCompanySearchResponse(page.hits, { q, limit, offset: pagination.offset }),
    );
  } catch (e) {
    captureIntegrationException(e, {
      integration: "public_api",
      operation: "company_search",
    });
    console.error("[public-api] company search failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
