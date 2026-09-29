import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  buildFeedItems,
  groupFeedBySignalCreatedAt,
  type CompanySignalObservationLike,
  type FeedSignalGroup,
} from "@/lib/intelligence/feed";
import { formatCategoryLabel } from "@/components/intelligence/format";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import type { IntelligenceCategory } from "@/lib/intelligence/constants";
import type { ListPageSize, PaginatedResponse } from "@/lib/list-pagination";
import type { IntelligenceFeedPageQuery } from "@/lib/intelligence/feed-page-params";

type FeedUnionRow = {
  origin: "intelligence" | "observation";
  row_id: string;
  category_key: string;
  signal_name: string;
  created_at: Date;
  period: string | null;
  context_item_id: string | null;
  document_version_id: string | null;
  document_label: string | null;
  headline: string | null;
  key_detail: string | null;
  summary: string | null;
  confidence: number | null;
  source: string | null;
  generation_path: string | null;
  raw_snippet: string | null;
  is_benchmark: boolean | null;
  author_email: string | null;
  signal_id: string | null;
  signal_label: string | null;
  signal_category: string | null;
  signal_kind: "quantitative" | "qualitative" | "boolean" | null;
  signal_unit: string | null;
  value_numeric: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  overview_category: string | null;
  evidence_source: string | null;
};

function escapeLike(raw: string): string {
  return raw.replace(/([\\%_])/g, "\\$1");
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Paginate Intelligence as FeedSignalGroup units.
 *
 * SQL: filter union(obs ∪ intel) → group → COUNT + page keys → members for
 * those keys only. No full-dataset client slice, no N+1.
 */
export async function listIntelligenceFeedPage(opts: {
  accountId: string;
  companyUuid: string;
  query: IntelligenceFeedPageQuery;
}): Promise<PaginatedResponse<FeedSignalGroup>> {
  const db = await getDb();
  const { query } = opts;
  const limit: ListPageSize = query.limit;
  const offset = query.offset;
  const category = query.category;
  const qLower = query.q.toLowerCase();
  const like = query.q ? `%${escapeLike(qLower)}%` : null;
  const matchYes = qLower.includes("yes");
  const matchNo = qLower.includes("no");
  const focusIds = query.focusIds;
  const hasFocus = focusIds.length > 0;
  const skipDate = query.skipDateFilter;
  const useLoggedDay = query.dateMatch === "logged-day";
  const rangeStart = query.rangeStart;
  const rangeEnd = query.rangeEnd;

  const focusSql =
    focusIds.length > 0
      ? sql`ARRAY[${sql.join(
          focusIds.map((id) => sql`${id}`),
          sql`, `,
        )}]::text[]`
      : sql`ARRAY[]::text[]`;

  /**
   * Shared filtered feed. Period start is derived once per row so overlap
   * checks stay readable and match `intelligencePeriodBounds` in TS.
   */
  const filteredCte = sql`
    WITH intel_rows AS (
      SELECT
        'intelligence'::text AS origin,
        ci.id AS row_id,
        lower(regexp_replace(trim(ci.category), '[[:space:]-]+', '_', 'g')) AS category_key,
        ci.headline AS signal_name,
        ci.created_at,
        ci.period,
        ci.context_item_id,
        ci.document_version_id,
        COALESCE(
          NULLIF(trim(ci.metadata ->> 'title'), ''),
          NULLIF(trim(ctx.title), ''),
          NULLIF(trim(drv.type_label), '')
        ) AS document_label,
        ci.headline,
        ci.key_detail,
        ci.summary,
        ci.confidence,
        ci.source,
        ci.generation_path,
        ci.raw_snippet,
        ci.is_benchmark,
        ci.author_email,
        NULL::text AS signal_id,
        NULL::text AS signal_label,
        NULL::text AS signal_category,
        NULL::text AS signal_kind,
        NULL::text AS signal_unit,
        NULL::real AS value_numeric,
        NULL::text AS value_text,
        NULL::boolean AS value_bool,
        NULLIF(trim(ci.metadata ->> 'overviewCategory'), '') AS overview_category,
        NULLIF(trim(ci.metadata ->> 'evidenceSource'), '') AS evidence_source
      FROM company_intelligence ci
      LEFT JOIN data_room_document_versions drv ON drv.id = ci.document_version_id
      LEFT JOIN context_items ctx ON ctx.id = ci.context_item_id
      WHERE ci.account_id = ${opts.accountId}
        AND ci.company_uuid = ${opts.companyUuid}
        AND ci.dismissed_at IS NULL
    ),
    obs_rows AS (
      SELECT
        'observation'::text AS origin,
        so.id AS row_id,
        lower(regexp_replace(trim(s.category), '[[:space:]-]+', '_', 'g')) AS category_key,
        s.label AS signal_name,
        so.created_at,
        so.period,
        so.context_item_id,
        NULL::text AS document_version_id,
        NULL::text AS document_label,
        NULL::text AS headline,
        NULL::text AS key_detail,
        NULL::text AS summary,
        so.confidence,
        so.source,
        NULL::text AS generation_path,
        so.raw_snippet,
        FALSE AS is_benchmark,
        so.author_email,
        s.id AS signal_id,
        s.label AS signal_label,
        s.category AS signal_category,
        s.kind::text AS signal_kind,
        s.unit AS signal_unit,
        so.value_numeric,
        so.value_text,
        so.value_bool,
        NULL::text AS overview_category,
        NULL::text AS evidence_source
      FROM signal_observations so
      INNER JOIN signals s ON s.id = so.signal_id
      WHERE so.account_id = ${opts.accountId}
        AND so.company_uuid = ${opts.companyUuid}
        AND so.superseded_at IS NULL
    ),
    feed AS (
      SELECT * FROM intel_rows
      UNION ALL
      SELECT * FROM obs_rows
    ),
    feed_dated AS (
      SELECT
        f.*,
        CASE
          WHEN f.period ~* '^(20\\d{2})-?q([1-4])$' THEN
            make_date(
              substring(lower(f.period) from '^(20\\d{2})')::int,
              (substring(lower(f.period) from 'q([1-4])')::int - 1) * 3 + 1,
              1
            )
          WHEN f.period ~* '^q([1-4])-?(20\\d{2})$' THEN
            make_date(
              substring(lower(f.period) from '(20\\d{2})$')::int,
              (substring(lower(f.period) from 'q([1-4])')::int - 1) * 3 + 1,
              1
            )
          ELSE NULL
        END AS period_start
      FROM feed f
    ),
    filtered AS (
      SELECT d.*
      FROM feed_dated d
      WHERE
        (${category}::text IS NULL OR d.category_key = ${category})
        AND (
          ${like}::text IS NULL
          OR lower(d.signal_name) LIKE ${like} ESCAPE '\\'
          OR lower(COALESCE(d.key_detail, '')) LIKE ${like} ESCAPE '\\'
          OR lower(COALESCE(d.summary, '')) LIKE ${like} ESCAPE '\\'
          OR lower(COALESCE(d.raw_snippet, '')) LIKE ${like} ESCAPE '\\'
          OR lower(d.category_key) LIKE ${like} ESCAPE '\\'
          OR lower(replace(d.category_key, '_', ' ')) LIKE ${like} ESCAPE '\\'
          OR lower(COALESCE(d.document_label, '')) LIKE ${like} ESCAPE '\\'
          OR lower(COALESCE(d.value_text, '')) LIKE ${like} ESCAPE '\\'
          OR lower(COALESCE(d.value_numeric::text, '')) LIKE ${like} ESCAPE '\\'
          OR (${matchYes} AND d.value_bool IS TRUE)
          OR (${matchNo} AND d.value_bool IS FALSE)
        )
        AND (
          NOT ${hasFocus}
          OR d.row_id = ANY(${focusSql})
          OR d.context_item_id = ANY(${focusSql})
          OR d.document_version_id = ANY(${focusSql})
          OR ('intel:' || d.row_id) = ANY(${focusSql})
          OR ('obs:' || d.row_id) = ANY(${focusSql})
        )
        AND (
          ${skipDate}
          OR (
            ${useLoggedDay}
            AND d.created_at >= ${rangeStart}
            AND d.created_at <= ${rangeEnd}
          )
          OR (
            NOT ${useLoggedDay}
            AND (
              (
                d.period_start IS NOT NULL
                AND d.period_start <= ${rangeEnd}
                AND (d.period_start + INTERVAL '3 months' - INTERVAL '1 day')::date
                  >= ${rangeStart}::date
              )
              OR (
                d.period_start IS NULL
                AND d.created_at >= ${rangeStart}
                AND d.created_at <= ${rangeEnd}
              )
            )
          )
        )
    )
  `;

  const pageResult = await db.execute<{
    category_key: string;
    signal_name: string;
    latest_at: Date;
    total: number | string;
  }>(sql`
    ${filteredCte}
    , groups AS (
      SELECT category_key, signal_name, max(created_at) AS latest_at
      FROM filtered
      GROUP BY category_key, signal_name
    )
    SELECT
      g.category_key,
      g.signal_name,
      g.latest_at,
      count(*) OVER() AS total
    FROM groups g
    ORDER BY g.latest_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const total =
    pageResult.rows.length > 0
      ? Number(pageResult.rows[0]!.total)
      : offset > 0
        ? // Empty page past the end — still need the true total.
          Number(
            (
              await db.execute<{ total: number | string }>(sql`
                ${filteredCte}
                SELECT count(*)::int AS total
                FROM (
                  SELECT 1
                  FROM filtered
                  GROUP BY category_key, signal_name
                ) g
              `)
            ).rows[0]?.total ?? 0,
          )
        : 0;

  if (pageResult.rows.length === 0) {
    return { data: [], meta: { total, limit, offset } };
  }

  const keyPairs = sql.join(
    pageResult.rows.map(
      (row) => sql`(${row.category_key}::text, ${row.signal_name}::text)`,
    ),
    sql`, `,
  );

  const memberResult = await db.execute<FeedUnionRow>(sql`
    ${filteredCte}
    SELECT
      f.origin,
      f.row_id,
      f.category_key,
      f.signal_name,
      f.created_at,
      f.period,
      f.context_item_id,
      f.document_version_id,
      f.document_label,
      f.headline,
      f.key_detail,
      f.summary,
      f.confidence,
      f.source,
      f.generation_path,
      f.raw_snippet,
      f.is_benchmark,
      f.author_email,
      f.signal_id,
      f.signal_label,
      f.signal_category,
      f.signal_kind,
      f.signal_unit,
      f.value_numeric,
      f.value_text,
      f.value_bool,
      f.overview_category,
      f.evidence_source
    FROM filtered f
    WHERE (f.category_key, f.signal_name) IN (VALUES ${keyPairs})
    ORDER BY f.created_at DESC
  `);

  const intelligence: CompanyIntelligenceRow[] = [];
  const observations: CompanySignalObservationLike[] = [];

  for (const row of memberResult.rows) {
    if (row.origin === "intelligence") {
      intelligence.push({
        id: row.row_id,
        companyUuid: opts.companyUuid,
        category: row.category_key as IntelligenceCategory,
        headline: row.headline ?? row.signal_name,
        keyDetail: row.key_detail,
        summary: row.summary ?? "",
        confidence: row.confidence ?? 1,
        source: row.source ?? "",
        generationPath: row.generation_path,
        period: row.period,
        contextItemId: row.context_item_id,
        documentVersionId: row.document_version_id,
        documentLabel: row.document_label,
        rawSnippet: row.raw_snippet,
        isBenchmark: Boolean(row.is_benchmark),
        authorEmail: row.author_email,
        createdAt: toIso(row.created_at),
        overviewCategory: row.overview_category,
        evidenceSource: row.evidence_source,
      });
    } else if (
      row.signal_id &&
      row.signal_label &&
      row.signal_category &&
      row.signal_kind
    ) {
      observations.push({
        id: row.row_id,
        signalId: row.signal_id,
        signalLabel: row.signal_label,
        signalCategory: row.signal_category,
        signalKind: row.signal_kind,
        signalUnit: row.signal_unit,
        period: row.period ?? "",
        valueNumeric: row.value_numeric,
        valueText: row.value_text,
        valueBool: row.value_bool,
        confidence: row.confidence,
        rawSnippet: row.raw_snippet,
        source: row.source,
        contextItemId: row.context_item_id,
        createdAt: toIso(row.created_at),
      });
    }
  }

  const items = buildFeedItems({
    observations,
    intelligence,
    catalog: [],
  });
  const grouped = groupFeedBySignalCreatedAt(items);
  const order = new Map(
    pageResult.rows.map((row, index) => [
      `${row.category_key}::${row.signal_name}`,
      index,
    ]),
  );
  const data = [...grouped]
    .map((group) => ({
      ...group,
      categoryLabel: formatCategoryLabel(group.categoryKey),
    }))
    .sort((a, b) => {
      const ai = order.get(`${a.categoryKey}::${a.signalName}`) ?? 0;
      const bi = order.get(`${b.categoryKey}::${b.signalName}`) ?? 0;
      return ai - bi;
    });

  return { data, meta: { total, limit, offset } };
}
