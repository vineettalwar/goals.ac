import { db } from "@workspace/db";
import { brandProfilesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { scrapeBrandProfile } from "../../brand/brand-scraper";
import { brandProfileUpdatesFromExtract } from "../../brand/brand-extract-apply";
import { loadBrandScanContext, shouldAutoRefreshBrandAfterGscSync } from "./brand-scan-context";
import { ingestBrandVoiceDocuments } from "../../brand/brand-voice-indexer";
import { ingestSocialBrandVoice } from "../../brand/brand-voice-social-ingest";
import { logger } from "../../core/logger";

/** PRD 4.1: brand scrape report should complete within 60s. Instrumentation only, nothing fails on a breach. */
export const BRAND_SCRAPE_BUDGET_MS = 60000;

async function applyBrandExtract(
  projectId: number,
  extract: Awaited<ReturnType<typeof scrapeBrandProfile>>,
  overwrite: boolean,
): Promise<void> {
  const profileUpdates = brandProfileUpdatesFromExtract(extract);

  const existing = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  if (existing.length > 0) {
    if (overwrite) {
      await db
        .update(brandProfilesTable)
        .set(profileUpdates)
        .where(eq(brandProfilesTable.websiteProjectId, projectId));
    } else {
      const current = existing[0];
      const merged: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(profileUpdates)) {
        if (key === "brandMemory" || key === "writingExamples" || key === "doWords") {
          merged[key] = value;
          continue;
        }
        const curVal = (current as Record<string, unknown>)[key];
        if (Array.isArray(value) && Array.isArray(curVal) && curVal.length > 0) continue;
        if (typeof value === "string" && typeof curVal === "string" && curVal.trim()) continue;
        merged[key] = value;
      }
      if (Object.keys(merged).length > 0) {
        await db
          .update(brandProfilesTable)
          .set(merged)
          .where(eq(brandProfilesTable.websiteProjectId, projectId));
      }
    }
  } else {
    await db.insert(brandProfilesTable).values({
      websiteProjectId: projectId,
      ...profileUpdates,
    } as typeof brandProfilesTable.$inferInsert);
  }

  await db
    .update(websiteProjectsTable)
    .set({ scrapeStatus: "done", scrapeData: extract })
    .where(eq(websiteProjectsTable.id, projectId));
}

export async function runBrandScrapeWithDiscovery(
  projectId: number,
  url: string,
  options?: { overwrite?: boolean; refreshSitemap?: boolean },
): Promise<void> {
  const overwrite = options?.overwrite ?? false;
  const startedAt = Date.now();

  await db
    .update(websiteProjectsTable)
    .set({ scrapeStatus: "pending" })
    .where(eq(websiteProjectsTable.id, projectId));

  try {
    const context = await loadBrandScanContext(projectId, {
      refreshSitemap: options?.refreshSitemap ?? true,
    });
    if (!context) {
      throw new Error("Project not found");
    }

    const extract = await scrapeBrandProfile(url, {
      discoveryInput: {
        sitemapUrls: context.sitemapUrls,
        gscTopPages: context.gscTopPages,
        cmsSiteGraph: context.cmsSiteGraph,
      },
    });
    await applyBrandExtract(projectId, extract, overwrite);

    const pageDocs = (extract.pageDocuments ?? [])
      .filter((doc) => doc.text.trim().length > 100)
      .map((doc) => ({
        sourceType: doc.sourceType,
        sourceUrl: doc.sourceUrl,
        title: doc.title ?? "",
        text: doc.text,
        replaceExisting: true,
      }));

    if (pageDocs.length > 0) {
      await ingestBrandVoiceDocuments(projectId, pageDocs);
    }

    const [projectRow] = await db
      .select({ userId: websiteProjectsTable.userId })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    if (projectRow?.userId) {
      ingestSocialBrandVoice(projectId, projectRow.userId).catch((err) => {
        logger.warn({ err, projectId }, "Social brand voice ingest after scrape failed");
      });
    }

    logBrandScrapeDuration(startedAt, projectId, extract.scannedPages?.length ?? 0);
  } catch (err) {
    logBrandScrapeDuration(startedAt, projectId, undefined, err);
    logger.error({ err, projectId, url }, "Brand scrape with discovery failed");
    await db
      .update(websiteProjectsTable)
      .set({ scrapeStatus: "failed" })
      .where(eq(websiteProjectsTable.id, projectId));
  }
}

function logBrandScrapeDuration(
  startedAt: number,
  projectId: number,
  pageCount: number | undefined,
  err?: unknown,
): void {
  const elapsedMs = Date.now() - startedAt;
  const fields = { elapsedMs, projectId, pageCount, budgetMs: BRAND_SCRAPE_BUDGET_MS, failed: Boolean(err) };
  if (elapsedMs > BRAND_SCRAPE_BUDGET_MS) {
    logger.warn(fields, "Brand scrape exceeded performance budget");
  } else {
    logger.info(fields, "Brand scrape completed within performance budget");
  }
}

export async function maybeRefreshBrandAfterGscSync(projectId: number): Promise<void> {
  const shouldRefresh = await shouldAutoRefreshBrandAfterGscSync(projectId);
  if (!shouldRefresh) return;

  const [project] = await db
    .select({
      url: websiteProjectsTable.url,
      scrapeStatus: websiteProjectsTable.scrapeStatus,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project?.url || project.scrapeStatus === "pending") return;

  runBrandScrapeWithDiscovery(projectId, project.url, {
    overwrite: false,
    refreshSitemap: false,
  }).catch((err) => {
    logger.warn({ err, projectId }, "Auto brand refresh after GSC sync failed");
  });
}
