/**
 * One-way mechanical conversion: lib/db/src/schema/*.ts → lib/db/src/schema-sqlite/*.ts
 * Re-run after Postgres schema changes, then: pnpm --filter @workspace/db run generate:d1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src/schema");
const outDir = path.join(__dirname, "../src/schema-sqlite");

const SKIP = new Set(["index.ts", "relations.ts", "pgvector.ts"]);

function buildSqliteImport(content) {
  const needed = new Set(["sqliteTable"]);
  if (/\btext\(/.test(content)) needed.add("text");
  if (/\binteger\(/.test(content) || /serial\(/.test(content)) needed.add("integer");
  if (/\breal\(/.test(content)) needed.add("real");
  if (/boolean\(/.test(content)) needed.add("integer");
  if (/timestamp\(/.test(content)) needed.add("integer");
  if (/jsonb\(/.test(content)) needed.add("text");
  if (/numeric\(/.test(content)) needed.add("text");
  if (/date\(/.test(content)) needed.add("text");
  if (/uniqueIndex\(/.test(content)) needed.add("uniqueIndex");
  if (/\bindex\(/.test(content)) needed.add("index");
  if (/unique\(/.test(content)) needed.add("unique");
  return `import { ${[...needed].join(", ")} } from "drizzle-orm/sqlite-core";`;
}

function convert(content, filename) {
  if (filename === "stock-credentials.ts" || filename === "platform_voices.ts") {
    return content;
  }

  let out = content.replace(/import\s*\{[^}]+\}\s*from\s*"drizzle-orm\/pg-core";/, "");

  out = buildSqliteImport(out) + "\n" + out.trimStart();

  out = out.replace(/\bpgTable\b/g, "sqliteTable");
  out = out.replace(
    /serial\("([^"]+)"\)\.primaryKey\(\)/g,
    'integer("$1").primaryKey({ autoIncrement: true })',
  );
  out = out.replace(/boolean\("([^"]+)"\)/g, 'integer("$1", { mode: "boolean" })');
  out = out.replace(
    /timestamp\("([^"]+)",\s*\{\s*withTimezone:\s*true\s*\}\)\s*\.notNull\(\)\s*\.defaultNow\(\)\s*\.\$onUpdate\(\(\)\s*=>\s*new Date\(\)\)/g,
    'integer("$1", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date())',
  );
  out = out.replace(
    /timestamp\("([^"]+)",\s*\{\s*withTimezone:\s*true\s*\}\)\s*\.notNull\(\)\s*\.defaultNow\(\)/g,
    'integer("$1", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date())',
  );
  out = out.replace(
    /timestamp\("([^"]+)",\s*\{\s*withTimezone:\s*true\s*\}\)/g,
    'integer("$1", { mode: "timestamp_ms" })',
  );
  out = out.replace(/jsonb\("([^"]+)"\)/g, 'text("$1", { mode: "json" })');
  out = out.replace(
    /text\("([^"]+)"\)\.array\(\)\.notNull\(\)\.default\(\[\]\)/g,
    'text("$1", { mode: "json" }).$type<string[]>().notNull().default([])',
  );
  out = out.replace(
    /text\("([^"]+)"\)\.array\(\)\.notNull\(\)/g,
    'text("$1", { mode: "json" }).$type<string[]>().notNull()',
  );
  out = out.replace(/numeric\("([^"]+)",\s*\{[^}]+\}\)/g, 'text("$1")');
  out = out.replace(/\bdate\("([^"]+)"\)/g, 'text("$1")');
  out = out.replace(
    /import\s*\{\s*vector768\s*\}\s*from\s*"\.\/pgvector";/g,
    'import { embedding768 } from "./embedding";',
  );
  out = out.replace(/vector768\(/g, "embedding768(");
  out = out.replace(/\.default\(\{\}\)/g, ".default({} as Record<string, unknown>)");

  return out;
}

fs.mkdirSync(outDir, { recursive: true });

for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith(".ts") || SKIP.has(file)) continue;
  const raw = fs.readFileSync(path.join(srcDir, file), "utf8");
  fs.writeFileSync(path.join(outDir, file), convert(raw, file));
}

fs.writeFileSync(
  path.join(outDir, "embedding.ts"),
  `/** SQLite/D1 embedding storage — JSON float array (768-dim Gemini text-embedding-004). */
import { text } from "drizzle-orm/sqlite-core";

export function embedding768(name: string) {
  return text(name, { mode: "json" }).$type<number[]>().notNull();
}
`,
);

const exports = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts")
  .map((f) => f.replace(".ts", ""))
  .sort();

fs.writeFileSync(
  path.join(outDir, "index.ts"),
  `${exports.map((e) => `export * from "./${e}";`).join("\n")}\nexport * from "./relations";\n`,
);

fs.writeFileSync(path.join(outDir, "relations.ts"), fs.readFileSync(path.join(srcDir, "relations.ts"), "utf8"));

console.log(`Wrote ${exports.length + 2} files to ${outDir}`);
