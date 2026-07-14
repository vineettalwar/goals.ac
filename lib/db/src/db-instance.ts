import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDbDialect } from "./dialect";
import { createD1Db, type D1DatabaseBinding, type GoalsD1Database } from "./d1";
import { getPostgresDb } from "./postgres";
import * as pgSchema from "./schema";

export type GoalsDatabase = NodePgDatabase<typeof pgSchema> | GoalsD1Database;

export type { NodePgDatabase };

let cachedD1Binding: D1DatabaseBinding | null = null;
let cachedD1Db: GoalsD1Database | null = null;

/** Called from Next.js middleware when running on Workers with D1. */
export function setD1Binding(binding: D1DatabaseBinding | null): void {
  cachedD1Binding = binding;
  cachedD1Db = binding ? createD1Db(binding) : null;
}

function resolveD1Db(): GoalsD1Database {
  if (cachedD1Db) return cachedD1Db;

  try {
    // OpenNext exposes Cloudflare bindings synchronously in the Workers runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: () => { env: { DB?: D1DatabaseBinding } };
    };
    const { env } = getCloudflareContext();
    if (env?.DB) {
      setD1Binding(env.DB);
      return cachedD1Db!;
    }
  } catch {
    // Fall through — instrumentation.ts may not have run yet.
  }

  throw new Error(
    "D1 database is not initialized. On Cloudflare Workers, ensure instrumentation.ts calls setD1Binding() from the DB binding. Add d1_databases to wrangler.jsonc and set DB_DIALECT=d1.",
  );
}

export function getDb(): GoalsDatabase {
  return getDbDialect() === "d1" ? resolveD1Db() : getPostgresDb();
}

/** Backward-compatible lazy proxy — typed as Postgres for call-site compatibility; D1 uses matching table/column names at runtime. */
export const db = new Proxy({} as NodePgDatabase<typeof pgSchema>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
