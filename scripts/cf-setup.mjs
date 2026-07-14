#!/usr/bin/env node
/**
 * Cloudflare production bootstrap helper.
 * Run from repo root: node scripts/cf-setup.mjs
 *
 * Requires: pnpm exec wrangler login (once)
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const wranglerPath = join(root, "artifacts/marketing-persona-app/wrangler.jsonc");
const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000001";

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function wranglerNeedsD1Id() {
  if (!existsSync(wranglerPath)) return true;
  const text = readFileSync(wranglerPath, "utf8");
  return text.includes(PLACEHOLDER_ID);
}

console.log("goals.ac — Cloudflare setup checklist\n");

const steps = [
  "1. wrangler login (if not already authenticated)",
  "2. Create D1: cd artifacts/marketing-persona-app && pnpm exec wrangler d1 create goals-ac",
  "3. Copy database_id into wrangler.jsonc (d1_databases[0].database_id)",
  "4. Apply migrations: pnpm run cf:migrate:d1",
  "5. Set Worker vars: DB_DIALECT=d1, NEXTAUTH_URL=https://goals.ac",
  "6. Set secrets: AUTH_SECRET, GEMINI_KEY_ENCRYPTION_SECRET, GEMINI_API_KEY, CRON_SECRET, STRIPE_*",
  "7. Build: pnpm run cf:build (check bundle size — Workers Paid plan likely required)",
  "8. Deploy: pnpm run cf:deploy -- --env production",
  "9. Route domain in Cloudflare dashboard → Workers → goals-ac → Domains",
  "10. Validate: curl -sS https://goals.ac/api/platform/status",
];

for (const step of steps) console.log(`  ${step}`);

if (wranglerNeedsD1Id()) {
  console.log("\n⚠ wrangler.jsonc still has placeholder D1 database_id.");
  console.log("  Run: cd artifacts/marketing-persona-app && pnpm exec wrangler d1 create goals-ac");
} else {
  console.log("\n✓ D1 database_id appears configured in wrangler.jsonc");
}

const args = process.argv.slice(2);
if (args.includes("--migrate")) {
  run("pnpm run cf:migrate:d1");
}
if (args.includes("--migrate-local")) {
  run("pnpm run cf:migrate:d1:local");
}
if (args.includes("--build")) {
  run("pnpm run cf:build");
}

console.log("\nPostgres path (optional): see docs/deploy-cloudflare.md#hyperdrive-postgres-alternative");
console.log("Background jobs: deploy artifacts/worker — see docs/worker-deploy.md");
console.log("Cron backup: scripts/cron-autopilot.example.sh\n");
