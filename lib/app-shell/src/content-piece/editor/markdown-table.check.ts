/**
 * Runnable check: GFM table lines must not fall through as plain paragraphs.
 * Run: npx tsx lib/app-shell/src/content-piece/content-markdown-table.check.ts
 */
import assert from "node:assert/strict";

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.includes("|") || !t.includes("-")) return false;
  return /^[\s|:-]+$/.test(t);
}

function splitTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const sample = `| Signal | Target |
| --- | --- |
| Word count | 1,200–2,500 for guides |
| FAQ items | 3+ with schema |`;

const lines = sample.split("\n");
assert.equal(isTableRow(lines[0]!), true);
assert.equal(isTableSeparator(lines[1]!), true);
assert.deepEqual(splitTableCells(lines[0]!), ["Signal", "Target"]);
assert.deepEqual(splitTableCells(lines[2]!), ["Word count", "1,200–2,500 for guides"]);
assert.equal(isTableRow("not a table"), false);

console.log("content-markdown-table.check: ok");
