import { eq, asc } from "drizzle-orm";
import {
  industriesTable,
  locationsTable,
  planQuotaConfigTable,
  platformSettingsTable,
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
import { kvGetJson, kvPutJson } from "@workspace/cf-edge/kv-cache";
import { withCors } from "@workspace/cf-edge/cors";
import { cachedReference, db } from "../http";
import type { Env } from "../env";

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

async function platformStatus(env: Env) {
  const cacheKey = "platform:status:v3";
  const cached = await kvGetJson<{
    status: string;
    message?: string;
    releasedCmsPlatforms?: string[];
  }>(env.AI_CACHE, cacheKey);
  if (cached) return cached;

  let enabled = true;
  let maintenanceMessage: string | null = null;
  let releasedCmsPlatforms = ["wordpress"];
  try {
    const [row] = await db()
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1));
    enabled = row?.platformEnabled ?? true;
    maintenanceMessage = row?.maintenanceMessage ?? null;
    if (Array.isArray(row?.releasedCmsPlatforms) && row.releasedCmsPlatforms.length > 0) {
      releasedCmsPlatforms = row.releasedCmsPlatforms.includes("wordpress")
        ? row.releasedCmsPlatforms
        : ["wordpress", ...row.releasedCmsPlatforms];
    }
  } catch {
    // Empty or unmigrated platform_settings — treat as operational on edge.
  }

  const payload = enabled
    ? { status: "operational" as const, releasedCmsPlatforms }
    : {
        status: "maintenance" as const,
        message:
          maintenanceMessage ??
          "We're performing scheduled maintenance. Please check back shortly.",
        releasedCmsPlatforms,
      };
  await kvPutJson(env.AI_CACHE, cacheKey, payload, 30);
  return payload;
}

export async function handleCatalogRoutes(
  request: Request,
  path: string,
  env: Env,
): Promise<Response | null> {
  if (path === "/api/platform/status" && request.method === "GET") {
    const body = await platformStatus(env).catch(() => ({
      status: "operational" as const,
      releasedCmsPlatforms: ["wordpress"],
    }));
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

  return null;
}
