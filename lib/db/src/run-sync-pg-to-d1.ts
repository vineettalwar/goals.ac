/**
 * Sync local Postgres app data into remote (or local) D1.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goalsac \
 *     pnpm --filter @workspace/db run sync-pg-to-d1
 *
 *   pnpm --filter @workspace/db run sync-pg-to-d1:local
 */
import "./load-workspace-env";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  SYNC_TABLE_ORDER,
  buildSyncSqlFromPostgres,
  type PgPool,
} from "./sync-pg-to-d1.js";
import { wranglerChildEnv } from "./cf-wrangler-env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const wranglerConfig = path.join(repoRoot, "artifacts/cf-read-worker/wrangler.jsonc");
const wranglerBin = path.join(repoRoot, "artifacts/cf-read-worker/node_modules/.bin/wrangler");
const databaseName = process.env.D1_DATABASE_NAME ?? "goals-ac";
const local = process.argv.includes("--local");
const dryRun = process.argv.includes("--dry-run");

async function fetchD1Columns(table: string): Promise<Set<string>> {
  const target = local ? ["--local"] : ["--remote"];
  const result = spawnSync(
    wranglerBin,
    [
      "d1",
      "execute",
      databaseName,
      "--config",
      wranglerConfig,
      ...target,
      "--command",
      `PRAGMA table_info('${table}');`,
      "--json",
    ],
    { cwd: repoRoot, encoding: "utf8", env: wranglerChildEnv(wranglerConfig) },
  );

  if (result.status !== 0) {
    console.warn(`Skip ${table}: no D1 table (${result.stderr?.trim() || "missing"})`);
    return new Set();
  }

  try {
    const parsed = JSON.parse(result.stdout) as Array<{
      results: Array<{ name: string }>;
    }>;
    const rows = parsed[0]?.results ?? [];
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

async function loadD1Schema(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  for (const table of SYNC_TABLE_ORDER) {
    map.set(table, await fetchD1Columns(table));
  }
  return map;
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/goalsac";
  const pool = new pg.Pool({ connectionString });

  console.log(`Reading Postgres: ${connectionString.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`D1 target: ${databaseName} (${local ? "local" : "remote"})`);

  const d1ColumnsByTable = await loadD1Schema();
  const { sql, summary } = await buildSyncSqlFromPostgres(pool as PgPool, d1ColumnsByTable);
  await pool.end();

  if (summary.length === 0) {
    console.log("No Postgres rows to sync.");
    process.exit(0);
  }

  console.log("\nTables to sync:");
  for (const row of summary) {
    console.log(`  ${row.table}: ${row.rows} row(s)`);
  }

  const adminTail = `
-- Re-provision production admin not present in local Postgres
INSERT INTO users (email, password_hash, name, role, plan, mfa_enabled, created_at, updated_at)
SELECT 'vineettalwar007@gmail.com', '$2b$10$Jxqq3ECeOPAlekbKCq1tn.G5G7NLAdFZJo0mmo.X2FcInhVoPjcuO', 'Vineet Talwar', 'super_admin', 'starter', 0, strftime('%s','now') * 1000, strftime('%s','now') * 1000
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vineettalwar007@gmail.com');
UPDATE users SET role = 'super_admin' WHERE email IN ('demo@gold.edu', 'vineettalwar007@gmail.com');
`;

  const tmpFile = path.join(os.tmpdir(), `goals-ac-pg-d1-sync-${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, sql + adminTail);

  if (dryRun) {
    console.log(`\nDry run — SQL written to ${tmpFile}`);
    process.exit(0);
  }

  const result = spawnSync(
    wranglerBin,
    [
      "d1",
      "execute",
      databaseName,
      "--config",
      wranglerConfig,
      "--file",
      tmpFile,
      ...(local ? ["--local"] : ["--remote"]),
    ],
    { cwd: repoRoot, stdio: "inherit", env: wranglerChildEnv(wranglerConfig) },
  );

  if (result.status !== 0) {
    console.error(`\nSQL file kept at ${tmpFile}`);
    process.exit(result.status ?? 1);
  }

  fs.unlinkSync(tmpFile);
  console.log("\nPostgres → D1 sync complete.");
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
