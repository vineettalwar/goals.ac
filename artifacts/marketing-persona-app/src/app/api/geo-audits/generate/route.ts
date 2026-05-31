import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { geoAuditsTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { assertPublicUrl } from "@/lib/ssrf-guard";
import { auditUrl } from "@/lib/ai/geo-auditor";
import { z } from "zod";

const CreateGeoAuditBody = z.object({
  url: z.string().url("Must be a valid URL"),
  websiteProjectId: z.number().int().positive().optional(),
  roadmapId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = CreateGeoAuditBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request: " + parsed.error.message }, { status: 400 });
  }

  const { url, websiteProjectId, roadmapId } = parsed.data;

  try {
    await assertPublicUrl(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }

  let validatedProjectId: number | null = null;

  if (websiteProjectId) {
    const [proj] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);
    if (!proj) return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    validatedProjectId = websiteProjectId;
  }

  let auditResult;
  try {
    auditResult = await auditUrl(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = message.includes("abort") || message.includes("timeout");
    return NextResponse.json(
      {
        error: isAbort
          ? "Request timed out. The URL did not respond within 10 seconds."
          : `Failed to fetch URL: ${message}`,
      },
      { status: 422 },
    );
  }

  try {
    const [audit] = await db
      .insert(geoAuditsTable)
      .values({
        url: auditResult.url,
        roadmapId: roadmapId ?? null,
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

    return NextResponse.json(audit, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
