#!/usr/bin/env node
/**
 * Index magazine voice from WordPress site-graph into brand voice sources.
 *
 * Usage:
 *   PROJECT_ID=123 AUTH_COOKIE="session=..." node scripts/import-magazine-brand-voice.mjs
 *   BASE_URL=https://app.goals.ac  # optional, default http://localhost:3001
 *
 * Requires WP plugin HMAC connected on the project (site-graph must return posts).
 */
const projectId = process.env.PROJECT_ID;
const authCookie = process.env.AUTH_COOKIE ?? "";
const baseUrl = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const limit = Number(process.env.VOICE_SAMPLE_LIMIT ?? "5");

if (!projectId) {
  console.error("Set PROJECT_ID");
  process.exit(1);
}

if (!authCookie) {
  console.error("Set AUTH_COOKIE (logged-in session for a user with project access)");
  process.exit(1);
}

async function main() {
  const res = await fetch(`${baseUrl}/api/website-projects/${projectId}/brand-voice/resync-cms`, {
    method: "POST",
    headers: {
      Cookie: authCookie,
      Accept: "application/json",
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[FAIL] resync-cms → ${res.status}`, body);
    process.exit(1);
  }

  console.log(`[OK] Indexed ${body.ingested ?? 0} CMS posts (limit ${limit} applied server-side)`);
  if (body.sourceIds?.length) {
    console.log(`     sourceIds: ${body.sourceIds.join(", ")}`);
  }
  console.log("Wait ~1–2 min for embedding job, then verify Brand voice sources in project settings.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
