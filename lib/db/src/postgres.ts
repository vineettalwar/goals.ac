import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let postgresDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPostgresPool(): pg.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Export it in your shell or add it to a `.env` or `.env.local` file at the repository root.",
    );
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export function getPostgresDb() {
  if (!postgresDb) {
    postgresDb = drizzle(getPostgresPool(), { schema });
  }
  return postgresDb;
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    postgresDb = null;
  }
}
