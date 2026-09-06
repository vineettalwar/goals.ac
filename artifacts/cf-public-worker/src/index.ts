import { getDb, setD1Binding } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import {
  contactSubmissionsTable,
  geoAuditsTable,
  industriesTable,
  leadCapturesTable,
  locationsTable,
  planQuotaConfigTable,
  platformSettingsTable,
  roadmapsTable,
  waitlistSignupsTable,
} from "@workspace/db/schema-sqlite";
import { seedReferenceDataIfEmpty } from "@workspace/db/reference-data";
import {
  DEFAULT_PLAN_QUOTA_LIMITS,
  PLAN_IDS,
  normalizePlanId,
  type PlanId,
  type PlanQuotaLimits,
} from "@workspace/billing/plans";
import { buildPublicPlanCatalog } from "@workspace/billing/public-plans";
import { asc, and, eq, isNull } from "drizzle-orm";
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
import {
  handleAuthForgotPassword,
  handleAuthResetPassword,
} from "./auth-password-reset";
import { handleGoogleAuthCallback, handleGoogleAuthStart } from "./auth-google";
import { handleGscAuthCallback, handleGscAuthStart } from "./auth-gsc";
import {
  handleGoogleSheetsAuthCallback,
  handleGoogleSheetsAuthStart,
} from "./auth-google-sheets";
import { handleBingAuthCallback, handleBingAuthStart } from "./auth-bing";
import {
  handleGoogleAnalyticsAuthCallback,
  handleGoogleAnalyticsAuthStart,
} from "./auth-google-analytics";
import { handleLinkedInAuthCallback, handleLinkedInAuthStart } from "./auth-linkedin";
import { handleTwitterAuthCallback, handleTwitterAuthStart } from "./auth-twitter";
import { handleMetaAuthCallback, handleMetaAuthStart } from "./auth-meta";
import { handleMetaPagesList, handleMetaSelectPage } from "./auth-meta-pages";
import {
  getBlueskyClientMetadata,
  getBlueskyJwks,
  handleBlueskyAuthCallback,
  handleBlueskyAuthStart,
} from "./auth-bluesky";
import { handleMastodonAuthCallback, handleMastodonAuthStart } from "./auth-mastodon";
import { handleStripeWebhook } from "./stripe-webhook";
import { handlePublicInviteGet } from "./invite-routes";
import { handleV1Api } from "./v1-api-routes";
import { handleMcpRoute } from "./mcp-routes";
import { kvGetJson, kvPutJson } from "@workspace/cf-edge/kv-cache";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { z } from "zod";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  AUTH_SECRET: string;
  GEMINI_KEY_ENCRYPTION_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  TWITTER_CLIENT_ID?: string;
  TWITTER_CLIENT_SECRET?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  BLUESKY_OAUTH_PRIVATE_KEY_JWK?: string;
  BLUESKY_CLIENT_NAME?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  APP_URL?: string;
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

async function loadPlanQuotaLimits(): Promise<Record<PlanId, PlanQuotaLimits>> {
  const limits = Object.fromEntries(
    PLAN_IDS.map((planId) => [planId, { ...DEFAULT_PLAN_QUOTA_LIMITS[planId] }]),
  ) as Record<PlanId, PlanQuotaLimits>;

  try {
    const rows = await db().select().from(planQuotaConfigTable);
    for (const row of rows) {
      const planId = normalizePlanId(row.planId);
      limits[planId] = {
        articles: row.articlesPerMonth,
        roadmaps: row.roadmapsPerMonth,
        sites: row.sites,
      };
    }
  } catch {
    // Unmigrated or empty plan_quota_config — use code defaults.
  }

  return limits;
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

const leadCaptureBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  companyUrl: z.string().url().optional(),
});

const vitalsBody = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.string().optional(),
  navigationType: z.string().optional(),
  path: z.string().optional(),
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

    if (path === "/api/plans" && request.method === "GET") {
      const catalog = await cachedReference(env, "ref:plans:v1", async () => {
        const limits = await loadPlanQuotaLimits();
        return buildPublicPlanCatalog(limits);
      });
      return withCors(
        request,
        Response.json(catalog, { headers: { "Cache-Control": "public, max-age=300" } }),
      );
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

    if (path === "/api/auth/forgot-password" && request.method === "POST") {
      const ip = clientIp(request);
      if (await rateLimitKv(env, `auth-forgot-password:${ip}`, 10, 3600)) {
        return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
      }
      const response = await handleAuthForgotPassword(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/reset-password" && request.method === "POST") {
      const ip = clientIp(request);
      if (await rateLimitKv(env, `auth-reset-password:${ip}`, 20, 900)) {
        return withCors(request, Response.json({ error: "Too many attempts" }, { status: 429 }));
      }
      const response = await handleAuthResetPassword(request, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/google" && request.method === "GET") {
      const response = await handleGoogleAuthStart(request, env);
      return withCors(request, response);
    }

    if (path === "/api/auth/google/callback" && request.method === "GET") {
      const response = await handleGoogleAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/linkedin" && request.method === "GET") {
      const response = await handleLinkedInAuthStart(request, env);
      return withCors(request, response);
    }

    if (path === "/api/auth/linkedin/callback" && request.method === "GET") {
      const response = await handleLinkedInAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/twitter" && request.method === "GET") {
      const response = await handleTwitterAuthStart(request, env);
      return withCors(request, response);
    }

    if (path === "/api/auth/twitter/callback" && request.method === "GET") {
      const response = await handleTwitterAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/meta" && request.method === "GET") {
      const response = await handleMetaAuthStart(request, env);
      return withCors(request, response);
    }

    if (path === "/api/auth/meta/callback" && request.method === "GET") {
      const response = await handleMetaAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/meta/pages" && request.method === "GET") {
      const response = await handleMetaPagesList(request, env);
      return withCors(request, response);
    }

    if (path === "/api/auth/meta/select-page" && request.method === "POST") {
      const response = await handleMetaSelectPage(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/bluesky" && request.method === "GET") {
      const response = await handleBlueskyAuthStart(request, env);
      return withCors(request, response);
    }

    if (path === "/api/auth/bluesky/callback" && request.method === "GET") {
      const response = await handleBlueskyAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/mastodon" && request.method === "GET") {
      const response = await handleMastodonAuthStart(request, env);
      return withCors(request, response);
    }

    if (path === "/api/auth/mastodon/callback" && request.method === "GET") {
      const response = await handleMastodonAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/oauth/bluesky-client-metadata.json" && request.method === "GET") {
      try {
        const metadata = await getBlueskyClientMetadata(request, env);
        return withCors(
          request,
          Response.json(metadata, {
            headers: { "Cache-Control": "public, max-age=3600" },
          }),
        );
      } catch (err) {
        return withCors(
          request,
          Response.json(
            { error: err instanceof Error ? err.message : "Bluesky OAuth not configured" },
            { status: 503 },
          ),
        );
      }
    }

    if (path === "/oauth/bluesky-jwks.json" && request.method === "GET") {
      try {
        const jwks = await getBlueskyJwks(request, env);
        return withCors(
          request,
          Response.json(jwks, {
            headers: { "Cache-Control": "public, max-age=3600" },
          }),
        );
      } catch (err) {
        return withCors(
          request,
          Response.json(
            { error: err instanceof Error ? err.message : "Bluesky OAuth not configured" },
            { status: 503 },
          ),
        );
      }
    }

    if (path === "/api/auth/google-search-console" && request.method === "GET") {
      const response = await handleGscAuthStart(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/google-search-console/callback" && request.method === "GET") {
      const response = await handleGscAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/bing-webmaster" && request.method === "GET") {
      const response = await handleBingAuthStart(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/bing-webmaster/callback" && request.method === "GET") {
      const response = await handleBingAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/google-analytics" && request.method === "GET") {
      const response = await handleGoogleAnalyticsAuthStart(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/google-analytics/callback" && request.method === "GET") {
      const response = await handleGoogleAnalyticsAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/google-sheets" && request.method === "GET") {
      const response = await handleGoogleSheetsAuthStart(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/auth/google-sheets/callback" && request.method === "GET") {
      const response = await handleGoogleSheetsAuthCallback(request, env, db());
      return withCors(request, response);
    }

    if (path === "/api/webhooks/stripe" && request.method === "POST") {
      return handleStripeWebhook(request);
    }

    const inviteHandled = await handlePublicInviteGet(request, path);
    if (inviteHandled) return inviteHandled;

    const mcpHandled = await handleMcpRoute(request, path, env);
    if (mcpHandled) return mcpHandled;

    const v1Handled = await handleV1Api(request, path);
    if (v1Handled) return v1Handled;

    if (path === "/api/analytics/vitals" && request.method === "POST") {
      const parsed = vitalsBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(request, Response.json({ error: "Invalid payload" }, { status: 400 }));
      }
      return withCors(request, Response.json({ ok: true }));
    }

    const leadCaptureMatch = path.match(/^\/api\/roadmaps\/([^/]+)\/lead-capture$/);
    if (leadCaptureMatch && request.method === "POST") {
      const parsed = leadCaptureBody.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return withCors(
          request,
          Response.json({ error: `Invalid request: ${parsed.error.message}` }, { status: 400 }),
        );
      }

      const slug = leadCaptureMatch[1]!;
      const [roadmap] = await db()
        .select({ id: roadmapsTable.id })
        .from(roadmapsTable)
        .where(eq(roadmapsTable.slug, slug))
        .limit(1);

      if (!roadmap) {
        return withCors(request, Response.json({ error: "Roadmap not found" }, { status: 404 }));
      }

      const [existing] = await db()
        .select({ id: leadCapturesTable.id })
        .from(leadCapturesTable)
        .where(
          and(
            eq(leadCapturesTable.roadmapId, roadmap.id),
            eq(leadCapturesTable.email, parsed.data.email),
          ),
        )
        .limit(1);

      if (existing) {
        return withCors(
          request,
          Response.json({ id: existing.id, message: "Lead already captured" }, { status: 201 }),
        );
      }

      const [lead] = await db()
        .insert(leadCapturesTable)
        .values({
          roadmapId: roadmap.id,
          name: parsed.data.name,
          email: parsed.data.email,
          companyUrl: parsed.data.companyUrl ?? "",
        })
        .returning({ id: leadCapturesTable.id });

      return withCors(
        request,
        Response.json({ id: lead.id, message: "Lead captured successfully" }, { status: 201 }),
      );
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
        return withCors(
          request,
          Response.json(
            {
              error: "rate_limited",
              message: "Too many requests. Please slow down and try again shortly.",
            },
            { status: 429, headers: { "Retry-After": "3600" } },
          ),
        );
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
      let auditResult;
      try {
        auditResult = await auditUrl(parsed.data.url);
      } catch (err) {
        return withCors(
          request,
          Response.json(
            { error: `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}` },
            { status: 422 },
          ),
        );
      }
      const [audit] = await db()
        .insert(geoAuditsTable)
        .values({
          url: auditResult.url,
          roadmapId: null,
          websiteProjectId: null,
          geoScore: auditResult.geoScore,
          issues: auditResult.issues,
          pageTitle: auditResult.pageTitle,
          metaDescription: auditResult.metaDescription,
          hasSchemaOrg: auditResult.hasSchemaOrg,
          schemaTypes: auditResult.schemaTypes,
          h1Count: auditResult.h1Count,
          imageCount: auditResult.imageCount,
          imagesMissingAlt: auditResult.imagesMissingAlt,
        })
        .returning();
      return withCors(request, Response.json(audit, { status: 201 }));
    }

    {
      const publicGeoGet = path.match(/^\/api\/public\/geo-audits\/(\d+)$/);
      if (publicGeoGet && request.method === "GET") {
        const id = Number(publicGeoGet[1]);
        const [audit] = await db()
          .select()
          .from(geoAuditsTable)
          .where(and(eq(geoAuditsTable.id, id), isNull(geoAuditsTable.websiteProjectId)))
          .limit(1);
        if (!audit) {
          return withCors(request, Response.json({ error: "GEO audit not found" }, { status: 404 }));
        }
        return withCors(request, Response.json(audit));
      }
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
