/**
 * Export rows from local Postgres and build SQLite INSERT statements for D1.
 */
import pg from "pg";

export type PgPool = pg.Pool;

/** Parent tables first — matches FK dependencies in goals.ac schema. */
export const SYNC_TABLE_ORDER = [
  "industries",
  "locations",
  "users",
  "companies",
  "organizations",
  "workspaces",
  "plan_quota_config",
  "platform_settings",
  "roadmaps",
  "marketing_personas",
  "organization_members",
  "website_projects",
  "brand_profiles",
  "brand_voice_sources",
  "brand_voice_chunks",
  "goals",
  "briefs",
  "content_strategies",
  "content_items",
  "content_pieces",
  "geo_audits",
  "competitor_analyses",
  "keyword_analyses",
  "keyword_opportunities",
  "tracked_keywords",
  "keyword_rank_snapshots",
  "keyword_rank_alerts",
  "seo_articles",
  "project_roadmaps",
  "integration_connections",
  "wordpress_connections",
  "search_property_connections",
  "analytics_property_connections",
  "llm_visibility_prompts",
  "llm_visibility_snapshots",
  "gsc_search_queries",
  "ga4_page_metrics",
  "social_post_metrics",
  "publish_records",
  "scheduled_articles",
  "credit_ledger",
  "usage_events",
  "org_audit_log",
  "org_invites",
  "api_keys",
  "sessions",
  "conversations",
  "messages",
  "contact_submissions",
  "waitlist_signups",
  "lead_captures",
  "article_idea_sources",
  "article_idea_imports",
] as const;

const SKIP_TABLES = new Set(["d1_migrations", "sqlite_sequence", "_cf_KV"]);

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function toSqliteValue(value: unknown, pgType: string): string | null {
  if (value === null || value === undefined) return "NULL";

  if (pgType === "boolean") {
    return value ? "1" : "0";
  }

  if (
    pgType === "timestamp with time zone" ||
    pgType === "timestamp without time zone"
  ) {
    const ms = value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
    return Number.isFinite(ms) ? String(ms) : "NULL";
  }

  if (pgType === "date") {
    if (value instanceof Date) {
      return sqlQuote(value.toISOString().slice(0, 10));
    }
    return sqlQuote(String(value));
  }

  if (pgType === "jsonb" || pgType === "json" || pgType.endsWith("[]") || pgType === "ARRAY") {
    return sqlQuote(JSON.stringify(value));
  }

  if (pgType === "USER-DEFINED") {
    // pgvector — store as JSON text in D1
    if (Array.isArray(value)) {
      return sqlQuote(JSON.stringify(value));
    }
    return sqlQuote(String(value));
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "object") {
    return sqlQuote(JSON.stringify(value));
  }

  return sqlQuote(String(value));
}

export async function fetchPgTablesWithRows(pool: PgPool): Promise<Set<string>> {
  const tables = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);

  const withRows = new Set<string>();
  for (const { table_name } of tables.rows) {
    const count = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM "${table_name}"`,
    );
    if (Number.parseInt(count.rows[0]?.n ?? "0", 10) > 0) {
      withRows.add(table_name);
    }
  }
  return withRows;
}

export async function fetchPgColumnTypes(
  pool: PgPool,
  table: string,
): Promise<Map<string, string>> {
  const result = await pool.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return new Map(result.rows.map((r) => [r.column_name, r.data_type]));
}

export async function buildTableInsertSql(
  pool: PgPool,
  table: string,
  d1Columns: Set<string>,
): Promise<{ sql: string[]; rowCount: number }> {
  const pgTypes = await fetchPgColumnTypes(pool, table);
  const columns = [...pgTypes.keys()].filter((c) => d1Columns.has(c));
  if (columns.length === 0) {
    return { sql: [], rowCount: 0 };
  }

  const colList = columns.map((c) => `"${c}"`).join(", ");
  const rows = await pool.query(`SELECT * FROM "${table}" ORDER BY 1`);
  if (rows.rowCount === 0) {
    return { sql: [], rowCount: 0 };
  }

  const statements: string[] = [];
  for (const row of rows.rows) {
    const values = columns
      .map((col) => toSqliteValue(row[col], pgTypes.get(col) ?? "text"))
      .join(", ");
    statements.push(`INSERT INTO "${table}" (${colList}) VALUES (${values});`);
  }

  return { sql: statements, rowCount: rows.rowCount ?? 0 };
}

export function buildClearSql(tables: string[]): string[] {
  const lines = ["PRAGMA foreign_keys = OFF;"];
  for (const table of [...tables].reverse()) {
    if (!SKIP_TABLES.has(table)) {
      lines.push(`DELETE FROM "${table}";`);
    }
  }
  lines.push("PRAGMA foreign_keys = ON;");
  return lines;
}

export async function buildSyncSqlFromPostgres(
  pool: PgPool,
  d1ColumnsByTable: Map<string, Set<string>>,
): Promise<{ sql: string; summary: Array<{ table: string; rows: number }> }> {
  const tablesWithRows = await fetchPgTablesWithRows(pool);
  const tablesToSync = SYNC_TABLE_ORDER.filter((t) => tablesWithRows.has(t));

  const lines: string[] = [];
  lines.push(...buildClearSql([...SYNC_TABLE_ORDER]));

  const summary: Array<{ table: string; rows: number }> = [];

  for (const table of tablesToSync) {
    const d1Cols = d1ColumnsByTable.get(table);
    if (!d1Cols || d1Cols.size === 0) continue;

    const { sql, rowCount } = await buildTableInsertSql(pool, table, d1Cols);
    if (rowCount > 0) {
      lines.push(...sql);
      summary.push({ table, rows: rowCount });
    }
  }

  return { sql: lines.join("\n"), summary };
}