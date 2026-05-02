import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsFolder = path.join(__dirname, "../migrations");

export async function runMigrations(migrationsFolder: string = defaultMigrationsFolder): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder });
    console.log("Migrations complete.");
  } finally {
    await pool.end();
  }
}

