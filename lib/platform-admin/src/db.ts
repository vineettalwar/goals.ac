import { db as goalsDb, type GoalsD1Database } from "@workspace/db";

/**
 * platform-admin is only used from Cloudflare Workers against D1.
 * Cast past the Postgres-typed `db` proxy so schema-sqlite tables typecheck.
 */
export const db = goalsDb as unknown as GoalsD1Database;
