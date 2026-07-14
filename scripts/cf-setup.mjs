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
const appWrangler = join(root, "artifacts/marketing-persona-app/wrangler.jsonc");
const jobsWrangler = join(root, "artifacts/cf-jobs-worker/wrangler.jsonc");
const PLACEHOLDER_D1 = "00000000-0000-0000-0000-000000000001";
const PLACEHOLDER_KV = "00000000000000000000000000000001";

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function fileContains(path, needle) {
  if (!existsSync(path)) return true;
  return readFileSync(path, "utf8").includes(needle);
}

console.log("goals.ac — Cloudflare setup checklist\n");

const steps = [
  "1. wrangler login",
  "2. node scripts/cf-provision.mjs  (D1, R2, KV, Queues)",
  "3. Paste IDs into artifacts/marketing-persona-app/wrangler.jsonc",
  "4. Paste IDs into artifacts/cf-jobs-worker/wrangler.jsonc",
  "5. pnpm run cf:migrate:d1 && pnpm run cf:seed:d1",
  "6. Set secrets: AUTH_SECRET, NEXTAUTH_URL, GEMINI_KEY_ENCRYPTION_SECRET, GEMINI_API_KEY",
  "7. pnpm run cf:build",
  "8. pnpm run cf:deploy -- --env production",
  "9. pnpm run cf:deploy:jobs -- --env production",
  "10. Connect GitHub via Workers Builds (see docs/deploy-cloudflare.md)",
  "11. Route domain: Workers → goals-ac → Domains",
  "12. Validate: curl -sS https://goals.ac/api/platform/status",
];

for (const step of steps) console.log(`  ${step}`);

if (fileContains(appWrangler, PLACEHOLDER_D1)) {
  console.log("\n⚠ App wrangler.jsonc still has placeholder D1 database_id.");
}
if (fileContains(appWrangler, PLACEHOLDER_KV)) {
  console.log("⚠ App wrangler.jsonc still has placeholder KV namespace IDs.");
}
if (!fileContains(appWrangler, PLACEHOLDER_D1) && !fileContains(appWrangler, PLACEHOLDER_KV)) {
  console.log("\n✓ App wrangler.jsonc appears configured");
}

const args = process.argv.slice(2);
if (args.includes("--provision")) run("node scripts/cf-provision.mjs");
if (args.includes("--migrate")) run("pnpm run cf:migrate:d1");
if (args.includes("--migrate-local")) run("pnpm run cf:migrate:d1:local");
if (args.includes("--build")) run("pnpm run cf:build");

console.log("\nDocs: docs/deploy-cloudflare.md");
console.log("Local Postgres jobs: artifacts/worker — see docs/worker-deploy.md\n");
