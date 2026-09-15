import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { geoAuditsTable } from "@workspace/db/schema-sqlite";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import {
  checkRobotsTxt,
  checkSitemap,
  generateLlmsTxt,
  scoreMetaTags,
} from "@workspace/seo-tools/freeTools";
import { withCors } from "@workspace/cf-edge/cors";
import { clientIp, db, rateLimitKv } from "../http";
import type { Env } from "../env";

const urlBody = z.object({
  url: z
    .string()
    .min(1)
    .transform((u) => (u.startsWith("http") ? u : `https://${u}`))
    .pipe(z.string().url()),
});

const geoBody = z.object({
  url: z
    .string()
    .min(1)
    .transform((u) => (u.startsWith("http") ? u : `https://${u}`))
    .pipe(z.string().url()),
});

export async function handlePublicToolsRoutes(
  request: Request,
  path: string,
  env: Env,
): Promise<Response | null> {
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

  if (path.startsWith("/api/tools/") && request.method === "POST") {
    const ip = clientIp(request);
    if (await rateLimitKv(env, `public-tools:${ip}`, 20, 3600)) {
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
    const parsed = urlBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Valid URL required" }, { status: 400 }));
    }
    try {
      await assertPublicUrl(parsed.data.url);
      if (path.endsWith("/meta-checker")) {
        const audit = await auditUrl(parsed.data.url);
        const meta = scoreMetaTags(audit.pageTitle, audit.metaDescription, {
          h1: audit.h1Text,
          ogTitle: audit.ogTitle,
          ogDescription: audit.ogDescription,
        });
        return withCors(
          request,
          Response.json({
            url: parsed.data.url,
            ...meta,
            pageTitle: audit.pageTitle,
            metaDescription: audit.metaDescription,
            h1: audit.h1Text,
            ogTitle: audit.ogTitle,
            ogDescription: audit.ogDescription,
          }),
        );
      }
      if (path.endsWith("/sitemap")) {
        return withCors(request, Response.json(await checkSitemap(parsed.data.url)));
      }
      if (path.endsWith("/robots")) {
        return withCors(request, Response.json(await checkRobotsTxt(parsed.data.url)));
      }
      if (path.endsWith("/llms-txt")) {
        return withCors(request, Response.json(await generateLlmsTxt(parsed.data.url)));
      }
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      return withCors(
        request,
        Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 422 }),
      );
    }
  }

  return null;
}
