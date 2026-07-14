import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { websiteProjectsTable, geoAuditsTable } from "@workspace/db/schema";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { GeoReauditJobData, GeoReauditPayload, PgBoss } from "@workspace/jobs";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { parseVisibilitySettings } from "@workspace/content-engine/support/settings/visibility-settings";
import { logger } from "../logger";

/** Weekly on Sunday at 08:00 UTC */
export const GEO_REAUDIT_SWEEP_CRON = "0 8 * * 0";

function isProjectPayload(data: GeoReauditJobData): data is GeoReauditPayload {
  return typeof (data as Partial<GeoReauditPayload>).projectId === "number";
}

export async function processGeoReauditSweep(data: GeoReauditJobData): Promise<void> {
  if (isProjectPayload(data)) {
    await reauditProject(data.projectId);
  } else {
    await sweepGeoReauditProjects();
  }
}

export async function registerGeoReauditSweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<GeoReauditJobData>(QUEUES.geoReauditSweep, async ([job]) => {
    await processGeoReauditSweep(job.data);
  });
}

async function sweepGeoReauditProjects(): Promise<void> {
  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      visibilitySettings: websiteProjectsTable.visibilitySettings,
    })
    .from(websiteProjectsTable);

  const due = projects.filter((p) => parseVisibilitySettings(p.visibilitySettings).geoReauditEnabled);

  logger.info({ count: due.length }, "GEO re-audit sweep: projects due");

  for (const project of due) {
    await enqueue(QUEUES.geoReauditSweep, { projectId: project.id });
  }
}

async function reauditProject(projectId: number): Promise<void> {
  const [project] = await db
    .select({
      id: websiteProjectsTable.id,
      url: websiteProjectsTable.url,
      visibilitySettings: websiteProjectsTable.visibilitySettings,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) {
    logger.warn({ projectId }, "GEO re-audit: project not found");
    return;
  }

  try {
    await assertPublicUrl(project.url);
    const result = await auditUrl(project.url);

    await db.insert(geoAuditsTable).values({
      websiteProjectId: projectId,
      url: result.url,
      geoScore: result.geoScore,
      issues: result.issues,
      pageTitle: result.pageTitle,
      metaDescription: result.metaDescription,
      hasSchemaOrg: result.hasSchemaOrg,
      schemaTypes: result.schemaTypes,
      h1Count: result.h1Count,
      imageCount: result.imageCount,
      imagesMissingAlt: result.imagesMissingAlt,
    });

    const settings = parseVisibilitySettings(project.visibilitySettings);
    await db
      .update(websiteProjectsTable)
      .set({
        visibilitySettings: {
          ...settings,
          lastGeoReauditAt: new Date().toISOString(),
        },
      })
      .where(eq(websiteProjectsTable.id, projectId));

    logger.info({ projectId, geoScore: result.geoScore }, "GEO re-audit completed");
  } catch (err) {
    logger.error({ err, projectId }, "GEO re-audit failed");
  }
}
