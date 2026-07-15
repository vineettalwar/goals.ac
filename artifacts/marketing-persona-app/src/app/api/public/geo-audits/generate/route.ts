import { NextResponse } from "next/server";
import { db, geoAuditsTable } from "@workspace/db";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { normalizeHttpUrl } from "@/lib/utils/normalize-url";
import { z } from "zod";

const CreateBody = z.object({
  url: z.string().min(1).transform(normalizeHttpUrl).pipe(z.string().url()),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = await rateLimitResponse(
    `public-geo-audit:ip:${ip}`,
    RATE_LIMITS.PUBLIC_GEO_AUDIT_PER_IP.limit,
    RATE_LIMITS.PUBLIC_GEO_AUDIT_PER_IP.windowMs,
  );
  if (limited) return limited;

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

  return NextResponse.json(audit, { status: 201 });
}
