#!/usr/bin/env node
/**
 * Provision Cloudflare resources for goals.ac and print wrangler binding IDs.
 * Run from repo root after `pnpm exec wrangler login`.
 *
 *   node scripts/cf-provision.mjs           # create resources + print IDs
 *   node scripts/cf-provision.mjs --dry-run   # print commands only
 */
import { execSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const appDir = join(root, "artifacts/marketing-persona-app");
const dryRun = process.argv.includes("--dry-run");

function wrangler(args) {
  const cmd = `pnpm exec wrangler ${args}`;
  if (dryRun) {
    console.log(`  ${cmd}`);
    return "";
  }
  return execSync(cmd, { cwd: appDir, encoding: "utf8" }).trim();
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function createD1(name) {
  const out = wrangler(`d1 create ${name} --json`);
  const data = parseJson(out);
  return data?.uuid ?? data?.database_id ?? null;
}

function createKv(title) {
  const out = wrangler(`kv namespace create "${title}" --json`);
  const data = parseJson(out);
  return data?.id ?? null;
}

function createQueue(name) {
  try {
    wrangler(`queues create ${name}`);
  } catch (err) {
    const msg = String(err?.stderr ?? err?.message ?? err);
    if (!msg.includes("already exists")) throw err;
  }
}

console.log("goals.ac — Cloudflare resource provisioning\n");

const resources = {
  d1Production: createD1("goals-ac"),
  d1Staging: createD1("goals-ac-staging"),
  kvAiCache: createKv("goals-ac-cache"),
  kvAiCacheStaging: createKv("goals-ac-cache-staging"),
  kvRateLimit: createKv("goals-ac-ratelimit"),
  kvRateLimitStaging: createKv("goals-ac-ratelimit-staging"),
};

if (!dryRun) {
  wrangler("r2 bucket create goals-ac-next-cache");
  wrangler("r2 bucket create goals-ac-next-cache-staging");
  createQueue("goals-ac-jobs");
  createQueue("goals-ac-jobs-dlq");
  createQueue("goals-ac-jobs-staging");
  createQueue("goals-ac-jobs-staging-dlq");
}

console.log("\nPaste these IDs into wrangler.jsonc:\n");
console.log(JSON.stringify(resources, null, 2));
console.log(`
Queues (no ID — use queue names in wrangler.jsonc):
  goals-ac-jobs / goals-ac-jobs-dlq
  goals-ac-jobs-staging / goals-ac-jobs-staging-dlq

R2 buckets:
  goals-ac-next-cache
  goals-ac-next-cache-staging

Next steps:
  pnpm run cf:migrate:d1
  pnpm run cf:seed:d1
  pnpm run cf:build
`);
