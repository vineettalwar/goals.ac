/**
 * Apply Drizzle SQLite migrations to a D1 database via wrangler.
 * Usage (from repo root):
 *   pnpm --filter @workspace/db run migrate:d1
 *   pnpm --filter @workspace/db run migrate:d1:local
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const wranglerConfig = path.join(
  repoRoot,
  "artifacts/marketing-persona-app/wrangler.jsonc",
);
const databaseName = process.env.D1_DATABASE_NAME ?? "goals-ac";

const local = process.argv.includes("--local");
const wranglerBin = path.join(
  repoRoot,
  "artifacts/marketing-persona-app/node_modules/.bin/wrangler",
);
const args = [
  wranglerBin,
  "d1",
  "migrations",
  "apply",
  databaseName,
  "--config",
  wranglerConfig,
  ...(local ? ["--local"] : []),
];

const result = spawnSync(wranglerBin, args.slice(1), {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
