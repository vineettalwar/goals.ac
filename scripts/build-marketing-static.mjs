#!/usr/bin/env node
/**
 * Build static marketing site for Cloudflare Pages (public routes only).
 * Temporarily hides app/api/admin routes, runs next export, restores tree.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const appDir = path.join(repoRoot, "artifacts/marketing-persona-app");
const appSrc = path.join(appDir, "src/app");
const backupRoot = path.join(appDir, ".marketing-build-backup");
const outDir = path.join(appDir, ".marketing-out");
const pagesDist = path.join(repoRoot, "artifacts/marketing-pages/dist");
const mainConfig = path.join(appDir, "next.config.ts");
const marketingConfig = path.join(appDir, "next.config.marketing.ts");
const configBackup = path.join(backupRoot, "next.config.ts.bak");

const HIDE_DIRS = [
  "(app)",
  "(auth)",
  "admin",
  "api",
  "onboarding",
  "accept-invite",
  "maintenance",
  "oauth",
  "content-piece",
  "content-pieces",
  "content-strategy",
  "dashboard",
  "audit",
  "geo-audit",
  "growth-roadmaps",
  "integrations",
  "login",
  "partner",
  "projects",
  "research",
  "search",
  "settings",
  "strategy",
  "studio",
];

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log("→ Hiding non-marketing app routes…");
rmrf(backupRoot);
fs.mkdirSync(backupRoot, { recursive: true });

for (const dir of HIDE_DIRS) {
  const src = path.join(appSrc, dir);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(backupRoot, dir);
  fs.renameSync(src, dest);
}

try {
  console.log("→ Swapping next.config.ts for marketing export…");
  if (fs.existsSync(mainConfig)) {
    fs.copyFileSync(mainConfig, configBackup);
  }
  fs.copyFileSync(marketingConfig, mainConfig);

  for (const cacheDir of [path.join(appDir, ".next"), path.join(appDir, ".marketing-out")]) {
    rmrf(cacheDir);
  }

  console.log("→ Building static marketing export…");
  execSync("pnpm exec next build", {
    cwd: appDir,
    stdio: "inherit",
    env: {
      ...process.env,
      MARKETING_STATIC: "1",
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "https://api.goals.ac",
    },
  });

  rmrf(pagesDist);
  copyDir(outDir, pagesDist);

  const redirectsSrc = path.join(repoRoot, "artifacts/marketing-pages/public/_redirects");
  if (fs.existsSync(redirectsSrc)) {
    fs.copyFileSync(redirectsSrc, path.join(pagesDist, "_redirects"));
  }

  console.log(`✓ Marketing static export → ${pagesDist}`);
} finally {
  console.log("→ Restoring app routes…");
  if (fs.existsSync(configBackup)) {
    fs.copyFileSync(configBackup, mainConfig);
  }
  for (const dir of HIDE_DIRS) {
    const backed = path.join(backupRoot, dir);
    const restore = path.join(appSrc, dir);
    if (fs.existsSync(backed)) {
      if (fs.existsSync(restore)) rmrf(restore);
      fs.renameSync(backed, restore);
    }
  }
  rmrf(backupRoot);
}
