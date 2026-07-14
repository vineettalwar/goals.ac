#!/usr/bin/env node
/**
 * Provision Cloudflare resources for goals.ac and print wrangler binding IDs.
 * Run from repo root after `pnpm exec wrangler login`.
 *
 *   node scripts/cf-provision.mjs           # create resources + print IDs
 *   node scripts/cf-provision.mjs --dry-run   # print commands only
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const appDir = join(root, "artifacts/marketing-persona-app");
const dryRun = process.argv.includes("--dry-run");
const cfAccount = JSON.parse(
  readFileSync(join(root, "scripts/cloudflare-account.json"), "utf8"),
);

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function wrangler(args, { allowFail = false } = {}) {
  const cmd = `pnpm exec wrangler ${args}`;
  if (dryRun) {
    console.log(`  ${cmd}`);
    return "";
  }
  try {
    return execSync(cmd, {
      cwd: appDir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: cfAccount.account_id,
      },
    }).trim();
  } catch (err) {
    const combined = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    if (allowFail) return combined;
    throw new Error(combined || err.message);
  }
}

function extractJsonField(stdout, field) {
  const re = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`);
  return stdout.match(re)?.[1] ?? null;
}

function findD1Id(name) {
  const out = wrangler(`d1 info ${name}`, { allowFail: true });
  return out.match(UUID_RE)?.[0] ?? null;
}

function createD1(name) {
  console.log(`→ D1: ${name}`);
  const out = wrangler(`d1 create ${name}`, { allowFail: true });
  if (/Successfully created DB/i.test(out)) {
    return extractJsonField(out, "database_id") ?? findD1Id(name);
  }
  if (/already exists|UNIQUE constraint failed/i.test(out)) {
    console.log(`  already exists — reusing`);
    return findD1Id(name);
  }
  if (out.includes("[ERROR]")) throw new Error(out);
  return extractJsonField(out, "database_id") ?? findD1Id(name);
}

function listKvNamespaces() {
  const out = wrangler("kv namespace list", { allowFail: true });
  try {
    return JSON.parse(out);
  } catch {
    return [];
  }
}

function findKvId(title) {
  return listKvNamespaces().find((n) => n.title === title)?.id ?? null;
}

function createKv(title) {
  console.log(`→ KV: ${title}`);
  const out = wrangler(`kv namespace create "${title}"`, { allowFail: true });
  if (/Success!/i.test(out)) {
    return extractJsonField(out, "id") ?? findKvId(title);
  }
  if (/already exists|UNIQUE constraint failed/i.test(out)) {
    console.log(`  already exists — reusing`);
    return findKvId(title);
  }
  if (out.includes("[ERROR]")) throw new Error(out);
  return extractJsonField(out, "id") ?? findKvId(title);
}

function createQueue(name) {
  console.log(`→ Queue: ${name}`);
  const out = wrangler(`queues create ${name}`, { allowFail: true });
  if (out.includes("[ERROR]") && !/already exists/i.test(out)) {
    throw new Error(out);
  }
}

function createR2(name) {
  console.log(`→ R2: ${name}`);
  const out = wrangler(`r2 bucket create ${name}`, { allowFail: true });
  if (out.includes("[ERROR]")) {
    if (/already exists|Bucket name already taken/i.test(out)) {
      console.log(`  already exists — reusing`);
      return;
    }
    if (/enable R2|code: 10042/i.test(out)) {
      console.log(
        `  ⚠ R2 not enabled on ${cfAccount.account_name}. Enable R2 in the dashboard, then re-run.`,
      );
      return;
    }
    throw new Error(out);
  }
}

console.log("goals.ac — Cloudflare resource provisioning\n");
console.log(`Account: ${cfAccount.account_name} (${cfAccount.account_id})\n`);

const resources = {
  d1Production: createD1("goals-ac"),
  d1Staging: createD1("goals-ac-staging"),
  kvAiCache: createKv("goals-ac-cache"),
  kvAiCacheStaging: createKv("goals-ac-cache-staging"),
  kvRateLimit: createKv("goals-ac-ratelimit"),
  kvRateLimitStaging: createKv("goals-ac-ratelimit-staging"),
};

if (!dryRun) {
  createR2("goals-ac-next-cache");
  createR2("goals-ac-next-cache-staging");
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

Files to update:
  artifacts/marketing-persona-app/wrangler.jsonc
  artifacts/cf-jobs-worker/wrangler.jsonc

Next steps:
  pnpm run cf:migrate:d1
  pnpm run cf:seed:d1
  pnpm run cf:build
`);
