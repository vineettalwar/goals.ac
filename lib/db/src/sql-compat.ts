import { ilike, sql, type Column, type SQL } from "drizzle-orm";
import { isD1Dialect } from "./dialect";

/** `count(*)` with Postgres `::int` cast when needed. */
export function countAsInt(): SQL<number> {
  return isD1Dialect() ? sql<number>`count(*)` : sql<number>`count(*)::int`;
}

/** `count(distinct col)` with optional Postgres `::int` cast. */
export function countDistinctAsInt(column: SQL | Column): SQL<number> {
  return isD1Dialect()
    ? sql<number>`count(distinct ${column})`
    : sql<number>`count(distinct ${column})::int`;
}

/** `sum(col)` with optional Postgres `::int` cast. */
export function sumAsInt(column: SQL | Column): SQL<number> {
  return isD1Dialect() ? sql<number>`sum(${column})` : sql<number>`sum(${column})::int`;
}

/** `coalesce(sum(col), 0)` with optional Postgres `::int` cast. */
export function coalesceSumAsInt(column: SQL | Column): SQL<number> {
  return isD1Dialect()
    ? sql<number>`coalesce(sum(${column}), 0)`
    : sql<number>`coalesce(sum(${column}), 0)::int`;
}

/** Case-insensitive LIKE — `ilike` (Postgres) or `lower() like lower()` (SQLite/D1). */
export function ilikeCompat<T extends Column>(column: T, pattern: string): SQL {
  if (isD1Dialect()) {
    return sql`lower(${column}) like lower(${pattern})`;
  }
  return ilike(column, pattern);
}

/** Extract a JSON object field — `meta->>'key'` (Postgres) or `json_extract` (SQLite/D1). */
export function jsonTextAt(column: SQL | Column | unknown, key: string): SQL {
  if (isD1Dialect()) {
    return sql`json_extract(${column}, ${`$.${key}`})`;
  }
  return sql`${column} ->> ${key}`;
}

/** JSON text field equals literal — e.g. `meta->>'enabled' = 'true'`. */
export function jsonTextEquals(
  column: SQL | Column | unknown,
  key: string,
  value: string,
): SQL {
  if (isD1Dialect()) {
    return sql`json_extract(${column}, ${`$.${key}`}) = ${value}`;
  }
  return sql`${column} ->> ${key} = ${value}`;
}

/** Per-transaction advisory lock — no-op on D1 (SQLite serializes writers). */
export async function advisoryXactLock(
  tx: { execute: (query: SQL) => Promise<unknown> },
  lockKey: string,
): Promise<void> {
  if (isD1Dialect()) return;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
}

export function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (isD1Dialect()) {
    const message = err instanceof Error ? err.message : String(err);
    return message.includes("UNIQUE constraint failed") || code === "SQLITE_CONSTRAINT_UNIQUE";
  }
  return code === "23505";
}

/** True when pg-boss / Postgres-only job infrastructure must not run. */
export function isJobsUnavailable(): boolean {
  return isD1Dialect();
}
