#!/usr/bin/env node
/**
 * Pilot E2E smoke run — exercises the full content lifecycle through Next API endpoints.
 *
 * Steps:
 *   1. WordPress health check (if WP configured on the project)
 *   2. Generate 2 content pieces via Daily Five batch endpoint
 *   3. Humanize both pieces
 *   4. Publish each to WordPress as async draft
 *   5. Poll publish-records until both show status=published (or fail)
 *
 * Env vars:
 *   BASE_URL       — App origin (default http://localhost:3001)
 *   AUTH_COOKIE    — Full cookie header value for authenticated session (required)
 *   PROJECT_ID     — Website project ID (required)
 *   TOPICS_JSON    — JSON array of 2 topic objects [{targetKeyword, angleHint, formatType}]
 *   WP_SECTION     — Section hint for daily-five items (default "news")
 *   SOURCE_URLS    — Newline or comma-separated source URLs to embed in angleHint
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const AUTH_COOKIE = process.env.AUTH_COOKIE;
const PROJECT_ID = process.env.PROJECT_ID;
const TOPICS_JSON = process.env.TOPICS_JSON;
const WP_SECTION = process.env.WP_SECTION ?? "news";
const SOURCE_URLS = process.env.SOURCE_URLS ?? "https://example.com/source-article";

if (!AUTH_COOKIE || !PROJECT_ID) {
  console.error("Required: AUTH_COOKIE, PROJECT_ID");
  process.exit(1);
}

const projectId = Number(PROJECT_ID);
const headers = { "Content-Type": "application/json", cookie: AUTH_COOKIE };

async function api(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

function buildTopics() {
  if (TOPICS_JSON) return JSON.parse(TOPICS_JSON);
  const sourceLines = SOURCE_URLS.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  const sourceBlock = sourceLines.map((u) => `Source: ${u}`).join("\n");
  return [
    {
      formatType: "seo_article",
      targetKeyword: "pilot smoke test topic A",
      angleHint: `News angle about topic A.\n${sourceBlock}`,
    },
    {
      formatType: "seo_article",
      targetKeyword: "pilot smoke test topic B",
      angleHint: `News angle about topic B.\n${sourceBlock}`,
    },
  ];
}

let failed = 0;

// Step 1: WordPress health check
async function wpHealthCheck() {
  console.log("\n── Step 1: WordPress health check");
  const res = await api("POST", `/api/website-projects/${projectId}/cms-integrations/test`, {});
  if (!res.ok) {
    console.warn(`[SKIP] CMS test endpoint returned ${res.status} — ${res.data?.error ?? "check project has WP configured"}`);
    return;
  }
  const entries = res.data?.results ?? res.data;
  if (Array.isArray(entries)) {
    for (const e of entries) {
      if (e.ok) console.log(`[OK] WP health → ${e.siteName ?? "connected"}`);
      else { console.error(`[FAIL] WP health → ${e.error}`); failed += 1; }
    }
  } else {
    console.log(`[OK] CMS test response:`, JSON.stringify(res.data).slice(0, 200));
  }
}

// Step 2: Generate 2 pieces via Daily Five
async function generatePieces() {
  console.log("\n── Step 2: Generate 2 content pieces (Daily Five)");
  const topics = buildTopics();
  const res = await api("POST", `/api/website-projects/${projectId}/content-pieces/daily-five`, {
    items: topics.slice(0, 2),
  });
  if (!res.ok) {
    console.error(`[FAIL] Daily Five → ${res.status}`, res.data?.error ?? res.data);
    failed += 1;
    return [];
  }
  if (res.data.failures?.length) {
    for (const f of res.data.failures) {
      console.error(`[FAIL] item ${f.index}: ${f.error}`);
      failed += 1;
    }
  }
  const pieces = res.data.created ?? [];
  console.log(`[OK] Generated ${pieces.length} piece(s)`);
  for (const p of pieces) console.log(`     id=${p.id} "${p.title}"`);
  return pieces;
}

// Step 3: Humanize each piece
async function humanizePieces(pieces) {
  console.log("\n── Step 3: Humanize pieces");
  for (const p of pieces) {
    const res = await api("POST", `/api/content-pieces/${p.id}/humanize`, {});
    if (!res.ok) {
      console.error(`[FAIL] Humanize piece ${p.id} → ${res.status}: ${res.data?.error}`);
      failed += 1;
    } else {
      console.log(`[OK] Humanized piece ${p.id}`);
    }
  }
}

// Step 4: Publish each to WordPress as async draft
async function publishPieces(pieces) {
  console.log("\n── Step 4: Publish to WordPress (async)");
  for (const p of pieces) {
    const res = await api("POST", `/api/content-pieces/${p.id}/publish`, {
      platform: "wordpress",
      async: true,
    });
    if (!res.ok) {
      console.error(`[FAIL] Publish piece ${p.id} → ${res.status}: ${res.data?.error}`);
      failed += 1;
    } else {
      console.log(`[OK] Publish queued for piece ${p.id}`);
    }
  }
}

// Step 5: Poll publish-records
async function pollPublishRecords(pieces) {
  console.log("\n── Step 5: Poll publish-records");
  const pieceIds = new Set(pieces.map((p) => p.id));
  const maxAttempts = 30;
  const intervalMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await api("GET", `/api/website-projects/${projectId}/publish-records`, null);
    if (!res.ok) {
      console.error(`[FAIL] GET publish-records → ${res.status}`);
      failed += 1;
      return;
    }
    const records = res.data?.records ?? [];
    const matched = records.filter((r) => pieceIds.has(r.contentPieceId));
    const published = matched.filter((r) => r.status === "published");
    const errored = matched.filter((r) => r.status === "failed" || r.status === "error");

    if (published.length >= pieceIds.size) {
      console.log(`[OK] All ${published.length} piece(s) published`);
      for (const r of published) console.log(`     piece ${r.contentPieceId} → ${r.remoteUrl ?? r.remoteId ?? "done"}`);
      return;
    }
    if (errored.length > 0) {
      for (const r of errored) {
        console.error(`[FAIL] piece ${r.contentPieceId} publish failed: ${r.errorMessage ?? r.status}`);
        failed += 1;
      }
      return;
    }
    if (attempt < maxAttempts) {
      process.stdout.write(`  polling ${attempt}/${maxAttempts} (${matched.length} records found)...\r`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  console.error(`[FAIL] Timed out waiting for publish records`);
  failed += 1;
}

async function main() {
  console.log(`Pilot E2E smoke → ${BASE_URL} project=${projectId}`);
  await wpHealthCheck();
  const pieces = await generatePieces();
  if (pieces.length === 0) { console.error("No pieces generated, aborting"); process.exit(1); }
  await humanizePieces(pieces);
  await publishPieces(pieces);
  await pollPublishRecords(pieces);

  console.log("");
  if (failed > 0) {
    console.error(`✗ ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("✓ Pilot E2E smoke passed");
}

main().catch((err) => { console.error(err); process.exit(1); });
