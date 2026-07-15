#!/usr/bin/env node
/**
 * Compare local Next.js API routes vs Cloudflare edge worker handlers.
 * Output: docs/parity-matrix.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_ROOT = path.join(ROOT, "artifacts/marketing-persona-app/src/app/api");
const WORKER_SOURCES = [
  path.join(ROOT, "artifacts/cf-public-worker/src"),
  path.join(ROOT, "artifacts/cf-read-worker/src"),
  path.join(ROOT, "artifacts/cf-write-worker/src"),
  path.join(ROOT, "artifacts/cf-gateway/src/index.ts"),
];

const PHASE_MAP = [
  { pattern: /^\/api\/admin/, phase: "1-admin" },
  { pattern: /^\/api\/content-strategies/, phase: "2-studio" },
  { pattern: /^\/api\/goals/, phase: "2-studio" },
  { pattern: /^\/api\/briefs/, phase: "2-studio" },
  { pattern: /^\/api\/content-pieces/, phase: "2-studio" },
  { pattern: /^\/api\/roadmaps/, phase: "2-studio" },
  { pattern: /\/content$/, phase: "2-studio" },
  { pattern: /gsc-queries|analytics-properties|article-performance|semrush/, phase: "3-analytics" },
  { pattern: /\/social\//, phase: "4-social" },
  { pattern: /^\/api\/billing\/credits|^\/api\/webhooks\/stripe|^\/api\/auth\/mfa/, phase: "5-billing" },
  { pattern: /^\/api\/organizations\/security/, phase: "5-billing" },
];

function routePathFromFile(filePath) {
  const rel = path.relative(API_ROOT, filePath);
  const parts = rel.split(path.sep);
  parts.pop(); // route.ts
  const segments = parts.map((seg) => (seg.startsWith("[") && seg.endsWith("]") ? `:${seg.slice(1, -1)}` : seg));
  return `/api/${segments.join("/")}`.replace(/\/+/g, "/");
}

function collectLocalRoutes(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectLocalRoutes(full, acc);
    } else if (entry.name === "route.ts") {
      const routePath = routePathFromFile(full);
      const content = fs.readFileSync(full, "utf8");
      const methods = [];
      for (const m of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
        if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(content)) {
          methods.push(m);
        }
      }
      acc.push({ path: routePath, methods, file: path.relative(ROOT, full) });
    }
  }
  return acc;
}

function normalizeWorkerPattern(raw) {
  return raw
    .replace(/\\\//g, "/")
    .replace(/\(\\d\+\)/g, ":id")
    .replace(/\(\[\^\/\]\+\)/g, ":id")
    .replace(/\[\^\/\]\+/g, ":id");
}

function collectWorkerRoutes() {
  const patterns = new Set();
  const pathEqRe = /path\s*===\s*[`'"]([^`'"]+)[`'"]/g;
  const pathMatchRe = /\.match\(\s*\/\^([\s\S]+?)\$\/\s*[,)]/g;

  for (const src of WORKER_SOURCES) {
    const files = [];
    if (fs.statSync(src).isFile()) {
      files.push(src);
    } else {
      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const f = path.join(d, e.name);
          if (e.isDirectory()) walk(f);
          else if (e.name.endsWith(".ts")) files.push(f);
        }
      };
      walk(src);
    }
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      let m;
      while ((m = pathEqRe.exec(content)) !== null) {
        const p = m[1];
        if (p?.startsWith("/api") || p?.startsWith("/oauth")) {
          patterns.add(normalizeWorkerPattern(p));
        }
      }
      while ((m = pathMatchRe.exec(content)) !== null) {
        const p = normalizeWorkerPattern(m[1]);
        if (p.startsWith("/api") || p.startsWith("/oauth")) {
          patterns.add(p);
        }
      }
      if (content.includes('path.startsWith("/api/admin")')) patterns.add("/api/admin/*");
      if (content.includes('path.startsWith("/api/tools/")')) patterns.add("/api/tools/*");
      if (content.includes('path.startsWith("/api/v1/")')) patterns.add("/api/v1/*");
      if (content.includes('path === "/api/analytics/vitals"')) patterns.add("/api/analytics/vitals");
      if (content.includes('path === "/api/auth/gemini-key"')) patterns.add("/api/auth/gemini-key");
      if (content.includes('path === "/api/chat"')) patterns.add("/api/chat");
      if (content.includes('path === "/api/conversations"')) patterns.add("/api/conversations");
      if (content.includes('path === "/api/companies/humanization"')) patterns.add("/api/companies/humanization");
      if (content.includes('path === "/api/org/api-keys"')) patterns.add("/api/org/api-keys");
      if (content.includes('path === "/api/personas"')) patterns.add("/api/personas");
      if (content.includes('path === "/api/wordpress/test"')) patterns.add("/api/wordpress/test");
      if (content.includes("/repurpose/stream")) patterns.add("*/repurpose/stream");
      if (content.includes("/content-pieces/repurpose")) patterns.add("*/content-pieces/repurpose");
      if (content.includes("/deepl-credentials")) patterns.add("*/deepl-credentials");
      if (content.includes("/stock-credentials") && content.includes("website-projects")) {
        patterns.add("/api/website-projects/:id/stock-credentials");
      }
      if (content.includes("/roadmaps/") && content.includes("lead-capture")) {
        patterns.add("/api/roadmaps/:id/lead-capture");
      }
      if (content.includes('path.includes("/publish")')) patterns.add("*/publish");
      if (content.includes('path.includes("/generate")')) patterns.add("*/generate");
      if (content.includes('path.includes("/sync")')) patterns.add("*/sync");
      if (content.includes('path.includes("/scrape")')) patterns.add("*/scrape");
    }
  }
  return [...patterns].sort();
}

function workerCovers(localPath, workerPatterns) {
  if (localPath === "/api/auth/:...nextauth") {
    return true;
  }
  for (const wp of workerPatterns) {
    if (wp === localPath) return true;
    if (wp.endsWith("*") && localPath.startsWith(wp.slice(0, -1))) return true;
    if (wp.startsWith("*/") && localPath.includes(wp.slice(1))) return true;
    if (wp.includes("*")) continue;
    const escaped = wp.replace(/:id/g, "[^/]+").replace(/\//g, "\\/");
    try {
      if (new RegExp(`^${escaped}$`).test(localPath)) return true;
    } catch {
      // skip patterns that are not valid RegExp sources
    }
  }
  return false;
}

function ownerPhase(routePath) {
  for (const { pattern, phase } of PHASE_MAP) {
    if (pattern.test(routePath)) return phase;
  }
  return "core";
}

function main() {
  const localRoutes = collectLocalRoutes(API_ROOT).sort((a, b) => a.path.localeCompare(b.path));
  const workerPatterns = collectWorkerRoutes();

  const rows = localRoutes.map((r) => {
    const covered = workerCovers(r.path, workerPatterns);
    return {
      ...r,
      prod: covered ? "partial+" : "missing",
      phase: ownerPhase(r.path),
    };
  });

  const missing = rows.filter((r) => r.prod === "missing");
  const byPhase = {};
  for (const r of missing) {
    byPhase[r.phase] = (byPhase[r.phase] ?? 0) + 1;
  }

  const lines = [
    "# API parity matrix (local Next.js vs Cloudflare edge)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Metric | Count |",
    "|---|---|",
    `| Local route files | ${localRoutes.length} |`,
    `| Worker path patterns | ${workerPatterns.length} |`,
    `| Routes missing in prod scan | ${missing.length} |`,
    "",
    "## Missing routes by phase",
    "",
    "| Phase | Missing count |",
    "|---|---|",
    ...Object.entries(byPhase)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([phase, count]) => `| ${phase} | ${count} |`),
    "",
    "## Behavioral diffs (intentional)",
    "",
    "| Local | Prod |",
    "|---|---|",
    "| SSE streaming on generate/repurpose | 202 + poll GET /api/jobs/:id |",
    "| Inline AI writes | Queued via CF Queues |",
    "| NextAuth sessions | JWT httpOnly cookies |",
    "| pg-boss jobs | CF Queues + KV job status |",
    "",
    "## Full route inventory",
    "",
    "| Method | Path | Local file | Prod status | Phase |",
    "|---|---|---|---|---|",
  ];

  for (const r of rows) {
    for (const method of r.methods) {
      lines.push(`| ${method} | \`${r.path}\` | \`${r.file}\` | ${r.prod} | ${r.phase} |`);
    }
  }

  lines.push("", "## Worker patterns detected", "", ...workerPatterns.map((p) => `- \`${p}\``));

  const outPath = path.join(ROOT, "docs/parity-matrix.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
  console.log(`Wrote ${outPath} (${localRoutes.length} local routes, ${missing.length} missing)`);
}

main();
