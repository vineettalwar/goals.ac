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
const outDir = path.join(appDir, "out");
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

/** Load stylesheets without blocking first paint — critical CSS is inlined in layout. */
function deferRenderBlockingCss(html) {
  return html.replace(
    /<link rel="stylesheet" href="([^"]+)"([^>]*)\/?>/g,
    (_, href, attrs) => {
      const attrSuffix = attrs.trim() ? ` ${attrs.trim()}` : "";
      return (
        `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'"${attrSuffix}>` +
        `<noscript><link rel="stylesheet" href="${href}"${attrSuffix}></noscript>`
      );
    },
  );
}

function walkHtmlFiles(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(fullPath, visitor);
      continue;
    }
    if (entry.name.endsWith(".html")) visitor(fullPath);
  }
}

function deferCssInStaticExport(distDir) {
  walkHtmlFiles(distDir, (filePath) => {
    const html = fs.readFileSync(filePath, "utf8");
    const next = deferRenderBlockingCss(html);
    if (next !== html) fs.writeFileSync(filePath, next);
  });
}

/** Next.js injects polyfill-module unconditionally; strip it for modern-browser targets. */
function stripLegacyPolyfills(distDir) {
  const chunksDir = path.join(distDir, "_next/static/chunks");
  if (!fs.existsSync(chunksDir)) return;

  const startMarker =
    '"trimStart"in String.prototype||(String.prototype.trimStart=String.prototype.trimLeft)';
  const endPattern =
    /"canParse"in URL\|\|\(URL\.canParse=function\([^)]+\)\{try\{[^}]+\}catch\([^)]+\)\{return!1\}\}\)/;

  for (const entry of fs.readdirSync(chunksDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const filePath = path.join(chunksDir, entry.name);
    const code = fs.readFileSync(filePath, "utf8");
    const start = code.indexOf(startMarker);
    if (start < 0) continue;

    const tail = code.slice(start);
    const endMatch = tail.match(endPattern);
    if (!endMatch || endMatch.index === undefined) continue;

    const end = start + endMatch.index + endMatch[0].length;
    fs.writeFileSync(filePath, code.slice(0, start) + code.slice(end));
    console.log(
      `  stripped ${end - start} B legacy polyfills from _next/static/chunks/${entry.name}`,
    );
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

  for (const cacheDir of [path.join(appDir, ".next"), path.join(appDir, "out")]) {
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
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
      NEXT_PUBLIC_DEPLOY_STAGE: process.env.NEXT_PUBLIC_DEPLOY_STAGE ?? "production",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://goals.ac",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "https://goals.ac",
    },
  });

  rmrf(pagesDist);
  copyDir(outDir, pagesDist);
  stripLegacyPolyfills(pagesDist);
  deferCssInStaticExport(pagesDist);

  const redirectsSrc = path.join(repoRoot, "artifacts/marketing-pages/public/_redirects");
  if (fs.existsSync(redirectsSrc)) {
    fs.copyFileSync(redirectsSrc, path.join(pagesDist, "_redirects"));
  }

  const headersSrc = path.join(repoRoot, "artifacts/marketing-pages/public/_headers");
  if (fs.existsSync(headersSrc)) {
    fs.copyFileSync(headersSrc, path.join(pagesDist, "_headers"));
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
