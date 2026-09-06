#!/usr/bin/env node
/**
 * Locks APP_SHELL_PAGE chrome: left-aligned, shared gutters, only 5xl/7xl.
 * Run: node lib/app-shell/scripts/check-page-chrome.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/shell-constants.ts"), "utf8");

assert.match(src, /export const APP_SHELL_PAGE = "w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8"/);
assert.match(src, /export const APP_SHELL_PAGE_WIDE = "w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"/);
assert.doesNotMatch(src, /APP_SHELL_PAGE(?:_WIDE)? = "[^"]*mx-auto/);

console.log("ok: APP_SHELL_PAGE chrome locked (left-aligned 5xl/7xl, shared gutters)");
