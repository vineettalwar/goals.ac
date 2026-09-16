#!/usr/bin/env node
/**
 * Local quality gate: regenerate the parity matrix and fail if a required
 * Edge Mesh path is missing from worker sources. Not GitHub Actions.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = [
  "/api/content-strategies/:id",
  "/api/geo-audits/:id",
  "/api/seo-articles/:id",
  "/api/competitor-analyses/:id",
  "/api/keyword-analyses/:id",
  "/api/auth/me",
  "/api/auth/me/export",
  "/api/jobs/:id",
];

const gen = spawnSync(process.execPath, [path.join(ROOT, "scripts/generate-parity-matrix.mjs")], {
  stdio: "inherit",
  cwd: ROOT,
});
if (gen.status !== 0) process.exit(gen.status ?? 1);

const matrix = fs.readFileSync(path.join(ROOT, "docs/parity-matrix.md"), "utf8");
const missing = REQUIRED.filter((route) => {
  const needle = route.replace(":id", ":id");
  return !matrix.includes(`\`${needle}\``) && !matrix.includes(`- \`${needle}\``);
});

if (missing.length > 0) {
  console.error("parity:gate missing required worker paths:");
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

console.log(`parity:gate ok (${REQUIRED.length} required paths present)`);
