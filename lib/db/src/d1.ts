import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema-sqlite";

export type GoalsD1Database = DrizzleD1Database<typeof schema>;

/** Minimal D1 surface — avoids hard dependency on @cloudflare/workers-types in lib/db. */
export type D1DatabaseBinding = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => unknown;
    run: () => Promise<unknown>;
    all: () => Promise<unknown>;
  };
  batch: (statements: unknown[]) => Promise<unknown[]>;
  exec: (query: string) => Promise<unknown>;
};

export function createD1Db(binding: D1DatabaseBinding): GoalsD1Database {
  return drizzle(binding as Parameters<typeof drizzle>[0], { schema });
}

export { schema as d1Schema };
