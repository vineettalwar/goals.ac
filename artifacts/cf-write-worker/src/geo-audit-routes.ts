import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { db } from "@workspace/db";
import { geoAuditsTable } from "@workspace/db/schema-sqlite";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { assertPublicUrlSync } from "@workspace/security/ssrf-guard";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { z } from "zod";
import { requireProjectAccess } from "./project-access";

function normalizeHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const geoAuditBody = z.object({
  url: z.string().min(1).transform(normalizeHttpUrl).pipe(z.string().url()).optional(),
  projectId: z.coerce.number().int().positive().optional(),
  websiteProjectId: z.coerce.number().int().positive().optional(),
  roadmapId: z.coerce.number().int().positive().optional(),
});

export async function handleGeoAuditWrite(
  request: Request,
  path: string,
  userId: number,
  env: { CF_EDGE_HTTP?: string },
  trackJob: (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>,
): Promise<Response | null> {
  if (path !== "/api/geo-audits/generate" || request.method !== "POST") {
    return null;
  }

  const parsed = geoAuditBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const websiteProjectId = parsed.data.websiteProjectId ?? parsed.data.projectId;

  if (parsed.data.url) {
    try {
      assertPublicUrlSync(parsed.data.url);
    } catch (err) {
      return withCors(
        request,
        Response.json({ error: err instanceof Error ? err.message : "Invalid URL" }, { status: 422 }),
      );
    }

    if (websiteProjectId) {
      const access = await requireProjectAccess(websiteProjectId, userId);
      if (!access.ok) {
        return withCors(request, Response.json({ error: access.error }, { status: access.status }));
      }
    }

    let auditResult;
    try {
      auditResult = await auditUrl(parsed.data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return withCors(
        request,
        Response.json({ error: `Failed to fetch URL: ${message}` }, { status: 422 }),
      );
    }

    const [audit] = await db
      .insert(geoAuditsTable)
      .values({
        url: auditResult.url,
        roadmapId: parsed.data.roadmapId ?? null,
        websiteProjectId: websiteProjectId ?? null,
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

  if (websiteProjectId && env.CF_EDGE_HTTP === "1") {
    const access = await requireProjectAccess(websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const jobId = await sendToCfQueue(QUEUES.geoReauditSweep, { projectId: websiteProjectId });
    const id = jobId ?? `cf:${QUEUES.geoReauditSweep}:${Date.now()}`;
    await trackJob(id, QUEUES.geoReauditSweep, { userId, projectId: websiteProjectId });
    return withCors(request, acceptedJobResponse(id, QUEUES.geoReauditSweep));
  }

  return withCors(
    request,
    Response.json({ error: "url or websiteProjectId required" }, { status: 400 }),
  );
}
