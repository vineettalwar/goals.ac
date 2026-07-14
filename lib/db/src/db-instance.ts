import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { resolveD1Db, setD1Binding } from "./d1-binding";
import { getDbDialect } from "./dialect";
import type { GoalsD1Database } from "./d1";
import { getPostgresDb } from "./postgres";
import * as pgSchema from "./schema";

export type GoalsDatabase = NodePgDatabase<typeof pgSchema> | GoalsD1Database;

export type { NodePgDatabase };

export { setD1Binding };

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
