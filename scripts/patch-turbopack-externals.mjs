#!/usr/bin/env node
/**
 * Rewrite Turbopack hashed external module IDs (e.g. sharp-03c9e6d01f648d5d)
 * to real package names so OpenNext/esbuild can resolve them on Cloudflare builds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "../artifacts/marketing-persona-app");
const nodeModulesDir = path.join(appDir, ".next/node_modules");

if (!fs.existsSync(nodeModulesDir)) {
  console.warn("patch-turbopack-externals: .next/node_modules not found — skipping");
  process.exit(0);
}

/** @type {Map<string, string>} */
const mappings = new Map();

for (const entry of fs.readdirSync(nodeModulesDir, { withFileTypes: true })) {
  if (!entry.isSymbolicLink()) continue;
  try {
    const target = fs.readlinkSync(path.join(nodeModulesDir, entry.name));
    const match = target.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
    if (match?.[1]) {
      const realName = match[1].split("/")[0] ?? match[1];
      // Native sharp cannot run on Workers — map to no-op stub after OpenNext copy.
      mappings.set(entry.name, realName === "sharp" ? "sharp-stub.js" : match[1]);
    }
  } catch {
    // skip unreadable symlinks
  }
}

if (mappings.size === 0) {
  console.warn("patch-turbopack-externals: no external mappings found");
  process.exit(0);
}

/** @param {string} dir */
function patchTree(dir) {
  if (!fs.existsSync(dir)) return 0;
  let filesPatched = 0;

  for (const rel of fs.readdirSync(dir, { recursive: true })) {
    if (typeof rel !== "string" || !rel.endsWith(".js")) continue;
    const filePath = path.join(dir, rel);
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;
    for (const [hashed, realName] of mappings) {
      if (content.includes(hashed)) {
        content = content.replaceAll(hashed, realName);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(filePath, content);
      filesPatched += 1;
    }
  }

  return filesPatched;
}

const chunkRoots = [
  path.join(appDir, ".next/server/chunks"),
  path.join(appDir, ".next/server/app"),
];

let total = 0;
for (const root of chunkRoots) {
  total += patchTree(root);
}

console.log(
  `patch-turbopack-externals: rewrote ${mappings.size} package alias(es) across ${total} file(s)`,
);
