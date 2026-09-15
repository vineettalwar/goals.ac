import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { QUEUES, type BrandScrapeJobData, type PgBoss } from "@workspace/jobs";
import { runBrandScrapeWithDiscovery } from "@workspace/content-engine/support/brand/brand-scrape-orchestrator";
import { logger } from "../logger";

export async function processBrandScrape(payload: BrandScrapeJobData): Promise<void> {
  const { projectId, overwrite } = payload;
  const [project] = await db
    .select({ url: websiteProjectsTable.url })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project?.url) {
    logger.warn({ projectId }, "Brand scrape skipped: project has no URL");
    return;
  }

  await runBrandScrapeWithDiscovery(projectId, project.url, {
    overwrite: overwrite ?? false,
    refreshSitemap: true,
  });
}

export async function registerBrandScrapeHandler(boss: PgBoss): Promise<void> {
  await boss.work<BrandScrapeJobData>(QUEUES.brandScrape, async ([job]) => {
    await processBrandScrape(job.data);
  });
}
