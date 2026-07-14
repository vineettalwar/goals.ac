import { getDb, setD1Binding } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import {
  contactSubmissionsTable,
  industriesTable,
  locationsTable,
  platformSettingsTable,
  waitlistSignupsTable,
} from "@workspace/db/schema-sqlite";
import { seedReferenceDataIfEmpty } from "@workspace/db/reference-data";
import { asc, eq } from "drizzle-orm";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { scoreMetaTags } from "@workspace/seo-tools/freeTools";
import { wireCfEdgeEnv } from "@workspace/cf-edge/wire";
import { corsPreflight, withCors } from "@workspace/cf-edge/cors";
import {
  handleAuthLogin,
  handleAuthLogout,
  handleAuthSignup,
} from "./auth";
import { kvGetJson, kvPutJson } from "@workspace/cf-edge/kv-cache";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { z } from "zod";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  AUTH_SECRET: string;
}

/** D1-only worker — `getDb()` is always SQLite after `setD1Binding()`. */
function db(): GoalsD1Database {
  return getDb() as GoalsD1Database;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function rateLimitKv(
  env: Env,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const kv = env.RATE_LIMIT;
  if (!kv) return false;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const rk = `rl:${key}:${bucket}`;
  const raw = await kv.get(rk, "text");
  const count = raw ? Number.parseInt(raw, 10) : 0;
  if (count >= limit) return true;
  await kv.put(rk, String(count + 1), { expirationTtl: windowSec + 5 });
  return false;
}

async function cachedReference<T>(
  env: Env,
  key: string,
  loader: () => Promise<T>,
  ttl = 86_400,
): Promise<T> {
  const hit = await kvGetJson<T>(env.AI_CACHE, key);
  if (hit) return hit;
  const data = await loader();
  await kvPutJson(env.AI_CACHE, key, data, ttl);
  return data;
}

async function platformStatus(env: Env) {
  const cacheKey = "platform:status:v2";
  const cached = await kvGetJson<{ status: string; message?: string }>(
    env.AI_CACHE,
    cacheKey,
  );
  if (cached) return cached;

  let enabled = true;
  let maintenanceMessage: string | null = null;
  try {
    const [row] = await db()
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1));
    enabled = row?.platformEnabled ?? true;
    maintenanceMessage = row?.maintenanceMessage ?? null;
  } catch {
    // Empty or unmigrated platform_settings — treat as operational on edge.
  }

  const payload = enabled
    ? { status: "operational" as const }
    : {
        status: "maintenance" as const,
        message:
          maintenanceMessage ??
          "We're performing scheduled maintenance. Please check back shortly.",
      };
  await kvPutJson(env.AI_CACHE, cacheKey, payload, 30);
  return payload;
}

const contactBody = z.object({
  email: z.string().email(),
  message: z.string().max(5000).optional(),
});

const waitlistBody = z.object({
  email: z.string().email(),
  featureKey: z.string().min(1).max(64),
});

const urlBody = z.object({ url: z.string().url() });

const geoBody = z.object({
  url: z
    .string()
    .min(1)
    .transform((u) => (u.startsWith("http") ? u : `https://${u}`))
    .pipe(z.string().url()),
});

async function handle(request: Request, env: Env): Promise<Response> {
  const preflight = corsPreflight(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (path === "/api/platform/status" && request.method === "GET") {
      const body = await platformStatus(env).catch(() => ({ status: "operational" as const }));
      return withCors(request, Response.json(body, { headers: { "Cache-Control": "no-store" } }));
    }

    if (path === "/api/industries" && request.method === "GET") {
      const industries = await cachedReference(env, "ref:industries", async () => {
        await seedReferenceDataIfEmpty();
        return db().select().from(industriesTable).orderBy(asc(industriesTable.name));
      });
      return withCors(request, Response.json(industries));
    }

    if (path === "/api/locations" && request.method === "GET") {
      const locations = await cachedReference(env, "ref:locations", async () => {
        await seedReferenceDataIfEmpty();
        return db().select().from(locationsTable).orderBy(asc(locationsTable.name));
      });
      return withCors(request, Response.json(locations));
    }

    if (path === "/api/auth/login" && request.method === "POST") {
      const ip = clientIp(request);
      if (await rateLimitKv(env, `auth-login:${ip}`, 20, 900)) {
        return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
      }
      const response = await handleAuthLogin(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/signup" && request.method === "POST") {
      const ip = clientIp(request);
      if (await rateLimitKv(env, `auth-signup:${ip}`, 10, 3600)) {
        return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
      }
      const response = await handleAuthSignup(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/logout" && request.method === "POST") {
      const response = handleAuthLogout(request);
      return withCors(request, response);
    }

    if (path === "/api/contact" && request.method === "POST") {
      const parsed = contactBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(request, Response.json({ error: "Valid email required" }, { status: 400 }));
      }
      await db().insert(contactSubmissionsTable).values({
        email: parsed.data.email.toLowerCase(),
        message: parsed.data.message?.trim() || null,
      });
      return withCors(request, Response.json({ ok: true }));
    }

    if (path === "/api/waitlist" && request.method === "POST") {
      const parsed = waitlistBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(
          request,
          Response.json({ error: "Valid email and feature required" }, { status: 400 }),
        );
      }
      try {
        await db().insert(waitlistSignupsTable).values({
          email: parsed.data.email.toLowerCase(),
          featureKey: parsed.data.featureKey,
        });
      } catch {
        // duplicate ok
      }
      return withCors(request, Response.json({ ok: true }));
    }

    if (path === "/api/public/geo-audits/generate" && request.method === "POST") {
      const ip = clientIp(request);
      if (await rateLimitKv(env, `public-geo:${ip}`, 5, 3600)) {
        return withCors(request, Response.json({ error: "Rate limit exceeded" }, { status: 429 }));
      }
      const parsed = geoBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(request, Response.json({ error: "Invalid URL" }, { status: 400 }));
      }
      try {
        await assertPublicUrl(parsed.data.url);
      } catch (err) {
        return withCors(
          request,
          Response.json({ error: err instanceof Error ? err.message : "Invalid URL" }, { status: 422 }),
        );
      }
      const jobId = await sendToCfQueue(QUEUES.publicGeoAudit, {
        url: parsed.data.url,
        clientIp: ip,
      });
      return withCors(
        request,
        acceptedJobResponse(jobId ?? `queued-${Date.now()}`, QUEUES.publicGeoAudit, {
          message: "GEO audit queued; poll /api/jobs/:id for result",
        }),
      );
    }

    if (path.startsWith("/api/tools/") && request.method === "POST") {
      const parsed = urlBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(request, Response.json({ error: "Valid URL required" }, { status: 400 }));
      }
      try {
        await assertPublicUrl(parsed.data.url);
        const audit = await auditUrl(parsed.data.url);
        if (path.endsWith("/meta-checker")) {
          const meta = scoreMetaTags(audit.pageTitle, audit.metaDescription);
          return withCors(
            request,
            Response.json({
              url: parsed.data.url,
              ...meta,
              pageTitle: audit.pageTitle,
              metaDescription: audit.metaDescription,
            }),
          );
        }
        if (path.endsWith("/sitemap")) {
          return withCors(request, Response.json({ url: parsed.data.url, title: audit.pageTitle }));
        }
        if (path.endsWith("/robots")) {
          return withCors(request, Response.json({ url: parsed.data.url, title: audit.pageTitle }));
        }
        if (path.endsWith("/llms-txt")) {
          return withCors(
            request,
            Response.json({
              url: parsed.data.url,
              suggestion: `# ${audit.pageTitle ?? parsed.data.url}\n> ${audit.metaDescription ?? ""}`,
            }),
          );
        }
      } catch (err) {
        return withCors(
          request,
          Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 422 }),
        );
      }
    }

    if (path === "/" && request.method === "GET") {
      return withCors(
        request,
        Response.json({ status: "ok", worker: "goals-ac-public" }),
      );
    }

    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  } catch (err) {
    console.error("[goals-ac-public]", path, err);
    return withCors(
      request,
      Response.json({ error: "Internal server error" }, { status: 500 }),
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    wireCfEdgeEnv(env);
    setD1Binding(env.DB);
    return handle(request, env);
  },
};
