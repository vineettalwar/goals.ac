import "./load-workspace-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { getPostgresDb, getPostgresPool, closePostgresPool } from "./postgres.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsFolder = path.join(__dirname, "../migrations");

export async function runMigrations(migrationsFolder: string = defaultMigrationsFolder): Promise<void> {
  const db = getPostgresDb();

  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder });
    console.log("Migrations complete.");

    const { seedReferenceData } = await import("./seed-reference-data.js");
    console.log("Seeding reference data (industries, locations)...");
    await seedReferenceData();
    console.log("Reference data seed complete.");
  } finally {
    await closePostgresPool();
  }
}

