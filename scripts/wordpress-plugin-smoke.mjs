#!/usr/bin/env node
/**
 * WordPress plugin go-live smoke — health, site-graph taxonomies, draft publish.
 *
 * Usage:
 *   WP_SITE_URL=https://staging.example.com WP_SITE_KEY=secret node scripts/wordpress-plugin-smoke.mjs
 *
 * Optional draft publish probe (creates a draft post):
 *   WP_SMOKE_PUBLISH=1 WP_SMOKE_CATEGORY=News WP_SMOKE_TAG=vegan-business node scripts/wordpress-plugin-smoke.mjs
 */
import crypto from "node:crypto";

const siteUrl = process.env.WP_SITE_URL?.replace(/\/$/, "");
const siteKey = process.env.WP_SITE_KEY?.trim();
const shouldPublish = process.env.WP_SMOKE_PUBLISH === "1";
const smokeCategory = process.env.WP_SMOKE_CATEGORY ?? "News";
const smokeTag = process.env.WP_SMOKE_TAG ?? "goals-ac-smoke";

if (!siteUrl || !siteKey) {
  console.error("Set WP_SITE_URL and WP_SITE_KEY");
  process.exit(1);
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sign(method, path, timestamp, nonce, body) {
  const canonical = [method.toUpperCase(), path, timestamp, nonce, sha256(body)].join("\n");
  return crypto.createHmac("sha256", siteKey).update(canonical).digest("hex");
}

function authHeaders(method, signPath, body) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Goals-Timestamp": timestamp,
    "X-Goals-Nonce": nonce,
    "X-Goals-Signature": sign(method, signPath, timestamp, nonce, body),
  };
}

async function pluginRequest(method, endpoint, body, extraHeaders = {}) {
  const rawBody = body === undefined ? "" : JSON.stringify(body);
  const signPath = `/goals-ac/v1/${endpoint.replace(/^\//, "")}`;
  const url = `${siteUrl}/wp-json/goals-ac/v1/${endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders(method, signPath, rawBody),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : rawBody,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function resolveTermId(name, terms) {
  const key = name.trim().toLowerCase();
  const hit = (terms ?? []).find(
    (t) => t.name?.toLowerCase() === key || t.slug?.toLowerCase() === key.replace(/\s+/g, "-"),
  );
  return hit?.id ?? null;
}

function requireEnv(key) {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

async function main() {
  console.log(`WordPress plugin smoke → ${siteUrl}`);
  let failed = 0;

  const healthRes = await fetch(`${siteUrl}/wp-json/goals-ac/v1/health`, {
    headers: { Accept: "application/json" },
  });
  const health = await healthRes.json().catch(() => ({}));
  if (!healthRes.ok) {
    console.error(`[FAIL] GET /health → ${healthRes.status}`);
    failed += 1;
  } else {
    console.log(`[OK] GET /health → plugin ${health.version ?? "?"} · WP ${health.cms_version ?? "?"}`);
    const seoPlugin = health.capabilities?.seo_plugin;
    if (seoPlugin) console.log(`     SEO plugin: ${seoPlugin}`);
  }

  const graph = await pluginRequest("GET", "site-graph");
  if (!graph.ok) {
    console.error(`[FAIL] GET /site-graph → ${graph.status}`, graph.data);
    failed += 1;
  } else {
    const categories = graph.data.categories ?? [];
    const tags = graph.data.tags ?? [];
    console.log(`[OK] GET /site-graph → ${categories.length} categories, ${tags.length} tags`);
    const catId = resolveTermId(smokeCategory, categories);
    if (catId) {
      console.log(`     Category "${smokeCategory}" → id ${catId}`);
    } else {
      console.warn(`[WARN] Category "${smokeCategory}" not found — create it in WP before go-live`);
    }
  }

  if (shouldPublish) {
    const categories = graph.data?.categories ?? [];
    const categoryId = resolveTermId(smokeCategory, categories);

    const status = process.env.WP_SMOKE_STATUS ?? "draft";
    const allowIdempotency = process.env.WP_SMOKE_IDEMPOTENCY === "1";
    const allowTaxonomyIdTest = process.env.WP_SMOKE_TAXONOMY_ID_TEST === "1";
    const allowMediaUpload = process.env.WP_SMOKE_MEDIA_UPLOAD === "1";

    const basePayload = {
      title: `goals.ac smoke ${new Date().toISOString()}`,
      content: "<p>Smoke test draft — safe to delete.</p>",
      status,
      tags: [smokeTag],
      seo: {
        metaDescription: "goals.ac WordPress plugin smoke test.",
      },
    };

    async function publishOnce(payload, idempotencyKey) {
      const headers = idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {};
      return pluginRequest("POST", "content", payload, headers);
    }

    // 1) Name-based taxonomy resolution
    const payloadName = {
      ...basePayload,
      categories: [smokeCategory],
    };
    const pub1 = await publishOnce(payloadName);
    if (!pub1.ok) {
      console.error(`[FAIL] POST /content (categories=name) → ${pub1.status}`, pub1.data);
      failed += 1;
    } else {
      console.log(`[OK] POST /content → ${pub1.data.url ?? pub1.data.remote_id}`);
    }

    // 2) Optional: numeric category ID path
    if (allowTaxonomyIdTest && categoryId) {
      const payloadId = {
        ...basePayload,
        categories: [categoryId],
      };
      const pub2 = await publishOnce(payloadId);
      if (!pub2.ok) {
        console.error(`[FAIL] POST /content (categories=id) → ${pub2.status}`, pub2.data);
        failed += 1;
      } else {
        console.log(`[OK] POST /content (id) → ${pub2.data.url ?? pub2.data.remote_id}`);
      }
    }

    // 3) Optional: upload media + attach featured image id
    if (allowMediaUpload) {
      const base64 = requireEnv("WP_SMOKE_MEDIA_BASE64");
      const filename = requireEnv("WP_SMOKE_MEDIA_FILENAME");
      const mimeType = process.env.WP_SMOKE_MEDIA_MIME_TYPE ?? "image/webp";

      const media = await pluginRequest("POST", "media", {
        filename,
        mime_type: mimeType,
        data: base64,
      });

      if (!media.ok || !media.data?.id) {
        console.error(`[FAIL] POST /media → ${media.status}`, media.data);
        failed += 1;
      } else {
        console.log(`     Media uploaded → id ${media.data.id}`);

        const payloadMedia = {
          ...basePayload,
          categories: [smokeCategory],
          featured_image_id: media.data.id,
        };
        const pub3 = await publishOnce(payloadMedia);
        if (!pub3.ok) {
          console.error(`[FAIL] POST /content (with featured_image_id) → ${pub3.status}`, pub3.data);
          failed += 1;
        } else {
          console.log(`[OK] POST /content (with featured_image_id) → ${pub3.data.url ?? pub3.data.remote_id}`);
        }
      }
    }

    // 4) Optional: idempotency replay
    if (allowIdempotency) {
      const idempotencyKey = `wp-smoke:${status}:${smokeCategory}:${smokeTag}`;
      const payloadReplay = payloadName;

      const a = await publishOnce(payloadReplay, idempotencyKey);
      const b = await publishOnce(payloadReplay, idempotencyKey);

      if (!a.ok || !b.ok) {
        console.error(`[FAIL] idempotency replay → ${a.status}/${b.status}`, a.data, b.data);
        failed += 1;
      } else if (a.data.remote_id !== b.data.remote_id) {
        console.error(
          `[FAIL] idempotency remote_id mismatch: ${a.data.remote_id} vs ${b.data.remote_id}`,
        );
        failed += 1;
      } else {
        console.log(`[OK] idempotency replay remote_id stable (${a.data.remote_id})`);
      }
    }
  } else {
    console.log("Skip publish probe (set WP_SMOKE_PUBLISH=1 to create a draft post)");
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll smoke checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
