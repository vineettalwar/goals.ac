import { NextResponse } from "next/server";
import { db, geoAuditsTable } from "@workspace/db";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import { z } from "zod";

const CreateBody = z.object({
  url: z.string().url(),
  roadmapId: z.number().int().positive().optional(),
  websiteProjectId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    await assertPublicUrl(parsed.data.url);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid URL" }, { status: 422 });
  }

  if (parsed.data.websiteProjectId) {
    const access = await requireProjectAccess(parsed.data.websiteProjectId, userId!);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let auditResult;
  try {
    auditResult = await auditUrl(parsed.data.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to fetch URL: ${message}` }, { status: 422 });
  }

  const [audit] = await db
    .insert(geoAuditsTable)
    .values({
      url: auditResult.url,
      roadmapId: parsed.data.roadmapId ?? null,
      websiteProjectId: parsed.data.websiteProjectId ?? null,
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
}
