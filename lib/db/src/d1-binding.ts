import { setBindingDialect } from "./dialect";
import { createD1Db, type D1DatabaseBinding, type GoalsD1Database } from "./d1";

let cachedD1Db: GoalsD1Database | null = null;

/** Wire a Cloudflare D1 binding — safe for Edge runtime (no Postgres imports). */
export function setD1Binding(binding: D1DatabaseBinding | null): void {
  cachedD1Db = binding ? createD1Db(binding) : null;
  setBindingDialect(binding ? "d1" : null);
}

export function resolveD1Db(): GoalsD1Database {
  if (cachedD1Db) return cachedD1Db;

  throw new Error(
    "D1 database is not initialized. On Cloudflare Workers, instrumentation.ts must call setD1Binding() from the DB binding. Add d1_databases to wrangler.jsonc and set DB_DIALECT=d1.",
  );
}
