#!/usr/bin/env node
/**
 * Incident simulation — publish failure + recovery.
 *
 * Goal:
 *  1) Force a deterministic publish failure so the synchronous publish endpoint
 *     writes a `publish_records` row with status = 'failed'.
 *  2) Republish the same content piece with a valid WordPress payload and verify
 *     `publish_records` transitions to status = 'published'.
 *
 * Env:
 *  AUTH_COOKIE: logged-in session cookie for a user with access to PROJECT_ID
 *  PROJECT_ID: website_project_id (numeric)
 *  BASE_URL: e.g. http://localhost:3001 (defaults to http://localhost:3001)
 */

const authCookie = process.env.AUTH_COOKIE ?? "";
const projectIdRaw = process.env.PROJECT_ID ?? "";
const baseUrl = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

if (!authCookie) {
  console.error("Missing AUTH_COOKIE");
  process.exit(1);
}
if (!projectIdRaw) {
  console.error("Missing PROJECT_ID");
  process.exit(1);
}

const projectId = Number(projectIdRaw);
if (!Number.isFinite(projectId) || !Number.isInteger(projectId) || projectId <= 0) {
  console.error("PROJECT_ID must be a positive integer");
  process.exit(1);
}

const invalidWordPressConnectionId = Number(process.env.INVALID_WP_CONNECTION_ID ?? "2147483647");

const invalidConnExpectation = "WordPress connection not found";

function requireOk(res, label) {
  if (res.ok) return;
  console.error(`[FAIL] ${label} → HTTP ${res.status}`);
  process.exit(1);
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function getPublishRecords() {
  const res = await fetch(`${baseUrl}/api/website-projects/${projectId}/publish-records`, {
    method: "GET",
    headers: {
      Cookie: authCookie,
      Accept: "application/json",
    },
  });

  requireOk(res, "GET publish-records");
  const data = await readJson(res);
  return data?.records;
}

async function main() {
  console.log(`Incident simulation → project ${projectId}`);
  console.log(`Base URL: ${baseUrl}`);

  // 1) Create a real content piece to publish.
  // This uses the same Next API generation path as Daily Five.
  const targetKeyword = `incident-sim-${Date.now()}`;
  const createRes = await fetch(`${baseUrl}/api/website-projects/${projectId}/content-pieces`, {
    method: "POST",
    headers: {
      Cookie: authCookie,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      formatType: "blog_post",
      targetKeyword,
      angleHint: "incident simulation: forced publish failure + recovery",
      cmsCategories: ["News"],
      cmsTags: ["goals-ac-incident-sim"],
      // Let the publish endpoint pick the connected WordPress destination.
      intendedPublishPlatform: "wordpress",
    }),
  });

  const createData = await readJson(createRes);
  if (!createRes.ok) {
    console.error("[FAIL] Create content piece");
    console.error(createData ?? {});
    process.exit(1);
  }

  const pieceId = createData?.id;
  if (!pieceId || !Number.isInteger(pieceId)) {
    console.error("[FAIL] Create content piece → missing/invalid id");
    console.error(createData ?? {});
    process.exit(1);
  }

  console.log(`Created content piece ${pieceId}`);

  // Helper to confirm record status.
  async function findLatestRecordStatus() {
    const records = await getPublishRecords();
    const pieceRecords = (records ?? []).filter((r) => r.contentPieceId === pieceId);
    const latest = pieceRecords
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
      })[0];
    return { records, pieceRecords, latest };
  }

  // 2) Forced failure: pass an intentionally invalid wordpressConnectionId.
  const failRes = await fetch(`${baseUrl}/api/content-pieces/${pieceId}/publish`, {
    method: "POST",
    headers: {
      Cookie: authCookie,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      wordpressConnectionId: invalidWordPressConnectionId,
    }),
  });

  const failBody = await readJson(failRes);
  if (failRes.ok) {
    console.error("[FAIL] Forced failure unexpectedly succeeded");
    console.error(failBody ?? {});
    process.exit(1);
  }

  console.log(`Forced failure → HTTP ${failRes.status}`);

  const { pieceRecords: afterFailureRecords, latest: afterFailureLatest } = await findLatestRecordStatus();
  const failedRecord = afterFailureRecords
    .filter((r) => r.status === "failed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!failedRecord) {
    console.error("[FAIL] Expected publish_records row with status=failed, but none found");
    console.error(afterFailureRecords);
    process.exit(1);
  }

  if (!String(failedRecord.errorMessage ?? "").includes(invalidConnExpectation)) {
    console.error("[FAIL] Failed record error_message did not match expected deterministic error");
    console.error({
      expected: invalidConnExpectation,
      actual: failedRecord.errorMessage,
      latest: afterFailureLatest,
      allPieceRecords: afterFailureRecords,
    });
    process.exit(1);
  }

  console.log(`Failure recorded → publish_records status='failed' (id=${failedRecord.id})`);

  // 3) Recovery: republish the same content piece with normal WordPress payload.
  // We don't rely on wordpressConnectionId here (only the failure step uses it).
  const recoverRes = await fetch(`${baseUrl}/api/content-pieces/${pieceId}/publish`, {
    method: "POST",
    headers: {
      Cookie: authCookie,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      platform: "wordpress",
    }),
  });

  const recoverBody = await readJson(recoverRes);
  if (!recoverRes.ok) {
    console.error("[FAIL] Recovery publish failed");
    console.error(recoverBody ?? {});
    process.exit(1);
  }

  console.log(`Recovery publish → HTTP ${recoverRes.status}`);

  // Wait a tiny bit in case external WP adapter finishes slightly after DB commit.
  // (Synchronous path should usually be immediate, but this is harmless.)
  await new Promise((r) => setTimeout(r, 500));

  const { pieceRecords: afterRecoveryRecords } = await findLatestRecordStatus();
  const publishedRecord = afterRecoveryRecords
    .filter((r) => r.status === "published")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!publishedRecord) {
    console.error("[FAIL] Recovery did not produce a publish_records row with status='published'");
    console.error(afterRecoveryRecords);
    process.exit(1);
  }

  console.log(
    `Recovery verified → publish_records status='published' (id=${publishedRecord.id}, remoteUrl=${
      publishedRecord.remoteUrl ?? "n/a"
    })`,
  );

  console.log("Incident simulation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

