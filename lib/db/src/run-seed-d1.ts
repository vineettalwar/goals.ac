/**
 * Seed industries + locations into D1 via wrangler (no Worker runtime required).
 *
 * Usage:
 *   pnpm --filter @workspace/db run seed:d1
 *   pnpm --filter @workspace/db run seed:d1:local
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReferenceDataSeedSql } from "./reference-data-constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const wranglerConfig = path.join(
  repoRoot,
  "artifacts/marketing-persona-app/wrangler.jsonc",
);
const wranglerBin = path.join(
  repoRoot,
  "artifacts/marketing-persona-app/node_modules/.bin/wrangler",
);
const databaseName = process.env.D1_DATABASE_NAME ?? "goals-ac";
const local = process.argv.includes("--local");

const sql = buildReferenceDataSeedSql();
const tmpFile = path.join(os.tmpdir(), `goals-ac-d1-seed-${Date.now()}.sql`);
fs.writeFileSync(tmpFile, sql);

try {
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
    { cwd: repoRoot, stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log("D1 reference data seed complete.");
} finally {
  fs.unlinkSync(tmpFile);
}
