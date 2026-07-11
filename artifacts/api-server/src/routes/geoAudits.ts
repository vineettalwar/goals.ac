import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { geoAuditsTable, websiteProjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auditUrl } from "../services/geoAuditor";
import { optionalAuth } from "../lib/auth";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

const router: IRouter = Router();

const CreateGeoAuditBody = z.object({
  url: z.string().url("Must be a valid URL"),
  roadmap_id: z.number().int().positive().optional(),
  website_project_id: z.number().int().positive().optional(),
});

router.post("/geo-audits", optionalAuth, async (req, res) => {
  const parsed = CreateGeoAuditBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { url, roadmap_id, website_project_id } = parsed.data;

  try {
    await assertPublicUrl(url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(422).json({ error: message });
    return;
  }

  let validatedProjectId: number | null = null;

  if (website_project_id && req.user) {
    const [proj] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, website_project_id), eq(websiteProjectsTable.userId, req.user.userId)))
      .limit(1);
    if (!proj) {
      res.status(403).json({ error: "You do not have access to this project" });
      return;
    }
    validatedProjectId = website_project_id;
  }

  req.log.info({ url, roadmap_id }, "Starting GEO audit");

  let auditResult;
  try {
    auditResult = await auditUrl(url);
  } catch (err: unknown) {
    req.log.warn({ url, err }, "GEO audit fetch failed");
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = message.includes("abort") || message.includes("timeout");
    res.status(422).json({
      error: isAbort
        ? "Request timed out. The URL did not respond within 10 seconds."
        : `Failed to fetch URL: ${message}`,
    });
    return;
  }

  try {
    const [audit] = await db
      .insert(geoAuditsTable)
      .values({
        url: auditResult.url,
        roadmapId: roadmap_id ?? null,
        websiteProjectId: validatedProjectId,
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

    res.status(201).json(audit);
  } catch (err) {
    req.log.error(err, "Failed to save GEO audit");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/geo-audits/:id", optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid audit id" });
    return;
  }

  try {
    const [audit] = await db
      .select()
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.id, id))
      .limit(1);

    if (!audit) {
      res.status(404).json({ error: "GEO audit not found" });
      return;
    }

    if (audit.websiteProjectId) {
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [proj] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(and(eq(websiteProjectsTable.id, audit.websiteProjectId), eq(websiteProjectsTable.userId, req.user.userId)))
        .limit(1);
      if (!proj) {
        res.status(403).json({ error: "You do not have access to this audit" });
        return;
      }
    }

    res.json(audit);
  } catch (err) {
    req.log.error(err, "Failed to fetch GEO audit");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
