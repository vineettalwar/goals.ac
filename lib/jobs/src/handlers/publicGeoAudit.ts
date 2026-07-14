import { db, geoAuditsTable } from "@workspace/db";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import type { PublicGeoAuditPayload } from "../queues";

export async function processPublicGeoAudit(payload: PublicGeoAuditPayload): Promise<void> {
  await assertPublicUrl(payload.url);
  const auditResult = await auditUrl(payload.url);
  await db.insert(geoAuditsTable).values({
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
  });
}
