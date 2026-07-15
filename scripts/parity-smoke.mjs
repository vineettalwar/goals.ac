#!/usr/bin/env node
/**
 * Smoke-test critical API endpoints on local CF preview (:8787) or live prod.
 *
 * Usage:
 *   node scripts/parity-smoke.mjs
 *   PARITY_BASE_URL=https://api.goals.ac node scripts/parity-smoke.mjs
 *   PARITY_AUTH_COOKIE="session=..." node scripts/parity-smoke.mjs
 */
const BASE = process.env.PARITY_BASE_URL ?? "http://127.0.0.1:8787";
const AUTH_COOKIE = process.env.PARITY_AUTH_COOKIE ?? "";

const PUBLIC_CHECKS = [
  { method: "GET", path: "/api/platform/status", expect: [200] },
  { method: "GET", path: "/api/industries", expect: [200] },
  { method: "GET", path: "/api/plans", expect: [200] },
];

const AUTH_CHECKS = [
  { method: "GET", path: "/api/auth/me", expect: [200, 401] },
  { method: "GET", path: "/api/website-projects", expect: [200, 401] },
  { method: "GET", path: "/api/billing/status", expect: [200, 401, 403] },
  { method: "GET", path: "/api/goals?projectId=1", expect: [200, 401, 404] },
  { method: "GET", path: "/api/admin/overview", expect: [200, 401, 403] },
  { method: "GET", path: "/api/billing/credits", expect: [200, 401, 403] },
  { method: "GET", path: "/api/organizations/security", expect: [200, 401, 403] },
];

async function check({ method, path, expect }) {
  const headers = {};
  if (AUTH_COOKIE) headers.Cookie = AUTH_COOKIE;
  const res = await fetch(`${BASE}${path}`, { method, headers });
  const ok = expect.includes(res.status);
  return { method, path, status: res.status, ok, expect };
}

async function main() {
  console.log(`Parity smoke against ${BASE}`);
  const checks = [...PUBLIC_CHECKS, ...AUTH_CHECKS];
  const results = [];
  for (const c of checks) {
    try {
      results.push(await check(c));
    } catch (err) {
      results.push({
        method: c.method,
        path: c.path,
        status: 0,
        ok: false,
        expect: c.expect,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? "OK" : "FAIL";
    if (!r.ok) failed += 1;
    const detail = r.error ? ` (${r.error})` : "";
    console.log(`[${mark}] ${r.method} ${r.path} → ${r.status} (expected ${r.expect.join("|")})${detail}`);
  }

  if (failed > 0) {
    console.error(`\n${failed}/${results.length} checks failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
